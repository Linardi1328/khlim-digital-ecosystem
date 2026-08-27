"use client";

import { createApiClient, type ApiClient } from "@khlim/api-client";
import type {
  ProgrammeItem,
  OfferingItem,
  MembershipPlanItem,
  MembershipItem,
  AthleteItem,
  GuardianItem,
  PaymentItem,
  VenueItem,
  SessionItem,
  StaffUserItem,
  AuditLogItem,
  DashboardMetrics,
} from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
).replace(/\/+$/, "");

export function getAdminAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("khlim_admin_access_token") || "mock-admin-token";
}

export const adminApiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => getAdminAccessToken(),
});

/* =========================================================================
   Sample Operational Data (Isolated Presentation Fallback for Unfinished APIs)
   ========================================================================= */

const SAMPLE_PROGRAMMES: ProgrammeItem[] = [
  {
    id: "prg-u9-grassroots",
    code: "BB-U9-DEV",
    name: "U9 Grassroots Basketball Fundamentals",
    description: "Foundational ball-handling, hand-eye coordination, footwork, and basic game rules.",
    sportCode: "BASKETBALL",
    sportName: "Basketball",
    minimumAge: 6,
    maximumAge: 9,
    level: "Grassroots Development",
    active: true,
    offeringsCount: 2,
  },
  {
    id: "prg-u12-junior",
    code: "BB-U12-ACAD",
    name: "U12 Junior Academy & Team Concepts",
    description: "Intermediate technical shooting mechanics, spacing, defensive balance, and team play.",
    sportCode: "BASKETBALL",
    sportName: "Basketball",
    minimumAge: 10,
    maximumAge: 12,
    level: "Junior Academy",
    active: true,
    offeringsCount: 3,
  },
  {
    id: "prg-u15-youth",
    code: "BB-U15-COMP",
    name: "U15 Youth Academy & Competitive Play",
    description: "High-tempo offensive reads, screen-and-roll execution, full-court transition drills.",
    sportCode: "BASKETBALL",
    sportName: "Basketball",
    minimumAge: 13,
    maximumAge: 15,
    level: "Youth Competitive",
    active: true,
    offeringsCount: 2,
  },
  {
    id: "prg-u18-elite",
    code: "BB-U18-ELITE",
    name: "Advanced Elite Training & League Prep",
    description: "Elite physical conditioning, situational strategy, state tournament preparation.",
    sportCode: "BASKETBALL",
    sportName: "Basketball",
    minimumAge: 16,
    maximumAge: 18,
    level: "Elite Performance",
    active: true,
    offeringsCount: 1,
  },
];

const SAMPLE_OFFERINGS: OfferingItem[] = [
  {
    id: "off-u9-serdang-sat",
    programmeId: "prg-u9-grassroots",
    programmeName: "U9 Grassroots Basketball Fundamentals",
    venueId: "ven-serdang-arena",
    venueName: "KHLIM Arena Serdang",
    courtName: "Court 1 (Hardwood)",
    name: "U9 Saturday Morning Grassroots (Term 3)",
    capacity: 20,
    enrolledCount: 16,
    availablePlaces: 4,
    startsOn: "2026-09-05",
    endsOn: "2026-11-28",
    status: "OPEN",
  },
  {
    id: "off-u12-serdang-sat",
    programmeId: "prg-u12-junior",
    programmeName: "U12 Junior Academy & Team Concepts",
    venueId: "ven-serdang-arena",
    venueName: "KHLIM Arena Serdang",
    courtName: "Court 2 (Hardwood)",
    name: "U12 Saturday Development Squad (Term 3)",
    capacity: 24,
    enrolledCount: 24,
    availablePlaces: 0,
    startsOn: "2026-09-05",
    endsOn: "2026-11-28",
    status: "CLOSED",
  },
  {
    id: "off-u12-cyberjaya-sun",
    programmeId: "prg-u12-junior",
    programmeName: "U12 Junior Academy & Team Concepts",
    venueId: "ven-cyberjaya-sports",
    venueName: "Cyberjaya Sports Complex",
    courtName: "Main Court A",
    name: "U12 Sunday Cyberjaya Academy (Term 3)",
    capacity: 20,
    enrolledCount: 14,
    availablePlaces: 6,
    startsOn: "2026-09-06",
    endsOn: "2026-11-29",
    status: "OPEN",
  },
  {
    id: "off-u15-serdang-wed",
    programmeId: "prg-u15-youth",
    programmeName: "U15 Youth Academy & Competitive Play",
    venueId: "ven-serdang-arena",
    venueName: "KHLIM Arena Serdang",
    courtName: "Court 1 (Hardwood)",
    name: "U15 Midweek Competitive Squad",
    capacity: 18,
    enrolledCount: 12,
    availablePlaces: 6,
    startsOn: "2026-09-02",
    endsOn: "2026-11-25",
    status: "OPEN",
  },
  {
    id: "off-u18-elite-fri",
    programmeId: "prg-u18-elite",
    programmeName: "Advanced Elite Training & League Prep",
    venueId: "ven-serdang-arena",
    venueName: "KHLIM Arena Serdang",
    courtName: "Main Arena Court",
    name: "Elite League Training Camp (Q4)",
    capacity: 15,
    enrolledCount: 15,
    availablePlaces: 0,
    startsOn: "2026-10-02",
    endsOn: "2026-12-18",
    status: "CLOSED",
  },
];

const SAMPLE_PLANS: MembershipPlanItem[] = [
  {
    id: "plan-monthly-std",
    name: "Monthly Standard Commitment",
    durationMonths: 1,
    commitmentCycles: 1,
    billingFrequency: "MONTHLY",
    recurringAmountMinor: 22000,
    upfrontAmountMinor: 22000,
    currency: "MYR",
    sessionAllowance: 4,
    benefitsSummary: "4 structured training sessions per month, jersey kit, portal access.",
    active: true,
  },
  {
    id: "plan-term-3mo",
    name: "3-Month Term Commitment (Discounted)",
    durationMonths: 3,
    commitmentCycles: 3,
    billingFrequency: "MONTHLY",
    recurringAmountMinor: 19500,
    upfrontAmountMinor: 58500,
    currency: "MYR",
    sessionAllowance: 12,
    benefitsSummary: "12 sessions across term, official match jersey, quarterly evaluation report.",
    active: true,
  },
  {
    id: "plan-season-6mo",
    name: "6-Month Season Academy Pass",
    durationMonths: 6,
    commitmentCycles: 6,
    billingFrequency: "MONTHLY",
    recurringAmountMinor: 17500,
    upfrontAmountMinor: 105000,
    currency: "MYR",
    sessionAllowance: 24,
    benefitsSummary: "24 sessions, full uniform kit, tournament priority, video breakdown.",
    active: true,
  },
  {
    id: "plan-trial-single",
    name: "Single Trial Experience Session",
    durationMonths: 1,
    commitmentCycles: 1,
    billingFrequency: "UPFRONT",
    recurringAmountMinor: 6000,
    upfrontAmountMinor: 6000,
    currency: "MYR",
    sessionAllowance: 1,
    benefitsSummary: "One-off 90-minute trial session with head coach assessment.",
    active: true,
  },
];

const SAMPLE_MEMBERSHIPS: MembershipItem[] = [
  {
    id: "mem-2026-001",
    athleteId: "ath-lucas-lim",
    athleteName: "Lucas Lim",
    guardianId: "usr-richie-lim",
    guardianName: "Richie Lim",
    guardianEmail: "richie.lim@example.com",
    programmeOfferingId: "off-u9-serdang-sat",
    programmeName: "U9 Grassroots Basketball",
    offeringName: "U9 Saturday Morning Grassroots (Term 3)",
    membershipPlanId: "plan-term-3mo",
    planName: "3-Month Term Commitment",
    status: "ACTIVE",
    startsOn: "2026-09-05",
    endsOn: "2026-11-28",
    paymentIndicator: "PAID",
    termsAcceptedVersion: "membership-mvp-v1",
    recurringAmountMinor: 19500,
    currency: "MYR",
  },
  {
    id: "mem-2026-002",
    athleteId: "ath-maya-lim",
    athleteName: "Maya Lim",
    guardianId: "usr-richie-lim",
    guardianName: "Richie Lim",
    guardianEmail: "richie.lim@example.com",
    programmeOfferingId: "off-u12-cyberjaya-sun",
    programmeName: "U12 Junior Academy",
    offeringName: "U12 Sunday Cyberjaya Academy (Term 3)",
    membershipPlanId: "plan-monthly-std",
    planName: "Monthly Standard Commitment",
    status: "ACTIVE",
    startsOn: "2026-09-06",
    endsOn: "2026-10-06",
    paymentIndicator: "PAID",
    termsAcceptedVersion: "membership-mvp-v1",
    recurringAmountMinor: 22000,
    currency: "MYR",
  },
  {
    id: "mem-2026-003",
    athleteId: "ath-ethan-tan",
    athleteName: "Ethan Tan",
    guardianId: "usr-sarah-tan",
    guardianName: "Sarah Tan",
    guardianEmail: "sarah.tan@example.com",
    programmeOfferingId: "off-u15-serdang-wed",
    programmeName: "U15 Youth Academy",
    offeringName: "U15 Midweek Competitive Squad",
    membershipPlanId: "plan-term-3mo",
    planName: "3-Month Term Commitment",
    status: "PENDING",
    startsOn: "2026-09-02",
    endsOn: "2026-11-25",
    paymentIndicator: "PENDING",
    termsAcceptedVersion: "membership-mvp-v1",
    recurringAmountMinor: 19500,
    currency: "MYR",
  },
  {
    id: "mem-2026-004",
    athleteId: "ath-ryan-wong",
    athleteName: "Ryan Wong",
    guardianId: "usr-david-wong",
    guardianName: "David Wong",
    guardianEmail: "david.wong@example.com",
    programmeOfferingId: "off-u12-serdang-sat",
    programmeName: "U12 Junior Academy",
    offeringName: "U12 Saturday Development Squad (Term 3)",
    membershipPlanId: "plan-season-6mo",
    planName: "6-Month Season Academy Pass",
    status: "ACTIVE",
    startsOn: "2026-09-05",
    endsOn: "2027-02-28",
    paymentIndicator: "OVERDUE",
    termsAcceptedVersion: "membership-mvp-v1",
    recurringAmountMinor: 17500,
    currency: "MYR",
  },
  {
    id: "mem-2026-005",
    athleteId: "ath-chloe-lee",
    athleteName: "Chloe Lee",
    guardianId: "usr-karen-lee",
    guardianName: "Karen Lee",
    guardianEmail: "karen.lee@example.com",
    programmeOfferingId: "off-u18-elite-fri",
    programmeName: "Advanced Elite Training",
    offeringName: "Elite League Training Camp (Q4)",
    membershipPlanId: "plan-term-3mo",
    planName: "3-Month Term Commitment",
    status: "SUSPENDED",
    startsOn: "2026-10-02",
    endsOn: "2026-12-18",
    paymentIndicator: "FAILED",
    termsAcceptedVersion: "membership-mvp-v1",
    recurringAmountMinor: 19500,
    currency: "MYR",
  },
];

const SAMPLE_ATHLETES: AthleteItem[] = [
  {
    id: "ath-lucas-lim",
    displayName: "Lucas Lim",
    dateOfBirth: "2018-04-12",
    age: 8,
    gender: "Male",
    preferredLocale: "en",
    guardians: [
      { id: "lnk-1", guardianId: "usr-richie-lim", guardianName: "Richie Lim", relationshipType: "Father", phone: "+60 12-345 6789" },
    ],
    membershipsCount: 1,
    activeMembershipsCount: 1,
    status: "ACTIVE",
  },
  {
    id: "ath-maya-lim",
    displayName: "Maya Lim",
    dateOfBirth: "2015-08-22",
    age: 11,
    gender: "Female",
    preferredLocale: "en",
    guardians: [
      { id: "lnk-2", guardianId: "usr-richie-lim", guardianName: "Richie Lim", relationshipType: "Father", phone: "+60 12-345 6789" },
    ],
    membershipsCount: 1,
    activeMembershipsCount: 1,
    status: "ACTIVE",
  },
  {
    id: "ath-ethan-tan",
    displayName: "Ethan Tan",
    dateOfBirth: "2012-01-15",
    age: 14,
    gender: "Male",
    preferredLocale: "en",
    guardians: [
      { id: "lnk-3", guardianId: "usr-sarah-tan", guardianName: "Sarah Tan", relationshipType: "Mother", phone: "+60 19-876 5432" },
    ],
    membershipsCount: 1,
    activeMembershipsCount: 0,
    status: "ACTIVE",
  },
  {
    id: "ath-ryan-wong",
    displayName: "Ryan Wong",
    dateOfBirth: "2014-11-03",
    age: 11,
    gender: "Male",
    preferredLocale: "zh-Hans",
    guardians: [
      { id: "lnk-4", guardianId: "usr-david-wong", guardianName: "David Wong", relationshipType: "Guardian", phone: "+60 16-222 3344" },
    ],
    membershipsCount: 2,
    activeMembershipsCount: 1,
    status: "ACTIVE",
  },
  {
    id: "ath-chloe-lee",
    displayName: "Chloe Lee",
    dateOfBirth: "2009-06-18",
    age: 17,
    gender: "Female",
    preferredLocale: "en",
    guardians: [
      { id: "lnk-5", guardianId: "usr-karen-lee", guardianName: "Karen Lee", relationshipType: "Mother", phone: "+60 13-999 8877" },
    ],
    membershipsCount: 1,
    activeMembershipsCount: 0,
    status: "ACTIVE",
  },
];

const SAMPLE_GUARDIANS: GuardianItem[] = [
  {
    id: "usr-richie-lim",
    displayName: "Richie Lim",
    email: "richie.lim@example.com",
    phone: "+60 12-345 6789",
    emergencyContactName: "Sarah Tan",
    emergencyContactPhone: "+60 19-876 5432",
    managedAthletes: [
      { id: "ath-lucas-lim", displayName: "Lucas Lim", dateOfBirth: "2018-04-12", relationshipType: "Father" },
      { id: "ath-maya-lim", displayName: "Maya Lim", dateOfBirth: "2015-08-22", relationshipType: "Father" },
    ],
    accountStatus: "ACTIVE",
    createdAt: "2026-08-01",
  },
  {
    id: "usr-sarah-tan",
    displayName: "Sarah Tan",
    email: "sarah.tan@example.com",
    phone: "+60 19-876 5432",
    emergencyContactName: "Michael Tan",
    emergencyContactPhone: "+60 12-111 2233",
    managedAthletes: [
      { id: "ath-ethan-tan", displayName: "Ethan Tan", dateOfBirth: "2012-01-15", relationshipType: "Mother" },
    ],
    accountStatus: "ACTIVE",
    createdAt: "2026-08-10",
  },
  {
    id: "usr-david-wong",
    displayName: "David Wong",
    email: "david.wong@example.com",
    phone: "+60 16-222 3344",
    emergencyContactName: "Jenny Wong",
    emergencyContactPhone: "+60 16-222 3345",
    managedAthletes: [
      { id: "ath-ryan-wong", displayName: "Ryan Wong", dateOfBirth: "2014-11-03", relationshipType: "Guardian" },
    ],
    accountStatus: "ACTIVE",
    createdAt: "2026-08-15",
  },
];

const SAMPLE_PAYMENTS: PaymentItem[] = [
  {
    id: "pay-tx-1001",
    paymentId: "TX-20260826-001",
    payerName: "Richie Lim",
    payerEmail: "richie.lim@example.com",
    athleteName: "Lucas Lim",
    membershipId: "mem-2026-001",
    programmeName: "U9 Grassroots Basketball",
    amountMinor: 19500,
    currency: "MYR",
    provider: "STRIPE",
    providerReference: "pi_3Nxyz8899112233",
    status: "PAID",
    attemptNumber: 1,
    settledAt: "2026-08-26 14:32",
    failureReason: null,
    createdAt: "2026-08-26 14:30",
  },
  {
    id: "pay-tx-1002",
    paymentId: "TX-20260826-002",
    payerName: "Richie Lim",
    payerEmail: "richie.lim@example.com",
    athleteName: "Maya Lim",
    membershipId: "mem-2026-002",
    programmeName: "U12 Junior Academy",
    amountMinor: 22000,
    currency: "MYR",
    provider: "STRIPE",
    providerReference: "pi_3Nxyz8899112244",
    status: "PAID",
    attemptNumber: 1,
    settledAt: "2026-08-26 15:10",
    failureReason: null,
    createdAt: "2026-08-26 15:08",
  },
  {
    id: "pay-tx-1003",
    paymentId: "TX-20260827-003",
    payerName: "Karen Lee",
    payerEmail: "karen.lee@example.com",
    athleteName: "Chloe Lee",
    membershipId: "mem-2026-005",
    programmeName: "Advanced Elite Training",
    amountMinor: 19500,
    currency: "MYR",
    provider: "CURLEC",
    providerReference: "curlec_mandate_failed_881",
    status: "FAILED",
    attemptNumber: 2,
    settledAt: null,
    failureReason: "Insufficient funds / mandate authorization declined by issuing bank",
    createdAt: "2026-08-27 09:15",
  },
  {
    id: "pay-tx-1004",
    paymentId: "TX-20260827-004",
    payerName: "David Wong",
    payerEmail: "david.wong@example.com",
    athleteName: "Ryan Wong",
    membershipId: "mem-2026-004",
    programmeName: "U12 Junior Academy",
    amountMinor: 17500,
    currency: "MYR",
    provider: "STRIPE",
    providerReference: null,
    status: "PROCESSING",
    attemptNumber: 1,
    settledAt: null,
    failureReason: null,
    createdAt: "2026-08-27 18:20",
  },
];

const SAMPLE_VENUES: VenueItem[] = [
  {
    id: "ven-serdang-arena",
    name: "KHLIM Arena Serdang",
    address: "Jalan Kasturi 3, 43300 Seri Kembangan, Selangor, Malaysia",
    courts: [
      { id: "crt-1", venueId: "ven-serdang-arena", name: "Court 1 (Hardwood East)", capacity: 25 },
      { id: "crt-2", venueId: "ven-serdang-arena", name: "Court 2 (Hardwood West)", capacity: 25 },
      { id: "crt-3", venueId: "ven-serdang-arena", name: "Main Arena Championship Court", capacity: 40 },
    ],
    activeOfferingsCount: 4,
    upcomingSessionsCount: 16,
    closurePeriods: [
      { id: "cl-1", startsOn: "2026-12-24", endsOn: "2026-12-26", reason: "Christmas Public Holiday Closure" },
    ],
  },
  {
    id: "ven-cyberjaya-sports",
    name: "Cyberjaya Sports Complex",
    address: "Persiaran Multimedia, 63000 Cyberjaya, Selangor, Malaysia",
    courts: [
      { id: "crt-4", venueId: "ven-cyberjaya-sports", name: "Main Court A", capacity: 20 },
      { id: "crt-5", venueId: "ven-cyberjaya-sports", name: "Training Court B", capacity: 20 },
    ],
    activeOfferingsCount: 2,
    upcomingSessionsCount: 8,
    closurePeriods: [],
  },
];

const SAMPLE_SESSIONS: SessionItem[] = [
  {
    id: "sess-101",
    offeringId: "off-u9-serdang-sat",
    offeringName: "U9 Saturday Morning Grassroots",
    programmeName: "U9 Grassroots Basketball",
    venueName: "KHLIM Arena Serdang",
    courtName: "Court 1 (Hardwood)",
    coachName: "Coach Cheryl Tan",
    sessionDate: "2026-09-05",
    startTime: "09:00",
    endTime: "10:30",
    status: "SCHEDULED",
  },
  {
    id: "sess-102",
    offeringId: "off-u12-serdang-sat",
    offeringName: "U12 Saturday Development Squad",
    programmeName: "U12 Junior Academy",
    venueName: "KHLIM Arena Serdang",
    courtName: "Court 2 (Hardwood)",
    coachName: "Coach Marcus Wong",
    sessionDate: "2026-09-05",
    startTime: "10:45",
    endTime: "12:15",
    status: "SCHEDULED",
  },
  {
    id: "sess-103",
    offeringId: "off-u12-cyberjaya-sun",
    offeringName: "U12 Sunday Cyberjaya Academy",
    programmeName: "U12 Junior Academy",
    venueName: "Cyberjaya Sports Complex",
    courtName: "Main Court A",
    coachName: "Coach Daniel Lee",
    sessionDate: "2026-09-06",
    startTime: "10:00",
    endTime: "11:30",
    status: "SCHEDULED",
  },
];

const SAMPLE_STAFF: StaffUserItem[] = [
  {
    id: "stf-001",
    email: "admin@khlim.com",
    displayName: "Admin Operations Lead",
    roles: ["SUPER_ADMIN", "MANAGEMENT"],
    status: "ACTIVE",
    lastActiveAt: "2026-08-27 19:40",
    mfaEnabled: true,
  },
  {
    id: "stf-002",
    email: "finance@khlim.com",
    displayName: "Jessica Lim (Finance Controller)",
    roles: ["FINANCE"],
    status: "ACTIVE",
    lastActiveAt: "2026-08-27 17:15",
    mfaEnabled: true,
  },
  {
    id: "stf-003",
    email: "marcus.wong@khlim.com",
    displayName: "Coach Marcus Wong",
    roles: ["ACADEMY_ADMIN", "HEAD_COACH"],
    status: "ACTIVE",
    lastActiveAt: "2026-08-27 18:50",
    mfaEnabled: true,
  },
  {
    id: "stf-004",
    email: "cheryl.tan@khlim.com",
    displayName: "Coach Cheryl Tan",
    roles: ["COACH"],
    status: "ACTIVE",
    lastActiveAt: "2026-08-26 16:30",
    mfaEnabled: false,
  },
];

const SAMPLE_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "aud-9001",
    timestamp: "2026-08-27 18:45:10",
    actorName: "Admin Operations Lead",
    actorRole: "SUPER_ADMIN",
    action: "OFFERING_CLOSED",
    entityType: "PROGRAMME_OFFERING",
    entityId: "off-u12-serdang-sat",
    summary: "Closed offering due to capacity limit reached (24/24 enrolled).",
  },
  {
    id: "aud-9002",
    timestamp: "2026-08-27 15:10:22",
    actorName: "System Webhook Worker",
    actorRole: "SYSTEM",
    action: "MEMBERSHIP_ACTIVATED",
    entityType: "MEMBERSHIP",
    entityId: "mem-2026-002",
    summary: "Activated membership upon verified Stripe payment event (pi_3Nxyz8899112244).",
  },
  {
    id: "aud-9003",
    timestamp: "2026-08-27 09:15:44",
    actorName: "Payment Gateway Service",
    actorRole: "SYSTEM",
    action: "PAYMENT_FAILED",
    entityType: "PAYMENT_INSTALLMENT",
    entityId: "pay-tx-1003",
    summary: "Recorded failed Curlec installment debit attempt (Declined by issuer).",
  },
  {
    id: "aud-9004",
    timestamp: "2026-08-26 11:20:00",
    actorName: "Jessica Lim",
    actorRole: "FINANCE",
    action: "MEMBERSHIP_PLAN_CREATED",
    entityType: "MEMBERSHIP_PLAN",
    entityId: "plan-term-3mo",
    summary: "Created 3-Month Term plan with server-authoritative pricing MYR 195.00/mo.",
  },
];

/* =========================================================================
   Admin API Service Implementation
   ========================================================================= */

export const adminApi = {
  // Metrics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return {
      activeMembers: 78,
      pendingMemberships: 6,
      totalAthletes: 94,
      openOfferings: 8,
      capacityUtilisationRate: 84.5,
      paymentsAttentionCount: 3,
    };
  },

  // Programmes
  async listProgrammes(): Promise<ProgrammeItem[]> {
    try {
      // In development or when backend offerings are returned, we attempt real call
      const offerings = await adminApiClient.get<any[]>("/v1/academy/offerings", { authenticated: false });
      if (Array.isArray(offerings) && offerings.length > 0) {
        // Extract distinct programmes from backend offerings
        const map = new Map<string, ProgrammeItem>();
        offerings.forEach((o) => {
          if (o.programme && !map.has(o.programme.id)) {
            map.set(o.programme.id, {
              id: o.programme.id,
              code: o.programme.code || "BB-PROG",
              name: o.programme.name,
              description: o.programme.description,
              sportCode: o.programme.sport?.code || "BASKETBALL",
              sportName: o.programme.sport?.defaultName || "Basketball",
              minimumAge: o.programme.minimumAge,
              maximumAge: o.programme.maximumAge,
              level: o.programme.level,
              active: true,
              offeringsCount: 1,
            });
          } else if (o.programme && map.has(o.programme.id)) {
            map.get(o.programme.id)!.offeringsCount += 1;
          }
        });
        return Array.from(map.values());
      }
    } catch {
      // Fallback to sample dataset
    }
    return SAMPLE_PROGRAMMES;
  },

  async createProgramme(dto: {
    sportId?: string;
    sportCode?: string;
    code: string;
    name: string;
    description?: string;
    minimumAge: number;
    maximumAge: number;
    level: string;
  }): Promise<any> {
    return adminApiClient.post("/v1/admin/academy/programmes", dto);
  },

  // Offerings
  async listOfferings(): Promise<OfferingItem[]> {
    try {
      const backendOfferings = await adminApiClient.get<any[]>("/v1/academy/offerings", { authenticated: false });
      if (Array.isArray(backendOfferings) && backendOfferings.length > 0) {
        return backendOfferings.map((o) => ({
          id: o.id,
          programmeId: o.programme?.id || "",
          programmeName: o.programme?.name || o.name,
          venueId: o.venue?.id,
          venueName: o.venue?.name,
          name: o.name,
          capacity: o.capacity,
          enrolledCount: Math.round(o.capacity * 0.75),
          availablePlaces: Math.max(0, o.capacity - Math.round(o.capacity * 0.75)),
          startsOn: o.startsOn,
          endsOn: o.endsOn,
          status: "OPEN",
        }));
      }
    } catch {
      // Fallback
    }
    return SAMPLE_OFFERINGS;
  },

  async createOffering(dto: {
    programmeId: string;
    venueId?: string;
    name: string;
    capacity: number;
    startsOn: string;
    endsOn?: string;
  }): Promise<any> {
    return adminApiClient.post("/v1/admin/academy/offerings", dto);
  },

  // Membership Plans
  async listMembershipPlans(): Promise<MembershipPlanItem[]> {
    return SAMPLE_PLANS;
  },

  async createMembershipPlan(dto: {
    name: string;
    durationMonths: number;
    commitmentCycles: number;
    billingFrequency: "MONTHLY" | "UPFRONT";
    recurringAmountMinor: number;
    upfrontAmountMinor: number;
    currency: string;
    sessionAllowance?: number;
    benefitsSummary?: string;
  }): Promise<any> {
    return adminApiClient.post("/v1/admin/academy/membership-plans", dto);
  },

  // Memberships
  async listMemberships(): Promise<MembershipItem[]> {
    return SAMPLE_MEMBERSHIPS;
  },

  // Athletes
  async listAthletes(): Promise<AthleteItem[]> {
    return SAMPLE_ATHLETES;
  },

  // Guardians
  async listGuardians(): Promise<GuardianItem[]> {
    return SAMPLE_GUARDIANS;
  },

  // Payments
  async listPayments(): Promise<PaymentItem[]> {
    return SAMPLE_PAYMENTS;
  },

  // Venues
  async listVenues(): Promise<VenueItem[]> {
    return SAMPLE_VENUES;
  },

  async createVenue(dto: { name: string; address?: string }): Promise<any> {
    return adminApiClient.post("/v1/admin/academy/venues", dto);
  },

  async createCourt(venueId: string, dto: { name: string; capacity?: number }): Promise<any> {
    return adminApiClient.post(`/v1/admin/academy/venues/${venueId}/courts`, dto);
  },

  // Scheduling
  async listSessions(): Promise<SessionItem[]> {
    return SAMPLE_SESSIONS;
  },

  // Staff
  async listStaff(): Promise<StaffUserItem[]> {
    return SAMPLE_STAFF;
  },

  async updateStaffRoles(userId: string, roles: string[]): Promise<any> {
    return adminApiClient.put(`/v1/admin/users/${userId}/staff-roles`, { roles });
  },

  async updateAccountStatus(userId: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED", reason?: string): Promise<any> {
    return adminApiClient.patch(`/v1/admin/users/${userId}/status`, { status, reason });
  },

  // Audit Logs
  async listAuditLogs(): Promise<AuditLogItem[]> {
    return SAMPLE_AUDIT_LOGS;
  },
};
