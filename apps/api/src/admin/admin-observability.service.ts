import { Injectable } from "@nestjs/common";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import type { KhlimUserRole } from "../auth/roles";
import { PrismaService } from "../database/prisma.service";

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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const KPI_WINDOW_DAYS = 30;
const STALE_PENDING_MEMBERSHIP_HOURS = 24;
const STALE_PROCESSING_PAYMENT_MINUTES = 30;
const STUCK_PROVIDER_EVENT_MINUTES = 15;

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

@Injectable()
export class AdminObservabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperationalHealth(actor: AuthenticatedUserContext) {
    const now = new Date();
    const windowFrom = new Date(now.getTime() - (KPI_WINDOW_DAYS - 1) * DAY_MS);
    const stalePendingBefore = new Date(
      now.getTime() - STALE_PENDING_MEMBERSHIP_HOURS * HOUR_MS,
    );
    const canViewFinance = actor.roles.some((role) =>
      FINANCE_ROLES.has(role as KhlimUserRole),
    );

    const [
      activeMemberships,
      pendingMemberships,
      membershipActivations,
      membershipCancellations,
      attendancePresent,
      attendanceLate,
      attendanceAbsent,
      completedSessions,
      cancelledSessions,
      offerings,
      notificationsCreated,
      notificationReceipts,
      notificationReceiptsRead,
      stalePendingMemberships,
      overdueScheduledSessions,
      editorialBlocked,
    ] = await Promise.all([
      this.prisma.client.membership.count({ where: { status: "ACTIVE" } }),
      this.prisma.client.membership.count({ where: { status: "PENDING" } }),
      this.prisma.client.membership.count({
        where: { activatedAt: { gte: windowFrom, lte: now } },
      }),
      this.prisma.client.membership.count({
        where: { cancelledAt: { gte: windowFrom, lte: now } },
      }),
      this.prisma.client.attendanceRecord.count({
        where: {
          status: "PRESENT",
          markedAt: { gte: windowFrom, lte: now },
        },
      }),
      this.prisma.client.attendanceRecord.count({
        where: {
          status: "LATE",
          markedAt: { gte: windowFrom, lte: now },
        },
      }),
      this.prisma.client.attendanceRecord.count({
        where: {
          status: "ABSENT",
          markedAt: { gte: windowFrom, lte: now },
        },
      }),
      this.prisma.client.trainingSession.count({
        where: {
          status: "COMPLETED",
          startsAt: { gte: windowFrom, lte: now },
        },
      }),
      this.prisma.client.trainingSession.count({
        where: {
          status: "CANCELLED",
          startsAt: { gte: windowFrom, lte: now },
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
      this.prisma.client.notification.count({
        where: { createdAt: { gte: windowFrom, lte: now } },
      }),
      this.prisma.client.notificationReceipt.count({
        where: { createdAt: { gte: windowFrom, lte: now } },
      }),
      this.prisma.client.notificationReceipt.count({
        where: {
          createdAt: { gte: windowFrom, lte: now },
          readAt: { not: null },
        },
      }),
      this.prisma.client.membership.count({
        where: {
          status: "PENDING",
          createdAt: { lt: stalePendingBefore },
        },
      }),
      this.prisma.client.trainingSession.count({
        where: {
          status: "SCHEDULED",
          endsAt: { lt: now },
        },
      }),
      this.prisma.client.editorialEntry.count({
        where: { status: "DRAFT", factsVerified: false },
      }),
    ]);

    const totalCapacity = offerings.reduce(
      (total, offering) => total + offering.capacity,
      0,
    );
    const occupiedPlaces = offerings.reduce(
      (total, offering) => total + offering._count.memberships,
      0,
    );
    const attendanceDenominator =
      attendancePresent + attendanceLate + attendanceAbsent;
    const closedSessions = completedSessions + cancelledSessions;
    const unreadNotificationReceipts = Math.max(
      0,
      notificationReceipts - notificationReceiptsRead,
    );

    let finance: null | {
      failedPaymentsInWindow: number;
      staleProcessingPayments: number;
      providerEventsActionRequired: number;
      providerEventsFailed: number;
      providerEventsStuckReceived: number;
    } = null;

    if (canViewFinance) {
      const staleProcessingBefore = new Date(
        now.getTime() - STALE_PROCESSING_PAYMENT_MINUTES * MINUTE_MS,
      );
      const stuckProviderEventBefore = new Date(
        now.getTime() - STUCK_PROVIDER_EVENT_MINUTES * MINUTE_MS,
      );

      const [
        failedPaymentsInWindow,
        staleProcessingPayments,
        providerEventsActionRequired,
        providerEventsFailed,
        providerEventsStuckReceived,
      ] = await Promise.all([
        this.prisma.client.payment.count({
          where: {
            status: "FAILED",
            attemptedAt: { gte: windowFrom, lte: now },
          },
        }),
        this.prisma.client.payment.count({
          where: {
            status: "PROCESSING",
            attemptedAt: { lt: staleProcessingBefore },
          },
        }),
        this.prisma.client.paymentProviderEvent.count({
          where: {
            processingStatus: "ACTION_REQUIRED",
            receivedAt: { gte: windowFrom, lte: now },
          },
        }),
        this.prisma.client.paymentProviderEvent.count({
          where: {
            processingStatus: "FAILED",
            receivedAt: { gte: windowFrom, lte: now },
          },
        }),
        this.prisma.client.paymentProviderEvent.count({
          where: {
            processingStatus: "RECEIVED",
            receivedAt: { lt: stuckProviderEventBefore },
          },
        }),
      ]);

      finance = {
        failedPaymentsInWindow,
        staleProcessingPayments,
        providerEventsActionRequired,
        providerEventsFailed,
        providerEventsStuckReceived,
      };
    }

    return {
      window: {
        days: KPI_WINDOW_DAYS,
        from: windowFrom.toISOString(),
        to: now.toISOString(),
      },
      kpis: {
        activeMemberships,
        pendingMemberships,
        membershipActivations,
        membershipCancellations,
        netMembershipMovement: membershipActivations - membershipCancellations,
        attendanceRate: percentage(
          attendancePresent + attendanceLate,
          attendanceDenominator,
        ),
        sessionCompletionRate: percentage(completedSessions, closedSessions),
        capacityUtilisationRate: percentage(occupiedPlaces, totalCapacity),
        notificationReadRate: percentage(
          notificationReceiptsRead,
          notificationReceipts,
        ),
        notificationsCreated,
      },
      workload: {
        stalePendingMemberships,
        overdueScheduledSessions,
        editorialBlocked,
        unreadNotificationReceipts,
      },
      finance,
      thresholds: {
        stalePendingMembershipHours: STALE_PENDING_MEMBERSHIP_HOURS,
        staleProcessingPaymentMinutes: STALE_PROCESSING_PAYMENT_MINUTES,
        stuckProviderEventMinutes: STUCK_PROVIDER_EVENT_MINUTES,
      },
      generatedAt: now.toISOString(),
    };
  }
}
