import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { FamilyAccessService } from "./family-access.service";
import { FamilyController } from "./family.controller";
import { FamilyService } from "./family.service";

@Module({
  imports: [DatabaseModule],
  controllers: [FamilyController],
  providers: [FamilyAccessService, FamilyService],
  exports: [FamilyAccessService],
})
export class FamilyModule {}
