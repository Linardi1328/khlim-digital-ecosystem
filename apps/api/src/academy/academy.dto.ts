import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSportDto {
  @ApiProperty({ example: "BASKETBALL" })
  code!: string;
  @ApiProperty({ example: "Basketball" })
  defaultName!: string;
}

export class CreateVenueDto {
  @ApiProperty({ example: "Taylor's International School Puchong" })
  name!: string;
  @ApiPropertyOptional()
  address?: string;
}

export class CreateCourtDto {
  @ApiProperty({ example: "Court 1" })
  name!: string;
  @ApiPropertyOptional({ example: 30 })
  capacity?: number;
}

export class CreateProgrammeDto {
  @ApiProperty()
  sportId!: string;
  @ApiProperty({ example: "U12-ACADEMY" })
  code!: string;
  @ApiProperty({ example: "U12 Academy" })
  name!: string;
  @ApiPropertyOptional()
  description?: string;
  @ApiPropertyOptional()
  minimumAge?: number;
  @ApiPropertyOptional()
  maximumAge?: number;
  @ApiPropertyOptional()
  level?: string;
}

export class CreateProgrammeOfferingDto {
  @ApiProperty()
  programmeId!: string;
  @ApiPropertyOptional()
  venueId?: string;
  @ApiProperty({ example: "U12 Saturday 10 AM" })
  name!: string;
  @ApiProperty({ example: 30 })
  capacity!: number;
  @ApiPropertyOptional({ format: "date" })
  startsOn?: string;
  @ApiPropertyOptional({ format: "date" })
  endsOn?: string;
  @ApiPropertyOptional({ enum: ["DRAFT", "OPEN", "CLOSED", "INACTIVE"] })
  status?: string;
}

export class CreateMembershipPlanDto {
  @ApiProperty({ example: "6-Month Plan" })
  name!: string;
  @ApiPropertyOptional({ example: 6 })
  durationMonths?: number;
  @ApiPropertyOptional({ example: 6 })
  commitmentCycles?: number;
  @ApiProperty({ enum: ["MONTHLY", "UPFRONT"] })
  billingFrequency!: string;
  @ApiPropertyOptional({ description: "Minor currency units, e.g. sen" })
  recurringAmountMinor?: number;
  @ApiPropertyOptional({ description: "Minor currency units, e.g. sen" })
  upfrontAmountMinor?: number;
  @ApiPropertyOptional({ example: "MYR" })
  currency?: string;
  @ApiPropertyOptional()
  sessionAllowance?: number;
  @ApiPropertyOptional()
  benefitsSummary?: string;
}

export class LinkPlanOfferingDto {
  @ApiProperty()
  planId!: string;
  @ApiProperty()
  offeringId!: string;
}

export class CreatePendingMembershipDto {
  @ApiProperty()
  offeringId!: string;
  @ApiProperty()
  planId!: string;
}
