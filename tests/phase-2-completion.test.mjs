import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("guardian invitation lifecycle stores only token hashes", async () => {
  const schema = await read("prisma/schema.prisma");
  const service = await read("apps/api/src/family/family.service.ts");

  assert.match(schema, /model GuardianInvitation\s*\{/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(service, /createHash\("sha256"\)/);
  assert.match(service, /randomBytes\(32\)/);
  assert.doesNotMatch(schema, /invitationToken|rawToken/);
});

test("guardian invitation acceptance binds to authenticated email and user", async () => {
  const service = await read("apps/api/src/family/family.service.ts");

  assert.match(service, /invitation\.inviteeEmail !== normalizedUserEmail/);
  assert.match(service, /guardianUserId: user\.id/);
  assert.match(service, /acceptedByUserId: user\.id/);
  assert.match(service, /role: "GUARDIAN"/);
});

test("privileged organization access administration requires MFA", async () => {
  const controller = await read("apps/api/src/admin/admin.controller.ts");
  const guard = await read("apps/api/src/auth/authorization.guard.ts");
  const identity = await read("apps/api/src/identity/identity.service.ts");

  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(controller, /SUPER_ADMIN/);
  assert.match(controller, /MANAGEMENT/);
  assert.match(controller, /organizationId\(actor\)/);
  assert.match(guard, /authenticatorAssuranceLevel !== "aal2"/);
  assert.match(identity, /identity\.payload\.aal/);
});

test("organization staff administration cannot overwrite global family roles", async () => {
  const service = await read(
    "apps/api/src/admin/admin-organization-access.service.ts",
  );

  assert.match(service, /ORGANIZATION_STAFF_ROLES/);
  assert.match(service, /organizationRoleAssignment\.deleteMany/);
  assert.match(service, /organizationRoleAssignment\.createMany/);
  assert.doesNotMatch(service, /userRoleAssignment/);
  assert.doesNotMatch(service, /"GUARDIAN",\s*"ATHLETE"/);
});
