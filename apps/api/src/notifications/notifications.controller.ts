import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth("supabase")
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("me/notifications")
  listMine(@CurrentUser() user: AuthenticatedUserContext) {
    return this.notifications.listMine(user.id);
  }

  @Post("me/notifications/:receiptId/read")
  markRead(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("receiptId") receiptId: string,
  ) {
    return this.notifications.markRead(receiptId, user.id);
  }

  @Get("admin/notifications")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  listAdmin() {
    return this.notifications.listAdmin();
  }

  @Post("admin/notifications")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  @RequireMfa()
  send(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: Parameters<NotificationsService["send"]>[0],
  ) {
    return this.notifications.send(body, user.id);
  }
}
