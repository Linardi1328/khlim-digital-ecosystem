"use client";

import {
  ANALYTICS_ANON_ID_KEY,
  ANALYTICS_SESSION_ID_KEY,
  hasAnalyticsConsent,
} from "./analytics-consent";
import { sanitizeCampaignToken } from "./campaign-source";

export const POSTHOG_PROJECT_ID = "652783";
export const POSTHOG_DEFAULT_INGESTION_HOST = "https://us.i.posthog.com";
export const CAMPAIGN_TOKEN_3X3 = "3x3-oct24";

export type PermittedAnalyticsEvent =
  "campaign_landing" | "interest_form_view" | "interest_submit_success_client";

const ALLOWED_PROPERTIES = new Set(["campaign", "path"]);

const FORBIDDEN_KEY_PATTERNS = [
  /name/i,
  /phone/i,
  /email/i,
  /child/i,
  /guardian/i,
  /age/i,
  /dob/i,
  /birth/i,
  /note/i,
  /text/i,
  /message/i,
  /password/i,
  /token/i,
  /auth/i,
  /user/i,
  /idempotenc/i,
  /url/i,
  /query/i,
  /param/i,
];

// In-flight request guards against concurrent React effect firings
const inFlightLandings = new Set<string>();
const inFlightFormViews = new Set<string>();

export function getAnonymousDistinctId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(ANALYTICS_ANON_ID_KEY);
    if (!id) {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        id = `anon-${crypto.randomUUID()}`;
      } else {
        id = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }
      localStorage.setItem(ANALYTICS_ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return "ephemeral";
  }
}

export function getAnonymousSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let sessionId = sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY);
    if (!sessionId) {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        sessionId = `sess-${crypto.randomUUID()}`;
      } else {
        sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }
      sessionStorage.setItem(ANALYTICS_SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return "ephemeral-session";
  }
}

function sanitizeProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTIES.has(key)) continue;
    if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) continue;

    if (key === "campaign") {
      const token = sanitizeCampaignToken(
        typeof value === "string" ? value : null,
      );
      if (token && token === CAMPAIGN_TOKEN_3X3) {
        sanitized.campaign = token;
      }
    } else if (key === "path") {
      if (typeof value === "string") {
        // Only permit clean relative paths without query strings or hashes
        const pathWithoutQuery = value.split("?")[0] ?? "";
        const cleanPath = (pathWithoutQuery.split("#")[0] ?? "").trim();
        sanitized.path = cleanPath || "/";
      }
    }
  }

  return sanitized;
}

export function isPostHogConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim());
}

export function isAnalyticsActive(): boolean {
  return isPostHogConfigured() && hasAnalyticsConsent();
}

export async function capturePostHogEvent(
  event: PermittedAnalyticsEvent,
  properties: Record<string, unknown> = {},
): Promise<boolean> {
  // Consent-gated: tracking is OFF by default and cannot fire without explicit opt-in
  if (!isAnalyticsActive()) {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!apiKey) {
    return false;
  }

  const host = (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    POSTHOG_DEFAULT_INGESTION_HOST
  ).replace(/\/+$/, "");

  const safeProps = sanitizeProperties(properties);
  const distinctId = getAnonymousDistinctId();
  const sessionId = getAnonymousSessionId();

  // Strict privacy:
  // 1. Never transmit full $current_url or sensitive query strings
  // 2. Suppress PostHog person profile creation ($process_person_profile: false)
  // 3. Suppress unnecessary geolocation lookups ($geoip_disable: true)
  const payload = {
    api_key: apiKey,
    event,
    properties: {
      distinct_id: distinctId,
      $session_id: sessionId,
      $process_person_profile: false,
      $geoip_disable: true,
      ...safeProps,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: "cors",
    });
    return response.ok;
  } catch {
    // Analytics errors must never impact application execution or registration
    return false;
  }
}

/**
 * Deduplicated capture of campaign landing session.
 * Exactly one landing event is recorded per session across Home and Academy navigation.
 * Never sets a dedup marker before confirming analytics consent and successful delivery.
 */
export async function trackCampaignLanding(
  campaign: string | null | undefined,
  path: string,
): Promise<boolean> {
  const token = sanitizeCampaignToken(campaign);
  // Do not track missing, invalid or unrelated campaign tokens
  if (!token || token !== CAMPAIGN_TOKEN_3X3) {
    return false;
  }

  // Consistent observable session metric:
  // Count the same consenting session only once across Home and Academy navigation
  const dedupKey = `khlim_tracked_landing_session_${token}`;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(dedupKey)) {
        return false;
      }
    } catch {
      // Ignore sessionStorage issues
    }
  }

  if (inFlightLandings.has(token)) {
    return false;
  }

  inFlightLandings.add(token);
  try {
    const success = await capturePostHogEvent("campaign_landing", {
      campaign: token,
      path,
    });

    // Only set deduplication marker after confirmed successful dispatch
    if (success && typeof window !== "undefined" && hasAnalyticsConsent()) {
      try {
        sessionStorage.setItem(dedupKey, "1");
      } catch {
        // Ignore storage issues
      }
    }
    return success;
  } finally {
    inFlightLandings.delete(token);
  }
}

/**
 * Deduplicated capture of interest form view.
 * Exactly one form view event is recorded per session.
 * Does not fall back to assigning 3x3-oct24 to organic visitors.
 */
export async function trackInterestFormView(
  campaign: string | null | undefined,
  _offeringId?: string | null,
): Promise<boolean> {
  const token = sanitizeCampaignToken(campaign);
  // Organic visitors without campaign token are not tracked
  if (!token || token !== CAMPAIGN_TOKEN_3X3) {
    return false;
  }

  const dedupKey = `khlim_tracked_form_view_${token}`;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(dedupKey)) {
        return false;
      }
    } catch {
      // Ignore sessionStorage issues
    }
  }

  if (inFlightFormViews.has(token)) {
    return false;
  }

  inFlightFormViews.add(token);
  try {
    const success = await capturePostHogEvent("interest_form_view", {
      campaign: token,
      path: "/interest",
    });

    if (success && typeof window !== "undefined" && hasAnalyticsConsent()) {
      try {
        sessionStorage.setItem(dedupKey, "1");
      } catch {
        // Ignore storage issues
      }
    }
    return success;
  } finally {
    inFlightFormViews.delete(token);
  }
}

/**
 * Capture of client-side lead registration success receipt.
 * Does not fall back to assigning 3x3-oct24 to organic visitors.
 * Omits arbitrary offering IDs for maximum visitor privacy.
 */
export async function trackInterestSubmitSuccess(
  campaign: string | null | undefined,
  _offeringId?: string | null,
): Promise<boolean> {
  const token = sanitizeCampaignToken(campaign);
  if (!token || token !== CAMPAIGN_TOKEN_3X3) {
    return false;
  }

  return capturePostHogEvent("interest_submit_success_client", {
    campaign: token,
    path: "/interest",
  });
}
