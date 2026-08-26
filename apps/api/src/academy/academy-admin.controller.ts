import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
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

@ApiTags("admin-academy")
@ApiBearerAuth("supabase")
@RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
@RequireMfa()
@Controller("admin/academy")
export class AcademyAdminController {
  constructor(private readonly academy: AcademyService) {}

  @Post("sports")
  @ApiOperation({ summary: "Create a sport definition" })
  createSport(@Body() body: CreateSportDto) {
    return this.academy.createSport(body);
  }

  @Post("venues")
  createVenue(@Body() body: CreateVenueDto) {
    return this.academy.createVenue(body);
  }

  @Post("venues/:venueId/courts")
  createCourt(@Param("venueId") venueId: string, @Body() body: CreateCourtDto) {
    return this.academy.createCourt(venueId, body);
  }

  @Post("programmes")
  createProgramme(@Body() body: CreateProgrammeDto) {
    return this.academy.createProgramme(body);
  }

  @Post("offerings")
  createOffering(@Body() body: CreateProgrammeOfferingDto) {
    return this.academy.createOffering(body);
  }

  @Post("membership-plans")
  createMembershipPlan(@Body() body: CreateMembershipPlanDto) {
    return this.academy.createMembershipPlan(body);
  }

  @Post("membership-plan-offerings")
  linkPlanToOffering(@Body() body: LinkPlanOfferingDto) {
    return this.academy.linkPlanToOffering(body);
  }
}
