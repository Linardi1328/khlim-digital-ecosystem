"use client";

import { createApiClient, type ApiClient } from "@khlim/api-client";
import { adminApi as generatedDemoApi } from "./admin-api-legacy";
import { ADMIN_DEMO_MODE } from "./demo-mode";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1"
).replace(/\/+$/, "");

export function getAdminAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("khlim_admin_access_token");
}

export const adminApiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => getAdminAccessToken(),
});

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
    `Admin operation ${String(method)} is unavailable until staff authentication and its backend endpoint are connected.`,
  );
}

export const adminApi: typeof generatedDemoApi = new Proxy(generatedDemoApi, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value !== "function") return value;

    return (...args: unknown[]) => {
      const method = property as keyof typeof generatedDemoApi;

      if (!ADMIN_DEMO_MODE) {
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
