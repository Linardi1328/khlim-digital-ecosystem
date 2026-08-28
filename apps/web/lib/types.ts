import type { components } from "@khlim/api-client/schema";
import type { SupportedLocale } from "@khlim/i18n";

type GeneratedUpsertGuardianProfileDto =
  components["schemas"]["UpsertGuardianProfileDto"];

export type UpsertGuardianProfileDto = Omit<
  GeneratedUpsertGuardianProfileDto,
  "phone"
> & {
  phone?: string | null;
};
export type UpdatePreferencesDto =
  components["schemas"]["UpdatePreferencesDto"];
export type CreateManagedAthleteDto =
  components["schemas"]["CreateManagedAthleteDto"];
export type UpdateAthleteDto = components["schemas"]["UpdateAthleteDto"];
export type CreatePendingMembershipDto =
  components["schemas"]["CreatePendingMembershipDto"];
export type PrepareMembershipCheckoutDto =
  components["schemas"]["PrepareMembershipCheckoutDto"];

export interface MembershipPlanItem {
  id: string;
  name: string;
  durationMonths: number | null;
  commitmentCycles: number | null;
  billingFrequency: "MONTHLY" | "UPFRONT";
  recurringAmountMinor: number | null;
  upfrontAmountMinor: number | null;
  currency: string;
  sessionAllowance: number | null;
  benefitsSummary: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicOfferingItem {
  id: string;
  name: string;
  capacity: number;
  startsOn: string | null;
  endsOn: string | null;
  programme: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    minimumAge: number | null;
    maximumAge: number | null;
    level: string | null;
    sport: { code: string; defaultName: string };
  };
  venue: { id: string; name: string; address: string | null } | null;
  planEligibilities: Array<{ plan: MembershipPlanItem }>;
}

export interface GuardianProfile {
  userId?: string;
  displayName: string;
  phone: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountMeResponse {
  id: string;
  email: string | null;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  preferredLocale: SupportedLocale;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  guardianProfile: { displayName: string; phone: string | null } | null;
  coachProfile?: { displayName: string; bio: string | null } | null;
  athleteProfile?: {
    id: string;
    displayName: string;
    dateOfBirth: string;
    preferredLocale: SupportedLocale;
  } | null;
}

export interface ManagedAthlete {
  id: string;
  userId: string | null;
  displayName: string;
  dateOfBirth: string;
  preferredLocale: SupportedLocale;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedAthleteLinkItem {
  familyLinkId: string;
  relationshipType: string | null;
  approvedAt: string | null;
  athlete: ManagedAthlete;
}

export interface CreateManagedAthleteResponse {
  athlete: ManagedAthlete;
  familyLink: {
    id: string;
    relationshipType: string | null;
    status: "ACTIVE" | "PENDING" | "REVOKED";
    approvedAt: string | null;
  };
}

export type AthleteProfileResponse = ManagedAthlete;
export type MembershipStatus =
  "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED" | "COMPLETED" | "EXPIRED";

export interface MembershipOfferingItem {
  id: string;
  programmeId: string;
  venueId: string | null;
  name: string;
  capacity: number;
  startsOn: string | null;
  endsOn: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED" | "INACTIVE";
  programme?: {
    id?: string;
    code?: string;
    name: string;
    level: string | null;
  };
  venue?: { id?: string; name: string; address: string | null } | null;
}

export interface AthleteMembershipItem {
  id: string;
  athleteId: string;
  programmeOfferingId: string;
  membershipPlanId: string;
  purchasedByUserId: string | null;
  status: MembershipStatus;
  startsAt: string | null;
  endsAt: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  membershipPlan: MembershipPlanItem;
  programmeOffering: MembershipOfferingItem;
}

export interface PaymentRecord {
  id: string;
  payerUserId: string;
  membershipId: string | null;
  paymentInstallmentId: string | null;
  provider: string;
  providerPaymentId: string | null;
  idempotencyKey: string;
  amountMinor: number;
  currency: string;
  status:
    "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  attemptNumber: number;
  attemptedAt: string;
  settledAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
  safeFailureReason: string | null;
}

export interface PaymentInstallmentRecord {
  id: string;
  paymentScheduleId: string;
  sequenceNumber: number;
  dueAt: string;
  amountMinor: number;
  currency: string;
  status:
    | "SCHEDULED"
    | "PROCESSING"
    | "PAID"
    | "FAILED"
    | "OVERDUE"
    | "WAIVED"
    | "CANCELLED";
  paidAt: string | null;
  payments: PaymentRecord[];
}

export interface MembershipBillingResponse {
  id: string;
  athleteId: string;
  status: MembershipStatus;
  agreements: Array<{
    id: string;
    termsVersion: string;
    acceptedAt: string;
    amountMinorSnapshot: number;
    currencySnapshot: string;
    billingFrequencySnapshot: "MONTHLY" | "UPFRONT";
    installmentCountSnapshot: number;
  }>;
  paymentSchedule: {
    id: string;
    frequency: "MONTHLY" | "UPFRONT";
    installmentCount: number;
    amountPerInstallmentMinor: number;
    currency: string;
    startsAt: string;
    status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
    installments: PaymentInstallmentRecord[];
  } | null;
}

export interface CheckoutSessionResponse {
  membershipId: string;
  paymentScheduleId: string;
  paymentId: string;
  checkoutUrl: string;
  termsVersion: string;
}

export function getPlanChargeMinor(plan: MembershipPlanItem): number | null {
  return plan.billingFrequency === "UPFRONT"
    ? plan.upfrontAmountMinor
    : plan.recurringAmountMinor;
}

export interface ScheduleSessionItem {
  id: string;
  programmeOfferingId: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  courtName: string | null;
  coachName: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  cancellationReason: string | null;
  attendances: Array<{
    athleteId: string;
    athleteName: string;
    status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE";
  }>;
}

export interface PortalNotificationItem {
  id: string;
  notificationId: string;
  type: "ANNOUNCEMENT" | "SCHEDULE_CHANGE" | "BILLING" | "EDITORIAL" | "SYSTEM";
  title: string;
  body: string;
  programmeOfferingId: string | null;
  readAt: string | null;
  createdAt: string;
}
