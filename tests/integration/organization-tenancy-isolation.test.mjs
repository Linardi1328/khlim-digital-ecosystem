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

const KHLIM_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const SYNTHETIC_ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000002";
const TEST_USER_ID = "20000000-0000-4000-8000-000000000001";

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for organization isolation tests",
    );
  }
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("Organization isolation tests require a test database");
  }
  return true;
}

const enabled = databaseTestsEnabled();

test(
  "Organization #002 cannot inherit KHLIM legacy staff authority",
  {
    skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests",
  },
  async () => {
    const prisma = new PrismaService();
    const organizations = new OrganizationService(prisma);
    const client = prisma.client;

    try {
      await client.$executeRaw`
        INSERT INTO organizations (id, slug, name, status)
        VALUES (
          ${SYNTHETIC_ORGANIZATION_ID}::uuid,
          'synthetic-org-002',
          'Synthetic Organization #002',
          'ACTIVE'
        )
        ON CONFLICT (slug) DO UPDATE SET status = 'ACTIVE'
      `;

      await client.user.upsert({
        where: { id: TEST_USER_ID },
        create: {
          id: TEST_USER_ID,
          authProviderSubject: "organization-isolation-staff",
          email: "organization.isolation@example.test",
          roleAssignments: { create: [{ role: "SUPER_ADMIN" }] },
        },
        update: { status: "ACTIVE" },
      });
      await client.userRoleAssignment.upsert({
        where: {
          userId_role: { userId: TEST_USER_ID, role: "SUPER_ADMIN" },
        },
        create: { userId: TEST_USER_ID, role: "SUPER_ADMIN" },
        update: {},
      });

      const legacyUser = {
        id: TEST_USER_ID,
        authProviderSubject: "organization-isolation-staff",
        email: "organization.isolation@example.test",
        preferredLocale: "en",
        roles: ["SUPER_ADMIN"],
        authenticatorAssuranceLevel: "aal2",
      };

      const khlim = await organizations.resolveContext(
        legacyUser,
        "khlim-basketball",
      );
      assert.equal(khlim.id, KHLIM_ORGANIZATION_ID);
      assert.deepEqual(khlim.roles, ["SUPER_ADMIN"]);

      const unassignedOrg2 = await organizations.resolveContext(
        legacyUser,
        "synthetic-org-002",
      );
      assert.deepEqual(
        unassignedOrg2.roles,
        [],
        "legacy KHLIM staff role must not become Organization #002 authority",
      );

      await client.$executeRaw`
        INSERT INTO organization_memberships (organization_id, user_id, status)
        VALUES (${SYNTHETIC_ORGANIZATION_ID}::uuid, ${TEST_USER_ID}::uuid, 'ACTIVE')
        ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'ACTIVE'
      `;
      await client.$executeRaw`
        INSERT INTO organization_role_assignments (organization_membership_id, role)
        SELECT id, 'ACADEMY_ADMIN'
        FROM organization_memberships
        WHERE organization_id = ${SYNTHETIC_ORGANIZATION_ID}::uuid
          AND user_id = ${TEST_USER_ID}::uuid
        ON CONFLICT (organization_membership_id, role) DO NOTHING
      `;

      const assignedOrg2 = await organizations.resolveContext(
        legacyUser,
        "synthetic-org-002",
      );
      assert.deepEqual(assignedOrg2.roles, ["ACADEMY_ADMIN"]);

      const audit = await client.auditEvent.create({
        data: {
          actorUserId: TEST_USER_ID,
          actorEmail: legacyUser.email,
          actorRoles: "SUPER_ADMIN",
          action: "ORGANIZATION_ISOLATION_TEST",
          entityType: "ORGANIZATION",
          entityId: KHLIM_ORGANIZATION_ID,
          summary: "Compatibility audit attribution test",
        },
      });
      const auditRows = await client.$queryRaw`
        SELECT organization_id::text AS organization_id
        FROM audit_events
        WHERE id = ${audit.id}::uuid
      `;
      assert.equal(auditRows[0]?.organization_id, KHLIM_ORGANIZATION_ID);
    } finally {
      await client.$executeRaw`
        DELETE FROM organization_memberships
        WHERE organization_id = ${SYNTHETIC_ORGANIZATION_ID}::uuid
          AND user_id = ${TEST_USER_ID}::uuid
      `.catch(() => undefined);
      await client.$executeRaw`
        DELETE FROM organizations
        WHERE id = ${SYNTHETIC_ORGANIZATION_ID}::uuid
      `.catch(() => undefined);
      await client.user
        .delete({ where: { id: TEST_USER_ID } })
        .catch(() => undefined);
      await prisma.onModuleDestroy();
    }
  },
);
