import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IdentityService } from "../identity/identity.service";
import { PUBLIC_ROUTE_KEY } from "./auth.constants";
import type { AuthenticatedRequest } from "./authenticated-user";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: SupabaseJwtService,
    private readonly identity: IdentityService,
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
    const verifiedIdentity = await this.jwt.verify(token);
    request.authenticatedUser =
      await this.identity.resolveAuthenticatedUser(verifiedIdentity);

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
}
