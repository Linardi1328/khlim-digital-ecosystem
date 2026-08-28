import { Body, Controller, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { NotificationsService } from "../notifications/notifications.service";
import { SchedulingService } from "./scheduling.service";

@ApiTags("scheduling")
@ApiBearerAuth("supabase")
@Controller()
export class SchedulingController {
  constructor(
    private readonly scheduling: SchedulingService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get("me/schedule")
  mySchedule(@CurrentUser() user: AuthenticatedUserContext) {
    return this.scheduling.listMySchedule(user.id);
  }

  @Get("admin/scheduling/sessions")
  @RequireAnyRole(
    "SUPER_ADMIN",
    "MANAGEMENT",
    "ACADEMY_ADMIN",
    "HEAD_COACH",
    "COACH",
    "EVENT_STAFF",
  )
  listAdmin() {
    return this.scheduling.listAdminSessions();
  }

  @Post("admin/scheduling/sessions")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  create(@Body() body: Parameters<SchedulingService["createSession"]>[0]) {
    return this.scheduling.createSession(body);
  }

  @Patch("admin/scheduling/sessions/:id")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  update(
    @Param("id") id: string,
    @Body() body: Parameters<SchedulingService["updateSession"]>[1],
  ) {
    return this.scheduling.updateSession(id, body);
  }

  @Post("admin/scheduling/sessions/:id/cancel")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  async cancel(@Param("id") id: string, @Body() body: { reason: string }) {
    const session = await this.scheduling.cancelSession(id, body.reason);
    if (session.programmeOfferingId) {
      await this.notifications
        .notifyOffering(
          session.programmeOfferingId,
          `Schedule change: ${session.title}`,
          `${session.title} scheduled for ${session.startsAt.toISOString()} was cancelled. Reason: ${body.reason.trim()}`,
        )
        .catch(() => undefined);
    }
    return session;
  }

  @Post("admin/scheduling/sessions/:id/complete")
  @RequireAnyRole(
    "SUPER_ADMIN",
    "MANAGEMENT",
    "ACADEMY_ADMIN",
    "HEAD_COACH",
    "COACH",
  )
  complete(@Param("id") id: string) {
    return this.scheduling.completeSession(id);
  }

  @Get("admin/scheduling/sessions/:id/attendance")
  @RequireAnyRole(
    "SUPER_ADMIN",
    "MANAGEMENT",
    "ACADEMY_ADMIN",
    "HEAD_COACH",
    "COACH",
    "EVENT_STAFF",
  )
  attendance(@Param("id") id: string) {
    return this.scheduling.listAttendance(id);
  }

  @Put("admin/scheduling/sessions/:id/attendance")
  @RequireAnyRole(
    "SUPER_ADMIN",
    "MANAGEMENT",
    "ACADEMY_ADMIN",
    "HEAD_COACH",
    "COACH",
    "EVENT_STAFF",
  )
  markAttendance(
    @Param("id") id: string,
    @Body() body: Parameters<SchedulingService["markAttendance"]>[1],
  ) {
    return this.scheduling.markAttendance(id, body);
  }
}
