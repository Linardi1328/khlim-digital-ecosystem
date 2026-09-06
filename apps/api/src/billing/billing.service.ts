import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  DEFAULT_ORGANIZATION_ID,
  MULTI_ORGANIZATION_RUNTIME_ENABLED,
} from "../organization/organization.constants";
import type { PrepareMembershipCheckoutDto } from "./billing.dto";
import {
  PaymentGatewayRegistry,
  type NormalizedGatewayEvent,
} from "./payment-gateway";

const CURRENT_MEMBERSHIP_TERMS_VERSION = "membership-mvp-v1";
const DEFAULT_CHECKOUT_HOLD_MINUTES = 45;

type WebhookHeaders = Readonly<
  Record<string, string | string[] | undefined>
>;

function checkoutHoldMinutes(): number {
  const configured = Number.parseInt(
    process.env.PAYMENT_CHECKOUT_HOLD_MINUTES ?? "",
    10,
  );
  return Number.isFinite(configured) && configured >= 5 && configured <= 1440
    ? configured
    : DEFAULT_CHECKOUT_HOLD_MINUTES;
}

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

function compatibilityOrganizationId(): string {
  if (MULTI_ORGANIZATION_RUNTIME_ENABLED) {
    throw new ServiceUnavailableException(
      "Explicit organization context is required for billing when multi-organization runtime is enabled",
    );
  }
  return DEFAULT_ORGANIZATION_ID;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateways: PaymentGatewayRegistry,
  ) {}

  async getMembershipBilling(
    organizationIdOrAthleteId: string,
    athleteIdOrMembershipId: string,
    maybeMembershipId?: string,
  ) {
    const organizationId = maybeMembershipId
      ? organizationIdOrAthleteId
      : compatibilityOrganizationId();
    const athleteId = maybeMembershipId
      ? athleteIdOrMembershipId
      : organizationIdOrAthleteId;
    const membershipId = maybeMembershipId ?? athleteIdOrMembershipId;

    const membership = await this.prisma.client.membership.findFirst({
      where: { id: membershipId, athleteId, organizationId },
      include: {
        agreements: { orderBy: { acceptedAt: "desc" }, take: 1 },
        paymentSchedule: {
          include: {
            installments: {
              orderBy: { sequenceNumber: "asc" },
              include: {
                payments: {
                  where: { organizationId },
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
    organizationIdOrPayerUserId: string,
    payerUserIdOrAthleteId: string,
    athleteIdOrMembershipId: string,
    membershipIdOrBody: string | PrepareMembershipCheckoutDto,
    maybeBody?: PrepareMembershipCheckoutDto,
  ) {
    const hasExplicitOrganization = maybeBody !== undefined;
    const organizationId = hasExplicitOrganization
      ? organizationIdOrPayerUserId
      : compatibilityOrganizationId();
    const payerUserId = hasExplicitOrganization
      ? payerUserIdOrAthleteId
      : organizationIdOrPayerUserId;
    const athleteId = hasExplicitOrganization
      ? athleteIdOrMembershipId
      : payerUserIdOrAthleteId;
    const membershipId = hasExplicitOrganization
      ? (membershipIdOrBody as string)
      : athleteIdOrMembershipId;
    const body = hasExplicitOrganization
      ? maybeBody
      : (membershipIdOrBody as PrepareMembershipCheckoutDto);

    if (body?.acceptTerms !== true) {
      throw new BadRequestException("Membership terms must be accepted");
    }

    const gateway = this.gateways.requireConfigured();
    const membership = await this.prisma.client.membership.findFirst({
      where: { id: membershipId, athleteId, organizationId },
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
        organizationId,
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
      organizationId,
      gateway,
      payerUserId,
      membership.purchasedBy?.email ?? null,
    );
    const idempotencyKey = `membership:${membershipId}:installment:1`;
    const payment = await this.prisma.client.payment.upsert({
      where: { idempotencyKey },
      create: {
        organizationId,
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

    if (payment.organizationId !== organizationId) {
      throw new ConflictException(
        "Payment belongs to a different organization",
      );
    }

    if (payment.status === "PAID") {
      throw new ConflictException("First installment is already paid");
    }

    const checkout = await gateway.createCheckout({
      providerCustomerId: billingProfile.providerCustomerId,
      payerEmail: membership.purchasedBy?.email ?? null,
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

  async reconcileStaleCheckoutHolds(
    organizationIdOrNow: string | Date = DEFAULT_ORGANIZATION_ID,
    maybeNow?: Date,
  ) {
    const organizationId =
      typeof organizationIdOrNow === "string"
        ? organizationIdOrNow
        : compatibilityOrganizationId();
    const now =
      typeof organizationIdOrNow === "string"
        ? (maybeNow ?? new Date())
        : organizationIdOrNow;
    const cutoff = new Date(now.getTime() - checkoutHoldMinutes() * 60 * 1000);
    const stalePayments = await this.prisma.client.payment.findMany({
      where: {
        organizationId,
        status: "PROCESSING",
        attemptedAt: { lt: cutoff },
        membership: { is: { organizationId, status: "PENDING" } },
      },
      include: { paymentInstallment: true, membership: true },
    });

    let expired = 0;
    for (const payment of stalePayments) {
      await this.prisma.client.$transaction(async (transaction) => {
        const cancelled = await transaction.payment.updateMany({
          where: {
            id: payment.id,
            organizationId,
            status: "PROCESSING",
          },
          data: {
            status: "CANCELLED",
            failedAt: now,
            failureCode: "checkout_expired",
            safeFailureReason: "Checkout expired before provider confirmation",
          },
        });
        if (cancelled.count === 0) return;

        if (payment.paymentInstallmentId) {
          await transaction.paymentInstallment.updateMany({
            where: {
              id: payment.paymentInstallmentId,
              status: "PROCESSING",
            },
            data: { status: "CANCELLED" },
          });
        }
        if (payment.paymentInstallment?.paymentScheduleId) {
          await transaction.paymentSchedule.updateMany({
            where: {
              id: payment.paymentInstallment.paymentScheduleId,
              status: { in: ["PENDING", "ACTIVE"] },
            },
            data: { status: "CANCELLED" },
          });
        }
        if (payment.membershipId) {
          await transaction.membership.updateMany({
            where: {
              id: payment.membershipId,
              organizationId,
              status: "PENDING",
            },
            data: { status: "CANCELLED", cancelledAt: now },
          });
        }
        expired += 1;
      });
    }

    return {
      expired,
      cutoff: cutoff.toISOString(),
      holdMinutes: checkoutHoldMinutes(),
    };
  }

  private async ensureBillingProfile(
    organizationId: string,
    gateway: ReturnType<PaymentGatewayRegistry["requireConfigured"]>,
    userId: string,
    email: string | null,
  ) {
    const existing = await this.prisma.client.billingProfile.findUnique({
      where: {
        organizationId_userId_provider: {
          organizationId,
          userId,
          provider: gateway.provider,
        },
      },
    });
    if (existing) return existing;

    const customer = await gateway.createCustomer({
      khlimUserId: userId,
      email,
      idempotencyKey: `billing-profile:${organizationId}:${userId}`,
    });
    return this.prisma.client.billingProfile.create({
      data: {
        organizationId,
        userId,
        provider: gateway.provider,
        providerCustomerId: customer.providerCustomerId,
      },
    });
  }

  async processVerifiedWebhook(
    organizationIdOrProvider: string,
    providerOrHeaders: string | WebhookHeaders,
    headersOrRawBody: WebhookHeaders | Buffer,
    maybeRawBody?: Buffer,
  ) {
    const hasExplicitOrganization = maybeRawBody !== undefined;
    const organizationId = hasExplicitOrganization
      ? organizationIdOrProvider
      : compatibilityOrganizationId();
    const provider = hasExplicitOrganization
      ? (providerOrHeaders as string)
      : organizationIdOrProvider;
    const headers = hasExplicitOrganization
      ? (headersOrRawBody as WebhookHeaders)
      : (providerOrHeaders as WebhookHeaders);
    const rawBody = hasExplicitOrganization
      ? maybeRawBody
      : (headersOrRawBody as Buffer);

    const gateway = this.gateways.requireConfigured(provider);
    const event = await gateway.verifyWebhook({ headers, rawBody });
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");

    try {
      await this.prisma.client.paymentProviderEvent.create({
        data: {
          organizationId,
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

      if (existing.organizationId !== organizationId) {
        throw new ConflictException(
          "Provider event already belongs to a different organization",
        );
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
      return await this.applyVerifiedEvent(
        organizationId,
        gateway.provider,
        event,
      );
    } catch (error) {
      try {
        await this.finishProviderEvent(
          organizationId,
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
    organizationId: string,
    provider: string,
    event: NormalizedGatewayEvent,
  ) {
    const payment = await this.prisma.client.payment.findFirst({
      where: { organizationId, idempotencyKey: event.idempotencyKey },
      include: {
        paymentInstallment: {
          include: {
            paymentSchedule: {
              include: {
                membership: { select: { organizationId: true } },
              },
            },
          },
        },
        membership: {
          include: { membershipPlan: true, programmeOffering: true },
        },
      },
    });

    if (!payment || payment.provider !== provider) {
      await this.finishProviderEvent(
        organizationId,
        provider,
        event.providerEventId,
        "ACTION_REQUIRED",
      );
      return { processed: false, actionRequired: true };
    }

    if (
      (payment.membership &&
        payment.membership.organizationId !== organizationId) ||
      (payment.paymentInstallment?.paymentSchedule.membership.organizationId &&
        payment.paymentInstallment.paymentSchedule.membership.organizationId !==
          organizationId)
    ) {
      await this.finishProviderEvent(
        organizationId,
        provider,
        event.providerEventId,
        "ACTION_REQUIRED",
      );
      return {
        processed: false,
        actionRequired: true,
        reason: "CROSS_ORGANIZATION_PAYMENT_RELATION",
      };
    }

    if (
      payment.providerPaymentId &&
      event.providerPaymentId &&
      payment.providerPaymentId !== event.providerPaymentId
    ) {
      await this.finishProviderEvent(
        organizationId,
        provider,
        event.providerEventId,
        "ACTION_REQUIRED",
      );
      return {
        processed: false,
        actionRequired: true,
        reason: "PROVIDER_PAYMENT_ID_MISMATCH",
      };
    }

    if (
      (event.amountMinor !== undefined &&
        event.amountMinor !== payment.amountMinor) ||
      (event.currency !== undefined && event.currency !== payment.currency)
    ) {
      await this.finishProviderEvent(
        organizationId,
        provider,
        event.providerEventId,
        "ACTION_REQUIRED",
      );
      return {
        processed: false,
        actionRequired: true,
        reason: "PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH",
      };
    }

    if (payment.status === "PAID") {
      await this.finishProviderEvent(
        organizationId,
        provider,
        event.providerEventId,
        "PROCESSED",
      );
      return {
        processed: true,
        paymentStatus: "PAID",
        membershipActivated: payment.membership?.status === "ACTIVE",
        actionRequired: false,
        ignoredTerminalState: true,
      };
    }

    if (payment.status === "REFUNDED" || payment.status === "CANCELLED") {
      await this.finishProviderEvent(
        organizationId,
        provider,
        event.providerEventId,
        "ACTION_REQUIRED",
      );
      return {
        processed: false,
        actionRequired: true,
        reason: "TERMINAL_PAYMENT_STATE_REQUIRES_REVIEW",
      };
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
            organizationId_provider_providerEventId: {
              organizationId,
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
          settledAt: payment.settledAt ?? now,
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
            organizationId,
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
    organizationId: string,
    provider: string,
    providerEventId: string,
    processingStatus: "PROCESSED" | "ACTION_REQUIRED" | "FAILED",
  ) {
    return this.prisma.client.paymentProviderEvent
      .update({
        where: { provider_providerEventId: { provider, providerEventId } },
        data: { processingStatus, processedAt: new Date() },
      })
      .then((event) => {
        if (event.organizationId !== organizationId) {
          throw new ConflictException(
            "Provider event belongs to a different organization",
          );
        }
        return event;
      });
  }
}
