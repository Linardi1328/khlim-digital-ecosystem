import { Controller, Get, Optional } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/authorization.decorators";
import { PrismaService } from "./database/prisma.service";
import type { ProbeResult } from "./database/health-probe";

export function extractDatabaseProjectRef(databaseUrl?: string): string | null {
  if (!databaseUrl) return null;
  try {
    const parsed = new URL(databaseUrl);
    // 1. Direct Supabase db host: db.<ref>.supabase.co
    const hostMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (hostMatch) return hostMatch[1] ?? null;
    // 2. Supabase Pooler user: postgres.<ref> (only valid on Supabase pooler host)
    const isPoolerHost = parsed.hostname.endsWith(".pooler.supabase.com");
    const userMatch = parsed.username.match(/^postgres\.([a-z0-9]+)$/);
    if (userMatch && isPoolerHost) return userMatch[1] ?? null;
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
    const probe: ProbeResult = this.prisma
      ? await this.prisma.probe()
      : {
          connected: false,
          durationMs: 0,
          stage: "configuration",
          category: "missing_database_support",
        };
    if (!probe.connected) {
      process.stderr.write(
        `${JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          service: "khlim-api",
          event: "database.health_probe.failed",
          durationMs: probe.durationMs,
          stage: probe.stage,
          category: probe.category,
          ...(probe.code ? { code: probe.code } : {}),
        })}\n`,
      );
    }
    const databaseStatus = !this.prisma
      ? "unconfigured"
      : probe.connected
        ? "connected"
        : "disconnected";

    return {
      service: "khlim-api",
      status: probe.connected ? "ok" : "error",
      database: {
        status: databaseStatus,
        ...(projectRef ? { projectRef } : {}),
      },
    };
  }
}
