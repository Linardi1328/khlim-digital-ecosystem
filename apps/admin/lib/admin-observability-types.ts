export interface AdminOperationalHealth {
  window: {
    days: number;
    from: string;
    to: string;
  };
  kpis: {
    activeMemberships: number;
    pendingMemberships: number;
    membershipActivations: number;
    membershipCancellations: number;
    netMembershipMovement: number;
    attendanceRate: number;
    sessionCompletionRate: number;
    capacityUtilisationRate: number;
    notificationReadRate: number;
    notificationsCreated: number;
  };
  workload: {
    stalePendingMemberships: number;
    overdueScheduledSessions: number;
    editorialBlocked: number;
    unreadNotificationReceipts: number;
  };
  finance: null | {
    failedPaymentsInWindow: number;
    staleProcessingPayments: number;
    providerEventsActionRequired: number;
    providerEventsFailed: number;
    providerEventsStuckReceived: number;
  };
  thresholds: {
    stalePendingMembershipHours: number;
    staleProcessingPaymentMinutes: number;
    stuckProviderEventMinutes: number;
  };
  generatedAt: string;
}
