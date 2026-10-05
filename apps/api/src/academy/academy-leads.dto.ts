import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const ACADEMY_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "ENROLLED",
  "CLOSED",
] as const;

export type AcademyLeadStatus = (typeof ACADEMY_LEAD_STATUSES)[number];

export class CreateAcademyLeadDto {
  @ApiProperty({
    example: "Lim Wei Hong",
    description: "Guardian full name",
    maxLength: 120,
  })
  guardianName!: string;

  @ApiProperty({
    example: "+60123456789",
    description: "Mobile phone or WhatsApp number",
  })
  phone!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: "guardian@example.com",
    description: "Optional contact email",
    maxLength: 254,
  })
  email?: string | null;

  @ApiProperty({
    example: 10,
    description: "Child age in years (3-18)",
    minimum: 3,
    maximum: 18,
  })
  childAge!: number;

  @ApiPropertyOptional({
    example: "00000000-0000-4000-8000-000000000001",
    description: "Optional programme offering UUID",
  })
  programmeOfferingId?: string;

  @ApiPropertyOptional({
    example: "3x3-oct24",
    description: "Optional campaign source token",
    maxLength: 64,
  })
  source?: string;

  @ApiProperty({
    example: true,
    description: "Explicit privacy and follow-up consent",
  })
  consent!: boolean;

  @ApiPropertyOptional({
    example: "idemp-123e4567-e89b-12d3-a456-426614174000",
    description: "Optional client retry idempotency token",
    maxLength: 128,
  })
  idempotencyKey?: string;
}

export class CreateAcademyLeadResponseDto {
  @ApiProperty({ example: "00000000-0000-4000-8000-000000000001" })
  id!: string;

  @ApiProperty({ example: "RECEIVED" })
  status!: string;

  @ApiProperty({
    example:
      "Thank you for registering your interest with KHLIM Academy. Our team will follow up with you.",
  })
  message!: string;

  @ApiProperty({ example: "2026-10-06T04:00:00.000Z" })
  createdAt!: string;
}

export class AcademyLeadItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  guardianName!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiProperty()
  childAge!: number;

  @ApiPropertyOptional()
  programmeOfferingId?: string | null;

  @ApiPropertyOptional()
  offeringName?: string | null;

  @ApiPropertyOptional()
  programmeName?: string | null;

  @ApiPropertyOptional()
  source?: string | null;

  @ApiProperty({ enum: ACADEMY_LEAD_STATUSES })
  status!: AcademyLeadStatus;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  consentAt!: string;

  @ApiProperty()
  consentVersion!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AcademyLeadListResponseDto {
  @ApiProperty({ type: [AcademyLeadItemDto] })
  items!: AcademyLeadItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class AcademyLeadStatusCountsDto {
  @ApiProperty({ example: 5 })
  NEW!: number;

  @ApiProperty({ example: 3 })
  CONTACTED!: number;

  @ApiProperty({ example: 2 })
  QUALIFIED!: number;

  @ApiProperty({ example: 1 })
  ENROLLED!: number;

  @ApiProperty({ example: 4 })
  CLOSED!: number;
}

export class AcademyLeadSummaryResponseDto {
  @ApiProperty({ example: 5, description: "Count of NEW leads" })
  newLeads!: number;

  @ApiProperty({
    example: 10,
    description:
      "Count of NEW + CONTACTED + QUALIFIED leads requiring follow-up",
  })
  needsFollowUp!: number;

  @ApiProperty({ type: AcademyLeadStatusCountsDto })
  byStatus!: AcademyLeadStatusCountsDto;

  @ApiProperty({ example: 15 })
  total!: number;
}

export class UpdateAcademyLeadDto {
  @ApiPropertyOptional({ enum: ACADEMY_LEAD_STATUSES })
  status?: AcademyLeadStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 2000,
    description: "Plain-text operational notes",
  })
  notes?: string | null;

  @ApiPropertyOptional({
    description:
      "ISO timestamp of updatedAt when the record was viewed, for concurrency conflict detection",
  })
  expectedUpdatedAt?: string;
}

export class AcademyLeadQueryDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  limit?: number;

  @ApiPropertyOptional({
    description: "Search guardian name, phone, or email",
  })
  q?: string;

  @ApiPropertyOptional({
    enum: [...ACADEMY_LEAD_STATUSES, "NEEDS_FOLLOW_UP"],
    description:
      "Filter by status or NEEDS_FOLLOW_UP (NEW, CONTACTED, QUALIFIED)",
  })
  status?: AcademyLeadStatus | "NEEDS_FOLLOW_UP";

  @ApiPropertyOptional({ description: "Filter by campaign source token" })
  source?: string;

  @ApiPropertyOptional({ description: "Filter by programme offering ID" })
  offeringId?: string;
}
