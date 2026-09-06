import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const {
  OrganizationService,
} = require("../../apps/api/dist/organization/organization.service.js");
const {
  EditorialService,
} = require("../../apps/api/dist/editorial/editorial.service.js");
const {
  AdminOrganizationAccessService,
} = require("../../apps/api/dist/admin/admin-organization-access.service.js");

const KHLIM_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const FOREIGN_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000004";
const ACTOR_USER_ID = "40000000-0000-4000-8000-000000000001";
const TARGET_USER_ID = "40000000-0000-4000-8000-000000000002";
const EDITORIAL_ID = "40000000-0000-4000-8000-000000000003";

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for organization access tests");
  }
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("Organization access tests require a test database");
  }
  return true;
}

function expectStatus(expected) {
  return (error) => {
    assert.equal(error?.getStatus?.(), expected);
    return true;
  };
}

const enabled = databaseTestsEnabled();

test(
  "editorial and staff authority fail closed across organizations",
  {
    skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests",
  },
  async () => {
    const prisma = new PrismaService();
    const organizations = new OrganizationService(prisma);
    const editorial = new EditorialService(prisma);
    const access = new AdminOrganizationAccessService(prisma);
    const client = prisma.client;

    try {
      await client.organization.upsert({
        where: { id: FOREIGN_ORGANIZATION_ID },
        create: {
          id: FOREIGN_ORGANIZATION_ID,
          slug: "synthetic-access-org-004",
          name: "Synthetic Access Organization #004",
        },
        update: { status: "ACTIVE" },
      });

      await client.user.create({
        data: {
          id: ACTOR_USER_ID,
          authProviderSubject: "phase-1b-access-actor",
          email: "phase1b.access.actor@example.test",
          roleAssignments: { create: [{ role: "SUPER_ADMIN" }] },
        },
      });
      await client.user.create({
        data: {
          id: TARGET_USER_ID,
          authProviderSubject: "phase-1b-access-target",
          email: "phase1b.access.target@example.test",
        },
      });

      const legacyActor = {
        id: ACTOR_USER_ID,
        authProviderSubject: "phase-1b-access-actor",
        email: "phase1b.access.actor@example.test",
        preferredLocale: "en",
        roles: ["SUPER_ADMIN"],
        authenticatorAssuranceLevel: "aal2",
      };

      const noScopedAuthority = await organizations.resolveContext(
        legacyActor,
        "khlim-basketball",
      );
      assert.deepEqual(
        noScopedAuthority.roles,
        [],
        "a global legacy staff role must not become organization authority",
      );

      await client.organizationMembership.create({
        data: {
          organizationId: KHLIM_ORGANIZATION_ID,
          userId: ACTOR_USER_ID,
          status: "ACTIVE",
          roleAssignments: { create: [{ role: "SUPER_ADMIN" }] },
        },
      });
      await client.organizationMembership.create({
        data: {
          organizationId: FOREIGN_ORGANIZATION_ID,
          userId: ACTOR_USER_ID,
          status: "ACTIVE",
          roleAssignments: { create: [{ role: "MANAGEMENT" }] },
        },
      });
      await client.organizationMembership.create({
        data: {
          organizationId: FOREIGN_ORGANIZATION_ID,
          userId: TARGET_USER_ID,
          status: "ACTIVE",
          roleAssignments: { create: [{ role: "COACH" }] },
        },
      });

      const khlimActorContext = await organizations.resolveContext(
        legacyActor,
        "khlim-basketball",
      );
      assert.deepEqual(khlimActorContext.roles, ["SUPER_ADMIN"]);

      const foreignActorContext = await organizations.resolveContext(
        legacyActor,
        "synthetic-access-org-004",
      );
      assert.deepEqual(foreignActorContext.roles, ["MANAGEMENT"]);

      const khlimDirectory = await access.listUsers(KHLIM_ORGANIZATION_ID, {});
      assert.equal(
        khlimDirectory.items.some((item) => item.id === TARGET_USER_ID),
        false,
      );
      const foreignDirectory = await access.listUsers(
        FOREIGN_ORGANIZATION_ID,
        {},
      );
      assert.equal(
        foreignDirectory.items.some((item) => item.id === TARGET_USER_ID),
        true,
      );

      const khlimActor = {
        ...legacyActor,
        roles: ["SUPER_ADMIN"],
        organization: {
          id: KHLIM_ORGANIZATION_ID,
          slug: "khlim-basketball",
          name: "KHLIM Basketball",
        },
      };
      await assert.rejects(
        () =>
          access.replaceStaffRoles(
            KHLIM_ORGANIZATION_ID,
            khlimActor,
            TARGET_USER_ID,
            { roles: ["ACADEMY_ADMIN"] },
          ),
        expectStatus(404),
      );
      await assert.rejects(
        () =>
          access.updateMembershipStatus(
            KHLIM_ORGANIZATION_ID,
            khlimActor,
            TARGET_USER_ID,
            { status: "SUSPENDED" },
          ),
        expectStatus(404),
      );

      const foreignActor = {
        ...legacyActor,
        roles: ["MANAGEMENT"],
        organization: {
          id: FOREIGN_ORGANIZATION_ID,
          slug: "synthetic-access-org-004",
          name: "Synthetic Access Organization #004",
        },
      };
      const changedRoles = await access.replaceStaffRoles(
        FOREIGN_ORGANIZATION_ID,
        foreignActor,
        TARGET_USER_ID,
        { roles: ["EVENT_STAFF"] },
      );
      assert.deepEqual(
        changedRoles.map((row) => row.role),
        ["EVENT_STAFF"],
      );

      const changedStatus = await access.updateMembershipStatus(
        FOREIGN_ORGANIZATION_ID,
        foreignActor,
        TARGET_USER_ID,
        { status: "SUSPENDED" },
      );
      assert.equal(changedStatus.status, "SUSPENDED");
      const targetUser = await client.user.findUnique({
        where: { id: TARGET_USER_ID },
      });
      assert.equal(
        targetUser?.status,
        "ACTIVE",
        "organization suspension must not mutate the global human account",
      );

      await client.editorialEntry.create({
        data: {
          id: EDITORIAL_ID,
          organizationId: FOREIGN_ORGANIZATION_ID,
          type: "ACHIEVEMENT",
          title: "Foreign Organization Achievement",
          eventName: "Synthetic Event",
          summary: "Tenant-isolated editorial evidence.",
          yearLabel: "2026",
          photoLabel: "Synthetic approved photo",
          factsVerified: true,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      assert.equal(
        (await editorial.listAdmin(KHLIM_ORGANIZATION_ID)).some(
          (entry) => entry.id === EDITORIAL_ID,
        ),
        false,
      );
      assert.equal(
        (await editorial.listAdmin(FOREIGN_ORGANIZATION_ID)).some(
          (entry) => entry.id === EDITORIAL_ID,
        ),
        true,
      );
      assert.equal(
        (await editorial.listPublished("ACHIEVEMENT")).some(
          (entry) => entry.id === EDITORIAL_ID,
        ),
        false,
        "compatibility public editorial must remain pinned to KHLIM",
      );
      assert.equal(
        (
          await editorial.listPublished("ACHIEVEMENT", FOREIGN_ORGANIZATION_ID)
        ).some((entry) => entry.id === EDITORIAL_ID),
        true,
      );
      await assert.rejects(
        () => editorial.unpublish(KHLIM_ORGANIZATION_ID, EDITORIAL_ID),
        expectStatus(404),
      );
    } finally {
      await prisma.onModuleDestroy();
    }
  },
);
