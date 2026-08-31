import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { KHLIM_USER_ROLES, type KhlimUserRole } from "../auth/roles";
import { PrismaService } from "../database/prisma.service";
import type { UpdateAccountStatusDto, UpdateStaffRolesDto } from "./admin.dto";

const STAFF_ROLES: readonly KhlimUserRole[] = [
  "COACH",
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "EVENT_STAFF",
];
const FINANCE_ROLES = new Set<KhlimUserRole>([
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
]);
const CAPACITY_HOLDING_MEMBERSHIP_STATUSES = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
] as const;
const MEMBERSHIP_STATUSES = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
  "COMPLETED",
  "EXPIRED",
] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_MAX_DAYS = 366;
const staffRoleSet = new Set<string>(STAFF_ROLES);
const allRoleSet = new Set<string>(KHLIM_USER_ROLES);
const accountStatuses = new Set(["ACTIVE", "SUSPENDED", "DEACTIVATED"]);

interface ListUsersQuery {
  q?: string;
  status?: string;
  role?: string;
  take?: string;
}

interface OperationsReportQuery {
  from?: string;
  to?: string;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(
  value: string,
  label: "from" | "to",
  endOfDay: boolean,
): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${label} must use YYYY-MM-DD`);
  }

  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(`${value}${suffix}`);
  if (Number.isNaN(parsed.getTime()) || toDateOnly(parsed) !== value) {
    throw new BadRequestException(`${label} is not a valid calendar date`);
  }
  return parsed;
}

function resolveReportRange(query: OperationsReportQuery) {
  const now = new Date();
  const today = toDateOnly(now);
  const defaultFromDate = new Date(`${today}T00:00:00.000Z`);
  defaultFromDate.setUTCDate(defaultFromDate.getUTCDate() - 29);

  const fromLabel = query.from?.trim() || toDateOnly(defaultFromDate);
  const toLabel = query.to?.trim() || today;
  const from = parseDateOnly(fromLabel, "from", false);
  const to = parseDateOnly(toLabel, "to", true);

  if (from.getTime() > to.getTime()) {
    throw new BadRequestException("from must be on or before to");
  }

  const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
  if (days > REPORT_MAX_DAYS) {
    throw new BadRequestException(
      `report range cannot exceed ${REPORT_MAX_DAYS} days`,
    );
  }

  return { from, to, fromLabel, toLabel, days };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSession(actor: AuthenticatedUserContext) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        email: true,
        preferredLocale: true,
        guardianProfile: { select: { displayName: true } },
        coachProfile: { select: { displayName: true } },
        athleteProfile: { select: { displayName: true } },
      },
    });

    if (!user) {
      throw new NotFoundException("Staff account not found");
    }

    const displayName =
      user.coachProfile?.displayName ??
      user.guardianProfile?.displayName ??
      user.athleteProfile?.displayName ??
      user.email?.split("@")[0] ??
      "KHLIM Staff";

    return {
      id: user.id,
      email: user.email,
      displayName,
      preferredLocale: user.preferredLocale,
      roles: actor.roles,
      authenticatorAssuranceLevel: actor.authenticatorAssuranceLevel,
      mfaSatisfied: actor.authenticatorAssuranceLevel === "aal2",
    };
  }

  async getOverview(actor: AuthenticatedUserContext) {
    const canViewFinance = actor.roles.some((role) =>
      FINANCE_ROLES.has(role as KhlimUserRole),
    );

    const [
      activeMembers,
      pendingMemberships,
      totalAthletes,
      offerings,
      payments,
    ] = await Promise.all([
      this.prisma.client.membership.count({ where: { status: "ACTIVE" } }),
      this.prisma.client.membership.count({ where: { status: "PENDING" } }),
      this.prisma.client.athleteProfile.count(),
      this.prisma.client.programmeOffering.findMany({
        where: { status: "OPEN" },
        select: {
          capacity: true,
          _count: {
            select: {
              memberships: {
                where: {
                  status: {
                    in: [...CAPACITY_HOLDING_MEMBERSHIP_STATUSES],
                  },
                },
              },
            },
          },
        },
      }),
      canViewFinance
        ? this.prisma.client.payment.count({
            where: { status: { in: ["FAILED", "PROCESSING"] } },
          })
        : Promise.resolve(null),
    ]);

    const totalCapacity = offerings.reduce(
      (total, offering) => total + offering.capacity,
      0,
    );
    const occupiedCapacity = offerings.reduce(
      (total, offering) => total + offering._count.memberships,
      0,
    );

    return {
      activeMembers,
      pendingMemberships,
      totalAthletes,
      openOfferings: offerings.length,
      capacityUtilisationRate:
        totalCapacity === 0
          ? 0
          : Math.round((occupiedCapacity / totalCapacity) * 100),
      paymentsAttentionCount: payments,
      generatedAt: new Date().toISOString(),
    };
  }

  async getOperationsReport(
    actor: AuthenticatedUserContext,
    query: OperationsReportQuery,
  ) {
    const range = resolveReportRange(query);
    const canViewFinance = actor.roles.some((role) =>
      FINANCE_ROLES.has(role as KhlimUserRole),
    );

    const [
      membershipStatusCounts,
      createdMemberships,
      activatedMemberships,
      cancelledMemberships,
      scheduledSessions,
      completedSessions,
      cancelledSessions,
      attendancePresent,
      attendanceLate,
      attendanceAbsent,
      attendanceExcused,
      offerings,
      editorialReadyForReview,
      editorialVerificationBlocked,
      editorialPublished,
    ] = await Promise.all([
      Promise.all(
        MEMBERSHIP_STATUSES.map((status) =>
          this.prisma.client.membership.count({ where: { status } }),
        ),
      ),
      this.prisma.client.membership.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.client.membership.count({
        where: { activatedAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.client.membership.count({
        where: { cancelledAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.client.trainingSession.count({
        where: {
          status: "SCHEDULED",
          startsAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.client.trainingSession.count({
        where: {
          status: "COMPLETED",
          startsAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.client.trainingSession.count({
        where: {
          status: "CANCELLED",
          startsAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.client.attendanceRecord.count({
        where: {
          status: "PRESENT",
          markedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.client.attendanceRecord.count({
        where: {
          status: "LATE",
          markedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.client.attendanceRecord.count({
        where: {
          status: "ABSENT",
          markedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.client.attendanceRecord.count({
        where: {
          status: "EXCUSED",
          markedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.client.programmeOffering.findMany({
        where: { status: "OPEN" },
        select: {
          capacity: true,
          _count: {
            select: {
              memberships: {
                where: {
                  status: {
                    in: [...CAPACITY_HOLDING_MEMBERSHIP_STATUSES],
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.client.editorialEntry.count({
        where: { status: "DRAFT", factsVerified: true },
      }),
      this.prisma.client.editorialEntry.count({
        where: { status: "DRAFT", factsVerified: false },
      }),
      this.prisma.client.editorialEntry.count({
        where: { status: "PUBLISHED", factsVerified: true },
      }),
    ]);

    const membershipsByStatus = Object.fromEntries(
      MEMBERSHIP_STATUSES.map((status, index) => [
        status,
        membershipStatusCounts[index] ?? 0,
      ]),
    );

    const totalCapacity = offerings.reduce(
      (total, offering) => total + offering.capacity,
      0,
    );
    const occupiedPlaces = offerings.reduce(
      (total, offering) => total + offering._count.memberships,
      0,
    );
    const attendanceRecorded =
      attendancePresent + attendanceLate + attendanceAbsent + attendanceExcused;
    const attendanceRateDenominator =
      attendancePresent + attendanceLate + attendanceAbsent;
    const attendanceRate =
      attendanceRateDenominator === 0
        ? 0
        : Math.round(
            ((attendancePresent + attendanceLate) / attendanceRateDenominator) *
              100,
          );

    let finance: null | {
      paidPayments: number;
      failedPayments: number;
      currencyBreakdown: Array<{
        currency: string;
        paidAmountMinor: number;
        paidPayments: number;
      }>;
    } = null;

    if (canViewFinance) {
      const [paidRows, failedPayments] = await Promise.all([
        this.prisma.client.payment.findMany({
          where: {
            status: "PAID",
            settledAt: { gte: range.from, lte: range.to },
          },
          select: { amountMinor: true, currency: true },
        }),
        this.prisma.client.payment.count({
          where: {
            status: "FAILED",
            attemptedAt: { gte: range.from, lte: range.to },
          },
        }),
      ]);

      const currencyMap = new Map<
        string,
        { currency: string; paidAmountMinor: number; paidPayments: number }
      >();
      for (const payment of paidRows) {
        const current = currencyMap.get(payment.currency) ?? {
          currency: payment.currency,
          paidAmountMinor: 0,
          paidPayments: 0,
        };
        current.paidAmountMinor += payment.amountMinor;
        current.paidPayments += 1;
        currencyMap.set(payment.currency, current);
      }

      finance = {
        paidPayments: paidRows.length,
        failedPayments,
        currencyBreakdown: [...currencyMap.values()].sort((a, b) =>
          a.currency.localeCompare(b.currency),
        ),
      };
    }

    return {
      period: {
        from: range.fromLabel,
        to: range.toLabel,
        days: range.days,
      },
      memberships: {
        byStatus: membershipsByStatus,
        createdInPeriod: createdMemberships,
        activatedInPeriod: activatedMemberships,
        cancelledInPeriod: cancelledMemberships,
      },
      sessions: {
        scheduled: scheduledSessions,
        completed: completedSessions,
        cancelled: cancelledSessions,
        total: scheduledSessions + completedSessions + cancelledSessions,
      },
      attendance: {
        present: attendancePresent,
        late: attendanceLate,
        absent: attendanceAbsent,
        excused: attendanceExcused,
        recorded: attendanceRecorded,
        attendanceRate,
      },
      capacity: {
        openOfferings: offerings.length,
        totalCapacity,
        occupiedPlaces,
        availablePlaces: Math.max(0, totalCapacity - occupiedPlaces),
        utilisationRate:
          totalCapacity === 0
            ? 0
            : Math.round((occupiedPlaces / totalCapacity) * 100),
      },
      editorial: {
        readyForReview: editorialReadyForReview,
        verificationBlocked: editorialVerificationBlocked,
        published: editorialPublished,
      },
      finance,
      generatedAt: new Date().toISOString(),
    };
  }

  async listUsers(query: ListUsersQuery) {
    const q = query.q?.trim().slice(0, 120) || undefined;
    const status = query.status?.trim().toUpperCase() || undefined;
    const role = query.role?.trim().toUpperCase() || undefined;
    const requestedTake = query.take ? Number.parseInt(query.take, 10) : 25;

    if (status && !accountStatuses.has(status)) {
      throw new BadRequestException("status is invalid");
    }
    if (role && !allRoleSet.has(role)) {
      throw new BadRequestException("role is invalid");
    }
    if (!Number.isFinite(requestedTake) || requestedTake < 1) {
      throw new BadRequestException("take must be a positive integer");
    }

    const take = Math.min(requestedTake, 50);
    const where = {
      ...(status
        ? {
            status: status as "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
          }
        : {}),
      ...(role
        ? {
            roleAssignments: {
              some: { role: role as KhlimUserRole },
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              {
                guardianProfile: {
                  is: {
                    displayName: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                coachProfile: {
                  is: {
                    displayName: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                athleteProfile: {
                  is: {
                    displayName: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        take,
        orderBy: [{ updatedAt: "desc" }, { email: "asc" }],
        select: {
          id: true,
          email: true,
          status: true,
          preferredLocale: true,
          createdAt: true,
          updatedAt: true,
          roleAssignments: {
            select: { role: true },
            orderBy: { role: "asc" },
          },
          guardianProfile: { select: { displayName: true } },
          coachProfile: { select: { displayName: true } },
          athleteProfile: { select: { displayName: true } },
        },
      }),
      this.prisma.client.user.count({ where }),
    ]);

    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName:
          user.coachProfile?.displayName ??
          user.guardianProfile?.displayName ??
          user.athleteProfile?.displayName ??
          user.email?.split("@")[0] ??
          "KHLIM User",
        status: user.status,
        preferredLocale: user.preferredLocale,
        roles: user.roleAssignments.map((assignment) => assignment.role),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total,
      limit: take,
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        preferredLocale: true,
        roleAssignments: {
          select: { role: true },
          orderBy: { role: "asc" },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async replaceStaffRoles(
    actor: AuthenticatedUserContext,
    userId: string,
    body: UpdateStaffRolesDto,
  ) {
    if (actor.id === userId) {
      throw new ForbiddenException("Staff cannot change their own roles");
    }

    if (!Array.isArray(body?.roles)) {
      throw new BadRequestException("roles must be an array");
    }

    const roles = [...new Set(body.roles)];
    if (
      roles.some((role) => typeof role !== "string" || !staffRoleSet.has(role))
    ) {
      throw new BadRequestException("roles contains an unsupported staff role");
    }

    if (roles.includes("SUPER_ADMIN") && !actor.roles.includes("SUPER_ADMIN")) {
      throw new ForbiddenException("Only a Super Admin can assign Super Admin");
    }

    const target = await this.getUser(userId);
    const targetRoles = target.roleAssignments.map(
      (assignment) => assignment.role,
    );
    if (
      targetRoles.includes("SUPER_ADMIN") &&
      !actor.roles.includes("SUPER_ADMIN")
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify a Super Admin",
      );
    }

    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.userRoleAssignment.deleteMany({
        where: {
          userId,
          role: { in: [...STAFF_ROLES] },
        },
      });

      if (roles.length > 0) {
        await transaction.userRoleAssignment.createMany({
          data: roles.map((role) => ({
            userId,
            role: role as KhlimUserRole,
          })),
          skipDuplicates: true,
        });
      }

      const assignments = await transaction.userRoleAssignment.findMany({
      where: { userId },
      select: { role: true },
      orderBy: { role: "asc" },
    });

    await transaction.auditEvent.create({
      data: {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRoles: actor.roles.join(", ") || "STAFF",
        action: "STAFF_ROLES_REPLACED",
        entityType: "USER",
        entityId: userId,
        summary: `Staff roles for ${target.email ?? userId} changed from ${targetRoles.join(", ") || "none"} to ${roles.join(", ") || "none"}.`,
        metadata: {
          before: targetRoles,
          after: assignments.map((assignment) => assignment.role),
        },
      },
    });

    return assignments;
    });
  }

  async updateAccountStatus(
    actor: AuthenticatedUserContext,
    userId: string,
    body: UpdateAccountStatusDto,
  ) {
    if (actor.id === userId) {
      throw new ForbiddenException(
        "Staff cannot change their own account status",
      );
    }

    if (typeof body?.status !== "string" || !accountStatuses.has(body.status)) {
      throw new BadRequestException("status is invalid");
    }

    const target = await this.getUser(userId);
    const targetRoles = target.roleAssignments.map(
      (assignment) => assignment.role,
    );
    if (
      targetRoles.includes("SUPER_ADMIN") &&
      !actor.roles.includes("SUPER_ADMIN")
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify a Super Admin",
      );
    }

    return this.prisma.client.$transaction(async (transaction) => {
    const updated = await transaction.user.update({
      where: { id: userId },
      data: {
        status: body.status as "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    await transaction.auditEvent.create({
      data: {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRoles: actor.roles.join(", ") || "STAFF",
        action: "ACCOUNT_STATUS_UPDATED",
        entityType: "USER",
        entityId: userId,
        summary: `Account status for ${target.email ?? userId} changed from ${target.status} to ${updated.status}.`,
        metadata: {
          before: { status: target.status },
          after: { status: updated.status },
        },
      },
    });

    return updated;
  });
  }
}
