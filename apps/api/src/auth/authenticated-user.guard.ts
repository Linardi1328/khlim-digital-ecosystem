import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IdentityService } from "../identity/identity.service";
import { ORGANIZATION_HEADER } from "../organization/organization.constants";
import { OrganizationService } from "../organization/organization.service";
import { PUBLIC_ROUTE_KEY } from "./auth.constants";
import type { AuthenticatedRequest } from "./authenticated-user";
import { SupabaseJwtService } from "./supabase-jwt.service";

const PLATFORM_PARTICIPANT_ROLES = new Set(["GUARDIAN", "ATHLETE"]);

@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: SupabaseJwtService,
    private readonly identity: IdentityService,
    private readonly organizations: OrganizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    const user = await this.identity.resolveAuthenticatedUser(
      await this.jwt.verify(token),
    );
    const requestedOrganization = this.extractOrganizationHeader(
      request.headers[ORGANIZATION_HEADER],
    );
    const organization = await this.organizations.resolveContext(
      user,
      requestedOrganization,
    );
    const participantRoles = user.roles.filter((role) =>
      PLATFORM_PARTICIPANT_ROLES.has(role),
    );
    const effectiveRoles = [
      ...new Set([...participantRoles, ...organization.roles]),
    ].sort();

    request.authenticatedUser = {
      ...user,
      platformRoles: [...user.roles].sort(),
      organizationRoles: [...organization.roles],
      organization: {
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
      },
      roles: effectiveRoles,
    };

    return true;
  }

  private extractBearerToken(
    authorization: string | string[] | undefined,
  ): string {
    if (typeof authorization !== "string") {
      throw new UnauthorizedException("Bearer access token is required");
    }

    const [scheme, token, extra] = authorization.trim().split(/\s+/);

    if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
      throw new UnauthorizedException("Bearer access token is required");
    }

    return token;
  }

  private extractOrganizationHeader(
    value: string | string[] | undefined,
  ): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== "string") {
      throw new UnauthorizedException("Organization context is invalid");
    }
    return value;
  }
}
