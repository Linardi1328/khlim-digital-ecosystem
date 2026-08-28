import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { AcademyModule } from "./academy/academy.module";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { HealthController } from "./health.controller";
import { NotificationsModule } from "./notifications/notifications.module";
import { SchedulingModule } from "./scheduling/scheduling.module";
import { EditorialModule } from "./editorial/editorial.module";

@Module({
  imports: [
    SentryModule.forRoot(),
    AuthModule,
    AdminModule,
    AcademyModule,
    BillingModule,
    EditorialModule,
    SchedulingModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
