import { Body, Controller, Get, Patch, Put } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AllowAuthenticated } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { IdentityService } from "./identity.service";
import { UpdatePreferencesDto, UpsertGuardianProfileDto } from "./identity.dto";

@ApiTags("account")
@ApiBearerAuth("supabase")
@AllowAuthenticated()
@Controller("me")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get()
  @ApiOperation({ summary: "Get the current KHLIM account" })
  @ApiOkResponse({ description: "Current account and profile state" })
  getMe(@CurrentUser() user: AuthenticatedUserContext) {
    return this.identity.getAccount(user.id);
  }

  @Put("guardian-profile")
  @ApiOperation({ summary: "Create or update the current guardian profile" })
  @ApiOkResponse({ description: "Guardian profile saved" })
  upsertGuardianProfile(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: UpsertGuardianProfileDto,
  ) {
    return this.identity.upsertGuardianProfile(user.id, body);
  }

  @Patch("preferences")
  @ApiOperation({ summary: "Update current account preferences" })
  @ApiOkResponse({ description: "Account preferences updated" })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: UpdatePreferencesDto,
  ) {
    return this.identity.updatePreferences(user.id, body);
  }
}
