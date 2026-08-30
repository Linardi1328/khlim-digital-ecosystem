export type StaffRole =
  | "SUPER_ADMIN"
  | "MANAGEMENT"
  | "FINANCE_ADMIN"
  | "FINANCE"
  | "ADMIN"
  | "ACADEMY_ADMIN"
  | "HEAD_COACH"
  | "COACH"
  | "EVENT_STAFF";

export type AccountRole = StaffRole | "GUARDIAN" | "ATHLETE";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  roles: StaffRole[];
  mfaEnabled: boolean;
  mfaSatisfied?: boolean;
  preferredLocale?: string;
  authenticatorAssuranceLevel?: "aal1" | "aal2" | null;
}

export interface AdminSession {
  id: string;
  email: string | null;
  displayName: string;
  preferredLocale: string;
  roles: string[];
  authenticatorAssuranceLevel: "aal1" | "aal2" | null;
  mfaSatisfied: boolean;
}

export interface AdminAccountItem {
  id: string;
  email: string | null;
  displayName: string;
  status: AccountStatus;
  preferredLocale: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminAccountListResponse {
  items: AdminAccountItem[];
  total: number;
  limit: number;
}

export interface ProgrammeItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sportCode: string;
  sportName: string;
  minimumAge: number;
  maximumAge: number;
  level: string;
  active: boolean;
  offeringsCount: number;
}

export type OfferingStatus = "DRAFT" | "OPEN" | "CLOSED" | "INACTIVE";

export interface OfferingItem {
  id: string;
  programmeId: string;
  programmeName: string;
  venueId?: string;
  venueName?: string;
  courtName?: string;
  name: string;
  capacity: number;
  enrolledCount: number;
  availablePlaces: number;
  startsOn: string;
  endsOn: string | null;
  status: OfferingStatus;
}

export type BillingFrequency = "MONTHLY" | "UPFRONT";

export interface MembershipPlanItem {
  id: string;
  name: string;
  durationMonths: number;
  commitmentCycles: number;
  billingFrequency: BillingFrequency;
  recurringAmountMinor: number;
  upfrontAmountMinor: number;
  currency: string;
  sessionAllowance: number | null;
  benefitsSummary: string | null;
  active: boolean;
}

export type MembershipStatus =
  "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED" | "COMPLETED" | "EXPIRED";

export type PaymentIndicatorStatus = "PAID" | "PENDING" | "OVERDUE" | "FAILED";

export interface MembershipItem {
  id: string;
  athleteId: string;
  athleteName: string;
  guardianId?: string;
  guardianName?: string;
  guardianEmail?: string;
  programmeOfferingId: string;
  programmeName: string;
  offeringName: string;
  membershipPlanId: string;
  planName: string;
  status: MembershipStatus;
  startsOn: string;
  endsOn: string | null;
  paymentIndicator: PaymentIndicatorStatus;
  termsAcceptedVersion: string;
  recurringAmountMinor: number;
  currency: string;
}

export interface AthleteGuardianLink {
  id: string;
  guardianId: string;
  guardianName: string;
  relationshipType: string;
  phone?: string;
}

export interface AthleteItem {
  id: string;
  displayName: string;
  dateOfBirth: string;
  age: number;
  gender: string | null;
  preferredLocale: string;
  guardians: AthleteGuardianLink[];
  membershipsCount: number;
  activeMembershipsCount: number;
  status: "ACTIVE" | "INACTIVE";
}

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export interface GuardianItem {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  managedAthletes: Array<{
    id: string;
    displayName: string;
    dateOfBirth: string;
    relationshipType: string;
  }>;
  accountStatus: AccountStatus;
  createdAt: string;
}

export type PaymentStatus =
  "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

export interface PaymentItem {
  id: string;
  paymentId: string;
  payerName: string;
  payerEmail: string;
  athleteName: string;
  membershipId: string;
  programmeName: string;
  amountMinor: number;
  currency: string;
  provider: "STRIPE" | "CURLEC" | "MANUAL";
  providerReference: string | null;
  status: PaymentStatus;
  attemptNumber: number;
  settledAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface CourtItem {
  id: string;
  venueId: string;
  name: string;
  capacity: number;
}

export interface VenueClosurePeriod {
  id: string;
  startsOn: string;
  endsOn: string;
  reason: string;
}

export interface VenueItem {
  id: string;
  name: string;
  address: string | null;
  courts: CourtItem[];
  activeOfferingsCount: number;
  upcomingSessionsCount: number;
  closurePeriods: VenueClosurePeriod[];
}

export type SessionStatus =
  "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";

export interface SessionItem {
  id: string;
  offeringId: string;
  offeringName: string;
  programmeName: string;
  venueName: string;
  courtName: string;
  coachName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  isReplacement?: boolean;
}

export interface StaffUserItem {
  id: string;
  email: string;
  displayName: string;
  roles: StaffRole[];
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  lastActiveAt: string | null;
  mfaEnabled: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}

export interface DashboardMetrics {
  activeMembers: number;
  pendingMemberships: number;
  totalAthletes: number;
  openOfferings: number;
  capacityUtilisationRate: number;
  paymentsAttentionCount: number | null;
  generatedAt?: string;
}
