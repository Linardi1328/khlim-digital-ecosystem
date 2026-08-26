import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FamilyAccessService } from "../family/family-access.service";
import {
  ALLOW_AUTHENTICATED_KEY,
  ATHLETE_ACCESS_KEY,
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
  type AthleteAccessPolicy,
} from "./auth.constants";
import type { AuthenticatedRequest } from "./authenticated-user";
import type { KhlimUserRole } from "./roles";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      targets,
    );

    if (isPublic) {
      return true;
    }

    const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(
      ALLOW_AUTHENTICATED_KEY,
      targets,
    );
    const requiredRoles = this.reflector.getAllAndOverride<KhlimUserRole[]>(
      REQUIRED_ROLES_KEY,
      targets,
    );
    const athleteAccess = this.reflector.getAllAndOverride<AthleteAccessPolicy>(
      ATHLETE_ACCESS_KEY,
      targets,
    );

    if (!allowAuthenticated && !requiredRoles && !athleteAccess) {
      throw new ForbiddenException("Authorization policy is required");
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.authenticatedUser;

    if (!user) {
      throw new UnauthorizedException("Authenticated user context is required");
    }

    if (requiredRoles?.length) {
      const userRoles = new Set(user.roles);
      const hasRequiredRole = requiredRoles.some((role) => userRoles.has(role));

      if (!hasRequiredRole) {
        throw new ForbiddenException("Insufficient permissions");
      }
    }

    if (athleteAccess) {
      const athleteId = request.params?.[athleteAccess.param];
      const canAccess =
        typeof athleteId === "string" &&
        (await this.familyAccess.canAccessAthlete(
          user,
          athleteId,
          athleteAccess.mode,
        ));

      if (!canAccess) {
        throw new ForbiddenException("Athlete access is not permitted");
      }
    }

    return true;
  }
}
