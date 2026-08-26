import type {
  Programme,
  ProgrammeOffering,
  MembershipPlan,
  AthleteProfile,
  GuardianProfile,
  Membership,
  PaymentInstallment,
  PaymentTransaction,
  TrainingSession,
  NotificationItem,
} from "./types";

// Seeded/Configured Domain Data representing authoritative KHLIM state
export const INITIAL_PROGRAMMES: Programme[] = [
  {
    id: "prg-u9",
    code: "U9_ACADEMY",
    name: "U9 Foundation Academy",
    description: "Introductory basketball fundamentals, motor skills development, hand-eye coordination, and joyful gameplay.",
    minAge: 6,
    maxAge: 9,
    level: "Grassroots & Foundation",
    active: true,
  },
  {
    id: "prg-u12",
    code: "U12_ACADEMY",
    name: "U12 Junior Academy",
    description: "Core skill mastery, ball handling, shooting mechanics, spacing, transition play, and teamwork.",
    minAge: 9,
    maxAge: 12,
    level: "Development",
    active: true,
  },
  {
    id: "prg-u15",
    code: "U15_ACADEMY",
    name: "U15 Youth Academy",
    description: "Tactical decision making, defensive positioning, high-pace gameplay, physical conditioning, and IQ.",
    minAge: 12,
    maxAge: 15,
    level: "Intermediate & Advanced",
    active: true,
  },
  {
    id: "prg-adv",
    code: "ADV_ELITE",
    name: "Advanced Elite Training",
    description: "Intensive training for competitive players preparing for national tournaments and club leagues.",
    minAge: 14,
    maxAge: 18,
    level: "Elite Competitive",
    active: true,
  },
];

export const INITIAL_OFFERINGS: ProgrammeOffering[] = [
  {
    id: "off-u9-sat-serdang",
    programmeId: "prg-u9",
    programmeName: "U9 Foundation Academy",
    venueName: "KHLIM Arena Serdang",
    venueAddress: "Jalan Kasturi 3, 43300 Seri Kembangan, Selangor",
    court: "Court 1 (FIBA Hardwood)",
    dayOfWeek: "Saturday",
    startTime: "09:00 AM",
    endTime: "10:30 AM",
    capacity: 24,
    enrolledCount: 18,
    status: "OPEN",
  },
  {
    id: "off-u12-sat-serdang",
    programmeId: "prg-u12",
    programmeName: "U12 Junior Academy",
    venueName: "KHLIM Arena Serdang",
    venueAddress: "Jalan Kasturi 3, 43300 Seri Kembangan, Selangor",
    court: "Court 2 (FIBA Hardwood)",
    dayOfWeek: "Saturday",
    startTime: "10:30 AM",
    endTime: "12:00 PM",
    capacity: 28,
    enrolledCount: 22,
    status: "OPEN",
  },
  {
    id: "off-u12-sun-cyberjaya",
    programmeId: "prg-u12",
    programmeName: "U12 Junior Academy",
    venueName: "Cyberjaya Sports Complex",
    venueAddress: "Persiaran Multimedia, 63000 Cyberjaya, Selangor",
    court: "Court A",
    dayOfWeek: "Sunday",
    startTime: "03:00 PM",
    endTime: "04:30 PM",
    capacity: 24,
    enrolledCount: 15,
    status: "OPEN",
  },
  {
    id: "off-u15-sat-serdang",
    programmeId: "prg-u15",
    programmeName: "U15 Youth Academy",
    venueName: "KHLIM Arena Serdang",
    venueAddress: "Jalan Kasturi 3, 43300 Seri Kembangan, Selangor",
    court: "Court 1 (FIBA Hardwood)",
    dayOfWeek: "Saturday",
    startTime: "02:00 PM",
    endTime: "04:00 PM",
    capacity: 24,
    enrolledCount: 20,
    status: "OPEN",
  },
  {
    id: "off-adv-wed-serdang",
    programmeId: "prg-adv",
    programmeName: "Advanced Elite Training",
    venueName: "KHLIM Arena Serdang",
    venueAddress: "Jalan Kasturi 3, 43300 Seri Kembangan, Selangor",
    court: "Main Show Court",
    dayOfWeek: "Wednesday & Friday",
    startTime: "07:30 PM",
    endTime: "09:30 PM",
    capacity: 16,
    enrolledCount: 14,
    status: "OPEN",
  },
];

export const INITIAL_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "plan-monthly-flex",
    name: "1-Month Trial Package",
    durationMonths: 1,
    billingFrequency: "MONTHLY",
    monthlyAmount: 220,
    upfrontAmount: 220,
    currency: "MYR",
    sessionAllowance: "4 sessions / month",
    commitmentCycles: 1,
    benefitsSummary: [
      "4 Weekly Academy Training Sessions",
      "Official KHLIM Training Jersey",
      "Parent Portal Access & Schedule Tracking",
    ],
    active: true,
  },
  {
    id: "plan-term-3mo",
    name: "3-Month Academy Term (Popular)",
    durationMonths: 3,
    billingFrequency: "MONTHLY",
    monthlyAmount: 195,
    upfrontAmount: 585,
    currency: "MYR",
    sessionAllowance: "12 sessions / term",
    commitmentCycles: 3,
    benefitsSummary: [
      "12 Weekly Academy Training Sessions",
      "Full KHLIM Kit (Jersey + Reversible Shorts)",
      "Term Coach Progress Evaluation",
      "Priority Camp & 3x3 Registration",
    ],
    active: true,
  },
  {
    id: "plan-season-6mo",
    name: "6-Month Development Season",
    durationMonths: 6,
    billingFrequency: "MONTHLY",
    monthlyAmount: 180,
    upfrontAmount: 1080,
    currency: "MYR",
    sessionAllowance: "24 sessions / season",
    commitmentCycles: 6,
    benefitsSummary: [
      "24 Weekly Training Sessions",
      "Full KHLIM Premium Gear Package + Basketball",
      "Mid-Season & End-Season Skill Assessment",
      "10% Tournament & Holiday Camp Discount",
    ],
    active: true,
  },
];

// Initial mock state for demo/development
let mockAthletes: AthleteProfile[] = [
  {
    id: "ath-lucas-01",
    displayName: "Lucas Lim",
    dateOfBirth: "2015-04-12",
    gender: "Male",
    preferredLocale: "en",
    linkStatus: "ACTIVE",
    relationshipType: "Parent",
  },
  {
    id: "ath-maya-02",
    displayName: "Maya Lim",
    dateOfBirth: "2018-09-25",
    gender: "Female",
    preferredLocale: "en",
    linkStatus: "ACTIVE",
    relationshipType: "Parent",
  },
];

let mockGuardianProfile: GuardianProfile = {
  userId: "usr-guardian-01",
  displayName: "Richie Lim",
  phone: "+60 12-345 6789",
  emergencyContactName: "Sarah Tan",
  emergencyContactPhone: "+60 19-876 5432",
};

let mockMemberships: Membership[] = [
  {
    id: "mem-01",
    athleteId: "ath-lucas-01",
    athleteName: "Lucas Lim",
    programmeOfferingId: "off-u12-sat-serdang",
    programmeName: "U12 Junior Academy",
    venueName: "KHLIM Arena Serdang",
    membershipPlanId: "plan-term-3mo",
    planName: "3-Month Academy Term",
    billingFrequency: "MONTHLY",
    status: "ACTIVE",
    startsAt: "2026-08-01",
    endsAt: "2026-10-31",
    nextPaymentDate: "2026-09-01",
    nextPaymentAmount: 195,
  },
  {
    id: "mem-02",
    athleteId: "ath-maya-02",
    athleteName: "Maya Lim",
    programmeOfferingId: "off-u9-sat-serdang",
    programmeName: "U9 Foundation Academy",
    venueName: "KHLIM Arena Serdang",
    membershipPlanId: "plan-monthly-flex",
    planName: "1-Month Trial Package",
    billingFrequency: "MONTHLY",
    status: "ACTIVE",
    startsAt: "2026-08-15",
    endsAt: "2026-09-14",
    nextPaymentDate: "2026-09-15",
    nextPaymentAmount: 220,
  },
];

let mockInstallments: PaymentInstallment[] = [
  {
    id: "inst-01",
    scheduleId: "sch-01",
    installmentNumber: 1,
    dueDate: "2026-08-01",
    amount: 195,
    currency: "MYR",
    status: "PAID",
    paidAt: "2026-08-01",
    receiptNumber: "REC-2026-08019",
  },
  {
    id: "inst-02",
    scheduleId: "sch-01",
    installmentNumber: 2,
    dueDate: "2026-09-01",
    amount: 195,
    currency: "MYR",
    status: "SCHEDULED",
  },
  {
    id: "inst-03",
    scheduleId: "sch-01",
    installmentNumber: 3,
    dueDate: "2026-10-01",
    amount: 195,
    currency: "MYR",
    status: "SCHEDULED",
  },
  {
    id: "inst-maya-01",
    scheduleId: "sch-02",
    installmentNumber: 1,
    dueDate: "2026-08-15",
    amount: 220,
    currency: "MYR",
    status: "PAID",
    paidAt: "2026-08-15",
    receiptNumber: "REC-2026-08088",
  },
];

let mockTransactions: PaymentTransaction[] = [
  {
    id: "tx-01",
    installmentId: "inst-01",
    description: "Lucas Lim — U12 Junior Academy (Month 1/3)",
    amount: 195,
    currency: "MYR",
    status: "PAID",
    paymentMethod: "Visa •••• 4242",
    paidAt: "2026-08-01 10:14 AM",
    receiptNumber: "REC-2026-08019",
  },
  {
    id: "tx-02",
    installmentId: "inst-maya-01",
    description: "Maya Lim — U9 Foundation Academy (Trial)",
    amount: 220,
    currency: "MYR",
    status: "PAID",
    paymentMethod: "Mastercard •••• 8812",
    paidAt: "2026-08-15 02:45 PM",
    receiptNumber: "REC-2026-08088",
  },
];

let mockSessions: TrainingSession[] = [
  {
    id: "sess-01",
    programmeOfferingId: "off-u12-sat-serdang",
    programmeName: "U12 Junior Academy",
    athleteId: "ath-lucas-01",
    athleteName: "Lucas Lim",
    venueName: "KHLIM Arena Serdang",
    court: "Court 2",
    sessionDate: "2026-08-29",
    startTime: "10:30 AM",
    endTime: "12:00 PM",
    coachName: "Coach Marcus Wong",
    status: "SCHEDULED",
  },
  {
    id: "sess-02",
    programmeOfferingId: "off-u9-sat-serdang",
    programmeName: "U9 Foundation Academy",
    athleteId: "ath-maya-02",
    athleteName: "Maya Lim",
    venueName: "KHLIM Arena Serdang",
    court: "Court 1",
    sessionDate: "2026-08-29",
    startTime: "09:00 AM",
    endTime: "10:30 AM",
    coachName: "Coach Cheryl Tan",
    status: "SCHEDULED",
  },
  {
    id: "sess-03",
    programmeOfferingId: "off-u12-sat-serdang",
    programmeName: "U12 Junior Academy",
    athleteId: "ath-lucas-01",
    athleteName: "Lucas Lim",
    venueName: "KHLIM Arena Serdang",
    court: "Court 2",
    sessionDate: "2026-09-05",
    startTime: "10:30 AM",
    endTime: "12:00 PM",
    coachName: "Coach Marcus Wong",
    status: "SCHEDULED",
  },
  {
    id: "sess-04",
    programmeOfferingId: "off-u9-sat-serdang",
    programmeName: "U9 Foundation Academy",
    athleteId: "ath-maya-02",
    athleteName: "Maya Lim",
    venueName: "KHLIM Arena Serdang",
    court: "Court 1",
    sessionDate: "2026-09-05",
    startTime: "09:00 AM",
    endTime: "10:30 AM",
    coachName: "Coach Cheryl Tan",
    status: "SCHEDULED",
  },
];

let mockNotifications: NotificationItem[] = [
  {
    id: "notif-01",
    title: "Welcome to KHLIM Basketball Academy!",
    message: "Lucas and Maya have been registered. Their first training session is scheduled for Saturday, 29 August.",
    category: "GENERAL",
    isRead: false,
    createdAt: "2026-08-25",
  },
  {
    id: "notif-02",
    title: "Payment Receipt Confirmed",
    message: "Payment of MYR 195.00 for Lucas Lim (U12 Junior Academy) has been received. Receipt REC-2026-08019 generated.",
    category: "BILLING",
    isRead: true,
    createdAt: "2026-08-01",
  },
  {
    id: "notif-03",
    title: "Upcoming Training Reminder",
    message: "Reminder: U12 Junior Academy training this Saturday at 10:30 AM, KHLIM Arena Serdang Court 2.",
    category: "SCHEDULE",
    isRead: false,
    createdAt: "2026-08-26",
  },
];

// API Service functions
export const apiService = {
  async getProgrammes(): Promise<Programme[]> {
    return Promise.resolve([...INITIAL_PROGRAMMES]);
  },

  async getOfferings(programmeId?: string): Promise<ProgrammeOffering[]> {
    if (programmeId) {
      return Promise.resolve(INITIAL_OFFERINGS.filter((o) => o.programmeId === programmeId));
    }
    return Promise.resolve([...INITIAL_OFFERINGS]);
  },

  async getOffering(offeringId: string): Promise<ProgrammeOffering | undefined> {
    return Promise.resolve(INITIAL_OFFERINGS.find((o) => o.id === offeringId));
  },

  async getMembershipPlans(): Promise<MembershipPlan[]> {
    return Promise.resolve([...INITIAL_MEMBERSHIP_PLANS]);
  },

  async getLinkedAthletes(): Promise<AthleteProfile[]> {
    return Promise.resolve([...mockAthletes]);
  },

  async createAthlete(data: { displayName: string; dateOfBirth: string; gender?: string }): Promise<AthleteProfile> {
    const newAthlete: AthleteProfile = {
      id: `ath-${Date.now().toString(36)}`,
      displayName: data.displayName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender ?? "Not specified",
      preferredLocale: "en",
      linkStatus: "ACTIVE",
      relationshipType: "Parent",
    };
    mockAthletes = [...mockAthletes, newAthlete];
    return Promise.resolve(newAthlete);
  },

  async getGuardianProfile(): Promise<GuardianProfile> {
    return Promise.resolve({ ...mockGuardianProfile });
  },

  async updateGuardianProfile(profile: Partial<GuardianProfile>): Promise<GuardianProfile> {
    mockGuardianProfile = { ...mockGuardianProfile, ...profile };
    return Promise.resolve({ ...mockGuardianProfile });
  },

  async getMemberships(athleteId?: string): Promise<Membership[]> {
    if (athleteId) {
      return Promise.resolve(mockMemberships.filter((m) => m.athleteId === athleteId));
    }
    return Promise.resolve([...mockMemberships]);
  },

  async createMembership(data: {
    athleteId: string;
    offeringId: string;
    membershipPlanId: string;
  }): Promise<Membership> {
    const athlete = mockAthletes.find((a) => a.id === data.athleteId);
    const offering = INITIAL_OFFERINGS.find((o) => o.id === data.offeringId);
    const plan = INITIAL_MEMBERSHIP_PLANS.find((p) => p.id === data.membershipPlanId);

    const newMembership: Membership = {
      id: `mem-${Date.now().toString(36)}`,
      athleteId: data.athleteId,
      athleteName: athlete?.displayName ?? "Player",
      programmeOfferingId: data.offeringId,
      programmeName: offering?.programmeName ?? "Academy Programme",
      venueName: offering?.venueName ?? "KHLIM Arena",
      membershipPlanId: data.membershipPlanId,
      planName: plan?.name ?? "Academy Plan",
      billingFrequency: plan?.billingFrequency ?? "MONTHLY",
      status: "ACTIVE",
      startsAt: new Date().toISOString().split("T")[0]!,
      endsAt: new Date(Date.now() + (plan?.durationMonths ?? 1) * 30 * 86400000).toISOString().split("T")[0]!,
      nextPaymentDate: plan?.billingFrequency === "MONTHLY" ? new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] : undefined,
      nextPaymentAmount: plan?.monthlyAmount,
    };

    mockMemberships = [newMembership, ...mockMemberships];
    return Promise.resolve(newMembership);
  },

  async getPaymentInstallments(): Promise<PaymentInstallment[]> {
    return Promise.resolve([...mockInstallments]);
  },

  async getPaymentTransactions(): Promise<PaymentTransaction[]> {
    return Promise.resolve([...mockTransactions]);
  },

  async getTrainingSessions(athleteId?: string): Promise<TrainingSession[]> {
    if (athleteId) {
      return Promise.resolve(mockSessions.filter((s) => s.athleteId === athleteId));
    }
    return Promise.resolve([...mockSessions]);
  },

  async getNotifications(): Promise<NotificationItem[]> {
    return Promise.resolve([...mockNotifications]);
  },

  async markNotificationAsRead(id: string): Promise<void> {
    mockNotifications = mockNotifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    return Promise.resolve();
  },
};
