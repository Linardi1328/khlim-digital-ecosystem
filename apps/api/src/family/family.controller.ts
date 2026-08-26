import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import {
  RequireAnyRole,
  RequireAthleteAccess,
} from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { CreateManagedAthleteDto, UpdateAthleteDto } from "./family.dto";
import { FamilyService } from "./family.service";

@ApiTags("family")
@ApiBearerAuth("supabase")
@Controller()
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Get("me/athletes")
  @RequireAnyRole("GUARDIAN")
  @ApiOperation({ summary: "List athletes actively managed by the current guardian" })
  @ApiOkResponse({ description: "Active guardian-athlete relationships" })
  listManagedAthletes(@CurrentUser() user: AuthenticatedUserContext) {
    return this.family.listManagedAthletes(user.id);
  }

  @Post("me/athletes")
  @RequireAnyRole("GUARDIAN")
  @ApiOperation({ summary: "Create a managed athlete for the current guardian" })
  @ApiOkResponse({ description: "Managed athlete and active family link created" })
  createManagedAthlete(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: CreateManagedAthleteDto,
  ) {
    return this.family.createManagedAthlete(user.id, body);
  }

  @Get("athletes/:athleteId")
  @RequireAthleteAccess("read")
  @ApiOperation({ summary: "Get an athlete visible to the current account" })
  @ApiOkResponse({ description: "Authorized athlete profile" })
  getAthlete(@Param("athleteId") athleteId: string) {
    return this.family.getAthlete(athleteId);
  }

  @Patch("athletes/:athleteId")
  @RequireAthleteAccess("manage")
  @ApiOperation({ summary: "Update an athlete managed by the current account" })
  @ApiOkResponse({ description: "Athlete profile updated" })
  updateAthlete(
    @Param("athleteId") athleteId: string,
    @Body() body: UpdateAthleteDto,
  ) {
    return this.family.updateAthlete(athleteId, body);
  }

  @Delete("me/athletes/:athleteId/link")
  @RequireAnyRole("GUARDIAN")
  @ApiOperation({ summary: "Revoke the current guardian's athlete link" })
  @ApiOkResponse({ description: "Family link revoked" })
  revokeOwnFamilyLink(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("athleteId") athleteId: string,
  ) {
    return this.family.revokeOwnFamilyLink(user.id, athleteId);
  }
}
