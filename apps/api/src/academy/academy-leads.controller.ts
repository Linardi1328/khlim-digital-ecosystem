import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/authorization.decorators";
import {
  CreateAcademyLeadDto,
  CreateAcademyLeadResponseDto,
} from "./academy-leads.dto";
import { AcademyLeadsService } from "./academy-leads.service";

export interface IncomingRequest {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}

/**
 * Resolves caller IP adhering strictly to verified trusted proxy configuration.
 * Direct connections ignore caller-supplied x-forwarded-for to prevent spoofing.
 */
export function resolveClientIp(
  req: IncomingRequest,
  trustedProxy: boolean = Boolean(
    process.env.TRUST_PROXY === "true" ||
    process.env.TRUST_PROXY === "1" ||
    process.env.KHLIM_TRUST_PROXY === "true" ||
    (process.env.VERCEL === "1" && process.env.NODE_ENV === "production"),
  ),
): string {
  if (trustedProxy) {
    const rawForwardedFor = req.headers?.["x-forwarded-for"];
    const forwardedIp = Array.isArray(rawForwardedFor)
      ? rawForwardedFor[0]
      : typeof rawForwardedFor === "string"
        ? rawForwardedFor.split(",")[0]
        : undefined;
    const realIp =
      typeof req.headers?.["x-real-ip"] === "string"
        ? (req.headers["x-real-ip"] as string)
        : undefined;
    const candidate = forwardedIp?.trim() || realIp?.trim();
    if (candidate) return candidate;
  }

  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

@ApiTags("academy")
@Controller("academy/leads")
export class AcademyLeadsController {
  constructor(private readonly leadsService: AcademyLeadsService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: "Register interest in KHLIM Academy programmes without an account",
  })
  @ApiResponse({
    status: 201,
    type: CreateAcademyLeadResponseDto,
    description: "Lead successfully recorded",
  })
  createLead(
    @Body() body: CreateAcademyLeadDto,
    @Req() req: IncomingRequest,
  ): Promise<CreateAcademyLeadResponseDto> {
    const clientIp = resolveClientIp(req);
    return this.leadsService.createPublicLead(body, clientIp);
  }
}
