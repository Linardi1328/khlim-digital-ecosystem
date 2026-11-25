import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../../auth/authenticated-user";
import {
  Public,
  RequireAnyRole,
  RequireMfa,
} from "../../auth/authorization.decorators";
import { CurrentUser } from "../../auth/current-user.decorator";
import {
  resolveClientIp,
  type IncomingRequest,
} from "../academy-leads.controller";
import {
  AdminRegistrationPolicyDto,
  AdminRegistrationPolicyListDto,
  AdminRegistrationSessionDto,
  AdminRegistrationSessionListDto,
  CreateRegistrationPolicyRequestDto,
  CreateRegistrationSessionRequestDto,
  UpdateRegistrationSessionRequestDto,
  CreateRegistrationRequestDto,
  PublicRegistrationSessionsDto,
  PublishRegistrationSessionRequestDto,
  RegistrationConfigDto,
  RegistrationDetailDto,
  RegistrationErrorDto,
  RegistrationListDto,
  RegistrationReceiptDto,
  RegistrationSearchRequestDto,
  RegistrationStatusChangeRequestDto,
  VersionRequestDto,
} from "./registration.dto";
import { RegistrationExceptionFilter } from "./registration.errors";
import { RegistrationAdminService } from "./registration-admin.service";
import { RegistrationPolicyService } from "./registration-policy.service";
import { RegistrationPublicService } from "./registration-public.service";
import { RegistrationSessionAdminService } from "./registration-session-admin.service";

function organizationId(user: AuthenticatedUserContext): string {
  if (!user.organization?.id) {
    throw new ForbiddenException("Organization context is required");
  }
  return user.organization.id;
}

interface StatusResponse {
  status(code: number): unknown;
}

@ApiTags("academy")
@UseFilters(RegistrationExceptionFilter)
@Controller("academy")
export class AcademyRegistrationPublicController {
  constructor(
    private readonly policies: RegistrationPolicyService,
    private readonly registrations: RegistrationPublicService,
  ) {}

  @Get("registration-config")
  @Public()
  @ApiOperation({
    summary:
      "Approved consent versions and form options; reports whether registration is open",
  })
  @ApiResponse({ status: 200, type: RegistrationConfigDto })
  getConfig() {
    return this.policies.getPublicConfig();
  }

  @Get("sessions")
  @Public()
  @ApiOperation({
    summary:
      "Published, open, not-full Academy sessions available for registration",
  })
  @ApiResponse({ status: 200, type: PublicRegistrationSessionsDto })
  listSessions() {
    return this.registrations.listSessions();
  }

  @Post("registrations")
  @Public()
  @ApiOperation({
    summary:
      "Submit a registration. A receipt means received and pending review; it never reserves a place.",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "22-128 URL-safe characters",
  })
  @ApiResponse({
    status: 201,
    type: RegistrationReceiptDto,
    description: "Created",
  })
  @ApiResponse({
    status: 200,
    type: RegistrationReceiptDto,
    description: "Identical retry; original receipt",
  })
  @ApiResponse({ status: 400, type: RegistrationErrorDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  @ApiResponse({ status: 422, type: RegistrationErrorDto })
  @ApiResponse({ status: 429, type: RegistrationErrorDto })
  @ApiResponse({ status: 503, type: RegistrationErrorDto })
  async create(
    @Body() body: CreateRegistrationRequestDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() req: IncomingRequest,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<RegistrationReceiptDto> {
    const result = await this.registrations.createRegistration(
      body,
      idempotencyKey,
      resolveClientIp(req),
    );
    if (result.replayed) response.status(200);
    return result.receipt;
  }
}

const STAFF = ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"] as const;

@ApiTags("admin-academy")
@ApiBearerAuth("supabase")
@RequireAnyRole(...STAFF)
@RequireMfa()
@UseFilters(RegistrationExceptionFilter)
@Controller("admin/academy/registrations")
export class AcademyRegistrationAdminController {
  constructor(private readonly admin: RegistrationAdminService) {}

  @Get()
  @ApiOperation({
    summary: "List registrations (no text search: use POST search)",
  })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "sessionId", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({ status: 200, type: RegistrationListDto })
  list(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query() query: Record<string, unknown>,
  ) {
    return this.admin.list(organizationId(user), query);
  }

  @Post("search")
  @ApiOperation({
    summary:
      "Search registrations by name, guardian phone or reference code (body, not URL)",
  })
  @ApiResponse({ status: 201, type: RegistrationListDto })
  search(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: RegistrationSearchRequestDto,
  ) {
    return this.admin.search(organizationId(user), body);
  }

  @Get(":id")
  @ApiOperation({ summary: "Registration detail (audited PII access)" })
  @ApiResponse({ status: 200, type: RegistrationDetailDto })
  detail(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
  ) {
    return this.admin.detail(organizationId(user), user, id);
  }

  @Patch(":id/status")
  @ApiOperation({
    summary: "Change registration status (server-enforced state machine)",
  })
  @ApiResponse({ status: 200, type: RegistrationDetailDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  changeStatus(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: RegistrationStatusChangeRequestDto,
  ) {
    return this.admin.changeStatus(organizationId(user), user, id, body);
  }
}

@ApiTags("admin-academy")
@ApiBearerAuth("supabase")
@RequireAnyRole(...STAFF)
@RequireMfa()
@UseFilters(RegistrationExceptionFilter)
@Controller("admin/academy/registration-sessions")
export class AcademyRegistrationSessionAdminController {
  constructor(private readonly sessions: RegistrationSessionAdminService) {}

  @Get()
  @ApiOperation({ summary: "List registration sessions with seat counts" })
  @ApiResponse({ status: 200, type: AdminRegistrationSessionListDto })
  @ApiResponse({ status: 200, type: AdminRegistrationSessionListDto })
  list(@CurrentUser() user: AuthenticatedUserContext) {
    return this.sessions.list(organizationId(user));
  }

  @Get(":id")
  @ApiOperation({ summary: "Registration session detail" })
  @ApiResponse({ status: 200, type: AdminRegistrationSessionDto })
  @ApiResponse({ status: 200, type: AdminRegistrationSessionDto })
  get(@CurrentUser() user: AuthenticatedUserContext, @Param("id") id: string) {
    return this.sessions.get(organizationId(user), id);
  }

  @Post()
  @ApiOperation({
    summary: "Create a draft session and its dedicated programme offering",
  })
  @ApiResponse({ status: 201, type: AdminRegistrationSessionDto })
  create(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: CreateRegistrationSessionRequestDto,
  ) {
    return this.sessions.create(organizationId(user), user, body);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Edit a session (compare-and-set on expectedVersion)",
  })
  @ApiResponse({ status: 200, type: AdminRegistrationSessionDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  patch(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: UpdateRegistrationSessionRequestDto,
  ) {
    return this.sessions.patch(organizationId(user), user, id, body);
  }

  @Post(":id/publish")
  @ApiOperation({
    summary:
      "Publish a complete session; records explicit schedule and age-rule approval",
  })
  @ApiResponse({ status: 201, type: AdminRegistrationSessionDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  publish(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: PublishRegistrationSessionRequestDto,
  ) {
    return this.sessions.publish(organizationId(user), user, id, body);
  }

  @Post(":id/close")
  @ApiOperation({ summary: "Close a published session" })
  @ApiResponse({ status: 201, type: AdminRegistrationSessionDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  @ApiResponse({ status: 201, type: AdminRegistrationSessionDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  close(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: VersionRequestDto,
  ) {
    return this.sessions.close(organizationId(user), user, id, body);
  }
}

@ApiTags("admin-academy")
@ApiBearerAuth("supabase")
@RequireAnyRole(...STAFF)
@RequireMfa()
@UseFilters(RegistrationExceptionFilter)
@Controller("admin/academy/registration-policies")
export class AcademyRegistrationPolicyAdminController {
  constructor(private readonly policies: RegistrationPolicyService) {}

  @Get()
  @ApiOperation({ summary: "List consent policy versions" })
  @ApiResponse({ status: 200, type: AdminRegistrationPolicyListDto })
  @ApiResponse({ status: 200, type: AdminRegistrationPolicyListDto })
  list(@CurrentUser() user: AuthenticatedUserContext) {
    return this.policies.list(organizationId(user));
  }

  @Post()
  @ApiOperation({
    summary:
      "Create a draft consent policy version (references and hashes only)",
  })
  @ApiResponse({ status: 201, type: AdminRegistrationPolicyDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  create(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() body: CreateRegistrationPolicyRequestDto,
  ) {
    return this.policies.create(organizationId(user), user, body);
  }

  @Post(":id/approve")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT")
  @ApiOperation({
    summary: "Approve a draft policy; approver is the authenticated user",
  })
  @ApiResponse({ status: 201, type: AdminRegistrationPolicyDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  approve(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: VersionRequestDto,
  ) {
    return this.policies.approve(organizationId(user), user, id, body);
  }

  @Post(":id/retire")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT")
  @ApiOperation({
    summary: "Retire a policy (closes registration if it was current)",
  })
  @ApiResponse({ status: 201, type: AdminRegistrationPolicyDto })
  @ApiResponse({ status: 409, type: RegistrationErrorDto })
  retire(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param("id") id: string,
    @Body() body: VersionRequestDto,
  ) {
    return this.policies.retire(organizationId(user), user, id, body);
  }
}
