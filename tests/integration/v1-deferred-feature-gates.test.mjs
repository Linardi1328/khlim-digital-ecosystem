import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { after, test } from "node:test";

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

const ORG = "00000000-0000-4000-8000-000000000001";
const RUN = randomUUID().slice(0, 8);

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const parsed = new URL(url);
  if (!parsed.pathname.toLowerCase().includes("test")) {
    throw new Error(
      "Deferred-gate tests require a database whose name contains 'test'",
    );
  }
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
    throw new Error(
      "Deferred-gate tests only run against a local disposable database",
    );
  }
  return true;
}

const skip = databaseTestsEnabled()
  ? false
  : "Set KHLIM_TEST_DATABASE=1 to run database tests";

const FLAGS = ["KHLIM_ENABLE_V1_ENROLMENT", "KHLIM_ENABLE_V1_PORTAL"];
for (const flag of FLAGS) delete process.env[flag];

const USERS = {
  guardian: { platformRole: "GUARDIAN", aal: "aal1" },
  academyAdmin: { orgRole: "ACADEMY_ADMIN", aal: "aal2" },
  finance: { orgRole: "FINANCE_ADMIN", aal: "aal2" },
};

let ctxPromise;
let appRef;

async function buildContext() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    rawBody: true,
  });
  appRef = app;
  app.setGlobalPrefix("v1");
  const client = app.get(PrismaService).client;
  const ids = {};
  const identities = new Map();
  for (const [name, spec] of Object.entries(USERS)) {
    ids[name] = randomUUID();
    const subject = `v1-gates-${RUN}-${name}`;
    identities.set(name, {
      subject,
      email: `${name}.${RUN}@example.test`,
      payload: { sub: subject, aal: spec.aal, aud: "authenticated" },
    });
    await client.user.create({
      data: {
        id: ids[name],
        authProviderSubject: subject,
        email: `${name}.${RUN}@example.test`,
        ...(spec.platformRole
          ? { roleAssignments: { create: [{ role: spec.platformRole }] } }
          : {}),
      },
    });
    if (spec.orgRole) {
      await client.organizationMembership.create({
        data: {
          organizationId: ORG,
          userId: ids[name],
          status: "ACTIVE",
          roleAssignments: { create: [{ role: spec.orgRole }] },
        },
      });
    }
  }
  app.get(SupabaseJwtService).verify = async (token) => {
    const identity = identities.get(token);
    if (!identity)
      throw new UnauthorizedException("Invalid or expired access token");
    return identity;
  };

  const sport = await client.sport.upsert({
    where: { code: "SYNTHETIC_V1_GATES" },
    create: { code: "SYNTHETIC_V1_GATES", defaultName: "Synthetic" },
    update: {},
  });
  await client.organizationSport.upsert({
    where: {
      organizationId_sportId: { organizationId: ORG, sportId: sport.id },
    },
    create: { organizationId: ORG, sportId: sport.id },
    update: {},
  });
  const programme = await client.programme.create({
    data: {
      organizationId: ORG,
      sportId: sport.id,
      code: `GATES-${RUN}`,
      name: "Gates",
    },
  });
  const offering = await client.programmeOffering.create({
    data: {
      organizationId: ORG,
      programmeId: programme.id,
      name: `Gates ${RUN}`,
      capacity: 10,
      status: "OPEN",
    },
  });
  const plan = await client.membershipPlan.create({
    data: {
      organizationId: ORG,
      name: `Gates plan ${RUN}`,
      billingFrequency: "UPFRONT",
      upfrontAmountMinor: 18000,
    },
  });
  await client.membershipPlanOfferingEligibility.create({
    data: { planId: plan.id, offeringId: offering.id },
  });
  const athlete = await client.athleteProfile.create({
    data: {
      displayName: `Synthetic Athlete ${RUN}`,
      dateOfBirth: new Date("2015-01-01"),
    },
  });
  await client.guardianAthleteLink.create({
    data: {
      guardianUserId: ids.guardian,
      athleteId: athlete.id,
      status: "ACTIVE",
      relationshipType: "MOTHER",
    },
  });
  const membership = await client.membership.create({
    data: {
      organizationId: ORG,
      athleteId: athlete.id,
      programmeOfferingId: offering.id,
      membershipPlanId: plan.id,
      purchasedByUserId: ids.guardian,
      status: "PENDING",
    },
  });

  await app.listen(0, "127.0.0.1");
  const baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  return { client, baseUrl, ids, athlete, membership, offering, plan };
}

function ctx() {
  ctxPromise ??= buildContext();
  return ctxPromise;
}

after(async () => {
  for (const flag of FLAGS) delete process.env[flag];
  await ctxPromise?.catch(() => undefined);
  await appRef?.close();
});

async function call(c, method, path, { token, body } = {}) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await fetch(`${c.baseUrl}/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}

function assertClosed(res, feature, label) {
  assert.equal(res.status, 403, `${label}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body?.code, "FEATURE_NOT_AVAILABLE", label);
  assert.equal(res.body?.feature, feature, label);
}

test(
  "disabled paid enrolment and checkout cannot be initiated by direct API calls, by anyone",
  { skip },
  async () => {
    const c = await ctx();
    const athletePath = `/athletes/${c.athlete.id}`;
    const membershipsBefore = await c.client.membership.count({
      where: { athleteId: c.athlete.id },
    });
    const paymentsBefore = await c.client.payment.count({
      where: { membershipId: c.membership.id },
    });

    for (const token of ["guardian", "academyAdmin"]) {
      assertClosed(
        await call(c, "POST", `${athletePath}/memberships`, {
          token,
          body: { offeringId: c.offering.id, planId: c.plan.id },
        }),
        "V1_ENROLMENT",
        `${token} create membership`,
      );
      assertClosed(
        await call(
          c,
          "POST",
          `${athletePath}/memberships/${c.membership.id}/checkout`,
          {
            token,
            body: { acceptTerms: true },
          },
        ),
        "V1_ENROLMENT",
        `${token} checkout`,
      );
    }
    // A browser-style flag value never opens the server gate.
    process.env.KHLIM_ENABLE_V1_ENROLMENT = "true";
    assertClosed(
      await call(
        c,
        "POST",
        `${athletePath}/memberships/${c.membership.id}/checkout`,
        {
          token: "guardian",
          body: { acceptTerms: true },
        },
      ),
      "V1_ENROLMENT",
      "non-exact flag value",
    );
    delete process.env.KHLIM_ENABLE_V1_ENROLMENT;

    assert.equal(
      await c.client.membership.count({ where: { athleteId: c.athlete.id } }),
      membershipsBefore,
    );
    assert.equal(
      await c.client.payment.count({
        where: { membershipId: c.membership.id },
      }),
      paymentsBefore,
    );
    // Authentication still comes first.
    assert.equal(
      (await call(c, "POST", `${athletePath}/memberships`, { body: {} }))
        .status,
      401,
    );
  },
);

test(
  "disabled parent-portal routes are closed to guardians but staff keep support access",
  { skip },
  async () => {
    const c = await ctx();
    const a = `/athletes/${c.athlete.id}`;
    const athletesBefore = await c.client.athleteProfile.count();
    const guardianRoutes = [
      ["GET", "/me/athletes"],
      [
        "POST",
        "/me/athletes",
        { displayName: "Blocked", dateOfBirth: "2015-01-01" },
      ],
      ["GET", a],
      ["PATCH", a, { displayName: "Blocked" }],
      ["DELETE", `/me/athletes/${c.athlete.id}/link`],
      [
        "POST",
        `/me/athletes/${c.athlete.id}/guardian-invitations`,
        { email: "x@example.test" },
      ],
      [
        "DELETE",
        `/me/athletes/${c.athlete.id}/guardian-invitations/${randomUUID()}`,
      ],
      ["POST", "/family-invitations/accept", { token: "x".repeat(40) }],
      ["GET", `${a}/memberships`],
      ["GET", `${a}/memberships/${c.membership.id}/billing`],
    ];
    for (const [method, path, body] of guardianRoutes) {
      assertClosed(
        await call(c, method, path, { token: "guardian", body }),
        "V1_PORTAL",
        `${method} ${path}`,
      );
    }
    // Pre-existing control (unchanged): these routes declare no authorization
    // policy, so the global default-deny guard already refuses them for every
    // caller before the launch gate is evaluated. The gate stays as defence in
    // depth for when a policy is added.
    for (const [method, path] of [
      ["GET", "/me/schedule"],
      ["GET", "/me/notifications"],
      ["POST", `/me/notifications/${randomUUID()}/read`],
    ]) {
      for (const token of ["guardian", "academyAdmin"]) {
        const res = await call(c, method, path, { token });
        assert.equal(res.status, 403, `${token} ${method} ${path}`);
        assert.equal(res.body?.message, "Authorization policy is required");
      }
    }
    assert.equal(
      await c.client.athleteProfile.count(),
      athletesBefore,
      "no athlete created",
    );
    assert.equal(
      await c.client.guardianAthleteLink.count({
        where: { athleteId: c.athlete.id, status: "ACTIVE" },
      }),
      1,
      "the family link was not revoked",
    );

    // Staff support access to athlete records is preserved while the portal is closed.
    assert.equal(
      (await call(c, "GET", a, { token: "academyAdmin" })).status,
      200,
    );
    assert.equal(
      (await call(c, "GET", `${a}/memberships`, { token: "academyAdmin" }))
        .status,
      200,
    );
  },
);

test(
  "launched V1 features, account access, webhooks and reconciliation are unaffected",
  { skip },
  async () => {
    const c = await ctx();
    assert.equal(
      (await call(c, "GET", "/me", { token: "guardian" })).status,
      200,
    );
    assert.equal(
      (await call(c, "GET", "/academy/registration-config")).status,
      200,
    );
    assert.equal((await call(c, "GET", "/academy/sessions")).status, 200);
    assert.equal((await call(c, "GET", "/academy/offerings")).status, 200);
    const webhook = await call(c, "POST", "/payments/webhooks/billplz", {
      body: {},
    });
    assert.notEqual(
      webhook.body?.code,
      "FEATURE_NOT_AVAILABLE",
      "webhook processing is never feature-gated",
    );
    assert.notEqual(webhook.status, 403);
    const reconcile = await call(
      c,
      "POST",
      "/admin/billing/reconcile-stale-checkouts",
      { token: "finance" },
    );
    assert.ok(
      [200, 201].includes(reconcile.status),
      JSON.stringify(reconcile.body),
    );
  },
);

test(
  "with the exact server flag set, the gate no longer blocks (and only the gate was blocking)",
  { skip },
  async () => {
    const c = await ctx();
    process.env.KHLIM_ENABLE_V1_PORTAL = "1";
    process.env.KHLIM_ENABLE_V1_ENROLMENT = "1";
    try {
      const list = await call(c, "GET", "/me/athletes", { token: "guardian" });
      assert.equal(list.status, 200, JSON.stringify(list.body));
      const second = await c.client.programmeOffering.create({
        data: {
          organizationId: ORG,
          programmeId: c.offering.programmeId,
          name: `Gates second ${RUN}`,
          capacity: 10,
          status: "OPEN",
        },
      });
      await c.client.membershipPlanOfferingEligibility.create({
        data: { planId: c.plan.id, offeringId: second.id },
      });
      const created = await call(
        c,
        "POST",
        `/athletes/${c.athlete.id}/memberships`,
        {
          token: "guardian",
          body: { offeringId: second.id, planId: c.plan.id },
        },
      );
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const checkout = await call(
        c,
        "POST",
        `/athletes/${c.athlete.id}/memberships/${c.membership.id}/checkout`,
        { token: "guardian", body: { acceptTerms: true } },
      );
      assert.notEqual(checkout.body?.code, "FEATURE_NOT_AVAILABLE");
    } finally {
      delete process.env.KHLIM_ENABLE_V1_PORTAL;
      delete process.env.KHLIM_ENABLE_V1_ENROLMENT;
    }
  },
);
