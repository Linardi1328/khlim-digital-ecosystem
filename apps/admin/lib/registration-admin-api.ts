"use client";

import type {
  AdminRegistrationPolicyDto,
  AdminRegistrationPolicyListDto,
  AdminRegistrationSessionDto,
  AdminRegistrationSessionListDto,
  CreateRegistrationPolicyRequestDto,
  CreateRegistrationSessionRequestDto,
  PublishRegistrationSessionRequestDto,
  RegistrationDetailDto,
  RegistrationListDto,
  RegistrationSearchRequestDto,
  RegistrationStatus,
  RegistrationStatusChangeRequestDto,
  UpdateRegistrationSessionRequestDto,
  VersionRequestDto,
} from "@khlim/api-client";
import { adminApiClient } from "./admin-api";
import type { ProgrammeItem, VenueItem } from "./types";

export {
  AGE_REFERENCE_RULE_OPTIONS,
  CONSENT_CATEGORY_META,
  DATE_ONLY_REGEX,
  ISO_WEEKDAY_OPTIONS,
  POLICY_LOCALE_META,
  POLICY_VERSION_REGEX,
  REGISTRATION_REASON_CODES,
  REGISTRATION_STATUS_OPTIONS,
  SESSION_RECURRENCE_OPTIONS,
  SHA256_HEX_REGEX,
  TIME_24H_REGEX,
  buildAdminAuthContextKey,
  buildSessionCreatePayload,
  buildSessionUpdatePayload,
  classifyAdminRegistrationError,
  createEmptyPolicyContentMap,
  createEmptySessionForm,
  formatAgeAtReference,
  formatAgeReferenceRule,
  formatConsentTypeLabel,
  formatDobWithAge,
  formatFieldErrorMessage,
  formatIsoWeekday,
  formatJerseySize,
  formatLocaleLabel,
  formatPlayerGender,
  formatPolicyStatusLabel,
  formatPublicationStateLabel,
  formatRegistrationReasonCode,
  formatRegistrationStatusLabel,
  formatRelationshipLabel,
  formatSessionRecurrence,
  getAllowedNextStatuses,
  isReasonCodeRequired,
  isTerminalRegistrationStatus,
  isoToMytDateTimeLocal,
  mytDateTimeLocalToIso,
  sessionDtoToFormState,
  validatePolicyDraftInput,
  type AdminRegistrationErrorKind,
  type ClassifiedAdminRegistrationError,
  type SessionFormState,
} from "./registration-admin-rules";

export interface ListAdminRegistrationsQuery {
  status?: RegistrationStatus;
  sessionId?: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

/**
 * Lists registrations via GET /v1/admin/academy/registrations.
 * Intentionally NEVER sends text search `q` in URL query parameters.
 */
export function listAdminRegistrations(
  query: ListAdminRegistrationsQuery = {},
): Promise<RegistrationListDto> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.sessionId) params.set("sessionId", query.sessionId);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(Math.min(query.limit, 100)));

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return adminApiClient.get<RegistrationListDto>(
    `/admin/academy/registrations${suffix}`,
    {
      cache: "no-store",
      signal: query.signal,
    },
  );
}

/**
 * Searches registrations via POST /v1/admin/academy/registrations/search (HTTP 200).
 * Search terms travel strictly in the JSON request body, never in URLs.
 */
export function searchAdminRegistrations(
  body: RegistrationSearchRequestDto,
  signal?: AbortSignal,
): Promise<RegistrationListDto> {
  const payload: RegistrationSearchRequestDto = {
    q: body.q.trim().slice(0, 100),
    ...(body.status ? { status: body.status } : {}),
    ...(body.sessionId ? { sessionId: body.sessionId } : {}),
    ...(body.page ? { page: body.page } : {}),
    ...(body.limit ? { limit: Math.min(body.limit, 100) } : {}),
  };

  return adminApiClient.post<RegistrationListDto>(
    "/admin/academy/registrations/search",
    payload,
    {
      cache: "no-store",
      signal,
    },
  );
}

/**
 * Retrieves full audited registration detail via GET /v1/admin/academy/registrations/:id.
 */
export function getAdminRegistrationDetail(
  id: string,
  signal?: AbortSignal,
): Promise<RegistrationDetailDto> {
  return adminApiClient.get<RegistrationDetailDto>(
    `/admin/academy/registrations/${encodeURIComponent(id)}`,
    {
      cache: "no-store",
      signal,
    },
  );
}

/**
 * Applies a server-validated status transition via PATCH /v1/admin/academy/registrations/:id/status.
 */
export function changeAdminRegistrationStatus(
  id: string,
  body: RegistrationStatusChangeRequestDto,
): Promise<RegistrationDetailDto> {
  return adminApiClient.patch<RegistrationDetailDto>(
    `/admin/academy/registrations/${encodeURIComponent(id)}/status`,
    body,
    {
      cache: "no-store",
    },
  );
}

/**
 * Lists authoritative registration sessions with confirmed seat counts via GET /v1/admin/academy/registration-sessions.
 */
export function listAdminRegistrationSessions(
  signal?: AbortSignal,
): Promise<AdminRegistrationSessionListDto> {
  return adminApiClient.get<AdminRegistrationSessionListDto>(
    "/admin/academy/registration-sessions",
    {
      cache: "no-store",
      signal,
    },
  );
}

export function getAdminRegistrationSession(
  id: string,
  signal?: AbortSignal,
): Promise<AdminRegistrationSessionDto> {
  return adminApiClient.get<AdminRegistrationSessionDto>(
    `/admin/academy/registration-sessions/${encodeURIComponent(id)}`,
    {
      cache: "no-store",
      signal,
    },
  );
}

export function createAdminRegistrationSession(
  body: CreateRegistrationSessionRequestDto,
): Promise<AdminRegistrationSessionDto> {
  return adminApiClient.post<AdminRegistrationSessionDto>(
    "/admin/academy/registration-sessions",
    body,
    {
      cache: "no-store",
    },
  );
}

export function updateAdminRegistrationSession(
  id: string,
  body: UpdateRegistrationSessionRequestDto,
): Promise<AdminRegistrationSessionDto> {
  return adminApiClient.patch<AdminRegistrationSessionDto>(
    `/admin/academy/registration-sessions/${encodeURIComponent(id)}`,
    body,
    {
      cache: "no-store",
    },
  );
}

export function publishAdminRegistrationSession(
  id: string,
  body: PublishRegistrationSessionRequestDto,
): Promise<AdminRegistrationSessionDto> {
  return adminApiClient.post<AdminRegistrationSessionDto>(
    `/admin/academy/registration-sessions/${encodeURIComponent(id)}/publish`,
    body,
    {
      cache: "no-store",
    },
  );
}

export function closeAdminRegistrationSession(
  id: string,
  body: VersionRequestDto,
): Promise<AdminRegistrationSessionDto> {
  return adminApiClient.post<AdminRegistrationSessionDto>(
    `/admin/academy/registration-sessions/${encodeURIComponent(id)}/close`,
    body,
    {
      cache: "no-store",
    },
  );
}

/**
 * Lists consent policy current approved version + bounded history ({ current, items }).
 */
export function listAdminRegistrationPolicies(
  signal?: AbortSignal,
): Promise<AdminRegistrationPolicyListDto> {
  return adminApiClient.get<AdminRegistrationPolicyListDto>(
    "/admin/academy/registration-policies",
    {
      cache: "no-store",
      signal,
    },
  );
}

export function createAdminRegistrationPolicy(
  body: CreateRegistrationPolicyRequestDto,
): Promise<AdminRegistrationPolicyDto> {
  return adminApiClient.post<AdminRegistrationPolicyDto>(
    "/admin/academy/registration-policies",
    body,
    {
      cache: "no-store",
    },
  );
}

export function approveAdminRegistrationPolicy(
  id: string,
  body: VersionRequestDto,
): Promise<AdminRegistrationPolicyDto> {
  return adminApiClient.post<AdminRegistrationPolicyDto>(
    `/admin/academy/registration-policies/${encodeURIComponent(id)}/approve`,
    body,
    {
      cache: "no-store",
    },
  );
}

export function retireAdminRegistrationPolicy(
  id: string,
  body: VersionRequestDto,
): Promise<AdminRegistrationPolicyDto> {
  return adminApiClient.post<AdminRegistrationPolicyDto>(
    `/admin/academy/registration-policies/${encodeURIComponent(id)}/retire`,
    body,
    {
      cache: "no-store",
    },
  );
}

/**
 * Authoritative programme and venue selectors for session creation/editing.
 */
export function listAuthoritativeProgrammes(
  signal?: AbortSignal,
): Promise<ProgrammeItem[]> {
  return adminApiClient.get<ProgrammeItem[]>(
    "/admin/operations-data/programmes",
    {
      cache: "no-store",
      signal,
    },
  );
}

export function listAuthoritativeVenues(
  signal?: AbortSignal,
): Promise<VenueItem[]> {
  return adminApiClient.get<VenueItem[]>("/admin/operations-data/venues", {
    cache: "no-store",
    signal,
  });
}
