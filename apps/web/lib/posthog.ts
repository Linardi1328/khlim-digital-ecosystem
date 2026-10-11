"use client";

import {
  ANALYTICS_ANON_ID_KEY,
  hasAnalyticsConsent,
} from "./analytics-consent";
import { sanitizeCampaignToken } from "./campaign-source";

export const POSTHOG_PROJECT_ID = "652783";
export const POSTHOG_DEFAULT_INGESTION_HOST = "https://us.i.posthog.com";
export const CAMPAIGN_TOKEN_3X3 = "3x3-oct24";

export type PermittedAnalyticsEvent =
  "campaign_landing" | "interest_form_view" | "interest_submit_success_client";

const ALLOWED_PROPERTIES = new Set([
  "campaign",
  "offering_id",
  "path",
  "source",
  "referrer",
]);

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
];

function getAnonymousDistinctId(): string {
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

function sanitizeProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    // Only accept allowed properties and reject forbidden keys
    if (!ALLOWED_PROPERTIES.has(key)) continue;
    if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) continue;

    if (key === "campaign" || key === "source") {
      const token = sanitizeCampaignToken(
        typeof value === "string" ? value : null,
      );
      if (token) sanitized[key] = token;
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    } else if (value === null) {
      sanitized[key] = null;
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

  const payload = {
    api_key: apiKey,
    event,
    properties: {
      distinct_id: distinctId,
      $current_url: window.location.href,
      $pathname: window.location.pathname,
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
 * Deduplicated capture of campaign landing event
 */
export async function trackCampaignLanding(
  campaign: string | null | undefined,
  path: string,
): Promise<boolean> {
  const token = sanitizeCampaignToken(campaign);
  if (!token) return false;

  const dedupKey = `khlim_tracked_landing_${token}_${path}`;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(dedupKey)) {
        return false;
      }
      sessionStorage.setItem(dedupKey, "1");
    } catch {
      // Ignore sessionStorage issues
    }
  }

  return capturePostHogEvent("campaign_landing", {
    campaign: token,
    path,
  });
}

/**
 * Deduplicated capture of interest form view
 */
export async function trackInterestFormView(
  campaign: string | null | undefined,
  offeringId?: string | null,
): Promise<boolean> {
  const token = sanitizeCampaignToken(campaign) || CAMPAIGN_TOKEN_3X3;

  const dedupKey = `khlim_tracked_form_view_${token}`;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(dedupKey)) {
        return false;
      }
      sessionStorage.setItem(dedupKey, "1");
    } catch {
      // Ignore sessionStorage issues
    }
  }

  return capturePostHogEvent("interest_form_view", {
    campaign: token,
    offering_id: offeringId || null,
  });
}

/**
 * Capture of client-side lead registration success
 */
export async function trackInterestSubmitSuccess(
  campaign: string | null | undefined,
  offeringId?: string | null,
): Promise<boolean> {
  const token = sanitizeCampaignToken(campaign) || CAMPAIGN_TOKEN_3X3;

  return capturePostHogEvent("interest_submit_success_client", {
    campaign: token,
    offering_id: offeringId || null,
  });
}
