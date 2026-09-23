import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import {
  Public,
  RequireAnyRole,
  RequireMfa,
} from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { EditorialService, type EditorialInput } from "./editorial.service";

function organizationId(user: AuthenticatedUserContext): string {
  if (!user.organization?.id) {
    throw new ForbiddenException("Organization context is required");
  }
  return user.organization.id;
}

@ApiTags("editorial")
@Controller()
export class EditorialController {
  constructor(private readonly editorial: EditorialService) {}

  @Public()
  @Get("editorial/achievements")
  listAchievements() {
    return this.editorial.listPublished("ACHIEVEMENT");
  }

  @Public()
  @Get("editorial/player-spotlights")
  listSpotlights() {
    return this.editorial.listPublished("PLAYER_SPOTLIGHT");
  }

  @Public()
  @Get("editorial/player-spotlights/:slug")
  getSpotlight(@Param("slug") slug: string) {
    return this.editorial.findPublishedSpotlight(slug);
  }

  @Get("admin/editorial")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  listAdmin(@CurrentUser() user: AuthenticatedUserContext) {
    return this.editorial.listAdmin(organizationId(user));
  }

  @Get("admin/editorial/moderation")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT")
  @RequireMfa()
  @ApiOperation({
    summary: "List editorial content with management moderation readiness",
  })
  listModeration(@CurrentUser() user: AuthenticatedUserContext) {
    return this.editorial.listModeration(organizationId(user));
  }

  @Post("admin/editorial")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  create(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() input: EditorialInput,
  ) {
    return this.editorial.create(organizationId(user), input);
  }

  @Patch("admin/editorial/:id")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  update(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() input: Partial<EditorialInput>,
  ) {
    return this.editorial.update(organizationId(user), id, input);
  }

  @Post("admin/editorial/player-spotlights/draft")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  @ApiOperation({
    summary:
      "Generate an AI-assisted newsletter draft from staff-supplied facts",
  })
  draft(
    @Body() input: Parameters<EditorialService["generateSpotlightDraft"]>[0],
  ) {
    return this.editorial.generateSpotlightDraft(input);
  }

  @Post("admin/editorial/:id/publish")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT")
  @RequireMfa()
  @ApiOperation({
    summary: "Approve a verified editorial draft and publish it",
  })
  publish(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
  ) {
    return this.editorial.publish(organizationId(user), id);
  }

  @Post("admin/editorial/:id/unpublish")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT")
  @RequireMfa()
  @ApiOperation({
    summary: "Remove published editorial content from public view",
  })
  unpublish(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
  ) {
    return this.editorial.unpublish(organizationId(user), id);
  }
}
