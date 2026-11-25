import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { DEFAULT_ORGANIZATION_ID } from "../../organization/organization.constants";
import {
  CONSENT_TYPES,
  PUBLIC_SESSION_LIMIT,
  RECEIPT_MESSAGE_CODE,
  REGISTRATION_OPERATION,
} from "./registration.constants";
import {
  canonicalJson,
  constantTimeEqualHex,
  generateReferenceCode,
  hmacHex,
  loadHmacKeyRing,
  type HmacKeyRing,
} from "./registration.crypto";
import {
  completedYears,
  resolveAgeReferenceDate,
  toIsoDate,
  todayInAcademyZone,
  type AgeReferenceRule,
} from "./registration.dates";
import {
  RegistrationApiException,
  persistenceFailed,
  sanitizeDatabaseError,
  withSanitizedErrors,
} from "./registration.errors";
import { RegistrationPolicyService } from "./registration-policy.service";
import {
  parseCreateRegistration,
  validateIdempotencyKeyHeader,
  type ParsedRegistration,
} from "./registration.validation";

export interface RegistrationReceipt {
  id: string;
  referenceCode: string;
  status: "RECEIVED";
  reservesPlace: false;
  receivedAt: string;
  messageCode: string;
  session: { id: string; name: string };
}

interface StoredRegistration {
  id: string;
  referenceCode: string;
  sessionId: string;
  sessionNameSnapshot: string;
  createdAt: Date;
  payloadHmac: string;
  hmacKeyVersion: string;
}

function toReceipt(row: StoredRegistration): RegistrationReceipt {
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    status: "RECEIVED",
    reservesPlace: false,
    receivedAt: row.createdAt.toISOString(),
    messageCode: RECEIPT_MESSAGE_CODE,
    session: { id: row.sessionId, name: row.sessionNameSnapshot },
  };
}

const IP_LIMIT = { max: 20, windowMs: 10 * 60 * 1000 };
const IP_PHONE_LIMIT = { max: 3, windowMs: 60 * 60 * 1000 };
const RATE_LIMIT_PREFIX = "reg:";

@Injectable()
export class RegistrationPublicService {
  private readonly logger = new Logger(RegistrationPublicService.name);
  private nextCleanupAt = 0;

  /** Key-ring source; overridable so tests can model independent instances. */
  ringLoader: () => HmacKeyRing | null = () => loadHmacKeyRing();

  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: RegistrationPolicyService,
  ) {}

  /** Bounded cleanup (500 rows) of expired registration counters only. */
  async cleanupExpiredRateLimits(now = new Date()): Promise<number> {
    try {
      const expired = await this.prisma.client.submissionRateLimit.findMany({
        where: {
          key: { startsWith: RATE_LIMIT_PREFIX },
          expiresAt: { lt: now },
        },
        select: { key: true },
        orderBy: [{ expiresAt: "asc" }, { key: "asc" }],
        take: 500,
      });
      if (!expired.length) return 0;
      const result = await this.prisma.client.submissionRateLimit.deleteMany({
        where: {
          key: {
            in: expired.map((row) => row.key),
            startsWith: RATE_LIMIT_PREFIX,
          },
          expiresAt: { lt: now },
        },
      });
      return result.count;
    } catch {
      this.logger.error("academy.registration.rate_limit_cleanup_failed");
      throw persistenceFailed();
    }
  }

  private async maybeCleanup(now: Date): Promise<void> {
    if (now.getTime() < this.nextCleanupAt) return;
    this.nextCleanupAt = now.getTime() + 10 * 60 * 1000;
    try {
      await this.cleanupExpiredRateLimits(now);
    } catch {
      // Logged above; maintenance must never replace quota enforcement.
    }
  }

  /**
   * Keyed-hash counters per client IP and per (IP, guardian phone). There is no
   * phone-only counter, so a third party cannot lock a victim's number out.
   * Storage failures fail closed (503 + Retry-After).
   */
  private async enforceRateLimits(
    ring: HmacKeyRing,
    clientIp: string,
    guardianPhone: string,
  ): Promise<void> {
    const now = new Date();
    await this.maybeCleanup(now);
    // Counters are kept under EVERY ring version's keyed hash. Instances with
    // compatible rings but different active signing keys therefore share at
    // least one counter per bucket, and the limit applies to the highest count.
    const buckets = [
      {
        domain: "rl-ip",
        subject: clientIp,
        prefix: `${RATE_LIMIT_PREFIX}ip:`,
        ...IP_LIMIT,
        retryAfter: 600,
      },
      {
        domain: "rl-ip-phone",
        subject: `${clientIp}|${guardianPhone}`,
        prefix: `${RATE_LIMIT_PREFIX}ipphone:`,
        ...IP_PHONE_LIMIT,
        retryAfter: 3600,
      },
    ];
    try {
      for (const bucket of buckets) {
        const slot = Math.floor(now.getTime() / bucket.windowMs);
        let highest = 0;
        for (const ringKey of ring.all) {
          const key = `${bucket.prefix}${hmacHex(ringKey, bucket.domain, bucket.subject).slice(0, 32)}:${slot}`;
          const record = await this.prisma.client.submissionRateLimit.upsert({
            where: { key },
            create: {
              key,
              count: 1,
              expiresAt: new Date((slot + 1) * bucket.windowMs),
            },
            update: { count: { increment: 1 } },
          });
          highest = Math.max(highest, record.count);
        }
        if (highest > bucket.max) {
          throw new RegistrationApiException(
            429,
            "RATE_LIMITED",
            "Too many registration attempts",
            { retryAfter: bucket.retryAfter },
          );
        }
      }
    } catch (error) {
      if (error instanceof RegistrationApiException) throw error;
      this.logger.error("academy.registration.rate_limit_storage_failed");
      throw new RegistrationApiException(
        503,
        "SERVICE_TEMPORARILY_UNAVAILABLE",
        "Service temporarily unavailable",
        { retryAfter: 30 },
      );
    }
  }

  async listSessions() {
    return withSanitizedErrors(async () => {
      const [policy, ring] = [
        await this.policies.getCurrentPolicy(),
        this.ringLoader(),
      ];
      if (!policy || !ring) return { registrationOpen: false, items: [] };
      const now = new Date();
      const sessions =
        await this.prisma.client.academyRegistrationSession.findMany({
          where: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            publicationState: "PUBLISHED",
            offering: {
              status: "OPEN",
              venueId: { not: null },
              programme: {
                active: true,
                minimumAge: { not: null },
                maximumAge: { not: null },
                sport: { active: true },
              },
              AND: [
                {
                  OR: [
                    { enrollmentOpensAt: null },
                    { enrollmentOpensAt: { lte: now } },
                  ],
                },
                {
                  OR: [
                    { enrollmentClosesAt: null },
                    { enrollmentClosesAt: { gte: now } },
                  ],
                },
              ],
            },
          },
          include: { offering: { include: { programme: true, venue: true } } },
          orderBy: [{ weekday: "asc" }, { startTime: "asc" }, { id: "asc" }],
          take: PUBLIC_SESSION_LIMIT,
        });
      const confirmed = sessions.length
        ? await this.prisma.client.academyRegistration.groupBy({
            by: ["sessionId"],
            where: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              status: "CONFIRMED",
              sessionId: { in: sessions.map((session) => session.id) },
            },
            _count: { _all: true },
          })
        : [];
      const confirmedBySession = new Map(
        confirmed.map((row) => [row.sessionId, row._count._all]),
      );
      const items = sessions
        .filter(
          (session) =>
            (confirmedBySession.get(session.id) ?? 0) <
            session.offering.capacity,
        )
        .map((session) => ({
          id: session.id,
          name: session.offering.name,
          programmeName: session.offering.programme.name,
          venue: {
            name: session.offering.venue?.name ?? "",
            address: session.offering.venue?.address ?? null,
          },
          coachDisplayName: session.coachDisplayName,
          weekday: session.weekday,
          startTime: session.startTime,
          endTime: session.endTime,
          timezone: session.timezone,
          firstSessionDate: session.firstSessionDate
            ? toIsoDate(session.firstSessionDate)
            : null,
          recurrence: session.recurrence,
          minAge: session.offering.programme.minimumAge,
          maxAge: session.offering.programme.maximumAge,
          ageReference: {
            rule: session.ageReferenceRule,
            date: session.ageReferenceDate
              ? toIsoDate(session.ageReferenceDate)
              : null,
          },
          registrationOpensAt:
            session.offering.enrollmentOpensAt?.toISOString() ?? null,
          registrationClosesAt:
            session.offering.enrollmentClosesAt?.toISOString() ?? null,
        }));
      return { registrationOpen: true, items };
    });
  }

  async createRegistration(
    rawBody: unknown,
    idempotencyHeader: unknown,
    clientIp: string,
  ): Promise<{ receipt: RegistrationReceipt; replayed: boolean }> {
    const idempotencyKey = validateIdempotencyKeyHeader(idempotencyHeader);
    const parsed = parseCreateRegistration(rawBody);
    const ring = this.ringLoader();
    if (!ring) throw this.closed();

    const keyHmacs = ring.all.map((key) =>
      hmacHex(key, "idempotency-key", idempotencyKey),
    );
    const canonical = canonicalJson(parsed);

    return withSanitizedErrors(async () => {
      // 1. Replay first: an identical retry must return the original receipt
      //    even after closure, consent rotation or a status change.
      const existing = await this.findExisting(keyHmacs);
      if (existing) return this.resolveExisting(existing, ring, canonical);

      // 2-3. Cheap early rejections (policy availability, rate limit). The first
      //      lookup may have missed a registration that another instance
      //      committed meanwhile; a committed receipt always takes precedence
      //      over these availability/limit rejections, so look again before
      //      refusing. Payload conflicts are still detected by resolveExisting.
      try {
        const policy = await this.policies.getCurrentPolicy();
        if (!policy) throw this.closed();
        if (policy.policyVersion !== parsed.consentVersion) {
          throw new RegistrationApiException(
            409,
            "CONSENT_VERSION_MISMATCH",
            "Consent version is not current",
            { details: { currentConsentVersion: policy.policyVersion } },
          );
        }
        await this.enforceRateLimits(ring, clientIp, parsed.guardian.phone);
      } catch (rejection) {
        if (
          rejection instanceof RegistrationApiException &&
          [
            "REGISTRATION_CLOSED",
            "CONSENT_VERSION_MISMATCH",
            "RATE_LIMITED",
          ].includes(rejection.code)
        ) {
          const committed = await this.findExisting(keyHmacs);
          if (committed)
            return this.resolveExisting(committed, ring, canonical);
        }
        throw rejection;
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await this.prisma.client.$transaction(
            (tx) =>
              this.createInTransaction(tx, parsed, ring, keyHmacs, canonical),
            {
              isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
              maxWait: 5000,
              timeout: 15000,
            },
          );
        } catch (error) {
          // The transaction has already rolled back; never continue inside it.
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            const winner = await this.findExisting(keyHmacs);
            if (winner) return this.resolveExisting(winner, ring, canonical);
            continue; // reference-code collision: retry with a fresh code
          }
          throw error;
        }
      }
      throw persistenceFailed();
    });
  }

  private closed(): RegistrationApiException {
    return new RegistrationApiException(
      409,
      "REGISTRATION_CLOSED",
      "Registration is not open",
    );
  }

  private findExisting(keyHmacs: string[]) {
    return this.prisma.client.academyRegistration.findFirst({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        idempotencyOperation: REGISTRATION_OPERATION,
        idempotencyKeyHmac: { in: keyHmacs },
      },
    });
  }

  private resolveExisting(
    existing: StoredRegistration,
    ring: HmacKeyRing,
    canonical: string,
  ): { receipt: RegistrationReceipt; replayed: true } {
    const key = ring.all.find(
      (item) => item.version === existing.hmacKeyVersion,
    );
    const same =
      key !== undefined &&
      constantTimeEqualHex(
        hmacHex(key, "payload", canonical),
        existing.payloadHmac,
      );
    if (!same) {
      throw new RegistrationApiException(
        409,
        "IDEMPOTENCY_KEY_CONFLICT",
        "Idempotency key was already used with a different request",
      );
    }
    return { receipt: toReceipt(existing), replayed: true };
  }

  private async createInTransaction(
    tx: Prisma.TransactionClient,
    parsed: ParsedRegistration,
    ring: HmacKeyRing,
    keyHmacs: string[],
    canonical: string,
  ): Promise<{ receipt: RegistrationReceipt; replayed: boolean }> {
    const orgId = DEFAULT_ORGANIZATION_ID;
    const currentKeyHmac = keyHmacs[0]!;
    // Lock order for submit (documented in the ADR):
    //   1. advisory locks over EVERY candidate HMAC of this idempotency key,
    //      in one deterministic (sorted) order
    //   2. approved consent policy row (FOR SHARE)
    //   3. programme offering (FOR SHARE) -> registration session (FOR SHARE)
    //   4. registration insert
    // Locking every candidate serializes instances whose key rings overlap,
    // even when their active signing versions differ.
    const lockRows = await tx.$queryRaw<Array<{ k: string }>>`
      SELECT DISTINCT hashtextextended(h, 0)::text AS k
      FROM unnest(${keyHmacs}::text[]) AS h
      ORDER BY 1
    `;
    for (const { k } of lockRows) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${k}::bigint)`;
    }
    const raced = await tx.academyRegistration.findFirst({
      where: {
        organizationId: orgId,
        idempotencyOperation: REGISTRATION_OPERATION,
        idempotencyKeyHmac: { in: keyHmacs },
      },
    });
    if (raced) return this.resolveExisting(raced, ring, canonical);

    // The policy read before the transaction is only a cheap early rejection.
    // The authoritative acceptance point is this share lock, held to commit:
    // approval, replacement and retirement need the row exclusively.
    const policy = await this.lockApprovedPolicy(tx, parsed.consentVersion);
    const policyId = policy.id;
    const policyVersion = policy.policyVersion;
    const policyContent = policy.content;

    // Lock order: offering -> session (shared); registration is inserted last.
    const link = await tx.$queryRaw<Array<{ offering_id: string }>>`
      SELECT programme_offering_id::text AS offering_id
      FROM academy_registration_sessions
      WHERE id = ${parsed.sessionId}::uuid AND organization_id = ${orgId}::uuid
    `;
    const offeringId = link[0]?.offering_id;
    if (!offeringId) throw this.sessionUnavailable();
    await tx.$queryRaw`
      SELECT id FROM programme_offerings
      WHERE id = ${offeringId}::uuid AND organization_id = ${orgId}::uuid
      FOR SHARE
    `;
    await tx.$queryRaw`
      SELECT id FROM academy_registration_sessions
      WHERE id = ${parsed.sessionId}::uuid AND organization_id = ${orgId}::uuid
      FOR SHARE
    `;

    // Re-read mutable state only after the locks are held.
    const session = await tx.academyRegistrationSession.findFirst({
      where: { id: parsed.sessionId, organizationId: orgId },
      include: {
        offering: {
          include: { programme: { include: { sport: true } }, venue: true },
        },
      },
    });
    const now = new Date();
    const offering = session?.offering;
    const programme = offering?.programme;
    if (
      !session ||
      !offering ||
      !programme ||
      session.publicationState !== "PUBLISHED" ||
      offering.status !== "OPEN" ||
      !offering.venue ||
      !programme.active ||
      !programme.sport.active ||
      programme.minimumAge === null ||
      programme.maximumAge === null ||
      (offering.enrollmentOpensAt && offering.enrollmentOpensAt > now) ||
      (offering.enrollmentClosesAt && offering.enrollmentClosesAt < now)
    ) {
      throw this.sessionUnavailable();
    }

    const referenceDate = session.ageReferenceRule
      ? resolveAgeReferenceDate(
          session.ageReferenceRule as AgeReferenceRule,
          session.ageReferenceDate ? toIsoDate(session.ageReferenceDate) : null,
          session.firstSessionDate ? toIsoDate(session.firstSessionDate) : null,
          now,
        )
      : null;
    if (!referenceDate) throw this.sessionUnavailable();
    const age = completedYears(parsed.player.dateOfBirth, referenceDate);
    if (age < programme.minimumAge || age > programme.maximumAge) {
      throw new RegistrationApiException(
        422,
        "PLAYER_AGE_INELIGIBLE",
        "Player does not meet the age requirements",
        {
          details: {
            minAge: programme.minimumAge,
            maxAge: programme.maximumAge,
          },
        },
      );
    }

    const confirmed = await tx.academyRegistration.count({
      where: {
        organizationId: orgId,
        sessionId: session.id,
        status: "CONFIRMED",
      },
    });
    if (confirmed >= offering.capacity) {
      throw new RegistrationApiException(
        409,
        "SESSION_FULL",
        "Session is full",
      );
    }

    const keyVersion = ring.current.version;
    const created = await tx.academyRegistration.create({
      data: {
        referenceCode: generateReferenceCode(),
        organizationId: orgId,
        sessionId: session.id,
        sessionNameSnapshot: offering.name,
        playerFullName: parsed.player.fullName,
        playerDateOfBirth: new Date(
          `${parsed.player.dateOfBirth}T00:00:00.000Z`,
        ),
        ageAtReference: age,
        ageReferenceDateUsed: new Date(`${referenceDate}T00:00:00.000Z`),
        playerGender: parsed.player.gender,
        playerJerseySize: parsed.player.jerseySize,
        playerPhone: parsed.player.phone,
        guardianFullName: parsed.guardian.fullName,
        guardianPhone: parsed.guardian.phone,
        guardianRelationship: parsed.guardian.relationship,
        guardianAuthorityConfirmed: true,
        emergencyContactName: parsed.emergencyContact.fullName,
        emergencyContactPhone: parsed.emergencyContact.phone,
        emergencyContactRelationship: parsed.emergencyContact.relationship,
        source: parsed.source,
        idempotencyOperation: REGISTRATION_OPERATION,
        idempotencyKeyHmac: currentKeyHmac,
        payloadHmac: hmacHex(ring.current, "payload", canonical),
        hmacKeyVersion: keyVersion,
      },
    });

    const granted: Record<(typeof CONSENT_TYPES)[number], boolean> = {
      GUARDIAN_AUTHORITY: true,
      REGISTRATION_PRIVACY: true,
      MARKETING: parsed.consents.marketing,
      PHOTOGRAPHY: parsed.consents.photography,
    };
    await tx.academyRegistrationConsent.createMany({
      data: CONSENT_TYPES.map((type) => ({
        organizationId: orgId,
        registrationId: created.id,
        policyId,
        consentType: type,
        granted: granted[type],
        policyVersion,
        locale: parsed.locale,
        contentSha256: policyContent[type][parsed.locale].sha256,
        acceptedAt: now,
      })),
    });

    return { receipt: toReceipt(created), replayed: false };
  }

  private async lockApprovedPolicy(
    tx: Prisma.TransactionClient,
    consentVersion: string,
  ): Promise<{
    id: string;
    policyVersion: string;
    content: import("./registration-admin.validation").PolicyContent;
  }> {
    // A statement blocked behind an approval/retirement re-checks its WHERE
    // clause on wake-up and may return nothing although a replacement policy
    // just committed; a fresh statement (new snapshot) resolves that.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const rows = await tx.$queryRaw<
        Array<{ id: string; policy_version: string }>
      >`
        SELECT id::text AS id, policy_version
        FROM academy_registration_policies
        WHERE organization_id = ${DEFAULT_ORGANIZATION_ID}::uuid
          AND status = 'APPROVED'
        FOR SHARE
      `;
      const row = rows[0];
      if (!row) continue;
      if (row.policy_version !== consentVersion) {
        throw new RegistrationApiException(
          409,
          "CONSENT_VERSION_MISMATCH",
          "Consent version is not current",
          { details: { currentConsentVersion: row.policy_version } },
        );
      }
      const full = await tx.academyRegistrationPolicy.findUnique({
        where: { id: row.id },
      });
      if (!full) continue;
      return {
        id: full.id,
        policyVersion: full.policyVersion,
        content:
          full.content as unknown as import("./registration-admin.validation").PolicyContent,
      };
    }
    throw this.closed();
  }

  private sessionUnavailable(): RegistrationApiException {
    return new RegistrationApiException(
      409,
      "SESSION_NOT_AVAILABLE",
      "Session is not available for registration",
    );
  }
}

export { sanitizeDatabaseError, todayInAcademyZone };
