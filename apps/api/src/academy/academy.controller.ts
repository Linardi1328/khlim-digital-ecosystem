import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { Public, RequireAthleteAccess } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { AcademyService } from "./academy.service";
import { CreatePendingMembershipDto } from "./academy.dto";

@ApiTags("academy")
@Controller()
export class AcademyController {
  constructor(private readonly academy: AcademyService) {}

  @Get("academy/offerings")
  @Public()
  @ApiOperation({
    summary: "List currently available programme offerings and plans",
  })
  listPublicOfferings() {
    return this.academy.listPublicOfferings();
  }

  @Get("athletes/:athleteId/memberships")
  @ApiBearerAuth("supabase")
  @RequireAthleteAccess("read")
  listAthleteMemberships(@Param("athleteId") athleteId: string) {
    return this.academy.listAthleteMemberships(athleteId);
  }

  @Post("athletes/:athleteId/memberships")
  @ApiBearerAuth("supabase")
  @RequireAthleteAccess("manage")
  createPendingMembership(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("athleteId") athleteId: string,
    @Body() body: CreatePendingMembershipDto,
  ) {
    return this.academy.createPendingMembership(user.id, athleteId, body);
  }
}
