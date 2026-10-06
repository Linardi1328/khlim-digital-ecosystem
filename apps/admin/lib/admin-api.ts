"use client";

import { createApiClient, type ApiClient } from "@khlim/api-client";
import { adminApi as generatedDemoApi } from "./admin-api-legacy";
import { ADMIN_DEMO_MODE } from "./demo-mode";
import {
  getStoredAdminAccessToken,
  getValidAdminAccessToken,
} from "./supabase-auth";
import type {
  AdminOperationsReport,
  AdminOperationsReportQuery,
  EditorialModerationItem,
} from "./admin-operations-types";
import type {
  AccountStatus,
  AdminAccountListResponse,
  AdminSession,
  AthleteItem,
  AuditLogItem,
  DashboardMetrics,
  GuardianItem,
  MembershipItem,
  MembershipPlanItem,
  OfferingItem,
  PaymentItem,
  ProgrammeItem,
  SessionItem,
  SportItem,
  StaffRole,
  StaffUserItem,
  VenueItem,
} from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1"
).replace(/\/+$/, "");

const DEMO_MODERATION_ITEMS: EditorialModerationItem[] = [
  {
    id: "demo-editorial-ready",
    type: "PLAYER_SPOTLIGHT",
    slug: "demo-player-spotlight",
    title: "Player development milestone ready for review",
    eventName: "KHLIM Demo Event",
    summary:
      "A verified demo Player Spotlight that is ready for management review before public release.",
    playerName: "Demo Athlete",
    achievement: "Development milestone",
    achievedOnLabel: "August 2026",
    articleParagraphs: [
      "This is demo-only editorial copy for the moderation workflow.",
      "No demo moderation action is persisted to the backend.",
    ],
    photoLabel: "Approved demo athlete photo",
    factsVerified: true,
    aiAssisted: true,
    status: "DRAFT",
    moderationState: "READY",
    moderationBlockers: [],
  },
  {
    id: "demo-editorial-blocked",
    type: "ACHIEVEMENT",
    title: "Achievement awaiting verification",
    eventName: "KHLIM Demo Event",
    summary:
      "This demo achievement intentionally remains blocked until facts and image rights are verified.",
    yearLabel: "2026",
    photoLabel: "Demo team photo",
    factsVerified: false,
    aiAssisted: false,
    status: "DRAFT",
    moderationState: "BLOCKED",
    moderationBlockers: [
      "Facts and photo rights still require staff verification.",
    ],
  },
  {
    id: "demo-editorial-live",
    type: "ACHIEVEMENT",
    title: "Published demo achievement",
    eventName: "KHLIM Demo Event",
    summary: "A demo item representing content that is already public.",
    yearLabel: "2026",
    photoLabel: "Approved demo team photo",
    factsVerified: true,
    aiAssisted: false,
    status: "PUBLISHED",
    moderationState: "LIVE",
    moderationBlockers: [],
  },
];

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDemoOperationsReport(
  query: AdminOperationsReportQuery,
): AdminOperationsReport {
  const today = new Date();
  const to = query.to || toDateOnly(today);
  const defaultFrom = new Date(`${to}T00:00:00.000Z`);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const from = query.from || toDateOnly(defaultFrom);
  const dayCount = Math.max(
    1,
    Math.floor(
      (new Date(`${to}T23:59:59.999Z`).getTime() -
        new Date(`${from}T00:00:00.000Z`).getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1,
  );

  return {
    period: { from, to, days: dayCount },
    memberships: {
      byStatus: {
        PENDING: 4,
        ACTIVE: 42,
        SUSPENDED: 2,
        CANCELLED: 5,
        COMPLETED: 8,
        EXPIRED: 3,
      },
      createdInPeriod: 9,
      activatedInPeriod: 7,
      cancelledInPeriod: 2,
    },
    sessions: {
      scheduled: 18,
      completed: 24,
      cancelled: 2,
      total: 44,
    },
    attendance: {
      present: 286,
      late: 18,
      absent: 31,
      excused: 14,
      recorded: 349,
      attendanceRate: 91,
    },
    capacity: {
      openOfferings: 5,
      totalCapacity: 96,
      occupiedPlaces: 61,
      availablePlaces: 35,
      utilisationRate: 64,
    },
    editorial: {
      readyForReview: 1,
      verificationBlocked: 1,
      published: 6,
    },
    finance: {
      paidPayments: 31,
      failedPayments: 3,
      currencyBreakdown: [
        { currency: "MYR", paidAmountMinor: 612000, paidPayments: 31 },
      ],
    },
    generatedAt: new Date().toISOString(),
  };
}

export function getAdminAccessToken(): string | null {
  return getStoredAdminAccessToken();
}

export const adminApiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => getValidAdminAccessToken(),
});

export function getAdminSession(): Promise<AdminSession> {
  return adminApiClient.get<AdminSession>("/admin/session");
}

export function getAdminOverview(): Promise<DashboardMetrics> {
  return adminApiClient.get<DashboardMetrics>("/admin/overview");
}

export interface StaleCheckoutReconciliation {
  expired: number;
  actionRequired: number;
  cutoff: string;
  holdMinutes: number;
}

export function reconcileStaleCheckouts(): Promise<StaleCheckoutReconciliation> {
  if (ADMIN_DEMO_MODE) {
    return Promise.reject(
      new Error("Checkout reconciliation is unavailable in Admin demo mode."),
    );
  }
  return adminApiClient.post<StaleCheckoutReconciliation>(
    "/admin/billing/reconcile-stale-checkouts",
  );
}

export function listAdminSports(): Promise<SportItem[]> {
  if (ADMIN_DEMO_MODE) {
    return Promise.resolve([
      { id: "demo-basketball", code: "BASKETBALL", name: "Basketball" },
    ]);
  }
  return adminApiClient.get<SportItem[]>("/admin/operations-data/sports");
}

export function getAdminOperationsReport(
  query: AdminOperationsReportQuery = {},
): Promise<AdminOperationsReport> {
  if (ADMIN_DEMO_MODE) {
    return Promise.resolve(createDemoOperationsReport(query));
  }

  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return adminApiClient.get<AdminOperationsReport>(
    `/admin/reports/operations${suffix}`,
  );
}

export function listEditorialModerationQueue(): Promise<
  EditorialModerationItem[]
> {
  if (ADMIN_DEMO_MODE) {
    return Promise.resolve(DEMO_MODERATION_ITEMS.map((item) => ({ ...item })));
  }
  return adminApiClient.get<EditorialModerationItem[]>(
    "/admin/editorial/moderation",
  );
}

export function publishEditorialEntry(
  entryId: string,
): Promise<EditorialModerationItem> {
  if (ADMIN_DEMO_MODE) {
    const item = DEMO_MODERATION_ITEMS.find((entry) => entry.id === entryId);
    if (!item) return Promise.reject(new Error("Editorial item not found"));
    return Promise.resolve({
      ...item,
      status: "PUBLISHED",
      moderationState: "LIVE",
      moderationBlockers: [],
    });
  }
  return adminApiClient.post<EditorialModerationItem>(
    `/admin/editorial/${encodeURIComponent(entryId)}/publish`,
  );
}

export function unpublishEditorialEntry(
  entryId: string,
): Promise<EditorialModerationItem> {
  if (ADMIN_DEMO_MODE) {
    const item = DEMO_MODERATION_ITEMS.find((entry) => entry.id === entryId);
    if (!item) return Promise.reject(new Error("Editorial item not found"));
    return Promise.resolve({
      ...item,
      status: "DRAFT",
      moderationState: item.factsVerified ? "READY" : "BLOCKED",
    });
  }
  return adminApiClient.post<EditorialModerationItem>(
    `/admin/editorial/${encodeURIComponent(entryId)}/unpublish`,
  );
}

export interface AdminAccountQuery {
  q?: string;
  status?: AccountStatus | "";
  role?: string;
  take?: number;
}

export function listAdminAccounts(
  query: AdminAccountQuery = {},
): Promise<AdminAccountListResponse> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  if (query.role?.trim()) params.set("role", query.role.trim());
  if (query.take) params.set("take", String(query.take));
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return adminApiClient.get<AdminAccountListResponse>(`/admin/users${suffix}`);
}

export function replaceAdminStaffRoles(
  userId: string,
  roles: StaffRole[],
): Promise<Array<{ role: string }>> {
  return adminApiClient.put<Array<{ role: string }>>(
    `/admin/users/${encodeURIComponent(userId)}/staff-roles`,
    { roles },
  );
}

export function updateAdminAccountStatus(
  userId: string,
  status: AccountStatus,
): Promise<{ id: string; status: AccountStatus; updatedAt: string }> {
  return adminApiClient.patch<{
    id: string;
    status: AccountStatus;
    updatedAt: string;
  }>(`/admin/users/${encodeURIComponent(userId)}/status`, { status });
}

type LegacyAdminApi = typeof generatedDemoApi;

const DEMO_WRITE_METHODS = new Set<keyof LegacyAdminApi>([
  "createProgramme",
  "createOffering",
  "createMembershipPlan",
  "createVenue",
  "createCourt",
  "updateStaffRoles",
  "updateAccountStatus",
]);

const demoAdminApi: LegacyAdminApi = new Proxy(generatedDemoApi, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value !== "function") return value;

    return (...args: unknown[]) => {
      const method = property as keyof LegacyAdminApi;
      if (DEMO_WRITE_METHODS.has(method)) {
        return Promise.resolve({
          demo: true,
          persisted: false,
          operation: String(method),
        });
      }
      return Reflect.apply(value, target, args);
    };
  },
});

const realAdminApi: LegacyAdminApi = {
  getDashboardMetrics: () => getAdminOverview(),
  listProgrammes: () =>
    adminApiClient.get<ProgrammeItem[]>("/admin/operations-data/programmes"),
  createProgramme: (dto) => {
    if (!dto.sportId) {
      return Promise.reject(new Error("Select an active organization sport."));
    }
    return adminApiClient.post("/admin/academy/programmes", {
      sportId: dto.sportId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      minimumAge: dto.minimumAge,
      maximumAge: dto.maximumAge,
      level: dto.level,
    });
  },
  listOfferings: () =>
    adminApiClient.get<OfferingItem[]>("/admin/operations-data/offerings"),
  createOffering: (dto) => adminApiClient.post("/admin/academy/offerings", dto),
  listMembershipPlans: () =>
    adminApiClient.get<MembershipPlanItem[]>(
      "/admin/operations-data/membership-plans",
    ),
  createMembershipPlan: (dto) =>
    adminApiClient.post("/admin/academy/membership-plans", dto),
  listMemberships: () =>
    adminApiClient.get<MembershipItem[]>("/admin/operations-data/memberships"),
  listAthletes: () =>
    adminApiClient.get<AthleteItem[]>("/admin/operations-data/athletes"),
  listGuardians: () =>
    adminApiClient.get<GuardianItem[]>("/admin/operations-data/guardians"),
  listPayments: () =>
    adminApiClient.get<PaymentItem[]>("/admin/operations-data/payments"),
  listVenues: () =>
    adminApiClient.get<VenueItem[]>("/admin/operations-data/venues"),
  createVenue: (dto) => adminApiClient.post("/admin/academy/venues", dto),
  createCourt: (venueId, dto) =>
    adminApiClient.post(
      `/admin/academy/venues/${encodeURIComponent(venueId)}/courts`,
      dto,
    ),
  listSessions: () =>
    adminApiClient.get<SessionItem[]>("/admin/operations-data/sessions"),
  listStaff: () =>
    adminApiClient.get<StaffUserItem[]>("/admin/operations-data/staff"),
  updateStaffRoles: (userId, roles) =>
    adminApiClient.put(
      `/admin/users/${encodeURIComponent(userId)}/staff-roles`,
      { roles },
    ),
  updateAccountStatus: (userId, status) =>
    adminApiClient.patch(`/admin/users/${encodeURIComponent(userId)}/status`, {
      status,
    }),
  listAuditLogs: async () => {
    const response = await adminApiClient.get<{
      items: Array<{
        id: string;
        timestamp: string;
        actorName: string;
        actorRole: string;
        action: string;
        entityType: string;
        entityId: string;
        summary: string;
      }>;
    }>("/admin/audit?take=100");
    return response.items.map((item): AuditLogItem => ({
      id: item.id,
      timestamp: item.timestamp,
      actorName: item.actorName,
      actorRole: item.actorRole,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      summary: item.summary,
    }));
  },
};

export const adminApi: LegacyAdminApi = ADMIN_DEMO_MODE
  ? demoAdminApi
  : realAdminApi;

export type AdminLeadStatus =
  "NEW" | "CONTACTED" | "QUALIFIED" | "ENROLLED" | "CLOSED";

export interface AdminLeadItem {
  id: string;
  organizationId: string;
  guardianName: string;
  phone: string;
  email: string | null;
  childAge: number;
  programmeOfferingId: string | null;
  offeringName: string | null;
  programmeName: string | null;
  source: string | null;
  status: AdminLeadStatus;
  notes: string | null;
  consentAt: string;
  consentVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLeadListResponse {
  items: AdminLeadItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminLeadSummaryResponse {
  newLeads: number;
  needsFollowUp: number;
  byStatus: Record<AdminLeadStatus, number>;
  total: number;
}

export interface AdminLeadQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: AdminLeadStatus | "NEEDS_FOLLOW_UP" | "";
  source?: string;
  offeringId?: string;
}

export interface UpdateAdminLeadDto {
  status?: AdminLeadStatus;
  notes?: string | null;
  expectedUpdatedAt?: string;
}

const DEMO_LEADS: AdminLeadItem[] = [
  {
    id: "demo-lead-1",
    organizationId: "00000000-0000-4000-8000-000000000001",
    guardianName: "Lim Wei Hong",
    phone: "+60123456789",
    email: "lim.wh@example.test",
    childAge: 10,
    programmeOfferingId: null,
    offeringName: null,
    programmeName: null,
    source: "3x3-oct24",
    status: "NEW",
    notes: null,
    consentAt: new Date().toISOString(),
    consentVersion: "2026-10-v1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-lead-2",
    organizationId: "00000000-0000-4000-8000-000000000001",
    guardianName: "Nurul Aisyah",
    phone: "+60198765432",
    email: "nurul.aisyah@example.test",
    childAge: 8,
    programmeOfferingId: null,
    offeringName: null,
    programmeName: null,
    source: null,
    status: "CONTACTED",
    notes: "Spoke on WhatsApp. Interested in Saturday morning sessions.",
    consentAt: new Date(Date.now() - 3600000).toISOString(),
    consentVersion: "2026-10-v1",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export function listAdminLeads(
  query: AdminLeadQuery = {},
): Promise<AdminLeadListResponse> {
  if (ADMIN_DEMO_MODE) {
    const filtered = DEMO_LEADS.filter((item) => {
      if (query.status === "NEEDS_FOLLOW_UP") {
        if (!["NEW", "CONTACTED", "QUALIFIED"].includes(item.status))
          return false;
      } else if (query.status && item.status !== query.status) {
        return false;
      }
      if (query.source && item.source !== query.source) return false;
      if (query.q) {
        const q = query.q.toLowerCase();
        return (
          item.guardianName.toLowerCase().includes(q) ||
          item.phone.includes(q) ||
          Boolean(item.email && item.email.toLowerCase().includes(q))
        );
      }
      return true;
    });
    return Promise.resolve({
      items: filtered,
      total: filtered.length,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages: 1,
    });
  }

  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.source) params.set("source", query.source);
  if (query.offeringId) params.set("offeringId", query.offeringId);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return adminApiClient.get<AdminLeadListResponse>(
    `/admin/academy/leads${suffix}`,
  );
}

export function getAdminLeadSummary(): Promise<AdminLeadSummaryResponse> {
  if (ADMIN_DEMO_MODE) {
    const newLeads = DEMO_LEADS.filter((l) => l.status === "NEW").length;
    const needsFollowUp = DEMO_LEADS.filter(
      (l) =>
        l.status === "NEW" ||
        l.status === "CONTACTED" ||
        l.status === "QUALIFIED",
    ).length;
    return Promise.resolve({
      newLeads,
      needsFollowUp,
      byStatus: {
        NEW: newLeads,
        CONTACTED: DEMO_LEADS.filter((l) => l.status === "CONTACTED").length,
        QUALIFIED: DEMO_LEADS.filter((l) => l.status === "QUALIFIED").length,
        ENROLLED: DEMO_LEADS.filter((l) => l.status === "ENROLLED").length,
        CLOSED: DEMO_LEADS.filter((l) => l.status === "CLOSED").length,
      },
      total: DEMO_LEADS.length,
    });
  }
  return adminApiClient.get<AdminLeadSummaryResponse>(
    "/admin/academy/leads/summary",
  );
}

export function getAdminLeadDetail(id: string): Promise<AdminLeadItem> {
  if (ADMIN_DEMO_MODE) {
    const lead = DEMO_LEADS.find((l) => l.id === id);
    if (!lead) return Promise.reject(new Error("Lead not found"));
    return Promise.resolve({ ...lead });
  }
  return adminApiClient.get<AdminLeadItem>(
    `/admin/academy/leads/${encodeURIComponent(id)}`,
  );
}

export function updateAdminLead(
  id: string,
  body: UpdateAdminLeadDto,
): Promise<AdminLeadItem> {
  if (ADMIN_DEMO_MODE) {
    const lead = DEMO_LEADS.find((l) => l.id === id);
    if (!lead) return Promise.reject(new Error("Lead not found"));
    if (body.status) lead.status = body.status;
    if (body.notes !== undefined) lead.notes = body.notes;
    lead.updatedAt = new Date().toISOString();
    return Promise.resolve({ ...lead });
  }
  return adminApiClient.patch<AdminLeadItem>(
    `/admin/academy/leads/${encodeURIComponent(id)}`,
    body,
  );
}
