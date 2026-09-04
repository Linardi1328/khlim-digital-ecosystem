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
  AcademyService,
} = require("../../apps/api/dist/academy/academy.service.js");
const {
  SchedulingService,
} = require("../../apps/api/dist/scheduling/scheduling.service.js");
const {
  NotificationsService,
} = require("../../apps/api/dist/notifications/notifications.service.js");

const KHLIM_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const SYNTHETIC_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000002";
const TEST_USER_ID = "20000000-0000-4000-8000-000000000001";
const FOREIGN_VENUE_ID = "20000000-0000-4000-8000-000000000010";
const FOREIGN_SESSION_ID = "20000000-0000-4000-8000-000000000011";
const FOREIGN_NOTIFICATION_ID = "20000000-0000-4000-8000-000000000012";
const FOREIGN_RECEIPT_ID = "20000000-0000-4000-8000-000000000013";

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

function expectNotFound(error) {
  assert.equal(error?.getStatus?.(), 404);
  return true;
}

const enabled = databaseTestsEnabled();

test(
  "Organization #002 cannot inherit KHLIM legacy staff authority or operational data",
  {
    skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests",
  },
  async () => {
    const prisma = new PrismaService();
    const organizations = new OrganizationService(prisma);
    const academy = new AcademyService(prisma);
    const scheduling = new SchedulingService(prisma);
    const notifications = new NotificationsService(prisma);
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

      await client.venue.create({
        data: {
          id: FOREIGN_VENUE_ID,
          organizationId: SYNTHETIC_ORGANIZATION_ID,
          name: "Organization #002 Venue",
        },
      });
      await assert.rejects(
        () =>
          academy.createCourt(KHLIM_ORGANIZATION_ID, FOREIGN_VENUE_ID, {
            name: "Cross-tenant court",
          }),
        expectNotFound,
      );

      await client.trainingSession.create({
        data: {
          id: FOREIGN_SESSION_ID,
          organizationId: SYNTHETIC_ORGANIZATION_ID,
          title: "Organization #002 Session",
          startsAt: new Date("2026-10-01T10:00:00.000Z"),
          endsAt: new Date("2026-10-01T11:00:00.000Z"),
          venueName: "Organization #002 Venue",
        },
      });
      assert.equal(
        (await scheduling.listAdminSessions(KHLIM_ORGANIZATION_ID)).some(
          (session) => session.id === FOREIGN_SESSION_ID,
        ),
        false,
      );
      assert.equal(
        (await scheduling.listAdminSessions(SYNTHETIC_ORGANIZATION_ID)).some(
          (session) => session.id === FOREIGN_SESSION_ID,
        ),
        true,
      );
      await assert.rejects(
        () =>
          scheduling.completeSession(KHLIM_ORGANIZATION_ID, FOREIGN_SESSION_ID),
        expectNotFound,
      );

      await client.notification.create({
        data: {
          id: FOREIGN_NOTIFICATION_ID,
          organizationId: SYNTHETIC_ORGANIZATION_ID,
          title: "Organization #002 Notification",
          body: "Synthetic isolation notification",
          receipts: {
            create: {
              id: FOREIGN_RECEIPT_ID,
              userId: TEST_USER_ID,
            },
          },
        },
      });
      assert.equal(
        (
          await notifications.listMine(KHLIM_ORGANIZATION_ID, TEST_USER_ID)
        ).some((receipt) => receipt.id === FOREIGN_RECEIPT_ID),
        false,
      );
      assert.equal(
        (
          await notifications.listMine(SYNTHETIC_ORGANIZATION_ID, TEST_USER_ID)
        ).some((receipt) => receipt.id === FOREIGN_RECEIPT_ID),
        true,
      );
      await assert.rejects(
        () =>
          notifications.markRead(
            KHLIM_ORGANIZATION_ID,
            FOREIGN_RECEIPT_ID,
            TEST_USER_ID,
          ),
        expectNotFound,
      );

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
      await client.notification
        .delete({ where: { id: FOREIGN_NOTIFICATION_ID } })
        .catch(() => undefined);
      await client.trainingSession
        .delete({ where: { id: FOREIGN_SESSION_ID } })
        .catch(() => undefined);
      await client.venue
        .delete({ where: { id: FOREIGN_VENUE_ID } })
        .catch(() => undefined);
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
