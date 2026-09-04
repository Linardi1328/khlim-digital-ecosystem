import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function modelBlock(schema, name) {
  const match = schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `${name} model is required`);
  return match[0];
}

test("Phase 1B registers the organization kernel in Prisma", async () => {
  const schema = await read("prisma/schema.prisma");

  for (const model of [
    "Organization",
    "OrganizationMembership",
    "OrganizationRoleAssignment",
    "OrganizationSetting",
    "OrganizationBranding",
    "OrganizationSport",
  ]) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }

  assert.match(modelBlock(schema, "AuditEvent"), /organizationId\s+String\?/);
  assert.match(
    modelBlock(schema, "User"),
    /organizationMemberships\s+OrganizationMembership\[\]/,
  );
  assert.match(
    modelBlock(schema, "Sport"),
    /organizations\s+OrganizationSport\[\]/,
  );
});

test("Phase 1B gives Academy aggregate roots direct organization ownership", async () => {
  const schema = await read("prisma/schema.prisma");

  for (const model of [
    "Venue",
    "Programme",
    "ProgrammeOffering",
    "MembershipPlan",
    "Membership",
  ]) {
    const block = modelBlock(schema, model);
    assert.match(block, /organizationId\s+String\s+@map\("organization_id"\)/);
    assert.match(block, /organization\s+Organization\s+@relation/);
  }

  const programme = modelBlock(schema, "Programme");
  assert.doesNotMatch(programme, /code\s+String\s+@unique/);
  assert.match(programme, /@@unique\(\[organizationId, code\]\)/);
});

test("Phase 1B migration backfills Organization #001 and tenant-aware indexes", async () => {
  const migration = await read(
    "prisma/migrations/20260904215000_phase_1b_academy_ownership/migration.sql",
  );

  for (const table of [
    "venues",
    "programmes",
    "programme_offerings",
    "membership_plans",
    "memberships",
  ]) {
    assert.match(
      migration,
      new RegExp(`ALTER TABLE "${table}" ADD COLUMN "organization_id" UUID`),
    );
    assert.match(
      migration,
      new RegExp(
        `ALTER TABLE "${table}"[\\s\\S]*?"organization_id" SET NOT NULL`,
      ),
    );
  }

  assert.match(migration, /00000000-0000-4000-8000-000000000001/);
  assert.match(migration, /DROP INDEX "programmes_code_key"/);
  assert.match(migration, /programmes_organization_id_code_key/);
});

test("Phase 1B gives scheduling and notification roots direct organization ownership", async () => {
  const schema = await read("prisma/schema.prisma");
  const migration = await read(
    "prisma/migrations/20260904224000_phase_1b_operations_ownership/migration.sql",
  );

  for (const model of ["TrainingSession", "Notification"]) {
    const block = modelBlock(schema, model);
    assert.match(block, /organizationId\s+String\s+@map\("organization_id"\)/);
    assert.match(block, /organization\s+Organization\s+@relation/);
  }

  for (const table of ["training_sessions", "notifications"]) {
    assert.match(
      migration,
      new RegExp(`ALTER TABLE "${table}" ADD COLUMN "organization_id" UUID`),
    );
    assert.match(
      migration,
      new RegExp(
        `ALTER TABLE "${table}"[\\s\\S]*?"organization_id" SET NOT NULL`,
      ),
    );
  }

  assert.match(
    migration,
    /training_sessions_organization_id_starts_at_status_idx/,
  );
  assert.match(migration, /notifications_organization_id_type_created_at_idx/);
});

test("Academy reads and writes are scoped by active organization", async () => {
  const service = await read("apps/api/src/academy/academy.service.ts");
  const adminController = await read(
    "apps/api/src/academy/academy-admin.controller.ts",
  );
  const memberController = await read(
    "apps/api/src/academy/academy.controller.ts",
  );

  assert.match(service, /DEFAULT_ORGANIZATION_ID/);
  assert.match(service, /data: \{ organizationId, name, address \}/);
  assert.match(service, /where: \{ id: venueId, organizationId \}/);
  assert.match(service, /where: \{ id: programmeId, organizationId \}/);
  assert.match(service, /where: \{ id: offeringId, organizationId \}/);
  assert.match(service, /where: \{ organizationId, athleteId \}/);
  assert.match(service, /AND organization_id = \$\{organizationId\}::uuid/);
  assert.match(service, /organizationId,\n\s+athleteId,/);

  assert.match(adminController, /organizationId\(user\)/);
  assert.match(memberController, /organizationId\(user\)/);
});

test("Scheduling and notifications fail closed on organization-owned data", async () => {
  const scheduling = await read(
    "apps/api/src/scheduling/scheduling.service.ts",
  );
  const schedulingController = await read(
    "apps/api/src/scheduling/scheduling.controller.ts",
  );
  const notifications = await read(
    "apps/api/src/notifications/notifications.service.ts",
  );
  const notificationsController = await read(
    "apps/api/src/notifications/notifications.controller.ts",
  );

  assert.match(scheduling, /where: \{ organizationId \}/);
  assert.match(scheduling, /where: \{ id, organizationId \}/);
  assert.match(
    scheduling,
    /where: \{ id: programmeOfferingId, organizationId \}/,
  );
  assert.match(scheduling, /organizationId,\n\s+programmeOfferingId:/);
  assert.match(schedulingController, /organizationId\(user\)/);

  assert.match(notifications, /where: \{ organizationId \}/);
  assert.match(notifications, /notification: \{ organizationId \}/);
  assert.match(
    notifications,
    /where: \{ id: programmeOfferingId, organizationId \}/,
  );
  assert.match(notifications, /organizationMembership\.findFirst/);
  assert.match(notificationsController, /organizationId\(user\)/);
});

test("Phase 1B compatibility fallback is bounded to runtime-disabled Organization #001", async () => {
  const prismaService = await read("apps/api/src/database/prisma.service.ts");

  assert.match(prismaService, /COMPATIBILITY_TENANT_MODELS/);
  assert.match(prismaService, /"trainingsession"/);
  assert.match(prismaService, /"notification"/);
  assert.match(prismaService, /DEFAULT_ORGANIZATION_ID/);
  assert.match(
    prismaService,
    /if \(MULTI_ORGANIZATION_RUNTIME_ENABLED\) return client;/,
  );
  assert.match(
    prismaService,
    /mutableRecord\.organizationId = DEFAULT_ORGANIZATION_ID/,
  );
});

test("Phase 1B does not enable external multi-organization runtime", async () => {
  const environment = await read(".env.example");
  assert.match(environment, /KHLIM_MULTI_ORGANIZATION_ENABLED=false/);
});
