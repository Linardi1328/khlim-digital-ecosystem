export type UserRole =
  | "GUARDIAN"
  | "ATHLETE"
  | "COACH"
  | "SUPER_ADMIN"
  | "MANAGEMENT"
  | "FINANCE_ADMIN"
  | "ACADEMY_ADMIN"
  | "HEAD_COACH"
  | "EVENT_STAFF";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
export type LinkStatus = "PENDING" | "ACTIVE" | "REVOKED";
export type MembershipStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

export type InstallmentStatus = "SCHEDULED" | "PROCESSING" | "PAID" | "FAILED" | "OVERDUE";
export type SessionStatus = "SCHEDULED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED";

export interface User {
  id: string;
  email: string;
  status: UserStatus;
  preferredLocale: string;
  roles: UserRole[];
}

export interface GuardianProfile {
  userId: string;
  displayName: string;
  phone: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface AthleteProfile {
  id: string;
  userId?: string | null;
  displayName: string;
  dateOfBirth: string;
  gender?: string;
  preferredLocale: string;
  linkStatus?: LinkStatus;
  relationshipType?: string;
}

export interface Programme {
  id: string;
  code: string;
  name: string;
  description: string;
  minAge: number;
  maxAge: number;
  level: string;
  active: boolean;
}

export interface ProgrammeOffering {
  id: string;
  programmeId: string;
  programmeName: string;
  venueName: string;
  venueAddress: string;
  court: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
  enrolledCount: number;
  status: "OPEN" | "FULL" | "CLOSED";
}

export interface MembershipPlan {
  id: string;
  name: string;
  durationMonths: number;
  billingFrequency: "MONTHLY" | "UPFRONT";
  monthlyAmount: number; // in MYR
  upfrontAmount: number; // in MYR
  currency: string;
  sessionAllowance: string;
  commitmentCycles: number;
  benefitsSummary: string[];
  active: boolean;
}

export interface Membership {
  id: string;
  athleteId: string;
  athleteName: string;
  programmeOfferingId: string;
  programmeName: string;
  venueName: string;
  membershipPlanId: string;
  planName: string;
  billingFrequency: "MONTHLY" | "UPFRONT";
  status: MembershipStatus;
  startsAt: string;
  endsAt: string;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
}

export interface PaymentInstallment {
  id: string;
  scheduleId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  currency: string;
  status: InstallmentStatus;
  paidAt?: string;
  receiptNumber?: string;
}

export interface PaymentTransaction {
  id: string;
  installmentId?: string;
  description: string;
  amount: number;
  currency: string;
  status: "PAID" | "FAILED";
  paymentMethod: string;
  paidAt: string;
  receiptNumber: string;
}

export interface TrainingSession {
  id: string;
  programmeOfferingId: string;
  programmeName: string;
  athleteId: string;
  athleteName: string;
  venueName: string;
  court: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  coachName: string;
  status: SessionStatus;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: "BILLING" | "SCHEDULE" | "GENERAL";
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}
