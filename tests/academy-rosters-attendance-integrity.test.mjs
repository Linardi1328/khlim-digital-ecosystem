import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { createRequire } from "node:module";

// Nest's Reflect metadata dependency belongs to the API workspace, not root.
const requireFromApi = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
requireFromApi("reflect-metadata");
const { SchedulingService } =
  await import("../apps/api/dist/scheduling/scheduling.service.js");
const { SchedulingController } =
  await import("../apps/api/dist/scheduling/scheduling.controller.js");
const { AdminOperationsDataService } =
  await import("../apps/api/dist/admin/admin-operations-data.service.js");
const { AdminOperationsDataController } =
  await import("../apps/api/dist/admin/admin-operations-data.controller.js");
const { MFA_REQUIRED_KEY, REQUIRED_ROLES_KEY } =
  await import("../apps/api/dist/auth/auth.constants.js");

const ORG = "00000000-0000-4000-8000-000000000001";
const OFFERING = "00000000-0000-4000-8000-000000000002";
const SESSION = "00000000-0000-4000-8000-000000000003";
const ATHLETE = "00000000-0000-4000-8000-000000000004";

function service(overrides = {}) {
  const records = [];
  const session = {
    id: SESSION,
    organizationId: ORG,
    programmeOfferingId: OFFERING,
    status: "SCHEDULED",
  };
  const prisma = {
    client: {
      trainingSession: {
        findFirst: async ({ where }) => {
          records.push(["sessionLookup", where]);
          return session;
        },
      },
      membership: {
        findMany: async ({ where }) => {
          records.push(["membershipRoster", where]);
          return [
            {
              athleteId: ATHLETE,
              athlete: { displayName: "Registered Player" },
            },
          ];
        },
        findFirst: async ({ where }) => {
          records.push(["membershipValidation", where]);
          return { athlete: { displayName: "Registered Player" } };
        },
      },
      attendanceRecord: {
        findMany: async () => [],
        upsert: async (query) => {
          records.push(["attendanceWrite", query]);
          return query.create;
        },
      },
    },
  };
  Object.assign(prisma.client, overrides);
  prisma.client.$transaction = async (callback) =>
    callback({
      ...prisma.client,
      $queryRaw: async (fragments, ...params) => {
        records.push(["sessionLock", { sql: fragments.join("?"), params }]);
        return session.organizationId === ORG ? [{ id: SESSION }] : [];
      },
    });
  return { sut: new SchedulingService(prisma), records, prisma, session };
}

test("session roster defaults active members to UNMARKED", async () => {
  const { sut, records } = service();
  const roster = await sut.listSessionRoster(ORG, SESSION);
  assert.equal(roster.sessionId, SESSION);
  assert.equal(roster.players.length, 1);
  assert.equal(roster.players[0].athleteId, ATHLETE);
  assert.equal(roster.players[0].attendanceStatus, "UNMARKED");
  assert.deepEqual(records[0][1], { id: SESSION, organizationId: ORG });
  assert.equal(records[1][1].organizationId, ORG);
  assert.equal(records[1][1].programmeOfferingId, OFFERING);
  assert.equal(records[1][1].status, "ACTIVE");
});

test("attendance rejects forged or non-member athletes", async () => {
  const { sut, prisma } = service();
  await assert.rejects(
    sut.markAttendance(ORG, SESSION, {
      athleteId: "",
      athleteName: "Forged Name",
      status: "PRESENT",
    }),
    /valid enrolled athlete ID/,
  );
  prisma.client.membership.findFirst = async () => null;
  await assert.rejects(
    sut.markAttendance(ORG, SESSION, { athleteId: ATHLETE, status: "PRESENT" }),
    /does not hold an active membership/,
  );
});

test("attendance uses canonical server name, not submitted text", async () => {
  const { sut, records } = service();
  const result = await sut.markAttendance(ORG, SESSION, {
    athleteId: ATHLETE,
    athleteName: "Forged Guardian Input",
    status: "LATE",
    notes: "Transport delay",
  });
  assert.equal(result.athleteName, "Registered Player");
  assert.equal(result.status, "LATE");
  assert.equal(result.notes, "Transport delay");
  assert.deepEqual(
    records.slice(0, 3).map(([name]) => name),
    ["sessionLock", "sessionLookup", "membershipValidation"],
  );
  assert.match(records[0][1].sql, /FOR UPDATE/);
  assert.match(records[0][1].sql, /organization_id/);
  assert.deepEqual(records[0][1].params, [SESSION, ORG]);
  const membershipQuery = records.find(
    ([name]) => name === "membershipValidation",
  )[1];
  const attendanceQuery = records.find(
    ([name]) => name === "attendanceWrite",
  )[1];
  assert.equal(membershipQuery.status, "ACTIVE");
  assert.equal(attendanceQuery.create.athleteName, "Registered Player");
});

test("cancelled sessions cannot record attendance", async () => {
  const { sut, session } = service();
  session.status = "CANCELLED";
  await assert.rejects(
    sut.markAttendance(ORG, SESSION, { athleteId: ATHLETE, status: "PRESENT" }),
    /active, offering-linked session/,
  );
});

test("offering roster is tenant-scoped and omits guardian PII", async () => {
  const calls = [];
  const prisma = {
    client: {
      programmeOffering: {
        findFirst: async ({ where }) => {
          calls.push(["offering", where]);
          return { id: OFFERING, name: "U12", capacity: 20 };
        },
      },
      membership: {
        findMany: async (args) => {
          calls.push(["members", args]);
          return [
            {
              id: "membership-1",
              status: "ACTIVE",
              athleteId: ATHLETE,
              athlete: { displayName: "Registered Player" },
              membershipPlan: { name: "Monthly" },
            },
          ];
        },
      },
    },
  };
  const sut = new AdminOperationsDataService(prisma);
  const roster = await sut.getOfferingRoster(ORG, OFFERING);
  assert.deepEqual(calls[0][1], { id: OFFERING, organizationId: ORG });
  assert.equal(calls[1][1].where.organizationId, ORG);
  assert.equal(calls[1][1].take, 201);
  assert.equal(roster.members.length, 1);
  assert.equal(roster.members[0].athleteName, "Registered Player");
  assert.equal("guardianEmail" in roster.members[0], false);
  assert.equal("dateOfBirth" in roster.members[0], false);
});

test("roster and attendance endpoints require MFA", () => {
  for (const method of ["roster", "attendance", "markAttendance"]) {
    assert.equal(
      Reflect.getMetadata(
        MFA_REQUIRED_KEY,
        SchedulingController.prototype[method],
      ),
      true,
      method,
    );
  }
  assert.equal(
    Reflect.getMetadata(MFA_REQUIRED_KEY, AdminOperationsDataController),
    true,
  );
});

test("sensitive roster and attendance routes exclude coaches and event staff", () => {
  const approved = ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"];
  for (const method of ["roster", "attendance", "markAttendance"]) {
    const roles = Reflect.getMetadata(
      REQUIRED_ROLES_KEY,
      SchedulingController.prototype[method],
    );
    assert.deepEqual(roles, approved, method);
    assert.equal(roles.includes("COACH"), false, method);
    assert.equal(roles.includes("EVENT_STAFF"), false, method);
  }
  assert.deepEqual(
    Reflect.getMetadata(
      REQUIRED_ROLES_KEY,
      AdminOperationsDataController.prototype.getOfferingRoster,
    ),
    approved,
  );
});

test("malformed attendance payloads fail with HTTP 400 validation errors", async () => {
  const { sut } = service();
  for (const payload of [
    { athleteId: 123, status: "PRESENT" },
    { athleteId: ATHLETE, status: "PRESENT", notes: 5 },
    null,
  ]) {
    await assert.rejects(
      sut.markAttendance(ORG, SESSION, payload),
      (error) => error?.status === 400,
    );
  }
});

test("attendance rejects a session cancelled before its lock", async () => {
  const { sut, prisma, session, records } = service();
  const originalTransaction = prisma.client.$transaction;
  prisma.client.$transaction = (callback) =>
    originalTransaction(async (transaction) => {
      transaction.$queryRaw = async () => {
        session.status = "CANCELLED";
        records.push(["sessionLock", { cancelledBeforeLock: true }]);
        return [{ id: SESSION }];
      };
      return callback(transaction);
    });
  await assert.rejects(
    sut.markAttendance(ORG, SESSION, { athleteId: ATHLETE, status: "PRESENT" }),
    /active, offering-linked session/,
  );
  assert.equal(records.some(([name]) => name === "attendanceWrite"), false);
});

test("attendance rejects a foreign-tenant session before writes", async () => {
  const { sut, prisma, records } = service();
  const originalTransaction = prisma.client.$transaction;
  prisma.client.$transaction = (callback) =>
    originalTransaction(async (transaction) => {
      transaction.$queryRaw = async () => [];
      return callback(transaction);
    });
  await assert.rejects(
    sut.markAttendance(ORG, SESSION, { athleteId: ATHLETE, status: "PRESENT" }),
    /Training session not found/,
  );
  assert.equal(records.some(([name]) => name === "attendanceWrite"), false);
});

test("temporary Prettier diagnosis", () => {
  const filename = "tests/academy-rosters-attendance-integrity.test.mjs";
  const source = readFileSync(filename, "utf8");
  const result = spawnSync(
    "pnpm",
    ["exec", "prettier", "--stdin-filepath", filename],
    { input: source, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  const expected = result.stdout.split("\n");
  const actual = source.split("\n");
  let first = 0;
  while (first < actual.length && actual[first] === expected[first]) first++;
  console.log("PRETTIER_DIAGNOSIS", JSON.stringify({
    first,
    actual: actual.slice(Math.max(0, first - 4), first + 12),
    expected: expected.slice(Math.max(0, first - 4), first + 12),
  }));
});
