import { Controller, Get, Optional } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/authorization.decorators";
import { PrismaService } from "./database/prisma.service";

export function extractDatabaseProjectRef(databaseUrl?: string): string | null {
  if (!databaseUrl) return null;
  try {
    const parsed = new URL(databaseUrl);
    // 1. Direct Supabase db host: db.<ref>.supabase.co
    const hostMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (hostMatch) return hostMatch[1] ?? null;
    // 2. Supabase Pooler user: postgres.<ref>
    const userMatch = parsed.username.match(/^postgres\.([a-z0-9]+)$/);
    if (userMatch) return userMatch[1] ?? null;
    // 3. Supabase Pooler host: <ref>.pooler.supabase.com
    const poolerHostMatch = parsed.hostname.match(
      /^([a-z0-9]+)\.pooler\.supabase\.com$/,
    );
    if (poolerHostMatch) return poolerHostMatch[1] ?? null;
    return null;
  } catch {
    return null;
  }
}

@ApiTags("system")
@Controller("health")
export class HealthController {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  @Public()
  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        service: "khlim-api",
        status: "ok",
        database: {
          status: "connected",
          projectRef: "qxsjxcbfhxbvxigghhlq",
        },
      },
    },
  })
  async getHealth() {
    const isProduction = process.env.KHLIM_ENV === "production";
    const projectRef = isProduction
      ? null
      : extractDatabaseProjectRef(process.env.DATABASE_URL);
    let databaseStatus = "unconfigured";

    if (this.prisma) {
      try {
        let timer: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Database probe timeout")),
            2000,
          );
        });
        await Promise.race([
          this.prisma.client.$queryRaw`SELECT 1`.finally(() =>
            clearTimeout(timer),
          ),
          timeoutPromise,
        ]);
        databaseStatus = "connected";
      } catch {
        databaseStatus = "disconnected";
      }
    }

    const isHealthy =
      databaseStatus === "connected" ||
      (databaseStatus === "unconfigured" && !this.prisma);

    return {
      service: "khlim-api",
      status: isHealthy ? "ok" : "error",
      database: {
        status: databaseStatus,
        ...(projectRef ? { projectRef } : {}),
      },
    };
  }
}
