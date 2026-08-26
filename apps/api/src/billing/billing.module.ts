import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { PaymentGatewayRegistry } from "./payment-gateway";

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [BillingService, PaymentGatewayRegistry],
  exports: [BillingService, PaymentGatewayRegistry],
})
export class BillingModule {}
