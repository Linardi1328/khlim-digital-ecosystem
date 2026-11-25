/**
 * Server-authoritative launch gates for deferred V1 customer features.
 *
 * These are the API counterpart of the web app's NEXT_PUBLIC_ENABLE_V1_*
 * presentation flags. Browser flags hide UI only; they are never an
 * authorization control. A deferred feature is OFF unless its server
 * variable is exactly "1" (any other value, including unset, is OFF).
 */
export const DEFERRED_FEATURES = {
  /** Paid Academy enrolment: pending-membership creation and Billplz checkout. */
  V1_ENROLMENT: "KHLIM_ENABLE_V1_ENROLMENT",
  /** Parent portal: athlete profiles, family links, schedule, notifications, membership/billing views. */
  V1_PORTAL: "KHLIM_ENABLE_V1_PORTAL",
} as const;

export type DeferredFeature = keyof typeof DEFERRED_FEATURES;

export function isDeferredFeatureEnabled(
  feature: DeferredFeature,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment[DEFERRED_FEATURES[feature]] === "1";
}

export interface DeferredFeaturePolicy {
  feature: DeferredFeature;
  /**
   * When true, organization staff who already pass the route's access policy
   * (SUPER_ADMIN, MANAGEMENT, ACADEMY_ADMIN) keep access while the customer
   * feature is closed, so support operations continue. Never set for routes
   * that start a paid workflow.
   */
  staffBypass: boolean;
}

export const DEFERRED_FEATURE_STAFF_ROLES = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
] as const;
