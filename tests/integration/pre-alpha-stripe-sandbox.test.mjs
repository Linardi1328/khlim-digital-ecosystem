import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";

const apiRequire = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const require = createRequire(import.meta.url);

const Stripe = apiRequire("stripe");
const {
  BillingModule,
} = require("../../apps/api/dist/billing/billing.module.js");
const {
  PaymentGatewayRegistry,
} = require("../../apps/api/dist/billing/payment-gateway.js");
const {
  StripePaymentGatewayAdapter,
} = require("../../apps/api/dist/billing/stripe-payment-gateway.js");

const CONFIG_NAMES = [
  "PAYMENT_PROVIDER",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_CHECKOUT_SUCCESS_URL",
  "STRIPE_CHECKOUT_CANCEL_URL",
  "KHLIM_STRIPE_LIVE_TEST",
];

const TEST_CONFIG = Object.freeze({
  PAYMENT_PROVIDER: "stripe",
  STRIPE_SECRET_KEY: "sk_test_pre_alpha_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_pre_alpha_stripe_native_signature",
  STRIPE_CHECKOUT_SUCCESS_URL: "https://portal.example.test/payment/success",
  STRIPE_CHECKOUT_CANCEL_URL: "https://portal.example.test/payment/cancel",
});

function snapshotEnvironment() {
  return Object.fromEntries(CONFIG_NAMES.map((name) => [name, process.env[name]]));
}

function restoreEnvironment(snapshot) {
  for (const name of CONFIG_NAMES) {
    const value = snapshot[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function installTestConfiguration() {
  Object.assign(process.env, TEST_CONFIG);
}

function expectHttpError(status, messagePattern) {
  return (error) => {
    assert.equal(error?.getStatus?.(), status);
    assert.match(String(error?.message ?? error), messagePattern);
    return true;
  };
}

function stripeEventPayload({
  id,
  type,
  paymentIntentId,
  idempotencyKey,
  lastPaymentError,
}) {
  return JSON.stringify({
    id,
    object: "event",
    api_version: "2026-07-29.dahlia",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: paymentIntentId,
        object: "payment_intent",
        metadata: idempotencyKey
          ? { khlim_idempotency_key: idempotencyKey }
          : {},
        last_payment_error: lastPaymentError ?? null,
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  });
}

function signedHeader(stripe, payload, secret) {
  return stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp: Math.floor(Date.now() / 1000),
  });
}

test("Stripe adapter registers only with complete explicit configuration", () => {
  const snapshot = snapshotEnvironment();
  try {
    for (const name of CONFIG_NAMES) delete process.env[name];

    const missingAdapter = new StripePaymentGatewayAdapter();
    assert.equal(missingAdapter.isConfigured(), false);
    const missingRegistry = new PaymentGatewayRegistry();
    new BillingModule(missingRegistry, missingAdapter);
    assert.throws(
      () => missingRegistry.requireConfigured("stripe"),
      expectHttpError(503, /No production payment provider adapter is configured/),
    );

    installTestConfiguration();
    const configuredAdapter = new StripePaymentGatewayAdapter();
    assert.equal(configuredAdapter.isConfigured(), true);
    const configuredRegistry = new PaymentGatewayRegistry();
    new BillingModule(configuredRegistry, configuredAdapter);
    assert.equal(
      configuredRegistry.requireConfigured("stripe"),
      configuredAdapter,
    );
  } finally {
    restoreEnvironment(snapshot);
  }
});

test("Stripe adapter maps KHLIM customer, Checkout, and refund idempotency into Stripe-native requests", async () => {
  const snapshot = snapshotEnvironment();
  installTestConfiguration();

  const calls = {
    customers: [],
    checkout: [],
    refunds: [],
  };
  const adapter = new StripePaymentGatewayAdapter();
  adapter.client = {
    customers: {
      create: async (params, options) => {
        calls.customers.push({ params, options });
        return { id: "cus_pre_alpha_stripe" };
      },
    },
    checkout: {
      sessions: {
        create: async (params, options) => {
          calls.checkout.push({ params, options });
          return {
            id: "cs_test_pre_alpha",
            url: "https://checkout.stripe.com/c/pay/cs_test_pre_alpha",
            payment_intent: "pi_pre_alpha_checkout",
          };
        },
      },
    },
    refunds: {
      create: async (params, options) => {
        calls.refunds.push({ params, options });
        return { id: "re_pre_alpha" };
      },
    },
  };

  try {
    const customer = await adapter.createCustomer({
      khlimUserId: "11111111-1111-4111-8111-111111111111",
      email: "guardian.stripe@example.test",
      idempotencyKey: "billing-profile:guardian-stripe",
    });
    assert.equal(customer.providerCustomerId, "cus_pre_alpha_stripe");
    assert.deepEqual(calls.customers[0].params, {
      email: "guardian.stripe@example.test",
      metadata: {
        khlim_user_id: "11111111-1111-4111-8111-111111111111",
      },
    });
    assert.equal(
      calls.customers[0].options.idempotencyKey,
      "billing-profile:guardian-stripe",
    );

    const checkout = await adapter.createCheckout({
      providerCustomerId: customer.providerCustomerId,
      membershipId: "22222222-2222-4222-8222-222222222222",
      installmentId: "33333333-3333-4333-8333-333333333333",
      amountMinor: 25000,
      currency: "MYR",
      idempotencyKey:
        "membership:22222222-2222-4222-8222-222222222222:installment:1",
    });

    assert.equal(
      checkout.checkoutUrl,
      "https://checkout.stripe.com/c/pay/cs_test_pre_alpha",
    );
    assert.equal(checkout.providerPaymentId, "pi_pre_alpha_checkout");
    assert.equal(calls.checkout[0].params.mode, "payment");
    assert.equal(calls.checkout[0].params.customer, "cus_pre_alpha_stripe");
    assert.equal(calls.checkout[0].params.line_items.length, 1);
    assert.equal(calls.checkout[0].params.line_items[0].quantity, 1);
    assert.equal(
      calls.checkout[0].params.line_items[0].price_data.currency,
      "myr",
    );
    assert.equal(
      calls.checkout[0].params.line_items[0].price_data.unit_amount,
      25000,
    );
    assert.equal(
      calls.checkout[0].params.metadata.khlim_idempotency_key,
      calls.checkout[0].options.idempotencyKey,
    );
    assert.deepEqual(
      calls.checkout[0].params.payment_intent_data.metadata,
      calls.checkout[0].params.metadata,
    );
    assert.equal(
      calls.checkout[0].params.success_url,
      TEST_CONFIG.STRIPE_CHECKOUT_SUCCESS_URL,
    );
    assert.equal(
      calls.checkout[0].params.cancel_url,
      TEST_CONFIG.STRIPE_CHECKOUT_CANCEL_URL,
    );

    await adapter.refund({
      providerPaymentId: "pi_pre_alpha_checkout",
      amountMinor: 12500,
      idempotencyKey: "refund:payment-pre-alpha:1",
    });
    assert.deepEqual(calls.refunds[0].params, {
      payment_intent: "pi_pre_alpha_checkout",
      amount: 12500,
      metadata: { khlim_idempotency_key: "refund:payment-pre-alpha:1" },
    });
    assert.equal(
      calls.refunds[0].options.idempotencyKey,
      "refund:payment-pre-alpha:1",
    );
  } finally {
    restoreEnvironment(snapshot);
  }
});

test("Stripe-native webhook signatures normalize authoritative payment intent events and reject tampering", async () => {
  const snapshot = snapshotEnvironment();
  installTestConfiguration();

  try {
    const adapter = new StripePaymentGatewayAdapter();
    const stripe = new Stripe(TEST_CONFIG.STRIPE_SECRET_KEY);
    const idempotencyKey = "membership:stripe-native:installment:1";

    const successPayload = stripeEventPayload({
      id: "evt_pre_alpha_stripe_success",
      type: "payment_intent.succeeded",
      paymentIntentId: "pi_pre_alpha_stripe_success",
      idempotencyKey,
    });
    const success = await adapter.verifyWebhook({
      headers: {
        "stripe-signature": signedHeader(
          stripe,
          successPayload,
          TEST_CONFIG.STRIPE_WEBHOOK_SECRET,
        ),
      },
      rawBody: Buffer.from(successPayload, "utf8"),
    });
    assert.deepEqual(success, {
      providerEventId: "evt_pre_alpha_stripe_success",
      eventType: "PAYMENT_SUCCEEDED",
      idempotencyKey,
      providerPaymentId: "pi_pre_alpha_stripe_success",
    });

    const failedPayload = stripeEventPayload({
      id: "evt_pre_alpha_stripe_failed",
      type: "payment_intent.payment_failed",
      paymentIntentId: "pi_pre_alpha_stripe_failed",
      idempotencyKey,
      lastPaymentError: {
        code: "card_declined",
        decline_code: "generic_decline",
      },
    });
    const failed = await adapter.verifyWebhook({
      headers: {
        "Stripe-Signature": signedHeader(
          stripe,
          failedPayload,
          TEST_CONFIG.STRIPE_WEBHOOK_SECRET,
        ),
      },
      rawBody: Buffer.from(failedPayload, "utf8"),
    });
    assert.deepEqual(failed, {
      providerEventId: "evt_pre_alpha_stripe_failed",
      eventType: "PAYMENT_FAILED",
      idempotencyKey,
      providerPaymentId: "pi_pre_alpha_stripe_failed",
      failureCode: "card_declined",
      safeFailureReason: "generic_decline",
    });

    const originalHeader = signedHeader(
      stripe,
      successPayload,
      TEST_CONFIG.STRIPE_WEBHOOK_SECRET,
    );
    const tamperedPayload = successPayload.replace(
      "pi_pre_alpha_stripe_success",
      "pi_tampered_stripe_success",
    );
    await assert.rejects(
      () =>
        adapter.verifyWebhook({
          headers: { "stripe-signature": originalHeader },
          rawBody: Buffer.from(tamperedPayload, "utf8"),
        }),
      expectHttpError(400, /Stripe webhook signature is invalid/),
    );

    const incompletePayload = stripeEventPayload({
      id: "evt_pre_alpha_stripe_incomplete",
      type: "payment_intent.succeeded",
      paymentIntentId: "pi_pre_alpha_stripe_incomplete",
    });
    await assert.rejects(
      () =>
        adapter.verifyWebhook({
          headers: {
            "stripe-signature": signedHeader(
              stripe,
              incompletePayload,
              TEST_CONFIG.STRIPE_WEBHOOK_SECRET,
            ),
          },
          rawBody: Buffer.from(incompletePayload, "utf8"),
        }),
      expectHttpError(400, /Stripe payment metadata is incomplete/),
    );

    const unsupportedPayload = stripeEventPayload({
      id: "evt_pre_alpha_stripe_unsupported",
      type: "charge.refunded",
      paymentIntentId: "pi_pre_alpha_stripe_unsupported",
      idempotencyKey,
    });
    await assert.rejects(
      () =>
        adapter.verifyWebhook({
          headers: {
            "stripe-signature": signedHeader(
              stripe,
              unsupportedPayload,
              TEST_CONFIG.STRIPE_WEBHOOK_SECRET,
            ),
          },
          rawBody: Buffer.from(unsupportedPayload, "utf8"),
        }),
      expectHttpError(400, /Unsupported Stripe payment event type/),
    );
  } finally {
    restoreEnvironment(snapshot);
  }
});

const liveStripeEnabled = process.env.KHLIM_STRIPE_LIVE_TEST === "1";

test(
  "optional live Stripe test-mode smoke creates hosted Checkout and executes a native refund",
  {
    skip: liveStripeEnabled
      ? false
      : "Set KHLIM_STRIPE_LIVE_TEST=1 with Stripe test credentials to run",
  },
  async () => {
    assert.match(process.env.STRIPE_SECRET_KEY ?? "", /^sk_test_/);
    assert.ok(process.env.STRIPE_WEBHOOK_SECRET);
    assert.ok(process.env.STRIPE_CHECKOUT_SUCCESS_URL);
    assert.ok(process.env.STRIPE_CHECKOUT_CANCEL_URL);

    const adapter = new StripePaymentGatewayAdapter();
    const nonce = randomUUID();
    const customer = await adapter.createCustomer({
      khlimUserId: nonce,
      email: null,
      idempotencyKey: `pre-alpha-live-customer:${nonce}`,
    });
    assert.match(customer.providerCustomerId, /^cus_/);

    const checkout = await adapter.createCheckout({
      providerCustomerId: customer.providerCustomerId,
      membershipId: nonce,
      installmentId: randomUUID(),
      amountMinor: 300,
      currency: "MYR",
      idempotencyKey: `pre-alpha-live-checkout:${nonce}`,
    });
    assert.match(checkout.checkoutUrl, /^https:\/\/checkout\.stripe\.com\//);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: 300,
        currency: "myr",
        payment_method: "pm_card_visa",
        payment_method_types: ["card"],
        confirm: true,
        metadata: { khlim_idempotency_key: `pre-alpha-live-refund:${nonce}` },
      },
      { idempotencyKey: `pre-alpha-live-payment:${nonce}` },
    );
    assert.equal(paymentIntent.status, "succeeded");

    await adapter.refund({
      providerPaymentId: paymentIntent.id,
      idempotencyKey: `pre-alpha-live-refund:${nonce}`,
    });
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntent.id,
      limit: 10,
    });
    assert.equal(refunds.data.length, 1);
    assert.equal(refunds.data[0].payment_intent, paymentIntent.id);
  },
);
