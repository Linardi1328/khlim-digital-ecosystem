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

type WebhookHeaders = Readonly<Record<string, string | string[] | undefined>>;

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

/**
 * Core billing and payment orchestration service for the KHLIM platform.
 *
 * Enforces organization-tenant boundaries, row-level locking concurrency controls,
 * terminal payment state protections, idempotent provider-event ingestion, and
 * server-authoritative membership activation.
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateways: PaymentGatewayRegistry,
  ) {}

  /**
   * Retrieves the authoritative billing state for a membership, including its
   * payment schedule, installments, and payment attempts within an organization.
   *
   * @param organizationIdOrAthleteId - Organization ID (when 3 args) or Athlete ID (legacy compatibility)
   * @param athleteIdOrMembershipId - Athlete ID (when 3 args) or Membership ID (legacy compatibility)
   * @param maybeMembershipId - Membership ID when explicit organization context is provided
   * @throws NotFoundException if the membership is not found within the organization boundary
   */
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

  /**
   * Prepares and initiates a checkout session for a membership's initial payment.
   *
   * Coordinates payment reservation, membership terms agreement snapshotting,
   * external checkout creation via the configured payment gateway, and atomic
   * database status updates.
   *
   * If a concurrent webhook or external settlement finalizes the payment while the
   * gateway call is inflight (causing the conditional status update to affect 0 rows),
   * this method refuses to return the checkout URL and throws a ConflictException.
   *
   * @param organizationIdOrPayerUserId - Organization ID or Payer User ID
   * @param payerUserIdOrAthleteId - Payer User ID or Athlete ID
   * @param athleteIdOrMembershipId - Athlete ID or Membership ID
   * @param membershipIdOrBody - Membership ID or checkout payload DTO
   * @param maybeBody - Checkout payload DTO when explicit organization context is provided
   * @throws BadRequestException if terms have not been accepted
   * @throws ConflictException if payment is already paid, locked, or belongs to another organization
   */
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

    if (amountMinor === null || amountMinor <= 0 || installmentCount < 1) {
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
    let payment = await this.prisma.client.payment.upsert({
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
    if (payment.status === "REFUNDED" || payment.status === "CANCELLED") {
      throw new ConflictException(
        "A terminal payment cannot be reopened for checkout",
      );
    }

    if (!payment.providerPaymentId) {
      const claimed = await this.prisma.client.payment.updateMany({
        where: {
          id: payment.id,
          organizationId,
          status: "PENDING",
          providerPaymentId: null,
        },
        data: { status: "PROCESSING" },
      });

      if (claimed.count === 1) {
        payment = await this.prisma.client.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
      } else {
        const existing = await this.prisma.client.payment.findUnique({
          where: { id: payment.id },
        });
        if (!existing || existing.organizationId !== organizationId) {
          throw new ConflictException(
            "Payment belongs to a different organization",
          );
        }
        if (!existing.providerPaymentId) {
          throw new ConflictException(
            "Checkout creation is already in progress",
          );
        }
        payment = existing;
      }
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

    const checkoutState = await this.prisma.client.$transaction(
      async (transaction) => {
        const stillProcessing = await transaction.payment.updateMany({
          where: {
            id: payment.id,
            organizationId,
            status: "PROCESSING",
          },
          data: {
            providerPaymentId: checkout.providerPaymentId ?? undefined,
          },
        });

        if (stillProcessing.count === 0) {
          const current = await transaction.payment.findFirst({
            where: { id: payment.id, organizationId },
            select: { status: true },
          });
          return current?.status ?? null;
        }

        await transaction.paymentInstallment.updateMany({
          where: {
            id: firstInstallment.id,
            status: { in: ["SCHEDULED", "PROCESSING"] },
          },
          data: { status: "PROCESSING" },
        });
        await transaction.paymentSchedule.updateMany({
          where: { id: schedule.id, status: "PENDING" },
          data: { status: "ACTIVE" },
        });

        return "PROCESSING" as const;
      },
    );

    if (checkoutState !== "PROCESSING") {
      throw new ConflictException(
        checkoutState === "PAID"
          ? "First installment is already paid"
          : "Payment is no longer available for checkout",
      );
    }

    return {
      membershipId,
      paymentScheduleId: schedule.id,
      paymentId: payment.id,
      checkoutUrl: checkout.checkoutUrl,
      termsVersion: CURRENT_MEMBERSHIP_TERMS_VERSION,
    };
  }

  /**
   * Reconciles stale processing checkouts that exceed the configured hold duration.
   *
   * Unclaimed pre-provider holds are released back to CANCELLED state to free capacity,
   * while sessions already assigned a provider payment reference are flagged for manual review.
   *
   * @param organizationIdOrNow - Organization ID or reference Date
   * @param maybeNow - Reference Date when explicit organization context is provided
   */
  async reconcileStaleCheckoutHolds(
    organizationIdOrNow?: string | Date,
    maybeNow?: Date,
  ) {
    const organizationId =
      typeof organizationIdOrNow === "string"
        ? organizationIdOrNow
        : compatibilityOrganizationId();
    const now =
      typeof organizationIdOrNow === "string"
        ? (maybeNow ?? new Date())
        : (organizationIdOrNow ?? new Date());
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
    let actionRequired = 0;
    for (const payment of stalePayments) {
      if (payment.providerPaymentId) {
        actionRequired += 1;
        continue;
      }

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
      actionRequired,
      cutoff: cutoff.toISOString(),
      holdMinutes: checkoutHoldMinutes(),
    };
  }

  /**
   * Ensures an authoritative billing profile exists for a customer with the payment provider.
   *
   * @param organizationId - Tenant organization ID
   * @param gateway - Configured payment gateway adapter
   * @param userId - KHLIM customer user ID
   * @param email - Customer email address
   */
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
      organizationId,
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

  /**
   * Ingests and processes a verified webhook payload from an external payment gateway.
   *
   * Guarantees idempotency via cryptographic payload hashing and unique provider event
   * tracking. Stale or duplicated events already PROCESSED or marked ACTION_REQUIRED
   * return early without re-executing state transitions.
   *
   * @param organizationIdOrProvider - Tenant organization ID or payment provider identifier
   * @param providerOrHeaders - Payment provider identifier or raw webhook headers
   * @param headersOrRawBody - Raw webhook headers or raw webhook body buffer
   * @param maybeRawBody - Raw webhook body buffer when explicit organization context is provided
   * @throws UnauthorizedException if webhook signature verification fails
   * @throws ConflictException if the provider event is invalid or belongs to another organization
   */
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
      ? (maybeRawBody as Buffer)
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

      if (
        existing.processingStatus === "PROCESSED" ||
        existing.processingStatus === "ACTION_REQUIRED"
      ) {
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

  /**
   * Applies a verified gateway event within an isolated database transaction with row-level locking.
   *
   * Enforces the following security and concurrency guarantees:
   * - Acquires a row lock (`SELECT ... FOR UPDATE`) on the target payment record.
   * - Verifies tenant organization boundaries across payment, schedule, and membership relations.
   * - Terminal state protection: A `PAID` payment cannot be overwritten or downgraded by a late `FAILED` event.
   * - Success recovery: A previously `FAILED` payment transitions to `PAID` upon verified success,
   *   clearing prior failure codes and reasons.
   * - Explicit membership activation: Membership is activated only if eligible (`PENDING` with available capacity).
   *   Already `ACTIVE` memberships are accepted as active. Ineligible, `CANCELLED`, `EXPIRED`, or missing memberships
   *   are flagged with `actionRequired = true` and `membershipActivated = false`.
   *
   * @param organizationId - Tenant organization ID
   * @param provider - Payment gateway provider identifier
   * @param event - Normalized webhook event payload
   */
  private async applyVerifiedEvent(
    organizationId: string,
    provider: string,
    event: NormalizedGatewayEvent,
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      const finishEvent = async (
        processingStatus: "PROCESSED" | "ACTION_REQUIRED",
        processedAt = new Date(),
      ) => {
        const updatedEvent = await transaction.paymentProviderEvent.updateMany({
          where: {
            organizationId,
            provider,
            providerEventId: event.providerEventId,
          },
          data: { processingStatus, processedAt },
        });
        if (updatedEvent.count !== 1) {
          throw new ConflictException(
            "Provider event belongs to a different organization",
          );
        }
      };

      const paymentReference = await transaction.payment.findFirst({
        where: { organizationId, idempotencyKey: event.idempotencyKey },
        select: { id: true, provider: true },
      });

      if (!paymentReference || paymentReference.provider !== provider) {
        await finishEvent("ACTION_REQUIRED");
        return { processed: false, actionRequired: true };
      }

      const lockedPayments = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id::text
        FROM payments
        WHERE id = ${paymentReference.id}::uuid
          AND organization_id = ${organizationId}::uuid
        FOR UPDATE
      `;

      if (lockedPayments.length !== 1) {
        await finishEvent("ACTION_REQUIRED");
        return {
          processed: false,
          actionRequired: true,
          reason: "PAYMENT_NOT_AVAILABLE_FOR_PROCESSING",
        };
      }

      const payment = await transaction.payment.findFirst({
        where: { id: paymentReference.id, organizationId },
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
        await finishEvent("ACTION_REQUIRED");
        return { processed: false, actionRequired: true };
      }

      if (
        (payment.membership &&
          payment.membership.organizationId !== organizationId) ||
        (payment.paymentInstallment?.paymentSchedule.membership
          .organizationId &&
          payment.paymentInstallment.paymentSchedule.membership
            .organizationId !== organizationId)
      ) {
        await finishEvent("ACTION_REQUIRED");
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
        await finishEvent("ACTION_REQUIRED");
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
        await finishEvent("ACTION_REQUIRED");
        return {
          processed: false,
          actionRequired: true,
          reason: "PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH",
        };
      }

      if (payment.status === "PAID") {
        await finishEvent("PROCESSED");
        return {
          processed: true,
          paymentStatus: "PAID",
          membershipActivated: payment.membership?.status === "ACTIVE",
          actionRequired: false,
          ignoredTerminalState: true,
        };
      }

      if (payment.status === "REFUNDED" || payment.status === "CANCELLED") {
        await finishEvent("ACTION_REQUIRED");
        return {
          processed: false,
          actionRequired: true,
          reason: "TERMINAL_PAYMENT_STATE_REQUIRES_REVIEW",
        };
      }

      if (event.eventType === "PAYMENT_FAILED") {
        if (payment.status === "FAILED") {
          await finishEvent("PROCESSED");
          return {
            processed: true,
            paymentStatus: "FAILED",
            ignoredTerminalState: true,
          };
        }

        const now = new Date();
        await transaction.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failedAt: now,
            providerPaymentId:
              event.providerPaymentId ?? payment.providerPaymentId,
            failureCode: event.failureCode ?? null,
            safeFailureReason: event.safeFailureReason ?? null,
          },
        });
        if (payment.paymentInstallmentId) {
          await transaction.paymentInstallment.updateMany({
            where: {
              id: payment.paymentInstallmentId,
              status: { in: ["SCHEDULED", "PROCESSING", "FAILED", "OVERDUE"] },
            },
            data: { status: "FAILED" },
          });
        }
        await finishEvent("PROCESSED", now);
        return { processed: true, paymentStatus: "FAILED" };
      }

      const now = new Date();
      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          settledAt: payment.settledAt ?? now,
          providerPaymentId:
            event.providerPaymentId ?? payment.providerPaymentId,
          failedAt: null,
          failureCode: null,
          safeFailureReason: null,
        },
      });

      if (payment.paymentInstallmentId) {
        await transaction.paymentInstallment.updateMany({
          where: {
            id: payment.paymentInstallmentId,
            status: { in: ["SCHEDULED", "PROCESSING", "FAILED", "OVERDUE"] },
          },
          data: {
            status: "PAID",
            paidAt: payment.paymentInstallment?.paidAt ?? now,
          },
        });
      }

      let actionRequired = false;
      let membershipActivated = false;

      if (!payment.membership) {
        actionRequired = true;
        membershipActivated = false;
      } else if (payment.membership.status === "ACTIVE") {
        membershipActivated = true;
        actionRequired = false;
      } else if (payment.membership.status === "PENDING") {
        const lockedOfferings = await transaction.$queryRaw<
          Array<{ id: string }>
        >`
          SELECT id::text
          FROM programme_offerings
          WHERE id = ${payment.membership.programmeOfferingId}::uuid
            AND organization_id = ${organizationId}::uuid
          FOR UPDATE
        `;

        if (lockedOfferings.length !== 1) {
          actionRequired = true;
          membershipActivated = false;
        } else {
          const activeCount = await transaction.membership.count({
            where: {
              organizationId,
              programmeOfferingId: payment.membership.programmeOfferingId,
              status: "ACTIVE",
            },
          });
          if (activeCount >= payment.membership.programmeOffering.capacity) {
            actionRequired = true;
            membershipActivated = false;
          } else {
            const durationMonths =
              payment.membership.membershipPlan.durationMonths ??
              payment.membership.membershipPlan.commitmentCycles;
            const activated = await transaction.membership.updateMany({
              where: {
                id: payment.membership.id,
                organizationId,
                status: "PENDING",
              },
              data: {
                status: "ACTIVE",
                startsAt: now,
                activatedAt: now,
                endsAt: durationMonths
                  ? addMonthsUtc(now, durationMonths)
                  : null,
              },
            });
            if (activated.count === 1) {
              membershipActivated = true;
            } else {
              const currentMembership = await transaction.membership.findFirst({
                where: { id: payment.membership.id, organizationId },
                select: { status: true },
              });
              if (currentMembership?.status === "ACTIVE") {
                membershipActivated = true;
              } else {
                actionRequired = true;
                membershipActivated = false;
              }
            }
          }
        }
      } else {
        actionRequired = true;
        membershipActivated = false;
      }

      if (payment.paymentInstallment?.paymentScheduleId) {
        const remaining = await transaction.paymentInstallment.count({
          where: {
            paymentScheduleId: payment.paymentInstallment.paymentScheduleId,
            id: { not: payment.paymentInstallment.id },
            status: { notIn: ["PAID", "WAIVED", "CANCELLED"] },
          },
        });
        await transaction.paymentSchedule.updateMany({
          where: {
            id: payment.paymentInstallment.paymentScheduleId,
            status: { in: ["PENDING", "ACTIVE"] },
          },
          data: { status: remaining === 0 ? "COMPLETED" : "ACTIVE" },
        });
      }

      await finishEvent(actionRequired ? "ACTION_REQUIRED" : "PROCESSED", now);

      return {
        processed: true,
        paymentStatus: "PAID",
        membershipActivated,
        actionRequired,
      };
    });
  }

  /**
   * Persists the final processing status of a provider event within an organization.
   *
   * @param organizationId - Tenant organization ID
   * @param provider - Payment gateway provider identifier
   * @param providerEventId - Gateway-assigned provider event ID
   * @param processingStatus - Terminal or review status to persist
   */
  private async finishProviderEvent(
    organizationId: string,
    provider: string,
    providerEventId: string,
    processingStatus: "PROCESSED" | "ACTION_REQUIRED" | "FAILED",
  ) {
    const event = await this.prisma.client.paymentProviderEvent.findFirst({
      where: { organizationId, provider, providerEventId },
      select: { id: true },
    });
    if (!event) {
      throw new ConflictException(
        "Provider event belongs to a different organization",
      );
    }
    return this.prisma.client.paymentProviderEvent.update({
      where: { id: event.id },
      data: { processingStatus, processedAt: new Date() },
    });
  }
}
