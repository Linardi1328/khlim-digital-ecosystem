import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { AcademyService } from "./academy.service";
import {
  CreateCourtDto,
  CreateMembershipPlanDto,
  CreateProgrammeDto,
  CreateProgrammeOfferingDto,
  CreateSportDto,
  CreateVenueDto,
  LinkPlanOfferingDto,
} from "./academy.dto";

function organizationId(user: AuthenticatedUserContext): string {
  if (!user.organization?.id) {
    throw new ForbiddenException("Organization context is required");
  }
  return user.organization.id;
}

@ApiTags("admin-academy")
@ApiBearerAuth("supabase")
@RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
@RequireMfa()
@Controller("admin/academy")
export class AcademyAdminController {
  constructor(private readonly academy: AcademyService) {}

  @Post("sports")
  @ApiOperation({ summary: "Create or activate a sport definition" })
  createSport(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: CreateSportDto,
  ) {
    return this.academy.createSport(organizationId(user), body);
  }

  @Post("venues")
  createVenue(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: CreateVenueDto,
  ) {
    return this.academy.createVenue(organizationId(user), body);
  }

  @Post("venues/:venueId/courts")
  createCourt(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("venueId") venueId: string,
    @Body() body: CreateCourtDto,
  ) {
    return this.academy.createCourt(organizationId(user), venueId, body);
  }

  @Post("programmes")
  createProgramme(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: CreateProgrammeDto,
  ) {
    return this.academy.createProgramme(organizationId(user), body);
  }

  @Post("offerings")
  createOffering(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: CreateProgrammeOfferingDto,
  ) {
    return this.academy.createOffering(organizationId(user), body);
  }

  @Post("membership-plans")
  createMembershipPlan(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: CreateMembershipPlanDto,
  ) {
    return this.academy.createMembershipPlan(organizationId(user), body);
  }

  @Post("membership-plan-offerings")
  linkPlanToOffering(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: LinkPlanOfferingDto,
  ) {
    return this.academy.linkPlanToOffering(organizationId(user), body);
  }
}
