import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const {
  BillingService,
} = require("../../apps/api/dist/billing/billing.service.js");
const {
  PaymentGatewayRegistry,
} = require("../../apps/api/dist/billing/payment-gateway.js");

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const AMOUNT_MINOR = 18000;
const PROVIDER = "concurrency-security-test";

const IDS = Object.freeze({
  payer: "72000000-0000-4000-8000-000000000001",
  checkoutAthlete: "72000000-0000-4000-8000-000000000002",
  capacityAthleteA: "72000000-0000-4000-8000-000000000003",
  capacityAthleteB: "72000000-0000-4000-8000-000000000004",
  sport: "72000000-0000-4000-8000-000000000010",
  programme: "72000000-0000-4000-8000-000000000011",
  checkoutOffering: "72000000-0000-4000-8000-000000000012",
  capacityOffering: "72000000-0000-4000-8000-000000000013",
  plan: "72000000-0000-4000-8000-000000000014",
  checkoutMembership: "72000000-0000-4000-8000-000000000020",
  capacityMembershipA: "72000000-0000-4000-8000-000000000021",
  capacityMembershipB: "72000000-0000-4000-8000-000000000022",
  checkoutSchedule: "72000000-0000-4000-8000-000000000030",
  capacityScheduleA: "72000000-0000-4000-8000-000000000031",
  capacityScheduleB: "72000000-0000-4000-8000-000000000032",
  checkoutInstallment: "72000000-0000-4000-8000-000000000040",
  capacityInstallmentA: "72000000-0000-4000-8000-000000000041",
  capacityInstallmentB: "72000000-0000-4000-8000-000000000042",
  checkoutPayment: "72000000-0000-4000-8000-000000000050",
  capacityPaymentA: "72000000-0000-4000-8000-000000000051",
  capacityPaymentB: "72000000-0000-4000-8000-000000000052",
  billingProfile: "72000000-0000-4000-8000-000000000060",
});

class NonIdempotentGateway {
  provider = PROVIDER;
  checkoutCalls = [];
  newBillCalls = 0;

  async createCustomer() {
    return { providerCustomerId: "preseeded-customer" };
  }

  async createCheckout(input) {
    this.checkoutCalls.push(input);
    if (input.providerPaymentId) {
      return {
        checkoutUrl: `https://payments.example.test/${input.providerPaymentId}`,
        providerPaymentId: input.providerPaymentId,
      };
    }

    this.newBillCalls += 1;
    const providerPaymentId = `external-bill-${this.newBillCalls}`;
    await new Promise((resolve) => setTimeout(resolve, 75));
    return {
      checkoutUrl: `https://payments.example.test/${providerPaymentId}`,
      providerPaymentId,
    };
  }

  async verifyWebhook({ rawBody }) {
    return JSON.parse(rawBody.toString("utf8"));
  }

  async refund() {}
}

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for payment concurrency tests");
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      "Payment concurrency tests require a database whose name contains 'test'",
    );
  }

  return true;
}

function paymentKey(membershipId) {
  return `membership:${membershipId}:installment:1`;
}

async function cleanup(client) {
  await client.paymentProviderEvent.deleteMany({
    where: { provider: PROVIDER },
  });
  await client.payment.deleteMany({ where: { payerUserId: IDS.payer } });
  await client.membershipAgreement.deleteMany({
    where: {
      membershipId: {
        in: [
          IDS.checkoutMembership,
          IDS.capacityMembershipA,
          IDS.capacityMembershipB,
        ],
      },
    },
  });
  await client.paymentSchedule.deleteMany({
    where: {
      membershipId: {
        in: [
          IDS.checkoutMembership,
          IDS.capacityMembershipA,
          IDS.capacityMembershipB,
        ],
      },
    },
  });
  await client.billingProfile.deleteMany({
    where: { id: IDS.billingProfile },
  });
  await client.membership.deleteMany({
    where: {
      id: {
        in: [
          IDS.checkoutMembership,
          IDS.capacityMembershipA,
          IDS.capacityMembershipB,
        ],
      },
    },
  });
  await client.athleteProfile.deleteMany({
    where: {
      id: {
        in: [IDS.checkoutAthlete, IDS.capacityAthleteA, IDS.capacityAthleteB],
      },
    },
  });
  await client.programmeOffering.deleteMany({
    where: { id: { in: [IDS.checkoutOffering, IDS.capacityOffering] } },
  });
  await client.membershipPlan.deleteMany({ where: { id: IDS.plan } });
  await client.programme.deleteMany({ where: { id: IDS.programme } });
  await client.sport.deleteMany({ where: { id: IDS.sport } });
  await client.user.deleteMany({ where: { id: IDS.payer } });
}

async function createPaymentChain(
  client,
  { membershipId, scheduleId, installmentId, paymentId, providerPaymentId },
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
      status: providerPaymentId ? "ACTIVE" : "PENDING",
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
      status: providerPaymentId ? "PROCESSING" : "SCHEDULED",
    },
  });
  await client.payment.create({
    data: {
      id: paymentId,
      organizationId: ORG_ID,
      payerUserId: IDS.payer,
      membershipId,
      paymentInstallmentId: installmentId,
      provider: PROVIDER,
      providerPaymentId,
      idempotencyKey: paymentKey(membershipId),
      amountMinor: AMOUNT_MINOR,
      currency: "MYR",
      status: providerPaymentId ? "PROCESSING" : "PENDING",
    },
  });
}

async function seed(client) {
  await client.user.create({
    data: {
      id: IDS.payer,
      authProviderSubject: "payment-concurrency-security-payer",
      email: "payment-concurrency@example.test",
    },
  });
  await client.athleteProfile.createMany({
    data: [IDS.checkoutAthlete, IDS.capacityAthleteA, IDS.capacityAthleteB].map(
      (id, index) => ({
        id,
        displayName: `Security Athlete ${index + 1}`,
        dateOfBirth: new Date("2014-01-01T00:00:00.000Z"),
      }),
    ),
  });
  await client.sport.create({
    data: {
      id: IDS.sport,
      code: "PAYMENT_SECURITY",
      defaultName: "Payment Security Basketball",
    },
  });
  await client.programme.create({
    data: {
      id: IDS.programme,
      organizationId: ORG_ID,
      sportId: IDS.sport,
      code: "PAYMENT_SECURITY_PROGRAMME",
      name: "Payment Security Programme",
    },
  });
  await client.programmeOffering.createMany({
    data: [
      {
        id: IDS.checkoutOffering,
        organizationId: ORG_ID,
        programmeId: IDS.programme,
        name: "Checkout Race Offering",
        capacity: 10,
        status: "OPEN",
      },
      {
        id: IDS.capacityOffering,
        organizationId: ORG_ID,
        programmeId: IDS.programme,
        name: "Activation Race Offering",
        capacity: 1,
        status: "OPEN",
      },
    ],
  });
  await client.membershipPlan.create({
    data: {
      id: IDS.plan,
      organizationId: ORG_ID,
      name: "Payment Security Plan",
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
        id: IDS.checkoutMembership,
        organizationId: ORG_ID,
        athleteId: IDS.checkoutAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.capacityMembershipA,
        organizationId: ORG_ID,
        athleteId: IDS.capacityAthleteA,
        programmeOfferingId: IDS.capacityOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.capacityMembershipB,
        organizationId: ORG_ID,
        athleteId: IDS.capacityAthleteB,
        programmeOfferingId: IDS.capacityOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
    ],
  });

  await client.billingProfile.create({
    data: {
      id: IDS.billingProfile,
      organizationId: ORG_ID,
      userId: IDS.payer,
      provider: PROVIDER,
      providerCustomerId: "preseeded-customer",
    },
  });

  await client.membershipAgreement.create({
    data: {
      membershipId: IDS.checkoutMembership,
      termsVersion: "membership-mvp-v1",
      acceptedByUserId: IDS.payer,
      amountMinorSnapshot: AMOUNT_MINOR,
      currencySnapshot: "MYR",
      billingFrequencySnapshot: "UPFRONT",
      installmentCountSnapshot: 1,
    },
  });

  await createPaymentChain(client, {
    membershipId: IDS.checkoutMembership,
    scheduleId: IDS.checkoutSchedule,
    installmentId: IDS.checkoutInstallment,
    paymentId: IDS.checkoutPayment,
    providerPaymentId: null,
  });
  await createPaymentChain(client, {
    membershipId: IDS.capacityMembershipA,
    scheduleId: IDS.capacityScheduleA,
    installmentId: IDS.capacityInstallmentA,
    paymentId: IDS.capacityPaymentA,
    providerPaymentId: "capacity-payment-a",
  });
  await createPaymentChain(client, {
    membershipId: IDS.capacityMembershipB,
    scheduleId: IDS.capacityScheduleB,
    installmentId: IDS.capacityInstallmentB,
    paymentId: IDS.capacityPaymentB,
    providerPaymentId: "capacity-payment-b",
  });
}

const enabled = databaseTestsEnabled();
const testOptions = {
  skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests",
};

test(
  "payment concurrency cannot create duplicate bills or over-activate capacity",
  testOptions,
  async (t) => {
    const previousProvider = process.env.PAYMENT_PROVIDER;
    process.env.PAYMENT_PROVIDER = PROVIDER;

    const prisma = new PrismaService();
    const client = prisma.client;
    const gateways = new PaymentGatewayRegistry();
    const gateway = new NonIdempotentGateway();
    gateways.register(gateway);
    const billing = new BillingService(prisma, gateways);

    await cleanup(client);
    await seed(client);

    try {
      await t.test(
        "simultaneous checkout requests create at most one external bill",
        async () => {
          const results = await Promise.allSettled([
            billing.prepareMembershipCheckout(
              ORG_ID,
              IDS.payer,
              IDS.checkoutAthlete,
              IDS.checkoutMembership,
              { acceptTerms: true },
            ),
            billing.prepareMembershipCheckout(
              ORG_ID,
              IDS.payer,
              IDS.checkoutAthlete,
              IDS.checkoutMembership,
              { acceptTerms: true },
            ),
          ]);
          const fulfilledCount = results.filter(
            (result) => result.status === "fulfilled",
          ).length;

          assert.equal(gateway.newBillCalls, 1);
          assert.equal(fulfilledCount >= 1, true);

          const payment = await client.payment.findUniqueOrThrow({
            where: { id: IDS.checkoutPayment },
          });
          assert.equal(payment.status, "PROCESSING");
          assert.equal(payment.providerPaymentId, "external-bill-1");

          const retry = await billing.prepareMembershipCheckout(
            ORG_ID,
            IDS.payer,
            IDS.checkoutAthlete,
            IDS.checkoutMembership,
            { acceptTerms: true },
          );
          assert.equal(retry.paymentId, IDS.checkoutPayment);
          assert.equal(gateway.newBillCalls, 1);
        },
      );

      await t.test(
        "distinct simultaneous success events cannot activate beyond offering capacity",
        async () => {
          const eventA = {
            providerEventId: "capacity-event-a",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.capacityMembershipA),
            providerPaymentId: "capacity-payment-a",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };
          const eventB = {
            providerEventId: "capacity-event-b",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.capacityMembershipB),
            providerPaymentId: "capacity-payment-b",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };

          const [resultA, resultB] = await Promise.all([
            billing.processVerifiedWebhook(
              ORG_ID,
              PROVIDER,
              {},
              Buffer.from(JSON.stringify(eventA), "utf8"),
            ),
            billing.processVerifiedWebhook(
              ORG_ID,
              PROVIDER,
              {},
              Buffer.from(JSON.stringify(eventB), "utf8"),
            ),
          ]);

          assert.equal(
            [resultA, resultB].filter(
              (result) => result.membershipActivated === true,
            ).length,
            1,
          );
          assert.equal(
            [resultA, resultB].filter(
              (result) => result.actionRequired === true,
            ).length,
            1,
          );
          assert.equal(
            await client.membership.count({
              where: {
                organizationId: ORG_ID,
                programmeOfferingId: IDS.capacityOffering,
                status: "ACTIVE",
              },
            }),
            1,
          );
          assert.equal(
            await client.payment.count({
              where: {
                id: { in: [IDS.capacityPaymentA, IDS.capacityPaymentB] },
                status: "PAID",
              },
            }),
            2,
          );
        },
      );

      await t.test(
        "stale checkout recovery cancels only pre-provider claims",
        async () => {
          const now = new Date(Date.now() + 2 * 60 * 60 * 1000);
          await client.payment.update({
            where: { id: IDS.checkoutPayment },
            data: { attemptedAt: new Date(now.getTime() - 60 * 60 * 1000) },
          });

          const providerCreated =
            await billing.reconcileStaleCheckoutHolds(ORG_ID, now);
          assert.equal(providerCreated.expired, 0);
          assert.equal(providerCreated.actionRequired, 1);
          assert.equal(
            (
              await client.payment.findUniqueOrThrow({
                where: { id: IDS.checkoutPayment },
              })
            ).status,
            "PROCESSING",
          );

          await client.payment.update({
            where: { id: IDS.checkoutPayment },
            data: { providerPaymentId: null },
          });

          const preProvider =
            await billing.reconcileStaleCheckoutHolds(ORG_ID, now);
          assert.equal(preProvider.expired, 1);
          assert.equal(preProvider.actionRequired, 0);

          const [payment, membership, installment, schedule] =
            await Promise.all([
              client.payment.findUniqueOrThrow({
                where: { id: IDS.checkoutPayment },
              }),
              client.membership.findUniqueOrThrow({
                where: { id: IDS.checkoutMembership },
              }),
              client.paymentInstallment.findUniqueOrThrow({
                where: { id: IDS.checkoutInstallment },
              }),
              client.paymentSchedule.findUniqueOrThrow({
                where: { id: IDS.checkoutSchedule },
              }),
            ]);
          assert.equal(payment.status, "CANCELLED");
          assert.equal(membership.status, "CANCELLED");
          assert.equal(installment.status, "CANCELLED");
          assert.equal(schedule.status, "CANCELLED");
        },
      );
    } finally {
      await cleanup(client);
      await prisma.onModuleDestroy();
      if (previousProvider === undefined) {
        delete process.env.PAYMENT_PROVIDER;
      } else {
        process.env.PAYMENT_PROVIDER = previousProvider;
      }
    }
  },
);
