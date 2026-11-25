/**
 * Academy Registration V1 (RIC-190 / RIC-191) contract types.
 *
 * SOURCE OF TRUTH:
 * Reconciled against PR #126 (`codex/ric-190-academy-registration-v1-20261124`)
 * inspected head SHA: 92f72f369acc03b53a4eb3c0e247590ab936fc1c
 * (`packages/api-client/src/schema.d.ts` + `docs/implementation/ric-191-academy-registration-handoff.md`).
 *
 * DEPENDENCY RECONCILIATION STRATEGY:
 * - PR #126 (RIC-190 backend) and PR #125 (RIC-184 web) remain unmerged.
 * - Keeping `openapi/khlim-v1.json` and `packages/api-client/src/schema.d.ts` untouched on the
 *   frontend-only PR branch preserves `pnpm openapi:check` integrity without pulling backend
 *   changes into PR #127.
 * - Once PR #125 and PR #126 are available in the target base, replace these temporary
 *   definitions with direct `components["schemas"][...]` aliases from `./schema`.
 */

export type RegistrationLocale = "en" | "ms" | "zh-Hans";

export type RegistrationSessionRecurrence = "NONE" | "WEEKLY";

export type RegistrationAgeReferenceRule =
  "FIXED_DATE" | "SESSION_START_DATE" | "REGISTRATION_DATE";

export type RegistrationStatus =
  "RECEIVED" | "UNDER_REVIEW" | "CONFIRMED" | "REJECTED" | "CANCELLED";

/** Target statuses accepted by PATCH /v1/admin/academy/registrations/:id/status (excludes RECEIVED). */
export type RegistrationTargetStatus =
  "UNDER_REVIEW" | "CONFIRMED" | "REJECTED" | "CANCELLED";

export type RegistrationReasonCode =
  | "DUPLICATE"
  | "INELIGIBLE"
  | "CAPACITY"
  | "GUARDIAN_REQUEST"
  | "INCOMPLETE_INFORMATION"
  | "SESSION_CHANGED"
  | "OTHER";

export type RegistrationConsentType =
  "GUARDIAN_AUTHORITY" | "REGISTRATION_PRIVACY" | "MARKETING" | "PHOTOGRAPHY";

export type AdminRegistrationSessionState = "DRAFT" | "PUBLISHED" | "CLOSED";

export type AdminRegistrationPolicyStatus = "DRAFT" | "APPROVED" | "RETIRED";

export interface RegistrationConsentLocaleContentRef {
  ref: string;
  sha256: string;
}

export type RegistrationPolicyContentMap = Record<
  RegistrationConsentType,
  Record<RegistrationLocale, RegistrationConsentLocaleContentRef>
>;

export interface RegistrationConsentItemDto {
  type: RegistrationConsentType | string;
  required: boolean;
  defaultChecked: false;
  content: Record<string, unknown>;
}

export interface RegistrationConsentConfigDto {
  policyVersion: string;
  approvedAt: string;
  locales: string[];
  items: RegistrationConsentItemDto[];
}

export interface RegistrationConfigDto {
  registrationOpen: boolean;
  closedReasonCode: string | null;
  consent: RegistrationConsentConfigDto | null;
  options: {
    gender?: string[];
    jerseySize?: string[];
    guardianRelationship?: string[];
    emergencyContactRelationship?: string[];
    [key: string]: string[] | undefined;
  };
  idempotencyKey: {
    header?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    [key: string]: unknown;
  };
}

export interface PublicVenueDto {
  name: string;
  address: string | null;
}

export interface PublicAgeReferenceDto {
  rule: RegistrationAgeReferenceRule | string | null;
  date: string | null;
}

export interface PublicRegistrationSessionDto {
  id: string;
  name: string;
  programmeName: string;
  venue: PublicVenueDto;
  coachDisplayName: string | null;
  /** ISO weekday, 1 = Monday ... 7 = Sunday */
  weekday: number | null;
  /** HH:MM in Asia/Kuala_Lumpur */
  startTime: string | null;
  /** HH:MM in Asia/Kuala_Lumpur */
  endTime: string | null;
  timezone: string;
  /** YYYY-MM-DD */
  firstSessionDate: string | null;
  recurrence: RegistrationSessionRecurrence | null;
  minAge: number | null;
  maxAge: number | null;
  ageReference: PublicAgeReferenceDto;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
}

export interface PublicRegistrationSessionsDto {
  registrationOpen: boolean;
  items: PublicRegistrationSessionDto[];
}

export interface RegistrationPlayerDto {
  fullName: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  gender: string;
  jerseySize: string;
  phone?: string | null;
}

export interface RegistrationGuardianDto {
  fullName: string;
  phone: string;
  relationship: string;
  authorityConfirmed: boolean;
}

export interface RegistrationEmergencyContactDto {
  fullName: string;
  phone: string;
  relationship: string;
}

export interface RegistrationConsentsDto {
  registrationPrivacy: boolean;
  marketing: boolean;
  photography: boolean;
}

export interface CreateRegistrationRequestDto {
  sessionId: string;
  locale: RegistrationLocale;
  consentVersion: string;
  source?: string;
  player: RegistrationPlayerDto;
  guardian: RegistrationGuardianDto;
  emergencyContact: RegistrationEmergencyContactDto;
  consents: RegistrationConsentsDto;
}

export interface RegistrationReceiptSessionDto {
  id: string;
  name: string;
}

export interface RegistrationReceiptDto {
  id: string;
  referenceCode: string;
  status: "RECEIVED";
  reservesPlace: false;
  receivedAt: string;
  messageCode: string;
  session: RegistrationReceiptSessionDto;
}

export interface RegistrationErrorFieldDto {
  field: string;
  code: string;
}

export interface RegistrationErrorDto {
  statusCode: number;
  code: string;
  message: string;
  fieldErrors?: RegistrationErrorFieldDto[];
  details?: Record<string, unknown>;
  retryAfter?: number;
}

export interface RegistrationSummaryDto {
  id: string;
  referenceCode: string;
  status: RegistrationStatus;
  version: number;
  sessionId: string;
  sessionName: string;
  playerFullName: string;
  ageAtReference: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationListDto {
  items: RegistrationSummaryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RegistrationSearchRequestDto {
  q: string;
  status?: RegistrationStatus;
  sessionId?: string;
  page?: number;
  limit?: number;
}

export interface RegistrationDetailConsentRecord {
  type?: string;
  granted?: boolean;
  policyVersion?: string;
  locale?: string;
  contentSha256?: string;
  acceptedAt?: string;
  withdrawnAt?: string | null;
  [key: string]: unknown;
}

export interface RegistrationDetailDto {
  id: string;
  referenceCode: string;
  status: RegistrationStatus;
  version: number;
  sessionId: string;
  sessionName: string;
  playerFullName: string;
  ageAtReference: number;
  createdAt: string;
  updatedAt: string;
  player: {
    fullName?: string;
    dateOfBirth?: string;
    gender?: string;
    jerseySize?: string;
    phone?: string | null;
    [key: string]: unknown;
  };
  guardian: {
    fullName?: string;
    phone?: string;
    relationship?: string;
    authorityConfirmed?: boolean;
    [key: string]: unknown;
  };
  emergencyContact: {
    fullName?: string;
    phone?: string;
    relationship?: string;
    [key: string]: unknown;
  };
  source: string | null;
  statusReasonCode: RegistrationReasonCode | string | null;
  statusChangedAt: string | null;
  consents: RegistrationDetailConsentRecord[];
}

export interface RegistrationStatusChangeRequestDto {
  status: RegistrationTargetStatus;
  reasonCode?: RegistrationReasonCode;
  expectedVersion: number;
}

export interface AdminSessionProgrammeDto {
  id: string;
  name: string;
  minimumAge: number | null;
  maximumAge: number | null;
}

export interface AdminSessionVenueDto {
  id: string;
  name: string;
  address: string | null;
}

export interface AdminSessionSeatCountsDto {
  RECEIVED: number;
  UNDER_REVIEW: number;
  CONFIRMED: number;
  REJECTED: number;
  CANCELLED: number;
}

export interface AdminRegistrationSessionDto {
  id: string;
  programmeOfferingId: string;
  name: string;
  publicationState: AdminRegistrationSessionState;
  version: number;
  programme: AdminSessionProgrammeDto;
  venue: AdminSessionVenueDto | null;
  capacity: number;
  seatsRemaining: number;
  seatCounts: AdminSessionSeatCountsDto;
  enrollmentOpensAt: string | null;
  enrollmentClosesAt: string | null;
  coachDisplayName: string | null;
  /** ISO weekday, 1 = Monday ... 7 = Sunday */
  weekday: number | null;
  /** HH:MM */
  startTime: string | null;
  /** HH:MM */
  endTime: string | null;
  timezone: string;
  /** YYYY-MM-DD */
  firstSessionDate: string | null;
  recurrence: RegistrationSessionRecurrence | null;
  ageReferenceRule: RegistrationAgeReferenceRule | string | null;
  ageReferenceDate: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRegistrationSessionListDto {
  items: AdminRegistrationSessionDto[];
}

export interface CreateRegistrationSessionRequestDto {
  programmeId: string;
  name: string;
  venueId: string;
  capacity: number;
  enrollmentOpensAt?: string | null;
  enrollmentClosesAt?: string | null;
  coachDisplayName?: string | null;
  weekday?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  firstSessionDate?: string | null;
  recurrence?: RegistrationSessionRecurrence | null;
  ageReferenceRule?: RegistrationAgeReferenceRule | null;
  ageReferenceDate?: string | null;
}

export interface UpdateRegistrationSessionRequestDto {
  expectedVersion: number;
  /** Draft only */
  name?: string;
  /** Draft only */
  venueId?: string;
  /** Never below confirmed seats */
  capacity?: number;
  enrollmentOpensAt?: string | null;
  enrollmentClosesAt?: string | null;
  coachDisplayName?: string | null;
  /** Draft only */
  weekday?: number | null;
  /** Draft only */
  startTime?: string | null;
  /** Draft only */
  endTime?: string | null;
  /** Draft only */
  firstSessionDate?: string | null;
  /** Draft only */
  recurrence?: RegistrationSessionRecurrence | null;
  /** Draft only */
  ageReferenceRule?: RegistrationAgeReferenceRule | null;
  /** Draft only */
  ageReferenceDate?: string | null;
}

export interface PublishApprovalsDto {
  scheduleApproved: true;
  ageRuleApproved: true;
}

export interface PublishRegistrationSessionRequestDto {
  expectedVersion: number;
  approvals: PublishApprovalsDto;
}

export interface VersionRequestDto {
  expectedVersion: number;
}

export interface AdminRegistrationPolicyDto {
  id: string;
  policyVersion: string;
  status: AdminRegistrationPolicyStatus;
  version: number;
  content: Record<string, unknown>;
  approvedAt: string | null;
  retiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRegistrationPolicyListDto {
  current: AdminRegistrationPolicyDto | null;
  items: AdminRegistrationPolicyDto[];
}

export interface CreateRegistrationPolicyRequestDto {
  policyVersion: string;
  content: RegistrationPolicyContentMap;
}

export function parseRetryAfterHeader(
  headerValue: string | null,
  nowMs: number = Date.now(),
): number | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate)) {
    const deltaSeconds = Math.ceil((parsedDate - nowMs) / 1000);
    return deltaSeconds > 0 ? deltaSeconds : 0;
  }

  return null;
}

export function parseRegistrationErrorBody(
  body: unknown,
): RegistrationErrorDto | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.code !== "string") return null;

  const fieldErrors: RegistrationErrorFieldDto[] | undefined = Array.isArray(
    candidate.fieldErrors,
  )
    ? candidate.fieldErrors
        .filter(
          (entry): entry is RegistrationErrorFieldDto =>
            Boolean(entry) &&
            typeof entry === "object" &&
            typeof (entry as Record<string, unknown>).field === "string" &&
            typeof (entry as Record<string, unknown>).code === "string",
        )
        .map((entry) => ({ field: entry.field, code: entry.code }))
    : undefined;

  return {
    statusCode:
      typeof candidate.statusCode === "number" ? candidate.statusCode : 0,
    code: candidate.code,
    message: typeof candidate.message === "string" ? candidate.message : "",
    fieldErrors,
    details:
      candidate.details && typeof candidate.details === "object"
        ? (candidate.details as Record<string, unknown>)
        : undefined,
    retryAfter:
      typeof candidate.retryAfter === "number" &&
      Number.isFinite(candidate.retryAfter)
        ? candidate.retryAfter
        : undefined,
  };
}
