"use client";

import type {
  RegistrationDetailDto,
  RegistrationListDto,
  RegistrationSearchRequestDto,
  RegistrationStatus,
  RegistrationStatusChangeRequestDto,
} from "@khlim/api-client";
import { adminApiClient } from "./admin-api";

export {
  REGISTRATION_STATUS_OPTIONS,
  REGISTRATION_REASON_CODES,
  getAllowedNextStatuses,
  isTerminalRegistrationStatus,
  isReasonCodeRequired,
  formatRegistrationReasonCode,
  classifyAdminRegistrationError,
  type AdminRegistrationErrorKind,
  type ClassifiedAdminRegistrationError,
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
 * Searches registrations via POST /v1/admin/academy/registrations/search.
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
