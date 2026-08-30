import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AdminAccessController } from "./admin-access.controller";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AdminAccessController, AdminController],
  providers: [AdminService],
})
export class AdminModule {}
