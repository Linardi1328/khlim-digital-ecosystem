import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function modelBlock(schema, name) {
  const match = schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `${name} model is required`);
  return match[0];
}

test("Phase 1B makes editorial entries organization-owned with tenant slug uniqueness", async () => {
  const schema = await read("prisma/schema.prisma");
  const migration = await read(
    "prisma/migrations/20260906164000_phase_1b_editorial_ownership/migration.sql",
  );
  const editorial = modelBlock(schema, "EditorialEntry");

  assert.match(
    editorial,
    /organizationId\s+String\s+@map\("organization_id"\)/,
  );
  assert.match(editorial, /organization\s+Organization\s+@relation/);
  assert.doesNotMatch(editorial, /slug\s+String\?\s+@unique/);
  assert.match(editorial, /@@unique\(\[organizationId, slug\]\)/);
  assert.match(
    editorial,
    /@@index\(\[organizationId, type, status, publishedAt\]\)/,
  );
  assert.match(migration, /00000000-0000-4000-8000-000000000001/);
  assert.match(migration, /editorial_entries_organization_id_slug_key/);
  assert.match(
    migration,
    /editorial_entries_organization_id_type_status_publishedAt_idx/,
  );
  assert.match(migration, /"publishedAt"/);
  assert.doesNotMatch(migration, /"published_at"/);
});

test("editorial admin operations are tenant scoped and public compatibility fails closed", async () => {
  const service = await read("apps/api/src/editorial/editorial.service.ts");
  const controller = await read(
    "apps/api/src/editorial/editorial.controller.ts",
  );

  assert.match(service, /where: \{ organizationId \}/);
  assert.match(service, /data: \{\n\s+organizationId,/);
  assert.match(service, /where: \{ id, organizationId \}/);
  assert.match(service, /compatibilityPublicOrganizationId/);
  assert.match(service, /MULTI_ORGANIZATION_RUNTIME_ENABLED/);
  assert.match(service, /Public editorial organization routing is required/);
  assert.match(service, /return DEFAULT_ORGANIZATION_ID/);
  assert.match(controller, /organizationId\(user\)/);
});

test("organization staff authority is administered only through scoped membership roles", async () => {
  const controller = await read("apps/api/src/admin/admin.controller.ts");
  const access = await read(
    "apps/api/src/admin/admin-organization-access.service.ts",
  );
  const organization = await read(
    "apps/api/src/organization/organization.service.ts",
  );

  assert.match(controller, /AdminOrganizationAccessService/);
  assert.match(controller, /organizationId\(actor\)/);
  assert.match(access, /organizationMembership\.findMany/);
  assert.match(access, /organizationId_userId/);
  assert.match(access, /organizationRoleAssignment\.deleteMany/);
  assert.match(access, /organizationRoleAssignment\.createMany/);
  assert.match(access, /organizationMembership\.update/);
  assert.match(access, /ORGANIZATION_STAFF_ROLES_REPLACED/);
  assert.match(access, /ORGANIZATION_MEMBERSHIP_STATUS_UPDATED/);
  assert.doesNotMatch(organization, /syncLegacyStaffRoles/);
  assert.doesNotMatch(
    organization,
    /user_role_assignments|userRoleAssignment/,
    "legacy global staff rows must not be runtime organization authority",
  );
});

test("Phase 1B compatibility includes editorial only while runtime remains disabled", async () => {
  const prismaService = await read("apps/api/src/database/prisma.service.ts");
  const environment = await read(".env.example");

  assert.match(prismaService, /"editorialentry"/);
  assert.match(
    prismaService,
    /if \(MULTI_ORGANIZATION_RUNTIME_ENABLED\) return client;/,
  );
  assert.match(environment, /KHLIM_MULTI_ORGANIZATION_ENABLED=false/);
});
