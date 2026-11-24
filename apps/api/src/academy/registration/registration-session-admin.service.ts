import { Injectable } from "@nestjs/common";
import type { AuthenticatedUserContext } from "../../auth/authenticated-user";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import {
  parseCreateSession,
  parsePatchSession,
  parsePublishSession,
  parseVersionOnly,
  type SessionFieldChanges,
} from "./registration-admin.validation";
import { REGISTRATION_STATUSES } from "./registration.constants";
import {
  isoWeekday,
  toIsoDate,
  todayInAcademyZone,
} from "./registration.dates";
import {
  RegistrationApiException,
  type RegistrationFieldError,
  validationFailed,
  withSanitizedErrors,
} from "./registration.errors";
import { writeRegistrationAudit } from "./registration-audit";
import { RegistrationPolicyService } from "./registration-policy.service";
import { parseUuidParam } from "./registration.validation";

type SessionRow = Prisma.AcademyRegistrationSessionGetPayload<{
  include: { offering: { include: { programme: true; venue: true } } };
}>;

const SESSION_INCLUDE = {
  offering: { include: { programme: true, venue: true } },
} as const;

const PUBLISHED_EDITABLE = new Set([
  "coachDisplayName",
  "capacity",
  "enrollmentOpensAt",
  "enrollmentClosesAt",
]);

const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5000,
  timeout: 15000,
} as const;

function mapSession(row: SessionRow, counts: Record<string, number>) {
  const offering = row.offering;
  const confirmed = counts.CONFIRMED ?? 0;
  return {
    id: row.id,
    programmeOfferingId: row.programmeOfferingId,
    name: offering.name,
    publicationState: row.publicationState,
    version: row.version,
    programme: {
      id: offering.programme.id,
      name: offering.programme.name,
      minimumAge: offering.programme.minimumAge,
      maximumAge: offering.programme.maximumAge,
    },
    venue: offering.venue
      ? {
          id: offering.venue.id,
          name: offering.venue.name,
          address: offering.venue.address,
        }
      : null,
    capacity: offering.capacity,
    seatsRemaining: Math.max(0, offering.capacity - confirmed),
    seatCounts: Object.fromEntries(
      REGISTRATION_STATUSES.map((status) => [status, counts[status] ?? 0]),
    ),
    enrollmentOpensAt: offering.enrollmentOpensAt?.toISOString() ?? null,
    enrollmentClosesAt: offering.enrollmentClosesAt?.toISOString() ?? null,
    coachDisplayName: row.coachDisplayName,
    weekday: row.weekday,
    startTime: row.startTime,
    endTime: row.endTime,
    timezone: row.timezone,
    firstSessionDate: row.firstSessionDate
      ? toIsoDate(row.firstSessionDate)
      : null,
    recurrence: row.recurrence,
    ageReferenceRule: row.ageReferenceRule,
    ageReferenceDate: row.ageReferenceDate
      ? toIsoDate(row.ageReferenceDate)
      : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

interface Schedule {
  weekday: number | null;
  startTime: string | null;
  endTime: string | null;
  firstSessionDate: string | null;
  ageReferenceRule: string | null;
  ageReferenceDate: string | null;
  enrollmentOpensAt: Date | null;
  enrollmentClosesAt: Date | null;
}

function scheduleErrors(s: Schedule): RegistrationFieldError[] {
  const errors: RegistrationFieldError[] = [];
  if (s.startTime && s.endTime && s.startTime >= s.endTime) {
    errors.push({ field: "endTime", code: "OUT_OF_RANGE" });
  }
  if (
    s.weekday &&
    s.firstSessionDate &&
    isoWeekday(s.firstSessionDate) !== s.weekday
  ) {
    errors.push({ field: "firstSessionDate", code: "INVALID_VALUE" });
  }
  if (s.ageReferenceRule === "FIXED_DATE" && !s.ageReferenceDate) {
    errors.push({ field: "ageReferenceDate", code: "REQUIRED" });
  }
  if (s.ageReferenceRule !== "FIXED_DATE" && s.ageReferenceDate) {
    errors.push({ field: "ageReferenceDate", code: "INVALID_VALUE" });
  }
  if (
    s.enrollmentOpensAt &&
    s.enrollmentClosesAt &&
    s.enrollmentClosesAt < s.enrollmentOpensAt
  ) {
    errors.push({ field: "enrollmentClosesAt", code: "OUT_OF_RANGE" });
  }
  return errors;
}

@Injectable()
export class RegistrationSessionAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: RegistrationPolicyService,
  ) {}

  private async countsFor(
    client: Prisma.TransactionClient | PrismaService["client"],
    organizationId: string,
    sessionIds: string[],
  ): Promise<Map<string, Record<string, number>>> {
    const map = new Map<string, Record<string, number>>();
    if (!sessionIds.length) return map;
    const groups = await client.academyRegistration.groupBy({
      by: ["sessionId", "status"],
      where: { organizationId, sessionId: { in: sessionIds } },
      _count: { _all: true },
    });
    for (const group of groups) {
      const entry = map.get(group.sessionId) ?? {};
      entry[group.status] = group._count._all;
      map.set(group.sessionId, entry);
    }
    return map;
  }

  list(organizationId: string) {
    return withSanitizedErrors(async () => {
      const rows = await this.prisma.client.academyRegistrationSession.findMany(
        {
          where: { organizationId },
          include: SESSION_INCLUDE,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 100,
        },
      );
      const counts = await this.countsFor(
        this.prisma.client,
        organizationId,
        rows.map((row) => row.id),
      );
      return {
        items: rows.map((row) => mapSession(row, counts.get(row.id) ?? {})),
      };
    });
  }

  get(organizationId: string, id: string) {
    const sessionId = parseUuidParam(id, "SESSION_NOT_FOUND");
    return withSanitizedErrors(async () => {
      const row = await this.prisma.client.academyRegistrationSession.findFirst(
        {
          where: { id: sessionId, organizationId },
          include: SESSION_INCLUDE,
        },
      );
      if (!row) throw this.notFound();
      const counts = await this.countsFor(this.prisma.client, organizationId, [
        row.id,
      ]);
      return mapSession(row, counts.get(row.id) ?? {});
    });
  }

  private notFound(): RegistrationApiException {
    return new RegistrationApiException(
      404,
      "SESSION_NOT_FOUND",
      "Session not found",
    );
  }

  create(
    organizationId: string,
    actor: AuthenticatedUserContext,
    body: unknown,
  ) {
    const input = parseCreateSession(body);
    const errors = scheduleErrors({
      weekday: input.weekday ?? null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      firstSessionDate: input.firstSessionDate ?? null,
      ageReferenceRule: input.ageReferenceRule ?? null,
      ageReferenceDate: input.ageReferenceDate ?? null,
      enrollmentOpensAt: input.enrollmentOpensAt ?? null,
      enrollmentClosesAt: input.enrollmentClosesAt ?? null,
    });
    if (errors.length) throw validationFailed(errors);
    return withSanitizedErrors(() =>
      this.prisma.client.$transaction(async (tx) => {
        const programme = await tx.programme.findFirst({
          where: { id: input.programmeId, organizationId, active: true },
          select: { id: true },
        });
        if (!programme) {
          throw new RegistrationApiException(
            404,
            "PROGRAMME_NOT_FOUND",
            "Programme not found",
          );
        }
        const venue = await tx.venue.findFirst({
          where: { id: input.venueId, organizationId, active: true },
          select: { id: true },
        });
        if (!venue) {
          throw new RegistrationApiException(
            404,
            "VENUE_NOT_FOUND",
            "Venue not found",
          );
        }
        const offering = await tx.programmeOffering.create({
          data: {
            organizationId,
            programmeId: programme.id,
            venueId: venue.id,
            name: input.name,
            capacity: input.capacity,
            enrollmentOpensAt: input.enrollmentOpensAt ?? null,
            enrollmentClosesAt: input.enrollmentClosesAt ?? null,
            status: "DRAFT",
          },
        });
        const session = await tx.academyRegistrationSession.create({
          data: {
            organizationId,
            programmeOfferingId: offering.id,
            coachDisplayName: input.coachDisplayName ?? null,
            weekday: input.weekday ?? null,
            startTime: input.startTime ?? null,
            endTime: input.endTime ?? null,
            firstSessionDate: input.firstSessionDate
              ? new Date(`${input.firstSessionDate}T00:00:00.000Z`)
              : null,
            recurrence: input.recurrence ?? null,
            ageReferenceRule: input.ageReferenceRule ?? null,
            ageReferenceDate: input.ageReferenceDate
              ? new Date(`${input.ageReferenceDate}T00:00:00.000Z`)
              : null,
          },
          include: SESSION_INCLUDE,
        });
        await writeRegistrationAudit(tx, organizationId, actor, {
          action: "ACADEMY_REGISTRATION_SESSION_CREATED",
          entityType: "ACADEMY_REGISTRATION_SESSION",
          entityId: session.id,
          summary: "Academy registration session draft created.",
        });
        return mapSession(session, {});
      }, TX_OPTIONS),
    );
  }

  /** Lock order: offering -> session. Returns the freshly re-read session. */
  private async lockSession(
    tx: Prisma.TransactionClient,
    organizationId: string,
    sessionId: string,
  ): Promise<SessionRow> {
    const link = await tx.$queryRaw<Array<{ offering_id: string }>>`
      SELECT programme_offering_id::text AS offering_id
      FROM academy_registration_sessions
      WHERE id = ${sessionId}::uuid AND organization_id = ${organizationId}::uuid
    `;
    const offeringId = link[0]?.offering_id;
    if (!offeringId) throw this.notFound();
    await tx.$queryRaw`
      SELECT id FROM programme_offerings
      WHERE id = ${offeringId}::uuid AND organization_id = ${organizationId}::uuid
      FOR UPDATE
    `;
    await tx.$queryRaw`
      SELECT id FROM academy_registration_sessions
      WHERE id = ${sessionId}::uuid AND organization_id = ${organizationId}::uuid
      FOR UPDATE
    `;
    const row = await tx.academyRegistrationSession.findFirst({
      where: { id: sessionId, organizationId },
      include: SESSION_INCLUDE,
    });
    if (!row) throw this.notFound();
    return row;
  }

  private assertVersion(row: SessionRow, expected: number): void {
    if (row.version !== expected) {
      throw new RegistrationApiException(
        409,
        "STALE_VERSION",
        "Session was changed by someone else",
        { details: { currentVersion: row.version } },
      );
    }
  }

  patch(
    organizationId: string,
    actor: AuthenticatedUserContext,
    id: string,
    body: unknown,
  ) {
    const sessionId = parseUuidParam(id, "SESSION_NOT_FOUND");
    const { expectedVersion, changes } = parsePatchSession(body);
    return withSanitizedErrors(() =>
      this.prisma.client.$transaction(async (tx) => {
        const row = await this.lockSession(tx, organizationId, sessionId);
        this.assertVersion(row, expectedVersion);
        if (row.publicationState === "CLOSED") {
          throw new RegistrationApiException(
            409,
            "SESSION_NOT_EDITABLE",
            "A closed session cannot be edited",
          );
        }
        const keys = Object.keys(changes) as Array<keyof SessionFieldChanges>;
        if (row.publicationState === "PUBLISHED") {
          const blocked = keys.filter((key) => !PUBLISHED_EDITABLE.has(key));
          if (blocked.length) {
            throw new RegistrationApiException(
              409,
              "SESSION_NOT_EDITABLE",
              "These fields cannot change on a published session",
              {
                fieldErrors: blocked.map((field) => ({
                  field,
                  code: "NOT_EDITABLE",
                })),
              },
            );
          }
          if (changes.coachDisplayName === null) {
            throw validationFailed([
              { field: "coachDisplayName", code: "REQUIRED" },
            ]);
          }
        }
        const offering = row.offering;
        if (changes.capacity !== undefined) {
          const confirmed = await tx.academyRegistration.count({
            where: { organizationId, sessionId, status: "CONFIRMED" },
          });
          if (changes.capacity < confirmed) {
            throw new RegistrationApiException(
              409,
              "CAPACITY_BELOW_CONFIRMED",
              "Capacity cannot be lower than confirmed registrations",
              { details: { confirmed } },
            );
          }
        }
        if (changes.venueId !== undefined) {
          const venue = await tx.venue.findFirst({
            where: { id: changes.venueId, organizationId, active: true },
            select: { id: true },
          });
          if (!venue) {
            throw new RegistrationApiException(
              404,
              "VENUE_NOT_FOUND",
              "Venue not found",
            );
          }
        }
        const merged = {
          weekday:
            changes.weekday !== undefined ? changes.weekday : row.weekday,
          startTime:
            changes.startTime !== undefined ? changes.startTime : row.startTime,
          endTime:
            changes.endTime !== undefined ? changes.endTime : row.endTime,
          firstSessionDate:
            changes.firstSessionDate !== undefined
              ? changes.firstSessionDate
              : row.firstSessionDate
                ? toIsoDate(row.firstSessionDate)
                : null,
          ageReferenceRule:
            changes.ageReferenceRule !== undefined
              ? changes.ageReferenceRule
              : row.ageReferenceRule,
          ageReferenceDate:
            changes.ageReferenceDate !== undefined
              ? changes.ageReferenceDate
              : changes.ageReferenceRule !== undefined &&
                  changes.ageReferenceRule !== "FIXED_DATE"
                ? null
                : row.ageReferenceDate
                  ? toIsoDate(row.ageReferenceDate)
                  : null,
          enrollmentOpensAt:
            changes.enrollmentOpensAt !== undefined
              ? changes.enrollmentOpensAt
              : offering.enrollmentOpensAt,
          enrollmentClosesAt:
            changes.enrollmentClosesAt !== undefined
              ? changes.enrollmentClosesAt
              : offering.enrollmentClosesAt,
        };
        const errors = scheduleErrors(merged);
        if (errors.length) throw validationFailed(errors);

        await tx.programmeOffering.update({
          where: { id: offering.id },
          data: {
            ...(changes.name !== undefined ? { name: changes.name } : {}),
            ...(changes.capacity !== undefined
              ? { capacity: changes.capacity }
              : {}),
            ...(changes.venueId !== undefined
              ? { venueId: changes.venueId }
              : {}),
            ...(changes.enrollmentOpensAt !== undefined
              ? { enrollmentOpensAt: changes.enrollmentOpensAt }
              : {}),
            ...(changes.enrollmentClosesAt !== undefined
              ? { enrollmentClosesAt: changes.enrollmentClosesAt }
              : {}),
          },
        });
        const updated = await tx.academyRegistrationSession.update({
          where: { id: sessionId },
          data: {
            coachDisplayName:
              changes.coachDisplayName !== undefined
                ? changes.coachDisplayName
                : undefined,
            weekday: merged.weekday,
            startTime: merged.startTime,
            endTime: merged.endTime,
            firstSessionDate: merged.firstSessionDate
              ? new Date(`${merged.firstSessionDate}T00:00:00.000Z`)
              : null,
            recurrence:
              changes.recurrence !== undefined ? changes.recurrence : undefined,
            ageReferenceRule: merged.ageReferenceRule as never,
            ageReferenceDate: merged.ageReferenceDate
              ? new Date(`${merged.ageReferenceDate}T00:00:00.000Z`)
              : null,
            version: { increment: 1 },
          },
          include: SESSION_INCLUDE,
        });
        await writeRegistrationAudit(tx, organizationId, actor, {
          action: "ACADEMY_REGISTRATION_SESSION_UPDATED",
          entityType: "ACADEMY_REGISTRATION_SESSION",
          entityId: sessionId,
          summary: "Academy registration session updated.",
          metadata: { fields: keys.join(",") },
        });
        const counts = await this.countsFor(tx, organizationId, [sessionId]);
        return mapSession(updated, counts.get(sessionId) ?? {});
      }, TX_OPTIONS),
    );
  }

  publish(
    organizationId: string,
    actor: AuthenticatedUserContext,
    id: string,
    body: unknown,
  ) {
    const sessionId = parseUuidParam(id, "SESSION_NOT_FOUND");
    const { expectedVersion } = parsePublishSession(body);
    return withSanitizedErrors(() =>
      this.prisma.client.$transaction(async (tx) => {
        const row = await this.lockSession(tx, organizationId, sessionId);
        this.assertVersion(row, expectedVersion);
        if (row.publicationState !== "DRAFT") {
          throw new RegistrationApiException(
            409,
            "INVALID_TRANSITION",
            "Only a draft session can be published",
          );
        }
        const offering = row.offering;
        const programme = offering.programme;
        const missing: RegistrationFieldError[] = [];
        const need = (value: unknown, field: string) => {
          if (value === null || value === undefined || value === "") {
            missing.push({ field, code: "REQUIRED" });
          }
        };
        need(row.coachDisplayName, "coachDisplayName");
        need(row.weekday, "weekday");
        need(row.startTime, "startTime");
        need(row.endTime, "endTime");
        need(row.firstSessionDate, "firstSessionDate");
        need(row.recurrence, "recurrence");
        need(row.ageReferenceRule, "ageReferenceRule");
        need(offering.venueId, "venueId");
        need(programme.minimumAge, "programme.minimumAge");
        need(programme.maximumAge, "programme.maximumAge");
        if (offering.capacity <= 0)
          missing.push({ field: "capacity", code: "OUT_OF_RANGE" });
        if (!programme.active)
          missing.push({ field: "programme", code: "INVALID_VALUE" });
        if (
          programme.minimumAge !== null &&
          programme.maximumAge !== null &&
          programme.minimumAge > programme.maximumAge
        ) {
          missing.push({ field: "programme.minimumAge", code: "OUT_OF_RANGE" });
        }
        const firstDate = row.firstSessionDate
          ? toIsoDate(row.firstSessionDate)
          : null;
        if (firstDate && firstDate < todayInAcademyZone()) {
          missing.push({ field: "firstSessionDate", code: "OUT_OF_RANGE" });
        }
        missing.push(
          ...scheduleErrors({
            weekday: row.weekday,
            startTime: row.startTime,
            endTime: row.endTime,
            firstSessionDate: firstDate,
            ageReferenceRule: row.ageReferenceRule,
            ageReferenceDate: row.ageReferenceDate
              ? toIsoDate(row.ageReferenceDate)
              : null,
            enrollmentOpensAt: offering.enrollmentOpensAt,
            enrollmentClosesAt: offering.enrollmentClosesAt,
          }),
        );
        const policy = await tx.academyRegistrationPolicy.findFirst({
          where: { organizationId, status: "APPROVED" },
          select: { id: true },
        });
        if (!policy) missing.push({ field: "consentPolicy", code: "REQUIRED" });
        if (missing.length) {
          throw new RegistrationApiException(
            409,
            "SESSION_INCOMPLETE",
            "Session is not complete enough to publish",
            { fieldErrors: missing },
          );
        }
        await tx.programmeOffering.update({
          where: { id: offering.id },
          data: { status: "OPEN" },
        });
        const updated = await tx.academyRegistrationSession.update({
          where: { id: sessionId },
          data: {
            publicationState: "PUBLISHED",
            publishedAt: new Date(),
            publishedByUserId: actor.id,
            version: { increment: 1 },
          },
          include: SESSION_INCLUDE,
        });
        await writeRegistrationAudit(tx, organizationId, actor, {
          action: "ACADEMY_REGISTRATION_SESSION_PUBLISHED",
          entityType: "ACADEMY_REGISTRATION_SESSION",
          entityId: sessionId,
          summary: "Academy registration session published.",
          metadata: { scheduleApproved: true, ageRuleApproved: true },
        });
        return mapSession(updated, {});
      }, TX_OPTIONS),
    );
  }

  close(
    organizationId: string,
    actor: AuthenticatedUserContext,
    id: string,
    body: unknown,
  ) {
    const sessionId = parseUuidParam(id, "SESSION_NOT_FOUND");
    const { expectedVersion } = parseVersionOnly(body);
    return withSanitizedErrors(() =>
      this.prisma.client.$transaction(async (tx) => {
        const row = await this.lockSession(tx, organizationId, sessionId);
        this.assertVersion(row, expectedVersion);
        if (row.publicationState !== "PUBLISHED") {
          throw new RegistrationApiException(
            409,
            "INVALID_TRANSITION",
            "Only a published session can be closed",
          );
        }
        await tx.programmeOffering.update({
          where: { id: row.offering.id },
          data: { status: "CLOSED" },
        });
        const updated = await tx.academyRegistrationSession.update({
          where: { id: sessionId },
          data: {
            publicationState: "CLOSED",
            closedAt: new Date(),
            version: { increment: 1 },
          },
          include: SESSION_INCLUDE,
        });
        await writeRegistrationAudit(tx, organizationId, actor, {
          action: "ACADEMY_REGISTRATION_SESSION_CLOSED",
          entityType: "ACADEMY_REGISTRATION_SESSION",
          entityId: sessionId,
          summary: "Academy registration session closed.",
        });
        const counts = await this.countsFor(tx, organizationId, [sessionId]);
        return mapSession(updated, counts.get(sessionId) ?? {});
      }, TX_OPTIONS),
    );
  }
}
