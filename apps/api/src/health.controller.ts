import { Controller, Get, Optional } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/authorization.decorators";
import { PrismaService } from "./database/prisma.service";

function databaseProbeFailure(error: unknown): {
  category: string;
  codes: string[];
  tlsDetail: string | null;
} {
  const fragments: string[] = [];
  const codes: string[] = [];
  let current: unknown = error;

  for (
    let depth = 0;
    depth < 4 && current && typeof current === "object";
    depth++
  ) {
    const detail = current as Record<string, unknown>;
    if (
      typeof detail.code === "string" &&
      /^(?:[0-9A-Z_]{2,40})$/.test(detail.code)
    ) {
      codes.push(detail.code);
      fragments.push(detail.code);
    }
    if (typeof detail.message === "string") fragments.push(detail.message);
    current = detail.cause ?? detail.meta ?? detail.driverAdapterError;
  }

  const diagnostic = fragments.join(" ");
  const category = /Staging database pooler configuration is invalid/.test(
    diagnostic,
  )
    ? "configuration"
    : /Database probe timeout/.test(diagnostic)
      ? "probe_timeout"
      : /28P01|password authentication failed|invalid.*credential/i.test(
            diagnostic,
          )
        ? "authentication"
        : /certificate|self.signed|CERT_|UNABLE_TO_VERIFY|TLS|SSL/i.test(
              diagnostic,
            )
          ? "tls"
          : /ENOTFOUND|EAI_AGAIN|getaddrinfo|DNS/i.test(diagnostic)
            ? "dns"
            : /pool|too many connections|remaining connection slots/i.test(
                  diagnostic,
                )
              ? "pool"
              : /ECONNREFUSED|ECONNRESET|ETIMEDOUT|P1001|network/i.test(
                    diagnostic,
                  )
                ? "network"
                : "other";

  const tlsDetail = /ALTNAME|hostname.*(match|verify)|host.*certificate/i.test(
    diagnostic,
  )
    ? "hostname_mismatch"
    : /SELF_SIGNED/i.test(diagnostic)
      ? "self_signed"
      : /UNABLE_TO_VERIFY|LOCAL_ISSUER|unable to get local issuer|certificate chain/i.test(
            diagnostic,
          )
        ? "untrusted_chain"
        : /CERT_HAS_EXPIRED|certificate.*expired/i.test(diagnostic)
          ? "expired_certificate"
          : /handshake|wrong version|protocol/i.test(diagnostic)
            ? "handshake_or_protocol"
            : /SSL SYSCALL|connection.*(closed|reset)/i.test(diagnostic)
              ? "connection_closed"
              : category === "tls"
                ? "other_tls"
                : null;

  return { category, codes: codes.slice(0, 4), tlsDetail };
}

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
    let databaseStatus = "unconfigured";

    if (this.prisma) {
      const startedAt = Date.now();
      let phase = "client";
      let timer: NodeJS.Timeout | undefined;
      let timedOut = false;
      try {
        const client = this.prisma.client;
        phase = "query";
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(new Error("Database probe timeout"));
          }, 2000);
        });
        const query = client.$queryRaw`SELECT 1`;
        void query.then(
          () => {
            if (timedOut && process.env.KHLIM_ENV === "staging") {
              console.error(
                JSON.stringify({
                  event: "staging.database_probe.late_success",
                  elapsedMs: Math.min(Date.now() - startedAt, 60000),
                }),
              );
            }
          },
          (error: unknown) => {
            if (timedOut && process.env.KHLIM_ENV === "staging") {
              console.error(
                JSON.stringify({
                  event: "staging.database_probe.late_failure",
                  elapsedMs: Math.min(Date.now() - startedAt, 60000),
                  ...databaseProbeFailure(error),
                }),
              );
            }
          },
        );
        await Promise.race([query, timeoutPromise]);
        databaseStatus = "connected";
      } catch (error) {
        if (process.env.KHLIM_ENV === "staging") {
          const failure = databaseProbeFailure(error);
          console.error(
            JSON.stringify({
              event: "staging.database_probe.failed",
              phase,
              elapsedMs: Math.min(Date.now() - startedAt, 60000),
              ...failure,
            }),
          );
        }
        databaseStatus = "disconnected";
      } finally {
        if (timer) clearTimeout(timer);
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
