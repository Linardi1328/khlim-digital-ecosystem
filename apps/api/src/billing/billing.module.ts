import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import {
  createBillplzPaymentGatewayFromEnv,
} from "./billplz-payment-gateway";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { PaymentGatewayRegistry } from "./payment-gateway";

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    {
      provide: PaymentGatewayRegistry,
      useFactory: () => {
        const registry = new PaymentGatewayRegistry();
        const billplz = createBillplzPaymentGatewayFromEnv();
        if (billplz) registry.register(billplz);
        return registry;
      },
    },
  ],
  exports: [BillingService, PaymentGatewayRegistry],
})
export class BillingModule {}
