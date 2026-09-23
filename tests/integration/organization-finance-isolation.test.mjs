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

const KHLIM_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const FOREIGN_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000003";
const USER_ID = "30000000-0000-4000-8000-000000000001";
const ATHLETE_ID = "30000000-0000-4000-8000-000000000002";
const SPORT_ID = "30000000-0000-4000-8000-000000000003";
const PROGRAMME_ID = "30000000-0000-4000-8000-000000000004";
const OFFERING_ID = "30000000-0000-4000-8000-000000000005";
const PLAN_ID = "30000000-0000-4000-8000-000000000006";
const MEMBERSHIP_ID = "30000000-0000-4000-8000-000000000007";
const SCHEDULE_ID = "30000000-0000-4000-8000-000000000008";
const INSTALLMENT_ID = "30000000-0000-4000-8000-000000000009";
const PAYMENT_ID = "30000000-0000-4000-8000-000000000010";
const PROVIDER = "organization-isolation";
const PROVIDER_EVENT_ID = "organization-isolation-event-1";
const IDEMPOTENCY_KEY = `membership:${MEMBERSHIP_ID}:installment:1`;

class IsolationGateway {
  provider = PROVIDER;

  async createCustomer() {
    return { providerCustomerId: "isolation-customer" };
  }

  async createCheckout() {
    return { checkoutUrl: "https://example.test/isolation-checkout" };
  }

  async verifyWebhook() {
    return {
      providerEventId: PROVIDER_EVENT_ID,
      eventType: "PAYMENT_SUCCEEDED",
      idempotencyKey: IDEMPOTENCY_KEY,
      providerPaymentId: "isolation-payment-provider-id",
      amountMinor: 1000,
      currency: "MYR",
    };
  }

  async refund() {}
}

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for finance isolation tests");
  }
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("Finance isolation tests require a test database");
  }
  return true;
}

function expectStatus(expected) {
  return (error) => {
    assert.equal(error?.getStatus?.(), expected);
    return true;
  };
}

const enabled = databaseTestsEnabled();

test(
  "finance reads and provider events fail closed across organizations",
  {
    skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests",
  },
  async () => {
    const prisma = new PrismaService();
    const registry = new PaymentGatewayRegistry();
    registry.register(new IsolationGateway());
    const billing = new BillingService(prisma, registry);
    const client = prisma.client;

    try {
      await client.organization.upsert({
        where: { id: FOREIGN_ORGANIZATION_ID },
        create: {
          id: FOREIGN_ORGANIZATION_ID,
          slug: "synthetic-finance-org-003",
          name: "Synthetic Finance Organization #003",
        },
        update: { status: "ACTIVE" },
      });
      await client.user.create({
        data: {
          id: USER_ID,
          authProviderSubject: "finance-isolation-user",
          email: "finance.isolation@example.test",
        },
      });
      await client.athleteProfile.create({
        data: {
          id: ATHLETE_ID,
          displayName: "Finance Isolation Athlete",
          dateOfBirth: new Date("2014-01-01T00:00:00.000Z"),
        },
      });
      await client.sport.create({
        data: {
          id: SPORT_ID,
          code: "ORG_FINANCE_ISOLATION",
          defaultName: "Finance Isolation Basketball",
        },
      });
      await client.programme.create({
        data: {
          id: PROGRAMME_ID,
          organizationId: FOREIGN_ORGANIZATION_ID,
          sportId: SPORT_ID,
          code: "ORG_FINANCE_ISOLATION_PROGRAMME",
          name: "Finance Isolation Programme",
        },
      });
      await client.programmeOffering.create({
        data: {
          id: OFFERING_ID,
          organizationId: FOREIGN_ORGANIZATION_ID,
          programmeId: PROGRAMME_ID,
          name: "Finance Isolation Offering",
          capacity: 10,
          status: "OPEN",
        },
      });
      await client.membershipPlan.create({
        data: {
          id: PLAN_ID,
          organizationId: FOREIGN_ORGANIZATION_ID,
          name: "Finance Isolation Plan",
          durationMonths: 1,
          commitmentCycles: 1,
          billingFrequency: "UPFRONT",
          upfrontAmountMinor: 1000,
          currency: "MYR",
        },
      });
      await client.membership.create({
        data: {
          id: MEMBERSHIP_ID,
          organizationId: FOREIGN_ORGANIZATION_ID,
          athleteId: ATHLETE_ID,
          programmeOfferingId: OFFERING_ID,
          membershipPlanId: PLAN_ID,
          purchasedByUserId: USER_ID,
          status: "PENDING",
        },
      });
      await client.paymentSchedule.create({
        data: {
          id: SCHEDULE_ID,
          membershipId: MEMBERSHIP_ID,
          frequency: "UPFRONT",
          installmentCount: 1,
          amountPerInstallmentMinor: 1000,
          currency: "MYR",
          startsAt: new Date(),
          status: "ACTIVE",
        },
      });
      await client.paymentInstallment.create({
        data: {
          id: INSTALLMENT_ID,
          paymentScheduleId: SCHEDULE_ID,
          sequenceNumber: 1,
          dueAt: new Date(),
          amountMinor: 1000,
          currency: "MYR",
          status: "PROCESSING",
        },
      });
      await client.payment.create({
        data: {
          id: PAYMENT_ID,
          organizationId: FOREIGN_ORGANIZATION_ID,
          payerUserId: USER_ID,
          membershipId: MEMBERSHIP_ID,
          paymentInstallmentId: INSTALLMENT_ID,
          provider: PROVIDER,
          idempotencyKey: IDEMPOTENCY_KEY,
          amountMinor: 1000,
          currency: "MYR",
          status: "PROCESSING",
        },
      });

      await assert.rejects(
        () =>
          billing.getMembershipBilling(
            KHLIM_ORGANIZATION_ID,
            ATHLETE_ID,
            MEMBERSHIP_ID,
          ),
        expectStatus(404),
      );

      const foreignBilling = await billing.getMembershipBilling(
        FOREIGN_ORGANIZATION_ID,
        ATHLETE_ID,
        MEMBERSHIP_ID,
      );
      assert.equal(foreignBilling.organizationId, FOREIGN_ORGANIZATION_ID);
      assert.equal(
        foreignBilling.paymentSchedule?.installments[0]?.payments[0]
          ?.organizationId,
        FOREIGN_ORGANIZATION_ID,
      );

      const wrongOrganizationResult = await billing.processVerifiedWebhook(
        KHLIM_ORGANIZATION_ID,
        PROVIDER,
        {},
        Buffer.from("organization-isolation-event"),
      );
      assert.equal(wrongOrganizationResult.processed, false);
      assert.equal(wrongOrganizationResult.actionRequired, true);

      const paymentAfterWrongRoute = await client.payment.findUnique({
        where: { id: PAYMENT_ID },
      });
      assert.equal(paymentAfterWrongRoute?.status, "PROCESSING");
      assert.equal(
        paymentAfterWrongRoute?.organizationId,
        FOREIGN_ORGANIZATION_ID,
      );

      await assert.rejects(
        () =>
          billing.processVerifiedWebhook(
            FOREIGN_ORGANIZATION_ID,
            PROVIDER,
            {},
            Buffer.from("organization-isolation-event"),
          ),
        expectStatus(409),
      );

      const event = await client.paymentProviderEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: PROVIDER,
            providerEventId: PROVIDER_EVENT_ID,
          },
        },
      });
      assert.equal(event?.organizationId, KHLIM_ORGANIZATION_ID);
      assert.equal(event?.processingStatus, "ACTION_REQUIRED");
    } finally {
      await client.paymentProviderEvent.deleteMany({
        where: { provider: PROVIDER },
      });
      await client.payment.deleteMany({ where: { id: PAYMENT_ID } });
      await client.paymentInstallment.deleteMany({
        where: { id: INSTALLMENT_ID },
      });
      await client.paymentSchedule.deleteMany({ where: { id: SCHEDULE_ID } });
      await client.membership.deleteMany({ where: { id: MEMBERSHIP_ID } });
      await client.membershipPlan.deleteMany({ where: { id: PLAN_ID } });
      await client.programmeOffering.deleteMany({ where: { id: OFFERING_ID } });
      await client.programme.deleteMany({ where: { id: PROGRAMME_ID } });
      await client.sport.deleteMany({ where: { id: SPORT_ID } });
      await client.athleteProfile.deleteMany({ where: { id: ATHLETE_ID } });
      await client.user.deleteMany({ where: { id: USER_ID } });
      await client.organization.deleteMany({
        where: { id: FOREIGN_ORGANIZATION_ID },
      });
      await prisma.onModuleDestroy();
    }
  },
);
