import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const apiRequire = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const require = createRequire(import.meta.url);
apiRequire("reflect-metadata");
const { PATH_METADATA, METHOD_METADATA } = apiRequire(
  "@nestjs/common/constants",
);
const { RequestMethod } = apiRequire("@nestjs/common");
const {
  DEFERRED_FEATURE_KEY,
} = require("../apps/api/dist/auth/auth.constants.js");
const {
  isDeferredFeatureEnabled,
} = require("../apps/api/dist/auth/deferred-features.js");

const controllers = {
  academy: require("../apps/api/dist/academy/academy.controller.js")
    .AcademyController,
  billing: require("../apps/api/dist/billing/billing.controller.js")
    .BillingController,
  family: require("../apps/api/dist/family/family.controller.js")
    .FamilyController,
  scheduling: require("../apps/api/dist/scheduling/scheduling.controller.js")
    .SchedulingController,
  notifications:
    require("../apps/api/dist/notifications/notifications.controller.js")
      .NotificationsController,
  identity: require("../apps/api/dist/identity/identity.controller.js")
    .IdentityController,
  registration:
    require("../apps/api/dist/academy/registration/registration.controllers.js")
      .AcademyRegistrationPublicController,
  leads: require("../apps/api/dist/academy/academy-leads.controller.js")
    .AcademyLeadsController,
};

function routes(Controller) {
  const prefix = Reflect.getMetadata(PATH_METADATA, Controller) ?? "";
  return Object.getOwnPropertyNames(Controller.prototype)
    .filter((name) => name !== "constructor")
    .map((name) => {
      const handler = Controller.prototype[name];
      const path = Reflect.getMetadata(PATH_METADATA, handler);
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      if (path === undefined || method === undefined) return null;
      return {
        route: `${RequestMethod[method]} ${[prefix, path]
          .map((part) => String(part).replace(/^\/+|\/+$/g, ""))
          .filter(Boolean)
          .join("/")}`,
        gate: Reflect.getMetadata(DEFERRED_FEATURE_KEY, handler) ?? null,
      };
    })
    .filter(Boolean);
}

const all = Object.values(controllers).flatMap(routes);
const gateOf = (route) => {
  const found = all.find((r) => r.route === route);
  assert.ok(found, `route ${route} exists`);
  return found.gate;
};

test("paid enrolment and checkout are gated server-side with no staff bypass", () => {
  for (const route of [
    "POST athletes/:athleteId/memberships",
    "POST athletes/:athleteId/memberships/:membershipId/checkout",
  ]) {
    assert.deepEqual(
      gateOf(route),
      { feature: "V1_ENROLMENT", staffBypass: false },
      route,
    );
  }
});

test("parent-portal routes are gated server-side; staff keep support access", () => {
  for (const route of [
    "GET me/athletes",
    "POST me/athletes",
    "GET athletes/:athleteId",
    "PATCH athletes/:athleteId",
    "DELETE me/athletes/:athleteId/link",
    "POST me/athletes/:athleteId/guardian-invitations",
    "DELETE me/athletes/:athleteId/guardian-invitations/:invitationId",
    "POST family-invitations/accept",
    "GET athletes/:athleteId/memberships",
    "GET athletes/:athleteId/memberships/:membershipId/billing",
    "GET me/schedule",
    "GET me/notifications",
    "POST me/notifications/:receiptId/read",
  ]) {
    assert.deepEqual(
      gateOf(route),
      { feature: "V1_PORTAL", staffBypass: true },
      route,
    );
  }
});

test("V1-launched and operational routes stay ungated", () => {
  for (const route of [
    "GET academy/offerings",
    "POST payments/webhooks/:provider",
    "POST admin/billing/reconcile-stale-checkouts",
    "GET me",
    "PUT me/guardian-profile",
    "PATCH me/preferences",
    "GET academy/registration-config",
    "GET academy/sessions",
    "POST academy/registrations",
    "POST academy/leads",
  ]) {
    assert.equal(gateOf(route), null, route);
  }
});

test("deferred features are enabled only by the exact server value 1", () => {
  for (const feature of ["V1_ENROLMENT", "V1_PORTAL"]) {
    const name = `KHLIM_ENABLE_${feature}`;
    assert.equal(isDeferredFeatureEnabled(feature, {}), false);
    for (const value of ["", "0", "true", "yes", "on", " 1", "1 ", "TRUE"]) {
      assert.equal(
        isDeferredFeatureEnabled(feature, { [name]: value }),
        false,
        `${name}=${JSON.stringify(value)}`,
      );
    }
    assert.equal(isDeferredFeatureEnabled(feature, { [name]: "1" }), true);
    // The browser presentation flag never authorizes the server.
    assert.equal(
      isDeferredFeatureEnabled(feature, {
        [`NEXT_PUBLIC_ENABLE_V1_${feature === "V1_ENROLMENT" ? "ENROLMENT" : "PORTAL"}`]:
          "1",
      }),
      false,
    );
  }
});
