import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { UpdatePlatformSettingsDto } from "./admin.dto";
import { AdminGovernanceService } from "./admin-governance.service";

function organizationId(user: AuthenticatedUserContext): string {
  if (!user.organization?.id) {
    throw new ForbiddenException("Organization context is required");
  }
  return user.organization.id;
}

@ApiTags("admin-governance")
@ApiBearerAuth("supabase")
@RequireAnyRole("SUPER_ADMIN", "MANAGEMENT")
@RequireMfa()
@Controller("admin")
export class AdminGovernanceController {
  constructor(private readonly governance: AdminGovernanceService) {}

  @Get("audit")
  @ApiQuery({ name: "q", required: false })
  @ApiQuery({ name: "entityType", required: false })
  @ApiQuery({ name: "action", required: false })
  @ApiQuery({ name: "from", required: false, example: "2026-08-01" })
  @ApiQuery({ name: "to", required: false, example: "2026-08-31" })
  @ApiQuery({ name: "take", required: false, example: "50" })
  @ApiOperation({
    summary: "List immutable privileged audit events with bounded filters",
  })
  listAuditEvents(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Query("q") q?: string,
    @Query("entityType") entityType?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("take") take?: string,
  ) {
    return this.governance.listAuditEvents(organizationId(actor), {
      q,
      entityType,
      action,
      from,
      to,
      take,
    });
  }

  @Get("settings")
  @ApiOperation({
    summary: "Get persisted academy defaults and verified request boundaries",
  })
  getSettings(@CurrentUser() actor: AuthenticatedUserContext) {
    return this.governance.getSettings(organizationId(actor));
  }

  @Put("settings")
  @ApiOperation({
    summary: "Update persisted academy defaults and append an audit event",
  })
  updateSettings(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Body() body: UpdatePlatformSettingsDto,
  ) {
    return this.governance.updateSettings(organizationId(actor), actor, body);
  }
}
