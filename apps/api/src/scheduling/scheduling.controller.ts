import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { NotificationsService } from "../notifications/notifications.service";
import { SchedulingService } from "./scheduling.service";

function organizationId(user: AuthenticatedUserContext): string {
  if (!user.organization?.id) {
    throw new ForbiddenException("Organization context is required");
  }
  return user.organization.id;
}

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
    return this.scheduling.listMySchedule(organizationId(user), user.id);
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
  listAdmin(@CurrentUser() user: AuthenticatedUserContext) {
    return this.scheduling.listAdminSessions(organizationId(user));
  }

  @Post("admin/scheduling/sessions")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  create(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: Parameters<SchedulingService["createSession"]>[1],
  ) {
    return this.scheduling.createSession(organizationId(user), body);
  }

  @Patch("admin/scheduling/sessions/:id")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  update(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: Parameters<SchedulingService["updateSession"]>[2],
  ) {
    return this.scheduling.updateSession(organizationId(user), id, body);
  }

  @Post("admin/scheduling/sessions/:id/cancel")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  async cancel(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: { reason: string },
  ) {
    const activeOrganizationId = organizationId(user);
    const session = await this.scheduling.cancelSession(
      activeOrganizationId,
      id,
      body.reason,
    );
    if (session.programmeOfferingId) {
      await this.notifications
        .notifyOffering(
          activeOrganizationId,
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
  complete(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
  ) {
    return this.scheduling.completeSession(organizationId(user), id);
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
  attendance(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
  ) {
    return this.scheduling.listAttendance(organizationId(user), id);
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
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: Parameters<SchedulingService["markAttendance"]>[2],
  ) {
    return this.scheduling.markAttendance(organizationId(user), id, body);
  }
}
