import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { PaymentGatewayRegistry } from "./payment-gateway";
import { StripePaymentGatewayAdapter } from "./stripe-payment-gateway";

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    PaymentGatewayRegistry,
    StripePaymentGatewayAdapter,
  ],
  exports: [
    BillingService,
    PaymentGatewayRegistry,
    StripePaymentGatewayAdapter,
  ],
})
export class BillingModule {
  constructor(
    gateways: PaymentGatewayRegistry,
    stripe: StripePaymentGatewayAdapter,
  ) {
    if (stripe.isConfigured()) {
      gateways.register(stripe);
    }
  }
}
