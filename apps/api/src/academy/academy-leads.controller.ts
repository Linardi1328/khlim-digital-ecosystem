import {
  Body,
  Controller,
  HttpException,
  Post,
  Req,
  Res,
} from "@nestjs/common";
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

/** Use Express's address resolution under the single runtime proxy policy. */
export function resolveClientIp(req: IncomingRequest): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
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
  async createLead(
    @Body() body: CreateAcademyLeadDto,
    @Req() req: IncomingRequest,
    @Res({ passthrough: true })
    response: { setHeader(name: string, value: string): void },
  ): Promise<CreateAcademyLeadResponseDto> {
    const clientIp = resolveClientIp(req);
    try {
      return await this.leadsService.createPublicLead(body, clientIp);
    } catch (error) {
      if (
        error instanceof HttpException &&
        [429, 503].includes(error.getStatus())
      ) {
        const payload = error.getResponse();
        if (
          typeof payload === "object" &&
          "retryAfter" in payload &&
          typeof payload.retryAfter === "number" &&
          Number.isInteger(payload.retryAfter) &&
          payload.retryAfter > 0
        ) {
          response.setHeader("Retry-After", String(payload.retryAfter));
        }
      }
      throw error;
    }
  }
}
