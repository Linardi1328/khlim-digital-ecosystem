/**
 * Localhost-Only Visual Review Allowlist & Safety Gates
 *
 * Enables authorized local inspection of the original KHLIM website visual
 * composition using files recovered outside the repository (e.g.
 * `$HOME/KHLIM-Private-Media-Recovery/apps/web/public/media`).
 *
 * FAIL-CLOSED INVARIANTS:
 * - Never activates in production builds (`NODE_ENV !== "development"`).
 * - Never activates on Vercel / hosted deployments.
 * - Requires explicit opt-in (`KHLIM_LOCAL_VISUAL_REVIEW=1` forwarded by
 *   `next.config.ts` only during local development).
 * - Requires a loopback hostname (`127.0.0.1`, `localhost`, or `[::1]`).
 * - Enforces an exact 32-asset allowlist matching the historical website
 *   placements; unverified placeholders (such as `khero/coming-soon.webp`)
 *   and arbitrary paths are strictly rejected.
 * - Never modifies `APPROVED_YOUTH_MEDIA` or places restricted files in
 *   `apps/web/public/`.
 */

export const LOCAL_VISUAL_REVIEW_PREFIX = "/api/preview-media/recovered/";

/**
 * Exact 32 historical restricted youth photographs required to inspect the
 * original Homepage, Academy, Achievements, Representative Milestones, and
 * Spotlight Club Gallery placements during localhost-only internal review.
 */
export const LOCAL_VISUAL_REVIEW_ALLOWLIST = [
  // Homepage Hero Carousel (4 slides × desktop & mobile variants = 8)
  "khlim/team-hero-wide-1920.webp",
  "khlim/team-hero-1920.webp",
  "home/team-huddle-desktop.webp",
  "home/team-huddle-mobile.webp",
  "home/sideline-energy-desktop.webp",
  "home/sideline-energy-mobile.webp",
  "home/court-together-desktop.webp",
  "home/court-together-mobile.webp",

  // Academy Training Group (1)
  "khlim/training-group-1280.webp",

  // Verified Team Honours — Homepage top 3 & Spotlight all 9 (9)
  "achievements/cls-international-indonesia-2026-champion.webp",
  "achievements/jasmine-cup-2025-2026-khlim-a-champion.webp",
  "achievements/jasmine-cup-2025-2026-khlim-e-fourth.webp",
  "achievements/u15-sba-d1-selangor-2025-champion.webp",
  "achievements/u15-sba-d2-selangor-2025.webp",
  "achievements/u15-sba-selangor-2024-third.webp",
  "achievements/u16-d2-sba-selangor-2026-runner-up.webp",
  "achievements/u14g-mpbl-2025-runner-up.webp",
  "achievements/u14g-fastbreak-2024-champion.webp",

  // Representative Milestones — Homepage top 3 & Spotlight all 5 (5)
  "achievements/khlim-maba-matrix-u17-2026.webp",
  "achievements/khlim-maba-matrix-u17-2026-2.webp",
  "achievements/khlim-mssm-2025.webp",
  "achievements/khlim-mssm-2024.webp",
  "achievements/khlim-u15-lmc-cup-2025.webp",

  // Spotlight Club & Event Gallery (9)
  "achievements/club-gallery-team-huddle-circle.webp",
  "achievements/club-gallery-court-lineup-hoop.webp",
  "achievements/club-gallery-sideline-celebration-wide.webp",
  "achievements/club-gallery-sideline-celebration-moment.webp",
  "achievements/club-gallery-matchday-bench-cheering.webp",
  "achievements/club-gallery-studio-squad-spirit.webp",
  "achievements/club-gallery-studio-team-portrait.webp",
  "achievements/club-gallery-in-game-court-huddle.webp",
  "achievements/club-gallery-state-honours-lineup.webp",
] as const;

const LOCAL_VISUAL_REVIEW_ALLOWLIST_SET = new Set<string>(
  LOCAL_VISUAL_REVIEW_ALLOWLIST,
);

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function isLoopbackHostname(
  hostname: string | null | undefined,
): boolean {
  if (!hostname) return false;
  return LOOPBACK_HOSTNAMES.has(hostname.trim().toLowerCase());
}

/**
 * Validates an HTTP `Host` or `X-Forwarded-Host` header value against strict
 * loopback-only patterns (`localhost`, `127.0.0.1`, `[::1]`, with optional port).
 */
export function isLoopbackHostHeader(
  hostHeader: string | null | undefined,
): boolean {
  if (!hostHeader) return false;
  const trimmed = hostHeader.trim().toLowerCase();
  if (!trimmed) return false;
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/.test(trimmed);
}

export function isAllowedRecoveredVisualReviewPath(
  relativePath: string,
): boolean {
  return LOCAL_VISUAL_REVIEW_ALLOWLIST_SET.has(relativePath);
}

export function isLocalVisualReviewActive(hostnameOverride?: string): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_LOCAL_VISUAL_REVIEW !== "1") {
    return false;
  }
  if (hostnameOverride !== undefined) {
    return isLoopbackHostname(hostnameOverride);
  }
  if (typeof window !== "undefined") {
    return isLoopbackHostname(window.location.hostname);
  }
  return true;
}

/**
 * Resolves a historical `/media/...` image URL to the loopback-only,
 * development-only `/api/preview-media/recovered/...` endpoint when local
 * visual review is explicitly enabled. Always returns `undefined` in
 * production/hosted builds or for non-allowlisted paths.
 */
export function resolveLocalVisualReviewImageUrl(
  imageUrl: string | undefined,
  hostnameOverride?: string,
): string | undefined {
  if (!imageUrl || !isLocalVisualReviewActive(hostnameOverride)) {
    return undefined;
  }
  if (!imageUrl.startsWith("/media/")) {
    return undefined;
  }
  const relativePath = imageUrl.slice("/media/".length);
  if (!LOCAL_VISUAL_REVIEW_ALLOWLIST_SET.has(relativePath)) {
    return undefined;
  }
  return `${LOCAL_VISUAL_REVIEW_PREFIX}${relativePath}`;
}
