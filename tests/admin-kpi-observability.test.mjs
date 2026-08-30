import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("KPI and health navigation is limited to reporting roles", async () => {
  const sidebar = await read("apps/admin/components/layout/AdminSidebar.tsx");

  assert.match(sidebar, /href:\s*"\/insights"/);
  assert.match(sidebar, /label:\s*"KPI & Health"/);
  assert.match(
    sidebar,
    /href:\s*"\/insights"[\s\S]*?roles:\s*REPORTING/,
  );
});

test("operational health endpoint is persisted, MFA gated, and finance aware", async () => {
  const controller = await read(
    "apps/api/src/admin/admin-access.controller.ts",
  );
  const module = await read("apps/api/src/admin/admin.module.ts");
  const service = await read(
    "apps/api/src/admin/admin-observability.service.ts",
  );

  assert.match(controller, /@Get\("insights\/operational-health"\)/);
  assert.match(
    controller,
    /@Get\("insights\/operational-health"\)[\s\S]*?@RequireAnyRole\(\.\.\.REPORT_ROLES\)[\s\S]*?@RequireMfa\(\)/,
  );
  assert.match(controller, /AdminObservabilityService/);
  assert.match(module, /providers:\s*\[AdminService, AdminObservabilityService\]/);

  assert.match(service, /KPI_WINDOW_DAYS = 30/);
  assert.match(service, /STALE_PENDING_MEMBERSHIP_HOURS = 24/);
  assert.match(service, /STALE_PROCESSING_PAYMENT_MINUTES = 30/);
  assert.match(service, /STUCK_PROVIDER_EVENT_MINUTES = 15/);
  assert.match(service, /membership\.count/);
  assert.match(service, /attendanceRecord\.count/);
  assert.match(service, /trainingSession\.count/);
  assert.match(service, /notificationReceipt\.count/);
  assert.match(service, /paymentProviderEvent\.count/);
  assert.match(service, /FINANCE_ROLES\.has/);
  assert.match(service, /finance = \{/);
  assert.match(service, /netMembershipMovement:/);
  assert.match(service, /overdueScheduledSessions/);
});

test("KPI page explains source data and gives explicit recovery actions", async () => {
  const page = await read("apps/admin/app/insights/page.tsx");
  const client = await read("apps/admin/lib/observability-api.ts");

  assert.match(client, /\/admin\/insights\/operational-health/);
  assert.match(page, /KPI & Operational Health/);
  assert.match(page, /30-day academy KPIs/);
  assert.match(page, /Operational backlog/);
  assert.match(page, /Payment processing health/);
  assert.match(page, /Refresh health data/);
  assert.match(page, /Review memberships/);
  assert.match(page, /Review scheduling/);
  assert.match(page, /Open Editorial Studio/);
  assert.match(page, /Review notifications/);
  assert.match(page, /min-height:\s*44px/);
  assert.match(page, /no\s+predicted, estimated, or synthetic trends/i);
  assert.match(page, /Financial processing signals are restricted/);
  assert.doesNotMatch(page, /trend=\{/);
  assert.doesNotMatch(page, /forecast|prediction score|estimated revenue/i);
});
