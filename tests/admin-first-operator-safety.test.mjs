import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  AdminOrganizationAccessService,
} = require("../apps/api/dist/admin/admin-organization-access.service.js");

const ORG = "00000000-0000-4000-8000-000000000001";
const ACTOR = "00000000-0000-4000-8000-000000000010";
const TARGET = "00000000-0000-4000-8000-000000000011";

function fixture({
  actorRoles = ["SUPER_ADMIN"],
  targetRoles = ["SUPER_ADMIN"],
  actorStatus = "ACTIVE",
  targetStatus = "ACTIVE",
  otherActiveSuperAdmin = true,
  targetExists = true,
  preReadTargetRoles = targetRoles,
  preReadTargetExists = targetExists,
  organizationLockPresent = true,
} = {}) {
  const log = [];
  const actor = {
    id: ACTOR,
    email: "operator@example.test",
    roles: ["SUPER_ADMIN"],
    authenticatorAssuranceLevel: "aal2",
  };
  const user = (userId, live) => {
    if (userId === ACTOR) {
      return {
        id: "actor-membership",
        status: actorStatus,
        roleAssignments: actorRoles.map((role) => ({ role })),
        user: { email: actor.email },
      };
    }
    if (userId === TARGET && (live ? targetExists : preReadTargetExists)) {
      return {
        id: "target-membership",
        status: targetStatus,
        roleAssignments: (live ? targetRoles : preReadTargetRoles).map(
          (role) => ({ role }),
        ),
        user: { email: "target@example.test" },
      };
    }
    return null;
  };
  const member = {
    findUnique: async ({ where }) => {
      log.push(["membershipLookup", where]);
      return where.organizationId_userId.organizationId === ORG
        ? user(
            where.organizationId_userId.userId,
            log.some(([name]) => name === "organizationLock"),
          )
        : null;
    },
    findFirst: async ({ where }) => {
      log.push(["otherAdminQuery", where]);
      if (
        where.organizationId !== ORG ||
        where.status !== "ACTIVE" ||
        where.userId.not !== TARGET ||
        where.roleAssignments.some.role !== "SUPER_ADMIN"
      ) {
        return null;
      }
      return otherActiveSuperAdmin ? { id: "another-active-admin" } : null;
    },
    update: async ({ where, data }) => {
      log.push(["statusWrite", { where, data }]);
      return { userId: TARGET, status: data.status, updatedAt: new Date() };
    },
  };
  const tx = {
    $queryRaw: async (literals, ...params) => {
      log.push(["organizationLock", { query: literals.join("?"), params }]);
      return organizationLockPresent && params[0] === ORG ? [{ id: ORG }] : [];
    },
    organizationMembership: member,
    organizationRoleAssignment: {
      deleteMany: async (args) => {
        log.push(["roleDelete", args]);
      },
      createMany: async (args) => {
        log.push(["roleCreate", args]);
      },
      findMany: async () => targetRoles.map((role) => ({ role })),
    },
    auditEvent: {
      create: async (args) => {
        log.push(["auditWrite", args]);
      },
    },
  };
  const client = {
    organizationMembership: member,
    $transaction: async (fn) => {
      log.push(["transactionStart"]);
      return fn(tx);
    },
  };
  return {
    sut: new AdminOrganizationAccessService({ client }),
    actor,
    log,
  };
}

const noWrites = (log) => {
  assert.equal(
    log.some(([name]) =>
      ["roleDelete", "roleCreate", "statusWrite", "auditWrite"].includes(name),
    ),
    false,
  );
};

test("role changes fail closed if actor lost live staff authority", async () => {
  const { sut, actor, log } = fixture({ actorRoles: ["GUARDIAN"] });
  await assert.rejects(
    sut.replaceStaffRoles(ORG, actor, TARGET, { roles: ["ACADEMY_ADMIN"] }),
    /Staff permissions have changed/,
  );
  assert.ok(log.some(([name]) => name === "organizationLock"));
  noWrites(log);
});

test("role changes fail closed for suspended actor despite stale JWT role", async () => {
  const { sut, actor, log } = fixture({ actorStatus: "SUSPENDED" });
  await assert.rejects(
    sut.replaceStaffRoles(ORG, actor, TARGET, { roles: ["ACADEMY_ADMIN"] }),
    /Staff permissions have changed/,
  );
  noWrites(log);
});

// These mocked branches directly exercise the no-backup guard. The
// database-backed reciprocal-admin regression verifies the real invariant.
test("last active Super Admin cannot be stripped of that role", async () => {
  const { sut, actor, log } = fixture({ otherActiveSuperAdmin: false });
  await assert.rejects(
    sut.replaceStaffRoles(ORG, actor, TARGET, { roles: ["ACADEMY_ADMIN"] }),
    /last active Super Admin/,
  );
  const query = log.find(([name]) => name === "otherAdminQuery")[1];
  assert.equal(query.organizationId, ORG);
  assert.equal(query.userId.not, TARGET);
  assert.equal(query.status, "ACTIVE");
  noWrites(log);
});

test("last active Super Admin cannot be suspended", async () => {
  const { sut, actor, log } = fixture({ otherActiveSuperAdmin: false });
  await assert.rejects(
    sut.updateMembershipStatus(ORG, actor, TARGET, { status: "SUSPENDED" }),
    /last active Super Admin/,
  );
  noWrites(log);
});

test("Super Admin can demote another administrator when active backup exists", async () => {
  const { sut, actor, log } = fixture();
  await sut.replaceStaffRoles(ORG, actor, TARGET, { roles: ["ACADEMY_ADMIN"] });
  assert.ok(log.find(([name]) => name === "roleDelete"));
  assert.ok(log.find(([name]) => name === "roleCreate"));
  assert.ok(log.find(([name]) => name === "auditWrite"));
  assert.ok(log.find(([name]) => name === "otherAdminQuery"));
  const lock = log.find(([name]) => name === "organizationLock")[1];
  assert.match(lock.query, /FOR NO KEY UPDATE/);
  assert.deepEqual(lock.params, [ORG]);
  const start = log.findIndex(([name]) => name === "transactionStart");
  const lockIndex = log.findIndex(([name]) => name === "organizationLock");
  const liveMembershipLookup = log.findIndex(
    ([name], index) => index > lockIndex && name === "membershipLookup",
  );
  assert.ok(start < lockIndex && lockIndex < liveMembershipLookup);
});

test("Super Admin can suspend another admin only with active backup", async () => {
  const { sut, actor, log } = fixture();
  await sut.updateMembershipStatus(ORG, actor, TARGET, { status: "SUSPENDED" });
  assert.ok(log.find(([name]) => name === "statusWrite"));
  assert.ok(log.find(([name]) => name === "auditWrite"));
});

test("current-management-only actor cannot grant SUPER_ADMIN despite stale role claim", async () => {
  const { sut, actor, log } = fixture({
    actorRoles: ["MANAGEMENT"],
    targetRoles: ["ACADEMY_ADMIN"],
  });
  await assert.rejects(
    sut.replaceStaffRoles(ORG, actor, TARGET, {
      roles: ["ACADEMY_ADMIN", "SUPER_ADMIN"],
    }),
    /Only a Super Admin can assign Super Admin/,
  );
  noWrites(log);
});

test("no self-promotion or self-suspension", async () => {
  const { sut, actor, log } = fixture();
  await assert.rejects(
    sut.replaceStaffRoles(ORG, actor, ACTOR, { roles: ["SUPER_ADMIN"] }),
    /cannot change their own roles/,
  );
  await assert.rejects(
    sut.updateMembershipStatus(ORG, actor, ACTOR, { status: "SUSPENDED" }),
    /cannot change their own organization access status/,
  );
  noWrites(log);
});

test("missing organization member is not silently created or promoted", async () => {
  const { sut, actor, log } = fixture({ targetExists: false });
  await assert.rejects(
    sut.replaceStaffRoles(ORG, actor, TARGET, { roles: ["SUPER_ADMIN"] }),
    /Organization member not found/,
  );
  noWrites(log);
});

test("a target promoted after initial lookup is protected by live roles", async () => {
  const options = {
    actorRoles: ["MANAGEMENT"],
    preReadTargetRoles: ["ACADEMY_ADMIN"],
    targetRoles: ["SUPER_ADMIN"],
  };
  const roleCase = fixture(options);
  await assert.rejects(
    roleCase.sut.replaceStaffRoles(ORG, roleCase.actor, TARGET, {
      roles: ["COACH"],
    }),
    /Only a Super Admin can modify a Super Admin/,
  );
  noWrites(roleCase.log);

  const statusCase = fixture(options);
  await assert.rejects(
    statusCase.sut.updateMembershipStatus(ORG, statusCase.actor, TARGET, {
      status: "SUSPENDED",
    }),
    /Only a Super Admin can modify a Super Admin/,
  );
  noWrites(statusCase.log);
});

test("target deletion after pre-read fails closed in both mutations", async () => {
  const options = {
    preReadTargetExists: true,
    targetExists: false,
  };
  const roleCase = fixture(options);
  await assert.rejects(
    roleCase.sut.replaceStaffRoles(ORG, roleCase.actor, TARGET, {
      roles: ["COACH"],
    }),
    /Organization member not found/,
  );
  noWrites(roleCase.log);

  const statusCase = fixture(options);
  await assert.rejects(
    statusCase.sut.updateMembershipStatus(ORG, statusCase.actor, TARGET, {
      status: "SUSPENDED",
    }),
    /Organization member not found/,
  );
  noWrites(statusCase.log);
});

test("missing organization lock denies role and status changes", async () => {
  const { sut, actor, log } = fixture({ organizationLockPresent: false });
  await assert.rejects(
    sut.replaceStaffRoles(ORG, actor, TARGET, { roles: ["COACH"] }),
    /Organization access is unavailable/,
  );
  await assert.rejects(
    sut.updateMembershipStatus(ORG, actor, TARGET, { status: "SUSPENDED" }),
    /Organization access is unavailable/,
  );
  noWrites(log);
});

test("status update fails closed for revoked actor permissions", async () => {
  const { sut, actor, log } = fixture({ actorStatus: "SUSPENDED" });
  await assert.rejects(
    sut.updateMembershipStatus(ORG, actor, TARGET, { status: "SUSPENDED" }),
    /Staff permissions have changed/,
  );
  noWrites(log);
});

test("role and status audit record live rather than stale JWT roles", async () => {
  const { sut, actor, log } = fixture({
    actorRoles: ["MANAGEMENT"],
    targetRoles: ["ACADEMY_ADMIN"],
  });
  await sut.replaceStaffRoles(ORG, actor, TARGET, { roles: ["COACH"] });
  await sut.updateMembershipStatus(ORG, actor, TARGET, { status: "SUSPENDED" });
  const events = log.filter(([name]) => name === "auditWrite");
  assert.equal(events.length, 2);
  for (const [, event] of events) {
    assert.equal(event.data.actorRoles, "MANAGEMENT");
  }
});
