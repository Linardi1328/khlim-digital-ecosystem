import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminObservabilityService } from "./admin-observability.service";
import { AdminService } from "./admin.service";

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
  "EVENT_STAFF",
] as const;

const REPORT_ROLES = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
] as const;

@ApiTags("admin-access")
@ApiBearerAuth("supabase")
@RequireAnyRole(...STAFF_ROLES)
@Controller("admin")
export class AdminAccessController {
  constructor(
    private readonly admin: AdminService,
    private readonly observability: AdminObservabilityService,
  ) {}

  @Get("session")
  @ApiOperation({
    summary: "Resolve the current staff session and permissions",
  })
  getSession(@CurrentUser() actor: AuthenticatedUserContext) {
    return this.admin.getSession(actor);
  }

  @Get("overview")
  @RequireMfa()
  @ApiOperation({ summary: "Get the current academy operations overview" })
  getOverview(@CurrentUser() actor: AuthenticatedUserContext) {
    return this.admin.getOverview(actor);
  }

  @Get("reports/operations")
  @RequireAnyRole(...REPORT_ROLES)
  @RequireMfa()
  @ApiQuery({ name: "from", required: false, example: "2026-08-01" })
  @ApiQuery({ name: "to", required: false, example: "2026-08-30" })
  @ApiOperation({
    summary: "Get a bounded operational report from persisted academy data",
  })
  getOperationsReport(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.admin.getOperationsReport(actor, { from, to });
  }

  @Get("insights/operational-health")
  @RequireAnyRole(...REPORT_ROLES)
  @RequireMfa()
  @ApiOperation({
    summary:
      "Get current KPI and operational health signals from persisted data",
  })
  getOperationalHealth(@CurrentUser() actor: AuthenticatedUserContext) {
    return this.observability.getOperationalHealth(actor);
  }
}
