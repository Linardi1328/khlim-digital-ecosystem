import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AdminAccessController } from "./admin-access.controller";
import { AdminController } from "./admin.controller";
import { AdminObservabilityService } from "./admin-observability.service";
import { AdminService } from "./admin.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdminAccessController, AdminController],
  providers: [AdminService, AdminObservabilityService],
})
export class AdminModule {}
