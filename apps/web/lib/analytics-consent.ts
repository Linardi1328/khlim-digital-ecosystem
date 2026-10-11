"use client";

import { useEffect, useState } from "react";

export type AnalyticsConsentStatus = "granted" | "denied" | null;

export const ANALYTICS_CONSENT_STORAGE_KEY = "khlim_analytics_consent";
export const ANALYTICS_CONSENT_EVENT = "khlim-analytics-consent-changed";
export const ANALYTICS_ANON_ID_KEY = "khlim_analytics_anon_id";

export function getAnalyticsConsent(): AnalyticsConsentStatus {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (raw === "granted" || raw === "denied") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === "granted";
}

export function setAnalyticsConsent(status: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, status);
    if (status === "denied") {
      // Purge anonymous identifier and session deduplication markers upon denial or withdrawal
      localStorage.removeItem(ANALYTICS_ANON_ID_KEY);
    }
    window.dispatchEvent(
      new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: { status } }),
    );
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function withdrawAnalyticsConsent(): void {
  setAnalyticsConsent("denied");
}

export function useAnalyticsConsent() {
  const [consent, setConsentState] = useState<AnalyticsConsentStatus>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsentState(getAnalyticsConsent());

    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        status: AnalyticsConsentStatus;
      }>;
      if (customEvent.detail?.status !== undefined) {
        setConsentState(customEvent.detail.status);
      } else {
        setConsentState(getAnalyticsConsent());
      }
    };

    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange);
    window.addEventListener("storage", handleConsentChange);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange);
      window.removeEventListener("storage", handleConsentChange);
    };
  }, []);

  return {
    consent: mounted ? consent : null,
    hasConsent: mounted && consent === "granted",
    isDecided: mounted && consent !== null,
    grantConsent: () => setAnalyticsConsent("granted"),
    withdrawConsent: () => withdrawAnalyticsConsent(),
    setConsent: (status: "granted" | "denied") => setAnalyticsConsent(status),
  };
}
