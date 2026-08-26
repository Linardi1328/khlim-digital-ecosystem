import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import {
  AllowAuthenticated,
  RequireAnyRole,
  RequireAthleteAccess,
} from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  AcceptGuardianInvitationDto,
  CreateGuardianInvitationDto,
  CreateManagedAthleteDto,
  UpdateAthleteDto,
} from "./family.dto";
import { FamilyService } from "./family.service";

@ApiTags("family")
@ApiBearerAuth("supabase")
@Controller()
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Get("me/athletes")
  @RequireAnyRole("GUARDIAN")
  @ApiOperation({
    summary: "List athletes actively managed by the current guardian",
  })
  @ApiOkResponse({ description: "Active guardian-athlete relationships" })
  listManagedAthletes(@CurrentUser() user: AuthenticatedUserContext) {
    return this.family.listManagedAthletes(user.id);
  }

  @Post("me/athletes")
  @RequireAnyRole("GUARDIAN")
  @ApiOperation({
    summary: "Create a managed athlete for the current guardian",
  })
  @ApiOkResponse({
    description: "Managed athlete and active family link created",
  })
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

  @Post("me/athletes/:athleteId/guardian-invitations")
  @RequireAthleteAccess("manage")
  @ApiOperation({ summary: "Invite another guardian to manage an athlete" })
  createGuardianInvitation(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("athleteId") athleteId: string,
    @Body() body: CreateGuardianInvitationDto,
  ) {
    return this.family.createGuardianInvitation(user.id, athleteId, body);
  }

  @Delete("me/athletes/:athleteId/guardian-invitations/:invitationId")
  @RequireAthleteAccess("manage")
  @ApiOperation({ summary: "Revoke a pending guardian invitation" })
  revokeGuardianInvitation(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("athleteId") athleteId: string,
    @Param("invitationId") invitationId: string,
  ) {
    return this.family.revokeGuardianInvitation(
      user.id,
      athleteId,
      invitationId,
    );
  }

  @Post("family-invitations/accept")
  @AllowAuthenticated()
  @ApiOperation({ summary: "Accept a guardian invitation" })
  acceptGuardianInvitation(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: AcceptGuardianInvitationDto,
  ) {
    return this.family.acceptGuardianInvitation(user, body);
  }
}
