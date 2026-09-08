import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const apiRequire = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const require = createRequire(import.meta.url);

const { UnauthorizedException } = apiRequire("@nestjs/common");
const { NestFactory } = apiRequire("@nestjs/core");
const { AppModule } = require("../../apps/api/dist/app.module.js");
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const {
  SupabaseJwtService,
} = require("../../apps/api/dist/auth/supabase-jwt.service.js");

const KHLIM_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const FOREIGN_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000092";
const USER_ID = "92929292-9292-4292-8292-929292929292";
const SUBJECT = "phase-2-admin-academy-writes";
const SPORT_CODE = "PHASE2-ADMIN-WRITES";

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Phase 2 Admin write tests");
  }
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("Phase 2 Admin write tests require a test database");
  }
  return true;
}

function installJwtDouble(jwt) {
  const identities = new Map([
    [
      "academy-aal2",
      {
        subject: SUBJECT,
        email: "phase2.academy@example.test",
        payload: {
          sub: SUBJECT,
          email: "phase2.academy@example.test",
          aal: "aal2",
          aud: "authenticated",
        },
      },
    ],
    [
      "academy-aal1",
      {
        subject: SUBJECT,
        email: "phase2.academy@example.test",
        payload: {
          sub: SUBJECT,
          email: "phase2.academy@example.test",
          aal: "aal1",
          aud: "authenticated",
        },
      },
    ],
  ]);

  jwt.verify = async (token) => {
    const identity = identities.get(token);
    if (!identity) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    return identity;
  };
}

async function jsonRequest(baseUrl, path, options = {}) {
  const headers = new Headers();
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  if (options.body !== undefined)
    headers.set("content-type", "application/json");

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : null,
  };
}

async function cleanup(client) {
  await client.programmeOffering.deleteMany({
    where: { name: { startsWith: "Phase 2 Admin Writes" } },
  });
  await client.membershipPlan.deleteMany({
    where: { name: { startsWith: "Phase 2 Admin Writes" } },
  });
  await client.programme.deleteMany({
    where: { code: { startsWith: "PHASE2-ADMIN-WRITES" } },
  });
  await client.venue.deleteMany({
    where: { name: { startsWith: "Phase 2 Admin Writes" } },
  });
  await client.organizationSport.deleteMany({
    where: { sport: { code: SPORT_CODE } },
  });
  await client.sport.deleteMany({ where: { code: SPORT_CODE } });
  await client.organizationMembership.deleteMany({
    where: { userId: USER_ID },
  });
  await client.userRoleAssignment.deleteMany({ where: { userId: USER_ID } });
  await client.user.deleteMany({ where: { id: USER_ID } });
  await client.$executeRaw`
    DELETE FROM organizations WHERE id = ${FOREIGN_ORGANIZATION_ID}::uuid
  `;
}

const enabled = databaseTestsEnabled();

test(
  "Phase 2 Admin Academy state mutations persist, require MFA, and stay tenant scoped",
  { skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests" },
  async () => {
    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("v1");

    const prisma = app.get(PrismaService);
    const client = prisma.client;
    installJwtDouble(app.get(SupabaseJwtService));

    await cleanup(client);

    const user = await client.user.create({
      data: {
        id: USER_ID,
        authProviderSubject: SUBJECT,
        email: "phase2.academy@example.test",
        roleAssignments: { create: [{ role: "ACADEMY_ADMIN" }] },
      },
    });
    await client.organizationMembership.create({
      data: {
        organizationId: KHLIM_ORGANIZATION_ID,
        userId: user.id,
        status: "ACTIVE",
        roleAssignments: { create: [{ role: "ACADEMY_ADMIN" }] },
      },
    });

    const sport = await client.sport.create({
      data: { code: SPORT_CODE, defaultName: "Phase 2 Test Sport" },
    });
    await client.organizationSport.create({
      data: {
        organizationId: KHLIM_ORGANIZATION_ID,
        sportId: sport.id,
        active: true,
      },
    });
    const programme = await client.programme.create({
      data: {
        organizationId: KHLIM_ORGANIZATION_ID,
        sportId: sport.id,
        code: "PHASE2-ADMIN-WRITES-PROGRAMME",
        name: "Phase 2 Admin Writes Programme",
      },
    });
    const venue = await client.venue.create({
      data: {
        organizationId: KHLIM_ORGANIZATION_ID,
        name: "Phase 2 Admin Writes Venue",
      },
    });
    const offering = await client.programmeOffering.create({
      data: {
        organizationId: KHLIM_ORGANIZATION_ID,
        programmeId: programme.id,
        venueId: venue.id,
        name: "Phase 2 Admin Writes Offering",
        capacity: 20,
        status: "DRAFT",
      },
    });
    const plan = await client.membershipPlan.create({
      data: {
        organizationId: KHLIM_ORGANIZATION_ID,
        name: "Phase 2 Admin Writes Plan",
        billingFrequency: "MONTHLY",
        recurringAmountMinor: 15000,
        upfrontAmountMinor: 45000,
        currency: "MYR",
        active: true,
      },
    });

    await client.$executeRaw`
      INSERT INTO organizations (id, slug, name, status)
      VALUES (
        ${FOREIGN_ORGANIZATION_ID}::uuid,
        'phase-2-admin-writes-foreign',
        'Phase 2 Admin Writes Foreign Org',
        'ACTIVE'
      )
    `;
    const foreignPlan = await client.membershipPlan.create({
      data: {
        organizationId: FOREIGN_ORGANIZATION_ID,
        name: "Phase 2 Admin Writes Foreign Plan",
        billingFrequency: "MONTHLY",
        recurringAmountMinor: 9999,
        currency: "MYR",
        active: true,
      },
    });

    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.equal(typeof address, "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const lowAssurance = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/offerings/${offering.id}/status`,
        {
          method: "PATCH",
          token: "academy-aal1",
          body: { status: "OPEN" },
        },
      );
      assert.equal(lowAssurance.response.status, 403);
      assert.match(String(lowAssurance.body?.message), /MFA assurance level 2/);

      const opened = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/offerings/${offering.id}/status`,
        {
          method: "PATCH",
          token: "academy-aal2",
          body: { status: "OPEN" },
        },
      );
      assert.equal(opened.response.status, 200);
      assert.equal(opened.body.status, "OPEN");
      const persistedOffering = await client.programmeOffering.findUnique({
        where: { id: offering.id },
      });
      assert.equal(persistedOffering.status, "OPEN");

      const deactivated = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/membership-plans/${plan.id}/active`,
        {
          method: "PATCH",
          token: "academy-aal2",
          body: { active: false },
        },
      );
      assert.equal(deactivated.response.status, 200);
      assert.equal(deactivated.body.active, false);
      const persistedPlan = await client.membershipPlan.findUnique({
        where: { id: plan.id },
      });
      assert.equal(persistedPlan.active, false);

      const foreignMutation = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/membership-plans/${foreignPlan.id}/active`,
        {
          method: "PATCH",
          token: "academy-aal2",
          body: { active: false },
        },
      );
      assert.equal(foreignMutation.response.status, 404);
      const untouchedForeignPlan = await client.membershipPlan.findUnique({
        where: { id: foreignPlan.id },
      });
      assert.equal(untouchedForeignPlan.active, true);
    } finally {
      await app.close();
      await cleanup(client);
    }
  },
);
