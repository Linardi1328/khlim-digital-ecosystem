export const PUBLIC_ROUTE_KEY = "khlim:auth:public";
export const ALLOW_AUTHENTICATED_KEY = "khlim:auth:allow-authenticated";
export const REQUIRED_ROLES_KEY = "khlim:auth:required-roles";
export const ATHLETE_ACCESS_KEY = "khlim:auth:athlete-access";

export type AthleteAccessMode = "read" | "manage";

export interface AthleteAccessPolicy {
  mode: AthleteAccessMode;
  param: string;
}
