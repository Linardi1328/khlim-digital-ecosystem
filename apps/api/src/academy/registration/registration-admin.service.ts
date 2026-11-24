import { Injectable } from "@nestjs/common";
import type { AuthenticatedUserContext } from "../../auth/authenticated-user";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import {
  REGISTRATION_TRANSITIONS,
  type RegistrationStatus,
} from "./registration.constants";
import { toIsoDate } from "./registration.dates";
import {
  RegistrationApiException,
  withSanitizedErrors,
} from "./registration.errors";
import { writeRegistrationAudit } from "./registration-audit";
import {
  parseListQuery,
  parseSearchBody,
  parseStatusChange,
  parseUuidParam,
  type PageQuery,
} from "./registration.validation";

type RegistrationWithSession = Prisma.AcademyRegistrationGetPayload<object>;

function mapSummary(row: RegistrationWithSession) {
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    status: row.status,
    version: row.version,
    sessionId: row.sessionId,
    sessionName: row.sessionNameSnapshot,
    playerFullName: row.playerFullName,
    ageAtReference: row.ageAtReference,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDetail(
  row: RegistrationWithSession,
  consents: Array<{
    consentType: string;
    granted: boolean;
    policyVersion: string;
    locale: string;
    contentSha256: string;
    acceptedAt: Date;
    withdrawnAt: Date | null;
  }>,
) {
  return {
    ...mapSummary(row),
    player: {
      fullName: row.playerFullName,
      dateOfBirth: toIsoDate(row.playerDateOfBirth),
      ageAtReference: row.ageAtReference,
      ageReferenceDate: toIsoDate(row.ageReferenceDateUsed),
      gender: row.playerGender,
      jerseySize: row.playerJerseySize,
      phone: row.playerPhone,
    },
    guardian: {
      fullName: row.guardianFullName,
      phone: row.guardianPhone,
      relationship: row.guardianRelationship,
      authorityConfirmed: row.guardianAuthorityConfirmed,
    },
    emergencyContact: {
      fullName: row.emergencyContactName,
      phone: row.emergencyContactPhone,
      relationship: row.emergencyContactRelationship,
    },
    source: row.source,
    statusReasonCode: row.statusReasonCode,
    statusChangedAt: row.statusChangedAt?.toISOString() ?? null,
    consents: consents.map((consent) => ({
      type: consent.consentType,
      granted: consent.granted,
      policyVersion: consent.policyVersion,
      locale: consent.locale,
      contentSha256: consent.contentSha256,
      acceptedAt: consent.acceptedAt.toISOString(),
      withdrawnAt: consent.withdrawnAt?.toISOString() ?? null,
    })),
  };
}

@Injectable()
export class RegistrationAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async page(organizationId: string, query: PageQuery, text?: string) {
    const where: Prisma.AcademyRegistrationWhereInput = { organizationId };
    if (query.status) where.status = query.status;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (text) {
      const upper = text.toUpperCase();
      where.OR = [
        { playerFullName: { contains: text, mode: "insensitive" } },
        { guardianFullName: { contains: text, mode: "insensitive" } },
        { guardianPhone: { contains: text.replace(/[\s()-]/g, "") } },
        { referenceCode: { contains: upper } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.client.academyRegistration.count({ where }),
      this.prisma.client.academyRegistration.findMany({
        where,
        take: query.limit,
        skip: (query.page - 1) * query.limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    ]);
    return {
      items: rows.map(mapSummary),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  list(organizationId: string, query: unknown) {
    const parsed = parseListQuery(query);
    return withSanitizedErrors(() => this.page(organizationId, parsed));
  }

  search(organizationId: string, body: unknown) {
    const parsed = parseSearchBody(body);
    return withSanitizedErrors(() =>
      this.page(organizationId, parsed, parsed.q),
    );
  }

  /** Reading a minor's PII is itself audited (entity id only). Fails closed if audit fails. */
  detail(organizationId: string, actor: AuthenticatedUserContext, id: string) {
    const registrationId = parseUuidParam(id, "REGISTRATION_NOT_FOUND");
    return withSanitizedErrors(() =>
      this.prisma.client.$transaction(async (tx) => {
        const row = await tx.academyRegistration.findFirst({
          where: { id: registrationId, organizationId },
        });
        if (!row) {
          throw new RegistrationApiException(
            404,
            "REGISTRATION_NOT_FOUND",
            "Registration not found",
          );
        }
        const consents = await tx.academyRegistrationConsent.findMany({
          where: { organizationId, registrationId },
          orderBy: { consentType: "asc" },
        });
        await writeRegistrationAudit(tx, organizationId, actor, {
          action: "ACADEMY_REGISTRATION_DETAIL_VIEWED",
          entityType: "ACADEMY_REGISTRATION",
          entityId: registrationId,
          summary: "Academy registration detail viewed.",
        });
        return mapDetail(row, consents);
      }),
    );
  }

  changeStatus(
    organizationId: string,
    actor: AuthenticatedUserContext,
    id: string,
    body: unknown,
  ) {
    const registrationId = parseUuidParam(id, "REGISTRATION_NOT_FOUND");
    const input = parseStatusChange(body);
    return withSanitizedErrors(() =>
      this.prisma.client.$transaction(
        async (tx) => {
          // Lock order: offering -> session -> registration. The offering id is
          // read unlocked first (the session/offering link is immutable); all
          // mutable state is re-read after the locks are held.
          const link = await tx.$queryRaw<
            Array<{ session_id: string; offering_id: string }>
          >`
            SELECT r.session_id::text AS session_id, s.programme_offering_id::text AS offering_id
            FROM academy_registrations r
            JOIN academy_registration_sessions s
              ON s.id = r.session_id AND s.organization_id = r.organization_id
            WHERE r.id = ${registrationId}::uuid AND r.organization_id = ${organizationId}::uuid
          `;
          const ids = link[0];
          if (!ids) {
            throw new RegistrationApiException(
              404,
              "REGISTRATION_NOT_FOUND",
              "Registration not found",
            );
          }
          await tx.$queryRaw`
            SELECT id FROM programme_offerings
            WHERE id = ${ids.offering_id}::uuid AND organization_id = ${organizationId}::uuid
            FOR UPDATE
          `;
          await tx.$queryRaw`
            SELECT id FROM academy_registration_sessions
            WHERE id = ${ids.session_id}::uuid AND organization_id = ${organizationId}::uuid
            FOR SHARE
          `;
          const locked = await tx.$queryRaw<
            Array<{ status: RegistrationStatus; version: number }>
          >`
            SELECT status::text AS status, version
            FROM academy_registrations
            WHERE id = ${registrationId}::uuid AND organization_id = ${organizationId}::uuid
            FOR UPDATE
          `;
          const current = locked[0];
          if (!current) {
            throw new RegistrationApiException(
              404,
              "REGISTRATION_NOT_FOUND",
              "Registration not found",
            );
          }
          if (current.version !== input.expectedVersion) {
            throw new RegistrationApiException(
              409,
              "STALE_VERSION",
              "Registration was changed by someone else",
              { details: { currentVersion: current.version } },
            );
          }
          if (
            !REGISTRATION_TRANSITIONS[current.status].includes(input.status)
          ) {
            throw new RegistrationApiException(
              409,
              "INVALID_TRANSITION",
              "Status transition is not allowed",
              { details: { from: current.status, to: input.status } },
            );
          }
          if (input.status === "CONFIRMED") {
            const session = await tx.academyRegistrationSession.findFirst({
              where: { id: ids.session_id, organizationId },
              include: {
                offering: { select: { capacity: true, status: true } },
              },
            });
            if (
              !session ||
              session.publicationState !== "PUBLISHED" ||
              session.offering.status !== "OPEN"
            ) {
              throw new RegistrationApiException(
                409,
                "SESSION_NOT_AVAILABLE",
                "Session is not available for confirmation",
              );
            }
            const confirmed = await tx.academyRegistration.count({
              where: {
                organizationId,
                sessionId: ids.session_id,
                status: "CONFIRMED",
                id: { not: registrationId },
              },
            });
            if (confirmed >= session.offering.capacity) {
              throw new RegistrationApiException(
                409,
                "CAPACITY_EXCEEDED",
                "Session capacity would be exceeded",
              );
            }
          }
          const updated = await tx.academyRegistration.update({
            where: { id: registrationId },
            data: {
              status: input.status,
              statusReasonCode: input.reasonCode,
              statusChangedAt: new Date(),
              statusChangedByUserId: actor.id,
              version: { increment: 1 },
            },
          });
          await writeRegistrationAudit(tx, organizationId, actor, {
            action: "ACADEMY_REGISTRATION_STATUS_CHANGED",
            entityType: "ACADEMY_REGISTRATION",
            entityId: registrationId,
            summary: `Academy registration status changed from ${current.status} to ${input.status}.`,
            metadata: {
              from: current.status,
              to: input.status,
              reasonCode: input.reasonCode,
            },
          });
          const consents = await tx.academyRegistrationConsent.findMany({
            where: { organizationId, registrationId },
            orderBy: { consentType: "asc" },
          });
          return mapDetail(updated, consents);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 5000,
          timeout: 15000,
        },
      ),
    );
  }
}
