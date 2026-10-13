#!/usr/bin/env node
import { randomUUID } from "node:crypto";

export const STAGING_SUPABASE_PROJECT_ID = "qxsjxcbfhxbvxigghhlq";
export const DEDICATED_STAGING_BRANCH = "staging/ric-65-academy-soft-launch";

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

const DISALLOWED_PRODUCTION_HOSTS = new Set([
  "khlim.com",
  "www.khlim.com",
  "api.khlim.com",
  "admin.khlim.com",
  "app.khlim.com",
]);

export const VETTED_STAGING_API_HOSTS = new Set([
  "khlim-api-staging.onrender.com",
  "khlim-digital-ecosystem-api-git-staging-dc7b4a-rbl-productions.vercel.app",
]);

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
    .replace(/(password|secret|token|apikey|key)=[^&\s]+/gi, "$1=[redacted]");
}

export function extractDatabaseProjectRef(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== "string") return null;
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
      `TEST_CONTACT_UNAUTHORIZED: Configured test contact does not match Malaysian E.164 format: ${maskPhone(trimmed)}`,
    );
  }

  if (!/^\+601\d{8,9}$/.test(allowedContact)) {
    throw new Error(
      `TEST_CONTACT_UNAUTHORIZED: Approved test contact does not match Malaysian E.164 format: ${maskPhone(allowedContact)}`,
    );
  }

  if (trimmed !== allowedContact) {
    throw new Error(
      `TEST_CONTACT_UNAUTHORIZED: Configured test contact ${maskPhone(trimmed)} does not match approved contact ${maskPhone(allowedContact)}`,
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

export function validateSupabaseTarget(supabaseUrlString) {
  if (!supabaseUrlString || typeof supabaseUrlString !== "string") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be provided as a string");
  }
  const url = new URL(supabaseUrlString.trim());
  if (url.protocol !== "https:") {
    throw new Error(
      `STAGING_TARGET_VIOLATION: NEXT_PUBLIC_SUPABASE_URL must use HTTPS: received ${url.protocol}`,
    );
  }
  if (url.port && url.port !== "443") {
    throw new Error(
      `STAGING_TARGET_VIOLATION: NEXT_PUBLIC_SUPABASE_URL must use standard HTTPS port 443: received ${url.port}`,
    );
  }
  const expectedHost = `${STAGING_SUPABASE_PROJECT_ID}.supabase.co`;
  if (url.hostname.toLowerCase() !== expectedHost) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: Target Supabase project must be exactly '${expectedHost}', received: ${url.hostname}`,
    );
  }
  return url;
}

export function validateApiTarget(apiUrlString, allowlist = []) {
  if (!apiUrlString || typeof apiUrlString !== "string") {
    throw new Error("KHLIM_STAGING_API_URL must be provided as a string");
  }
  const url = new URL(apiUrlString.trim());
  if (url.protocol !== "https:") {
    throw new Error(
      `STAGING_TARGET_VIOLATION: KHLIM_STAGING_API_URL must use HTTPS: received ${url.protocol}`,
    );
  }
  if (url.port && url.port !== "443") {
    throw new Error(
      `STAGING_TARGET_VIOLATION: KHLIM_STAGING_API_URL must use standard port 443: received ${url.port}`,
    );
  }
  if (url.pathname !== "" && url.pathname !== "/") {
    throw new Error(
      `STAGING_TARGET_VIOLATION: KHLIM_STAGING_API_URL must be origin-only without subpath: received ${url.pathname}`,
    );
  }

  const hostname = url.hostname.toLowerCase();
  if (["localhost", "127.0.0.1"].includes(hostname)) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: KHLIM_STAGING_API_URL must point to a deployed hosted staging service, not localhost: ${hostname}`,
    );
  }

  if (DISALLOWED_PRODUCTION_HOSTS.has(hostname)) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: Refusing to run against production API: ${hostname}`,
    );
  }

  // Strict allowlist: only pinned Render host, pinned Vercel staging branch alias, or explicit custom allowlist
  const customAllowlist = Array.isArray(allowlist)
    ? allowlist.map((h) => h.toLowerCase())
    : [];

  const isVettedStagingApi = VETTED_STAGING_API_HOSTS.has(hostname);
  const isInCustomAllowlist = customAllowlist.includes(hostname);

  if (!isVettedStagingApi && !isInCustomAllowlist) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: Host ${hostname} is not an authorized KHLIM staging deployment origin`,
    );
  }

  return url;
}

export function validateTargetBranch(branch) {
  if (!branch || typeof branch !== "string" || !branch.trim()) {
    throw new Error(
      "STAGING_TARGET_VIOLATION: Target branch must be specified and non-empty",
    );
  }
  const normalized = branch.trim().replace(/^refs\/heads\//, "");
  if (normalized !== DEDICATED_STAGING_BRANCH) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: Target branch must strictly be '${DEDICATED_STAGING_BRANCH}', received: ${branch}`,
    );
  }
  return normalized;
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      redirect: "error", // Strictly enforce redirect: 'error' AFTER ...init so callers cannot override
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Fetch timed out after ${timeoutMs}ms for ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function runHostedStagingAcceptance(env = process.env) {
  const results = {
    startedAt: new Date().toISOString(),
    acceptanceLayer: "HOSTED_API_AND_DATABASE_ACCEPTANCE",
    browserUxRehearsalRequired: true,
    targetBranch: null,
    supabaseProject: STAGING_SUPABASE_PROJECT_ID,
    apiOrigin: null,
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

  // Allowlist & API target check
  const extraAllowlist = (env.KHLIM_STAGING_API_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const apiUrl = validateApiTarget(env.KHLIM_STAGING_API_URL, extraAllowlist);
  results.apiOrigin = apiUrl.origin;

  let webUrl = null;
  if (env.KHLIM_STAGING_WEB_URL?.trim()) {
    webUrl = new URL(env.KHLIM_STAGING_WEB_URL.trim());
    if (webUrl.protocol !== "https:") {
      throw new Error("KHLIM_STAGING_WEB_URL must use HTTPS");
    }
  }

  const vercelBypassSecret =
    env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ||
    env.KHLIM_STAGING_VERCEL_BYPASS_SECRET?.trim();
  const vercelBypassHeaders = vercelBypassSecret
    ? { "x-vercel-protection-bypass": vercelBypassSecret }
    : {};

  // 2. Health & Database Identity Verification Before Any POST
  const apiHealthUrl = new URL("/v1/health", apiUrl);
  const apiHealthRes = await fetchWithTimeout(apiHealthUrl, {
    headers: { ...vercelBypassHeaders },
  });
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
      `STAGING_HEALTH_FAILURE: Deployed API reports database status as '${apiHealthJson?.database?.status || "missing"}', expected 'connected'`,
    );
  }
  if (
    !apiHealthJson.database.projectRef ||
    apiHealthJson.database.projectRef !== STAGING_SUPABASE_PROJECT_ID
  ) {
    throw new Error(
      `DATABASE_IDENTITY_MISMATCH: Deployed API database projectRef is '${apiHealthJson.database.projectRef || "missing"}', expected '${STAGING_SUPABASE_PROJECT_ID}'`,
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

  if (webUrl) {
    const webRes = await fetchWithTimeout(webUrl);
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

  const dbProjectRef = extractDatabaseProjectRef(dbUrl);
  if (dbProjectRef !== STAGING_SUPABASE_PROJECT_ID) {
    throw new Error(
      `DATABASE_IDENTITY_MISMATCH: Direct database URL is bound to project '${dbProjectRef || "unknown"}', expected '${STAGING_SUPABASE_PROJECT_ID}'`,
    );
  }

  let prisma = env._prismaClient;
  let prismaServiceInstance = null;
  if (!prisma) {
    try {
      const path = await import("node:path");
      const { createRequire } = await import("node:module");
      const apiRequire = createRequire(
        path.resolve(process.cwd(), "apps/api/dist/main.js"),
      );
      const { PrismaService } = apiRequire("./database/prisma.service.js");
      const prevDbUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = dbUrl;
      try {
        prismaServiceInstance = new PrismaService();
        prisma = prismaServiceInstance.client;
      } finally {
        if (prevDbUrl === undefined) {
          delete process.env.DATABASE_URL;
        } else {
          process.env.DATABASE_URL = prevDbUrl;
        }
      }
    } catch (clientErr) {
      throw new Error(
        `DATABASE_CLIENT_UNAVAILABLE: Failed to initialize Prisma client with PrismaPg adapter: ${sanitizeErrorMessage(clientErr)}`,
      );
    }
  }

  // Preflight database probe before any POST
  try {
    await prisma.academyLead.count({
      where: { source: "staging-probe-preflight" },
    });
  } catch (preflightErr) {
    throw new Error(
      `DATABASE_PREFLIGHT_FAILURE: Failed to query staging database before mutation: ${sanitizeErrorMessage(preflightErr)}`,
    );
  }

  console.log(
    JSON.stringify({
      event: "staging.hosted_acceptance.active_window_started",
      note: "Authorized active window confirmed. Mandatory auth tokens, test contact, and direct DB client verified. Executing hosted validation cases, synthetic lead creation, duplicate idempotency receipt, and MFA AAL2 retrieval.",
    }),
  );

  const leadsEndpoint = new URL("/v1/academy/leads", apiUrl);

  let syntheticLead = null;
  let leadId = null;

  try {
    // 5. Non-destructive Input Validation / Injection-like Cases
    const validationCases = createValidationCases(validatedPhone);
    for (const testCase of validationCases) {
      const res = await fetchWithTimeout(leadsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...vercelBypassHeaders,
        },
        body: JSON.stringify(testCase.payload),
      });

      if (res.status !== testCase.expectedStatus) {
        throw new Error(
          `Validation test '${testCase.label}' failed: expected HTTP ${testCase.expectedStatus}, received HTTP ${res.status}`,
        );
      }

      results.validationCases.push({
        label: testCase.label,
        expectedStatus: testCase.expectedStatus,
        receivedStatus: res.status,
        passed: true,
      });
    }

    // 6. Authorized Synthetic Lead Creation & Duplicate Idempotency Replay
    syntheticLead = generateSyntheticLead(undefined, validatedPhone);

    console.log(
      JSON.stringify({
        event: "staging.hosted_acceptance.synthetic_lead_prepared",
        guardian: maskName(syntheticLead.guardianName),
        email: maskEmail(syntheticLead.email),
        phone: maskPhone(syntheticLead.phone),
        source: syntheticLead.source,
        consent: syntheticLead.consent,
        idempotencyKey: syntheticLead.idempotencyKey,
      }),
    );

    // 6a. Initial Submission (Expected HTTP 201)
    const initialRes = await fetchWithTimeout(leadsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...vercelBypassHeaders,
      },
      body: JSON.stringify(syntheticLead),
    });

    if (initialRes.status !== 201) {
      const errJson = await initialRes.json().catch(() => ({}));
      const errCode =
        errJson?.code || errJson?.statusCode || "UNEXPECTED_STATUS";
      throw new Error(
        `Initial synthetic lead registration failed: expected HTTP 201, received HTTP ${initialRes.status} [code: ${errCode}]`,
      );
    }

    const initialBody = await initialRes.json().catch(() => ({}));
    if (!initialBody?.id || initialBody.status !== "RECEIVED") {
      throw new Error(
        "Initial synthetic lead registration returned unexpected body structure with missing id or status",
      );
    }
    leadId = initialBody.id;
    results.leadCreation = {
      id: leadId,
      status: initialBody.status,
      createdAt: initialBody.createdAt,
      httpStatus: initialRes.status,
    };

    // 6b. Duplicate Identical Submission (Idempotency Replay Receipt, Expected HTTP 201 with identical ID)
    const duplicateRes = await fetchWithTimeout(leadsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...vercelBypassHeaders,
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
    const conflictRes = await fetchWithTimeout(leadsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...vercelBypassHeaders,
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

    // 7. Mandatory Admin Lead Retrieval & MFA AAL2 Access Control
    const adminLeadsEndpoint = new URL("/v1/admin/academy/leads", apiUrl);

    // 7a. Unauthenticated Access must be denied (Expected HTTP 401)
    const unauthRes = await fetchWithTimeout(adminLeadsEndpoint, {
      headers: { ...vercelBypassHeaders },
    });
    if (unauthRes.status !== 401) {
      throw new Error(
        `AUTH_GATE_FAILURE: Unauthenticated Admin leads request was not rejected with 401: received HTTP ${unauthRes.status}`,
      );
    }

    // 7b. AAL1 / Unassigned Role Access must be denied (Expected HTTP 403)
    const aal1Res = await fetchWithTimeout(adminLeadsEndpoint, {
      headers: {
        ...vercelBypassHeaders,
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
      const pageQuery = new URL(adminLeadsEndpoint);
      pageQuery.searchParams.set("source", "3x3-oct24");
      pageQuery.searchParams.set("page", String(currentPage));
      pageQuery.searchParams.set("limit", "20");
      if (syntheticLead.email) {
        pageQuery.searchParams.set("q", syntheticLead.email);
      }

      const adminRes = await fetchWithTimeout(pageQuery, {
        headers: {
          ...vercelBypassHeaders,
          Authorization: `Bearer ${adminAal2Token}`,
        },
      });

      if (adminRes.status !== 200) {
        throw new Error(
          `Authorized MFA AAL2 Admin leads retrieval failed: expected HTTP 200, received HTTP ${adminRes.status}`,
        );
      }

      const adminJson = await adminRes.json();
      const itemsList = Array.isArray(adminJson?.items) ? adminJson.items : [];
      const pageMatches = itemsList.filter((l) => l.id === leadId);
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
        `ATTRIBUTION_INVARIANT_VIOLATION: Expected source='3x3-oct24', found '${leadRecord.source}'`,
      );
    }
    if (leadRecord.status !== "NEW") {
      throw new Error(
        `STATUS_INVARIANT_VIOLATION: Expected status='NEW', found '${leadRecord.status}'`,
      );
    }

    // 7d. Detail endpoint check
    const detailUrl = new URL(`/v1/admin/academy/leads/${leadId}`, apiUrl);
    const detailRes = await fetchWithTimeout(detailUrl, {
      headers: {
        ...vercelBypassHeaders,
        Authorization: `Bearer ${adminAal2Token}`,
      },
    });

    if (detailRes.status !== 200) {
      throw new Error(
        `Admin lead detail lookup for lead ID failed: expected HTTP 200, received HTTP ${detailRes.status}`,
      );
    }

    const detailJson = await detailRes.json();
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
    const dbCount = await prisma.academyLead.count({
      where: { id: leadId },
    });
    const idempotencyCount = await prisma.academyLead.count({
      where: { idempotencyKey: syntheticLead.idempotencyKey },
    });

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
    if (prismaServiceInstance) {
      await prismaServiceInstance.onModuleDestroy();
    }
  }

  results.completedAt = new Date().toISOString();

  console.log(
    JSON.stringify({
      event: "staging.academy_acceptance.completed",
      status: "SUCCESS",
      acceptanceLayer: results.acceptanceLayer,
      leadId,
      source: "3x3-oct24",
      idempotencyVerified: true,
      conflictRejected: true,
      singleRecordPersisted: true,
      adminMfaVerified: true,
      maskedDetails: {
        guardian: maskName(syntheticLead.guardianName),
        email: maskEmail(syntheticLead.email),
        phone: maskPhone(syntheticLead.phone),
      },
    }),
  );

  return results;
}

// Direct execution CLI entrypoint
const isDirectCliExecution =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("verify-hosted-staging-acceptance.mjs");

if (isDirectCliExecution) {
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
