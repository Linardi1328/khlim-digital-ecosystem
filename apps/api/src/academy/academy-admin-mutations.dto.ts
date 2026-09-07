import { ApiProperty } from "@nestjs/swagger";

export class UpdateProgrammeOfferingStatusDto {
  @ApiProperty({ enum: ["DRAFT", "OPEN", "CLOSED", "INACTIVE"] })
  status!: "DRAFT" | "OPEN" | "CLOSED" | "INACTIVE";
}

export class UpdateMembershipPlanActiveDto {
  @ApiProperty({ example: true })
  active!: boolean;
}
