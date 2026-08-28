import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  Public,
  RequireAnyRole,
  RequireMfa,
} from "../auth/authorization.decorators";
import { EditorialService, type EditorialInput } from "./editorial.service";

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
  listAdmin() {
    return this.editorial.listAdmin();
  }

  @Post("admin/editorial")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  create(@Body() input: EditorialInput) {
    return this.editorial.create(input);
  }

  @Patch("admin/editorial/:id")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  update(@Param("id") id: string, @Body() input: Partial<EditorialInput>) {
    return this.editorial.update(id, input);
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
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  @RequireMfa()
  publish(@Param("id") id: string) {
    return this.editorial.publish(id);
  }

  @Post("admin/editorial/:id/unpublish")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN")
  @RequireMfa()
  unpublish(@Param("id") id: string) {
    return this.editorial.unpublish(id);
  }
}
