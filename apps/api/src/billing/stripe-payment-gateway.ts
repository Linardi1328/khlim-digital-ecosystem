import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import Stripe from "stripe";
import type {
  CreateGatewayCheckoutInput,
  CreateGatewayCheckoutResult,
  CreateGatewayCustomerInput,
  CreateGatewayCustomerResult,
  NormalizedGatewayEvent,
  PaymentGatewayAdapter,
  VerifyGatewayWebhookInput,
} from "./payment-gateway";

const STRIPE_IDEMPOTENCY_METADATA_KEY = "khlim_idempotency_key";
const STRIPE_MEMBERSHIP_METADATA_KEY = "khlim_membership_id";
const STRIPE_INSTALLMENT_METADATA_KEY = "khlim_installment_id";

function configuredValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function requireConfiguredValue(name: string, label: string): string {
  const value = configuredValue(name);
  if (!value) {
    throw new ServiceUnavailableException(`${label} is not configured`);
  }
  return value;
}

function headerValue(
  headers: VerifyGatewayWebhookInput["headers"],
  targetName: string,
): string | undefined {
  const target = targetName.toLowerCase();
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() !== target) continue;
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

function paymentIntentId(
  value: string | Stripe.PaymentIntent | null,
): string | undefined {
  if (typeof value === "string") return value;
  return value?.id;
}

@Injectable()
export class StripePaymentGatewayAdapter implements PaymentGatewayAdapter {
  readonly provider = "stripe";
  private client: Stripe | null = null;

  isConfigured(): boolean {
    return Boolean(
      configuredValue("STRIPE_SECRET_KEY") &&
      configuredValue("STRIPE_WEBHOOK_SECRET") &&
      configuredValue("STRIPE_CHECKOUT_SUCCESS_URL") &&
      configuredValue("STRIPE_CHECKOUT_CANCEL_URL"),
    );
  }

  async createCustomer(
    input: CreateGatewayCustomerInput,
  ): Promise<CreateGatewayCustomerResult> {
    const customer = await this.stripe().customers.create(
      {
        email: input.email ?? undefined,
        metadata: { khlim_user_id: input.khlimUserId },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return { providerCustomerId: customer.id };
  }

  async createCheckout(
    input: CreateGatewayCheckoutInput,
  ): Promise<CreateGatewayCheckoutResult> {
    const metadata = {
      [STRIPE_IDEMPOTENCY_METADATA_KEY]: input.idempotencyKey,
      [STRIPE_MEMBERSHIP_METADATA_KEY]: input.membershipId,
      [STRIPE_INSTALLMENT_METADATA_KEY]: input.installmentId,
    };

    const session = await this.stripe().checkout.sessions.create(
      {
        mode: "payment",
        customer: input.providerCustomerId,
        success_url: requireConfiguredValue(
          "STRIPE_CHECKOUT_SUCCESS_URL",
          "Stripe checkout success URL",
        ),
        cancel_url: requireConfiguredValue(
          "STRIPE_CHECKOUT_CANCEL_URL",
          "Stripe checkout cancel URL",
        ),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amountMinor,
              product_data: {
                name: "KHLIM Basketball Academy membership installment",
                metadata: {
                  [STRIPE_MEMBERSHIP_METADATA_KEY]: input.membershipId,
                  [STRIPE_INSTALLMENT_METADATA_KEY]: input.installmentId,
                },
              },
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    if (!session.url) {
      throw new ServiceUnavailableException(
        "Stripe Checkout did not return a hosted checkout URL",
      );
    }

    return {
      checkoutUrl: session.url,
      providerPaymentId: paymentIntentId(session.payment_intent),
    };
  }

  async verifyWebhook(
    input: VerifyGatewayWebhookInput,
  ): Promise<NormalizedGatewayEvent> {
    const signature = headerValue(input.headers, "stripe-signature");
    if (!signature) {
      throw new BadRequestException("Stripe webhook signature is required");
    }

    const webhookSecret = requireConfiguredValue(
      "STRIPE_WEBHOOK_SECRET",
      "Stripe webhook secret",
    );

    let event: Stripe.Event;
    try {
      event = this.stripe().webhooks.constructEvent(
        input.rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException("Stripe webhook signature is invalid");
    }

    if (
      event.type !== "payment_intent.succeeded" &&
      event.type !== "payment_intent.payment_failed"
    ) {
      throw new BadRequestException("Unsupported Stripe payment event type");
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const idempotencyKey =
      paymentIntent.metadata?.[STRIPE_IDEMPOTENCY_METADATA_KEY];
    if (!idempotencyKey) {
      throw new BadRequestException("Stripe payment metadata is incomplete");
    }

    if (event.type === "payment_intent.payment_failed") {
      return {
        providerEventId: event.id,
        eventType: "PAYMENT_FAILED",
        idempotencyKey,
        providerPaymentId: paymentIntent.id,
        failureCode: paymentIntent.last_payment_error?.code ?? undefined,
        safeFailureReason:
          paymentIntent.last_payment_error?.decline_code ??
          paymentIntent.last_payment_error?.code ??
          undefined,
      };
    }

    return {
      providerEventId: event.id,
      eventType: "PAYMENT_SUCCEEDED",
      idempotencyKey,
      providerPaymentId: paymentIntent.id,
    };
  }

  async refund(input: {
    providerPaymentId: string;
    amountMinor?: number;
    idempotencyKey: string;
  }): Promise<void> {
    await this.stripe().refunds.create(
      {
        payment_intent: input.providerPaymentId,
        amount: input.amountMinor,
        metadata: { [STRIPE_IDEMPOTENCY_METADATA_KEY]: input.idempotencyKey },
      },
      { idempotencyKey: input.idempotencyKey },
    );
  }

  private stripe(): Stripe {
    if (this.client) return this.client;

    const secretKey = requireConfiguredValue(
      "STRIPE_SECRET_KEY",
      "Stripe secret key",
    );
    this.client = new Stripe(secretKey);
    return this.client;
  }
}
