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
