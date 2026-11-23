import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { test } from "node:test";
import {
  STAGING_SUPABASE_PROJECT_ID,
  DEDICATED_STAGING_BRANCH,
  APPROVED_STAGING_TEST_PHONE,
  PINNED_VERCEL_STAGING_API_HOST,
  NON_DESTRUCTIVE_VALIDATION_CASES,
  maskEmail,
  maskPhone,
  maskName,
  sanitizeErrorMessage,
  stagingDatabaseConfig,
  validateTestContact,
  validateSupabaseTarget,
  validateApiTarget,
  validateTargetBranch,
  generateSyntheticLead,
  fetchWithTimeout,
  verifyVercelDeploymentIdentity,
  runHostedStagingAcceptance,
} from "../scripts/verify-hosted-staging-acceptance.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function createMockFetch({
  leadId = "c2a95d10-8b9a-4e89-a2e6-7a13c9a0b123",
  apiHealthDatabase = {
    status: "connected",
    projectRef: STAGING_SUPABASE_PROJECT_ID,
  },
  omitDatabaseProperty = false,
  adminUnauthStatus = 401,
  adminAal1Status = 403,
  adminAal2Items = null,
  adminDetailItem = null,
  duplicateReturnsDifferentId = false,
  conflictReturns201 = false,
  vercelDeploymentResponse = {
    id: "dpl_mock_staging_ready",
    readyState: "READY",
    url: PINNED_VERCEL_STAGING_API_HOST,
    gitSource: {
      ref: DEDICATED_STAGING_BRANCH,
      sha: "mock-commit-sha-123",
    },
  },
  vercelDeploymentStatus = 200,
} = {}) {
  let leadCreatedInDb = null;
  const recordedRequests = [];

  const mockFetch = async (url, options = {}) => {
    const urlStr = String(url);
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : null;
    recordedRequests.push({
      url: urlStr,
      method,
      body,
      headers: options.headers,
    });

    if (urlStr.endsWith("/v1/health")) {
      const responsePayload = { status: "ok" };
      if (!omitDatabaseProperty && apiHealthDatabase !== null) {
        responsePayload.database = apiHealthDatabase;
      }
      return {
        ok: true,
        status: 200,
        json: async () => responsePayload,
      };
    }

    if (urlStr.endsWith("/auth/v1/health")) {
      return { ok: true, status: 200, json: async () => ({}) };
    }

    if (urlStr.includes("api.vercel.com/v13/deployments/")) {
      if (vercelDeploymentStatus !== 200) {
        return {
          ok: false,
          status: vercelDeploymentStatus,
          json: async () => ({ error: { message: "Vercel API error" } }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => vercelDeploymentResponse,
      };
    }

    if (urlStr.endsWith("/v1/academy/leads")) {
      if (method === "POST") {
        if (body.consent === false) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ message: "Guardian consent is required" }),
          };
        }
        if (body.email && body.email.includes("'")) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ message: "Invalid email address format" }),
          };
        }
        if (body.phone && body.phone.includes("NOT-MY-PHONE")) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ message: "Invalid phone format" }),
          };
        }
        if (body.childAge && body.childAge > 18) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ message: "Child age out of bounds" }),
          };
        }
        if (
          body.programmeOfferingId &&
          body.programmeOfferingId.includes("'")
        ) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ message: "Invalid offering UUID format" }),
          };
        }

        if (
          leadCreatedInDb &&
          leadCreatedInDb.idempotencyKey === body.idempotencyKey
        ) {
          const isIdentical =
            leadCreatedInDb.guardianName === body.guardianName &&
            leadCreatedInDb.email === body.email &&
            leadCreatedInDb.phone === body.phone &&
            leadCreatedInDb.childAge === body.childAge &&
            leadCreatedInDb.consent === body.consent &&
            leadCreatedInDb.source === body.source;

          if (!isIdentical) {
            if (conflictReturns201) {
              return {
                ok: true,
                status: 201,
                json: async () => ({
                  id: "conflict-id-wrong",
                  status: "RECEIVED",
                  message: "Thank you for registering",
                }),
              };
            }
            return {
              ok: false,
              status: 409,
              json: async () => ({
                code: "LEAD_IDEMPOTENCY_CONFLICT",
                message:
                  "Submission token already used with a different payload",
              }),
            };
          }

          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: duplicateReturnsDifferentId
                ? "different-duplicate-id"
                : leadCreatedInDb.id,
              status: "RECEIVED",
              message: "Thank you for registering",
              createdAt: leadCreatedInDb.createdAt,
            }),
          };
        }

        leadCreatedInDb = {
          id: leadId,
          ...body,
          createdAt: new Date().toISOString(),
        };

        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: leadId,
            status: "RECEIVED",
            message: "Thank you for registering",
            createdAt: leadCreatedInDb.createdAt,
          }),
        };
      }
    }

    if (urlStr.includes("/v1/admin/academy/leads")) {
      const auth = options.headers?.Authorization;
      if (!auth) {
        return {
          ok: adminUnauthStatus === 200,
          status: adminUnauthStatus,
          json: async () => ({
            items: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
        };
      }

      if (auth.includes("aal1-token")) {
        return {
          ok: adminAal1Status === 200,
          status: adminAal1Status,
          json: async () => ({
            message: adminAal1Status === 403 ? "Forbidden" : "OK",
          }),
        };
      }

      if (auth.includes("admin-aal2-token") || auth.includes("admin-token")) {
        if (urlStr.endsWith(`/v1/admin/academy/leads/${leadId}`)) {
          const detail =
            adminDetailItem !== null
              ? adminDetailItem
              : {
                  id: leadId,
                  source: "3x3-oct24",
                  status: "NEW",
                  guardianName: leadCreatedInDb?.guardianName,
                };
          return {
            ok: true,
            status: 200,
            json: async () => detail,
          };
        }

        const items =
          adminAal2Items !== null
            ? adminAal2Items
            : [
                {
                  id: leadId,
                  source: "3x3-oct24",
                  status: "NEW",
                  guardianName: leadCreatedInDb?.guardianName,
                },
              ];
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items,
            total: items.length,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
        };
      }
    }

    return { ok: false, status: 404 };
  };

  return { mockFetch, recordedRequests };
}

test("validateSupabaseTarget strictly enforces exact project qxsjxcbfhxbvxigghhlq, HTTPS, and non-production targets", () => {
  assert.equal(STAGING_SUPABASE_PROJECT_ID, "qxsjxcbfhxbvxigghhlq");
  assert.equal(DEDICATED_STAGING_BRANCH, "staging/ric-65-academy-soft-launch");

  // Valid staging Supabase URL
  const valid = validateSupabaseTarget(
    "https://qxsjxcbfhxbvxigghhlq.supabase.co",
  );
  assert.equal(valid.hostname, "qxsjxcbfhxbvxigghhlq.supabase.co");
  assert.equal(valid.protocol, "https:");

  // Rejects HTTP
  assert.throws(
    () => validateSupabaseTarget("http://qxsjxcbfhxbvxigghhlq.supabase.co"),
    /must use HTTPS/,
  );

  // Rejects non-standard port
  assert.throws(
    () =>
      validateSupabaseTarget("https://qxsjxcbfhxbvxigghhlq.supabase.co:8443"),
    /must use standard HTTPS port 443/,
  );

  // Rejects wrong Supabase project
  assert.throws(
    () => validateSupabaseTarget("https://wrongprojectid12345.supabase.co"),
    /Target Supabase project must be exactly 'qxsjxcbfhxbvxigghhlq\.supabase\.co'/,
  );

  // Rejects attacker subdomain / domain collision attempts (.includes bypass)
  assert.throws(
    () =>
      validateSupabaseTarget(
        "https://qxsjxcbfhxbvxigghhlq.supabase.co.attacker.io",
      ),
    /Target Supabase project must be exactly 'qxsjxcbfhxbvxigghhlq\.supabase\.co'/,
  );
  assert.throws(
    () =>
      validateSupabaseTarget("https://evil-qxsjxcbfhxbvxigghhlq.supabase.co"),
    /Target Supabase project must be exactly 'qxsjxcbfhxbvxigghhlq\.supabase\.co'/,
  );

  // Rejects placeholder
  assert.throws(
    () =>
      validateSupabaseTarget(
        "https://qxsjxcbfhxbvxigghhlq-replace-with-actual.supabase.co",
      ),
    /Target Supabase project must be exactly 'qxsjxcbfhxbvxigghhlq\.supabase\.co'/,
  );
});

test("validateApiTarget enforces HTTPS, standard port 443, non-localhost, and staging allowlist", () => {
  // Valid staging API URL on Render
  const valid = validateApiTarget("https://khlim-api-staging.onrender.com");
  assert.equal(valid.hostname, "khlim-api-staging.onrender.com");

  // Valid staging API URL with custom allowlist
  const custom = validateApiTarget("https://staging-api.custom.test", [
    "staging-api.custom.test",
  ]);
  assert.equal(custom.hostname, "staging-api.custom.test");

  // Rejects HTTP
  assert.throws(
    () => validateApiTarget("http://khlim-api-staging.onrender.com"),
    /must use HTTPS/,
  );

  // Rejects non-standard port
  assert.throws(
    () => validateApiTarget("https://khlim-api-staging.onrender.com:3001"),
    /must use standard port 443/,
  );

  // Rejects subpath
  assert.throws(
    () => validateApiTarget("https://khlim-api-staging.onrender.com/v1"),
    /must be origin-only without subpath/,
  );

  // Rejects localhost / 127.0.0.1
  assert.throws(
    () => validateApiTarget("https://localhost"),
    /must point to a deployed hosted staging service/,
  );
  assert.throws(
    () => validateApiTarget("https://127.0.0.1"),
    /must point to a deployed hosted staging service/,
  );

  // Rejects production domains
  assert.throws(
    () => validateApiTarget("https://api.khlim.com"),
    /Refusing to run against production API/,
  );
  assert.throws(
    () => validateApiTarget("https://khlim.com"),
    /Refusing to run against production API/,
  );
  assert.throws(
    () => validateApiTarget("https://admin.khlim.com"),
    /Refusing to run against production API/,
  );

  // Rejects arbitrary foreign domains
  assert.throws(
    () => validateApiTarget("https://unauthorized-staging.example.com"),
    /is not an authorized KHLIM staging deployment origin/,
  );
});

test("validateTargetBranch enforces staging/ric-65-academy-soft-launch strictly", () => {
  assert.equal(
    validateTargetBranch("staging/ric-65-academy-soft-launch"),
    "staging/ric-65-academy-soft-launch",
  );
  assert.equal(
    validateTargetBranch("refs/heads/staging/ric-65-academy-soft-launch"),
    "staging/ric-65-academy-soft-launch",
  );

  // Rejects main, master, or unrelated branch
  assert.throws(
    () => validateTargetBranch("main"),
    /Target branch must strictly be 'staging\/ric-65-academy-soft-launch'/,
  );
  assert.throws(
    () => validateTargetBranch("master"),
    /Target branch must strictly be 'staging\/ric-65-academy-soft-launch'/,
  );
  assert.throws(
    () => validateTargetBranch("feat/ric-65-something"),
    /Target branch must strictly be 'staging\/ric-65-academy-soft-launch'/,
  );
});

test("PII masking and error sanitization protect secrets, tokens, emails, phones, and names", () => {
  // Mask email
  assert.match(
    maskEmail("synthetic.parent@synthetic.khlim.test"),
    /^s\*\*\*t@synthetic\.khlim\.test$/,
  );
  assert.equal(maskEmail(null), "***");
  assert.equal(maskEmail("invalid-email"), "***");

  // Mask phone
  const maskedPhone = maskPhone(APPROVED_STAGING_TEST_PHONE);
  assert.equal(maskedPhone, "+6012***000");
  assert.equal(maskPhone(null), "***");

  // Mask name
  const maskedName = maskName("Synthetic Parent Malaysian");
  assert.equal(maskedName, "S*** P*** M***");
  assert.equal(maskName(null), "***");

  // Error message sanitization
  const testToken = "secret-staging-token-sample";
  const sensitiveError = new Error(
    `Failed to authenticate with Bearer ${testToken} for user test.parent@synthetic.khlim.test and phone +60123456789`,
  );
  const sanitized = sanitizeErrorMessage(sensitiveError);
  assert.ok(!sanitized.includes(testToken));
  assert.ok(!sanitized.includes("test.parent@synthetic.khlim.test"));
  assert.ok(!sanitized.includes("+60123456789"));
  assert.match(sanitized, /\[redacted\]/);
  assert.match(sanitized, /\[email-redacted\]/);
  assert.match(sanitized, /\[phone-redacted\]/);
});

test("generateSyntheticLead creates controlled non-random test phone and valid payload", () => {
  assert.equal(APPROVED_STAGING_TEST_PHONE, "+60120000000");

  const lead = generateSyntheticLead("test-123");
  assert.equal(lead.guardianName, "Synthetic Parent test-123");
  assert.equal(lead.email, "staging-synth-test-123@synthetic.khlim.test");
  assert.equal(lead.phone, APPROVED_STAGING_TEST_PHONE);
  assert.equal(lead.childAge, 10);
  assert.equal(lead.consent, true);
  assert.equal(lead.source, "3x3-oct24");
  assert.match(
    lead.idempotencyKey,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
});

test("fetchWithTimeout strictly rejects HTTP redirects with redirect: error to prevent bearer token leakage", async () => {
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options = {}) => {
      assert.equal(options.redirect, "error");
      throw new TypeError("Failed to fetch: redirect mode is 'error'");
    };

    await assert.rejects(
      () =>
        fetchWithTimeout(
          "https://khlim-api-staging.onrender.com/redirect-check",
        ),
      /Failed to fetch: redirect mode is 'error'/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("hosted staging runner fails closed when required staging variables or target branch are missing", async () => {
  await assert.rejects(
    () => runHostedStagingAcceptance({}),
    /KHLIM_STAGING_API_URL is missing or still a placeholder/,
  );

  await assert.rejects(
    () =>
      runHostedStagingAcceptance({
        KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
        NEXT_PUBLIC_SUPABASE_URL: "replace-with-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      }),
    /NEXT_PUBLIC_SUPABASE_URL is missing or still a placeholder/,
  );

  await assert.rejects(
    () =>
      runHostedStagingAcceptance({
        KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
        NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      }),
    /MANDATORY_TARGET_BRANCH_MISSING: KHLIM_STAGING_TARGET_BRANCH environment variable must be explicitly provided/,
  );
});

test("safety gate halts before hosted mutations when active window is not authorized", async () => {
  const origFetch = globalThis.fetch;
  const { mockFetch, recordedRequests } = createMockFetch();
  globalThis.fetch = mockFetch;

  try {
    const env = {
      KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
      KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0", // Not authorized
    };

    const results = await runHostedStagingAcceptance(env);

    assert.equal(results.activeWindow, false);
    assert.equal(results.readiness.apiHealth, "ok");
    assert.equal(results.readiness.supabaseAuth, "ok");
    assert.equal(results.leadCreation, null);

    // Assert NO POST requests were executed
    const postRequests = recordedRequests.filter((r) => r.method === "POST");
    assert.equal(
      postRequests.length,
      0,
      "Safety gate must ensure ZERO POST requests are issued when window is not authorized",
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: runner rejects database identity mismatch and disconnected DB", async () => {
  const origFetch = globalThis.fetch;

  try {
    // 1. Database reported as disconnected
    const { mockFetch: mockDisconnected } = createMockFetch({
      apiHealthDatabase: {
        status: "disconnected",
        projectRef: STAGING_SUPABASE_PROJECT_ID,
      },
    });
    globalThis.fetch = mockDisconnected;

    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0",
        }),
      /STAGING_HEALTH_FAILURE: Deployed API reports database status as 'disconnected'/,
    );

    // 2. Database projectRef mismatch
    const { mockFetch: mockMismatch } = createMockFetch({
      apiHealthDatabase: {
        status: "connected",
        projectRef: "foreign-production-ref",
      },
    });
    globalThis.fetch = mockMismatch;

    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0",
        }),
      /DATABASE_IDENTITY_MISMATCH: Deployed API database projectRef is 'foreign-production-ref', expected 'qxsjxcbfhxbvxigghhlq'/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("readiness gate strictly rejects missing, unconfigured, or disconnected database health", async () => {
  const origFetch = globalThis.fetch;

  try {
    const baseEnv = {
      KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
      KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0", // Readiness mode only
    };

    // 1. Missing database property in health JSON
    const { mockFetch: mockMissingDb } = createMockFetch({
      omitDatabaseProperty: true,
    });
    globalThis.fetch = mockMissingDb;
    await assert.rejects(
      () => runHostedStagingAcceptance(baseEnv),
      /STAGING_HEALTH_FAILURE: Deployed API reports database status as 'missing', expected 'connected'/,
    );

    // 2. Database status is 'unconfigured'
    const { mockFetch: mockUnconfigured } = createMockFetch({
      apiHealthDatabase: { status: "unconfigured" },
    });
    globalThis.fetch = mockUnconfigured;
    await assert.rejects(
      () => runHostedStagingAcceptance(baseEnv),
      /STAGING_HEALTH_FAILURE: Deployed API reports database status as 'unconfigured', expected 'connected'/,
    );

    // 3. Database status is 'disconnected'
    const { mockFetch: mockDisconnected } = createMockFetch({
      apiHealthDatabase: {
        status: "disconnected",
        projectRef: STAGING_SUPABASE_PROJECT_ID,
      },
    });
    globalThis.fetch = mockDisconnected;
    await assert.rejects(
      () => runHostedStagingAcceptance(baseEnv),
      /STAGING_HEALTH_FAILURE: Deployed API reports database status as 'disconnected', expected 'connected'/,
    );

    // 4. Database projectRef does not match
    const { mockFetch: mockWrongRef } = createMockFetch({
      apiHealthDatabase: {
        status: "connected",
        projectRef: "unauthorized-db-project",
      },
    });
    globalThis.fetch = mockWrongRef;
    await assert.rejects(
      () => runHostedStagingAcceptance(baseEnv),
      /DATABASE_IDENTITY_MISMATCH: Deployed API database projectRef is 'unauthorized-db-project', expected 'qxsjxcbfhxbvxigghhlq'/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("validateApiTarget rejects attacker Vercel domains and arbitrary foreign hosts", () => {
  assert.throws(
    () => validateApiTarget("https://khlim-api-staging.vercel.app"),
    /is not an authorized KHLIM staging deployment origin/,
  );
  assert.throws(
    () => validateApiTarget("https://attacker-khlim.vercel.app"),
    /is not an authorized KHLIM staging deployment origin/,
  );
  assert.throws(
    () => validateApiTarget("https://api-preview.linardi.vercel.app"),
    /is not an authorized KHLIM staging deployment origin/,
  );
  // Pinned dedicated staging Vercel host is accepted
  assert.equal(
    validateApiTarget(
      "https://khlim-digital-ecosystem-api-git-staging-dc7b4a-rbl-productions.vercel.app",
    ).origin,
    "https://khlim-digital-ecosystem-api-git-staging-dc7b4a-rbl-productions.vercel.app",
  );
  // Pinned Render staging host is accepted
  assert.equal(
    validateApiTarget("https://khlim-api-staging.onrender.com").origin,
    "https://khlim-api-staging.onrender.com",
  );
  // Custom allowlist host is accepted when provided
  assert.equal(
    validateApiTarget("https://custom-staging-api.example.com", [
      "custom-staging-api.example.com",
    ]).origin,
    "https://custom-staging-api.example.com",
  );
});

test("RIC-65 resolves approved direct and pooler URLs to explicit node-postgres settings", () => {
  const apiRequire = createRequire(
    new URL("../apps/api/package.json", import.meta.url),
  );
  const { Client } = apiRequire("pg");
  const staging = STAGING_SUPABASE_PROJECT_ID;
  const directHost = `db.${staging}.supabase.co`;
  const sharedHost = "aws-0-ap-southeast-1.pooler.supabase.com";
  const projectHost = `${staging}.pooler.supabase.com`;
  const syntheticCredential = "synthetic@pass/word";

  for (const [host, port, username, query, defaultPort] of [
    [directHost, 5432, "postgres", ""],
    [directHost, 5432, "postgres", "?sslmode=require", true],
    [sharedHost, 5432, `postgres%2E${staging}`, "?sslmode=verify-full"],
    [sharedHost, 6543, `postgres.${staging}`, ""],
    [projectHost, 6543, "postgres", ""],
  ]) {
    const authority = defaultPort ? host : `${host}:${port}`;
    const databaseUrl = new URL(
      `postgresql://${username}@${authority}/postgres${query}`,
    );
    databaseUrl.password = syntheticCredential;
    const config = stagingDatabaseConfig(databaseUrl.href);
    const client = new Client(config);

    assert.equal(Object.hasOwn(config, "connectionString"), false);
    assert.equal(client.host, host);
    assert.equal(client.port, port);
    assert.equal(client.user, decodeURIComponent(username));
    assert.equal(client.database, "postgres");
    assert.equal(client.password(), syntheticCredential);
    assert.equal(client.ssl.rejectUnauthorized, true);
    assert.equal(client.ssl.servername, host);
    assert.match(client.ssl.ca, /^-----BEGIN CERTIFICATE-----/);
    assert.equal(config.connectionTimeoutMillis, 5000);
    assert.equal(config.query_timeout, 10000);
    assert.equal(config.max, 1);
  }
});

test("RIC-65 rejects inherited PostgreSQL startup options before pool creation", () => {
  const prior = process.env.PGOPTIONS;
  process.env.PGOPTIONS = "-c search_path=public";
  try {
    assert.throws(
      () => stagingDatabaseConfig(
        `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
      ),
      /DATABASE_CONFIGURATION_REJECTED: PGOPTIONS must be unset/,
    );
  } finally {
    if (prior === undefined) delete process.env.PGOPTIONS;
    else process.env.PGOPTIONS = prior;
  }
});

test("validateTestContact strictly validates Malaysian E.164 and authorized staging phone", () => {
  assert.equal(
    validateTestContact(
      APPROVED_STAGING_TEST_PHONE,
      APPROVED_STAGING_TEST_PHONE,
    ),
    APPROVED_STAGING_TEST_PHONE,
  );

  assert.throws(
    () => validateTestContact(APPROVED_STAGING_TEST_PHONE, null),
    /TEST_CONTACT_UNAUTHORIZED: Explicitly approved staging test contact \(KHLIM_STAGING_APPROVED_TEST_PHONE\) is required in active mode/,
  );

  assert.throws(
    () => validateTestContact(APPROVED_STAGING_TEST_PHONE, "   "),
    /TEST_CONTACT_UNAUTHORIZED: Explicitly approved staging test contact \(KHLIM_STAGING_APPROVED_TEST_PHONE\) is required in active mode/,
  );

  assert.throws(
    () => validateTestContact(null, APPROVED_STAGING_TEST_PHONE),
    /TEST_CONTACT_UNAUTHORIZED: Staging test contact phone \(KHLIM_STAGING_TEST_PHONE\) is required in active mode/,
  );

  assert.throws(
    () => validateTestContact("+1234567890", APPROVED_STAGING_TEST_PHONE),
    /TEST_CONTACT_UNAUTHORIZED: Configured test contact does not match Malaysian E\.164 format/,
  );

  assert.throws(
    () => validateTestContact("+60129999999", APPROVED_STAGING_TEST_PHONE),
    /TEST_CONTACT_UNAUTHORIZED: Configured test contact .* does not match approved contact/,
  );
});

test("error sanitization preserves token and secret capture groups without leaking sensitive values", () => {
  const sensitiveError = new Error(
    "query failed: apiKey=xyz987&token=secret123&password=pass456&key=auth789",
  );
  const sanitized = sanitizeErrorMessage(sensitiveError);
  assert.ok(sanitized.includes("apiKey=[redacted]"));
  assert.ok(sanitized.includes("token=[redacted]"));
  assert.ok(sanitized.includes("password=[redacted]"));
  assert.ok(sanitized.includes("key=[redacted]"));
  assert.ok(!sanitized.includes("$1="));
  assert.ok(!sanitized.includes("xyz987"));
  assert.ok(!sanitized.includes("secret123"));
  assert.ok(!sanitized.includes("pass456"));
  assert.ok(!sanitized.includes("auth789"));
});

test("safety regression: runner fails closed when mandatory MFA AAL2 or AAL1 tokens are missing in active window", async () => {
  const origFetch = globalThis.fetch;
  const { mockFetch } = createMockFetch();
  globalThis.fetch = mockFetch;

  try {
    const baseEnv = {
      KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
      KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
      KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
      KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
      KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
      _prismaClient: { academyLead: { count: async () => 1 } },
    };

    // Missing Admin AAL2 Token
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...baseEnv,
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "", // missing
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
        }),
      /MANDATORY_AUTH_MISSING.*KHLIM_STAGING_ADMIN_AAL2_TOKEN/,
    );

    // Missing User AAL1 Token
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...baseEnv,
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "", // missing
        }),
      /MANDATORY_AUTH_MISSING.*KHLIM_STAGING_USER_AAL1_TOKEN/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: runner fails closed if AAL1 token is not rejected with 403 Forbidden", async () => {
  const origFetch = globalThis.fetch;
  // Simulate authorization bypass where AAL1 token incorrectly gets 200
  const { mockFetch } = createMockFetch({ adminAal1Status: 200 });
  globalThis.fetch = mockFetch;

  try {
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
          KHLIM_STAGING_API_URL: `https://${PINNED_VERCEL_STAGING_API_HOST}`,
          NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
          KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
          VERCEL_TOKEN: "mock-vercel-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA: "mock-commit-sha-123",
          _prismaClient: { academyLead: { count: async () => 1 } },
        }),
      /AUTH_GATE_FAILURE: AAL1 user token was not rejected with 403 Forbidden: received HTTP 200/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: runner fails closed if unauthenticated access to Admin leads returns 200", async () => {
  const origFetch = globalThis.fetch;
  // Simulate unauthenticated access unexpectedly returning 200
  const { mockFetch } = createMockFetch({ adminUnauthStatus: 200 });
  globalThis.fetch = mockFetch;

  try {
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
          KHLIM_STAGING_API_URL: `https://${PINNED_VERCEL_STAGING_API_HOST}`,
          NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
          KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
          VERCEL_TOKEN: "mock-vercel-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA: "mock-commit-sha-123",
          _prismaClient: { academyLead: { count: async () => 1 } },
        }),
      /AUTH_GATE_FAILURE: Unauthenticated Admin leads request was not rejected with 401: received HTTP 200/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: runner fails closed if duplicate replay returns different ID or conflict returns 201", async () => {
  const origFetch = globalThis.fetch;
  const leadId = "c2a95d10-8b9a-4e89-a2e6-7a13c9a0b123";

  const baseActiveEnv = {
    KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
    KHLIM_STAGING_API_URL: `https://${PINNED_VERCEL_STAGING_API_HOST}`,
    NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
    KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
    KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
    KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
    KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
    VERCEL_TOKEN: "mock-vercel-token",
    KHLIM_STAGING_EXPECTED_COMMIT_SHA: "mock-commit-sha-123",
    _prismaClient: {
      academyLead: {
        count: async () => 1,
      },
    },
  };

  try {
    // 1. Duplicate replay returns different ID
    const { mockFetch: mockDiffId } = createMockFetch({
      leadId,
      duplicateReturnsDifferentId: true,
    });
    globalThis.fetch = mockDiffId;

    await assert.rejects(
      () => runHostedStagingAcceptance(baseActiveEnv),
      /Duplicate idempotency replay did not match original receipt ID/,
    );

    // 2. Conflict replay incorrectly returns HTTP 201
    const { mockFetch: mockConflict201 } = createMockFetch({
      leadId,
      conflictReturns201: true,
    });
    globalThis.fetch = mockConflict201;

    await assert.rejects(
      () => runHostedStagingAcceptance(baseActiveEnv),
      /Conflicting idempotency key submission failed: expected HTTP 409 Conflict, received HTTP 201/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: runner fails closed if Admin list parser finds incorrect count or invalid lead status", async () => {
  const origFetch = globalThis.fetch;
  const leadId = "c2a95d10-8b9a-4e89-a2e6-7a13c9a0b123";

  const baseActiveEnv = {
    KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
    KHLIM_STAGING_API_URL: `https://${PINNED_VERCEL_STAGING_API_HOST}`,
    NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
    KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
    KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
    KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
    KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
    VERCEL_TOKEN: "mock-vercel-token",
    KHLIM_STAGING_EXPECTED_COMMIT_SHA: "mock-commit-sha-123",
    _prismaClient: {
      academyLead: {
        count: async () => 1,
      },
    },
  };

  try {
    // 1. Admin returns status !== 'NEW'
    const { mockFetch: mockWrongStatus } = createMockFetch({
      leadId,
      adminAal2Items: [
        { id: leadId, source: "3x3-oct24", status: "CONTACTED" },
      ],
    });
    globalThis.fetch = mockWrongStatus;

    await assert.rejects(
      () => runHostedStagingAcceptance(baseActiveEnv),
      /STATUS_INVARIANT_VIOLATION: Expected status='NEW', found 'CONTACTED'/,
    );

    // 2. Admin returns 0 matching items (persistence invariant violation)
    const { mockFetch: mockZeroItems } = createMockFetch({
      leadId,
      adminAal2Items: [],
    });
    globalThis.fetch = mockZeroItems;

    await assert.rejects(
      () => runHostedStagingAcceptance(baseActiveEnv),
      /PERSISTENCE_INVARIANT_VIOLATION: Expected exactly 1 persisted lead for ID in Admin list, found 0/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: active mode requires direct database URL and verifies project ref", async () => {
  const origFetch = globalThis.fetch;
  const leadId = "c2a95d10-8b9a-4e89-a2e6-7a13c9a0b123";
  const { mockFetch } = createMockFetch({ leadId });
  globalThis.fetch = mockFetch;

  try {
    const baseEnv = {
      KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
      KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
      KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
      KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
      KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
      KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    };

    // 1. Missing direct DB URL (fails closed even if ambient process.env.DATABASE_URL is set)
    const origEnvDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`;
    try {
      await assert.rejects(
        () =>
          runHostedStagingAcceptance({
            ...baseEnv,
            KHLIM_STAGING_DATABASE_URL: "",
          }),
        /MANDATORY_DB_URL_MISSING/,
      );
    } finally {
      if (origEnvDbUrl !== undefined) {
        process.env.DATABASE_URL = origEnvDbUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    }

    // 2. Placeholder direct DB URL
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...baseEnv,
          KHLIM_STAGING_DATABASE_URL:
            "postgresql://postgres@replace-with-host:5432/postgres",
        }),
      /MANDATORY_DB_URL_MISSING/,
    );

    // 3. Direct DB URL with project ref mismatch
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...baseEnv,
          KHLIM_STAGING_DATABASE_URL:
            "postgresql://postgres@db.foreignproductionref.supabase.co:5432/postgres",
        }),
      /DATABASE_IDENTITY_MISMATCH: An approved database endpoint for project 'qxsjxcbfhxbvxigghhlq' is required/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("RIC-65 rejects ambiguous or insecure database destinations before constructing a pool or opening a socket", async (t) => {
  const apiRequire = createRequire(
    new URL("../apps/api/package.json", import.meta.url),
  );
  const pg = apiRequire("pg");
  const poolAttempts = [];
  const socketConnect = t.mock.method(Socket.prototype, "connect", () => {
    throw new Error("Unexpected socket connection");
  });
  t.mock.method(pg, "Pool", function (config) {
    poolAttempts.push(config);
    throw new Error("Pool construction intercepted");
  });

  const { mockFetch, recordedRequests } = createMockFetch();
  t.mock.method(globalThis, "fetch", mockFetch);
  const staging = STAGING_SUPABASE_PROJECT_ID;
  const secret = "synthetic-password-sentinel";
  const direct = `postgresql://postgres:${secret}@db.${staging}.supabase.co:5432/postgres`;
  const env = {
    KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
    KHLIM_STAGING_API_URL: `https://${PINNED_VERCEL_STAGING_API_HOST}`,
    NEXT_PUBLIC_SUPABASE_URL: `https://${staging}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
    KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
    KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
    KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
    KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
  };

  for (const query of [
    "host=127.0.0.1",
    "%68ost=127.0.0.1",
    "user=postgres.foreignproject",
    "port=6543",
    "database=other",
    "dbname=other",
    "connectionString=postgresql%3A%2F%2F127.0.0.1%2Fpostgres",
    "sslmode=disable",
    "sslmode=no-verify",
    "sslmode=prefer",
    "sslmode=verify-ca",
    "ssl=0",
    "sslrootcert=synthetic-path",
    "sslcert=synthetic-path",
    "sslkey=synthetic-path",
    "sslnegotiation=direct",
    "sslmode=require&uselibpqcompat=true",
    "sslmode=require&sslmode=verify-full",
    "pgbouncer=true",
  ]) {
    await t.test(query.split("=")[0], async () => {
      await assert.rejects(
        () =>
          runHostedStagingAcceptance({
            ...env,
            KHLIM_STAGING_DATABASE_URL: `${direct}?${query}`,
          }),
        (error) => {
          assert.match(error.message, /^DATABASE_CONFIGURATION_REJECTED:/);
          assert.ok(!error.message.includes(secret));
          return true;
        },
      );
    });
  }

  for (const url of [
    direct.replace(":5432/", ":6543/"),
    direct.replace(".supabase.co", ".supabase.co.invalid"),
    direct.replace(/\/postgres$/, "/other"),
    `postgresql://postgres.foreignproject:${secret}@${staging}.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${staging}:${secret}@foreignproject.pooler.supabase.com:6543/postgres`,
  ]) {
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({ ...env, KHLIM_STAGING_DATABASE_URL: url }),
      /^(Error: )?DATABASE_(IDENTITY_MISMATCH|CONFIGURATION_REJECTED):/,
    );
  }

  assert.equal(poolAttempts.length, 0);
  assert.equal(socketConnect.mock.callCount(), 0);
  assert.ok(recordedRequests.every(({ method }) => method === "GET"));

  // The same active runner reaches the pool spy with the approved URL.
  await assert.rejects(
    () =>
      runHostedStagingAcceptance({
        ...env,
        KHLIM_STAGING_DATABASE_URL: direct,
      }),
    /DATABASE_PREFLIGHT_FAILURE/,
  );
  assert.equal(poolAttempts.length, 1);
  const client = new pg.Client(poolAttempts[0]);
  assert.equal(client.host, `db.${staging}.supabase.co`);
  assert.equal(client.port, 5432);
  assert.equal(client.user, "postgres");
  assert.equal(client.database, "postgres");
  assert.equal(client.ssl.rejectUnauthorized, true);
  assert.equal(client.ssl.servername, `db.${staging}.supabase.co`);
  assert.match(client.ssl.ca, /^-----BEGIN CERTIFICATE-----/);
  assert.equal(socketConnect.mock.callCount(), 0);
  assert.ok(recordedRequests.every(({ method }) => method === "GET"));
});

test("RIC-65 closes the owned pool when deployment provenance fails after preflight", async (t) => {
  const apiRequire = createRequire(
    new URL("../apps/api/package.json", import.meta.url),
  );
  const { Pool } = apiRequire("pg");
  const socketConnect = t.mock.method(Socket.prototype, "connect", () => {
    throw new Error("Unexpected socket connection");
  });
  const query = t.mock.method(Pool.prototype, "query", async () => ({
    fields: [{ name: "_count$_all", dataTypeID: 20 }],
    rows: [["0"]],
  }));
  const end = t.mock.method(Pool.prototype, "end");
  const { mockFetch, recordedRequests } = createMockFetch();
  t.mock.method(globalThis, "fetch", mockFetch);

  await assert.rejects(
    () =>
      runHostedStagingAcceptance({
        KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
        KHLIM_STAGING_API_URL: `https://${PINNED_VERCEL_STAGING_API_HOST}`,
        NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
        KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
        KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
        KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
        KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
        KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
        KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
        VERCEL_TOKEN: "mock-vercel-token",
        KHLIM_STAGING_EXPECTED_COMMIT_SHA: "different-approved-commit-sha",
      }),
    /DEPLOYMENT_COMMIT_MISMATCH/,
  );

  assert.equal(query.mock.callCount(), 1);
  assert.match(query.mock.calls[0].arguments[0].text, /COUNT\(/i);
  assert.ok(
    query.mock.calls[0].arguments[0].values.includes("staging-probe-preflight"),
  );
  assert.equal(end.mock.callCount(), 1);
  assert.equal(end.mock.calls[0].this, query.mock.calls[0].this);
  assert.equal(socketConnect.mock.callCount(), 0);
  assert.deepEqual(
    recordedRequests.map(({ method }) => method),
    ["GET", "GET", "GET"],
  );
});

test("safety regression: active mode requires approved test phone and fails closed if missing or mismatched", async () => {
  const origFetch = globalThis.fetch;
  const { mockFetch } = createMockFetch();
  globalThis.fetch = mockFetch;

  try {
    const baseEnv = {
      KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
      KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
      KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
      KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
    };

    // Missing approved phone
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...baseEnv,
          KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
        }),
      /TEST_CONTACT_UNAUTHORIZED: Explicitly approved staging test contact \(KHLIM_STAGING_APPROVED_TEST_PHONE\) is required in active mode/,
    );

    // Missing test phone
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...baseEnv,
          KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
        }),
      /TEST_CONTACT_UNAUTHORIZED: Staging test contact phone \(KHLIM_STAGING_TEST_PHONE\) is required in active mode/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: missing built API dist causes DATABASE_CLIENT_UNAVAILABLE error", async () => {
  const origFetch = globalThis.fetch;
  const { mockFetch } = createMockFetch();
  globalThis.fetch = mockFetch;
  const origCwd = process.cwd();

  try {
    process.chdir("/tmp");
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
          KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
          // Note: no _prismaClient provided
        }),
      /DATABASE_CLIENT_UNAVAILABLE: Failed to initialize Prisma client with PrismaPg adapter/,
    );
  } finally {
    process.chdir(origCwd);
    globalThis.fetch = origFetch;
  }
});

test("PrismaService can be required directly from apps/api/dist/main.js", async () => {
  const path = await import("node:path");
  const { createRequire } = await import("node:module");
  const apiRequire = createRequire(
    path.resolve(process.cwd(), "apps/api/dist/main.js"),
  );
  const { PrismaService } = apiRequire("./database/prisma.service.js");
  assert.equal(typeof PrismaService, "function");
});

test("authorized active window verifies non-destructive cases, lead creation, duplicate idempotency, MFA AAL2 retrieval, and independent direct DB query", async () => {
  const origFetch = globalThis.fetch;
  const leadId = "c2a95d10-8b9a-4e89-a2e6-7a13c9a0b123";
  const { mockFetch } = createMockFetch({ leadId });

  let initialLeadPayload = null;
  let replayLeadPayload = null;
  globalThis.fetch = async (url, options = {}) => {
    const res = await mockFetch(url, options);
    if (
      String(url).endsWith("/v1/academy/leads") &&
      options.method === "POST" &&
      res.status === 201
    ) {
      const body = options.body ? JSON.parse(options.body) : null;
      if (body && body.consent && !body.email?.includes("'")) {
        if (!initialLeadPayload) {
          initialLeadPayload = body;
        } else if (!replayLeadPayload) {
          replayLeadPayload = body;
        }
      }
    }
    return res;
  };

  try {
    const env = {
      KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
      KHLIM_STAGING_API_URL: `https://${PINNED_VERCEL_STAGING_API_HOST}`,
      NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1", // Authorized active window
      KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token-sample",
      KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-aal2-token-sample",
      KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
      KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
      KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
      VERCEL_TOKEN: "mock-vercel-token",
      KHLIM_STAGING_EXPECTED_COMMIT_SHA: "mock-commit-sha-123",
      _prismaClient: {
        academyLead: {
          count: async ({ where }) => {
            if (where.source === "staging-probe-preflight") return 0;
            if (where.id === leadId) return 1;
            if (where.idempotencyKey) {
              assert.ok(
                initialLeadPayload,
                "Expected initialLeadPayload to be populated before DB idempotency query",
              );
              assert.equal(
                where.idempotencyKey,
                initialLeadPayload.idempotencyKey,
              );
              return 1;
            }
            return 0;
          },
        },
      },
    };

    const results = await runHostedStagingAcceptance(env);

    // 1. Validation test assertions
    assert.equal(
      results.validationCases.length,
      NON_DESTRUCTIVE_VALIDATION_CASES.length,
    );
    assert.ok(results.validationCases.every((c) => c.passed));

    // 2. Initial synthetic lead assertion
    assert.ok(
      initialLeadPayload,
      "Synthetic lead should have been captured from initial HTTP 201 response",
    );
    assert.equal(results.leadCreation.httpStatus, 201);
    assert.equal(results.leadCreation.id, leadId);
    assert.equal(results.leadCreation.status, "RECEIVED");

    // 3. Duplicate idempotency replay assertion
    assert.ok(
      replayLeadPayload,
      "Duplicate replay should have been captured from replay HTTP 201 response",
    );
    assert.equal(
      replayLeadPayload.idempotencyKey,
      initialLeadPayload.idempotencyKey,
      "Duplicate replay submission must preserve the original idempotency key",
    );
    assert.equal(results.idempotencyReceipt.httpStatus, 201);
    assert.equal(results.idempotencyReceipt.matchesOriginal, true);
    assert.equal(results.idempotencyReceipt.id, leadId);

    // 4. Conflicting idempotency replay assertion
    assert.equal(results.conflictReplay.httpStatus, 409);
    assert.equal(results.conflictReplay.rejectedAsExpected, true);

    // 5. Admin MFA AAL2 retrieval assertion
    assert.equal(results.adminRetrieval.mfaAal2Authorized, true);
    assert.equal(results.adminRetrieval.persistedCount, 1);
    assert.equal(results.adminRetrieval.sourceVerified, "3x3-oct24");
    assert.equal(results.adminRetrieval.statusVerified, "NEW");
    assert.equal(results.acceptanceLayer, "HOSTED_API_AND_DATABASE_ACCEPTANCE");
    assert.equal(results.browserUxRehearsalRequired, true);

    // 6. Mandatory independent database persistence assertion
    assert.equal(results.independentDbVerification.verifiedDirectly, true);
    assert.equal(results.independentDbVerification.recordCount, 1);
    assert.equal(results.independentDbVerification.idempotencyCount, 1);
    assert.equal(results.independentDbVerification.dbProjectRefVerified, true);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("vercel protection bypass header is sent to pinned Vercel preview host but never to Render or third-party hosts", async () => {
  const origFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), headers: options.headers || {} });
    if (String(url).endsWith("/v1/health")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "ok",
          database: {
            status: "connected",
            projectRef: STAGING_SUPABASE_PROJECT_ID,
          },
        }),
      };
    }
    if (String(url).endsWith("/auth/v1/health")) {
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return { ok: false, status: 404 };
  };

  try {
    const baseEnv = {
      KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
      NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0",
      VERCEL_AUTOMATION_BYPASS_SECRET: "mock-vercel-bypass-secret-12345",
    };

    // 1. Target is Render: must NOT send bypass header
    requests.length = 0;
    await runHostedStagingAcceptance({
      ...baseEnv,
      KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
    });
    const renderHealthReq = requests.find((r) => r.url.endsWith("/v1/health"));
    assert.ok(renderHealthReq, "Render health request made");
    assert.equal(
      renderHealthReq.headers["x-vercel-protection-bypass"],
      undefined,
      "Render health request must NOT receive x-vercel-protection-bypass",
    );

    // 2. Target is pinned Vercel preview: MUST send bypass header
    requests.length = 0;
    await runHostedStagingAcceptance({
      ...baseEnv,
      KHLIM_STAGING_API_URL: `https://${PINNED_VERCEL_STAGING_API_HOST}`,
    });
    const vercelHealthReq = requests.find((r) => r.url.endsWith("/v1/health"));
    assert.ok(vercelHealthReq, "Vercel health request made");
    assert.equal(
      vercelHealthReq.headers["x-vercel-protection-bypass"],
      "mock-vercel-bypass-secret-12345",
      "Vercel health request MUST receive x-vercel-protection-bypass",
    );

    // 3. Target is an allowlisted non-pinned Vercel preview host: must NOT send bypass header
    requests.length = 0;
    await runHostedStagingAcceptance({
      ...baseEnv,
      KHLIM_STAGING_API_URL: "https://allowlisted-preview.vercel.app",
      KHLIM_STAGING_API_ALLOWLIST: "allowlisted-preview.vercel.app",
    });
    const allowlistedHealthReq = requests.find((r) =>
      r.url.endsWith("/v1/health"),
    );
    assert.ok(allowlistedHealthReq, "Allowlisted preview health request made");
    assert.equal(
      allowlistedHealthReq.headers["x-vercel-protection-bypass"],
      undefined,
      "Allowlisted non-pinned Vercel host must NOT receive x-vercel-protection-bypass",
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("RIC-65 workflow and documentation strictly encode staging targets, manual dispatch, and security invariants", async () => {
  const workflow = await read(
    ".github/workflows/ric-65-hosted-staging-acceptance.yml",
  );
  const stagingDispatchWorkflow = await read(
    ".github/workflows/staging-acceptance.yml",
  );
  const doc = await read("docs/testing/ric-65-hosted-staging-acceptance.md");

  // Workflow checks
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /push:/);
  assert.match(workflow, /staging\/ric-65-academy-soft-launch/);
  assert.match(workflow, /KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED/);
  assert.match(workflow, /KHLIM_STAGING_ADMIN_AAL2_TOKEN/);
  assert.match(workflow, /KHLIM_STAGING_USER_AAL1_TOKEN/);

  // Staging acceptance workflow (for manual UI dispatch across branches)
  assert.match(stagingDispatchWorkflow, /ric-65-hosted/);
  assert.match(stagingDispatchWorkflow, /KHLIM_STAGING_ADMIN_AAL2_TOKEN/);
  assert.match(stagingDispatchWorkflow, /KHLIM_STAGING_USER_AAL1_TOKEN/);

  // Vercel deployment identity and provenance env vars in workflows
  assert.match(workflow, /VERCEL_TOKEN/);
  assert.match(workflow, /KHLIM_STAGING_EXPECTED_COMMIT_SHA/);
  assert.match(stagingDispatchWorkflow, /VERCEL_TOKEN/);
  assert.match(stagingDispatchWorkflow, /KHLIM_STAGING_EXPECTED_COMMIT_SHA/);

  // Documentation checks
  assert.match(doc, /qxsjxcbfhxbvxigghhlq/);
  assert.match(doc, /staging\/ric-65-academy-soft-launch/);
  assert.match(
    doc,
    /Phase A2: Authenticated Vercel Deployment Identity & Provenance Verification/,
  );
  assert.match(doc, /source=3x3-oct24/);
  assert.match(doc, /MFA assurance level 2/);
  assert.match(doc, /MFA AAL2/);
  assert.match(doc, /Do not pause KYNEXA/);
  assert.match(doc, /LEAD_IDEMPOTENCY_CONFLICT/);
});

test("safety regression: deployment identity fails closed when Vercel token is missing or placeholder in active window", async () => {
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: { VERCEL_TOKEN: "" },
      }),
    /DEPLOYMENT_VERIFICATION_FAILED: Missing Vercel authentication token/,
  );

  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: { VERCEL_TOKEN: "placeholder-token" },
      }),
    /DEPLOYMENT_VERIFICATION_FAILED: Missing Vercel authentication token/,
  );
});

test("safety regression: deployment identity fails closed when Vercel API returns non-200 or introspection fails", async () => {
  const fetch404 = async () => ({ ok: false, status: 404 });
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: { VERCEL_TOKEN: "valid-mock-token" },
        fetchImpl: fetch404,
      }),
    /DEPLOYMENT_VERIFICATION_FAILED: Failed to fetch deployment metadata from Vercel API: HTTP 404/,
  );

  const fetchNetworkError = async () => {
    throw new Error("connect ECONNREFUSED api.vercel.com:443");
  };
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: { VERCEL_TOKEN: "valid-mock-token" },
        fetchImpl: fetchNetworkError,
      }),
    /DEPLOYMENT_INTROSPECTION_FAILED.*ECONNREFUSED/,
  );
});

test("safety regression: deployment identity fails closed when metadata lacks Git provenance or deployment is not READY", async () => {
  const fetchBuilding = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: "dpl_mock_building",
      readyState: "BUILDING",
      gitSource: {
        ref: DEDICATED_STAGING_BRANCH,
        sha: "abc1234def5678",
      },
    }),
  });
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA: "abc1234def5678",
        },
        fetchImpl: fetchBuilding,
      }),
    /DEPLOYMENT_NOT_READY: Vercel deployment 'dpl_mock_building' state is 'BUILDING', expected 'READY'/,
  );

  const fetchNoGit = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: "dpl_mock_nogit",
      readyState: "READY",
    }),
  });
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA: "abc1234def5678",
        },
        fetchImpl: fetchNoGit,
      }),
    /DEPLOYMENT_METADATA_INCOMPLETE: Deployment metadata lacks required Git provenance/,
  );
});

test("safety regression: deployment identity fails closed when deployed branch is not dedicated staging branch", async () => {
  const fetchWrongBranch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: "dpl_mock_wrong_branch",
      readyState: "READY",
      gitSource: {
        ref: "main",
        sha: "80aac16f46ff4cb0e75c3b15b899db515d74764c",
      },
    }),
  });
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA:
            "80aac16f46ff4cb0e75c3b15b899db515d74764c",
        },
        fetchImpl: fetchWrongBranch,
      }),
    /DEPLOYMENT_BRANCH_MISMATCH: Deployed branch 'main' does not match approved staging branch 'staging\/ric-65-academy-soft-launch'/,
  );

  // Attempting to override branch via env variable is strictly rejected
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA:
            "80aac16f46ff4cb0e75c3b15b899db515d74764c",
          KHLIM_STAGING_EXPECTED_BRANCH: "main",
        },
        fetchImpl: fetchWrongBranch,
      }),
    /DEPLOYMENT_BRANCH_MISMATCH: Deployed branch 'main' does not match approved staging branch 'staging\/ric-65-academy-soft-launch'/,
  );
});

test("safety regression: deployment identity fails closed when expected commit SHA is missing or mismatched (stale deployment)", async () => {
  const fetchStaleSha = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: "dpl_mock_stale",
      readyState: "READY",
      gitSource: {
        ref: DEDICATED_STAGING_BRANCH,
        sha: "11a1e350df628bd3195c776a03a1c5c33a5a6899",
      },
    }),
  });

  // Missing expected commit SHA
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
        },
        fetchImpl: fetchStaleSha,
      }),
    /MISSING_EXPECTED_COMMIT_SHA: Active staging acceptance requires an explicit approved commit SHA/,
  );

  // Mismatched commit SHA (older SHA 11a1e350 vs approved SHA 80aac16f)
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA:
            "80aac16f46ff4cb0e75c3b15b899db515d74764c",
        },
        fetchImpl: fetchStaleSha,
      }),
    /DEPLOYMENT_COMMIT_MISMATCH: Deployed commit '11a1e350df628bd3195c776a03a1c5c33a5a6899' does not match expected approved commit '80aac16f46ff4cb0e75c3b15b899db515d74764c'/,
  );

  // Short expected SHA prefix is rejected (exact full SHA required)
  const fullDeployedSha = "80aac16f46ff4cb0e75c3b15b899db515d74764c";
  const fetchFullSha = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: "dpl_mock_full",
      readyState: "READY",
      gitSource: {
        ref: DEDICATED_STAGING_BRANCH,
        sha: fullDeployedSha,
      },
    }),
  });

  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA: "80aac16", // 7-char prefix
        },
        fetchImpl: fetchFullSha,
      }),
    /DEPLOYMENT_COMMIT_MISMATCH/,
  );

  // Short deployed SHA in Vercel metadata is rejected (exact full SHA required)
  const fetchShortDeployed = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: "dpl_mock_short",
      readyState: "READY",
      gitSource: {
        ref: DEDICATED_STAGING_BRANCH,
        sha: "80aac16",
      },
    }),
  });

  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA: fullDeployedSha,
        },
        fetchImpl: fetchShortDeployed,
      }),
    /DEPLOYMENT_COMMIT_MISMATCH/,
  );
});

test("safety regression: deployment identity fails closed when mutable alias points to different deployment ID", async () => {
  const fetchAliasMismatch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: "dpl_stale_alias_target",
      readyState: "READY",
      gitSource: {
        ref: DEDICATED_STAGING_BRANCH,
        sha: "80aac16f46ff4cb0e75c3b15b899db515d74764c",
      },
    }),
  });

  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA:
            "80aac16f46ff4cb0e75c3b15b899db515d74764c",
          KHLIM_STAGING_DEPLOYMENT_ID: "dpl_expected_fresh_deployment",
        },
        fetchImpl: fetchAliasMismatch,
      }),
    /ALIAS_DEPLOYMENT_MISMATCH: API alias 'khlim-digital-ecosystem-api-git-staging-dc7b4a-rbl-productions.vercel.app' points to deployment 'dpl_stale_alias_target', expected 'dpl_expected_fresh_deployment'/,
  );
});

test("safety regression: deployment identity fails closed for non-Vercel target in active mode", async () => {
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        apiUrl: new URL("https://khlim-api-staging.onrender.com"),
        env: {
          VERCEL_TOKEN: "valid-mock-token",
          KHLIM_STAGING_EXPECTED_COMMIT_SHA:
            "80aac16f46ff4cb0e75c3b15b899db515d74764c",
        },
      }),
    /UNSUPPORTED_DEPLOYMENT_PROVIDER: Hosted staging active window requires verified Vercel deployment metadata provenance/,
  );
});

test("safety regression: vercel token is never leaked to API host or sent across HTTP redirects", async () => {
  const vercelApiRequests = [];
  const apiRequests = [];

  const mockIsolationFetch = async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.includes("api.vercel.com")) {
      vercelApiRequests.push({ url: urlStr, headers: options.headers || {} });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "dpl_isolated_123",
          readyState: "READY",
          gitSource: {
            ref: DEDICATED_STAGING_BRANCH,
            sha: "80aac16f46ff4cb0e75c3b15b899db515d74764c",
          },
        }),
      };
    }
    apiRequests.push({ url: urlStr, headers: options.headers || {} });
    return { ok: true, status: 200, json: async () => ({ status: "ok" }) };
  };

  const identity = await verifyVercelDeploymentIdentity({
    apiUrl: new URL(`https://${PINNED_VERCEL_STAGING_API_HOST}`),
    env: {
      VERCEL_TOKEN: "secret-token-isolation-check",
      KHLIM_STAGING_EXPECTED_COMMIT_SHA:
        "80aac16f46ff4cb0e75c3b15b899db515d74764c",
    },
    fetchImpl: mockIsolationFetch,
  });

  assert.equal(identity.verified, true);
  assert.equal(identity.deploymentId, "dpl_isolated_123");
  assert.equal(vercelApiRequests.length, 1);
  assert.equal(
    vercelApiRequests[0].headers.Authorization,
    "Bearer secret-token-isolation-check",
  );
  // Verify token never reached any non-Vercel API request
  assert.equal(apiRequests.length, 0);
});
