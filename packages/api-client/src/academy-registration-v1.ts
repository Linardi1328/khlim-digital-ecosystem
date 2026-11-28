import type { components } from "./schema";

/**
 * Academy Registration V1 (RIC-190 / RIC-191) contract types.
 *
 * All DTO types are direct aliases of the generated OpenAPI schema in `./schema`
 * (`openapi/khlim-v1.json` -> `packages/api-client/src/schema.d.ts`).
 */

type Schemas = components["schemas"];

export type RegistrationConsentItemDto = Schemas["RegistrationConsentItemDto"];
export type RegistrationConsentConfigDto =
  Schemas["RegistrationConsentConfigDto"];
export type RegistrationConfigDto = Schemas["RegistrationConfigDto"];
export type PublicVenueDto = Schemas["PublicVenueDto"];
export type PublicAgeReferenceDto = Schemas["PublicAgeReferenceDto"];
export type PublicRegistrationSessionDto =
  Schemas["PublicRegistrationSessionDto"];
export type PublicRegistrationSessionsDto =
  Schemas["PublicRegistrationSessionsDto"];
export type RegistrationPlayerDto = Schemas["RegistrationPlayerDto"];
export type RegistrationGuardianDto = Schemas["RegistrationGuardianDto"];
export type RegistrationEmergencyContactDto =
  Schemas["RegistrationEmergencyContactDto"];
export type RegistrationConsentsDto = Schemas["RegistrationConsentsDto"];
export type CreateRegistrationRequestDto =
  Schemas["CreateRegistrationRequestDto"];
export type RegistrationReceiptSessionDto =
  Schemas["RegistrationReceiptSessionDto"];
export type RegistrationReceiptDto = Schemas["RegistrationReceiptDto"];
export type RegistrationErrorFieldDto = Schemas["RegistrationErrorFieldDto"];
export type RegistrationErrorDto = Schemas["RegistrationErrorDto"];
export type RegistrationSummaryDto = Schemas["RegistrationSummaryDto"];
export type RegistrationListDto = Schemas["RegistrationListDto"];
export type RegistrationSearchRequestDto =
  Schemas["RegistrationSearchRequestDto"];
export type RegistrationDetailDto = Schemas["RegistrationDetailDto"];
export type RegistrationStatusChangeRequestDto =
  Schemas["RegistrationStatusChangeRequestDto"];
export type AdminSessionProgrammeDto = Schemas["AdminSessionProgrammeDto"];
export type AdminSessionVenueDto = Schemas["AdminSessionVenueDto"];
export type AdminSessionSeatCountsDto = Schemas["AdminSessionSeatCountsDto"];
export type AdminRegistrationSessionDto =
  Schemas["AdminRegistrationSessionDto"];
export type AdminRegistrationSessionListDto =
  Schemas["AdminRegistrationSessionListDto"];
export type CreateRegistrationSessionRequestDto =
  Schemas["CreateRegistrationSessionRequestDto"];
export type UpdateRegistrationSessionRequestDto =
  Schemas["UpdateRegistrationSessionRequestDto"];
export type PublishApprovalsDto = Schemas["PublishApprovalsDto"];
export type PublishRegistrationSessionRequestDto =
  Schemas["PublishRegistrationSessionRequestDto"];
export type VersionRequestDto = Schemas["VersionRequestDto"];
export type ApproveRegistrationPolicyRequestDto =
  Schemas["ApproveRegistrationPolicyRequestDto"];
export type AdminRegistrationPolicyDto = Schemas["AdminRegistrationPolicyDto"];
export type AdminRegistrationPolicyListDto =
  Schemas["AdminRegistrationPolicyListDto"];
export type CreateRegistrationPolicyRequestDto =
  Schemas["CreateRegistrationPolicyRequestDto"];

// Enum aliases derived directly from generated OpenAPI schema fields
export type RegistrationLocale = CreateRegistrationRequestDto["locale"];
export type RegistrationSessionRecurrence = Exclude<
  PublicRegistrationSessionDto["recurrence"],
  null
>;
export type RegistrationAgeReferenceRule = Exclude<
  NonNullable<CreateRegistrationSessionRequestDto["ageReferenceRule"]>,
  null
>;
export type RegistrationStatus = RegistrationSummaryDto["status"];
export type RegistrationTargetStatus =
  RegistrationStatusChangeRequestDto["status"];
export type RegistrationReasonCode = NonNullable<
  RegistrationStatusChangeRequestDto["reasonCode"]
>;
export type AdminRegistrationSessionState =
  AdminRegistrationSessionDto["publicationState"];
export type AdminRegistrationPolicyStatus =
  AdminRegistrationPolicyDto["status"];

export type RegistrationConsentType =
  "GUARDIAN_AUTHORITY" | "REGISTRATION_PRIVACY" | "MARKETING" | "PHOTOGRAPHY";

export interface RegistrationConsentLocaleContentRef {
  ref: string;
  sha256: string;
}

export type RegistrationPolicyContentMap = Record<
  RegistrationConsentType,
  Record<RegistrationLocale, RegistrationConsentLocaleContentRef>
>;

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

/**
 * Distinguishes server-authoritative deferred feature gates
 * (HTTP 403 with `code: "FEATURE_NOT_AVAILABLE"`) from ordinary
 * permission/authentication 403 failures.
 */
export function isFeatureNotAvailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; responseBody?: unknown };
  if (candidate.status !== 403) return false;
  const parsed = parseRegistrationErrorBody(candidate.responseBody);
  return parsed?.code === "FEATURE_NOT_AVAILABLE";
}
