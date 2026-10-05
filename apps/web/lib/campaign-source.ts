/**
 * Utilities for capturing, validating, and propagating bounded campaign tokens across the visitor journey.
 * Never stores personal data or arbitrary URL strings in browser storage.
 */

const CAMPAIGN_TOKEN_REGEX = /^[a-zA-Z0-9_\-]{1,64}$/;
const SESSION_STORAGE_KEY = "khlim_campaign_source";

export function sanitizeCampaignToken(
  token: string | null | undefined,
): string | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (CAMPAIGN_TOKEN_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function resolveCampaignSource(
  querySource?: string | null,
): string | null {
  const sanitizedQuery = sanitizeCampaignToken(querySource);
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

  if (source && !searchParams.has("source")) {
    searchParams.set("source", source);
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
