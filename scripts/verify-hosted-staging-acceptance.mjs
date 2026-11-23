#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { randomUUID, X509Certificate } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

export const STAGING_SUPABASE_PROJECT_ID = "qxsjxcbfhxbvxigghhlq";
export const DEDICATED_STAGING_BRANCH = "staging/ric-119-120-readonly-20261124";
export const STAGING_VERCEL_TEAM_ID = "team_q0IpWVrUePVFelvMGwl3oCdL";
export const STAGING_VERCEL_API_PROJECT_ID = "prj_LnY8hI0PLYuiUI8sOPPKiZsYksgO";

// Inert test fixture used ONLY for unit tests and local mock rehearsals.
// For live active-window execution, an actual operator-controlled test phone
// must be securely provisioned via KHLIM_STAGING_TEST_PHONE and KHLIM_STAGING_APPROVED_TEST_PHONE.
export const SYNTHETIC_FIXTURE_TEST_PHONE = "+60120000000";
export const APPROVED_STAGING_TEST_PHONE = SYNTHETIC_FIXTURE_TEST_PHONE;

export const REQUIRED_STAGING_ENV_VARS = [
  "KHLIM_STAGING_API_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

export const STAGING_VERCEL_WEB_PROJECT_ID = "prj_KORdDwpoWgLROuGhByQOATU7s1kK";
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const FULL_GIT_SHA = /^[0-9a-f]{40}$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/;
const VERCEL_HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/;

export function createValidationCases(testPhone) {
  return [
    {
      label: "Missing guardian consent",
      payload: {
        guardianName: "Synthetic Parent Valid",
        email: "valid@synthetic.khlim.test",
        phone: testPhone,
        childAge: 10,
        consent: false,
        source: "3x3-oct24",
      },
      expectedStatus: 400,
    },
    {
      label: "SQL injection attempt in email address",
      payload: {
        guardianName: "Synthetic Parent Valid",
        email: "parent' OR '1'='1@synthetic.khlim.test",
        phone: testPhone,
        childAge: 10,
        consent: true,
        source: "3x3-oct24",
      },
      expectedStatus: 400,
    },
    {
      label: "Non-standard invalid phone format",
      payload: {
        guardianName: "Synthetic Parent Valid",
        email: "valid@synthetic.khlim.test",
        phone: "+1-555-NOT-MY-PHONE",
        childAge: 10,
        consent: true,
        source: "3x3-oct24",
      },
      expectedStatus: 400,
    },
    {
      label: "Child age outside acceptable youth development bounds (99)",
      payload: {
        guardianName: "Synthetic Parent Valid",
        email: "valid@synthetic.khlim.test",
        phone: testPhone,
        childAge: 99,
        consent: true,
        source: "3x3-oct24",
      },
      expectedStatus: 400,
    },
    {
      label: "Malformed UUID in programme offering parameter",
      payload: {
        guardianName: "Synthetic Parent Valid",
        email: "valid@synthetic.khlim.test",
        phone: testPhone,
        childAge: 10,
        consent: true,
        source: "3x3-oct24",
        programmeOfferingId: "not-a-valid-uuid'--injection",
      },
      expectedStatus: 400,
    },
  ];
}

export const NON_DESTRUCTIVE_VALIDATION_CASES = createValidationCases(
  APPROVED_STAGING_TEST_PHONE,
);

export function sanitizeErrorMessage(error) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error) || String(error);
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[database-url-redacted]")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [redacted]")
    .replace(
      /ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]*/g,
      "[jwt-redacted]",
    )
    .replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "[email-redacted]",
    )
    .replace(/\+?60\d{8,10}/g, "[phone-redacted]")
    .replace(
      /(password|secret|token|apikey|key|bypass)[:=]\s*[^&\s,]+/gi,
      "$1=[redacted]",
    );
}

export function stagingDatabaseConfig(databaseUrl) {
  // PGOPTIONS is inherited by pg clients and can add unauthorized startup
  // parameters even when the URL itself is allowlisted.
  if (process.env.PGOPTIONS?.trim()) {
    throw new Error(
      "DATABASE_CONFIGURATION_REJECTED: PGOPTIONS must be unset for hosted staging acceptance",
    );
  }
  const invalid = new Error(
    "DATABASE_CONFIGURATION_REJECTED: Use a PostgreSQL /postgres URL with no query parameters except one sslmode=require or sslmode=verify-full",
  );
  if (
    typeof databaseUrl !== "string" ||
    !/^postgres(?:ql)?:\/\/[^/?#]+\/postgres(?:\?[^#]*)?$/.test(databaseUrl) ||
    /[\s\u0000-\u001f\u007f]|%(?![0-9a-f]{2})/i.test(databaseUrl)
  ) {
    throw invalid;
  }

  let url;
  let user;
  let password;
  try {
    url = new URL(databaseUrl);
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    throw invalid;
  }

  const params = [...url.searchParams];
  if (
    params.length > 1 ||
    params.some(
      ([key, value]) =>
        key !== "sslmode" || !["require", "verify-full"].includes(value),
    )
  ) {
    throw invalid;
  }

  const host = url.hostname.toLowerCase();
  const port = Number(url.port || "5432");
  const stagingPoolerUser = `postgres.${STAGING_SUPABASE_PROJECT_ID}`;
  const direct =
    host === `db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co` &&
    user === "postgres" &&
    port === 5432;
  const projectPooler =
    host === `${STAGING_SUPABASE_PROJECT_ID}.pooler.supabase.com` &&
    (user === "postgres" || user === stagingPoolerUser);
  const sharedPooler =
    /^aws-\d+-[a-z]+(?:-[a-z]+)+-\d+\.pooler\.supabase\.com$/.test(host) &&
    user === stagingPoolerUser;
  if (
    !direct &&
    !((projectPooler || sharedPooler) && [5432, 6543].includes(port))
  ) {
    throw new Error(
      `DATABASE_IDENTITY_MISMATCH: An approved database endpoint for project '${STAGING_SUPABASE_PROJECT_ID}' is required`,
    );
  }

  // The API build is a required step in the hosted acceptance workflow.
  // Reuse the same *public*, fingerprint-checked Supabase trust anchor as the
  // API, rather than silently falling back to an unrelated default CA store.
  const apiRequire = createRequire(
    new URL("../apps/api/package.json", import.meta.url),
  );
  let caPem;
  try {
    ({ SUPABASE_ROOT_2021_CA_PEM: caPem } = apiRequire(
      "./dist/database/supabase-root-2021-ca.js",
    ));
    const ca = new X509Certificate(caPem);
    if (
      !ca.ca ||
      ca.fingerprint256 !==
        "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA" ||
      Date.now() >= Date.parse(ca.validTo)
    ) {
      throw new Error("Invalid staging CA");
    }
  } catch {
    throw new Error(
      "DATABASE_CONFIGURATION_REJECTED: Built API staging CA trust anchor unavailable or invalid",
    );
  }

  // Pass explicit fields so node-postgres cannot reparse any part of the URL.
  return {
    host,
    port,
    user,
    database: "postgres",
    // A callback also prevents fallback to PGPASSWORD or a password file.
    password: () => password,
    ssl: { rejectUnauthorized: true, servername: host, ca: caPem },
    sslnegotiation: "postgres",
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    idleTimeoutMillis: 1000,
    max: 1,
  };
}

export function validateTestContact(phone, approvedPhone) {
  if (
    !approvedPhone ||
    typeof approvedPhone !== "string" ||
    !approvedPhone.trim() ||
    /placeholder|example|replace-with/i.test(approvedPhone)
  ) {
    throw new Error(
      "TEST_CONTACT_UNAUTHORIZED: Explicitly approved staging test contact (KHLIM_STAGING_APPROVED_TEST_PHONE) is required in active mode",
    );
  }

  if (
    !phone ||
    typeof phone !== "string" ||
    !phone.trim() ||
    /placeholder|example|replace-with/i.test(phone)
  ) {
    throw new Error(
      "TEST_CONTACT_UNAUTHORIZED: Staging test contact phone (KHLIM_STAGING_TEST_PHONE) is required in active mode",
    );
  }

  const trimmed = phone.trim();
  const allowedContact = approvedPhone.trim();

  if (!/^\+601\d{8,9}$/.test(trimmed)) {
    throw new Error(
      "TEST_CONTACT_UNAUTHORIZED: Configured test contact does not match Malaysian E.164 format",
    );
  }

  if (!/^\+601\d{8,9}$/.test(allowedContact)) {
    throw new Error(
      "TEST_CONTACT_UNAUTHORIZED: Approved test contact does not match Malaysian E.164 format",
    );
  }

  if (trimmed !== allowedContact) {
    throw new Error(
      "TEST_CONTACT_UNAUTHORIZED: Configured test contact does not match approved contact",
    );
  }

  return trimmed;
}

export function maskEmail(email) {
  if (!email || typeof email !== "string") return "***";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const maskedLocal =
    local.length > 2
      ? `${local[0]}***${local[local.length - 1]}`
      : `${local[0] || ""}***`;
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone || typeof phone !== "string") return "***";
  if (phone.length <= 6) return "***";
  return `${phone.slice(0, 5)}***${phone.slice(-3)}`;
}

export function maskName(name) {
  if (!name || typeof name !== "string") return "***";
  const words = name.trim().split(/\s+/);
  return words.map((w) => (w.length > 1 ? `${w[0]}***` : w)).join(" ");
}

function requireHttpsOrigin(value, name) {
  // Match before parsing so URL normalization cannot hide credentials, empty
  // query strings/fragments, backslashes, or paths such as /./.
  if (
    typeof value !== "string" ||
    !/^https:\/\/[a-z0-9.-]+(?::443)?\/?$/i.test(value)
  ) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: ${name} must use HTTPS on port 443 and contain only an origin`,
    );
  }
  try {
    return new URL(value);
  } catch {
    throw new Error(`STAGING_TARGET_VIOLATION: Invalid ${name} origin`);
  }
}

export function validateSupabaseTarget(value) {
  const url = requireHttpsOrigin(value, "NEXT_PUBLIC_SUPABASE_URL");
  if (url.hostname !== `${STAGING_SUPABASE_PROJECT_ID}.supabase.co`) {
    throw new Error(
      "STAGING_TARGET_VIOLATION: Supabase origin must belong to the dedicated staging project",
    );
  }
  return url;
}

// This checks URL syntax only. The Vercel lookup authorizes its destination.
function requireDeploymentOrigin(value, name) {
  const url = requireHttpsOrigin(value, name);
  if (!VERCEL_HOST.test(url.hostname) || url.hostname.includes("-git-")) {
    throw new Error(
      "STAGING_TARGET_VIOLATION: An immutable Vercel deployment origin is required",
    );
  }
  return url;
}

export function validateTargetBranch(branch) {
  if (
    branch !== DEDICATED_STAGING_BRANCH &&
    branch !== `refs/heads/${DEDICATED_STAGING_BRANCH}`
  ) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: Target branch must strictly be '${DEDICATED_STAGING_BRANCH}'`,
    );
  }
  return DEDICATED_STAGING_BRANCH;
}

export function generateSyntheticLead(
  uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  testPhone = APPROVED_STAGING_TEST_PHONE,
) {
  return {
    guardianName: `Synthetic Parent ${uniqueSuffix}`,
    email: `staging-synth-${uniqueSuffix}@synthetic.khlim.test`,
    phone: testPhone,
    childAge: 10,
    consent: true,
    source: "3x3-oct24",
    idempotencyKey: randomUUID(),
  };
}

export async function fetchWithTimeout(url, init = {}, timeoutMs = 15000) {
  // Keep the deadline active when the caller reads the response body.
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await fetch(url, { ...init, redirect: "error", signal });
  } catch {
    throw new Error(
      "STAGING_REQUEST_FAILED: HTTPS request failed or timed out",
    );
  }
}

async function attestVercelDeployment({
  origin,
  deploymentId,
  projectId,
  expectedSha,
  vercelToken,
  fetchImpl = fetchWithTimeout,
}) {
  if (!expectedSha || !FULL_GIT_SHA.test(expectedSha)) {
    throw new Error(
      "MISSING_EXPECTED_COMMIT_SHA: An explicit approved full Git SHA is required",
    );
  }
  if (!deploymentId || !DEPLOYMENT_ID.test(deploymentId)) {
    throw new Error(
      "MISSING_DEPLOYMENT_ID: An explicit immutable Vercel deployment ID is required",
    );
  }
  if (!vercelToken || /replace-with|placeholder/i.test(vercelToken)) {
    throw new Error(
      "DEPLOYMENT_VERIFICATION_FAILED: Missing Vercel authentication token",
    );
  }

  const vercelApiUrl = new URL(
    `/v13/deployments/${deploymentId}`,
    "https://api.vercel.com",
  );
  vercelApiUrl.searchParams.set("teamId", STAGING_VERCEL_TEAM_ID);
  vercelApiUrl.searchParams.set("withGitRepoInfo", "true");

  let res;
  try {
    res = await fetchImpl(vercelApiUrl, {
      method: "GET",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error(
      "DEPLOYMENT_INTROSPECTION_FAILED: Vercel management request failed or timed out",
    );
  }
  if (!res.ok) {
    throw new Error(
      `DEPLOYMENT_VERIFICATION_FAILED: Failed to fetch deployment metadata from Vercel API: HTTP ${res.status}`,
    );
  }

  // Verify the owner-view REST response. Reduced responses and caller-supplied
  // meta fields cannot replace ownerId, projectId, or the Git source.
  const deployment = await res.json().catch(() => null);
  if (
    !deployment?.id ||
    !deployment.ownerId ||
    !deployment.projectId ||
    !deployment.url ||
    !deployment.readyState ||
    !deployment.gitSource?.ref ||
    !deployment.gitSource?.sha ||
    !Object.hasOwn(deployment, "target")
  ) {
    throw new Error(
      "DEPLOYMENT_METADATA_INCOMPLETE: Required Vercel deployment metadata is missing",
    );
  }

  if (deployment.id !== deploymentId) {
    throw new Error("DEPLOYMENT_ID_MISMATCH: Unexpected Vercel deployment ID");
  }
  if (
    deployment.ownerId !== STAGING_VERCEL_TEAM_ID ||
    (deployment.team !== undefined &&
      deployment.team?.id !== STAGING_VERCEL_TEAM_ID)
  ) {
    throw new Error("DEPLOYMENT_TEAM_MISMATCH: Unexpected Vercel team");
  }
  if (
    deployment.projectId !== projectId ||
    (deployment.project !== undefined && deployment.project?.id !== projectId)
  ) {
    throw new Error("DEPLOYMENT_PROJECT_MISMATCH: Unexpected Vercel project");
  }
  // Vercel v13 explicitly represents standard Preview as JSON null.
  if (deployment.target !== null || deployment.customEnvironment != null) {
    throw new Error("DEPLOYMENT_TARGET_MISMATCH: Standard Preview is required");
  }
  if (
    deployment.readyState !== "READY" ||
    (deployment.status !== undefined && deployment.status !== "READY") ||
    deployment.deletedAt ||
    deployment.softDeletedByRetention
  ) {
    throw new Error("DEPLOYMENT_NOT_READY: Vercel deployment must be READY");
  }

  const { ref, sha } = deployment.gitSource;
  if (
    ref !== DEDICATED_STAGING_BRANCH ||
    [
      deployment.gitSource.branch,
      deployment.meta?.githubCommitRef,
      deployment.meta?.branch,
    ].some((value) => value !== undefined && value !== ref)
  ) {
    throw new Error("DEPLOYMENT_BRANCH_MISMATCH: Unexpected deployment branch");
  }
  if (
    sha !== expectedSha ||
    [deployment.meta?.githubCommitSha, deployment.meta?.sha].some(
      (value) => value !== undefined && value !== sha,
    )
  ) {
    throw new Error("DEPLOYMENT_COMMIT_MISMATCH: Unexpected deployment SHA");
  }
  if (
    deployment.url !== origin.hostname ||
    [
      deployment.alias,
      deployment.automaticAliases,
      deployment.userAliases,
    ].some(
      (aliases) =>
        aliases !== undefined &&
        (!Array.isArray(aliases) || aliases.includes(origin.hostname)),
    )
  ) {
    throw new Error(
      "DEPLOYMENT_HOSTNAME_MISMATCH: Expected the canonical immutable deployment hostname",
    );
  }

  return {
    deploymentId,
    readyState: "READY",
    deployedBranch: ref,
    deployedSha: sha,
    verified: true,
  };
}

export async function verifyVercelDeploymentIdentity({
  env = process.env,
  fetchImpl,
} = {}) {
  if (env.KHLIM_STAGING_API_ALLOWLIST?.trim()) {
    throw new Error(
      "STAGING_TARGET_VIOLATION: Custom API allowlists are unsupported",
    );
  }
  const origin = requireDeploymentOrigin(
    env.KHLIM_STAGING_API_URL,
    "KHLIM_STAGING_API_URL",
  );
  const identity = await attestVercelDeployment({
    origin,
    deploymentId: env.KHLIM_STAGING_DEPLOYMENT_ID,
    projectId: STAGING_VERCEL_API_PROJECT_ID,
    expectedSha: env.KHLIM_STAGING_EXPECTED_COMMIT_SHA,
    vercelToken: env.KHLIM_STAGING_VERCEL_TOKEN?.trim(),
    fetchImpl,
  });
  return { ...identity, origin: origin.origin };
}

function verifyActionsCheckout(env) {
  if (env.GITHUB_ACTIONS !== "true") return;

  const approvedCandidate = env.KHLIM_STAGING_EXPECTED_COMMIT_SHA;
  const approvedRunner =
    env.KHLIM_STAGING_EXPECTED_RUNNER_SHA || approvedCandidate;
  if (
    !FULL_GIT_SHA.test(approvedCandidate ?? "") ||
    !FULL_GIT_SHA.test(approvedRunner ?? "") ||
    env.GITHUB_SHA !== approvedRunner
  ) {
    throw new Error(
      "RUNNER_PROVENANCE_MISMATCH: Dispatch must match the approved runner SHA",
    );
  }

  const cwd = fileURLToPath(new URL("../", import.meta.url));
  try {
    const git = (args) =>
      execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    if (
      git(["rev-parse", "--verify", "HEAD"]) === approvedRunner &&
      !git(["status", "--porcelain", "--untracked-files=no"])
    ) {
      return;
    }
  } catch {
    // Preserve a fixed diagnostic when Git is unavailable or the checkout is invalid.
  }
  throw new Error(
    "RUNNER_PROVENANCE_MISMATCH: Runner checkout must be clean and match the approved SHA",
  );
}

async function verifyActiveTokens(env, supabaseUrl, userToken, adminToken) {
  const userSubject = env.KHLIM_STAGING_APPROVED_USER_SUBJECT;
  const adminSubject = env.KHLIM_STAGING_APPROVED_ADMIN_SUBJECT;
  if (
    !UUID.test(userSubject ?? "") ||
    !UUID.test(adminSubject ?? "") ||
    userSubject.toLowerCase() === adminSubject.toLowerCase()
  ) {
    throw new Error(
      "AUTH_SUBJECT_CONFIGURATION_REJECTED: Two distinct approved synthetic Supabase user IDs are required",
    );
  }

  const issuer = new URL("/auth/v1", supabaseUrl).href;
  let verify;
  try {
    const apiRequire = createRequire(
      new URL("../apps/api/package.json", import.meta.url),
    );
    const { createLocalJWKSet, jwtVerify } = await import(
      pathToFileURL(apiRequire.resolve("jose")).href
    );
    const response = await fetchWithTimeout(
      new URL(`${issuer}/.well-known/jwks.json`),
    );
    if (!response.ok) throw new Error("Signing key discovery failed");
    const jwks = createLocalJWKSet(await response.json());
    verify = (token, subject) =>
      jwtVerify(token, jwks, {
        algorithms: ["ES256", "RS256"],
        issuer,
        audience: "authenticated",
        subject,
        requiredClaims: ["exp", "aal"],
      });
  } catch {
    throw new Error(
      "AUTH_KEY_VERIFICATION_UNAVAILABLE: Staging signing keys could not be loaded",
    );
  }

  for (const [token, subject, aal] of [
    [userToken, userSubject, "aal1"],
    [adminToken, adminSubject, "aal2"],
  ]) {
    try {
      const { payload } = await verify(token, subject);
      if (
        payload.aal !== aal ||
        payload.role !== "authenticated" ||
        payload.is_anonymous === true
      ) {
        throw new Error("Unexpected assurance level or account type");
      }
    } catch {
      throw new Error(
        `AUTH_TOKEN_REJECTED: Staging ${aal.toUpperCase()} token failed verification`,
      );
    }
  }
}

export async function runHostedStagingAcceptance(env = process.env) {
  verifyActionsCheckout(env);
  if (env.KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED !== "1") {
    return await runAcceptance(env);
  }

  // The last marker describes what might have reached the public lead endpoint.
  const progress = { phase: "BEFORE_SUBMISSION" };
  try {
    return await runAcceptance(env, progress);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "staging.hosted_acceptance.active_failure",
        ...progress,
      }),
    );
    throw error;
  }
}

async function runAcceptance(env, progress) {
  const results = {
    startedAt: new Date().toISOString(),
    acceptanceLayer: "HOSTED_API_AND_DATABASE_ACCEPTANCE",
    browserUxRehearsalRequired: true,
    targetBranch: null,
    supabaseProject: STAGING_SUPABASE_PROJECT_ID,
    apiOrigin: null,
    deploymentIdentity: null,
    databaseIdentity: null,
    readiness: {},
    activeWindow: Boolean(env.KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED === "1"),
    validationCases: [],
    leadCreation: null,
    idempotencyReceipt: null,
    conflictReplay: null,
    adminRetrieval: null,
    independentDbVerification: null,
    completedAt: null,
  };

  // 1. Fail-closed Environment & Target Verification
  for (const varName of REQUIRED_STAGING_ENV_VARS) {
    const val = env[varName]?.trim();
    if (!val || /replace-with|example|placeholder/i.test(val)) {
      throw new Error(`${varName} is missing or still a placeholder`);
    }
  }

  // Target branch check - strictly require explicit target branch variable
  if (
    !env.KHLIM_STAGING_TARGET_BRANCH ||
    typeof env.KHLIM_STAGING_TARGET_BRANCH !== "string" ||
    !env.KHLIM_STAGING_TARGET_BRANCH.trim()
  ) {
    throw new Error(
      "MANDATORY_TARGET_BRANCH_MISSING: KHLIM_STAGING_TARGET_BRANCH environment variable must be explicitly provided",
    );
  }
  results.targetBranch = validateTargetBranch(env.KHLIM_STAGING_TARGET_BRANCH);

  // Exact Supabase project check
  const supabaseUrl = validateSupabaseTarget(env.NEXT_PUBLIC_SUPABASE_URL);

  results.deploymentIdentity = await verifyVercelDeploymentIdentity({ env });
  const apiOrigin = results.deploymentIdentity.origin;
  results.apiOrigin = apiOrigin;

  let webOrigin;
  if (env.KHLIM_STAGING_WEB_URL) {
    webOrigin = requireDeploymentOrigin(
      env.KHLIM_STAGING_WEB_URL,
      "KHLIM_STAGING_WEB_URL",
    );
    await attestVercelDeployment({
      origin: webOrigin,
      projectId: STAGING_VERCEL_WEB_PROJECT_ID,
      deploymentId: env.KHLIM_STAGING_WEB_DEPLOYMENT_ID,
      expectedSha: env.KHLIM_STAGING_EXPECTED_COMMIT_SHA,
      vercelToken: env.KHLIM_STAGING_VERCEL_TOKEN?.trim(),
    });
  }

  const bypassSecret = env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  const requestApi = (path, init = {}) => {
    const url = new URL(path, apiOrigin);
    if (url.origin !== apiOrigin) {
      throw new Error(
        "STAGING_TARGET_VIOLATION: Request left the attested API origin",
      );
    }
    return fetchWithTimeout(url, {
      ...init,
      headers: {
        ...init.headers,
        ...(bypassSecret && { "x-vercel-protection-bypass": bypassSecret }),
      },
    });
  };

  // Deployment identity is attested before forwarding credentials or probing health.
  const apiHealthRes = await requestApi("/v1/health");
  if (!apiHealthRes.ok) {
    throw new Error(
      `KHLIM staging API health check failed: HTTP ${apiHealthRes.status}`,
    );
  }
  const apiHealthJson = await apiHealthRes.json().catch(() => null);
  if (!apiHealthJson || apiHealthJson.status !== "ok") {
    throw new Error(
      "KHLIM staging API health check did not return { status: 'ok' }",
    );
  }

  // Database identity assertion from API health response (mandatory for both readiness and active modes)
  if (
    !apiHealthJson?.database ||
    apiHealthJson.database.status !== "connected"
  ) {
    throw new Error(
      "STAGING_HEALTH_FAILURE: Deployed API did not report a connected database",
    );
  }
  if (
    !apiHealthJson.database.projectRef ||
    apiHealthJson.database.projectRef !== STAGING_SUPABASE_PROJECT_ID
  ) {
    throw new Error(
      "DATABASE_IDENTITY_MISMATCH: Deployed API did not report the dedicated staging database",
    );
  }
  results.databaseIdentity = {
    status: apiHealthJson.database.status,
    projectRefVerified: true,
  };
  results.readiness.apiHealth = "ok";

  const supabaseHealthUrl = new URL("/auth/v1/health", supabaseUrl);
  const supabaseHealthRes = await fetchWithTimeout(supabaseHealthUrl, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() },
  });
  if (!supabaseHealthRes.ok) {
    throw new Error(
      `Supabase Auth staging health check failed: HTTP ${supabaseHealthRes.status}`,
    );
  }
  results.readiness.supabaseAuth = "ok";

  if (webOrigin) {
    const webBypass = env.KHLIM_STAGING_WEB_VERCEL_BYPASS_SECRET?.trim();
    const webRes = await fetchWithTimeout(
      webOrigin,
      webBypass
        ? {
            headers: { "x-vercel-protection-bypass": webBypass },
          }
        : undefined,
    );
    if (!webRes.ok) {
      throw new Error(`KHLIM staging web check failed: HTTP ${webRes.status}`);
    }
    results.readiness.web = "ok";
  }

  console.log(
    JSON.stringify({
      event: "staging.hosted_acceptance.readiness_verified",
      targetBranch: results.targetBranch,
      supabaseProject: STAGING_SUPABASE_PROJECT_ID,
      apiOrigin: results.apiOrigin,
      readiness: results.readiness,
    }),
  );

  // 3. Safety Gate: Halt if active window is not explicitly authorized
  if (!results.activeWindow) {
    console.log(
      JSON.stringify({
        event: "staging.hosted_acceptance.safety_gate_active",
        status: "SAFE_HALT",
        note: "Active staging window is not authorized (KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED != '1'). Halting in verified ready state without submitting hosted POST requests.",
      }),
    );
    results.status = "SAFE_HALT";
    results.completedAt = new Date().toISOString();
    return results;
  }

  // 4. Mandatory Authentication Credentials for Active Staging Window
  const adminAal2Token = env.KHLIM_STAGING_ADMIN_AAL2_TOKEN?.trim();
  if (!adminAal2Token || /replace-with|placeholder/i.test(adminAal2Token)) {
    throw new Error(
      "MANDATORY_AUTH_MISSING: KHLIM_STAGING_ADMIN_AAL2_TOKEN is required to execute active staging acceptance. Test cannot pass without MFA AAL2 verification.",
    );
  }

  const userAal1Token = env.KHLIM_STAGING_USER_AAL1_TOKEN?.trim();
  if (!userAal1Token || /replace-with|placeholder/i.test(userAal1Token)) {
    throw new Error(
      "MANDATORY_AUTH_MISSING: KHLIM_STAGING_USER_AAL1_TOKEN is required to verify negative authorization (AAL1 rejection).",
    );
  }

  // 4b. Mandatory Staging Test Contact Validation BEFORE ANY POST
  const validatedPhone = validateTestContact(
    env.KHLIM_STAGING_TEST_PHONE,
    env.KHLIM_STAGING_APPROVED_TEST_PHONE,
  );

  // 4c. Mandatory Direct Database Client Preflight Verification BEFORE ANY POST
  const dbUrl = env.KHLIM_STAGING_DATABASE_URL?.trim();
  if (!dbUrl || /placeholder|example|replace-with/i.test(dbUrl)) {
    throw new Error(
      "MANDATORY_DB_URL_MISSING: KHLIM_STAGING_DATABASE_URL is required for mandatory independent read-only database persistence verification in active mode",
    );
  }

  const dbConfig = stagingDatabaseConfig(dbUrl);
  await verifyActiveTokens(env, supabaseUrl, userAal1Token, adminAal2Token);

  let prisma = env._prismaClient;
  let ownedPrisma = null;
  if (!prisma) {
    try {
      if (process.env.NODE_PG_FORCE_NATIVE) {
        throw new Error(
          "The runner requires the JavaScript node-postgres driver",
        );
      }
      const path = await import("node:path");
      const { createRequire } = await import("node:module");
      const apiRequire = createRequire(
        path.resolve(process.cwd(), "apps/api/dist/main.js"),
      );
      const { PrismaClient } = apiRequire("./generated/prisma/client.js");
      const { PrismaPg } = apiRequire("@prisma/adapter-pg");
      ownedPrisma = new PrismaClient({ adapter: new PrismaPg(dbConfig) });
      prisma = ownedPrisma;
    } catch {
      throw new Error(
        "DATABASE_CLIENT_UNAVAILABLE: Failed to initialize Prisma client with PrismaPg adapter",
      );
    }
  }

  let syntheticLead = null;
  let leadId = null;

  try {
    // Preflight database probe before any POST
    try {
      await prisma.academyLead.count({
        where: { source: "staging-probe-preflight" },
      });
    } catch {
      throw new Error(
        "DATABASE_PREFLIGHT_FAILURE: Failed to query staging database before mutation",
      );
    }

    // Use the aggregate endpoint with the same role and MFA policy as lead retrieval.
    const adminLeadsPath = "/v1/admin/academy/leads";
    const adminSummaryPath = `${adminLeadsPath}/summary`;

    const adminAccess = await requestApi(adminSummaryPath, {
      headers: { Authorization: `Bearer ${adminAal2Token}` },
    });
    if (adminAccess.status !== 200) {
      throw new Error(
        `AUTH_ADMIN_ROLE_REJECTED: Staging Academy Lead access returned HTTP ${adminAccess.status}`,
      );
    }
    const summary = await adminAccess.json().catch(() => null);
    if (
      ![
        summary?.newLeads,
        summary?.needsFollowUp,
        summary?.total,
        summary?.byStatus?.NEW,
      ].every((count) => Number.isSafeInteger(count) && count >= 0)
    ) {
      throw new Error(
        "AUTH_ADMIN_ROLE_REJECTED: Staging Academy Lead summary was invalid",
      );
    }

    console.log(
      JSON.stringify({
        event: "staging.hosted_acceptance.active_window_started",
        deploymentId: results.deploymentIdentity.deploymentId,
        deployedSha: results.deploymentIdentity.deployedSha,
        deployedBranch: results.deploymentIdentity.deployedBranch,
      }),
    );

    const leadsPath = "/v1/academy/leads";
    progress.attemptId = randomUUID();

    // 5. Non-destructive Input Validation / Injection-like Cases
    const validationCases = createValidationCases(validatedPhone);
    for (const testCase of validationCases) {
      progress.phase = "VALIDATION_SUBMISSION_UNCERTAIN";
      progress.idempotencyKey = randomUUID();
      console.log(
        JSON.stringify({
          event: "staging.hosted_acceptance.validation_submission_started",
          ...progress,
        }),
      );
      const res = await requestApi(leadsPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...testCase.payload,
          idempotencyKey: progress.idempotencyKey,
        }),
      });

      if (res.status !== testCase.expectedStatus) {
        throw new Error(
          `Validation test '${testCase.label}' failed: expected HTTP ${testCase.expectedStatus}, received HTTP ${res.status}`,
        );
      }

      progress.phase = "BEFORE_SUBMISSION";
      delete progress.idempotencyKey;
      results.validationCases.push({
        label: testCase.label,
        expectedStatus: testCase.expectedStatus,
        receivedStatus: res.status,
        passed: true,
      });
    }

    // 6. Authorized Synthetic Lead Creation & Duplicate Idempotency Replay
    syntheticLead = generateSyntheticLead(progress.attemptId, validatedPhone);
    progress.phase = "LEAD_SUBMISSION_UNCERTAIN";
    progress.idempotencyKey = syntheticLead.idempotencyKey;
    console.log(
      JSON.stringify({
        event: "staging.hosted_acceptance.lead_submission_started",
        ...progress,
      }),
    );

    // 6a. Initial Submission (Expected HTTP 201)
    const initialRes = await requestApi(leadsPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(syntheticLead),
    });

    if (initialRes.status !== 201) {
      throw new Error(
        `Initial synthetic lead registration failed: expected HTTP 201, received HTTP ${initialRes.status}`,
      );
    }

    const initialBody = await initialRes.json().catch(() => ({}));
    if (
      typeof initialBody?.id !== "string" ||
      !UUID.test(initialBody.id) ||
      initialBody.status !== "RECEIVED"
    ) {
      throw new Error(
        "Initial synthetic lead registration returned unexpected body structure with missing id or status",
      );
    }
    leadId = initialBody.id;
    progress.phase = "LEAD_RECEIPT_CONFIRMED";
    results.leadCreation = {
      id: leadId,
      status: initialBody.status,
      httpStatus: initialRes.status,
    };

    // 6b. Duplicate Identical Submission (Idempotency Replay Receipt, Expected HTTP 201 with identical ID)
    const duplicateRes = await requestApi(leadsPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(syntheticLead),
    });

    if (duplicateRes.status !== 201) {
      throw new Error(
        `Duplicate idempotency replay failed: expected HTTP 201, received HTTP ${duplicateRes.status}`,
      );
    }

    const duplicateBody = await duplicateRes.json().catch(() => ({}));
    if (duplicateBody?.id !== leadId || duplicateBody.status !== "RECEIVED") {
      throw new Error(
        "Duplicate idempotency replay did not match original receipt ID",
      );
    }
    results.idempotencyReceipt = {
      id: duplicateBody.id,
      matchesOriginal: duplicateBody.id === leadId,
      status: duplicateBody.status,
      httpStatus: duplicateRes.status,
    };

    // 6c. Conflicting Submission with Same Idempotency Key but Altered Payload (Expected HTTP 409)
    const conflictingPayload = {
      ...syntheticLead,
      childAge: 12, // altered payload
    };
    const conflictRes = await requestApi(leadsPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(conflictingPayload),
    });

    if (conflictRes.status !== 409) {
      throw new Error(
        `Conflicting idempotency key submission failed: expected HTTP 409 Conflict, received HTTP ${conflictRes.status}`,
      );
    }
    results.conflictReplay = {
      httpStatus: conflictRes.status,
      rejectedAsExpected: true,
    };

    // Scope the list controls to this synthetic lead even if authorization regresses.
    const negativeControlParams = new URLSearchParams({
      q: syntheticLead.email,
      limit: "1",
    });
    const negativeControlPath = `${adminLeadsPath}?${negativeControlParams}`;
    // Unauthenticated Access must be denied (Expected HTTP 401)
    const unauthRes = await requestApi(negativeControlPath);
    if (unauthRes.status !== 401) {
      throw new Error(
        `AUTH_GATE_FAILURE: Unauthenticated Admin leads request was not rejected with 401: received HTTP ${unauthRes.status}`,
      );
    }

    // AAL1 / Unassigned Role Access must be denied (Expected HTTP 403)
    const aal1Res = await requestApi(negativeControlPath, {
      headers: {
        Authorization: `Bearer ${userAal1Token}`,
      },
    });
    if (aal1Res.status !== 403) {
      throw new Error(
        `AUTH_GATE_FAILURE: AAL1 user token was not rejected with 403 Forbidden: received HTTP ${aal1Res.status}`,
      );
    }

    // 7c. Authorized MFA AAL2 Admin Lead Retrieval (Expected HTTP 200, paginated query)
    const allMatchingLeads = [];
    let currentPage = 1;
    const maxPages = 5;

    do {
      const params = new URLSearchParams({
        source: "3x3-oct24",
        page: String(currentPage),
        limit: "20",
        q: syntheticLead.email,
      });
      const adminRes = await requestApi(`${adminLeadsPath}?${params}`, {
        headers: {
          Authorization: `Bearer ${adminAal2Token}`,
        },
      });

      if (adminRes.status !== 200) {
        throw new Error(
          `Authorized MFA AAL2 Admin leads retrieval failed: expected HTTP 200, received HTTP ${adminRes.status}`,
        );
      }

      const adminJson = await adminRes.json().catch(() => null);
      const itemsList = Array.isArray(adminJson?.items) ? adminJson.items : [];
      const pageMatches = itemsList.filter((lead) => lead?.id === leadId);
      allMatchingLeads.push(...pageMatches);

      const totalPages =
        typeof adminJson?.totalPages === "number" ? adminJson.totalPages : 1;
      if (currentPage >= totalPages) {
        break;
      }
      currentPage++;
    } while (currentPage <= maxPages);

    if (allMatchingLeads.length !== 1) {
      throw new Error(
        `PERSISTENCE_INVARIANT_VIOLATION: Expected exactly 1 persisted lead for ID in Admin list, found ${allMatchingLeads.length}`,
      );
    }

    const leadRecord = allMatchingLeads[0];
    if (leadRecord.source !== "3x3-oct24") {
      throw new Error(
        "ATTRIBUTION_INVARIANT_VIOLATION: Expected source 3x3-oct24",
      );
    }
    if (leadRecord.status !== "NEW") {
      throw new Error("STATUS_INVARIANT_VIOLATION: Expected status NEW");
    }

    // 7d. Detail endpoint check
    const detailRes = await requestApi(`${adminLeadsPath}/${leadId}`, {
      headers: {
        Authorization: `Bearer ${adminAal2Token}`,
      },
    });

    if (detailRes.status !== 200) {
      throw new Error(
        `Admin lead detail lookup for lead ID failed: expected HTTP 200, received HTTP ${detailRes.status}`,
      );
    }

    const detailJson = await detailRes.json().catch(() => null);
    if (
      detailJson?.id !== leadId ||
      detailJson?.source !== "3x3-oct24" ||
      detailJson?.status !== "NEW"
    ) {
      throw new Error(
        "Admin lead detail verification failed: attributes do not match expected lead properties",
      );
    }

    results.adminRetrieval = {
      mfaAal2Authorized: true,
      persistedCount: 1,
      sourceVerified: "3x3-oct24",
      statusVerified: leadRecord.status,
    };

    // 8. Mandatory Independent Read-Only Database Persistence Verification
    let dbCount;
    let idempotencyCount;
    try {
      dbCount = await prisma.academyLead.count({ where: { id: leadId } });
      idempotencyCount = await prisma.academyLead.count({
        where: { idempotencyKey: syntheticLead.idempotencyKey },
      });
    } catch {
      throw new Error(
        "DATABASE_PERSISTENCE_FAILURE: Independent staging database query failed",
      );
    }

    if (dbCount !== 1 || idempotencyCount !== 1) {
      throw new Error(
        `DATABASE_PERSISTENCE_VIOLATION: Independent DB query found ${dbCount} leads with id and ${idempotencyCount} with idempotency key (expected exactly 1)`,
      );
    }
    results.independentDbVerification = {
      verifiedDirectly: true,
      recordCount: dbCount,
      idempotencyCount,
      dbProjectRefVerified: true,
    };
  } finally {
    if (ownedPrisma) {
      await ownedPrisma.$disconnect().catch(() => {
        throw new Error(
          "DATABASE_DISCONNECT_FAILURE: Failed to close staging database client",
        );
      });
    }
  }

  results.completedAt = new Date().toISOString();

  console.log(
    JSON.stringify({
      event: "staging.academy_acceptance.completed",
      status: "SUCCESS",
      acceptanceLayer: results.acceptanceLayer,
      deploymentId: results.deploymentIdentity?.deploymentId,
      deployedSha: results.deploymentIdentity?.deployedSha,
      attemptId: progress.attemptId,
      source: "3x3-oct24",
      idempotencyVerified: true,
      conflictRejected: true,
      singleRecordPersisted: true,
      adminMfaVerified: true,
    }),
  );

  return results;
}

// Direct execution CLI entrypoint
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runHostedStagingAcceptance(process.env).catch((error) => {
    console.error(
      JSON.stringify({
        event: "staging.hosted_acceptance.failed",
        error: sanitizeErrorMessage(error),
      }),
    );
    process.exit(1);
  });
}
