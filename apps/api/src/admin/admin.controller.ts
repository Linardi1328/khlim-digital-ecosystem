import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
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
import { AdminOrganizationAccessService } from "./admin-organization-access.service";
import { UpdateAccountStatusDto, UpdateStaffRolesDto } from "./admin.dto";

function organizationId(user: AuthenticatedUserContext): string {
  if (!user.organization?.id) {
    throw new ForbiddenException("Organization context is required");
  }
  return user.organization.id;
}

@ApiTags("admin-identity")
@ApiBearerAuth("supabase")
@RequireAnyRole("SUPER_ADMIN", "MANAGEMENT")
@RequireMfa()
@Controller("admin/users")
export class AdminController {
  constructor(private readonly access: AdminOrganizationAccessService) {}

  @Get()
  @ApiOperation({ summary: "List members for organization access administration" })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "role", required: false, type: String })
  @ApiQuery({ name: "take", required: false, type: String })
  listUsers(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("role") role?: string,
    @Query("take") take?: string,
  ) {
    return this.access.listUsers(organizationId(actor), {
      q,
      status,
      role,
      take,
    });
  }

  @Get(":userId")
  @ApiOperation({ summary: "Get a member for organization access administration" })
  getUser(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Param("userId") userId: string,
  ) {
    return this.access.getUser(organizationId(actor), userId);
  }

  @Put(":userId/staff-roles")
  @ApiOperation({ summary: "Replace organization staff role assignments" })
  replaceStaffRoles(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Param("userId") userId: string,
    @Body() body: UpdateStaffRolesDto,
  ) {
    return this.access.replaceStaffRoles(
      organizationId(actor),
      actor,
      userId,
      body,
    );
  }

  @Patch(":userId/status")
  @ApiOperation({
    summary: "Suspend, reactivate, or deactivate organization access",
  })
  updateAccountStatus(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Param("userId") userId: string,
    @Body() body: UpdateAccountStatusDto,
  ) {
    return this.access.updateMembershipStatus(
      organizationId(actor),
      actor,
      userId,
      body,
    );
  }
}
