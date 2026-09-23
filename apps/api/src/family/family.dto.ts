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

  @ApiPropertyOptional({
    example: true,
    description:
      "Required when creating a managed athlete under 18. Confirms that the authenticated guardian consents to processing the minor's personal data under the referenced privacy notice.",
  })
  guardianDataConsent?: boolean;

  @ApiPropertyOptional({
    example: "2026-09-11",
    maxLength: 80,
    description:
      "Privacy/personal-data notice version accepted by the guardian. Required together with guardianDataConsent for a managed athlete under 18.",
  })
  privacyNoticeVersion?: string;
}

export class UpdateAthleteDto {
  @ApiPropertyOptional({ example: "Jamie Tan", maxLength: 120 })
  displayName?: string;

  @ApiPropertyOptional({ example: "2014-06-12", format: "date" })
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: [...KHLIM_SUPPORTED_LOCALES], example: "en" })
  preferredLocale?: string;
}

export class CreateGuardianInvitationDto {
  @ApiProperty({ example: "parent@example.com", maxLength: 320 })
  email!: string;

  @ApiPropertyOptional({ example: "parent", maxLength: 50 })
  relationshipType?: string;
}

export class AcceptGuardianInvitationDto {
  @ApiProperty({ description: "One-time invitation token" })
  token!: string;
}
