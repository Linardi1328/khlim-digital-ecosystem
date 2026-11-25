import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const requireApi = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { NestFactory } = requireApi("@nestjs/core");
const { AppModule } = requireApi("./dist/app.module.js");
const { SupabaseJwtService } = requireApi(
  "./dist/auth/supabase-jwt.service.js",
);
const { IdentityService } = requireApi("./dist/identity/identity.service.js");
const { OrganizationService } = requireApi(
  "./dist/organization/organization.service.js",
);
const { AcademyService } = requireApi("./dist/academy/academy.service.js");
const { BillingService } = requireApi("./dist/billing/billing.service.js");
const { FamilyService } = requireApi("./dist/family/family.service.js");
const { PrismaService } = requireApi("./dist/database/prisma.service.js");

const athlete = "11111111-1111-4111-8111-111111111111";
const membership = "22222222-2222-4222-8222-222222222222";
const organization = "00000000-0000-4000-8000-000000000001";
const athletePath = `/athletes/${athlete}`;
const membershipPath = `${athletePath}/memberships`;
const checkoutPath = `${membershipPath}/${membership}/checkout`;
const reconciliationPath = "/admin/billing/reconcile-stale-checkouts";
const paidGate = "KHLIM_ENABLE_V1_PAID_ENROLMENT";
const portalGate = "KHLIM_ENABLE_V1_PARENT_PORTAL";

test("direct HTTP enforces V1 launch and authorization independently", async (t) => {
  const envKeys = [
    paidGate,
    portalGate,
    "NEXT_PUBLIC_ENABLE_V1_ENROLMENT",
    "NEXT_PUBLIC_ENABLE_V1_PORTAL",
    "KHLIM_REGISTRATION_HMAC_KEYS",
  ];
  const saved = new Map(envKeys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  for (const key of envKeys) delete process.env[key];
  process.env.NEXT_PUBLIC_ENABLE_V1_ENROLMENT = "1";
  process.env.NEXT_PUBLIC_ENABLE_V1_PORTAL = "1";

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: false,
  });
  t.after(() => app.close());
  app.setGlobalPrefix("v1");

  const editorial = {
    id: "editorial-fixture",
    title: "Club milestone",
    imageUrl: "https://media.example.test/unverified.webp",
  };
  Object.defineProperty(app.get(PrismaService), "client", {
    value: {
      guardianAthleteLink: {
        findFirst: ({ where }) =>
          where.guardianUserId === "linked" && { id: "link" },
      },
      academyRegistrationPolicy: { findFirst: () => null },
      editorialEntry: {
        findMany: () => [editorial],
        findFirst: ({ where }) => (where.slug === "missing" ? null : editorial),
      },
    },
  });
  t.mock.method(app.get(SupabaseJwtService), "verify", (token) => token);
  t.mock.method(app.get(IdentityService), "resolveAuthenticatedUser", (id) => ({
    id,
    roles: id.startsWith("finance") ? [] : ["GUARDIAN"],
    authenticatorAssuranceLevel: id === "finance-aal2" ? "aal2" : "aal1",
  }));
  t.mock.method(app.get(OrganizationService), "resolveContext", (user) => ({
    id: organization,
    roles: user.id.startsWith("finance") ? ["FINANCE_ADMIN"] : [],
  }));

  const academy = app.get(AcademyService);
  const billing = app.get(BillingService);
  const family = app.get(FamilyService);
  const paidRoutes = [
    [
      membershipPath,
      { offeringId: athlete, planId: membership },
      t.mock.method(academy, "createPendingMembership", () => ({
        id: membership,
      })),
    ],
    [
      checkoutPath,
      { acceptTerms: true },
      t.mock.method(billing, "prepareMembershipCheckout", () => ({
        checkoutUrl: "https://checkout.example.test",
      })),
    ],
  ];
  const portalRoutes = [
    [
      "/me/athletes",
      {
        displayName: "Fixture Player",
        dateOfBirth: "2013-01-01",
        guardianDataConsent: true,
        privacyNoticeVersion: "test-version",
      },
      t.mock.method(family, "createManagedAthlete", () => ({ id: athlete })),
    ],
    [
      `/me${athletePath}/guardian-invitations`,
      { email: "guardian@example.test" },
      t.mock.method(family, "createGuardianInvitation", () => ({
        id: "invite",
      })),
    ],
    [
      "/family-invitations/accept",
      { token: "test-invitation-token" },
      t.mock.method(family, "acceptGuardianInvitation", () => ({ id: "link" })),
    ],
  ];
  t.mock.method(academy, "listPublicOfferings", () => []);
  t.mock.method(academy, "listAthleteMemberships", () => [{ id: membership }]);
  t.mock.method(billing, "getMembershipBilling", () => ({ balance: 0 }));
  t.mock.method(billing, "reconcileStaleCheckoutHolds", (id) => ({ id }));
  const webhook = t.mock.method(billing, "processVerifiedWebhook", () => ({
    accepted: true,
  }));

  await app.listen(0, "127.0.0.1");
  const origin = await app.getUrl();
  function request(path, { method = "GET", token, body } = {}) {
    return fetch(`${origin}/v1${path}`, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body && { "Content-Type": "application/json" }),
      },
      body: body && JSON.stringify(body),
    });
  }
  const post = (path, body, token = "linked") =>
    request(path, { method: "POST", token, body });

  async function assertDisabled(routes) {
    for (const [path, body, handler] of routes) {
      const response = await post(path, body);
      assert.equal(response.status, 403, path);
      assert.equal(
        (await response.json()).code,
        "CUSTOMER_FEATURE_DISABLED",
        path,
      );
      assert.equal(handler.mock.callCount(), 0, path);
    }
  }
  await assertDisabled([...paidRoutes, ...portalRoutes]);
  process.env[paidGate] = "true";
  process.env[portalGate] = " 1 ";
  await assertDisabled([...paidRoutes, ...portalRoutes]);

  assert.equal((await request(membershipPath, { method: "POST" })).status, 401);
  const unrelated = await post(checkoutPath, { acceptTerms: true }, "unlinked");
  assert.equal(unrelated.status, 403);
  assert.equal(
    (await unrelated.json()).message,
    "Athlete access is not permitted",
  );

  assert.equal((await request("/academy/offerings")).status, 200);
  assert.deepEqual(
    await (await request(membershipPath, { token: "linked" })).json(),
    [{ id: membership }],
  );
  assert.equal(
    (await request(membershipPath, { token: "unlinked" })).status,
    403,
  );
  assert.equal(
    (
      await request(`${membershipPath}/${membership}/billing`, {
        token: "linked",
      })
    ).status,
    200,
  );

  for (const [path, method] of [
    ["/me/schedule", "GET"],
    ["/me/notifications", "GET"],
    ["/me/notifications/sample/read", "POST"],
  ]) {
    const response = await request(path, { token: "linked", method });
    assert.equal(response.status, 403, path);
    assert.equal(
      (await response.json()).message,
      "Authorization policy is required",
      path,
    );
  }

  assert.equal((await post(reconciliationPath, {})).status, 403);
  assert.equal(
    (await post(reconciliationPath, {}, "finance-aal1")).status,
    403,
  );
  assert.deepEqual(
    await (await post(reconciliationPath, {}, "finance-aal2")).json(),
    { id: organization },
  );

  const webhookPayload = { id: "bill-fixture" };
  const webhookResponse = await request("/payments/webhooks/billplz", {
    method: "POST",
    body: webhookPayload,
  });
  assert.equal(webhookResponse.status, 201);
  assert.equal(webhook.mock.callCount(), 1);
  const [webhookOrg, provider, , rawBody] = webhook.mock.calls[0].arguments;
  assert.equal(webhookOrg, organization);
  assert.equal(provider, "billplz");
  assert.deepEqual(JSON.parse(rawBody.toString("utf8")), webhookPayload);

  for (const [path, expected] of [
    ["/editorial/achievements", [{ ...editorial, imageUrl: null }]],
    ["/editorial/player-spotlights", [{ ...editorial, imageUrl: null }]],
    ["/editorial/player-spotlights/sample", { ...editorial, imageUrl: null }],
    ["/editorial/player-spotlights/missing", null],
  ]) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    if (expected === null) assert.equal(await response.text(), "");
    else assert.deepEqual(await response.json(), expected, path);
  }
  assert.match(editorial.imageUrl, /unverified\.webp$/);
  const registration = await request("/academy/registration-config");
  assert.equal(registration.status, 200);
  assert.equal(
    (await registration.json()).closedReasonCode,
    "REGISTRATION_NOT_CONFIGURED",
  );
  assert.deepEqual(await (await request("/academy/sessions")).json(), {
    registrationOpen: false,
    items: [],
  });

  process.env[paidGate] = "1";
  await assertDisabled(portalRoutes);
  assert.equal(
    (await post(checkoutPath, { acceptTerms: true }, "unlinked")).status,
    403,
  );
  for (const [path, body, handler] of paidRoutes) {
    assert.equal((await post(path, body)).status, 201, path);
    assert.equal(handler.mock.callCount(), 1, path);
  }

  process.env[portalGate] = "1";
  delete process.env[paidGate];
  assert.equal((await post(checkoutPath, { acceptTerms: true })).status, 403);
  for (const [path, body, handler] of portalRoutes) {
    assert.equal((await post(path, body)).status, 201, path);
    assert.equal(handler.mock.callCount(), 1, path);
  }
});
