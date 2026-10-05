import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/authorization.decorators";
import {
  CreateAcademyLeadDto,
  CreateAcademyLeadResponseDto,
} from "./academy-leads.dto";
import { AcademyLeadsService } from "./academy-leads.service";

interface IncomingRequest {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
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
    const rawForwardedFor = req.headers?.["x-forwarded-for"];
    const forwardedIp = Array.isArray(rawForwardedFor)
      ? rawForwardedFor[0]
      : typeof rawForwardedFor === "string"
        ? rawForwardedFor.split(",")[0]
        : undefined;
    const clientIp = forwardedIp?.trim() || req.ip || req.socket?.remoteAddress;

    return this.leadsService.createPublicLead(body, clientIp);
  }
}
