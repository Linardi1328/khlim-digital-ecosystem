import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreateGatewayCheckoutInput,
  CreateGatewayCheckoutResult,
  CreateGatewayCustomerInput,
  CreateGatewayCustomerResult,
  NormalizedGatewayEvent,
  PaymentGatewayAdapter,
  VerifyGatewayWebhookInput,
} from "./payment-gateway";

const BILLPLZ_SANDBOX_API_BASE_URL = "https://www.billplz-sandbox.com/api";
const BILLPLZ_PRODUCTION_API_BASE_URL = "https://www.billplz.com/api";

interface BillplzBillResponse {
  id?: string;
  url?: string;
  error?: {
    type?: string;
    message?: string | string[];
  };
}

export interface BillplzPaymentGatewayOptions {
  secretKey: string;
  collectionId: string;
  xSignatureKey: string;
  callbackUrl: string;
  redirectUrl: string;
  sandbox: boolean;
  directGatewayCode?: string;
  fetchImpl?: typeof fetch;
}

export class BillplzPaymentGatewayAdapter implements PaymentGatewayAdapter {
  readonly provider = "billplz";

  private readonly fetchImpl: typeof fetch;
  private readonly apiBaseUrl: string;

  constructor(private readonly options: BillplzPaymentGatewayOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiBaseUrl = options.sandbox
      ? BILLPLZ_SANDBOX_API_BASE_URL
      : BILLPLZ_PRODUCTION_API_BASE_URL;
  }

  async createCustomer(
    input: CreateGatewayCustomerInput,
  ): Promise<CreateGatewayCustomerResult> {
    if (!input.email) {
      throw new BadRequestException(
        "Billplz checkout requires an email address for the payer",
      );
    }

    return {
      providerCustomerId: `email:${input.email}`,
    };
  }

  async createCheckout(
    input: CreateGatewayCheckoutInput,
  ): Promise<CreateGatewayCheckoutResult> {
    if (input.currency.toUpperCase() !== "MYR") {
      throw new BadRequestException("Billplz checkout supports MYR only");
    }

    const email = this.extractEmail(input.providerCustomerId);
    const form = new URLSearchParams({
      collection_id: this.options.collectionId,
      email,
      name: "KHLIM Member",
      amount: String(input.amountMinor),
      callback_url: this.options.callbackUrl,
      redirect_url: this.options.redirectUrl,
      description: `KHLIM membership ${input.membershipId}`,
      reference_2_label: "KHLIM Payment",
      reference_2: input.idempotencyKey,
    });

    if (this.options.directGatewayCode) {
      form.set("reference_1_label", "Bank Code");
      form.set("reference_1", this.options.directGatewayCode);
    }

    const response = await this.fetchImpl(`${this.apiBaseUrl}/v4/bills`, {
      method: "POST",
      headers: {
        authorization: this.basicAuthorizationHeader(),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const payload = (await response.json()) as BillplzBillResponse;
    if (!response.ok || !payload.id || !payload.url) {
      throw new BadGatewayException(
        this.billplzErrorMessage(payload, "Billplz bill creation failed"),
      );
    }

    return {
      checkoutUrl: this.options.directGatewayCode
        ? `${payload.url}?auto_submit=true`
        : payload.url,
      providerPaymentId: payload.id,
    };
  }

  async verifyWebhook(
    input: VerifyGatewayWebhookInput,
  ): Promise<NormalizedGatewayEvent> {
    const params = new URLSearchParams(input.rawBody.toString("utf8"));
    const suppliedSignature = params.get("x_signature");
    if (!suppliedSignature) {
      throw new UnauthorizedException(
        "Billplz webhook x_signature is required",
      );
    }

    const expectedSignature = this.signCallback(params);
    const supplied = Buffer.from(suppliedSignature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new UnauthorizedException("Billplz webhook signature is invalid");
    }

    const billId = params.get("id");
    const idempotencyKey = params.get("reference_2");
    const paid = params.get("paid");
    const state = params.get("state") ?? "unknown";
    const paidAt = params.get("paid_at") ?? "";

    if (!billId || !idempotencyKey || (paid !== "true" && paid !== "false")) {
      throw new BadRequestException(
        "Billplz webhook is missing required KHLIM payment metadata",
      );
    }

    return {
      providerEventId: `bill:${billId}:${state}:${paid}:${paidAt}`,
      eventType: paid === "true" ? "PAYMENT_SUCCEEDED" : "PAYMENT_FAILED",
      idempotencyKey,
      providerPaymentId: billId,
      failureCode: paid === "false" ? state : undefined,
      safeFailureReason:
        paid === "false" ? "Billplz payment was not completed" : undefined,
    };
  }

  async refund(): Promise<void> {
    throw new ServiceUnavailableException(
      "Billplz collections do not support automatic refunds; use the Payment Order disbursement flow after collecting the recipient's bank details",
    );
  }

  signCallback(params: URLSearchParams): string {
    const source = [...params.entries()]
      .filter(([key]) => key !== "x_signature")
      .map(([key, value]) => `${key}${value}`)
      .sort((left, right) =>
        left.localeCompare(right, "en", { sensitivity: "base" }),
      )
      .join("|");

    return createHmac("sha256", this.options.xSignatureKey)
      .update(source)
      .digest("hex");
  }

  private extractEmail(providerCustomerId: string): string {
    if (!providerCustomerId.startsWith("email:")) {
      throw new BadRequestException("Billplz payer reference is invalid");
    }
    return providerCustomerId.slice("email:".length);
  }

  private basicAuthorizationHeader(): string {
    return `Basic ${Buffer.from(`${this.options.secretKey}:`, "utf8").toString("base64")}`;
  }

  private billplzErrorMessage(
    payload: BillplzBillResponse,
    fallback: string,
  ): string {
    const message = payload.error?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message) return message;
    return fallback;
  }
}

export function createBillplzPaymentGatewayFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): BillplzPaymentGatewayAdapter | null {
  const selectedProvider = env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (selectedProvider !== "billplz") return null;

  const secretKey = env.BILLPLZ_SECRET_KEY?.trim();
  const collectionId = env.BILLPLZ_COLLECTION_ID?.trim();
  const xSignatureKey = env.BILLPLZ_X_SIGNATURE_KEY?.trim();
  const callbackUrl = env.BILLPLZ_CALLBACK_URL?.trim();
  const redirectUrl = env.BILLPLZ_REDIRECT_URL?.trim();

  if (
    !secretKey ||
    !collectionId ||
    !xSignatureKey ||
    !callbackUrl ||
    !redirectUrl
  ) {
    return null;
  }

  return new BillplzPaymentGatewayAdapter({
    secretKey,
    collectionId,
    xSignatureKey,
    callbackUrl,
    redirectUrl,
    sandbox: env.BILLPLZ_SANDBOX !== "0",
    directGatewayCode: env.BILLPLZ_DIRECT_GATEWAY_CODE?.trim() || undefined,
  });
}
