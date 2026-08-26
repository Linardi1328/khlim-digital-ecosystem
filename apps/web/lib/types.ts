import type { SupportedLocale } from "@khlim/i18n";

export interface MembershipPlanItem {
  id: string;
  name: string;
  durationMonths: number;
  commitmentCycles: number;
  billingFrequency: "MONTHLY" | "UPFRONT";
  recurringAmountMinor: number;
  upfrontAmountMinor: number;
  currency: string;
  sessionAllowance: number | null;
  benefitsSummary: string | null;
}

export interface PublicOfferingItem {
  id: string;
  name: string;
  capacity: number;
  startsOn: string;
  endsOn: string | null;
  programme: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    minimumAge: number;
    maximumAge: number;
    level: string;
    sport: {
      code: string;
      defaultName: string;
    };
  };
  venue: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  planEligibilities: Array<{
    plan: MembershipPlanItem;
  }>;
}

export interface GuardianProfile {
  id: string;
  displayName: string;
  phone: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  isComplete: boolean;
}

export interface AccountMeResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  preferredLocale: SupportedLocale;
  guardianProfile: GuardianProfile | null;
}

export interface UpsertGuardianProfileDto {
  displayName: string;
  phone: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface UpdatePreferencesDto {
  preferredLocale: SupportedLocale;
}

export interface ManagedAthlete {
  id: string;
  displayName: string;
  dateOfBirth: string;
  gender: string | null;
  preferredLocale: SupportedLocale;
}

export interface ManagedAthleteLinkItem {
  id: string;
  relationshipType: string;
  approvedAt: string | null;
  athlete: ManagedAthlete;
}

export interface CreateManagedAthleteDto {
  displayName: string;
  dateOfBirth: string;
  gender?: string;
  preferredLocale?: SupportedLocale;
  relationshipType?: string;
}

export interface UpdateAthleteDto {
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  preferredLocale?: SupportedLocale;
}

export interface AthleteProfileResponse {
  id: string;
  displayName: string;
  dateOfBirth: string;
  gender: string | null;
  preferredLocale: SupportedLocale;
  createdAt: string;
  updatedAt: string;
}

export type MembershipStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

export interface AthleteMembershipItem {
  id: string;
  programmeOfferingId: string;
  membershipPlanId: string;
  status: MembershipStatus;
  validFrom: string | null;
  validUntil: string | null;
  programmeOffering?: {
    id: string;
    name: string;
    startsOn: string;
    endsOn: string | null;
    programme?: {
      name: string;
      level: string;
    };
    venue?: {
      name: string;
      address: string | null;
    } | null;
  };
  membershipPlan?: MembershipPlanItem;
}

export interface CreatePendingMembershipDto {
  programmeOfferingId: string;
  membershipPlanId: string;
  termsAcceptedVersion: string;
}

export interface PaymentRecord {
  id: string;
  amountMinor: number;
  status: string;
  providerPaymentId: string | null;
  attemptedAt: string;
}

export interface PaymentInstallmentRecord {
  id: string;
  sequenceNumber: number;
  amountMinor: number;
  currency: string;
  dueOn: string;
  status: string;
  payments: PaymentRecord[];
}

export interface MembershipBillingResponse {
  id: string;
  status: MembershipStatus;
  agreements?: Array<{
    termsVersion: string;
    acceptedAt: string;
  }>;
  paymentSchedule?: {
    id: string;
    status: string;
    installments: PaymentInstallmentRecord[];
  } | null;
}

export interface PrepareMembershipCheckoutDto {
  acceptTerms: boolean;
  successUrl?: string;
  cancelUrl?: string;
  preferredProvider?: "STRIPE" | "CURLEC";
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  providerCheckoutId: string;
  expiresAt: string;
  mode: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: "BILLING" | "SCHEDULE" | "ANNOUNCEMENT";
  isRead: boolean;
  createdAt: string;
}
