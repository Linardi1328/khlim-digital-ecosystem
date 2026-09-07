import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("programme writes persist or fail visibly", async () => {
  const page = await read("apps/admin/app/programmes/page.tsx");
  const api = await read("apps/admin/lib/admin-api.ts");
  const controller = await read(
    "apps/api/src/academy/academy-admin.controller.ts",
  );

  assert.match(page, /listAdminSports\(\)/);
  assert.match(page, /sportId:\s*newSportId/);
  assert.match(page, /await adminApi\.createProgramme/);
  assert.match(page, /adminApi\.listProgrammes\(\)/);
  assert.match(page, /Programme not saved\./);
  assert.match(page, /No local fallback record was created/);
  assert.doesNotMatch(page, /prg-\$\{Date\.now\(\)\}/);
  assert.doesNotMatch(page, /Create programme fallback/);

  assert.match(api, /\/admin\/operations-data\/sports/);
  assert.match(api, /\/admin\/academy\/programmes/);
  assert.match(controller, /@RequireAnyRole/);
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(controller, /user\.organization\?\.id/);
});

test("offering creation and lifecycle use persisted backend state", async () => {
  const page = await read("apps/admin/app/offerings/page.tsx");
  const client = await read("apps/admin/lib/admin-academy-write-api.ts");
  const controller = await read(
    "apps/api/src/academy/academy-admin-mutations.controller.ts",
  );

  assert.match(page, /await adminApi\.createOffering/);
  assert.match(page, /await refreshOfferings\(\)/);
  assert.match(page, /await updateOfferingStatus/);
  assert.match(page, /Offering not saved\./);
  assert.match(page, /No local fallback record was created/);
  assert.doesNotMatch(page, /off-\$\{Date\.now\(\)\}/);
  assert.doesNotMatch(page, /Create offering fallback/);

  assert.match(
    client,
    /offerings\/\$\{encodeURIComponent\(offeringId\)\}\/status/,
  );
  assert.match(controller, /@Patch\("offerings\/:offeringId\/status"\)/);
  assert.match(controller, /organizationId:\s*orgId/);
  assert.match(controller, /programmeOffering\.update/);
});

test("membership plan creation and active state are persisted", async () => {
  const page = await read("apps/admin/app/plans/page.tsx");
  const client = await read("apps/admin/lib/admin-academy-write-api.ts");
  const controller = await read(
    "apps/api/src/academy/academy-admin-mutations.controller.ts",
  );

  assert.match(page, /await adminApi\.createMembershipPlan/);
  assert.match(page, /await refreshPlans\(\)/);
  assert.match(page, /toMinorUnits/);
  assert.match(page, /await updateMembershipPlanActive/);
  assert.match(page, /Membership plan not saved\./);
  assert.match(page, /No local fallback record was created/);
  assert.doesNotMatch(page, /plan-\$\{Date\.now\(\)\}/);
  assert.doesNotMatch(page, /Create plan fallback/);

  assert.match(
    client,
    /membership-plans\/\$\{encodeURIComponent\(planId\)\}\/active/,
  );
  assert.match(controller, /@Patch\("membership-plans\/:planId\/active"\)/);
  assert.match(controller, /membershipPlan\.update/);
});

test("venue and court configuration never fabricates durable records", async () => {
  const page = await read("apps/admin/app/venues/page.tsx");
  const api = await read("apps/admin/lib/admin-api.ts");
  const controller = await read(
    "apps/api/src/academy/academy-admin.controller.ts",
  );

  assert.match(page, /await adminApi\.createVenue/);
  assert.match(page, /await adminApi\.createCourt/);
  assert.match(page, /await refreshVenues\(\)/);
  assert.match(page, /Venue not saved\./);
  assert.match(page, /Court not saved\./);
  assert.match(page, /No local fallback record was created/);
  assert.doesNotMatch(page, /ven-\$\{Date\.now\(\)\}/);
  assert.doesNotMatch(page, /crt-\$\{Date\.now\(\)\}/);
  assert.doesNotMatch(page, /Create venue fallback/);

  assert.match(api, /\/admin\/academy\/venues/);
  assert.match(controller, /@Post\("venues"\)/);
  assert.match(controller, /@Post\("venues\/:venueId\/courts"\)/);
});

test("new Academy state mutations preserve tenancy, MFA, and public contract stability", async () => {
  const controller = await read(
    "apps/api/src/academy/academy-admin-mutations.controller.ts",
  );
  const module = await read("apps/api/src/academy/academy.module.ts");

  assert.match(controller, /@RequireAnyRole/);
  assert.match(controller, /"SUPER_ADMIN"/);
  assert.match(controller, /"MANAGEMENT"/);
  assert.match(controller, /"ACADEMY_ADMIN"/);
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(controller, /user\.organization\?\.id/);
  assert.match(controller, /findFirst/);
  assert.match(controller, /organizationId:\s*orgId/);
  assert.match(controller, /@ApiExcludeController\(\)/);
  assert.match(module, /AcademyAdminMutationsController/);
});

test("demo writes remain explicitly non-persistent across Phase 2", async () => {
  const programmePage = await read("apps/admin/app/programmes/page.tsx");
  const offeringsPage = await read("apps/admin/app/offerings/page.tsx");
  const plansPage = await read("apps/admin/app/plans/page.tsx");
  const venuesPage = await read("apps/admin/app/venues/page.tsx");
  const client = await read("apps/admin/lib/admin-academy-write-api.ts");
  const api = await read("apps/admin/lib/admin-api.ts");
  const demoMode = await read("apps/admin/lib/demo-mode.ts");

  assert.match(programmePage, /Demo write simulated/);
  assert.match(offeringsPage, /Changes are not persisted/);
  assert.match(plansPage, /Changes are not persisted/);
  assert.match(venuesPage, /Changes are not persisted/);
  assert.match(client, /persisted:\s*false/);
  assert.match(client, /demo:\s*true/);
  assert.match(api, /DEMO_WRITE_METHODS/);
  assert.match(demoMode, /Changes are not persisted/);
});
