import { BadRequestException, Injectable } from "@nestjs/common";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { PrismaService } from "../database/prisma.service";
import type { UpdatePlatformSettingsDto } from "./admin.dto";

const SETTINGS_ID = "academy-defaults";
const AUDIT_MAX_DAYS = 366;
const AUDIT_DEFAULT_DAYS = 30;
const AUDIT_MAX_TAKE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const allowedCurrencies = new Set(["MYR", "SGD", "USD"]);
const allowedTimezones = new Set([
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "UTC",
]);

export interface AuditQuery {
  q?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  take?: string;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string, label: "from" | "to", endOfDay: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${label} must use YYYY-MM-DD`);
  }
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(`${value}${suffix}`);
  if (Number.isNaN(parsed.getTime()) || dateOnly(parsed) !== value) {
    throw new BadRequestException(`${label} is not a valid calendar date`);
  }
  return parsed;
}

function resolveAuditRange(query: AuditQuery) {
  const today = dateOnly(new Date());
  const toLabel = query.to?.trim() || today;
  const defaultFrom = new Date(`${toLabel}T00:00:00.000Z`);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (AUDIT_DEFAULT_DAYS - 1));
  const fromLabel = query.from?.trim() || dateOnly(defaultFrom);
  const from = parseDate(fromLabel, "from", false);
  const to = parseDate(toLabel, "to", true);

  if (from.getTime() > to.getTime()) {
    throw new BadRequestException("from must be on or before to");
  }

  const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
  if (days > AUDIT_MAX_DAYS) {
    throw new BadRequestException(
      `audit range cannot exceed ${AUDIT_MAX_DAYS} days`,
    );
  }

  return { from, to, fromLabel, toLabel, days };
}

function auditActor(actor: AuthenticatedUserContext) {
  return {
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRoles: actor.roles.join(", ") || "STAFF",
  };
}

@Injectable()
export class AdminGovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditEvents(query: AuditQuery) {
    const range = resolveAuditRange(query);
    const q = query.q?.trim().slice(0, 120) || undefined;
    const entityType = query.entityType?.trim().slice(0, 120) || undefined;
    const action = query.action?.trim().slice(0, 120) || undefined;
    const requestedTake = query.take ? Number.parseInt(query.take, 10) : 50;

    if (!Number.isFinite(requestedTake) || requestedTake < 1) {
      throw new BadRequestException("take must be a positive integer");
    }

    const take = Math.min(requestedTake, AUDIT_MAX_TAKE);
    const where = {
      createdAt: { gte: range.from, lte: range.to },
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
      ...(q
        ? {
            OR: [
              { actorEmail: { contains: q, mode: "insensitive" as const } },
              { actorRoles: { contains: q, mode: "insensitive" as const } },
              { action: { contains: q, mode: "insensitive" as const } },
              { entityType: { contains: q, mode: "insensitive" as const } },
              { entityId: { contains: q, mode: "insensitive" as const } },
              { summary: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [events, total, entityTypes, actions] = await Promise.all([
      this.prisma.client.auditEvent.findMany({
        where,
        take,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      this.prisma.client.auditEvent.count({ where }),
      this.prisma.client.auditEvent.findMany({
        distinct: ["entityType"],
        select: { entityType: true },
        orderBy: { entityType: "asc" },
      }),
      this.prisma.client.auditEvent.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
      }),
    ]);

    return {
      items: events.map((event) => ({
        id: event.id,
        timestamp: event.createdAt.toISOString(),
        actorUserId: event.actorUserId,
        actorName: event.actorEmail ?? event.actorUserId ?? "System",
        actorRole: event.actorRoles,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        summary: event.summary,
        metadata: event.metadata,
      })),
      total,
      limit: take,
      period: {
        from: range.fromLabel,
        to: range.toLabel,
        days: range.days,
      },
      filters: {
        entityTypes: entityTypes.map((row) => row.entityType),
        actions: actions.map((row) => row.action),
      },
    };
  }

  async getSettings() {
    const settings = await this.prisma.client.platformSetting.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        currency: "MYR",
        timezone: "Asia/Kuala_Lumpur",
      },
      update: {},
    });

    return {
      ...settings,
      systemStatus: {
        apiRequest: "AUTHENTICATED",
        database: "REACHABLE",
        auth: "VERIFIED_SESSION",
        checkedAt: new Date().toISOString(),
      },
    };
  }

  async updateSettings(
    actor: AuthenticatedUserContext,
    body: UpdatePlatformSettingsDto,
  ) {
    const currency = body.currency?.trim().toUpperCase();
    const timezone = body.timezone?.trim();

    if (!currency || !allowedCurrencies.has(currency)) {
      throw new BadRequestException("currency is unsupported");
    }
    if (!timezone || !allowedTimezones.has(timezone)) {
      throw new BadRequestException("timezone is unsupported");
    }

    return this.prisma.client.$transaction(async (transaction) => {
      const existing = await transaction.platformSetting.upsert({
        where: { id: SETTINGS_ID },
        create: {
          id: SETTINGS_ID,
          currency: "MYR",
          timezone: "Asia/Kuala_Lumpur",
        },
        update: {},
      });

      if (existing.currency === currency && existing.timezone === timezone) {
        return {
          ...existing,
          changed: false,
          systemStatus: {
            apiRequest: "AUTHENTICATED",
            database: "REACHABLE",
            auth: "VERIFIED_SESSION",
            checkedAt: new Date().toISOString(),
          },
        };
      }

      const updated = await transaction.platformSetting.update({
        where: { id: SETTINGS_ID },
        data: {
          currency,
          timezone,
          version: { increment: 1 },
        },
      });

      await transaction.auditEvent.create({
        data: {
          ...auditActor(actor),
          action: "PLATFORM_SETTINGS_UPDATED",
          entityType: "PLATFORM_SETTINGS",
          entityId: SETTINGS_ID,
          summary: `Platform defaults changed from ${existing.currency}/${existing.timezone} to ${currency}/${timezone}.`,
          metadata: {
            before: {
              currency: existing.currency,
              timezone: existing.timezone,
              version: existing.version,
            },
            after: {
              currency: updated.currency,
              timezone: updated.timezone,
              version: updated.version,
            },
          },
        },
      });

      return {
        ...updated,
        changed: true,
        systemStatus: {
          apiRequest: "AUTHENTICATED",
          database: "REACHABLE",
          auth: "VERIFIED_SESSION",
          checkedAt: new Date().toISOString(),
        },
      };
    });
  }
}
