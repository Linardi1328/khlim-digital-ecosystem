import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ALLOW_AUTHENTICATED_KEY,
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
} from "./auth.constants";
import type { AuthenticatedRequest } from "./authenticated-user";
import type { KhlimUserRole } from "./roles";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    if (!allowAuthenticated && !requiredRoles) {
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

    return true;
  }
}
