import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AdminAccessController } from "./admin-access.controller";
import { AdminController } from "./admin.controller";
import { AdminGovernanceController } from "./admin-governance.controller";
import { AdminGovernanceService } from "./admin-governance.service";
import { AdminObservabilityService } from "./admin-observability.service";
import { AdminOperationsDataController } from "./admin-operations-data.controller";
import { AdminOperationsDataService } from "./admin-operations-data.service";
import { AdminOrganizationAccessService } from "./admin-organization-access.service";
import { AdminService } from "./admin.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AdminAccessController,
    AdminController,
    AdminGovernanceController,
    AdminOperationsDataController,
  ],
  providers: [
    AdminService,
    AdminObservabilityService,
    AdminGovernanceService,
    AdminOperationsDataService,
    AdminOrganizationAccessService,
  ],
})
export class AdminModule {}
