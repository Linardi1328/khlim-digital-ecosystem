import assert from "node:assert/strict";
import { test } from "node:test";
import "reflect-metadata";
import { AdminService } from "../apps/api/dist/admin/admin.service.js";
import { AdminAccessController } from "../apps/api/dist/admin/admin-access.controller.js";
import { MFA_REQUIRED_KEY, REQUIRED_ROLES_KEY } from "../apps/api/dist/auth/auth.constants.js";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
function actor(roles, organizationId = ORG_ID) {
  return {
    id: "staff-user",
    roles,
    organization: organizationId ? { id: organizationId } : null,
    authenticatorAssuranceLevel: "aal2",
  };
}

test("Admin overview aggregates active/pending memberships in one grouped query", async () => {
  const calls = [];
  const prisma = {
    client: {
      membership: {
        groupBy: async (query) => {
          calls.push(query);
          return [
            { status: "ACTIVE", _count: { _all: 12 } },
            { status: "PENDING", _count: { _all: 3 } },
          ];
        },
        count: () => {
          throw new Error("separate membership counts must not be used");
        },
      },
      athleteProfile: { count: async () => 9 },
      programmeOffering: {
        findMany: async () => [
          { capacity: 20, _count: { memberships: 8 } },
          { capacity: 10, _count: { memberships: 4 } },
        ],
      },
      payment: {
        count: () => {
          throw new Error("Academy staff must not access finance counts");
        },
      },
    },
  };
  const result = await new AdminService(prisma).getOverview(actor(["ACADEMY_ADMIN"]));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].by, ["status"]);
  assert.deepEqual(calls[0].where, {
    organizationId: ORG_ID,
    status: { in: ["ACTIVE", "PENDING"] },
  });
  assert.equal(result.activeMembers, 12);
  assert.equal(result.pendingMemberships, 3);
  assert.equal(result.totalAthletes, 9);
  assert.equal(result.openOfferings, 2);
  assert.equal(result.capacityUtilisationRate, 40);
  assert.equal(result.paymentsAttentionCount, null);
});

test("dashboard snapshot returns overview and one lead summary for authorized staff", async () => {
  const requested = [];
  const overview = { activeMembers: 12, paymentsAttentionCount: null };
  const summary = { newLeads: 4, needsFollowUp: 6, total: 10 };
  const controller = new AdminAccessController(
    { getOverview: async () => overview },
    {},
    { getAdminLeadSummary: async (organizationId) => {
      requested.push(organizationId);
      return summary;
    } },
  );
  const result = await controller.getDashboardSnapshot(actor(["ACADEMY_ADMIN"]));
  assert.deepEqual(result, { overview, leadSummary: summary });
  assert.deepEqual(requested, [ORG_ID]);
});

test("dashboard snapshot never loads lead data for roles lacking lead access", async () => {
  const controller = new AdminAccessController(
    { getOverview: async () => ({ activeMembers: 2 }) },
    {},
    { getAdminLeadSummary: () => {
      throw new Error("Unauthorized lead data was queried");
    } },
  );
  const result = await controller.getDashboardSnapshot(actor(["EVENT_STAFF"]));
  assert.equal(result.overview.activeMembers, 2);
  assert.equal(result.leadSummary, null);
});

test("dashboard snapshot requires organization context for lead-authorized roles", async () => {
  const controller = new AdminAccessController(
    { getOverview: () => {
      throw new Error("Should reject before querying");
    } },
    {},
    { getAdminLeadSummary: () => {
      throw new Error("Should reject before querying");
    } },
  );
  await assert.rejects(
    () => controller.getDashboardSnapshot(actor(["ACADEMY_ADMIN"], null)),
    /Organization context is required/,
  );
});

test("dashboard snapshot retains server-side MFA and staff-role guards", () => {
  const handler = AdminAccessController.prototype.getDashboardSnapshot;
  assert.equal(Reflect.getMetadata(MFA_REQUIRED_KEY, handler), true);
  const required = Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminAccessController);
  assert.ok(required.includes("ACADEMY_ADMIN"));
  assert.ok(required.includes("EVENT_STAFF"));
});
