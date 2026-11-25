import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  REGISTRATION_LOCALES,
  REGISTRATION_STATUSES,
  STATUS_REASON_CODES,
} from "./registration.constants";

// OpenAPI 3.0 applies `enum` to null too, so nullable enums must list null.
const NULLABLE_RECURRENCE = ["NONE", "WEEKLY", null] as unknown as string[];
const NULLABLE_AGE_RULE = [
  "FIXED_DATE",
  "SESSION_START_DATE",
  "REGISTRATION_DATE",
  null,
] as unknown as string[];

const UUID_EXAMPLE = "00000000-0000-4000-8000-000000000001";

export class RegistrationPlayerDto {
  @ApiProperty({ maxLength: 120, example: "Test Player" })
  fullName!: string;
  @ApiProperty({ example: "2015-03-02", description: "YYYY-MM-DD" })
  dateOfBirth!: string;
  @ApiProperty({ example: "MALE" })
  gender!: string;
  @ApiProperty({ example: "YM" })
  jerseySize!: string;
  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  phone?: string | null;
}

export class RegistrationGuardianDto {
  @ApiProperty({ maxLength: 120 })
  fullName!: string;
  @ApiProperty({ example: "012-3456789" })
  phone!: string;
  @ApiProperty({ example: "MOTHER" })
  relationship!: string;
  @ApiProperty({ example: true, description: "Must be true" })
  authorityConfirmed!: boolean;
}

export class RegistrationEmergencyContactDto {
  @ApiProperty({ maxLength: 120 })
  fullName!: string;
  @ApiProperty({ example: "013-9876543" })
  phone!: string;
  @ApiProperty({ example: "GRANDPARENT" })
  relationship!: string;
}

export class RegistrationConsentsDto {
  @ApiProperty({ example: true, description: "Must be true" })
  registrationPrivacy!: boolean;
  @ApiProperty({ example: false, description: "Never preselected" })
  marketing!: boolean;
  @ApiProperty({ example: false, description: "Never preselected" })
  photography!: boolean;
}

export class CreateRegistrationRequestDto {
  @ApiProperty({ example: UUID_EXAMPLE })
  sessionId!: string;
  @ApiProperty({ enum: REGISTRATION_LOCALES })
  locale!: string;
  @ApiProperty({ description: "Policy version from registration-config" })
  consentVersion!: string;
  @ApiPropertyOptional({
    maxLength: 64,
    description: "Campaign token; unsafe values are dropped",
  })
  source?: string;
  @ApiProperty({ type: () => RegistrationPlayerDto })
  player!: RegistrationPlayerDto;
  @ApiProperty({ type: () => RegistrationGuardianDto })
  guardian!: RegistrationGuardianDto;
  @ApiProperty({ type: () => RegistrationEmergencyContactDto })
  emergencyContact!: RegistrationEmergencyContactDto;
  @ApiProperty({ type: () => RegistrationConsentsDto })
  consents!: RegistrationConsentsDto;
}

export class RegistrationReceiptSessionDto {
  @ApiProperty({ example: UUID_EXAMPLE })
  id!: string;
  @ApiProperty()
  name!: string;
}

export class RegistrationReceiptDto {
  @ApiProperty({ example: UUID_EXAMPLE })
  id!: string;
  @ApiProperty({ example: "KAR-7H3QK9XM" })
  referenceCode!: string;
  @ApiProperty({ enum: ["RECEIVED"] })
  status!: "RECEIVED";
  @ApiProperty({
    enum: [false],
    description: "A receipt never reserves a place",
  })
  reservesPlace!: false;
  @ApiProperty({ example: "2026-12-10T04:21:00.000Z" })
  receivedAt!: string;
  @ApiProperty({ example: "REGISTRATION_RECEIVED_PENDING_REVIEW" })
  messageCode!: string;
  @ApiProperty({ type: () => RegistrationReceiptSessionDto })
  session!: RegistrationReceiptSessionDto;
}

export class RegistrationErrorFieldDto {
  @ApiProperty({ example: "guardian.phone" })
  field!: string;
  @ApiProperty({ example: "INVALID_PHONE" })
  code!: string;
}

export class RegistrationErrorDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;
  @ApiProperty({
    example: "SESSION_FULL",
    description: "Stable localization key",
  })
  code!: string;
  @ApiProperty({ description: "English developer text only" })
  message!: string;
  @ApiPropertyOptional({ type: () => [RegistrationErrorFieldDto] })
  fieldErrors?: RegistrationErrorFieldDto[];
  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  details?: Record<string, string | number | boolean | null>;
  @ApiPropertyOptional()
  retryAfter?: number;
}

export class RegistrationConsentItemDto {
  @ApiProperty({ example: "MARKETING" })
  type!: string;
  @ApiProperty()
  required!: boolean;
  @ApiProperty({ enum: [false] })
  defaultChecked!: false;
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description: "Per-locale { ref, sha256 } references to approved wording",
  })
  content!: Record<string, { ref: string; sha256: string }>;
}

export class RegistrationConsentConfigDto {
  @ApiProperty()
  policyVersion!: string;
  @ApiProperty()
  approvedAt!: string;
  @ApiProperty({ type: [String] })
  locales!: string[];
  @ApiProperty({ type: () => [RegistrationConsentItemDto] })
  items!: RegistrationConsentItemDto[];
}

export class RegistrationConfigDto {
  @ApiProperty()
  registrationOpen!: boolean;
  @ApiProperty({ type: String, nullable: true, example: null })
  closedReasonCode!: string | null;
  @ApiProperty({ type: () => RegistrationConsentConfigDto, nullable: true })
  consent!: RegistrationConsentConfigDto | null;
  @ApiProperty({
    type: "object",
    additionalProperties: { type: "array", items: { type: "string" } },
  })
  options!: Record<string, readonly string[]>;
  @ApiProperty({ type: "object", additionalProperties: true })
  idempotencyKey!: Record<string, string | number>;
}

export class PublicVenueDto {
  @ApiProperty()
  name!: string;
  @ApiProperty({ type: String, nullable: true })
  address!: string | null;
}

export class PublicAgeReferenceDto {
  @ApiProperty({ type: String, nullable: true })
  rule!: string | null;
  @ApiProperty({ type: String, nullable: true })
  date!: string | null;
}

export class PublicRegistrationSessionDto {
  @ApiProperty({ example: UUID_EXAMPLE })
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  programmeName!: string;
  @ApiProperty({ type: () => PublicVenueDto })
  venue!: PublicVenueDto;
  @ApiProperty({ type: String, nullable: true })
  coachDisplayName!: string | null;
  @ApiProperty({
    type: Number,
    nullable: true,
    description: "ISO weekday, 1 = Monday",
  })
  weekday!: number | null;
  @ApiProperty({ type: String, nullable: true, example: "14:00" })
  startTime!: string | null;
  @ApiProperty({ type: String, nullable: true, example: "16:00" })
  endTime!: string | null;
  @ApiProperty({ example: "Asia/Kuala_Lumpur" })
  timezone!: string;
  @ApiProperty({ type: String, nullable: true })
  firstSessionDate!: string | null;
  @ApiProperty({ type: String, nullable: true, enum: NULLABLE_RECURRENCE })
  recurrence!: string | null;
  @ApiProperty({ type: Number, nullable: true })
  minAge!: number | null;
  @ApiProperty({ type: Number, nullable: true })
  maxAge!: number | null;
  @ApiProperty({ type: () => PublicAgeReferenceDto })
  ageReference!: PublicAgeReferenceDto;
  @ApiProperty({ type: String, nullable: true })
  registrationOpensAt!: string | null;
  @ApiProperty({ type: String, nullable: true })
  registrationClosesAt!: string | null;
}

export class PublicRegistrationSessionsDto {
  @ApiProperty()
  registrationOpen!: boolean;
  @ApiProperty({ type: () => [PublicRegistrationSessionDto] })
  items!: PublicRegistrationSessionDto[];
}

export class RegistrationStatusChangeRequestDto {
  @ApiProperty({
    enum: REGISTRATION_STATUSES.filter((status) => status !== "RECEIVED"),
    description: "Target status; RECEIVED is only ever the initial state",
  })
  status!: string;
  @ApiPropertyOptional({
    enum: STATUS_REASON_CODES,
    description: "Required for REJECTED and CANCELLED",
  })
  reasonCode?: string;
  @ApiProperty({ example: 1 })
  expectedVersion!: number;
}

export class RegistrationSearchRequestDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 100,
    description: "Name, guardian phone or reference code",
  })
  q!: string;
  @ApiPropertyOptional({ enum: REGISTRATION_STATUSES })
  status?: string;
  @ApiPropertyOptional()
  sessionId?: string;
  @ApiPropertyOptional({ minimum: 1 })
  page?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  limit?: number;
}

export class RegistrationSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() referenceCode!: string;
  @ApiProperty({ enum: REGISTRATION_STATUSES }) status!: string;
  @ApiProperty() version!: number;
  @ApiProperty() sessionId!: string;
  @ApiProperty() sessionName!: string;
  @ApiProperty() playerFullName!: string;
  @ApiProperty() ageAtReference!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class RegistrationListDto {
  @ApiProperty({ type: () => [RegistrationSummaryDto] })
  items!: RegistrationSummaryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

export class RegistrationDetailDto extends RegistrationSummaryDto {
  @ApiProperty({ type: "object", additionalProperties: true }) player!: Record<
    string,
    unknown
  >;
  @ApiProperty({ type: "object", additionalProperties: true })
  guardian!: Record<string, unknown>;
  @ApiProperty({ type: "object", additionalProperties: true })
  emergencyContact!: Record<string, unknown>;
  @ApiProperty({ type: String, nullable: true }) source!: string | null;
  @ApiProperty({ type: String, nullable: true }) statusReasonCode!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) statusChangedAt!:
    string | null;
  @ApiProperty({
    type: "array",
    items: { type: "object", additionalProperties: true },
  })
  consents!: Array<Record<string, unknown>>;
}

class RegistrationSessionScheduleFieldsDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "ISO date-time",
  })
  enrollmentOpensAt?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "ISO date-time",
  })
  enrollmentClosesAt?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 120 })
  coachDisplayName?: string | null;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 7,
    description: "ISO weekday, 1 = Monday",
  })
  weekday?: number | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: "14:00" })
  startTime?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: "16:00" })
  endTime?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "YYYY-MM-DD",
  })
  firstSessionDate?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: NULLABLE_RECURRENCE,
  })
  recurrence?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: NULLABLE_AGE_RULE,
  })
  ageReferenceRule?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Required with FIXED_DATE, otherwise null",
  })
  ageReferenceDate?: string | null;
}

export class CreateRegistrationSessionRequestDto extends RegistrationSessionScheduleFieldsDto {
  @ApiProperty({ example: UUID_EXAMPLE })
  programmeId!: string;
  @ApiProperty({ maxLength: 180 })
  name!: string;
  @ApiProperty({ example: UUID_EXAMPLE })
  venueId!: string;
  @ApiProperty({ minimum: 1, maximum: 10000 })
  capacity!: number;
}

export class UpdateRegistrationSessionRequestDto extends RegistrationSessionScheduleFieldsDto {
  @ApiProperty({ description: "Compare-and-set token from the last response" })
  expectedVersion!: number;
  @ApiPropertyOptional({ maxLength: 180, description: "Draft only" })
  name?: string;
  @ApiPropertyOptional({ description: "Draft only" })
  venueId?: string;
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 10000,
    description: "Never below confirmed seats",
  })
  capacity?: number;
}

export class AdminSessionProgrammeDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: Number, nullable: true }) minimumAge!: number | null;
  @ApiProperty({ type: Number, nullable: true }) maximumAge!: number | null;
}

export class AdminSessionVenueDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
}

export class AdminSessionSeatCountsDto {
  @ApiProperty() RECEIVED!: number;
  @ApiProperty() UNDER_REVIEW!: number;
  @ApiProperty() CONFIRMED!: number;
  @ApiProperty() REJECTED!: number;
  @ApiProperty() CANCELLED!: number;
}

export class AdminRegistrationSessionDto {
  @ApiProperty() id!: string;
  @ApiProperty() programmeOfferingId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["DRAFT", "PUBLISHED", "CLOSED"] })
  publicationState!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ type: () => AdminSessionProgrammeDto })
  programme!: AdminSessionProgrammeDto;
  @ApiProperty({ type: () => AdminSessionVenueDto, nullable: true })
  venue!: AdminSessionVenueDto | null;
  @ApiProperty() capacity!: number;
  @ApiProperty() seatsRemaining!: number;
  @ApiProperty({ type: () => AdminSessionSeatCountsDto })
  seatCounts!: AdminSessionSeatCountsDto;
  @ApiProperty({ type: String, nullable: true }) enrollmentOpensAt!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) enrollmentClosesAt!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) coachDisplayName!:
    string | null;
  @ApiProperty({ type: Number, nullable: true }) weekday!: number | null;
  @ApiProperty({ type: String, nullable: true }) startTime!: string | null;
  @ApiProperty({ type: String, nullable: true }) endTime!: string | null;
  @ApiProperty({ example: "Asia/Kuala_Lumpur" }) timezone!: string;
  @ApiProperty({ type: String, nullable: true }) firstSessionDate!:
    string | null;
  @ApiProperty({ type: String, nullable: true, enum: NULLABLE_RECURRENCE })
  recurrence!: string | null;
  @ApiProperty({ type: String, nullable: true }) ageReferenceRule!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) ageReferenceDate!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) publishedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) closedAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class AdminRegistrationSessionListDto {
  @ApiProperty({ type: () => [AdminRegistrationSessionDto] })
  items!: AdminRegistrationSessionDto[];
}

export class AdminRegistrationPolicyDto {
  @ApiProperty() id!: string;
  @ApiProperty() policyVersion!: string;
  @ApiProperty({ enum: ["DRAFT", "APPROVED", "RETIRED"] }) status!: string;
  @ApiProperty() version!: number;
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description: "{ CONSENT_TYPE: { locale: { ref, sha256 } } }",
  })
  content!: Record<string, unknown>;
  @ApiProperty({ type: String, nullable: true }) approvedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) retiredAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class AdminRegistrationPolicyListDto {
  @ApiProperty({
    type: () => AdminRegistrationPolicyDto,
    nullable: true,
    description:
      "The approved policy, always present here even when older than the history page",
  })
  current!: AdminRegistrationPolicyDto | null;
  @ApiProperty({
    type: () => [AdminRegistrationPolicyDto],
    description: "Newest 50 policy versions",
  })
  items!: AdminRegistrationPolicyDto[];
}

export class PublishApprovalsDto {
  @ApiProperty({ type: Boolean, enum: [true], description: "Must be true" })
  scheduleApproved!: true;
  @ApiProperty({ type: Boolean, enum: [true], description: "Must be true" })
  ageRuleApproved!: true;
}

export class PublishRegistrationSessionRequestDto {
  @ApiProperty() expectedVersion!: number;
  @ApiProperty({ type: () => PublishApprovalsDto })
  approvals!: PublishApprovalsDto;
}

export class VersionRequestDto {
  @ApiProperty() expectedVersion!: number;
}

export class CreateRegistrationPolicyRequestDto {
  @ApiProperty({ example: "2026-12-v1" }) policyVersion!: string;
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description:
      "{ CONSENT_TYPE: { locale: { ref, sha256 } } } for all four types and three locales",
  })
  content!: Record<string, unknown>;
}
