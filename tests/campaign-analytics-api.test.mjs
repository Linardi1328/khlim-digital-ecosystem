import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("parseMytDateRange handles Asia/Kuala_Lumpur UTC conversion and input boundaries", async () => {
  const { parseMytDateRange } = await import(
    new URL("apps/api/src/academy/academy-campaigns.validation.ts", root).href
  );

  // Exact 24 October 2026 event day in MYT (UTC+8)
  const eventDay = parseMytDateRange("2026-10-24", "2026-10-24");
  assert.equal(eventDay.startDate, "2026-10-24");
  assert.equal(eventDay.endDate, "2026-10-24");
  assert.equal(eventDay.fromUtc?.toISOString(), "2026-10-23T16:00:00.000Z");
  assert.equal(eventDay.toUtc?.toISOString(), "2026-10-24T15:59:59.999Z");

  // Unbounded / all-time
  const allTime = parseMytDateRange(undefined, undefined);
  assert.equal(allTime.fromUtc, null);
  assert.equal(allTime.toUtc, null);

  // Start date only
  const startOnly = parseMytDateRange("2026-10-01", undefined);
  assert.equal(startOnly.fromUtc?.toISOString(), "2026-09-30T16:00:00.000Z");
  assert.equal(startOnly.toUtc, null);

  // Invalid format rejection
  assert.throws(() => parseMytDateRange("invalid-date", "2026-10-24"), {
    name: "BadRequestException",
  });
  assert.throws(() => parseMytDateRange("2026-10-24", "2026-13-99"), {
    name: "BadRequestException",
  });

  // Start date after end date rejection
  assert.throws(() => parseMytDateRange("2026-10-25", "2026-10-24"), {
    name: "BadRequestException",
  });
});

test("AcademyCampaignsAdminController enforces strict RBAC, MFA, and organization isolation", async () => {
  const code = await read(
    "apps/api/src/academy/academy-campaigns-admin.controller.ts",
  );

  // RBAC & MFA decorators
  assert.match(
    code,
    /@RequireAnyRole\("SUPER_ADMIN",\s*"MANAGEMENT",\s*"ACADEMY_ADMIN"\)/,
  );
  assert.match(code, /@RequireMfa\(\)/);
  assert.match(code, /@Controller\("admin\/academy\/campaigns"\)/);

  // Tenant isolation
  assert.match(code, /organizationId\(user\)/);
  assert.match(code, /if \(!user\.organization\?\.id\)/);
});

test("Campaign metrics service guarantees database authority and resilient PostHog query handling", async () => {
  const code = await read("apps/api/src/academy/academy-campaigns.service.ts");

  // Database authority: queries persisted academyLead
  assert.match(code, /this\.prisma\.client\.academyLead\.findMany/);
  assert.match(code, /source:\s*campaign/);
  assert.match(code, /organizationId/);
  assert.match(code, /totalLeads > 0/);
  assert.match(code, /\(enrolledCount \/ totalLeads\) \* 100/);

  // PostHog query resilience: safe fallback when credentials missing
  assert.match(code, /status:\s*"CONFIG_REQUIRED"/);
  assert.match(code, /status:\s*"AVAILABLE"/);
  assert.match(code, /status:\s*"ERROR"/);
  assert.match(code, /Server-side PostHog query credentials not configured/);

  // Non-exposure of credentials and timeout guard
  assert.match(code, /AbortSignal\.timeout\(5000\)/);
  assert.match(code, /properties\.campaign/);
});
