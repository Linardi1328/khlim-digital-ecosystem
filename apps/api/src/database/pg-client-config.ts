import { X509Certificate } from "node:crypto";
import type { PoolConfig } from "pg";
import { parseIntoClientConfig } from "pg-connection-string";
import { SUPABASE_ROOT_2021_CA_PEM } from "./supabase-root-2021-ca";

const STAGING_PROJECT = "qxsjxcbfhxbvxigghhlq";
const STAGING_POOLER = "aws-0-ap-southeast-1.pooler.supabase.com";
const STAGING_POOLER_PORT = 6543;
const STAGING_POOLER_USER = `postgres.${STAGING_PROJECT}`;
const EXPECTED_CA_FINGERPRINT =
  "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";

export function requiresPreviewDatabaseIsolation(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const target = env.VERCEL_ENV;
  if (target === "production" || target === "development") return false;
  return target !== undefined || env.VERCEL === "1";
}

function configurationError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function parseApprovedStagingConfig(
  connectionString: string,
): PoolConfig | undefined {
  if (/\s|%(?![0-9a-f]{2})/i.test(connectionString)) return undefined;

  try {
    const url = new URL(connectionString);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== STAGING_POOLER ||
      url.port !== String(STAGING_POOLER_PORT) ||
      url.pathname !== "/postgres" ||
      url.hash
    ) {
      return undefined;
    }

    // Node-postgres accepts query keys as config properties, including
    // connectionString itself. Allow only the existing secure SSL modes,
    // then supply verification explicitly so pg cannot reparse an override.
    const sslModes = url.searchParams.getAll("sslmode");
    if (
      [...url.searchParams.keys()].some((key) => key !== "sslmode") ||
      sslModes.length > 1 ||
      (sslModes.length === 1 &&
        !["require", "verify-full"].includes(sslModes[0]!))
    ) {
      return undefined;
    }
    url.search = "";

    const parsed = parseIntoClientConfig(url.href);
    if (
      parsed.host !== STAGING_POOLER ||
      parsed.port !== STAGING_POOLER_PORT ||
      parsed.user !== STAGING_POOLER_USER ||
      parsed.database !== "postgres" ||
      !parsed.password
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    // Parser errors can include URL input, credentials or file paths.
    return undefined;
  }
}

// Shared by application Prisma and the isolated health probe.
export function pgClientConfigForApi(
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  const caFlag = env.KHLIM_RIC84_SUPABASE_CA_2021;
  const pinned = caFlag === "1";
  const preview = requiresPreviewDatabaseIsolation(env);
  if (!preview && !pinned) return parseIntoClientConfig(connectionString);

  if (
    (pinned &&
      (env.VERCEL_ENV === "production" || env.KHLIM_ENV === "production")) ||
    (preview && caFlag !== undefined && caFlag !== "0" && !pinned)
  ) {
    throw configurationError(
      "KHLIM_STAGING_CA_SCOPE",
      "RIC-84 staging CA trust scope mismatch",
    );
  }

  const parsed = parseApprovedStagingConfig(connectionString);
  if (!parsed) {
    throw configurationError(
      "KHLIM_PREVIEW_DB_REJECTED",
      "Database configuration does not match the approved staging endpoint",
    );
  }

  const ssl = { rejectUnauthorized: true, servername: STAGING_POOLER };
  if (!pinned) return { ...parsed, ssl };

  const root = new X509Certificate(SUPABASE_ROOT_2021_CA_PEM);
  if (
    !root.ca ||
    root.fingerprint256 !== EXPECTED_CA_FINGERPRINT ||
    Date.now() < Date.parse(root.validFrom) ||
    Date.now() >= Date.parse(root.validTo)
  ) {
    throw configurationError(
      "KHLIM_STAGING_CA_INVALID",
      "RIC-84 staging CA failed trust validation",
    );
  }

  return {
    ...parsed,
    ssl: { ...ssl, ca: SUPABASE_ROOT_2021_CA_PEM },
  };
}
