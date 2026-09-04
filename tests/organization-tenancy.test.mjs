import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Organization #001 migration creates the tenancy kernel and backfills staff", async () => {
  const migration = await read(
    "prisma/migrations/20260904192000_organization_kernel/migration.sql",
  );

  assert.match(migration, /CREATE TABLE "organizations"/);
  assert.match(migration, /'khlim-basketball'/);
  assert.match(migration, /CREATE TABLE "organization_memberships"/);
  assert.match(migration, /CREATE TABLE "organization_role_assignments"/);
  assert.match(migration, /CREATE TABLE "organization_settings"/);
  assert.match(migration, /CREATE TABLE "organization_branding"/);
  assert.match(migration, /CREATE TABLE "organization_sports"/);
  assert.match(migration, /FROM "user_role_assignments"/);
  assert.match(migration, /audit_events_organization_id_created_at_idx/);
});

test("authenticated staff roles are resolved from organization context", async () => {
  const guard = await read("apps/api/src/auth/authenticated-user.guard.ts");
  const service = await read("apps/api/src/organization/organization.service.ts");

  assert.match(guard, /OrganizationService/);
  assert.match(guard, /organizationRoles/);
  assert.match(guard, /PLATFORM_PARTICIPANT_ROLES/);
  assert.match(guard, /x-khlim-organization|ORGANIZATION_HEADER/);

  assert.match(service, /organization_memberships/);
  assert.match(service, /organization_role_assignments/);
  assert.match(service, /DEFAULT_ORGANIZATION_SLUG/);
  assert.match(service, /bootstrapLegacyStaffRoles/);
});

test("roadmap keeps Organization #001 as the active implementation milestone", async () => {
  const roadmap = await read("docs/roadmap/development-roadmap.md");
  assert.match(roadmap, /Organization #001 Compatibility Slice/);
  assert.match(roadmap, /tenant isolation/i);
});
