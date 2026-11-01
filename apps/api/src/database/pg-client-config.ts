import { X509Certificate } from "node:crypto";
import type { PoolConfig } from "pg";
import { parseIntoClientConfig } from "pg-connection-string";
import { SUPABASE_ROOT_2021_CA_PEM } from "./supabase-root-2021-ca";

const STAGING_PROJECT = "qxsjxcbfhxbvxigghhlq";
const EXPECTED_CA_FINGERPRINT =
  "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";

/**
 * Parse credentials using the same pg parser as the existing Prisma adapter.
 * Only RIC-84's explicit staging-only opt-in supplies the Supabase root CA.
 *
 * URL sslmode settings must not override this pinned trust: parse the URL
 * first, then set a verified CA, hostname/SNI and rejectUnauthorized=true.
 * This configuration is shared by application Prisma and the isolated probe.
 */
export function pgClientConfigForApi(
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  const parsed = parseIntoClientConfig(connectionString);
  if (env.KHLIM_RIC84_SUPABASE_CA_2021 !== "1") return parsed;

  const url = new URL(connectionString);
  if (
    env.KHLIM_ENV === "production" ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname.endsWith(".pooler.supabase.com") ||
    url.port !== "6543" ||
    decodeURIComponent(url.username) !== `postgres.${STAGING_PROJECT}`
  ) {
    throw new Error("RIC-84 staging CA trust scope mismatch");
  }

  const root = new X509Certificate(SUPABASE_ROOT_2021_CA_PEM);
  if (
    !root.ca ||
    root.fingerprint256 !== EXPECTED_CA_FINGERPRINT ||
    Date.now() < Date.parse(root.validFrom) ||
    Date.now() >= Date.parse(root.validTo)
  ) {
    throw new Error("RIC-84 staging CA failed trust validation");
  }

  return {
    ...parsed,
    ssl: {
      ca: SUPABASE_ROOT_2021_CA_PEM,
      rejectUnauthorized: true,
      servername: url.hostname,
    },
  };
}
