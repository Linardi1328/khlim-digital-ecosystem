import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  BillplzPaymentGatewayAdapter,
  createBillplzPaymentGatewayFromEnv,
} = require("../../apps/api/dist/billing/billplz-payment-gateway.js");
const {
  PaymentGatewayRegistry,
} = require("../../apps/api/dist/billing/payment-gateway.js");

const COLLECTION_ID = "khlim-sandbox-collection";
const CALLBACK_URL = "https://api.example.test/v1/payments/webhooks/billplz";
const REDIRECT_URL = "https://portal.example.test/payment/confirmation";
const SECRET_KEY = "billplz-sandbox-secret";
const X_SIGNATURE_KEY = "billplz-sandbox-x-signature";
const AMOUNT_MINOR = 25000;
const IDEMPOTENCY_KEY =
  "membership:70000000-0000-4000-8000-000000000001:installment:1";

function makeAdapter(overrides = {}) {
  return new BillplzPaymentGatewayAdapter({
    secretKey: SECRET_KEY,
    collectionId: COLLECTION_ID,
    xSignatureKey: X_SIGNATURE_KEY,
    callbackUrl: CALLBACK_URL,
    redirectUrl: REDIRECT_URL,
    sandbox: true,
    ...overrides,
  });
}

function checkoutInput(overrides = {}) {
  return {
    providerCustomerId: "khlim-user:70000000-0000-4000-8000-000000000010",
    payerEmail: "guardian@example.test",
    membershipId: "70000000-0000-4000-8000-000000000001",
    installmentId: "70000000-0000-4000-8000-000000000002",
    amountMinor: AMOUNT_MINOR,
    currency: "MYR",
    idempotencyKey: IDEMPOTENCY_KEY,
    ...overrides,
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function signedBody(adapter, values) {
  const params = new URLSearchParams(values);
  params.set("x_signature", adapter.signCallback(params));
  return Buffer.from(params.toString(), "utf8");
}

function validCallbackValues(overrides = {}) {
  return {
    id: "bill-khlim-success",
    collection_id: COLLECTION_ID,
    paid: "true",
    state: "paid",
    amount: String(AMOUNT_MINOR),
    paid_amount: String(AMOUNT_MINOR),
    due_at: "2026-08-28",
    email: "guardian@example.test",
    mobile: "",
    name: "KHLIM Member",
    url: "https://www.billplz-sandbox.com/bills/bill-khlim-success",
    paid_at: "2026-08-28 10:00:00 +0800",
    reference_2_label: "KHLIM Payment",
    reference_2: `${IDEMPOTENCY_KEY}|${AMOUNT_MINOR}|MYR`,
    ...overrides,
  };
}

test("Billplz configuration remains explicit and fail-closed", () => {
  assert.equal(
    createBillplzPaymentGatewayFromEnv({ PAYMENT_PROVIDER: "stripe" }),
    null,
  );
  assert.equal(
    createBillplzPaymentGatewayFromEnv({ PAYMENT_PROVIDER: "billplz" }),
    null,
  );

  const adapter = createBillplzPaymentGatewayFromEnv({
    PAYMENT_PROVIDER: "billplz",
    BILLPLZ_SECRET_KEY: SECRET_KEY,
    BILLPLZ_COLLECTION_ID: COLLECTION_ID,
    BILLPLZ_X_SIGNATURE_KEY: X_SIGNATURE_KEY,
    BILLPLZ_CALLBACK_URL: CALLBACK_URL,
    BILLPLZ_REDIRECT_URL: REDIRECT_URL,
    BILLPLZ_SANDBOX: "1",
  });
  assert.ok(adapter);
  assert.equal(adapter.provider, "billplz");

  const registry = new PaymentGatewayRegistry();
  assert.throws(
    () => registry.requireConfigured("billplz"),
    /No production payment provider adapter is configured/,
  );
  registry.register(adapter);
  assert.equal(registry.requireConfigured("billplz"), adapter);
});

test("Billplz checkout maps KHLIM billing data into the sandbox Bills API", async () => {
  const calls = [];
  const adapter = makeAdapter({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "bill-khlim-001",
        url: "https://www.billplz-sandbox.com/bills/bill-khlim-001",
      });
    },
  });

  const customer = await adapter.createCustomer({
    khlimUserId: "70000000-0000-4000-8000-000000000010",
    email: "guardian@example.test",
    idempotencyKey: "billing-profile:guardian",
  });
  assert.equal(
    customer.providerCustomerId,
    "khlim-user:70000000-0000-4000-8000-000000000010",
  );

  const checkout = await adapter.createCheckout(checkoutInput());
  assert.equal(checkout.providerPaymentId, "bill-khlim-001");
  assert.equal(
    checkout.checkoutUrl,
    "https://www.billplz-sandbox.com/bills/bill-khlim-001",
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://www.billplz-sandbox.com/api/v3/bills");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(
    calls[0].init.headers.authorization,
    `Basic ${Buffer.from(`${SECRET_KEY}:`, "utf8").toString("base64")}`,
  );

  const form = new URLSearchParams(calls[0].init.body.toString());
  assert.equal(form.get("collection_id"), COLLECTION_ID);
  assert.equal(form.get("email"), "guardian@example.test");
  assert.equal(form.get("amount"), String(AMOUNT_MINOR));
  assert.equal(form.get("callback_url"), CALLBACK_URL);
  assert.equal(form.get("redirect_url"), REDIRECT_URL);
  assert.equal(form.get("reference_1"), null);
  assert.equal(form.get("reference_2_label"), "KHLIM Payment");
  assert.equal(
    form.get("reference_2"),
    `${IDEMPOTENCY_KEY}|${AMOUNT_MINOR}|MYR`,
  );
});

test("Billplz retries resume the persisted Bill instead of creating a duplicate", async () => {
  let networkCalls = 0;
  const adapter = makeAdapter({
    fetchImpl: async () => {
      networkCalls += 1;
      return jsonResponse({
        id: "bill-khlim-retry",
        url: "https://www.billplz-sandbox.com/bills/bill-khlim-retry",
      });
    },
  });

  const first = await adapter.createCheckout(checkoutInput());
  const retry = await adapter.createCheckout(
    checkoutInput({ providerPaymentId: first.providerPaymentId }),
  );

  assert.equal(networkCalls, 1);
  assert.equal(retry.providerPaymentId, first.providerPaymentId);
  assert.equal(retry.checkoutUrl, first.checkoutUrl);
});

test("Billplz direct gateway mode supports DuitNow QR and FPX bank codes", async (t) => {
  for (const directGatewayCode of ["BP-RHBQR", "MB2U0227"]) {
    await t.test(directGatewayCode, async () => {
      const calls = [];
      const adapter = makeAdapter({
        directGatewayCode,
        fetchImpl: async (url, init) => {
          calls.push({ url, init });
          return jsonResponse({
            id: `bill-${directGatewayCode}`,
            url: `https://www.billplz-sandbox.com/bills/bill-${directGatewayCode}`,
          });
        },
      });

      const checkout = await adapter.createCheckout(checkoutInput());
      assert.equal(calls.length, 1);
      const form = new URLSearchParams(calls[0].init.body.toString());
      assert.equal(form.get("reference_1_label"), "Bank Code");
      assert.equal(form.get("reference_1"), directGatewayCode);
      assert.match(checkout.checkoutUrl, /\?auto_submit=true$/);

      const resumed = await adapter.createCheckout(
        checkoutInput({ providerPaymentId: checkout.providerPaymentId }),
      );
      assert.equal(calls.length, 1);
      assert.equal(resumed.checkoutUrl, checkout.checkoutUrl);
    });
  }
});

test("Billplz checkout fails closed for unsupported currency, missing payer email, and provider errors", async () => {
  const noNetwork = makeAdapter({
    fetchImpl: async () => {
      throw new Error("network should not be called");
    },
  });

  await assert.rejects(
    noNetwork.createCheckout(checkoutInput({ currency: "USD" })),
    /Billplz checkout supports MYR only/,
  );
  await assert.rejects(
    noNetwork.createCheckout(checkoutInput({ payerEmail: null })),
    /Billplz checkout requires an email address/,
  );

  const providerError = makeAdapter({
    fetchImpl: async () =>
      jsonResponse(
        { error: { type: "RecordNotFound", message: ["Collection not found"] } },
        422,
      ),
  });
  await assert.rejects(
    providerError.createCheckout(checkoutInput()),
    /Collection not found/,
  );
});

test("Billplz X-Signature implementation matches the provider's published example", () => {
  const adapter = makeAdapter({
    xSignatureKey: "S-s7b4yWpp9h7rrkNM1i3Z_g",
  });
  const params = new URLSearchParams({
    id: "zq0tm2wc",
    collection_id: "yhx5t1pp",
    paid: "true",
    state: "paid",
    amount: "100",
    paid_amount: "100",
    due_at: "2018-9-27",
    email: "tester@test.com",
    mobile: "",
    name: "TESTER",
    url: "http://www.billplz-sandbox.com/bills/zq0tm2wc",
    paid_at: "2018-09-27 15:15:09 +0800",
  });

  assert.equal(
    adapter.signCallback(params),
    "0fe0a20b8d557eeae570377783d062a3816a9ea80f368860bacfa7ec3ca4d00e",
  );
});

test("Billplz signed callbacks normalize successful and failed local payments", async () => {
  const adapter = makeAdapter();

  const successRaw = signedBody(adapter, validCallbackValues());
  const success = await adapter.verifyWebhook({ headers: {}, rawBody: successRaw });
  assert.equal(success.eventType, "PAYMENT_SUCCEEDED");
  assert.equal(success.idempotencyKey, IDEMPOTENCY_KEY);
  assert.equal(success.providerPaymentId, "bill-khlim-success");
  assert.equal(success.amountMinor, AMOUNT_MINOR);
  assert.equal(success.currency, "MYR");
  assert.equal(
    success.providerEventId,
    "bill:bill-khlim-success:paid:true:2026-08-28 10:00:00 +0800",
  );

  const duplicate = await adapter.verifyWebhook({
    headers: {},
    rawBody: successRaw,
  });
  assert.equal(duplicate.providerEventId, success.providerEventId);

  const failureRaw = signedBody(
    adapter,
    validCallbackValues({
      id: "bill-khlim-failed",
      paid: "false",
      state: "due",
      paid_amount: "0",
      paid_at: "",
      url: "https://www.billplz-sandbox.com/bills/bill-khlim-failed",
    }),
  );
  const failure = await adapter.verifyWebhook({
    headers: {},
    rawBody: failureRaw,
  });
  assert.equal(failure.eventType, "PAYMENT_FAILED");
  assert.equal(failure.failureCode, "due");
  assert.match(failure.safeFailureReason, /not completed/);
});

test("Billplz callbacks reject missing signatures, tampering, wrong Collections, and amount mismatches", async () => {
  const adapter = makeAdapter();

  const unsigned = new URLSearchParams(validCallbackValues());
  await assert.rejects(
    adapter.verifyWebhook({
      headers: {},
      rawBody: Buffer.from(unsigned.toString(), "utf8"),
    }),
    /x_signature is required/,
  );

  const tampered = new URLSearchParams(validCallbackValues());
  tampered.set("x_signature", adapter.signCallback(tampered));
  tampered.set("paid_amount", "1");
  await assert.rejects(
    adapter.verifyWebhook({
      headers: {},
      rawBody: Buffer.from(tampered.toString(), "utf8"),
    }),
    /signature is invalid/,
  );

  const wrongCollection = signedBody(
    adapter,
    validCallbackValues({ collection_id: "different-collection" }),
  );
  await assert.rejects(
    adapter.verifyWebhook({ headers: {}, rawBody: wrongCollection }),
    /missing required KHLIM payment metadata/,
  );

  const wrongReferenceAmount = signedBody(
    adapter,
    validCallbackValues({
      reference_2: `${IDEMPOTENCY_KEY}|24999|MYR`,
    }),
  );
  await assert.rejects(
    adapter.verifyWebhook({ headers: {}, rawBody: wrongReferenceAmount }),
    /callback amount does not match the KHLIM payment reference/,
  );

  const partialPaid = signedBody(
    adapter,
    validCallbackValues({ paid_amount: "24999" }),
  );
  await assert.rejects(
    adapter.verifyWebhook({ headers: {}, rawBody: partialPaid }),
    /paid callback amount does not match the Bill amount/,
  );
});

test("Billplz refund path stays fail-closed because FPX refunds require a separate disbursement", async () => {
  const adapter = makeAdapter();
  await assert.rejects(
    adapter.refund({
      providerPaymentId: "bill-khlim-success",
      amountMinor: AMOUNT_MINOR,
      idempotencyKey: "refund:bill-khlim-success",
    }),
    /Payment Order disbursement flow/,
  );
});

test(
  "opt-in live Billplz sandbox smoke creates a real sandbox Bill",
  {
    skip:
      process.env.KHLIM_BILLPLZ_LIVE_TEST === "1"
        ? false
        : "Set KHLIM_BILLPLZ_LIVE_TEST=1 with Billplz sandbox credentials to run",
  },
  async () => {
    assert.notEqual(
      process.env.BILLPLZ_SANDBOX,
      "0",
      "Live pre-alpha smoke must never target Billplz production",
    );

    const adapter = createBillplzPaymentGatewayFromEnv({
      ...process.env,
      PAYMENT_PROVIDER: "billplz",
      BILLPLZ_SANDBOX: "1",
    });
    assert.ok(adapter, "Complete Billplz sandbox configuration is required");

    const customer = await adapter.createCustomer({
      khlimUserId: `live-billplz-${Date.now()}`,
      email: "pre-alpha-billplz@example.test",
      idempotencyKey: `billing-profile:live-${Date.now()}`,
    });
    const checkout = await adapter.createCheckout({
      providerCustomerId: customer.providerCustomerId,
      payerEmail: "pre-alpha-billplz@example.test",
      membershipId: `live-billplz-${Date.now()}`,
      installmentId: `live-installment-${Date.now()}`,
      amountMinor: 100,
      currency: "MYR",
      idempotencyKey: `live-billplz:${Date.now()}`,
    });

    assert.match(checkout.checkoutUrl, /^https:\/\/www\.billplz-sandbox\.com\/bills\//);
    assert.ok(checkout.providerPaymentId);
  },
);
