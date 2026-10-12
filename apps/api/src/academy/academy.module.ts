import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AcademyAdminMutationsController } from "./academy-admin-mutations.controller";
import { AcademyAdminController } from "./academy-admin.controller";
import { AcademyCampaignsAdminController } from "./academy-campaigns-admin.controller";
import { AcademyCampaignsService } from "./academy-campaigns.service";
import { AcademyController } from "./academy.controller";
import { AcademyLeadsAdminController } from "./academy-leads-admin.controller";
import { AcademyLeadsController } from "./academy-leads.controller";
import { AcademyLeadsService } from "./academy-leads.service";
import { AcademyService } from "./academy.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AcademyController,
    AcademyLeadsController,
    AcademyAdminController,
    AcademyLeadsAdminController,
    AcademyAdminMutationsController,
    AcademyCampaignsAdminController,
  ],
  providers: [AcademyService, AcademyLeadsService, AcademyCampaignsService],
  exports: [AcademyService, AcademyLeadsService, AcademyCampaignsService],
})
export class AcademyModule {}
