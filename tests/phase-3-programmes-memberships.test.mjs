import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Phase 3 keeps programmes distinct from operational offerings", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.match(schema, /model Programme\s*\{/);
  assert.match(schema, /model ProgrammeOffering\s*\{/);
  assert.match(schema, /capacity\s+Int/);
  assert.match(schema, /ProgrammeOfferingStatus/);
});

test("membership plans are configurable data rather than hard-coded tiers", async () => {
  const schema = await read("prisma/schema.prisma");
  const service = await read("apps/api/src/academy/academy.service.ts");
  assert.match(schema, /model MembershipPlan\s*\{/);
  assert.match(schema, /recurringAmountMinor/);
  assert.match(schema, /upfrontAmountMinor/);
  assert.match(schema, /MembershipPlanOfferingEligibility/);
  assert.doesNotMatch(service, /RM250|RM200|RM180|RM150/);
});

test("membership state is independent and starts pending before billing", async () => {
  const schema = await read("prisma/schema.prisma");
  const service = await read("apps/api/src/academy/academy.service.ts");
  assert.match(schema, /enum MembershipStatus/);
  assert.match(schema, /PENDING\n  ACTIVE\n  SUSPENDED/);
  assert.match(service, /status: "PENDING"/);
  assert.match(service, /Selected plan is not available for this offering/);
});

test("admin academy configuration requires scoped role and MFA", async () => {
  const controller = await read(
    "apps/api/src/academy/academy-admin.controller.ts",
  );
  assert.match(controller, /ACADEMY_ADMIN/);
  assert.match(controller, /@RequireMfa\(\)/);
});
