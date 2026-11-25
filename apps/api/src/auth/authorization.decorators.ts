import { SetMetadata } from "@nestjs/common";
import {
  ALLOW_AUTHENTICATED_KEY,
  ATHLETE_ACCESS_KEY,
  DEFERRED_FEATURE_KEY,
  MFA_REQUIRED_KEY,
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
  type AthleteAccessMode,
} from "./auth.constants";
import type {
  DeferredFeature,
  DeferredFeaturePolicy,
} from "./deferred-features";
import type { KhlimUserRole } from "./roles";

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

export const AllowAuthenticated = () =>
  SetMetadata(ALLOW_AUTHENTICATED_KEY, true);

export const RequireAnyRole = (...roles: KhlimUserRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

export const RequireAthleteAccess = (
  mode: AthleteAccessMode,
  param = "athleteId",
) => SetMetadata(ATHLETE_ACCESS_KEY, { mode, param });

export const RequireMfa = () => SetMetadata(MFA_REQUIRED_KEY, true);

/**
 * Closes a deferred customer feature server-side until its launch variable is
 * set (see auth/deferred-features.ts). Enforced by AuthorizationGuard after
 * authentication and before any data access.
 */
export const RequireLaunchedFeature = (
  feature: DeferredFeature,
  options: { staffBypass?: boolean } = {},
) =>
  SetMetadata(DEFERRED_FEATURE_KEY, {
    feature,
    staffBypass: options.staffBypass === true,
  } satisfies DeferredFeaturePolicy);
