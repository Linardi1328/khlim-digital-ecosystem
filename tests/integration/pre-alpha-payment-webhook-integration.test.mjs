import assert from "node:assert/strict";
import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";

const apiRequire = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const require = createRequire(import.meta.url);

const { BadRequestException, UnauthorizedException } =
  apiRequire("@nestjs/common");
const { NestFactory } = apiRequire("@nestjs/core");
const { AppModule } = require("../../apps/api/dist/app.module.js");
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const {
  BillingService,
} = require("../../apps/api/dist/billing/billing.service.js");
const {
  PaymentGatewayRegistry,
} = require("../../apps/api/dist/billing/payment-gateway.js");

const SIGNATURE_HEADER = "x-khlim-sandbox-signature";
const AMOUNT_MINOR = 25000;

const IDS = Object.freeze({
  payer: "70000000-0000-4000-8000-000000000001",
  athleteCheckout: "70000000-0000-4000-8000-000000000002",
  athleteFailure: "70000000-0000-4000-8000-000000000003",
  athleteRetry: "70000000-0000-4000-8000-000000000004",
  athleteConcurrent: "70000000-0000-4000-8000-000000000005",
  athleteCapacityTarget: "70000000-0000-4000-8000-000000000006",
  athleteCapacityFiller: "70000000-0000-4000-8000-000000000007",
  sport: "70000000-0000-4000-8000-000000000010",
  programme: "70000000-0000-4000-8000-000000000011",
  offeringGeneral: "70000000-0000-4000-8000-000000000012",
  offeringCapacity: "70000000-0000-4000-8000-000000000013",
  plan: "70000000-0000-4000-8000-000000000014",
  membershipCheckout: "70000000-0000-4000-8000-000000000021",
  membershipFailure: "70000000-0000-4000-8000-000000000022",
  membershipRetry: "70000000-0000-4000-8000-000000000023",
  membershipConcurrent: "70000000-0000-4000-8000-000000000024",
  membershipCapacityTarget: "70000000-0000-4000-8000-000000000025",
  membershipCapacityFiller: "70000000-0000-4000-8000-000000000026",
  scheduleFailure: "70000000-0000-4000-8000-000000000031",
  scheduleRetry: "70000000-0000-4000-8000-000000000032",
  scheduleConcurrent: "70000000-0000-4000-8000-000000000033",
  scheduleCapacity: "70000000-0000-4000-8000-000000000034",
  installmentFailure: "70000000-0000-4000-8000-000000000041",
  installmentRetry: "70000000-0000-4000-8000-000000000042",
  installmentConcurrent: "70000000-0000-4000-8000-000000000043",
  installmentCapacity: "70000000-0000-4000-8000-000000000044",
  paymentFailure: "70000000-0000-4000-8000-000000000051",
  paymentRetry: "70000000-0000-4000-8000-000000000052",
  paymentConcurrent: "70000000-0000-4000-8000-000000000053",
  paymentCapacity: "70000000-0000-4000-8000-000000000054",
});

const MEMBERSHIP_IDS = [
  IDS.membershipCheckout,
  IDS.membershipFailure,
  IDS.membershipRetry,
  IDS.membershipConcurrent,
  IDS.membershipCapacityTarget,
  IDS.membershipCapacityFiller,
];

const ATHLETE_IDS = [
  IDS.athleteCheckout,
  IDS.athleteFailure,
  IDS.athleteRetry,
  IDS.athleteConcurrent,
  IDS.athleteCapacityTarget,
  IDS.athleteCapacityFiller,
];

const KEYS = Object.freeze({
  failure: `membership:${IDS.membershipFailure}:installment:1`,
  retry: `membership:${IDS.membershipRetry}:installment:1`,
  concurrent: `membership:${IDS.membershipConcurrent}:installment:1`,
  capacity: `membership:${IDS.membershipCapacityTarget}:installment:1`,
});

class SandboxPaymentGatewayAdapter {
  provider = "sandbox";

  constructor(secret) {
    this.secret = secret;
    this.customerCalls = [];
    this.checkoutCalls = [];
    this.refundCalls = [];
    this.checkoutByIdempotencyKey = new Map();
  }

  sign(rawBody) {
    return createHmac("sha256", this.secret).update(rawBody).digest("hex");
  }

  async createCustomer(input) {
    this.customerCalls.push(input);
    return {
      providerCustomerId: `sandbox-customer-${input.khlimUserId.slice(-12)}`,
    };
  }

  async createCheckout(input) {
    this.checkoutCalls.push(input);
    let result = this.checkoutByIdempotencyKey.get(input.idempotencyKey);
    if (!result) {
      const digest = createHash("sha256")
        .update(input.idempotencyKey)
        .digest("hex")
        .slice(0, 16);
      result = {
        checkoutUrl: `https://sandbox.example.test/checkout/${digest}`,
        providerPaymentId: `sandbox-payment-${digest}`,
      };
      this.checkoutByIdempotencyKey.set(input.idempotencyKey, result);
    }
    return result;
  }

  async verifyWebhook({ headers, rawBody }) {
    const headerValue = headers[SIGNATURE_HEADER];
    const signature = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!signature) {
      throw new UnauthorizedException("Sandbox webhook signature is required");
    }

    const expected = Buffer.from(this.sign(rawBody), "utf8");
    const supplied = Buffer.from(signature, "utf8");
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new UnauthorizedException("Sandbox webhook signature is invalid");
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Sandbox webhook body is malformed");
    }

    if (
      typeof payload?.providerEventId !== "string" ||
      typeof payload?.idempotencyKey !== "string"
    ) {
      throw new BadRequestException("Sandbox webhook identifiers are required");
    }

    if (
      payload.eventType !== "PAYMENT_SUCCEEDED" &&
      payload.eventType !== "PAYMENT_FAILED"
    ) {
      throw new BadRequestException("Unsupported sandbox payment event type");
    }

    return {
      providerEventId: payload.providerEventId,
      eventType: payload.eventType,
      idempotencyKey: payload.idempotencyKey,
      providerPaymentId:
        typeof payload.providerPaymentId === "string"
          ? payload.providerPaymentId
          : undefined,
      failureCode:
        typeof payload.failureCode === "string"
          ? payload.failureCode
          : undefined,
      safeFailureReason:
        typeof payload.safeFailureReason === "string"
          ? payload.safeFailureReason
          : undefined,
    };
  }

  async refund(input) {
    this.refundCalls.push(input);
  }
}

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for payment webhook integration tests",
    );
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      "Payment webhook integration tests require a database whose name contains 'test'",
    );
  }

  return true;
}

async function cleanup(client) {
  await client.paymentProviderEvent.deleteMany({
    where: { provider: "sandbox" },
  });
  await client.payment.deleteMany({ where: { payerUserId: IDS.payer } });
  await client.membershipAgreement.deleteMany({
    where: { membershipId: { in: MEMBERSHIP_IDS } },
  });
  await client.paymentSchedule.deleteMany({
    where: { membershipId: { in: MEMBERSHIP_IDS } },
  });
  await client.billingProfile.deleteMany({ where: { userId: IDS.payer } });
  await client.membership.deleteMany({ where: { id: { in: MEMBERSHIP_IDS } } });
  await client.athleteProfile.deleteMany({ where: { id: { in: ATHLETE_IDS } } });
  await client.programmeOffering.deleteMany({
    where: { id: { in: [IDS.offeringGeneral, IDS.offeringCapacity] } },
  });
  await client.membershipPlan.deleteMany({ where: { id: IDS.plan } });
  await client.programme.deleteMany({ where: { id: IDS.programme } });
  await client.sport.deleteMany({ where: { id: IDS.sport } });
  await client.user.deleteMany({ where: { id: IDS.payer } });
}

async function createPaymentFixture(
  client,
  { membershipId, scheduleId, installmentId, paymentId, idempotencyKey },
) {
  await client.paymentSchedule.create({
    data: {
      id: scheduleId,
      membershipId,
      frequency: "UPFRONT",
      installmentCount: 1,
      amountPerInstallmentMinor: AMOUNT_MINOR,
      currency: "MYR",
      startsAt: new Date(),
      status: "ACTIVE",
    },
  });
  await client.paymentInstallment.create({
    data: {
      id: installmentId,
      paymentScheduleId: scheduleId,
      sequenceNumber: 1,
      dueAt: new Date(),
      amountMinor: AMOUNT_MINOR,
      currency: "MYR",
      status: "PROCESSING",
    },
  });
  await client.payment.create({
    data: {
      id: paymentId,
      payerUserId: IDS.payer,
      membershipId,
      paymentInstallmentId: installmentId,
      provider: "sandbox",
      providerPaymentId: `sandbox-seeded-${paymentId.slice(-12)}`,
      idempotencyKey,
      amountMinor: AMOUNT_MINOR,
      currency: "MYR",
      status: "PROCESSING",
    },
  });
}

async function seed(client) {
  await client.user.create({
    data: {
      id: IDS.payer,
      authProviderSubject: "pre-alpha-payment-payer",
      email: "payer.payment-webhook@example.test",
    },
  });

  await client.athleteProfile.createMany({
    data: ATHLETE_IDS.map((id, index) => ({
      id,
      displayName: `Payment Athlete ${index + 1}`,
      dateOfBirth: new Date("2014-01-15T00:00:00.000Z"),
    })),
  });

  await client.sport.create({
    data: {
      id: IDS.sport,
      code: "PREALPHA_PAYMENT",
      defaultName: "Pre-Alpha Payment Basketball",
    },
  });
  await client.programme.create({
    data: {
      id: IDS.programme,
      sportId: IDS.sport,
      code: "PREALPHA_PAYMENT_PROGRAMME",
      name: "Pre-Alpha Payment Programme",
    },
  });
  await client.programmeOffering.createMany({
    data: [
      {
        id: IDS.offeringGeneral,
        programmeId: IDS.programme,
        name: "Pre-Alpha Payment General Offering",
        capacity: 20,
        status: "OPEN",
      },
      {
        id: IDS.offeringCapacity,
        programmeId: IDS.programme,
        name: "Pre-Alpha Payment Capacity Offering",
        capacity: 1,
        status: "OPEN",
      },
    ],
  });
  await client.membershipPlan.create({
    data: {
      id: IDS.plan,
      name: "Pre-Alpha Upfront Payment Plan",
      durationMonths: 1,
      commitmentCycles: 1,
      billingFrequency: "UPFRONT",
      upfrontAmountMinor: AMOUNT_MINOR,
      currency: "MYR",
    },
  });

  await client.membership.createMany({
    data: [
      {
        id: IDS.membershipCheckout,
        athleteId: IDS.athleteCheckout,
        programmeOfferingId: IDS.offeringGeneral,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.membershipFailure,
        athleteId: IDS.athleteFailure,
        programmeOfferingId: IDS.offeringGeneral,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.membershipRetry,
        athleteId: IDS.athleteRetry,
        programmeOfferingId: IDS.offeringGeneral,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.membershipConcurrent,
        athleteId: IDS.athleteConcurrent,
        programmeOfferingId: IDS.offeringGeneral,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.membershipCapacityTarget,
        athleteId: IDS.athleteCapacityTarget,
        programmeOfferingId: IDS.offeringCapacity,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.membershipCapacityFiller,
        athleteId: IDS.athleteCapacityFiller,
        programmeOfferingId: IDS.offeringCapacity,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "ACTIVE",
        startsAt: new Date(),
        activatedAt: new Date(),
      },
    ],
  });

  await createPaymentFixture(client, {
    membershipId: IDS.membershipFailure,
    scheduleId: IDS.scheduleFailure,
    installmentId: IDS.installmentFailure,
    paymentId: IDS.paymentFailure,
    idempotencyKey: KEYS.failure,
  });
  await createPaymentFixture(client, {
    membershipId: IDS.membershipRetry,
    scheduleId: IDS.scheduleRetry,
    installmentId: IDS.installmentRetry,
    paymentId: IDS.paymentRetry,
    idempotencyKey: KEYS.retry,
  });
  await createPaymentFixture(client, {
    membershipId: IDS.membershipConcurrent,
    scheduleId: IDS.scheduleConcurrent,
    installmentId: IDS.installmentConcurrent,
    paymentId: IDS.paymentConcurrent,
    idempotencyKey: KEYS.concurrent,
  });
  await createPaymentFixture(client, {
    membershipId: IDS.membershipCapacityTarget,
    scheduleId: IDS.scheduleCapacity,
    installmentId: IDS.installmentCapacity,
    paymentId: IDS.paymentCapacity,
    idempotencyKey: KEYS.capacity,
  });
}

async function webhookRequest(baseUrl, adapter, payload, options = {}) {
  const rawBody =
    options.rawBody ?? Buffer.from(JSON.stringify(payload), "utf8");
  const headers = new Headers({ "content-type": "application/json" });

  if (options.sign !== false) {
    headers.set(
      SIGNATURE_HEADER,
      options.signature ?? adapter.sign(rawBody),
    );
  }

  const response = await fetch(`${baseUrl}/v1/payments/webhooks/sandbox`, {
    method: "POST",
    headers,
    body: rawBody,
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { response, body, rawBody };
}

function assertError(result, status, messagePattern) {
  assert.equal(result.response.status, status);
  assert.match(String(result.body?.message ?? result.body), messagePattern);
}

const enabled = databaseTestsEnabled();

test(
  "pre-alpha payment webhooks preserve verified, idempotent membership state",
  { skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests" },
  async (t) => {
    const previousPaymentProvider = process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_PROVIDER = "sandbox";

    const app = await NestFactory.create(AppModule, {
      logger: false,
      rawBody: true,
    });
    app.setGlobalPrefix("v1");

    const prisma = app.get(PrismaService);
    const client = prisma.client;
    const billing = app.get(BillingService);
    const gateways = app.get(PaymentGatewayRegistry);
    const adapter = new SandboxPaymentGatewayAdapter(
      "pre-alpha-payment-webhook-secret",
    );
    gateways.register(adapter);

    await cleanup(client);
    await seed(client);
    await app.listen(0, "127.0.0.1");

    const address = app.getHttpServer().address();
    assert.equal(typeof address, "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      await t.test(
        "checkout remains pending and reuses server-authoritative payment records",
        async () => {
          const first = await billing.prepareMembershipCheckout(
            IDS.payer,
            IDS.athleteCheckout,
            IDS.membershipCheckout,
            { acceptTerms: true },
          );
          const second = await billing.prepareMembershipCheckout(
            IDS.payer,
            IDS.athleteCheckout,
            IDS.membershipCheckout,
            { acceptTerms: true },
          );

          assert.equal(first.paymentId, second.paymentId);
          assert.equal(first.paymentScheduleId, second.paymentScheduleId);
          assert.equal(first.checkoutUrl, second.checkoutUrl);

          const membership = await client.membership.findUnique({
            where: { id: IDS.membershipCheckout },
          });
          assert.equal(membership?.status, "PENDING");
          assert.equal(membership?.activatedAt, null);

          assert.equal(
            await client.paymentSchedule.count({
              where: { membershipId: IDS.membershipCheckout },
            }),
            1,
          );
          assert.equal(
            await client.membershipAgreement.count({
              where: { membershipId: IDS.membershipCheckout },
            }),
            1,
          );
          assert.equal(
            await client.payment.count({
              where: { membershipId: IDS.membershipCheckout },
            }),
            1,
          );
          assert.equal(
            await client.billingProfile.count({ where: { userId: IDS.payer } }),
            1,
          );

          const payment = await client.payment.findUnique({
            where: { id: first.paymentId },
          });
          assert.equal(payment?.amountMinor, AMOUNT_MINOR);
          assert.equal(payment?.currency, "MYR");
          assert.equal(payment?.status, "PROCESSING");

          assert.equal(adapter.customerCalls.length, 1);
          assert.equal(adapter.checkoutCalls.length, 2);
          assert.equal(
            adapter.checkoutCalls[0].idempotencyKey,
            adapter.checkoutCalls[1].idempotencyKey,
          );
        },
      );

      await t.test(
        "missing, invalid, malformed, and unsupported webhook input fails closed",
        async () => {
          const payload = {
            providerEventId: "evt-signature-rejected",
            eventType: "PAYMENT_FAILED",
            idempotencyKey: KEYS.failure,
          };

          const missing = await webhookRequest(baseUrl, adapter, payload, {
            sign: false,
          });
          assertError(missing, 401, /Sandbox webhook signature is required/);

          const invalid = await webhookRequest(baseUrl, adapter, payload, {
            signature: "not-a-valid-signature",
          });
          assertError(invalid, 401, /Sandbox webhook signature is invalid/);

          const malformedRawBody = Buffer.from('{"providerEventId":', "utf8");
          const malformed = await webhookRequest(baseUrl, adapter, null, {
            rawBody: malformedRawBody,
          });
          assert.equal(malformed.response.status, 400);

          const unsupported = await webhookRequest(baseUrl, adapter, {
            providerEventId: "evt-refund-unsupported",
            eventType: "PAYMENT_REFUNDED",
            idempotencyKey: KEYS.failure,
          });
          assertError(
            unsupported,
            400,
            /Unsupported sandbox payment event type/,
          );

          assert.equal(
            await client.paymentProviderEvent.count({
              where: {
                providerEventId: {
                  in: ["evt-signature-rejected", "evt-refund-unsupported"],
                },
              },
            }),
            0,
          );
          const payment = await client.payment.findUnique({
            where: { id: IDS.paymentFailure },
          });
          assert.equal(payment?.status, "PROCESSING");
        },
      );

      await t.test(
        "verified success activates membership exactly once and rejects event-ID payload collisions",
        async () => {
          const payment = await client.payment.findFirstOrThrow({
            where: { membershipId: IDS.membershipCheckout },
          });
          const payload = {
            providerEventId: "evt-checkout-success",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: payment.idempotencyKey,
            providerPaymentId: payment.providerPaymentId,
          };

          const first = await webhookRequest(baseUrl, adapter, payload);
          assert.equal(first.response.status, 201);
          assert.equal(first.body.processed, true);
          assert.equal(first.body.paymentStatus, "PAID");
          assert.equal(first.body.membershipActivated, true);
          assert.equal(first.body.actionRequired, false);

          const persistedPayment = await client.payment.findUnique({
            where: { id: payment.id },
          });
          const installment = await client.paymentInstallment.findUnique({
            where: { id: payment.paymentInstallmentId },
          });
          const schedule = await client.paymentSchedule.findUnique({
            where: { membershipId: IDS.membershipCheckout },
          });
          const membership = await client.membership.findUnique({
            where: { id: IDS.membershipCheckout },
          });
          const providerEvent = await client.paymentProviderEvent.findUnique({
            where: {
              provider_providerEventId: {
                provider: "sandbox",
                providerEventId: payload.providerEventId,
              },
            },
          });

          assert.equal(persistedPayment?.status, "PAID");
          assert.equal(installment?.status, "PAID");
          assert.equal(schedule?.status, "COMPLETED");
          assert.equal(membership?.status, "ACTIVE");
          assert.ok(membership?.activatedAt);
          assert.equal(providerEvent?.processingStatus, "PROCESSED");
          assert.equal(
            providerEvent?.payloadHash,
            createHash("sha256").update(first.rawBody).digest("hex"),
          );

          const activatedAt = membership.activatedAt.toISOString();
          const duplicate = await webhookRequest(baseUrl, adapter, payload);
          assert.equal(duplicate.response.status, 201);
          assert.equal(duplicate.body.duplicate, true);
          assert.equal(
            await client.paymentProviderEvent.count({
              where: {
                provider: "sandbox",
                providerEventId: payload.providerEventId,
              },
            }),
            1,
          );
          const afterDuplicate = await client.membership.findUnique({
            where: { id: IDS.membershipCheckout },
          });
          assert.equal(afterDuplicate?.activatedAt?.toISOString(), activatedAt);

          const collision = await webhookRequest(baseUrl, adapter, {
            ...payload,
            eventType: "PAYMENT_FAILED",
          });
          assertError(
            collision,
            409,
            /Provider event payload does not match previously received event/,
          );
          const afterCollision = await client.payment.findUnique({
            where: { id: payment.id },
          });
          assert.equal(afterCollision?.status, "PAID");
        },
      );

      await t.test(
        "failed payment can recover through a later distinct verified success event",
        async () => {
          const failed = await webhookRequest(baseUrl, adapter, {
            providerEventId: "evt-failure-first",
            eventType: "PAYMENT_FAILED",
            idempotencyKey: KEYS.failure,
            providerPaymentId: "sandbox-failure-payment",
            failureCode: "card_declined",
            safeFailureReason: "Sandbox card declined",
          });
          assert.equal(failed.response.status, 201);
          assert.equal(failed.body.processed, true);
          assert.equal(failed.body.paymentStatus, "FAILED");

          let payment = await client.payment.findUnique({
            where: { id: IDS.paymentFailure },
          });
          let membership = await client.membership.findUnique({
            where: { id: IDS.membershipFailure },
          });
          let installment = await client.paymentInstallment.findUnique({
            where: { id: IDS.installmentFailure },
          });
          assert.equal(payment?.status, "FAILED");
          assert.equal(payment?.failureCode, "card_declined");
          assert.equal(installment?.status, "FAILED");
          assert.equal(membership?.status, "PENDING");

          const recovered = await webhookRequest(baseUrl, adapter, {
            providerEventId: "evt-failure-recovered",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: KEYS.failure,
            providerPaymentId: "sandbox-failure-payment",
          });
          assert.equal(recovered.response.status, 201);
          assert.equal(recovered.body.processed, true);
          assert.equal(recovered.body.paymentStatus, "PAID");
          assert.equal(recovered.body.membershipActivated, true);

          payment = await client.payment.findUnique({
            where: { id: IDS.paymentFailure },
          });
          membership = await client.membership.findUnique({
            where: { id: IDS.membershipFailure },
          });
          installment = await client.paymentInstallment.findUnique({
            where: { id: IDS.installmentFailure },
          });
          assert.equal(payment?.status, "PAID");
          assert.equal(payment?.failureCode, null);
          assert.equal(payment?.safeFailureReason, null);
          assert.equal(installment?.status, "PAID");
          assert.equal(membership?.status, "ACTIVE");
        },
      );

      await t.test(
        "verified event with no matching payment is retained for action without mutating membership state",
        async () => {
          const payload = {
            providerEventId: "evt-unknown-payment",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: "missing-payment-idempotency-key",
            providerPaymentId: "sandbox-missing-payment",
          };
          const first = await webhookRequest(baseUrl, adapter, payload);
          assert.equal(first.response.status, 201);
          assert.equal(first.body.processed, false);
          assert.equal(first.body.actionRequired, true);

          const event = await client.paymentProviderEvent.findUnique({
            where: {
              provider_providerEventId: {
                provider: "sandbox",
                providerEventId: payload.providerEventId,
              },
            },
          });
          assert.equal(event?.processingStatus, "ACTION_REQUIRED");

          const duplicate = await webhookRequest(baseUrl, adapter, payload);
          assert.equal(duplicate.body.duplicate, true);
        },
      );

      await t.test(
        "successful payment does not over-activate a full programme offering",
        async () => {
          const response = await webhookRequest(baseUrl, adapter, {
            providerEventId: "evt-capacity-blocked",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: KEYS.capacity,
            providerPaymentId: "sandbox-capacity-payment",
          });
          assert.equal(response.response.status, 201);
          assert.equal(response.body.processed, true);
          assert.equal(response.body.paymentStatus, "PAID");
          assert.equal(response.body.membershipActivated, false);
          assert.equal(response.body.actionRequired, true);

          const payment = await client.payment.findUnique({
            where: { id: IDS.paymentCapacity },
          });
          const target = await client.membership.findUnique({
            where: { id: IDS.membershipCapacityTarget },
          });
          const event = await client.paymentProviderEvent.findUnique({
            where: {
              provider_providerEventId: {
                provider: "sandbox",
                providerEventId: "evt-capacity-blocked",
              },
            },
          });
          const activeCount = await client.membership.count({
            where: {
              programmeOfferingId: IDS.offeringCapacity,
              status: "ACTIVE",
            },
          });

          assert.equal(payment?.status, "PAID");
          assert.equal(target?.status, "PENDING");
          assert.equal(event?.processingStatus, "ACTION_REQUIRED");
          assert.equal(activeCount, 1);
        },
      );

      await t.test(
        "internal processing failure is marked retryable and the same provider event can recover",
        async () => {
          const originalApply = billing.applyVerifiedEvent.bind(billing);
          let failOnce = true;
          billing.applyVerifiedEvent = async (...args) => {
            if (failOnce) {
              failOnce = false;
              throw new Error("synthetic payment persistence outage");
            }
            return originalApply(...args);
          };

          const payload = {
            providerEventId: "evt-retry-after-internal-failure",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: KEYS.retry,
            providerPaymentId: "sandbox-retry-payment",
          };

          try {
            const first = await webhookRequest(baseUrl, adapter, payload);
            assert.equal(first.response.status, 500);

            let event = await client.paymentProviderEvent.findUnique({
              where: {
                provider_providerEventId: {
                  provider: "sandbox",
                  providerEventId: payload.providerEventId,
                },
              },
            });
            let payment = await client.payment.findUnique({
              where: { id: IDS.paymentRetry },
            });
            assert.equal(event?.processingStatus, "FAILED");
            assert.equal(payment?.status, "PROCESSING");

            const retry = await webhookRequest(baseUrl, adapter, payload);
            assert.equal(retry.response.status, 201);
            assert.equal(retry.body.processed, true);
            assert.equal(retry.body.paymentStatus, "PAID");

            event = await client.paymentProviderEvent.findUnique({
              where: {
                provider_providerEventId: {
                  provider: "sandbox",
                  providerEventId: payload.providerEventId,
                },
              },
            });
            payment = await client.payment.findUnique({
              where: { id: IDS.paymentRetry },
            });
            const membership = await client.membership.findUnique({
              where: { id: IDS.membershipRetry },
            });
            assert.equal(event?.processingStatus, "PROCESSED");
            assert.equal(payment?.status, "PAID");
            assert.equal(membership?.status, "ACTIVE");
            assert.equal(
              await client.paymentProviderEvent.count({
                where: {
                  provider: "sandbox",
                  providerEventId: payload.providerEventId,
                },
              }),
              1,
            );
          } finally {
            billing.applyVerifiedEvent = originalApply;
          }
        },
      );

      await t.test(
        "simultaneous delivery of one provider event creates one event record and one activation",
        async () => {
          const payload = {
            providerEventId: "evt-concurrent-duplicate",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: KEYS.concurrent,
            providerPaymentId: "sandbox-concurrent-payment",
          };

          const results = await Promise.all([
            webhookRequest(baseUrl, adapter, payload),
            webhookRequest(baseUrl, adapter, payload),
          ]);
          assert.deepEqual(
            results.map((result) => result.response.status).sort(),
            [201, 201],
          );
          assert.equal(
            results.filter((result) => result.body?.processed === true).length,
            1,
          );
          assert.equal(
            results.filter((result) => result.body?.duplicate === true).length,
            1,
          );

          const payment = await client.payment.findUnique({
            where: { id: IDS.paymentConcurrent },
          });
          const membership = await client.membership.findUnique({
            where: { id: IDS.membershipConcurrent },
          });
          assert.equal(payment?.status, "PAID");
          assert.equal(membership?.status, "ACTIVE");
          assert.equal(
            await client.paymentProviderEvent.count({
              where: {
                provider: "sandbox",
                providerEventId: payload.providerEventId,
              },
            }),
            1,
          );
        },
      );
    } finally {
      await cleanup(client);
      await app.close();
      if (previousPaymentProvider === undefined) {
        delete process.env.PAYMENT_PROVIDER;
      } else {
        process.env.PAYMENT_PROVIDER = previousPaymentProvider;
      }
    }
  },
);
