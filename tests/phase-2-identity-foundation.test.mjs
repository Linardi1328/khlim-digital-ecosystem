import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Phase 2 separates authenticated users from managed athlete identities", async () => {
  const schema = await read("prisma/schema.prisma");

  assert.match(schema, /model User\s*\{/);
  assert.match(schema, /authProviderSubject\s+String\s+@unique/);
  assert.match(schema, /model AthleteProfile\s*\{/);
  assert.match(schema, /userId\s+String\?/);
  assert.match(schema, /model GuardianAthleteLink\s*\{/);
  assert.match(schema, /guardianUserId\s+String/);
  assert.match(schema, /athleteId\s+String/);
  assert.doesNotMatch(schema, /parentId|parent_id/);
});

test("family and role constraints are versioned in a migration", async () => {
  const migrationPath =
    "prisma/migrations/20260826040000_identity_family_foundation/migration.sql";
  const migration = await read(migrationPath);

  await access(new URL(migrationPath, root));
  assert.match(migration, /guardian_athlete_links/);
  assert.match(
    migration,
    /guardian_athlete_links_guardian_user_id_athlete_id_key/,
  );
  assert.match(migration, /user_role_assignments_user_id_role_key/);
  assert.match(migration, /ON DELETE RESTRICT/);
});

test("API authentication is global and public access is explicit", async () => {
  const appModule = await read("apps/api/src/app.module.ts");
  const authModule = await read("apps/api/src/auth/auth.module.ts");
  const health = await read("apps/api/src/health.controller.ts");
  const jwt = await read("apps/api/src/auth/supabase-jwt.service.ts");

  assert.match(appModule, /AuthModule/);
  assert.match(authModule, /APP_GUARD/);
  assert.match(authModule, /AuthenticatedUserGuard/);
  assert.match(authModule, /AuthorizationGuard/);
  assert.match(health, /@Public\(\)/);
  assert.match(jwt, /SUPABASE_JWT_ISSUER/);
  assert.doesNotMatch(jwt, /service_role|SUPABASE_SERVICE/);
});

test("authorization is deny-by-default and roles come from KHLIM data", async () => {
  const guard = await read("apps/api/src/auth/authorization.guard.ts");
  const identity = await read("apps/api/src/identity/identity.service.ts");

  assert.match(guard, /Authorization policy is required/);
  assert.match(guard, /REQUIRED_ROLES_KEY/);
  assert.match(identity, /authProviderSubject: identity\.subject/);
  assert.match(identity, /roleAssignments/);
  assert.match(identity, /user\.status !== "ACTIVE"/);
  assert.doesNotMatch(identity, /payload\.role|app_metadata|user_metadata/);
});

test("identity and family architecture documents managed child accounts", async () => {
  const architecture = await read("docs/architecture/identity-family.md");

  assert.match(architecture, /child does \*\*not\*\* need an email address/);
  assert.match(architecture, /there is no direct `parent_id`/);
  assert.match(architecture, /relationship-aware authorization/i);
});
