import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/authorization.decorators";

@ApiTags("system")
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        service: "khlim-api",
        status: "ok",
      },
    },
  })
  getHealth() {
    return {
      service: "khlim-api",
      status: "ok",
    } as const;
  }
}
