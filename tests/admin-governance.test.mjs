import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("governance schema and migration keep audit events append-only", async () => {
  const schema = await read("prisma/schema.prisma");
  const migration = await read(
    "prisma/migrations/20260831034500_admin_governance/migration.sql",
  );

  assert.match(schema, /model AuditEvent \{/);
  assert.match(schema, /model PlatformSetting \{/);
  assert.match(migration, /CREATE TABLE "audit_events"/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON "audit_events"/);
  assert.match(migration, /audit_events are append-only/);
  assert.match(migration, /INSERT INTO "platform_settings"/);
});

test("governance API is management plus MFA gated and filter bounded", async () => {
  const controller = await read(
    "apps/api/src/admin/admin-governance.controller.ts",
  );
  const service = await read("apps/api/src/admin/admin-governance.service.ts");

  assert.match(controller, /@RequireAnyRole\("SUPER_ADMIN", "MANAGEMENT"\)/);
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(controller, /@Get\("audit"\)/);
  assert.match(controller, /@Get\("settings"\)/);
  assert.match(controller, /@Put\("settings"\)/);
  assert.match(service, /AUDIT_MAX_DAYS = 366/);
  assert.match(service, /AUDIT_MAX_TAKE = 100/);
  assert.match(service, /Math\.min\(requestedTake, AUDIT_MAX_TAKE\)/);
  assert.match(service, /allowedCurrencies/);
  assert.match(service, /allowedTimezones/);
});

test("privileged identity and platform changes append audit evidence transactionally", async () => {
  const adminService = await read("apps/api/src/admin/admin.service.ts");
  const governance = await read(
    "apps/api/src/admin/admin-governance.service.ts",
  );

  assert.match(adminService, /STAFF_ROLES_REPLACED/);
  assert.match(adminService, /ACCOUNT_STATUS_UPDATED/);
  assert.match(adminService, /transaction\.auditEvent\.create/);
  assert.match(governance, /PLATFORM_SETTINGS_UPDATED/);
  assert.match(governance, /this\.prisma\.client\.\$transaction/);
  assert.match(governance, /transaction\.platformSetting\.update/);
  assert.match(governance, /transaction\.auditEvent\.create/);
});

test("admin audit UI uses persisted server filters and never exposes mutation controls", async () => {
  const page = await read("apps/admin/app/audit/page.tsx");
  const client = await read("apps/admin/lib/admin-governance.ts");

  assert.match(page, /Operational Audit Trail/);
  assert.match(page, /Append-only invariant/);
  assert.match(page, /listGovernanceAudit/);
  assert.match(page, /type="date"/);
  assert.match(page, /min-height: 44px/);
  assert.doesNotMatch(page, /Delete audit|Edit audit|Purge audit/i);
  assert.match(client, /\/admin\/audit/);
});

test("settings UI persists only safe allowlisted defaults and avoids synthetic health claims", async () => {
  const page = await read("apps/admin/app/settings/page.tsx");
  const client = await read("apps/admin/lib/admin-governance.ts");

  assert.match(page, /Save defaults/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /No retroactive financial conversion/);
  assert.match(page, /not synthetic uptime/);
  assert.match(
    page,
    /No API keys, passwords, database URLs, or webhook secrets/,
  );
  assert.match(page, /min-height: 44px/);
  assert.doesNotMatch(page, /Save unavailable/);
  assert.doesNotMatch(page, /input[^>]+password/i);
  assert.match(client, /\/admin\/settings/);
});
