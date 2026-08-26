import { ApiProperty } from "@nestjs/swagger";

export class UpdateStaffRolesDto {
  @ApiProperty({ type: [String] })
  roles!: string[];
}

export class UpdateAccountStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "SUSPENDED", "DEACTIVATED"] })
  status!: string;
}
