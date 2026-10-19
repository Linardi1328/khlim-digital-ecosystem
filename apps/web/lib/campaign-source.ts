/**
 * Utilities for capturing, validating, and propagating bounded campaign tokens across the visitor journey.
 * Never stores personal data or arbitrary URL strings in browser storage.
 */

const CAMPAIGN_TOKEN_REGEX = /^[a-zA-Z0-9_\-]{1,64}$/;
export const SESSION_STORAGE_KEY = "khlim_campaign_source";
export const UNATTRIBUTED_CAMPAIGN_SOURCE = "unattributed";

/**
 * Narrowly scoped check for phone-like numeric tokens to prevent accidental phone number
 * leakage through campaign query parameters, while preserving legitimate campaign IDs
 * (e.g. '3x3-oct24', 'summer2025', 'camp-123', '2026-10-24', 'promo_2025').
 */
export function isPhoneLikeToken(token: string): boolean {
  const stripped = token.replace(/[\s\-_]/g, "");

  // Must consist entirely of digits to be considered a phone-like numeric token
  if (!/^\d+$/.test(stripped)) {
    return false;
  }

  // Malaysian mobile local (01x, 10-11 digits) or country code (601x, 11-12 digits)
  if (/^01\d{8,9}$/.test(stripped) || /^601\d{8,9}$/.test(stripped)) {
    return true;
  }

  // General phone-like numbers without '+' (10 to 15 digits)
  if (stripped.length >= 10 && stripped.length <= 15) {
    return true;
  }

  return false;
}

export function sanitizeCampaignToken(
  token: string | null | undefined,
): string | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (!CAMPAIGN_TOKEN_REGEX.test(trimmed)) {
    return null;
  }
  if (trimmed === UNATTRIBUTED_CAMPAIGN_SOURCE) {
    return null;
  }
  if (isPhoneLikeToken(trimmed)) {
    return null;
  }
  return trimmed;
}

export function extractCampaignCandidate(
  paramInput?: string | null | { get(key: string): string | null },
): string | null {
  if (!paramInput) return null;
  if (typeof paramInput === "string") {
    return paramInput;
  }
  if (typeof paramInput === "object" && typeof paramInput.get === "function") {
    return (
      paramInput.get("source") ||
      paramInput.get("utm_source") ||
      paramInput.get("ref") ||
      paramInput.get("campaign")
    );
  }
  return null;
}

export function getQueryCampaignSource(
  querySource?: string | null | { get(key: string): string | null },
): string | null {
  const candidate = extractCampaignCandidate(querySource);
  return sanitizeCampaignToken(candidate);
}

export function resolveCampaignSource(
  querySource?: string | null | { get(key: string): string | null },
): string | null {
  const candidate = extractCampaignCandidate(querySource);
  const sanitizedQuery = sanitizeCampaignToken(candidate);
  if (sanitizedQuery) {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, sanitizedQuery);
      } catch {
        // Ignore storage failures in restricted contexts
      }
    }
    return sanitizedQuery;
  }

  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const sanitizedStored = sanitizeCampaignToken(stored);
      if (sanitizedStored) {
        return sanitizedStored;
      }
    } catch {
      // Ignore storage failures
    }
  }

  return null;
}

/**
 * Resolves the explicit campaign attribution token for lead registration submission.
 * If a valid bounded campaign token was tracked (via query parameter or sessionStorage),
 * it is returned; otherwise returns the explicit fallback 'unattributed' rather than null.
 */
export function resolveLeadSubmissionSource(
  querySource?: string | null | { get(key: string): string | null },
): string {
  const resolved = resolveCampaignSource(querySource);
  return resolved ?? UNATTRIBUTED_CAMPAIGN_SOURCE;
}

export function buildUrlWithSource(
  path: string,
  source?: string | null,
  additionalParams: Record<string, string | undefined> = {},
): string {
  const parts = path.split("?");
  const basePath = parts[0] ?? "";
  const existingQuery = parts[1] ?? "";
  const searchParams = new URLSearchParams(existingQuery);

  for (const [key, val] of Object.entries(additionalParams)) {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.set(key, val);
    }
  }

  if (
    source &&
    source !== UNATTRIBUTED_CAMPAIGN_SOURCE &&
    !searchParams.has("source")
  ) {
    searchParams.set("source", source);
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
