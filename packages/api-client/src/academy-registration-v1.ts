/**
 * Academy Registration V1 (RIC-190 / RIC-191) contract types.
 *
 * SOURCE OF TRUTH:
 * Extracted verbatim from PR #126 (`codex/ric-190-academy-registration-v1-20261124`)
 * inspected head SHA: 7f3a05a250159675671aaa9bdd68ee3b9c30b5a8
 * (`packages/api-client/src/schema.d.ts` + `docs/implementation/ric-191-academy-registration-handoff.md`).
 *
 * DEPENDENCY RECONCILIATION STRATEGY:
 * - PR #126 (RIC-190 backend) and PR #125 (RIC-184 web) are both unmerged draft PRs.
 * - Keeping `openapi/khlim-v1.json` and `packages/api-client/src/schema.d.ts` untouched on the
 *   RIC-191 frontend branch preserves `pnpm openapi:check` integrity without pulling backend
 *   changes into the frontend PR.
 * - Once PR #126 merges (including Codex's F4 OpenAPI response DTO corrections for admin
 *   sessions and policies), replace these aliases with direct `components["schemas"][...]`
 *   re-exports from `./schema`.
 * - Intentionally does NOT define handwritten response DTOs for admin registration-sessions
 *   or admin registration-policies while Codex F4 OpenAPI corrections are pending.
 */

export type RegistrationLocale = "en" | "ms" | "zh-Hans";

export type RegistrationSessionRecurrence = "NONE" | "WEEKLY";

export type RegistrationAgeReferenceRule =
  "FIXED_DATE" | "SESSION_START_DATE" | "REGISTRATION_DATE";

export type RegistrationStatus =
  "RECEIVED" | "UNDER_REVIEW" | "CONFIRMED" | "REJECTED" | "CANCELLED";

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

export interface RegistrationConsentLocaleContentRef {
  ref: string;
  sha256: string;
}

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
  status: RegistrationStatus;
  reasonCode?: RegistrationReasonCode;
  expectedVersion: number;
}

export interface RegistrationSessionRequestDto {
  programmeId?: string;
  name?: string;
  venueId?: string;
  capacity?: number;
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
  expectedVersion?: number;
}

export interface PublishRegistrationSessionRequestDto {
  expectedVersion: number;
  approvals: Record<string, boolean>;
}

export interface VersionRequestDto {
  expectedVersion: number;
}

export interface CreateRegistrationPolicyRequestDto {
  policyVersion: string;
  content: Record<string, unknown>;
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
