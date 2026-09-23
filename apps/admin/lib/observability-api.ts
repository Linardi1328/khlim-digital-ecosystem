"use client";

import { adminApiClient } from "./admin-api";
import { ADMIN_DEMO_MODE } from "./demo-mode";
import type { AdminOperationalHealth } from "./admin-observability-types";

function demoOperationalHealth(): AdminOperationalHealth {
  const generatedAt = new Date();
  const from = new Date(generatedAt.getTime() - 29 * 24 * 60 * 60 * 1000);

  return {
    window: {
      days: 30,
      from: from.toISOString(),
      to: generatedAt.toISOString(),
    },
    kpis: {
      activeMemberships: 42,
      pendingMemberships: 4,
      membershipActivations: 7,
      membershipCancellations: 2,
      netMembershipMovement: 5,
      attendanceRate: 91,
      sessionCompletionRate: 92,
      capacityUtilisationRate: 64,
      notificationReadRate: 78,
      notificationsCreated: 6,
    },
    workload: {
      stalePendingMemberships: 2,
      overdueScheduledSessions: 1,
      editorialBlocked: 1,
      unreadNotificationReceipts: 18,
    },
    finance: {
      failedPaymentsInWindow: 3,
      staleProcessingPayments: 1,
      providerEventsActionRequired: 1,
      providerEventsFailed: 0,
      providerEventsStuckReceived: 0,
    },
    thresholds: {
      stalePendingMembershipHours: 24,
      staleProcessingPaymentMinutes: 30,
      stuckProviderEventMinutes: 15,
    },
    generatedAt: generatedAt.toISOString(),
  };
}

export function getAdminOperationalHealth(): Promise<AdminOperationalHealth> {
  if (ADMIN_DEMO_MODE) {
    return Promise.resolve(demoOperationalHealth());
  }

  return adminApiClient.get<AdminOperationalHealth>(
    "/admin/insights/operational-health",
  );
}
