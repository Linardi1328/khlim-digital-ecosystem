"use client";

import { useEffect, useState } from "react";
import { isLocalVisualReviewActive } from "./local-visual-review-media";

/**
 * Hydration-safe hook for localhost-only development visual review.
 * Always returns `false` on the server and during initial browser hydration,
 * then enables after mount only when running in local development with
 * explicit opt-in on a loopback hostname.
 */
export function useLocalVisualReviewEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      isLocalVisualReviewActive(window.location.hostname)
    ) {
      setEnabled(true);
    }
  }, []);

  return enabled;
}
