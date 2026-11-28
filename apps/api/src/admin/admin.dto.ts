import { ApiProperty } from "@nestjs/swagger";

export class AdminSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  organizationId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  preferredLocale!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ enum: ["aal1", "aal2"] })
  authenticatorAssuranceLevel!: "aal1" | "aal2";

  @ApiProperty()
  mfaSatisfied!: boolean;
}

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
