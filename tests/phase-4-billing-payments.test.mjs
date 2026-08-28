import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("billing schema separates membership and payment state", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.match(schema, /model PaymentSchedule\s*\{/);
  assert.match(schema, /model PaymentInstallment\s*\{/);
  assert.match(schema, /model Payment\s*\{/);
  assert.match(schema, /model PaymentProviderEvent\s*\{/);
  assert.match(schema, /PaymentInstallmentStatus/);
  assert.match(schema, /SCHEDULED\n  PROCESSING\n  PAID\n  FAILED\n  OVERDUE/);
});

test("payment storage excludes raw card credentials", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.doesNotMatch(schema, /cardNumber|fullCard|cvv|cvc|pin/iu);
  assert.match(schema, /providerPaymentMethodReference/);
  assert.match(schema, /lastFour/);
});

test("gateway boundary refuses to fake production payment success", async () => {
  const gateway = await read("apps/api/src/billing/payment-gateway.ts");
  assert.match(gateway, /PaymentGatewayAdapter/);
  assert.match(gateway, /verifyWebhook/);
  assert.match(gateway, /No production payment provider adapter is configured/);
  assert.doesNotMatch(gateway, /return \{\s*checkoutUrl:.*success/i);
});

test("verified provider events are authoritative for membership activation", async () => {
  const service = await read("apps/api/src/billing/billing.service.ts");
  const controller = await read("apps/api/src/billing/billing.controller.ts");
  assert.match(service, /event\.eventType === "PAYMENT_FAILED"/);
  assert.match(service, /status: "ACTIVE"/);
  assert.match(service, /programmeOffering\.capacity/);
  assert.match(
    controller,
    /browser success redirect does not activate membership/,
  );
  assert.match(controller, /@Public\(\)/);
  assert.match(controller, /Raw webhook body is required/);
});

test("payment idempotency and provider-event deduplication are explicit", async () => {
  const schema = await read("prisma/schema.prisma");
  const service = await read("apps/api/src/billing/billing.service.ts");
  assert.match(schema, /idempotencyKey\s+String\s+@unique/);
  assert.match(schema, /@@unique\(\[provider, providerEventId\]\)/);
  assert.match(service, /membership:\$\{membershipId\}:installment:1/);
  assert.match(service, /isUniqueConstraintError/);
});

test("checkout retries can resume a persisted provider payment instead of duplicating it", async () => {
  const gateway = await read("apps/api/src/billing/payment-gateway.ts");
  const service = await read("apps/api/src/billing/billing.service.ts");
  assert.match(gateway, /providerPaymentId\?: string/);
  assert.match(
    service,
    /providerPaymentId:\s*payment\.providerPaymentId\s*\?\?\s*undefined/,
  );
});

test("payment state ordering protects settled money from stale provider events", async () => {
  const service = await read("apps/api/src/billing/billing.service.ts");
  assert.match(service, /payment\.status === "PAID"/);
  assert.match(service, /ignoredTerminalState: true/);
  assert.match(service, /PROVIDER_PAYMENT_ID_MISMATCH/);
  assert.match(service, /PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH/);
  assert.match(service, /settledAt: payment\.settledAt \?\? now/);
});

test("abandoned checkout holds have an MFA-protected reconciliation path", async () => {
  const service = await read("apps/api/src/billing/billing.service.ts");
  const controller = await read("apps/api/src/billing/billing.controller.ts");
  assert.match(service, /PAYMENT_CHECKOUT_HOLD_MINUTES/);
  assert.match(service, /reconcileStaleCheckoutHolds/);
  assert.match(service, /status: "CANCELLED", cancelledAt: now/);
  assert.match(controller, /admin\/billing\/reconcile-stale-checkouts/);
  assert.match(
    controller,
    /RequireAnyRole\("SUPER_ADMIN", "FINANCE_ADMIN", "MANAGEMENT"\)/,
  );
  assert.match(controller, /@RequireMfa\(\)/);
});
