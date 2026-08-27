import { Injectable, ServiceUnavailableException } from "@nestjs/common";

export interface CreateGatewayCustomerInput {
  khlimUserId: string;
  email: string | null;
  idempotencyKey: string;
}

export interface CreateGatewayCustomerResult {
  providerCustomerId: string;
}

export interface CreateGatewayCheckoutInput {
  providerCustomerId: string;
  payerEmail?: string | null;
  membershipId: string;
  installmentId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  providerPaymentId?: string;
}

export interface CreateGatewayCheckoutResult {
  checkoutUrl: string;
  providerPaymentId?: string;
}

export type NormalizedGatewayEventType = "PAYMENT_SUCCEEDED" | "PAYMENT_FAILED";

export interface NormalizedGatewayEvent {
  providerEventId: string;
  eventType: NormalizedGatewayEventType;
  idempotencyKey: string;
  providerPaymentId?: string;
  failureCode?: string;
  safeFailureReason?: string;
}

export interface VerifyGatewayWebhookInput {
  headers: Readonly<Record<string, string | string[] | undefined>>;
  rawBody: Buffer;
}

export interface PaymentGatewayAdapter {
  readonly provider: string;
  createCustomer(
    input: CreateGatewayCustomerInput,
  ): Promise<CreateGatewayCustomerResult>;
  createCheckout(
    input: CreateGatewayCheckoutInput,
  ): Promise<CreateGatewayCheckoutResult>;
  verifyWebhook(
    input: VerifyGatewayWebhookInput,
  ): Promise<NormalizedGatewayEvent>;
  refund(input: {
    providerPaymentId: string;
    amountMinor?: number;
    idempotencyKey: string;
  }): Promise<void>;
}

@Injectable()
export class PaymentGatewayRegistry {
  private readonly adapters = new Map<string, PaymentGatewayAdapter>();

  register(adapter: PaymentGatewayAdapter): void {
    this.adapters.set(adapter.provider.toLowerCase(), adapter);
  }

  requireConfigured(
    providerName = process.env.PAYMENT_PROVIDER,
  ): PaymentGatewayAdapter {
    const normalized = providerName?.trim().toLowerCase();
    const adapter = normalized ? this.adapters.get(normalized) : undefined;

    if (!adapter) {
      throw new ServiceUnavailableException(
        "No production payment provider adapter is configured",
      );
    }

    return adapter;
  }
}
