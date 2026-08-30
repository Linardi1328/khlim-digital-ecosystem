import type { MembershipStatus } from "./types";

export interface AdminReportPeriod {
  from: string;
  to: string;
  days: number;
}

export interface AdminOperationsReport {
  period: AdminReportPeriod;
  memberships: {
    byStatus: Record<MembershipStatus, number>;
    createdInPeriod: number;
    activatedInPeriod: number;
    cancelledInPeriod: number;
  };
  sessions: {
    scheduled: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  attendance: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    recorded: number;
    attendanceRate: number;
  };
  capacity: {
    openOfferings: number;
    totalCapacity: number;
    occupiedPlaces: number;
    availablePlaces: number;
    utilisationRate: number;
  };
  editorial: {
    readyForReview: number;
    verificationBlocked: number;
    published: number;
  };
  finance: null | {
    paidPayments: number;
    failedPayments: number;
    currencyBreakdown: Array<{
      currency: string;
      paidAmountMinor: number;
      paidPayments: number;
    }>;
  };
  generatedAt: string;
}

export interface AdminOperationsReportQuery {
  from?: string;
  to?: string;
}

export type EditorialModerationState = "READY" | "BLOCKED" | "LIVE";

export interface EditorialModerationItem {
  id: string;
  type: "ACHIEVEMENT" | "PLAYER_SPOTLIGHT";
  slug?: string | null;
  title: string;
  eventName: string;
  summary: string;
  yearLabel?: string | null;
  playerName?: string | null;
  achievement?: string | null;
  achievedOnLabel?: string | null;
  articleParagraphs?: string[] | null;
  photoLabel: string;
  imageUrl?: string | null;
  factsVerified: boolean;
  aiAssisted: boolean;
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  moderationState: EditorialModerationState;
  moderationBlockers: string[];
}
