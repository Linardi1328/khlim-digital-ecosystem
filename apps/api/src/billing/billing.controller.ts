import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import {
  Public,
  RequireAnyRole,
  RequireAthleteAccess,
  RequireMfa,
} from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { BillingService } from "./billing.service";
import { PrepareMembershipCheckoutDto } from "./billing.dto";

@ApiTags("billing")
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("athletes/:athleteId/memberships/:membershipId/billing")
  @ApiBearerAuth("supabase")
  @RequireAthleteAccess("read")
  getMembershipBilling(
    @Param("athleteId") athleteId: string,
    @Param("membershipId") membershipId: string,
  ) {
    return this.billing.getMembershipBilling(athleteId, membershipId);
  }

  @Post("athletes/:athleteId/memberships/:membershipId/checkout")
  @ApiBearerAuth("supabase")
  @RequireAthleteAccess("manage")
  @ApiOperation({
    summary: "Create a provider checkout for the first membership installment",
    description:
      "Prices are loaded from server-side plan data. A browser success redirect does not activate membership; verified provider events do.",
  })
  prepareCheckout(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("athleteId") athleteId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: PrepareMembershipCheckoutDto,
  ) {
    return this.billing.prepareMembershipCheckout(
      user.id,
      athleteId,
      membershipId,
      body,
    );
  }

  @Post("admin/billing/reconcile-stale-checkouts")
  @ApiBearerAuth("supabase")
  @RequireAnyRole("SUPER_ADMIN", "FINANCE_ADMIN", "MANAGEMENT")
  @RequireMfa()
  @ApiOperation({
    summary: "Expire abandoned checkout holds and release pending capacity",
  })
  reconcileStaleCheckouts() {
    return this.billing.reconcileStaleCheckoutHolds();
  }

  @Post("payments/webhooks/:provider")
  @Public()
  @ApiOperation({ summary: "Receive a signed payment-provider webhook" })
  handleWebhook(
    @Param("provider") provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req()
    request: {
      rawBody?: Buffer;
    },
  ) {
    if (!request.rawBody) {
      throw new BadRequestException("Raw webhook body is required");
    }
    return this.billing.processVerifiedWebhook(
      provider,
      headers,
      request.rawBody,
    );
  }
}
