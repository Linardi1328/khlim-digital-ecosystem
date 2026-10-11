import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CampaignAnalyticsQueryDto {
  @ApiPropertyOptional({
    example: "3x3-oct24",
    description: "Campaign source token (default: 3x3-oct24)",
    maxLength: 64,
  })
  campaign?: string;

  @ApiPropertyOptional({
    example: "2026-10-24",
    description:
      "Inclusive acquisition start date (YYYY-MM-DD in Asia/Kuala_Lumpur)",
  })
  startDate?: string;

  @ApiPropertyOptional({
    example: "2026-10-24",
    description:
      "Inclusive acquisition end date (YYYY-MM-DD in Asia/Kuala_Lumpur)",
  })
  endDate?: string;
}

export class CampaignStatusCountsDto {
  @ApiProperty({ example: 8, description: "Count of leads in NEW status" })
  NEW!: number;

  @ApiProperty({
    example: 4,
    description: "Count of leads in CONTACTED status",
  })
  CONTACTED!: number;

  @ApiProperty({
    example: 3,
    description: "Count of leads in QUALIFIED status",
  })
  QUALIFIED!: number;

  @ApiProperty({ example: 2, description: "Count of leads in ENROLLED status" })
  ENROLLED!: number;

  @ApiProperty({ example: 1, description: "Count of leads in CLOSED status" })
  CLOSED!: number;
}

export class CampaignLeadMetricsDto {
  @ApiProperty({
    example: 18,
    description:
      "Total authoritative database leads recorded for this campaign and period",
  })
  totalLeads!: number;

  @ApiProperty({ type: CampaignStatusCountsDto })
  byStatus!: CampaignStatusCountsDto;

  @ApiProperty({
    example: 2,
    description: "Current enrolled leads (leads with status ENROLLED)",
  })
  enrolledCount!: number;

  @ApiProperty({
    example: 11.11,
    description:
      "Current lead-to-enrolled conversion percentage (ENROLLED / totalLeads * 100)",
  })
  enrolledRate!: number;
}

export class CampaignTrafficMetricsDto {
  @ApiProperty({
    enum: ["AVAILABLE", "CONFIG_REQUIRED", "ERROR"],
    example: "AVAILABLE",
    description: "PostHog analytics query availability status",
  })
  status!: "AVAILABLE" | "CONFIG_REQUIRED" | "ERROR";

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 45,
    description: "Observable campaign landing sessions (opt-in visitors only)",
  })
  observableLandingSessions!: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 22,
    description: "Interest form engagement / views (opt-in visitors only)",
  })
  interestFormEngagement!: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 10,
    description:
      "Client-side successful submission receipts (opt-in visitors only)",
  })
  clientSubmitSuccesses!: number | null;

  @ApiProperty({
    example:
      "Consented sessions only (opt-in analytics; US Cloud Project 652783)",
    description: "Coverage scope and privacy boundaries of traffic data",
  })
  dataCoverage!: string;

  @ApiProperty({ example: "2026-10-24T12:00:00.000Z" })
  lastRefreshedAt!: string;

  @ApiProperty({
    example:
      "PostHog traffic represents opted-in web sessions only; it is not a direct measure of physical QR code scans.",
    description: "Traffic attribution notice",
  })
  note!: string;

  @ApiPropertyOptional({
    example: "Server-side PostHog query API key not configured",
    description: "Diagnostic reason when status is CONFIG_REQUIRED or ERROR",
  })
  reason?: string;
}

export class CampaignPeriodDto {
  @ApiPropertyOptional({
    type: String,
    example: "2026-10-24",
    nullable: true,
    description: "Start date in Asia/Kuala_Lumpur",
  })
  startDate!: string | null;

  @ApiPropertyOptional({
    type: String,
    example: "2026-10-24",
    nullable: true,
    description: "End date in Asia/Kuala_Lumpur",
  })
  endDate!: string | null;

  @ApiProperty({ example: "Asia/Kuala_Lumpur" })
  timezone!: string;

  @ApiPropertyOptional({
    type: String,
    example: "2026-10-23T16:00:00.000Z",
    nullable: true,
    description: "UTC lower boundary timestamp",
  })
  fromUtc!: string | null;

  @ApiPropertyOptional({
    type: String,
    example: "2026-10-24T15:59:59.999Z",
    nullable: true,
    description: "UTC upper boundary timestamp",
  })
  toUtc!: string | null;
}

export class CampaignAnalyticsResponseDto {
  @ApiProperty({ example: "3x3-oct24" })
  campaign!: string;

  @ApiProperty({ example: "00000000-0000-4000-8000-000000000001" })
  organizationId!: string;

  @ApiProperty({ example: "2026-10-24T12:00:00.000Z" })
  asOf!: string;

  @ApiProperty({ type: CampaignPeriodDto })
  period!: CampaignPeriodDto;

  @ApiProperty({ type: CampaignLeadMetricsDto })
  leads!: CampaignLeadMetricsDto;

  @ApiProperty({ type: CampaignTrafficMetricsDto })
  traffic!: CampaignTrafficMetricsDto;

  @ApiProperty({
    example:
      "Database records are authoritative for all confirmed registrations. PostHog traffic counts include only visitors who explicitly opted into analytics; non-consenting visitors also generate valid database leads.",
  })
  methodologyNote!: string;
}
