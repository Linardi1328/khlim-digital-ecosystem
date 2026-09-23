import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const ORG_ID = "72000000-0000-4000-8000-000000000000";
const AMOUNT_MINOR = 18000;
const PROVIDER = "concurrency-security-test";

const IDS = Object.freeze({
  payer: "72000000-0000-4000-8000-000000000001",
  checkoutAthlete: "72000000-0000-4000-8000-000000000002",
  capacityAthleteA: "72000000-0000-4000-8000-000000000003",
  capacityAthleteB: "72000000-0000-4000-8000-000000000004",
  checkoutRaceAthlete: "72000000-0000-4000-8000-000000000005",
  opposingAthlete: "72000000-0000-4000-8000-000000000006",
  receivedAthlete: "72000000-0000-4000-8000-000000000007",
  failureFirstAthlete: "72000000-0000-4000-8000-000000000008",
  retryFailedAthlete: "72000000-0000-4000-8000-000000000009",
  concurrentReceivedAthlete: "72000000-0000-4000-8000-00000000000a",
  missingMembershipAthlete: "72000000-0000-4000-8000-00000000000b",
  cancelledMembershipAthlete: "72000000-0000-4000-8000-00000000000c",
  expiredMembershipAthlete: "72000000-0000-4000-8000-00000000000d",
  alreadyActiveMembershipAthlete: "72000000-0000-4000-8000-00000000000e",

  sport: "72000000-0000-4000-8000-000000000010",
  programme: "72000000-0000-4000-8000-000000000011",
  checkoutOffering: "72000000-0000-4000-8000-000000000012",
  capacityOffering: "72000000-0000-4000-8000-000000000013",
  plan: "72000000-0000-4000-8000-000000000014",

  checkoutMembership: "72000000-0000-4000-8000-000000000020",
  capacityMembershipA: "72000000-0000-4000-8000-000000000021",
  capacityMembershipB: "72000000-0000-4000-8000-000000000022",
  checkoutRaceMembership: "72000000-0000-4000-8000-000000000023",
  opposingMembership: "72000000-0000-4000-8000-000000000024",
  receivedMembership: "72000000-0000-4000-8000-000000000025",
  failureFirstMembership: "72000000-0000-4000-8000-000000000026",
  retryFailedMembership: "72000000-0000-4000-8000-000000000027",
  concurrentReceivedMembership: "72000000-0000-4000-8000-000000000028",
  cancelledMembership: "72000000-0000-4000-8000-000000000029",
  expiredMembership: "72000000-0000-4000-8000-00000000002a",
  alreadyActiveMembership: "72000000-0000-4000-8000-00000000002b",

  checkoutSchedule: "72000000-0000-4000-8000-000000000030",
  capacityScheduleA: "72000000-0000-4000-8000-000000000031",
  capacityScheduleB: "72000000-0000-4000-8000-000000000032",
  checkoutRaceSchedule: "72000000-0000-4000-8000-000000000033",
  opposingSchedule: "72000000-0000-4000-8000-000000000034",
  receivedSchedule: "72000000-0000-4000-8000-000000000035",
  failureFirstSchedule: "72000000-0000-4000-8000-000000000036",
  retryFailedSchedule: "72000000-0000-4000-8000-000000000037",
  concurrentReceivedSchedule: "72000000-0000-4000-8000-000000000038",
  cancelledMembershipSchedule: "72000000-0000-4000-8000-000000000039",
  expiredMembershipSchedule: "72000000-0000-4000-8000-00000000003a",
  alreadyActiveMembershipSchedule: "72000000-0000-4000-8000-00000000003b",

  checkoutInstallment: "72000000-0000-4000-8000-000000000040",
  capacityInstallmentA: "72000000-0000-4000-8000-000000000041",
  capacityInstallmentB: "72000000-0000-4000-8000-000000000042",
  checkoutRaceInstallment: "72000000-0000-4000-8000-000000000043",
  opposingInstallment: "72000000-0000-4000-8000-000000000044",
  receivedInstallment: "72000000-0000-4000-8000-000000000045",
  failureFirstInstallment: "72000000-0000-4000-8000-000000000046",
  retryFailedInstallment: "72000000-0000-4000-8000-000000000047",
  concurrentReceivedInstallment: "72000000-0000-4000-8000-000000000048",
  cancelledMembershipInstallment: "72000000-0000-4000-8000-000000000049",
  expiredMembershipInstallment: "72000000-0000-4000-8000-00000000004a",
  alreadyActiveMembershipInstallment: "72000000-0000-4000-8000-00000000004b",

  checkoutPayment: "72000000-0000-4000-8000-000000000050",
  capacityPaymentA: "72000000-0000-4000-8000-000000000051",
  capacityPaymentB: "72000000-0000-4000-8000-000000000052",
  checkoutRacePayment: "72000000-0000-4000-8000-000000000053",
  opposingPayment: "72000000-0000-4000-8000-000000000054",
  receivedPayment: "72000000-0000-4000-8000-000000000055",
  failureFirstPayment: "72000000-0000-4000-8000-000000000056",
  retryFailedPayment: "72000000-0000-4000-8000-000000000057",
  concurrentReceivedPayment: "72000000-0000-4000-8000-000000000058",
  missingMembershipPayment: "72000000-0000-4000-8000-000000000059",
  cancelledMembershipPayment: "72000000-0000-4000-8000-00000000005a",
  expiredMembershipPayment: "72000000-0000-4000-8000-00000000005b",
  alreadyActiveMembershipPayment: "72000000-0000-4000-8000-00000000005c",

  billingProfile: "72000000-0000-4000-8000-000000000060",
});

class NonIdempotentGateway {
  provider = PROVIDER;
  checkoutCalls = [];
  newBillCalls = 0;
  beforeNewBillReturn = null;

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
    if (this.beforeNewBillReturn) {
      await this.beforeNewBillReturn({ input, providerPaymentId });
    }
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
  await client.payment.deleteMany({ where: { organizationId: ORG_ID } });
  await client.membershipAgreement.deleteMany({
    where: { acceptedByUserId: IDS.payer },
  });
  await client.paymentInstallment.deleteMany({
    where: {
      paymentSchedule: { membership: { organizationId: ORG_ID } },
    },
  });
  await client.paymentSchedule.deleteMany({
    where: { membership: { organizationId: ORG_ID } },
  });
  await client.billingProfile.deleteMany({
    where: { id: IDS.billingProfile },
  });
  await client.membership.deleteMany({
    where: { organizationId: ORG_ID },
  });
  const athleteIds = [
    IDS.checkoutAthlete,
    IDS.capacityAthleteA,
    IDS.capacityAthleteB,
    IDS.checkoutRaceAthlete,
    IDS.opposingAthlete,
    IDS.receivedAthlete,
    IDS.failureFirstAthlete,
    IDS.retryFailedAthlete,
    IDS.concurrentReceivedAthlete,
    IDS.missingMembershipAthlete,
    IDS.cancelledMembershipAthlete,
    IDS.expiredMembershipAthlete,
    IDS.alreadyActiveMembershipAthlete,
  ];
  await client.athleteProfile.deleteMany({
    where: { id: { in: athleteIds } },
  });
  await client.programmeOffering.deleteMany({
    where: { organizationId: ORG_ID },
  });
  await client.membershipPlan.deleteMany({ where: { id: IDS.plan } });
  await client.programme.deleteMany({ where: { id: IDS.programme } });
  await client.sport.deleteMany({ where: { id: IDS.sport } });
  await client.user.deleteMany({ where: { id: IDS.payer } });
  await client.organization.deleteMany({ where: { id: ORG_ID } });
}

async function createPaymentChain(
  client,
  {
    membershipId,
    scheduleId,
    installmentId,
    paymentId,
    providerPaymentId,
    scheduleStatus,
    installmentStatus,
    paymentStatus,
  },
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
      status: scheduleStatus ?? (providerPaymentId ? "ACTIVE" : "PENDING"),
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
      status:
        installmentStatus ?? (providerPaymentId ? "PROCESSING" : "SCHEDULED"),
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
      status: paymentStatus ?? (providerPaymentId ? "PROCESSING" : "PENDING"),
    },
  });
}

async function seed(client) {
  await client.organization.create({
    data: {
      id: ORG_ID,
      slug: "payment-concurrency-security",
      name: "Payment Concurrency Security",
    },
  });
  await client.user.create({
    data: {
      id: IDS.payer,
      authProviderSubject: "payment-concurrency-security-payer",
      email: "payment-concurrency@example.test",
    },
  });
  const athleteIds = [
    IDS.checkoutAthlete,
    IDS.capacityAthleteA,
    IDS.capacityAthleteB,
    IDS.checkoutRaceAthlete,
    IDS.opposingAthlete,
    IDS.receivedAthlete,
    IDS.failureFirstAthlete,
    IDS.retryFailedAthlete,
    IDS.concurrentReceivedAthlete,
    IDS.missingMembershipAthlete,
    IDS.cancelledMembershipAthlete,
    IDS.expiredMembershipAthlete,
    IDS.alreadyActiveMembershipAthlete,
  ];
  await client.athleteProfile.createMany({
    data: athleteIds.map((id, index) => ({
      id,
      displayName: `Security Athlete ${index + 1}`,
      dateOfBirth: new Date("2014-01-01T00:00:00.000Z"),
    })),
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
      {
        id: IDS.checkoutRaceMembership,
        organizationId: ORG_ID,
        athleteId: IDS.checkoutRaceAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.opposingMembership,
        organizationId: ORG_ID,
        athleteId: IDS.opposingAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.receivedMembership,
        organizationId: ORG_ID,
        athleteId: IDS.receivedAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.failureFirstMembership,
        organizationId: ORG_ID,
        athleteId: IDS.failureFirstAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.retryFailedMembership,
        organizationId: ORG_ID,
        athleteId: IDS.retryFailedAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.concurrentReceivedMembership,
        organizationId: ORG_ID,
        athleteId: IDS.concurrentReceivedAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "PENDING",
      },
      {
        id: IDS.cancelledMembership,
        organizationId: ORG_ID,
        athleteId: IDS.cancelledMembershipAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "CANCELLED",
      },
      {
        id: IDS.expiredMembership,
        organizationId: ORG_ID,
        athleteId: IDS.expiredMembershipAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "EXPIRED",
      },
      {
        id: IDS.alreadyActiveMembership,
        organizationId: ORG_ID,
        athleteId: IDS.alreadyActiveMembershipAthlete,
        programmeOfferingId: IDS.checkoutOffering,
        membershipPlanId: IDS.plan,
        purchasedByUserId: IDS.payer,
        status: "ACTIVE",
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
  await createPaymentChain(client, {
    membershipId: IDS.checkoutRaceMembership,
    scheduleId: IDS.checkoutRaceSchedule,
    installmentId: IDS.checkoutRaceInstallment,
    paymentId: IDS.checkoutRacePayment,
    providerPaymentId: null,
  });
  await createPaymentChain(client, {
    membershipId: IDS.opposingMembership,
    scheduleId: IDS.opposingSchedule,
    installmentId: IDS.opposingInstallment,
    paymentId: IDS.opposingPayment,
    providerPaymentId: "opposing-payment",
  });
  await createPaymentChain(client, {
    membershipId: IDS.receivedMembership,
    scheduleId: IDS.receivedSchedule,
    installmentId: IDS.receivedInstallment,
    paymentId: IDS.receivedPayment,
    providerPaymentId: "received-payment",
  });
  await createPaymentChain(client, {
    membershipId: IDS.failureFirstMembership,
    scheduleId: IDS.failureFirstSchedule,
    installmentId: IDS.failureFirstInstallment,
    paymentId: IDS.failureFirstPayment,
    providerPaymentId: "failure-first-payment",
  });
  await createPaymentChain(client, {
    membershipId: IDS.retryFailedMembership,
    scheduleId: IDS.retryFailedSchedule,
    installmentId: IDS.retryFailedInstallment,
    paymentId: IDS.retryFailedPayment,
    providerPaymentId: "retry-failed-payment",
  });
  await createPaymentChain(client, {
    membershipId: IDS.concurrentReceivedMembership,
    scheduleId: IDS.concurrentReceivedSchedule,
    installmentId: IDS.concurrentReceivedInstallment,
    paymentId: IDS.concurrentReceivedPayment,
    providerPaymentId: "concurrent-received-payment",
  });
  await createPaymentChain(client, {
    membershipId: IDS.cancelledMembership,
    scheduleId: IDS.cancelledMembershipSchedule,
    installmentId: IDS.cancelledMembershipInstallment,
    paymentId: IDS.cancelledMembershipPayment,
    providerPaymentId: "cancelled-membership-payment",
  });
  await createPaymentChain(client, {
    membershipId: IDS.expiredMembership,
    scheduleId: IDS.expiredMembershipSchedule,
    installmentId: IDS.expiredMembershipInstallment,
    paymentId: IDS.expiredMembershipPayment,
    providerPaymentId: "expired-membership-payment",
  });
  await createPaymentChain(client, {
    membershipId: IDS.alreadyActiveMembership,
    scheduleId: IDS.alreadyActiveMembershipSchedule,
    installmentId: IDS.alreadyActiveMembershipInstallment,
    paymentId: IDS.alreadyActiveMembershipPayment,
    providerPaymentId: "already-active-payment",
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
        "checkout completion cannot overwrite a verified successful payment",
        async () => {
          let webhookResult = null;
          gateway.beforeNewBillReturn = async ({
            input,
            providerPaymentId,
          }) => {
            if (input.membershipId !== IDS.checkoutRaceMembership) return;
            const event = {
              providerEventId: "checkout-return-race-success",
              eventType: "PAYMENT_SUCCEEDED",
              idempotencyKey: paymentKey(IDS.checkoutRaceMembership),
              providerPaymentId,
              amountMinor: AMOUNT_MINOR,
              currency: "MYR",
            };
            webhookResult = await billing.processVerifiedWebhook(
              ORG_ID,
              PROVIDER,
              {},
              Buffer.from(JSON.stringify(event), "utf8"),
            );
          };

          try {
            await assert.rejects(
              () =>
                billing.prepareMembershipCheckout(
                  ORG_ID,
                  IDS.payer,
                  IDS.checkoutRaceAthlete,
                  IDS.checkoutRaceMembership,
                  { acceptTerms: true },
                ),
              (error) => {
                assert.match(
                  error.message,
                  /First installment is already paid/,
                );
                return true;
              },
            );
          } finally {
            gateway.beforeNewBillReturn = null;
          }

          assert.equal(webhookResult?.paymentStatus, "PAID");
          const [payment, installment, membership, schedule] =
            await Promise.all([
              client.payment.findUniqueOrThrow({
                where: { id: IDS.checkoutRacePayment },
              }),
              client.paymentInstallment.findUniqueOrThrow({
                where: { id: IDS.checkoutRaceInstallment },
              }),
              client.membership.findUniqueOrThrow({
                where: { id: IDS.checkoutRaceMembership },
              }),
              client.paymentSchedule.findUniqueOrThrow({
                where: { id: IDS.checkoutRaceSchedule },
              }),
            ]);

          assert.equal(payment.status, "PAID");
          assert.equal(installment.status, "PAID");
          assert.equal(membership.status, "ACTIVE");
          assert.equal(schedule.status, "COMPLETED");
        },
      );

      await t.test(
        "opposing callbacks: success then failure preserves paid state and ignores failure",
        async () => {
          const successEvent = {
            providerEventId: "opposing-success",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.opposingMembership),
            providerPaymentId: "opposing-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };
          const failureEvent = {
            providerEventId: "opposing-failure",
            eventType: "PAYMENT_FAILED",
            idempotencyKey: paymentKey(IDS.opposingMembership),
            providerPaymentId: "opposing-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
            failureCode: "declined",
            safeFailureReason: "Payment was not completed",
          };

          const successResult = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            Buffer.from(JSON.stringify(successEvent), "utf8"),
          );
          const failureResult = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            Buffer.from(JSON.stringify(failureEvent), "utf8"),
          );

          assert.equal(successResult.paymentStatus, "PAID");
          assert.equal(successResult.membershipActivated, true);
          assert.equal(failureResult.paymentStatus, "PAID");
          assert.equal(failureResult.ignoredTerminalState, true);

          const [payment, installment, membership, schedule, events] =
            await Promise.all([
              client.payment.findUniqueOrThrow({
                where: { id: IDS.opposingPayment },
              }),
              client.paymentInstallment.findUniqueOrThrow({
                where: { id: IDS.opposingInstallment },
              }),
              client.membership.findUniqueOrThrow({
                where: { id: IDS.opposingMembership },
              }),
              client.paymentSchedule.findUniqueOrThrow({
                where: { id: IDS.opposingSchedule },
              }),
              client.paymentProviderEvent.findMany({
                where: {
                  provider: PROVIDER,
                  providerEventId: {
                    in: ["opposing-success", "opposing-failure"],
                  },
                },
              }),
            ]);

          assert.equal(payment.status, "PAID");
          assert.equal(payment.failedAt, null);
          assert.equal(installment.status, "PAID");
          assert.equal(membership.status, "ACTIVE");
          assert.equal(schedule.status, "COMPLETED");
          assert.equal(events.length, 2);
          assert.ok(
            events.every((event) => event.processingStatus === "PROCESSED"),
          );
        },
      );

      await t.test(
        "opposing callbacks: failure then success recovers payment to paid and activates membership",
        async () => {
          const failureEvent = {
            providerEventId: "failure-first-fail",
            eventType: "PAYMENT_FAILED",
            idempotencyKey: paymentKey(IDS.failureFirstMembership),
            providerPaymentId: "failure-first-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
            failureCode: "card_declined",
            safeFailureReason: "Card declined by issuer",
          };
          const successEvent = {
            providerEventId: "failure-first-success",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.failureFirstMembership),
            providerPaymentId: "failure-first-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };

          const failureResult = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            Buffer.from(JSON.stringify(failureEvent), "utf8"),
          );
          assert.equal(failureResult.paymentStatus, "FAILED");

          const intermediatePayment = await client.payment.findUniqueOrThrow({
            where: { id: IDS.failureFirstPayment },
          });
          assert.equal(intermediatePayment.status, "FAILED");
          assert.ok(intermediatePayment.failedAt !== null);
          assert.equal(intermediatePayment.failureCode, "card_declined");

          const successResult = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            Buffer.from(JSON.stringify(successEvent), "utf8"),
          );
          assert.equal(successResult.paymentStatus, "PAID");
          assert.equal(successResult.membershipActivated, true);

          const [payment, installment, membership, schedule, events] =
            await Promise.all([
              client.payment.findUniqueOrThrow({
                where: { id: IDS.failureFirstPayment },
              }),
              client.paymentInstallment.findUniqueOrThrow({
                where: { id: IDS.failureFirstInstallment },
              }),
              client.membership.findUniqueOrThrow({
                where: { id: IDS.failureFirstMembership },
              }),
              client.paymentSchedule.findUniqueOrThrow({
                where: { id: IDS.failureFirstSchedule },
              }),
              client.paymentProviderEvent.findMany({
                where: {
                  provider: PROVIDER,
                  providerEventId: {
                    in: ["failure-first-fail", "failure-first-success"],
                  },
                },
              }),
            ]);

          assert.equal(payment.status, "PAID");
          assert.equal(payment.failedAt, null);
          assert.equal(payment.failureCode, null);
          assert.equal(payment.safeFailureReason, null);
          assert.equal(installment.status, "PAID");
          assert.equal(membership.status, "ACTIVE");
          assert.equal(schedule.status, "COMPLETED");
          assert.equal(events.length, 2);
          assert.ok(
            events.every((event) => event.processingStatus === "PROCESSED"),
          );
        },
      );

      await t.test(
        "a previously received provider event can recover after a crash",
        async () => {
          const event = {
            providerEventId: "received-recovery-success",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.receivedMembership),
            providerPaymentId: "received-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };
          const rawBody = Buffer.from(JSON.stringify(event), "utf8");
          await client.paymentProviderEvent.create({
            data: {
              organizationId: ORG_ID,
              provider: PROVIDER,
              providerEventId: event.providerEventId,
              eventType: event.eventType,
              payloadHash: createHash("sha256").update(rawBody).digest("hex"),
              safeMetadata: { idempotencyKey: event.idempotencyKey },
              processingStatus: "RECEIVED",
            },
          });

          const result = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            rawBody,
          );
          assert.equal(result.processed, true);
          assert.equal(result.paymentStatus, "PAID");

          const [payment, providerEvent] = await Promise.all([
            client.payment.findUniqueOrThrow({
              where: { id: IDS.receivedPayment },
            }),
            client.paymentProviderEvent.findUniqueOrThrow({
              where: {
                provider_providerEventId: {
                  provider: PROVIDER,
                  providerEventId: event.providerEventId,
                },
              },
            }),
          ]);
          assert.equal(payment.status, "PAID");
          assert.equal(providerEvent.processingStatus, "PROCESSED");
        },
      );

      await t.test(
        "a previously FAILED provider event can be retried and processed to PAID",
        async () => {
          const event = {
            providerEventId: "retry-failed-event",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.retryFailedMembership),
            providerPaymentId: "retry-failed-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };
          const rawBody = Buffer.from(JSON.stringify(event), "utf8");
          await client.paymentProviderEvent.create({
            data: {
              organizationId: ORG_ID,
              provider: PROVIDER,
              providerEventId: event.providerEventId,
              eventType: event.eventType,
              payloadHash: createHash("sha256").update(rawBody).digest("hex"),
              safeMetadata: { idempotencyKey: event.idempotencyKey },
              processingStatus: "FAILED",
            },
          });

          const result = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            rawBody,
          );
          assert.equal(result.processed, true);
          assert.equal(result.paymentStatus, "PAID");
          assert.equal(result.membershipActivated, true);

          const [payment, providerEvent] = await Promise.all([
            client.payment.findUniqueOrThrow({
              where: { id: IDS.retryFailedPayment },
            }),
            client.paymentProviderEvent.findUniqueOrThrow({
              where: {
                provider_providerEventId: {
                  provider: PROVIDER,
                  providerEventId: event.providerEventId,
                },
              },
            }),
          ]);
          assert.equal(payment.status, "PAID");
          assert.equal(providerEvent.processingStatus, "PROCESSED");
        },
      );

      await t.test(
        "concurrent repeated delivery of an existing RECEIVED event is idempotent and finishes PROCESSED",
        async () => {
          const event = {
            providerEventId: "concurrent-received-event",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.concurrentReceivedMembership),
            providerPaymentId: "concurrent-received-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };
          const rawBody = Buffer.from(JSON.stringify(event), "utf8");
          await client.paymentProviderEvent.create({
            data: {
              organizationId: ORG_ID,
              provider: PROVIDER,
              providerEventId: event.providerEventId,
              eventType: event.eventType,
              payloadHash: createHash("sha256").update(rawBody).digest("hex"),
              safeMetadata: { idempotencyKey: event.idempotencyKey },
              processingStatus: "RECEIVED",
            },
          });

          const results = await Promise.all([
            billing.processVerifiedWebhook(ORG_ID, PROVIDER, {}, rawBody),
            billing.processVerifiedWebhook(ORG_ID, PROVIDER, {}, rawBody),
          ]);

          const processedResults = results.filter(
            (r) => r.processed === true || r.duplicate === true,
          );
          assert.equal(processedResults.length, 2);

          const [payment, providerEvent] = await Promise.all([
            client.payment.findUniqueOrThrow({
              where: { id: IDS.concurrentReceivedPayment },
            }),
            client.paymentProviderEvent.findUniqueOrThrow({
              where: {
                provider_providerEventId: {
                  provider: PROVIDER,
                  providerEventId: event.providerEventId,
                },
              },
            }),
          ]);
          assert.equal(payment.status, "PAID");
          assert.equal(providerEvent.processingStatus, "PROCESSED");
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
        "successful payment with missing membership flags ACTION_REQUIRED and membershipActivated=false",
        async () => {
          const event = {
            providerEventId: "missing-membership-success",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: `standalone-payment:${IDS.missingMembershipPayment}`,
            providerPaymentId: "missing-membership-pay",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };

          await client.payment.create({
            data: {
              id: IDS.missingMembershipPayment,
              organizationId: ORG_ID,
              payerUserId: IDS.payer,
              membershipId: null,
              provider: PROVIDER,
              providerPaymentId: "missing-membership-pay",
              idempotencyKey: event.idempotencyKey,
              amountMinor: AMOUNT_MINOR,
              currency: "MYR",
              status: "PROCESSING",
            },
          });

          const result = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            Buffer.from(JSON.stringify(event), "utf8"),
          );

          assert.equal(result.processed, true);
          assert.equal(result.paymentStatus, "PAID");
          assert.equal(result.actionRequired, true);
          assert.equal(result.membershipActivated, false);

          const eventRecord =
            await client.paymentProviderEvent.findUniqueOrThrow({
              where: {
                provider_providerEventId: {
                  provider: PROVIDER,
                  providerEventId: event.providerEventId,
                },
              },
            });
          assert.equal(eventRecord.processingStatus, "ACTION_REQUIRED");
        },
      );

      await t.test(
        "successful payment with CANCELLED membership flags ACTION_REQUIRED and membershipActivated=false",
        async () => {
          const event = {
            providerEventId: "cancelled-membership-success",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.cancelledMembership),
            providerPaymentId: "cancelled-membership-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };

          const result = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            Buffer.from(JSON.stringify(event), "utf8"),
          );

          assert.equal(result.processed, true);
          assert.equal(result.paymentStatus, "PAID");
          assert.equal(result.actionRequired, true);
          assert.equal(result.membershipActivated, false);

          const [membership, eventRecord] = await Promise.all([
            client.membership.findUniqueOrThrow({
              where: { id: IDS.cancelledMembership },
            }),
            client.paymentProviderEvent.findUniqueOrThrow({
              where: {
                provider_providerEventId: {
                  provider: PROVIDER,
                  providerEventId: event.providerEventId,
                },
              },
            }),
          ]);
          assert.equal(membership.status, "CANCELLED");
          assert.equal(eventRecord.processingStatus, "ACTION_REQUIRED");
        },
      );

      await t.test(
        "successful payment with EXPIRED membership flags ACTION_REQUIRED and membershipActivated=false",
        async () => {
          const event = {
            providerEventId: "expired-membership-success",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.expiredMembership),
            providerPaymentId: "expired-membership-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };

          const result = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            Buffer.from(JSON.stringify(event), "utf8"),
          );

          assert.equal(result.processed, true);
          assert.equal(result.paymentStatus, "PAID");
          assert.equal(result.actionRequired, true);
          assert.equal(result.membershipActivated, false);

          const [membership, eventRecord] = await Promise.all([
            client.membership.findUniqueOrThrow({
              where: { id: IDS.expiredMembership },
            }),
            client.paymentProviderEvent.findUniqueOrThrow({
              where: {
                provider_providerEventId: {
                  provider: PROVIDER,
                  providerEventId: event.providerEventId,
                },
              },
            }),
          ]);
          assert.equal(membership.status, "EXPIRED");
          assert.equal(eventRecord.processingStatus, "ACTION_REQUIRED");
        },
      );

      await t.test(
        "successful payment with already ACTIVE membership returns PROCESSED and membershipActivated=true",
        async () => {
          const event = {
            providerEventId: "already-active-success",
            eventType: "PAYMENT_SUCCEEDED",
            idempotencyKey: paymentKey(IDS.alreadyActiveMembership),
            providerPaymentId: "already-active-payment",
            amountMinor: AMOUNT_MINOR,
            currency: "MYR",
          };

          const result = await billing.processVerifiedWebhook(
            ORG_ID,
            PROVIDER,
            {},
            Buffer.from(JSON.stringify(event), "utf8"),
          );

          assert.equal(result.processed, true);
          assert.equal(result.paymentStatus, "PAID");
          assert.equal(result.actionRequired, false);
          assert.equal(result.membershipActivated, true);

          const [membership, eventRecord] = await Promise.all([
            client.membership.findUniqueOrThrow({
              where: { id: IDS.alreadyActiveMembership },
            }),
            client.paymentProviderEvent.findUniqueOrThrow({
              where: {
                provider_providerEventId: {
                  provider: PROVIDER,
                  providerEventId: event.providerEventId,
                },
              },
            }),
          ]);
          assert.equal(membership.status, "ACTIVE");
          assert.equal(eventRecord.processingStatus, "PROCESSED");
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

          const providerCreated = await billing.reconcileStaleCheckoutHolds(
            ORG_ID,
            now,
          );
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

          const preProvider = await billing.reconcileStaleCheckoutHolds(
            ORG_ID,
            now,
          );
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
