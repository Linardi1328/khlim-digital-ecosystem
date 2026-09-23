import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

function quotedValues(source) {
  return [...source.matchAll(/"([a-z]{2}(?:-[A-Za-z]+)?)"/g)].map(
    (match) => match[1],
  );
}

test("current account APIs support guardian onboarding and locale preferences", async () => {
  const controller = await read("apps/api/src/identity/identity.controller.ts");
  const service = await read("apps/api/src/identity/identity.service.ts");

  assert.match(controller, /@Controller\("me"\)/);
  assert.match(controller, /@Put\("guardian-profile"\)/);
  assert.match(controller, /@Patch\("preferences"\)/);
  assert.match(service, /guardianProfile\.upsert/);
  assert.match(service, /role: "GUARDIAN"/);
  assert.match(service, /requireSupportedLocale/);
  assert.doesNotMatch(controller, /authProviderSubject/);
});

test("managed athlete creation binds the child to the authenticated guardian", async () => {
  const controller = await read("apps/api/src/family/family.controller.ts");
  const service = await read("apps/api/src/family/family.service.ts");

  assert.match(controller, /@Post\("me\/athletes"\)/);
  assert.match(controller, /@RequireAnyRole\("GUARDIAN"\)/);
  assert.match(service, /guardianUserId,/);
  assert.match(service, /createdByUserId: guardianUserId/);
  assert.match(service, /status: "ACTIVE"/);
  assert.match(service, /\$transaction/);
  assert.doesNotMatch(service, /body\?\.guardianUserId|body\.guardianUserId/);
});

test("athlete access is relationship-aware and coaches are not implicitly privileged", async () => {
  const decorators = await read(
    "apps/api/src/auth/authorization.decorators.ts",
  );
  const guard = await read("apps/api/src/auth/authorization.guard.ts");
  const access = await read("apps/api/src/family/family-access.service.ts");
  const controller = await read("apps/api/src/family/family.controller.ts");

  assert.match(decorators, /RequireAthleteAccess/);
  assert.match(guard, /familyAccess\.canAccessAthlete/);
  assert.match(access, /guardianAthleteLink\.findFirst/);
  assert.match(access, /status: "ACTIVE"/);
  assert.match(access, /mode === "read" && roles\.has\("ATHLETE"\)/);
  assert.match(controller, /@RequireAthleteAccess\("read"\)/);
  assert.match(controller, /@RequireAthleteAccess\("manage"\)/);

  const staffRoleBlock =
    access.match(
      /FAMILY_STAFF_ROLES = new Set<KhlimUserRole>\(\[([\s\S]*?)\]\)/,
    )?.[1] ?? "";
  assert.doesNotMatch(staffRoleBlock, /"COACH"|"HEAD_COACH"|"FINANCE_ADMIN"/);
});

test("a guardian cannot orphan a managed athlete by removing the last access path", async () => {
  const service = await read("apps/api/src/family/family.service.ts");

  assert.match(service, /activeGuardianCount <= 1/);
  assert.match(service, /!athlete\.userId/);
  assert.match(service, /Cannot remove the only active access path/);
  assert.match(service, /status: "REVOKED"/);
  assert.match(service, /revokedAt: new Date\(\)/);
});

test("API locale allow-list remains aligned with the shared i18n registry", async () => {
  const apiPolicy = await read("apps/api/src/identity/locale-policy.ts");
  const sharedI18n = await read("packages/i18n/src/index.ts");

  assert.deepEqual(
    quotedValues(apiPolicy).slice(0, 5),
    quotedValues(sharedI18n).slice(0, 5),
  );
});

test("OpenAPI advertises the Supabase bearer authentication scheme", async () => {
  const openapi = await read("apps/api/src/openapi.ts");

  assert.match(openapi, /\.addBearerAuth\(/);
  assert.match(openapi, /"supabase"/);
  assert.match(openapi, /bearerFormat: "JWT"/);
});
