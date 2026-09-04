import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { NotificationsService } from "./notifications.service";

function organizationId(user: AuthenticatedUserContext): string {
  if (!user.organization?.id) {
    throw new ForbiddenException("Organization context is required");
  }
  return user.organization.id;
}

@ApiTags("notifications")
@ApiBearerAuth("supabase")
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("me/notifications")
  listMine(@CurrentUser() user: AuthenticatedUserContext) {
    return this.notifications.listMine(organizationId(user), user.id);
  }

  @Post("me/notifications/:receiptId/read")
  markRead(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("receiptId") receiptId: string,
  ) {
    return this.notifications.markRead(
      organizationId(user),
      receiptId,
      user.id,
    );
  }

  @Get("admin/notifications")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  listAdmin(@CurrentUser() user: AuthenticatedUserContext) {
    return this.notifications.listAdmin(organizationId(user));
  }

  @Post("admin/notifications")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  @RequireMfa()
  send(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: Parameters<NotificationsService["send"]>[1],
  ) {
    return this.notifications.send(organizationId(user), body, user.id);
  }
}
