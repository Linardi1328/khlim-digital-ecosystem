import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { KHLIM_SUPPORTED_LOCALES } from "./locale-policy";

export class UpsertGuardianProfileDto {
  @ApiProperty({ example: "Alex Tan", maxLength: 120 })
  displayName!: string;

  @ApiPropertyOptional({ example: "+60123456789", nullable: true })
  phone?: string | null;
}

export class UpdatePreferencesDto {
  @ApiProperty({ enum: [...KHLIM_SUPPORTED_LOCALES], example: "en" })
  preferredLocale!: string;
}
