"use client";

import { createApiClient, type ApiClient } from "@khlim/api-client";
import { adminApi as generatedDemoApi } from "./admin-api-legacy";
import { ADMIN_DEMO_MODE } from "./demo-mode";
import {
  getStoredAdminAccessToken,
  getValidAdminAccessToken,
} from "./supabase-auth";
import type {
  AccountStatus,
  AdminAccountListResponse,
  AdminSession,
  DashboardMetrics,
  StaffRole,
} from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1"
).replace(/\/+$/, "");

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

const DEMO_READ_METHODS = new Set<keyof typeof generatedDemoApi>([
  "getDashboardMetrics",
  "listProgrammes",
  "listOfferings",
  "listMembershipPlans",
  "listMemberships",
  "listAthletes",
  "listGuardians",
  "listPayments",
  "listVenues",
  "listSessions",
  "listStaff",
  "listAuditLogs",
]);

const DEMO_WRITE_METHODS = new Set<keyof typeof generatedDemoApi>([
  "createProgramme",
  "createOffering",
  "createMembershipPlan",
  "createVenue",
  "createCourt",
  "updateStaffRoles",
  "updateAccountStatus",
]);

function integrationPending(method: PropertyKey): Error {
  return new Error(
    `Admin operation ${String(method)} is unavailable until its persisted backend endpoint is connected.`,
  );
}

export const adminApi: typeof generatedDemoApi = new Proxy(generatedDemoApi, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value !== "function") return value;

    return (...args: unknown[]) => {
      const method = property as keyof typeof generatedDemoApi;

      if (!ADMIN_DEMO_MODE) {
        if (method === "getDashboardMetrics") {
          return getAdminOverview();
        }
        return Promise.reject(integrationPending(method));
      }

      if (DEMO_READ_METHODS.has(method)) {
        return Reflect.apply(value, target, args);
      }

      if (DEMO_WRITE_METHODS.has(method)) {
        return Promise.resolve({
          demo: true,
          persisted: false,
          operation: String(method),
        });
      }

      return Promise.reject(integrationPending(method));
    };
  },
});
