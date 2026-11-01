import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolClient } from "pg";
import { pgClientConfigForApi } from "./pg-client-config";
import { PrismaClient } from "../generated/prisma/client";

export const PROBE_DEADLINE_MS = 2000;
export const PROBE_PHASE_TIMEOUT_MS = PROBE_DEADLINE_MS;

type Stage = "configuration" | "connect" | "query" | "cleanup";
export type ProbeResult = {
  connected: boolean;
  durationMs: number;
  stage: Stage;
  category?: string;
  code?: string;
  // Fixed enums only: never include raw driver text, URLs, hosts or credentials.
  diagnostic?: {
    origin: "pg_pool" | "prisma_adapter" | "unavailable";
    errorShape: "type_error" | "aggregate_error" | "error" | "opaque";
    connectionMode:
      | "supavisor_transaction"
      | "supavisor_session"
      | "supabase_direct"
      | "other";
    poolerUsername: "project_scoped" | "other" | "not_applicable";
    passwordPresent: boolean;
  };
};

// Values, messages, stacks, hostnames and arbitrary driver fields never enter logs.
const codes: Record<string, string> = {
  ENOTFOUND: "dns_failure",
  EAI_AGAIN: "dns_failure",
  ENETUNREACH: "network_unreachable",
  EHOSTUNREACH: "network_unreachable",
  ECONNRESET: "network_unreachable",
  ECONNREFUSED: "connection_refused",
  ETIMEDOUT: "probe_timeout",
  "28P01": "auth_rejected",
  "28000": "auth_rejected",
  "08001": "network_unreachable",
  "08006": "network_unreachable",
  "57014": "probe_timeout",
  "53300": "query_failure",
  "57P03": "query_failure",
  "3D000": "query_failure",
  CERT_HAS_EXPIRED: "tls_failure",
  DEPTH_ZERO_SELF_SIGNED_CERT: "tls_failure",
  SELF_SIGNED_CERT_IN_CHAIN: "tls_failure",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "tls_failure",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: "tls_failure",
  ERR_TLS_CERT_ALTNAME_INVALID: "tls_failure",
  KHLIM_PROBE_TIMEOUT: "probe_timeout",
  P1000: "auth_rejected",
  P1001: "network_unreachable",
  P1002: "probe_timeout",
  P1008: "probe_timeout",
  P1011: "tls_failure",
  P1013: "invalid_database_url",
  P1017: "network_unreachable",
  P2010: "query_failure",
  P2024: "probe_timeout",
  P2028: "query_failure",
};

function field(value: object, key: string): unknown {
  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

export function classifyProbeError(error: unknown): {
  category: string;
  code?: string;
} {
  const pending: unknown[] = [error];
  const visited = new Set<object>();
  let fallback: { category: string; code?: string } = { category: "unknown" };
  while (pending.length && visited.size < 32) {
    const value = pending.shift();
    if (!value || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    for (const key of ["code", "originalCode"]) {
      const code = field(value, key);
      if (typeof code === "string" && Object.hasOwn(codes, code)) {
        const classified = { category: codes[code]!, code };
        // Prefer a nested driver code to a generic Prisma query wrapper.
        if (!code.startsWith("P")) return classified;
        if (
          fallback.category === "unknown" ||
          fallback.category === "query_failure"
        )
          fallback = classified;
      }
    }
    const kind = field(value, "kind");
    const kinds: Record<string, string> = {
      TlsConnectionError: "tls_failure",
      DatabaseNotReachable: "network_unreachable",
      ConnectionClosed: "network_unreachable",
      SocketTimeout: "probe_timeout",
      AuthenticationFailed: "auth_rejected",
    };
    if (typeof kind === "string" && Object.hasOwn(kinds, kind))
      fallback = { category: kinds[kind]! };
    // pg has no stable code for these exact built-in timeout errors. Inspect
    // only to classify; never return the message or accept substring matches.
    if (
      [
        "timeout expired",
        "Connection terminated due to connection timeout",
        "Query read timeout",
      ].includes(field(value, "message") as string)
    )
      fallback = { category: "probe_timeout" };
    for (const key of [
      "cause",
      "meta",
      "driverAdapterError",
      "error",
      "errors",
    ]) {
      const nested = field(value, key);
      pending.push(...(Array.isArray(nested) ? nested.slice(0, 32) : [nested]));
    }
  }
  return fallback;
}

export interface ProbeOperation {
  query(): Promise<unknown>;
  close(): Promise<void>;
  stage?(): Stage;
  errorOrigin?(): "pg_pool" | "prisma_adapter";
}

// Report only an allowlisted structural fingerprint for otherwise unknown
// failures. Error names, messages, stack traces and driver fields stay private.
function unknownErrorShape(
  error: unknown,
): "type_error" | "aggregate_error" | "error" | "opaque" {
  if (error instanceof TypeError) return "type_error";
  if (error instanceof AggregateError) return "aggregate_error";
  if (error instanceof Error) return "error";
  return "opaque";
}

function connectionFingerprint(databaseUrl: string): {
  connectionMode: NonNullable<ProbeResult["diagnostic"]>["connectionMode"];
  poolerUsername: NonNullable<ProbeResult["diagnostic"]>["poolerUsername"];
  passwordPresent: boolean;
} {
  // Caller validated URL syntax. No parsed string component is ever returned.
  const url = new URL(databaseUrl);
  const isSharedPooler = url.hostname.endsWith(".pooler.supabase.com");
  const isDirect = /^db\.[a-z0-9]+\.supabase\.co$/.test(url.hostname);
  return {
    connectionMode: isSharedPooler
      ? url.port === "6543"
        ? "supavisor_transaction"
        : url.port === "5432"
          ? "supavisor_session"
          : "other"
      : isDirect
        ? "supabase_direct"
        : "other",
    poolerUsername: isSharedPooler
      ? /^postgres\.[a-z0-9]+$/.test(url.username)
        ? "project_scoped"
        : "other"
      : "not_applicable",
    passwordPresent: url.password.length > 0,
  };
}

// PrismaPg deliberately normalizes ENOTFOUND/ECONNREFUSED to the same kind.
// Capture failed acquisition before that conversion so DNS and refusal remain
// distinguishable. Keep the raw error only inside this short-lived probe.
class ProbePool extends Pool {
  connectionError: unknown;

  override connect(): Promise<PoolClient>;
  override connect(callback: Parameters<Pool["connect"]>[0]): void;
  override connect(
    callback?: Parameters<Pool["connect"]>[0],
  ): Promise<PoolClient> | void {
    if (callback) {
      return super.connect((error, client, release) => {
        if (error) this.connectionError = error;
        callback(error, client, release);
      });
    }
    return super.connect().catch((error: unknown) => {
      this.connectionError = error;
      throw error;
    });
  }
}

// Use the same Prisma -> PrismaPg -> pg path as application queries, but never
// disconnect the shared application client or impose probe limits on its work.
export function createProbeOperation(connectionString: string): ProbeOperation {
  const pool = new ProbePool({
    // Parse first so URL timeout parameters cannot override probe bounds.
    // The staging-only pinned CA also applies to this isolated probe.
    ...pgClientConfigForApi(connectionString),
    max: 1,
    connectionTimeoutMillis: PROBE_PHASE_TIMEOUT_MS,
    query_timeout: PROBE_PHASE_TIMEOUT_MS,
    allowExitOnIdle: true,
  });
  const connections = new Set<PoolClient>();
  let closing = false;
  let stage: Stage = "connect";
  let errorOrigin: "pg_pool" | "prisma_adapter" = "prisma_adapter";
  pool.on("acquire", () => {
    stage = "query";
  });
  pool.on("connect", (connection) => {
    connections.add(connection);
    if (closing) void connection.end();
  });
  // The per-probe pool can emit idle-client errors during teardown. The probe
  // rejection is classified by the caller; do not emit a second/raw error event.
  pool.on("error", () => {});
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    stage: () => stage,
    errorOrigin: () => errorOrigin,
    query: async () => {
      try {
        return await prisma.$queryRaw`SELECT 1`;
      } catch (error) {
        if (pool.connectionError !== undefined) {
          errorOrigin = "pg_pool";
          throw pool.connectionError;
        }
        throw error;
      }
    },
    async close() {
      closing = true;
      // pg Client.end destroys the socket when a query is active. A watchdog
      // timeout therefore terminates work rather than merely abandoning a race.
      await Promise.allSettled(
        [...connections].map((connection) => connection.end()),
      );
      try {
        await prisma.$disconnect();
      } finally {
        await pool.end();
      }
    },
  };
}

export async function probeDatabase(
  databaseUrl: string | undefined,
  createOperation = createProbeOperation,
  now = () => performance.now(),
): Promise<ProbeResult> {
  const started = now();
  let stage: Stage = "configuration";
  let operation: ProbeOperation | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failure: ReturnType<typeof classifyProbeError> | undefined;
  let diagnostic: ProbeResult["diagnostic"];
  try {
    if (!databaseUrl?.trim()) {
      failure = { category: "missing_database_url" };
    } else {
      let valid = false;
      try {
        const url = new URL(databaseUrl.trim());
        valid =
          ["postgres:", "postgresql:"].includes(url.protocol) && !!url.hostname;
      } catch {
        /* invalid configuration is deliberately not echoed */
      }
      if (!valid) {
        failure = { category: "invalid_database_url" };
      } else {
        operation = createOperation(databaseUrl.trim());
        stage = "query";
        await Promise.race([
          operation.query(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject({ code: "KHLIM_PROBE_TIMEOUT" }),
              Math.max(0, PROBE_DEADLINE_MS - (now() - started)),
            );
          }),
        ]);
      }
    }
  } catch (error) {
    stage = operation?.stage?.() ?? stage;
    failure = classifyProbeError(error);
    if (failure.category === "unknown" && databaseUrl?.trim()) {
      diagnostic = {
        origin: operation?.errorOrigin?.() ?? "unavailable",
        errorShape: unknownErrorShape(error),
        ...connectionFingerprint(databaseUrl.trim()),
      };
    }
  } finally {
    clearTimeout(timer);
    if (operation) {
      let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        // Initiate socket disposal even when the request budget has expired.
        // Pool bookkeeping must not hold the response open beyond that budget.
        const cleanup = operation.close();
        const remainingMs = Math.max(0, PROBE_DEADLINE_MS - (now() - started));
        if (!remainingMs) {
          void cleanup.catch(() => {});
          if (!failure) {
            stage = "cleanup";
            failure = {
              category: "probe_timeout",
              code: "KHLIM_PROBE_TIMEOUT",
            };
          }
        } else {
          await Promise.race([
            cleanup,
            new Promise<never>((_, reject) => {
              cleanupTimer = setTimeout(
                () => reject({ code: "KHLIM_PROBE_TIMEOUT" }),
                remainingMs,
              );
            }),
          ]);
        }
      } catch (error) {
        if (!failure) {
          stage = "cleanup";
          failure = classifyProbeError(error);
        }
      } finally {
        clearTimeout(cleanupTimer);
      }
    }
  }
  return {
    connected: !failure,
    durationMs: Math.max(0, Math.round(now() - started)),
    stage,
    ...failure,
    ...(failure?.category === "unknown" && diagnostic ? { diagnostic } : {}),
  };
}
