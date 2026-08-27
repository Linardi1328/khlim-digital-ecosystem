import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { PrepareMembershipCheckoutDto } from "./billing.dto";
import {
  PaymentGatewayRegistry,
  type NormalizedGatewayEvent,
} from "./payment-gateway";

const CURRENT_MEMBERSHIP_TERMS_VERSION = "membership-mvp-v1";

function addMonthsUtc(value: Date, months: number): Date {
  const copy = new Date(value);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateways: PaymentGatewayRegistry,
  ) {}

  async getMembershipBilling(athleteId: string, membershipId: string) {
    const membership = await this.prisma.client.membership.findFirst({
      where: { id: membershipId, athleteId },
      include: {
        agreements: { orderBy: { acceptedAt: "desc" }, take: 1 },
        paymentSchedule: {
          include: {
            installments: {
              orderBy: { sequenceNumber: "asc" },
              include: {
                payments: {
                  orderBy: { attemptedAt: "desc" },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException("Membership not found");
    }

    return membership;
  }

  async prepareMembershipCheckout(
    payerUserId: string,
    athleteId: string,
    membershipId: string,
    body: PrepareMembershipCheckoutDto,
  ) {
    if (body?.acceptTerms !== true) {
      throw new BadRequestException("Membership terms must be accepted");
    }

    const gateway = this.gateways.requireConfigured();
    const membership = await this.prisma.client.membership.findFirst({
      where: { id: membershipId, athleteId },
      include: {
        membershipPlan: true,
        programmeOffering: true,
        purchasedBy: { select: { id: true, email: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException("Membership not found");
    }

    if (membership.purchasedByUserId !== payerUserId) {
      throw new ConflictException(
        "Only the membership purchaser can start its billing agreement",
      );
    }

    if (membership.status !== "PENDING") {
      throw new ConflictException(
        "Only a pending membership can enter checkout",
      );
    }

    const activeCount = await this.prisma.client.membership.count({
      where: {
        programmeOfferingId: membership.programmeOfferingId,
        status: "ACTIVE",
      },
    });
    if (activeCount >= membership.programmeOffering.capacity) {
      throw new ConflictException("Programme offering is at capacity");
    }

    const plan = membership.membershipPlan;
    const installmentCount =
      plan.billingFrequency === "UPFRONT"
        ? 1
        : (plan.commitmentCycles ?? plan.durationMonths ?? 1);
    const amountMinor =
      plan.billingFrequency === "UPFRONT"
        ? plan.upfrontAmountMinor
        : plan.recurringAmountMinor;

    if (amountMinor === null || amountMinor < 0 || installmentCount < 1) {
      throw new ConflictException(
        "Membership plan billing configuration is invalid",
      );
    }

    const startsAt = new Date();
    const schedule = await this.prisma.client.paymentSchedule.upsert({
      where: { membershipId },
      create: {
        membershipId,
        frequency: plan.billingFrequency,
        installmentCount,
        amountPerInstallmentMinor: amountMinor,
        currency: plan.currency,
        startsAt,
        installments: {
          create: Array.from({ length: installmentCount }, (_, index) => ({
            sequenceNumber: index + 1,
            dueAt:
              plan.billingFrequency === "MONTHLY"
                ? addMonthsUtc(startsAt, index)
                : startsAt,
            amountMinor,
            currency: plan.currency,
          })),
        },
      },
      update: {},
      include: {
        installments: { orderBy: { sequenceNumber: "asc" } },
      },
    });

    const firstInstallment = schedule.installments[0];
    if (!firstInstallment) {
      throw new ConflictException("Payment schedule has no installments");
    }

    await this.prisma.client.membershipAgreement.upsert({
      where: {
        membershipId_termsVersion: {
          membershipId,
          termsVersion: CURRENT_MEMBERSHIP_TERMS_VERSION,
        },
      },
      create: {
        membershipId,
        termsVersion: CURRENT_MEMBERSHIP_TERMS_VERSION,
        acceptedByUserId: payerUserId,
        amountMinorSnapshot: amountMinor,
        currencySnapshot: plan.currency,
        billingFrequencySnapshot: plan.billingFrequency,
        installmentCountSnapshot: installmentCount,
      },
      update: {},
    });

    const billingProfile = await this.ensureBillingProfile(
      gateway,
      payerUserId,
      membership.purchasedBy?.email ?? null,
    );
    const idempotencyKey = `membership:${membershipId}:installment:1`;
    const payment = await this.prisma.client.payment.upsert({
      where: { idempotencyKey },
      create: {
        payerUserId,
        membershipId,
        paymentInstallmentId: firstInstallment.id,
        provider: gateway.provider,
        idempotencyKey,
        amountMinor,
        currency: plan.currency,
      },
      update: {},
    });

    if (payment.status === "PAID") {
      throw new ConflictException("First installment is already paid");
    }

    const checkout = await gateway.createCheckout({
      providerCustomerId: billingProfile.providerCustomerId,
      membershipId,
      installmentId: firstInstallment.id,
      amountMinor,
      currency: plan.currency,
      idempotencyKey,
      providerPaymentId: payment.providerPaymentId ?? undefined,
    });

    await this.prisma.client.$transaction([
      this.prisma.client.payment.update({
        where: { id: payment.id },
        data: {
          status: "PROCESSING",
          providerPaymentId: checkout.providerPaymentId ?? undefined,
        },
      }),
      this.prisma.client.paymentInstallment.update({
        where: { id: firstInstallment.id },
        data: { status: "PROCESSING" },
      }),
      this.prisma.client.paymentSchedule.update({
        where: { id: schedule.id },
        data: { status: "ACTIVE" },
      }),
    ]);

    return {
      membershipId,
      paymentScheduleId: schedule.id,
      paymentId: payment.id,
      checkoutUrl: checkout.checkoutUrl,
      termsVersion: CURRENT_MEMBERSHIP_TERMS_VERSION,
    };
  }

  private async ensureBillingProfile(
    gateway: ReturnType<PaymentGatewayRegistry["requireConfigured"]>,
    userId: string,
    email: string | null,
  ) {
    const existing = await this.prisma.client.billingProfile.findUnique({
      where: { userId_provider: { userId, provider: gateway.provider } },
    });
    if (existing) return existing;

    const customer = await gateway.createCustomer({
      khlimUserId: userId,
      email,
      idempotencyKey: `billing-profile:${userId}`,
    });
    return this.prisma.client.billingProfile.create({
      data: {
        userId,
        provider: gateway.provider,
        providerCustomerId: customer.providerCustomerId,
      },
    });
  }

  async processVerifiedWebhook(
    provider: string,
    headers: Readonly<Record<string, string | string[] | undefined>>,
    rawBody: Buffer,
  ) {
    const gateway = this.gateways.requireConfigured(provider);
    const event = await gateway.verifyWebhook({ headers, rawBody });
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");

    try {
      await this.prisma.client.paymentProviderEvent.create({
        data: {
          provider: gateway.provider,
          providerEventId: event.providerEventId,
          eventType: event.eventType,
          payloadHash,
          safeMetadata: {
            idempotencyKey: event.idempotencyKey,
          },
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const existing = await this.prisma.client.paymentProviderEvent.findUnique(
        {
          where: {
            provider_providerEventId: {
              provider: gateway.provider,
              providerEventId: event.providerEventId,
            },
          },
        },
      );

      if (!existing) {
        throw error;
      }

      if (
        existing.payloadHash !== payloadHash ||
        existing.eventType !== event.eventType
      ) {
        throw new ConflictException(
          "Provider event payload does not match previously received event",
        );
      }

      if (existing.processingStatus !== "FAILED") {
        return { duplicate: true, providerEventId: event.providerEventId };
      }
    }

    try {
      return await this.applyVerifiedEvent(gateway.provider, event);
    } catch (error) {
      try {
        await this.finishProviderEvent(
          gateway.provider,
          event.providerEventId,
          "FAILED",
        );
      } catch {
        // Preserve the original processing error if failure-state persistence also fails.
      }
      throw error;
    }
  }

  private async applyVerifiedEvent(
    provider: string,
    event: NormalizedGatewayEvent,
  ) {
    const payment = await this.prisma.client.payment.findUnique({
      where: { idempotencyKey: event.idempotencyKey },
      include: {
        paymentInstallment: { include: { paymentSchedule: true } },
        membership: {
          include: { membershipPlan: true, programmeOffering: true },
        },
      },
    });

    if (!payment || payment.provider !== provider) {
      await this.finishProviderEvent(
        provider,
        event.providerEventId,
        "ACTION_REQUIRED",
      );
      return { processed: false, actionRequired: true };
    }

    if (event.eventType === "PAYMENT_FAILED") {
      await this.prisma.client.$transaction(async (transaction) => {
        await transaction.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            providerPaymentId:
              event.providerPaymentId ?? payment.providerPaymentId,
            failureCode: event.failureCode ?? null,
            safeFailureReason: event.safeFailureReason ?? null,
          },
        });
        if (payment.paymentInstallmentId) {
          await transaction.paymentInstallment.update({
            where: { id: payment.paymentInstallmentId },
            data: { status: "FAILED" },
          });
        }
        await transaction.paymentProviderEvent.update({
          where: {
            provider_providerEventId: {
              provider,
              providerEventId: event.providerEventId,
            },
          },
          data: { processingStatus: "PROCESSED", processedAt: new Date() },
        });
      });
      return { processed: true, paymentStatus: "FAILED" };
    }

    return this.prisma.client.$transaction(async (transaction) => {
      const now = new Date();
      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          settledAt: now,
          providerPaymentId:
            event.providerPaymentId ?? payment.providerPaymentId,
          failureCode: null,
          safeFailureReason: null,
        },
      });

      if (payment.paymentInstallmentId) {
        await transaction.paymentInstallment.update({
          where: { id: payment.paymentInstallmentId },
          data: { status: "PAID", paidAt: now },
        });
      }

      let actionRequired = false;
      if (payment.membership?.status === "PENDING") {
        const activeCount = await transaction.membership.count({
          where: {
            programmeOfferingId: payment.membership.programmeOfferingId,
            status: "ACTIVE",
          },
        });
        if (activeCount >= payment.membership.programmeOffering.capacity) {
          actionRequired = true;
        } else {
          const durationMonths =
            payment.membership.membershipPlan.durationMonths ??
            payment.membership.membershipPlan.commitmentCycles;
          await transaction.membership.update({
            where: { id: payment.membership.id },
            data: {
              status: "ACTIVE",
              startsAt: now,
              activatedAt: now,
              endsAt: durationMonths ? addMonthsUtc(now, durationMonths) : null,
            },
          });
        }
      }

      if (payment.paymentInstallment?.paymentScheduleId) {
        const remaining = await transaction.paymentInstallment.count({
          where: {
            paymentScheduleId: payment.paymentInstallment.paymentScheduleId,
            id: { not: payment.paymentInstallment.id },
            status: { notIn: ["PAID", "WAIVED", "CANCELLED"] },
          },
        });
        await transaction.paymentSchedule.update({
          where: { id: payment.paymentInstallment.paymentScheduleId },
          data: { status: remaining === 0 ? "COMPLETED" : "ACTIVE" },
        });
      }

      await transaction.paymentProviderEvent.update({
        where: {
          provider_providerEventId: {
            provider,
            providerEventId: event.providerEventId,
          },
        },
        data: {
          processingStatus: actionRequired ? "ACTION_REQUIRED" : "PROCESSED",
          processedAt: now,
        },
      });

      return {
        processed: true,
        paymentStatus: "PAID",
        membershipActivated: !actionRequired,
        actionRequired,
      };
    });
  }

  private finishProviderEvent(
    provider: string,
    providerEventId: string,
    processingStatus: "ACTION_REQUIRED" | "FAILED",
  ) {
    return this.prisma.client.paymentProviderEvent.update({
      where: { provider_providerEventId: { provider, providerEventId } },
      data: { processingStatus, processedAt: new Date() },
    });
  }
}
