import { ApiProperty } from "@nestjs/swagger";

export class UpdateStaffRolesDto {
  @ApiProperty({ type: [String] })
  roles!: string[];
}

export class UpdateAccountStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "SUSPENDED", "DEACTIVATED"] })
  status!: string;
}

export class UpdatePlatformSettingsDto {
  @ApiProperty({ enum: ["MYR", "SGD", "USD"] })
  currency!: string;

  @ApiProperty({
    enum: ["Asia/Kuala_Lumpur", "Asia/Singapore", "UTC"],
  })
  timezone!: string;
}
