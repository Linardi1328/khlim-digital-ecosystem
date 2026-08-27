import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import {
  PRE_ALPHA_IDS,
  makeAuthenticatedUser,
  makeExecutionContext,
  makeFamilyAccessPrismaDouble,
  makeReflector,
} from "../../packages/testing/src/pre-alpha-fixtures.mjs";

const require = createRequire(import.meta.url);

const {
  PaymentGatewayRegistry,
} = require("../../apps/api/dist/billing/payment-gateway.js");
const {
  FamilyAccessService,
} = require("../../apps/api/dist/family/family-access.service.js");
const {
  AuthorizationGuard,
} = require("../../apps/api/dist/auth/authorization.guard.js");
const {
  ALLOW_AUTHENTICATED_KEY,
  ATHLETE_ACCESS_KEY,
  MFA_REQUIRED_KEY,
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
} = require("../../apps/api/dist/auth/auth.constants.js");

function expectHttpError(status, messagePattern) {
  return (error) => {
    assert.equal(error?.getStatus?.(), status);
    if (messagePattern) {
      assert.match(error.message, messagePattern);
    }
    return true;
  };
}

function makeGatewayAdapter(provider = "Sandbox") {
  return {
    provider,
    createCustomer: async () => ({ providerCustomerId: "customer_test" }),
    createCheckout: async () => ({
      checkoutUrl: "https://checkout.example.test",
    }),
    verifyWebhook: async () => ({
      providerEventId: "event_test",
      eventType: "PAYMENT_SUCCEEDED",
      idempotencyKey: "membership:test:installment:1",
    }),
    refund: async () => undefined,
  };
}

test("payment gateway registry fails closed without a configured adapter", () => {
  const registry = new PaymentGatewayRegistry();
  const originalProvider = process.env.PAYMENT_PROVIDER;
  delete process.env.PAYMENT_PROVIDER;

  try {
    assert.throws(
      () => registry.requireConfigured(),
      expectHttpError(
        503,
        /No production payment provider adapter is configured/,
      ),
    );
  } finally {
    if (originalProvider === undefined) {
      delete process.env.PAYMENT_PROVIDER;
    } else {
      process.env.PAYMENT_PROVIDER = originalProvider;
    }
  }
});

test("payment gateway registry resolves registered providers case-insensitively", () => {
  const registry = new PaymentGatewayRegistry();
  const adapter = makeGatewayAdapter("Sandbox");

  registry.register(adapter);

  assert.equal(registry.requireConfigured(" sandbox "), adapter);
  assert.throws(
    () => registry.requireConfigured("unregistered"),
    expectHttpError(
      503,
      /No production payment provider adapter is configured/,
    ),
  );
});

test("family access rejects malformed athlete IDs before touching persistence", async () => {
  const { prisma, calls } = makeFamilyAccessPrismaDouble({
    guardianLink: { id: "should-not-be-read" },
  });
  const service = new FamilyAccessService(prisma);

  const allowed = await service.canAccessAthlete(
    makeAuthenticatedUser(),
    "not-a-uuid",
    "read",
  );

  assert.equal(allowed, false);
  assert.equal(calls.guardianAthleteLink.length, 0);
  assert.equal(calls.athleteProfile.length, 0);
});

test("family staff roles can access a valid athlete without relationship lookup", async () => {
  const { prisma, calls } = makeFamilyAccessPrismaDouble();
  const service = new FamilyAccessService(prisma);

  const allowed = await service.canAccessAthlete(
    makeAuthenticatedUser({
      id: PRE_ALPHA_IDS.staffUser,
      roles: ["ACADEMY_ADMIN"],
      authenticatorAssuranceLevel: "aal2",
    }),
    PRE_ALPHA_IDS.athlete,
    "manage",
  );

  assert.equal(allowed, true);
  assert.equal(calls.guardianAthleteLink.length, 0);
  assert.equal(calls.athleteProfile.length, 0);
});

test("guardian access requires an active relationship to the requested athlete", async () => {
  const linked = makeFamilyAccessPrismaDouble({
    guardianLink: { id: "link-1" },
  });
  const linkedService = new FamilyAccessService(linked.prisma);

  assert.equal(
    await linkedService.canAccessAthlete(
      makeAuthenticatedUser(),
      PRE_ALPHA_IDS.athlete,
      "read",
    ),
    true,
  );
  assert.deepEqual(linked.calls.guardianAthleteLink[0].where, {
    guardianUserId: PRE_ALPHA_IDS.guardianUser,
    athleteId: PRE_ALPHA_IDS.athlete,
    status: "ACTIVE",
  });

  const unrelated = makeFamilyAccessPrismaDouble();
  const unrelatedService = new FamilyAccessService(unrelated.prisma);
  assert.equal(
    await unrelatedService.canAccessAthlete(
      makeAuthenticatedUser(),
      PRE_ALPHA_IDS.otherAthlete,
      "read",
    ),
    false,
  );
});

test("athletes may read their own profile but may not use athlete self-access for manage mode", async () => {
  const ownProfile = makeFamilyAccessPrismaDouble({
    athleteProfile: { id: PRE_ALPHA_IDS.athlete },
  });
  const service = new FamilyAccessService(ownProfile.prisma);
  const athleteUser = makeAuthenticatedUser({
    id: PRE_ALPHA_IDS.athleteUser,
    roles: ["ATHLETE"],
  });

  assert.equal(
    await service.canAccessAthlete(athleteUser, PRE_ALPHA_IDS.athlete, "read"),
    true,
  );
  assert.deepEqual(ownProfile.calls.athleteProfile[0].where, {
    id: PRE_ALPHA_IDS.athlete,
    userId: PRE_ALPHA_IDS.athleteUser,
  });

  assert.equal(
    await service.canAccessAthlete(
      athleteUser,
      PRE_ALPHA_IDS.athlete,
      "manage",
    ),
    false,
  );
  assert.equal(ownProfile.calls.athleteProfile.length, 1);
});

test("authorization guard allows explicitly public routes without authentication", async () => {
  const guard = new AuthorizationGuard(
    makeReflector({ [PUBLIC_ROUTE_KEY]: true }),
    {
      canAccessAthlete: async () => {
        throw new Error("public route must not perform athlete access checks");
      },
    },
  );

  assert.equal(await guard.canActivate(makeExecutionContext()), true);
});

test("authorization guard denies protected handlers that forgot to declare a policy", async () => {
  const guard = new AuthorizationGuard(makeReflector(), {
    canAccessAthlete: async () => true,
  });

  await assert.rejects(
    () => guard.canActivate(makeExecutionContext()),
    expectHttpError(403, /Authorization policy is required/),
  );
});

test("authorization guard requires an authenticated user for authenticated routes", async () => {
  const guard = new AuthorizationGuard(
    makeReflector({ [ALLOW_AUTHENTICATED_KEY]: true }),
    { canAccessAthlete: async () => true },
  );

  await assert.rejects(
    () => guard.canActivate(makeExecutionContext({ headers: {} })),
    expectHttpError(401, /Authenticated user context is required/),
  );
});

test("authorization guard enforces MFA before privileged role access", async () => {
  const guard = new AuthorizationGuard(
    makeReflector({
      [REQUIRED_ROLES_KEY]: ["FINANCE_ADMIN"],
      [MFA_REQUIRED_KEY]: true,
    }),
    { canAccessAthlete: async () => true },
  );
  const context = makeExecutionContext({
    headers: {},
    authenticatedUser: makeAuthenticatedUser({
      roles: ["FINANCE_ADMIN"],
      authenticatorAssuranceLevel: "aal1",
    }),
  });

  await assert.rejects(
    () => guard.canActivate(context),
    expectHttpError(403, /MFA assurance level 2 is required/),
  );
});

test("authorization guard rejects insufficient staff roles and accepts an allowed MFA-backed role", async () => {
  const reflector = makeReflector({
    [REQUIRED_ROLES_KEY]: ["FINANCE_ADMIN", "SUPER_ADMIN"],
    [MFA_REQUIRED_KEY]: true,
  });
  const guard = new AuthorizationGuard(reflector, {
    canAccessAthlete: async () => true,
  });

  await assert.rejects(
    () =>
      guard.canActivate(
        makeExecutionContext({
          headers: {},
          authenticatedUser: makeAuthenticatedUser({
            roles: ["COACH"],
            authenticatorAssuranceLevel: "aal2",
          }),
        }),
      ),
    expectHttpError(403, /Insufficient permissions/),
  );

  assert.equal(
    await guard.canActivate(
      makeExecutionContext({
        headers: {},
        authenticatedUser: makeAuthenticatedUser({
          roles: ["FINANCE_ADMIN"],
          authenticatorAssuranceLevel: "aal2",
        }),
      }),
    ),
    true,
  );
});

test("authorization guard delegates athlete relationship checks using the route parameter and access mode", async () => {
  const calls = [];
  const guard = new AuthorizationGuard(
    makeReflector({
      [ATHLETE_ACCESS_KEY]: { mode: "manage", param: "athleteId" },
    }),
    {
      canAccessAthlete: async (user, athleteId, mode) => {
        calls.push({ user, athleteId, mode });
        return athleteId === PRE_ALPHA_IDS.athlete;
      },
    },
  );
  const user = makeAuthenticatedUser();

  assert.equal(
    await guard.canActivate(
      makeExecutionContext({
        headers: {},
        params: { athleteId: PRE_ALPHA_IDS.athlete },
        authenticatedUser: user,
      }),
    ),
    true,
  );
  assert.deepEqual(calls[0], {
    user,
    athleteId: PRE_ALPHA_IDS.athlete,
    mode: "manage",
  });

  await assert.rejects(
    () =>
      guard.canActivate(
        makeExecutionContext({
          headers: {},
          params: { athleteId: PRE_ALPHA_IDS.otherAthlete },
          authenticatedUser: user,
        }),
      ),
    expectHttpError(403, /Athlete access is not permitted/),
  );
});
