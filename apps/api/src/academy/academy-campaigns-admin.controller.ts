import {
  Controller,
  ForbiddenException,
  Get,
  Param,
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
  CampaignAnalyticsQueryDto,
  CampaignAnalyticsResponseDto,
} from "./academy-campaigns.dto";
import { AcademyCampaignsService } from "./academy-campaigns.service";

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
@Controller("admin/academy/campaigns")
export class AcademyCampaignsAdminController {
  constructor(private readonly campaignsService: AcademyCampaignsService) {}

  @Get("analytics")
  @ApiOperation({
    summary:
      "Get role-gated, authoritative campaign conversion metrics and PostHog traffic aggregates",
  })
  @ApiResponse({
    status: 200,
    type: CampaignAnalyticsResponseDto,
  })
  getCampaignAnalytics(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query() query: CampaignAnalyticsQueryDto,
  ): Promise<CampaignAnalyticsResponseDto> {
    return this.campaignsService.getCampaignAnalytics(
      organizationId(user),
      query,
    );
  }

  @Get(":campaignKey/analytics")
  @ApiOperation({
    summary:
      "Get role-gated, authoritative campaign conversion metrics for a specific campaign key",
  })
  @ApiResponse({
    status: 200,
    type: CampaignAnalyticsResponseDto,
  })
  getSpecificCampaignAnalytics(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("campaignKey") campaignKey: string,
    @Query() query: CampaignAnalyticsQueryDto,
  ): Promise<CampaignAnalyticsResponseDto> {
    const mergedQuery: CampaignAnalyticsQueryDto = {
      ...query,
      campaign: campaignKey,
    };
    return this.campaignsService.getCampaignAnalytics(
      organizationId(user),
      mergedQuery,
    );
  }
}
