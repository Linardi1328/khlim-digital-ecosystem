import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AcademyAdminMutationsController } from "./academy-admin-mutations.controller";
import { AcademyAdminController } from "./academy-admin.controller";
import { AcademyController } from "./academy.controller";
import { AcademyService } from "./academy.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AcademyController,
    AcademyAdminController,
    AcademyAdminMutationsController,
  ],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}
