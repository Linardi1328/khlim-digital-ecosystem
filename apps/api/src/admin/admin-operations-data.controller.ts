import { Controller, ForbiddenException, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminOperationsDataService } from "./admin-operations-data.service";

const ACADEMY_MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
] as const;
const PLAYER_OPERATIONS_ROLES = [
  ...ACADEMY_MANAGEMENT_ROLES,
  "HEAD_COACH",
  "COACH",
] as const;
const SESSION_OPERATIONS_ROLES = [
  ...PLAYER_OPERATIONS_ROLES,
  "EVENT_STAFF",
] as const;
const FINANCE_ROLES = ["SUPER_ADMIN", "MANAGEMENT", "FINANCE_ADMIN"] as const;
const MANAGEMENT_ROLES = ["SUPER_ADMIN", "MANAGEMENT"] as const;

function organizationId(user: AuthenticatedUserContext): string {
  if (!user.organization?.id) {
    throw new ForbiddenException("Organization context is required");
  }
  return user.organization.id;
}

@ApiTags("admin-operations-data")
@ApiBearerAuth("supabase")
@RequireMfa()
@Controller("admin/operations-data")
export class AdminOperationsDataController {
  constructor(private readonly operations: AdminOperationsDataService) {}

  @Get("sports")
  @RequireAnyRole(...ACADEMY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: "List active sports for the current organization" })
  listSports(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listSports(organizationId(user));
  }

  @Get("programmes")
  @RequireAnyRole(...ACADEMY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: "List persisted programmes for the current organization" })
  listProgrammes(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listProgrammes(organizationId(user));
  }

  @Get("offerings")
  @RequireAnyRole(...ACADEMY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: "List persisted programme offerings for the current organization" })
  listOfferings(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listOfferings(organizationId(user));
  }

  @Get("membership-plans")
  @RequireAnyRole(...ACADEMY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: "List persisted membership plans for the current organization" })
  listMembershipPlans(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listMembershipPlans(organizationId(user));
  }

  @Get("memberships")
  @RequireAnyRole(...PLAYER_OPERATIONS_ROLES)
  @ApiOperation({ summary: "List persisted memberships for the current organization" })
  listMemberships(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listMemberships(organizationId(user));
  }

  @Get("athletes")
  @RequireAnyRole(...PLAYER_OPERATIONS_ROLES)
  @ApiOperation({ summary: "List athletes participating in the current organization" })
  listAthletes(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listAthletes(organizationId(user));
  }

  @Get("guardians")
  @RequireAnyRole(...PLAYER_OPERATIONS_ROLES)
  @ApiOperation({ summary: "List guardians linked to athletes in the current organization" })
  listGuardians(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listGuardians(organizationId(user));
  }

  @Get("payments")
  @RequireAnyRole(...FINANCE_ROLES)
  @ApiOperation({ summary: "List persisted payments for the current organization" })
  listPayments(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listPayments(organizationId(user));
  }

  @Get("venues")
  @RequireAnyRole(...ACADEMY_MANAGEMENT_ROLES)
  @ApiOperation({ summary: "List persisted venues for the current organization" })
  listVenues(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listVenues(organizationId(user));
  }

  @Get("sessions")
  @RequireAnyRole(...SESSION_OPERATIONS_ROLES)
  @ApiOperation({ summary: "List persisted training sessions for the current organization" })
  listSessions(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listSessions(organizationId(user));
  }

  @Get("staff")
  @RequireAnyRole(...MANAGEMENT_ROLES)
  @ApiOperation({ summary: "List staff memberships and assigned roles for the current organization" })
  listStaff(@CurrentUser() user: AuthenticatedUserContext) {
    return this.operations.listStaff(organizationId(user));
  }
}
