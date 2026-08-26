import { SetMetadata } from "@nestjs/common";
import {
  ALLOW_AUTHENTICATED_KEY,
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
} from "./auth.constants";
import type { KhlimUserRole } from "./roles";

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

export const AllowAuthenticated = () =>
  SetMetadata(ALLOW_AUTHENTICATED_KEY, true);

export const RequireAnyRole = (...roles: KhlimUserRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
