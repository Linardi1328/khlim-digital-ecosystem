import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedRequest, AuthenticatedUserContext } from "./authenticated-user";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUserContext => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.authenticatedUser) {
      throw new UnauthorizedException("Authenticated user context is required");
    }

    return request.authenticatedUser;
  },
);
