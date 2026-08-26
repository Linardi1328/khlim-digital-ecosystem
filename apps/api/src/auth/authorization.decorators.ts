import { SetMetadata } from "@nestjs/common";
import {
  ALLOW_AUTHENTICATED_KEY,
  ATHLETE_ACCESS_KEY,
  MFA_REQUIRED_KEY,
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
  type AthleteAccessMode,
} from "./auth.constants";
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
