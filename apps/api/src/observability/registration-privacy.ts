// Matched against the request PATH only (never the query string), by whole
// segments, optionally after the /v1 prefix.
const REGISTRATION_PATH =
  /^(?:\/v1)?\/(?:academy\/(?:registrations|registration-config|sessions)|admin\/academy\/(?:registrations|registration-sessions|registration-policies))(?:\/|$)/;

function pathOf(value: string): string {
  // Accepts absolute URLs, bare paths and "METHOD /path" transaction names.
  const candidate = value.trim().replace(/^[A-Z]+\s+/, "");
  try {
    return new URL(candidate, "http://placeholder.invalid").pathname;
  } catch {
    return candidate.split(/[?#]/)[0] ?? "";
  }
}

export function isRegistrationRoute(value: string | undefined): boolean {
  return Boolean(value) && REGISTRATION_PATH.test(pathOf(value as string));
}

interface SentryLikeEvent {
  request?: {
    url?: string;
    data?: unknown;
    query_string?: unknown;
    cookies?: unknown;
    headers?: unknown;
  };
  transaction?: string;
  exception?: { values?: Array<{ value?: string }> };
  message?: string;
  extra?: unknown;
  breadcrumbs?: unknown;
  user?: unknown;
}

/**
 * Sentry `beforeSend` for registration routes only: drops bodies, query
 * strings, cookies, headers, breadcrumbs and extra context, and replaces
 * exception text (which can embed submitted data) with a fixed string. Other
 * routes pass through unchanged.
 */
export function scrubRegistrationEvent<T extends SentryLikeEvent>(event: T): T {
  if (
    !isRegistrationRoute(event.request?.url) &&
    !isRegistrationRoute(event.transaction)
  ) {
    return event;
  }
  if (event.request) {
    delete event.request.data;
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.headers;
    if (event.request.url) event.request.url = event.request.url.split("?")[0]!;
  }
  for (const value of event.exception?.values ?? []) {
    value.value = "Registration request failed (details withheld)";
  }
  if (event.message) event.message = "Registration request failed";
  delete event.extra;
  delete event.breadcrumbs;
  delete event.user;
  return event;
}
