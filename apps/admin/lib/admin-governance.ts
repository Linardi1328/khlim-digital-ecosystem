"use client";

import { adminApiClient } from "./admin-api";
import { ADMIN_DEMO_MODE } from "./demo-mode";

export interface GovernanceAuditItem {
  id: string;
  timestamp: string;
  actorUserId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: unknown;
}

export interface GovernanceAuditResponse {
  items: GovernanceAuditItem[];
  total: number;
  limit: number;
  period: { from: string; to: string; days: number };
  filters: { entityTypes: string[]; actions: string[] };
}

export interface GovernanceAuditQuery {
  q?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  take?: number;
}

export interface PlatformSettings {
  id: string;
  currency: "MYR" | "SGD" | "USD";
  timezone: "Asia/Kuala_Lumpur" | "Asia/Singapore" | "UTC";
  version: number;
  createdAt: string;
  updatedAt: string;
  changed?: boolean;
  systemStatus: {
    apiRequest: "AUTHENTICATED";
    database: "REACHABLE";
    auth: "VERIFIED_SESSION";
    checkedAt: string;
  };
}

export interface UpdatePlatformSettingsInput {
  currency: PlatformSettings["currency"];
  timezone: PlatformSettings["timezone"];
}

const DEMO_AUDIT: GovernanceAuditItem[] = [
  {
    id: "demo-audit-settings",
    timestamp: new Date().toISOString(),
    actorUserId: "demo-admin-user",
    actorName: "demo-admin@example.invalid",
    actorRole: "SUPER_ADMIN, MANAGEMENT",
    action: "PLATFORM_SETTINGS_UPDATED",
    entityType: "PLATFORM_SETTINGS",
    entityId: "academy-defaults",
    summary: "Demo-only settings audit event. No backend data was changed.",
    metadata: {
      before: { currency: "MYR", timezone: "Asia/Kuala_Lumpur" },
      after: { currency: "MYR", timezone: "Asia/Kuala_Lumpur" },
    },
  },
  {
    id: "demo-audit-account",
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    actorUserId: "demo-admin-user",
    actorName: "demo-admin@example.invalid",
    actorRole: "SUPER_ADMIN",
    action: "ACCOUNT_STATUS_UPDATED",
    entityType: "USER",
    entityId: "demo-user",
    summary: "Demo-only account status audit event.",
    metadata: { before: { status: "ACTIVE" }, after: { status: "SUSPENDED" } },
  },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function listGovernanceAudit(
  query: GovernanceAuditQuery = {},
): Promise<GovernanceAuditResponse> {
  if (ADMIN_DEMO_MODE) {
    const q = query.q?.trim().toLowerCase() || "";
    const filtered = DEMO_AUDIT.filter((event) => {
      const matchesText =
        !q ||
        [
          event.actorName,
          event.actorRole,
          event.action,
          event.entityType,
          event.entityId,
          event.summary,
        ].some((value) => value.toLowerCase().includes(q));
      const matchesEntity =
        !query.entityType || event.entityType === query.entityType;
      const matchesAction = !query.action || event.action === query.action;
      return matchesText && matchesEntity && matchesAction;
    });
    return Promise.resolve({
      items: filtered,
      total: filtered.length,
      limit: query.take ?? 50,
      period: {
        from: query.from || daysAgo(29),
        to: query.to || today(),
        days: 30,
      },
      filters: {
        entityTypes: [...new Set(DEMO_AUDIT.map((event) => event.entityType))],
        actions: [...new Set(DEMO_AUDIT.map((event) => event.action))],
      },
    });
  }

  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.entityType) params.set("entityType", query.entityType);
  if (query.action) params.set("action", query.action);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.take) params.set("take", String(query.take));
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return adminApiClient.get<GovernanceAuditResponse>(`/admin/audit${suffix}`);
}

export function getPlatformSettings(): Promise<PlatformSettings> {
  if (ADMIN_DEMO_MODE) {
    return Promise.resolve({
      id: "academy-defaults",
      currency: "MYR",
      timezone: "Asia/Kuala_Lumpur",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      systemStatus: {
        apiRequest: "AUTHENTICATED",
        database: "REACHABLE",
        auth: "VERIFIED_SESSION",
        checkedAt: new Date().toISOString(),
      },
    });
  }
  return adminApiClient.get<PlatformSettings>("/admin/settings");
}

export function savePlatformSettings(
  input: UpdatePlatformSettingsInput,
): Promise<PlatformSettings> {
  if (ADMIN_DEMO_MODE) {
    return Promise.resolve({
      id: "academy-defaults",
      ...input,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      changed: false,
      systemStatus: {
        apiRequest: "AUTHENTICATED",
        database: "REACHABLE",
        auth: "VERIFIED_SESSION",
        checkedAt: new Date().toISOString(),
      },
    });
  }
  return adminApiClient.put<PlatformSettings>("/admin/settings", input);
}
