import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { KHLIM_SUPPORTED_LOCALES } from "../identity/locale-policy";

export class CreateManagedAthleteDto {
  @ApiProperty({ example: "Jamie Tan", maxLength: 120 })
  displayName!: string;

  @ApiProperty({ example: "2014-06-12", format: "date" })
  dateOfBirth!: string;

  @ApiPropertyOptional({ enum: [...KHLIM_SUPPORTED_LOCALES], example: "en" })
  preferredLocale?: string;

  @ApiPropertyOptional({ example: "parent", maxLength: 50 })
  relationshipType?: string;
}

export class UpdateAthleteDto {
  @ApiPropertyOptional({ example: "Jamie Tan", maxLength: 120 })
  displayName?: string;

  @ApiPropertyOptional({ example: "2014-06-12", format: "date" })
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: [...KHLIM_SUPPORTED_LOCALES], example: "en" })
  preferredLocale?: string;
}
