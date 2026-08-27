import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import { makeAuthenticatedUser } from "../../packages/testing/src/pre-alpha-fixtures.mjs";

const require = createRequire(import.meta.url);

const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const { AcademyService } = require("../../apps/api/dist/academy/academy.service.js");
const {
  FamilyAccessService,
} = require("../../apps/api/dist/family/family-access.service.js");

const IDS = Object.freeze({
  guardianUser: "33333333-3333-4333-8333-333333333333",
  unrelatedGuardianUser: "66666666-6666-4666-8666-666666666666",
  athleteA: "11111111-1111-4111-8111-111111111111",
  athleteB: "22222222-2222-4222-8222-222222222222",
  sport: "77777777-7777-4777-8777-777777777777",
  programme: "88888888-8888-4888-8888-888888888888",
  offering: "99999999-9999-4999-8999-999999999999",
  plan: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
});

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for persistence integrity tests");
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      "Persistence integrity tests require a database whose name contains 'test'",
    );
  }

  return true;
}

function expectHttpError(status, messagePattern) {
  return (error) => {
    assert.equal(error?.getStatus?.(), status);
    if (messagePattern) assert.match(error.message, messagePattern);
    return true;
  };
}

async function cleanup(client) {
  await client.membership.deleteMany({
    where: { programmeOfferingId: IDS.offering },
  });
  await client.membershipPlanOfferingEligibility.deleteMany({
    where: { offeringId: IDS.offering },
  });
  await client.guardianAthleteLink.deleteMany({
    where: {
      OR: [
        { guardianUserId: IDS.guardianUser },
        { guardianUserId: IDS.unrelatedGuardianUser },
        { athleteId: { in: [IDS.athleteA, IDS.athleteB] } },
      ],
    },
  });
  await client.athleteProfile.deleteMany({
    where: { id: { in: [IDS.athleteA, IDS.athleteB] } },
  });
  await client.programmeOffering.deleteMany({ where: { id: IDS.offering } });
  await client.membershipPlan.deleteMany({ where: { id: IDS.plan } });
  await client.programme.deleteMany({ where: { id: IDS.programme } });
  await client.sport.deleteMany({ where: { id: IDS.sport } });
  await client.user.deleteMany({
    where: { id: { in: [IDS.guardianUser, IDS.unrelatedGuardianUser] } },
  });
}

async function seed(client) {
  await client.user.createMany({
    data: [
      {
        id: IDS.guardianUser,
        authProviderSubject: "pre-alpha-persistence-guardian",
        email: "guardian.persistence@example.test",
      },
      {
        id: IDS.unrelatedGuardianUser,
        authProviderSubject: "pre-alpha-persistence-unrelated-guardian",
        email: "unrelated.persistence@example.test",
      },
    ],
  });

  await client.athleteProfile.createMany({
    data: [
      {
        id: IDS.athleteA,
        displayName: "Persistence Athlete A",
        dateOfBirth: new Date("2014-01-15T00:00:00.000Z"),
      },
      {
        id: IDS.athleteB,
        displayName: "Persistence Athlete B",
        dateOfBirth: new Date("2015-06-20T00:00:00.000Z"),
      },
    ],
  });

  await client.guardianAthleteLink.createMany({
    data: [
      {
        guardianUserId: IDS.guardianUser,
        athleteId: IDS.athleteA,
        status: "ACTIVE",
        approvedAt: new Date(),
      },
      {
        guardianUserId: IDS.guardianUser,
        athleteId: IDS.athleteB,
        status: "ACTIVE",
        approvedAt: new Date(),
      },
      {
        guardianUserId: IDS.unrelatedGuardianUser,
        athleteId: IDS.athleteB,
        status: "REVOKED",
        revokedAt: new Date(),
      },
    ],
  });

  await client.sport.create({
    data: {
      id: IDS.sport,
      code: "PREALPHA_DB",
      defaultName: "Pre-Alpha Basketball",
    },
  });
  await client.programme.create({
    data: {
      id: IDS.programme,
      sportId: IDS.sport,
      code: "PREALPHA_DB_PROGRAMME",
      name: "Pre-Alpha Persistence Programme",
      minimumAge: 8,
      maximumAge: 15,
    },
  });
  await client.programmeOffering.create({
    data: {
      id: IDS.offering,
      programmeId: IDS.programme,
      name: "Pre-Alpha Persistence Offering",
      capacity: 2,
      status: "OPEN",
    },
  });
  await client.membershipPlan.create({
    data: {
      id: IDS.plan,
      name: "Pre-Alpha Monthly Plan",
      durationMonths: 3,
      commitmentCycles: 3,
      billingFrequency: "MONTHLY",
      recurringAmountMinor: 20000,
      currency: "MYR",
    },
  });
  await client.membershipPlanOfferingEligibility.create({
    data: { planId: IDS.plan, offeringId: IDS.offering },
  });
}

const enabled = databaseTestsEnabled();

test(
  "pre-alpha persistence integrity uses real PostgreSQL relationships and transactions",
  { skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests" },
  async (t) => {
    const prisma = new PrismaService();
    const client = prisma.client;
    const academy = new AcademyService(prisma);
    const familyAccess = new FamilyAccessService(prisma);

    await cleanup(client);
    await seed(client);

    try {
      await t.test(
        "guardian access follows persisted active and revoked relationships",
        async () => {
          const guardian = makeAuthenticatedUser({
            id: IDS.guardianUser,
            roles: ["GUARDIAN"],
          });
          const unrelatedGuardian = makeAuthenticatedUser({
            id: IDS.unrelatedGuardianUser,
            roles: ["GUARDIAN"],
          });

          assert.equal(
            await familyAccess.canAccessAthlete(
              guardian,
              IDS.athleteA,
              "manage",
            ),
            true,
          );
          assert.equal(
            await familyAccess.canAccessAthlete(
              guardian,
              IDS.athleteB,
              "read",
            ),
            true,
          );
          assert.equal(
            await familyAccess.canAccessAthlete(
              unrelatedGuardian,
              IDS.athleteB,
              "read",
            ),
            false,
          );
          assert.equal(
            await familyAccess.canAccessAthlete(
              unrelatedGuardian,
              IDS.athleteA,
              "read",
            ),
            false,
          );
        },
      );

      await t.test(
        "eligible membership creation persists PENDING state and blocks duplicates",
        async () => {
          const membership = await academy.createPendingMembership(
            IDS.guardianUser,
            IDS.athleteA,
            { offeringId: IDS.offering, planId: IDS.plan },
          );

          assert.equal(membership.status, "PENDING");
          assert.equal(membership.purchasedByUserId, IDS.guardianUser);
          assert.equal(membership.programmeOfferingId, IDS.offering);
          assert.equal(membership.membershipPlanId, IDS.plan);

          const persisted = await client.membership.findUnique({
            where: { id: membership.id },
          });
          assert.equal(persisted?.status, "PENDING");

          await assert.rejects(
            () =>
              academy.createPendingMembership(
                IDS.guardianUser,
                IDS.athleteA,
                { offeringId: IDS.offering, planId: IDS.plan },
              ),
            expectHttpError(
              409,
              /Athlete already has a current membership for this offering/,
            ),
          );

          await client.membership.delete({ where: { id: membership.id } });
        },
      );

      await t.test(
        "inactive plans and closed offerings fail before membership creation",
        async () => {
          await client.membershipPlan.update({
            where: { id: IDS.plan },
            data: { active: false },
          });
          await assert.rejects(
            () =>
              academy.createPendingMembership(
                IDS.guardianUser,
                IDS.athleteA,
                { offeringId: IDS.offering, planId: IDS.plan },
              ),
            expectHttpError(
              400,
              /Selected plan is not available for this offering/,
            ),
          );

          await client.membershipPlan.update({
            where: { id: IDS.plan },
            data: { active: true },
          });
          await client.programmeOffering.update({
            where: { id: IDS.offering },
            data: { status: "CLOSED" },
          });
          await assert.rejects(
            () =>
              academy.createPendingMembership(
                IDS.guardianUser,
                IDS.athleteA,
                { offeringId: IDS.offering, planId: IDS.plan },
              ),
            expectHttpError(
              400,
              /Selected plan is not available for this offering/,
            ),
          );

          assert.equal(
            await client.membership.count({
              where: { programmeOfferingId: IDS.offering },
            }),
            0,
          );

          await client.programmeOffering.update({
            where: { id: IDS.offering },
            data: { status: "OPEN" },
          });
        },
      );

      await t.test(
        "two concurrent enrolments cannot consume the same final seat",
        async () => {
          await client.programmeOffering.update({
            where: { id: IDS.offering },
            data: { capacity: 1, status: "OPEN" },
          });
          await client.membership.deleteMany({
            where: { programmeOfferingId: IDS.offering },
          });

          const results = await Promise.allSettled([
            academy.createPendingMembership(
              IDS.guardianUser,
              IDS.athleteA,
              { offeringId: IDS.offering, planId: IDS.plan },
            ),
            academy.createPendingMembership(
              IDS.guardianUser,
              IDS.athleteB,
              { offeringId: IDS.offering, planId: IDS.plan },
            ),
          ]);

          const fulfilled = results.filter(
            (result) => result.status === "fulfilled",
          );
          const rejected = results.filter(
            (result) => result.status === "rejected",
          );

          assert.equal(fulfilled.length, 1);
          assert.equal(rejected.length, 1);
          assert.equal(rejected[0].reason?.getStatus?.(), 409);
          assert.match(
            rejected[0].reason?.message ?? "",
            /Programme offering is at capacity/,
          );

          const currentMemberships = await client.membership.findMany({
            where: {
              programmeOfferingId: IDS.offering,
              status: { in: ["PENDING", "ACTIVE", "SUSPENDED"] },
            },
          });
          assert.equal(currentMemberships.length, 1);
          assert.equal(currentMemberships[0].status, "PENDING");
        },
      );
    } finally {
      await cleanup(client);
      await prisma.onModuleDestroy();
    }
  },
);
