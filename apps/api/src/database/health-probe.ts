import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolClient } from "pg";
import { parseIntoClientConfig } from "pg-connection-string";
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
    // Parse first so URL timeout parameters cannot override probe bounds. All
    // credentials/TLS/host settings still use pg's own connection-string parser.
    ...parseIntoClientConfig(connectionString),
    max: 1,
    connectionTimeoutMillis: PROBE_PHASE_TIMEOUT_MS,
    query_timeout: PROBE_PHASE_TIMEOUT_MS,
    allowExitOnIdle: true,
  });
  const connections = new Set<PoolClient>();
  let closing = false;
  let stage: Stage = "connect";
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
    query: async () => {
      try {
        return await prisma.$queryRaw`SELECT 1`;
      } catch (error) {
        throw pool.connectionError ?? error;
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
): Promise<ProbeResult> {
  const started = performance.now();
  let stage: Stage = "configuration";
  let operation: ProbeOperation | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failure: ReturnType<typeof classifyProbeError> | undefined;
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
              PROBE_DEADLINE_MS,
            );
          }),
        ]);
      }
    }
  } catch (error) {
    stage = operation?.stage?.() ?? stage;
    failure = classifyProbeError(error);
  } finally {
    clearTimeout(timer);
    if (operation) {
      try {
        await operation.close();
      } catch (error) {
        if (!failure) {
          stage = "cleanup";
          failure = classifyProbeError(error);
        }
      }
    }
  }
  return {
    connected: !failure,
    durationMs: Math.max(0, Math.round(performance.now() - started)),
    stage,
    ...failure,
  };
}
