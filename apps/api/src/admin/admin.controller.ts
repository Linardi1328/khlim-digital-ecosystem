import { Body, Controller, Get, Param, Patch, Put } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import {
  RequireAnyRole,
  RequireMfa,
} from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminService } from "./admin.service";
import { UpdateAccountStatusDto, UpdateStaffRolesDto } from "./admin.dto";

@ApiTags("admin-identity")
@ApiBearerAuth("supabase")
@RequireAnyRole("SUPER_ADMIN", "MANAGEMENT")
@RequireMfa()
@Controller("admin/users")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get(":userId")
  @ApiOperation({ summary: "Get an account for identity administration" })
  getUser(@Param("userId") userId: string) {
    return this.admin.getUser(userId);
  }

  @Put(":userId/staff-roles")
  @ApiOperation({ summary: "Replace staff role assignments" })
  replaceStaffRoles(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Param("userId") userId: string,
    @Body() body: UpdateStaffRolesDto,
  ) {
    return this.admin.replaceStaffRoles(actor, userId, body);
  }

  @Patch(":userId/status")
  @ApiOperation({ summary: "Suspend, reactivate, or deactivate an account" })
  updateAccountStatus(
    @CurrentUser() actor: AuthenticatedUserContext,
    @Param("userId") userId: string,
    @Body() body: UpdateAccountStatusDto,
  ) {
    return this.admin.updateAccountStatus(actor, userId, body);
  }
}
