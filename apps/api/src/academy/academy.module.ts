import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AcademyAdminController } from "./academy-admin.controller";
import { AcademyController } from "./academy.controller";
import { AcademyService } from "./academy.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AcademyController, AcademyAdminController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}
