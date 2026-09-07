import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Patch,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../database/prisma.service";
import {
  UpdateMembershipPlanActiveDto,
  UpdateProgrammeOfferingStatusDto,
} from "./academy-admin-mutations.dto";

const offeringStatuses = new Set(["DRAFT", "OPEN", "CLOSED", "INACTIVE"]);

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
export class AcademyAdminMutationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch("offerings/:offeringId/status")
  async updateOfferingStatus(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("offeringId") offeringId: string,
    @Body() body: UpdateProgrammeOfferingStatusDto,
  ) {
    const orgId = organizationId(user);
    if (!offeringStatuses.has(body?.status)) {
      throw new BadRequestException("status is invalid");
    }

    const offering = await this.prisma.client.programmeOffering.findFirst({
      where: { id: offeringId, organizationId: orgId },
      select: { id: true },
    });
    if (!offering) {
      throw new NotFoundException("Programme offering not found");
    }

    return this.prisma.client.programmeOffering.update({
      where: { id: offering.id },
      data: { status: body.status },
      select: { id: true, status: true },
    });
  }

  @Patch("membership-plans/:planId/active")
  async updateMembershipPlanActive(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("planId") planId: string,
    @Body() body: UpdateMembershipPlanActiveDto,
  ) {
    const orgId = organizationId(user);
    if (typeof body?.active !== "boolean") {
      throw new BadRequestException("active must be a boolean");
    }

    const plan = await this.prisma.client.membershipPlan.findFirst({
      where: { id: planId, organizationId: orgId },
      select: { id: true },
    });
    if (!plan) {
      throw new NotFoundException("Membership plan not found");
    }

    return this.prisma.client.membershipPlan.update({
      where: { id: plan.id },
      data: { active: body.active },
      select: { id: true, active: true },
    });
  }
}
