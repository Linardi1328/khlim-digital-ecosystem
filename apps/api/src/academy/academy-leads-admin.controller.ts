import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  AcademyLeadItemDto,
  AcademyLeadListResponseDto,
  AcademyLeadQueryDto,
  AcademyLeadSummaryResponseDto,
  UpdateAcademyLeadDto,
} from "./academy-leads.dto";
import { AcademyLeadsService } from "./academy-leads.service";

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
@Controller("admin/academy/leads")
export class AcademyLeadsAdminController {
  constructor(private readonly leadsService: AcademyLeadsService) {}

  @Get()
  @ApiOperation({
    summary:
      "List tenant Academy interest leads with bounded pagination, newest-first ordering, and filters",
  })
  @ApiResponse({
    status: 200,
    type: AcademyLeadListResponseDto,
  })
  listLeads(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query() query: AcademyLeadQueryDto,
  ): Promise<AcademyLeadListResponseDto> {
    return this.leadsService.listAdminLeads(organizationId(user), query);
  }

  @Get("summary")
  @ApiOperation({
    summary:
      "Get role-gated counts for new leads and leads requiring operator follow-up",
  })
  @ApiResponse({
    status: 200,
    type: AcademyLeadSummaryResponseDto,
  })
  getSummary(
    @CurrentUser() user: AuthenticatedUserContext,
  ): Promise<AcademyLeadSummaryResponseDto> {
    return this.leadsService.getAdminLeadSummary(organizationId(user));
  }

  @Get(":id")
  @ApiOperation({
    summary: "Retrieve tenant-scoped Academy lead detail",
  })
  @ApiResponse({
    status: 200,
    type: AcademyLeadItemDto,
  })
  getLeadDetail(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
  ): Promise<AcademyLeadItemDto> {
    return this.leadsService.getAdminLeadDetail(organizationId(user), id);
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Update lead status and operational notes with concurrency detection",
  })
  @ApiResponse({
    status: 200,
    type: AcademyLeadItemDto,
  })
  updateLead(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: UpdateAcademyLeadDto,
  ): Promise<AcademyLeadItemDto> {
    return this.leadsService.updateAdminLead(
      organizationId(user),
      id,
      user,
      body,
    );
  }
}
