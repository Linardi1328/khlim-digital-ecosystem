import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { test } from "node:test";
import {
  STAGING_SUPABASE_PROJECT_ID,
  DEDICATED_STAGING_BRANCH,
  APPROVED_STAGING_TEST_PHONE,
  STAGING_VERCEL_API_PROJECT_ID,
  STAGING_VERCEL_WEB_PROJECT_ID,
  STAGING_VERCEL_TEAM_ID,
  NON_DESTRUCTIVE_VALIDATION_CASES,
  maskEmail,
  maskPhone,
  maskName,
  sanitizeErrorMessage,
  stagingDatabaseConfig,
  validateTestContact,
  validateSupabaseTarget,
  validateTargetBranch,
  generateSyntheticLead,
  fetchWithTimeout,
  verifyVercelDeploymentIdentity,
  runHostedStagingAcceptance,
} from "../scripts/verify-hosted-staging-acceptance.mjs";
import { runStagingAcceptance } from "../scripts/verify-staging-acceptance.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const API_HOST = "khlim-api-abc123xyz-rbl-productions.vercel.app";
const SUPABASE_HOST = `${STAGING_SUPABASE_PROJECT_ID}.supabase.co`;
const USER_SUBJECT = "2ae0b924-d378-4989-8310-a701fe93f0e3";
const ADMIN_SUBJECT = "dd7d9672-eb21-4f3d-bcea-53e36a5db5be";
const ISSUER = `https://${SUPABASE_HOST}/auth/v1`;
const apiRequire = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { SignJWT, exportJWK, generateKeyPair } = apiRequire("jose");
const signingKey = await generateKeyPair("ES256");
const jwks = {
  keys: [
    {
      ...(await exportJWK(signingKey.publicKey)),
      kid: "staging-offline",
      alg: "ES256",
    },
  ],
};
const expiry = Math.floor(Date.now() / 1000) + 3600;
const signToken = (subject, aal, overrides = {}, key = signingKey.privateKey) =>
  new SignJWT({
    iss: ISSUER,
    aud: "authenticated",
    sub: subject,
    exp: expiry,
    role: "authenticated",
    aal,
    ...overrides,
  })
    .setProtectedHeader({ alg: "ES256", kid: "staging-offline" })
    .sign(key);
const userToken = await signToken(USER_SUBJECT, "aal1");
const adminToken = await signToken(ADMIN_SUBJECT, "aal2");
const DEPLOYMENT_ID = "dpl_MockStaging001";
const APPROVED_SHA = "80aac16f46ff4cb0e75c3b15b899db515d74764c";
const candidateEnv = {
  KHLIM_STAGING_TARGET_BRANCH: DEDICATED_STAGING_BRANCH,
  KHLIM_STAGING_API_URL: `https://${API_HOST}`,
  NEXT_PUBLIC_SUPABASE_URL: `https://${SUPABASE_HOST}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
  KHLIM_STAGING_VERCEL_TOKEN: "mock-vercel-token",
  KHLIM_STAGING_EXPECTED_COMMIT_SHA: APPROVED_SHA,
  KHLIM_STAGING_DEPLOYMENT_ID: DEPLOYMENT_ID,
};
const candidateMetadata = {
  id: DEPLOYMENT_ID,
  ownerId: STAGING_VERCEL_TEAM_ID,
  team: {
    id: STAGING_VERCEL_TEAM_ID,
    name: "Test Team",
    slug: "rbl-productions",
  },
  projectId: STAGING_VERCEL_API_PROJECT_ID,
  project: { id: STAGING_VERCEL_API_PROJECT_ID, name: "khlim-api" },
  readyState: "READY",
  status: "READY",
  target: null,
  url: API_HOST,
  gitSource: {
    type: "github",
    repoId: 123456789,
    ref: DEDICATED_STAGING_BRANCH,
    sha: APPROVED_SHA,
  },
  meta: {
    githubCommitRef: DEDICATED_STAGING_BRANCH,
    githubCommitSha: APPROVED_SHA,
  },
};
const activeEnv = {
  ...candidateEnv,
  KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
  KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
  KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
  KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
  KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
  KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
  KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
  KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${SUPABASE_HOST}:5432/postgres`,
  VERCEL_AUTOMATION_BYPASS_SECRET: "mock-bypass-secret",
};

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
  adminSummaryStatus = 200,
  adminDetailItem = null,
  duplicateReturnsDifferentId = false,
  conflictReturns201 = false,
  vercelDeploymentResponse = candidateMetadata,
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
      redirect: options.redirect,
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

    if (urlStr === `${ISSUER}/.well-known/jwks.json`) {
      return { ok: true, status: 200, json: async () => jwks };
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

      if (auth === `Bearer ${userToken}`) {
        return {
          ok: adminAal1Status === 200,
          status: adminAal1Status,
          json: async () => ({
            message: adminAal1Status === 403 ? "Forbidden" : "OK",
          }),
        };
      }

      if (auth === `Bearer ${adminToken}`) {
        if (urlStr.endsWith("/v1/admin/academy/leads/summary")) {
          return {
            ok: adminSummaryStatus === 200,
            status: adminSummaryStatus,
            json: async () => ({
              newLeads: 0,
              needsFollowUp: 0,
              total: 0,
              byStatus: { NEW: 0 },
            }),
          };
        }
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
  assert.equal(
    DEDICATED_STAGING_BRANCH,
    "staging/ric-119-120-readonly-20261124",
  );

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
    /must use HTTPS on port 443/,
  );

  // Rejects wrong Supabase project
  assert.throws(
    () => validateSupabaseTarget("https://wrongprojectid12345.supabase.co"),
    /Supabase origin must belong to the dedicated staging project/,
  );

  // Rejects attacker subdomain / domain collision attempts (.includes bypass)
  assert.throws(
    () =>
      validateSupabaseTarget(
        "https://qxsjxcbfhxbvxigghhlq.supabase.co.attacker.io",
      ),
    /Supabase origin must belong to the dedicated staging project/,
  );
  assert.throws(
    () =>
      validateSupabaseTarget("https://evil-qxsjxcbfhxbvxigghhlq.supabase.co"),
    /Supabase origin must belong to the dedicated staging project/,
  );

  // Rejects placeholder
  assert.throws(
    () =>
      validateSupabaseTarget(
        "https://qxsjxcbfhxbvxigghhlq-replace-with-actual.supabase.co",
      ),
    /Supabase origin must belong to the dedicated staging project/,
  );
});

test("validateTargetBranch enforces staging/ric-119-120-readonly-20261124 strictly", () => {
  assert.equal(
    validateTargetBranch("staging/ric-119-120-readonly-20261124"),
    "staging/ric-119-120-readonly-20261124",
  );
  assert.equal(
    validateTargetBranch("refs/heads/staging/ric-119-120-readonly-20261124"),
    "staging/ric-119-120-readonly-20261124",
  );

  // Rejects main, master, or unrelated branch
  assert.throws(
    () => validateTargetBranch("main"),
    /Target branch must strictly be 'staging\/ric-119-120-readonly-20261124'/,
  );
  assert.throws(
    () => validateTargetBranch("master"),
    /Target branch must strictly be 'staging\/ric-119-120-readonly-20261124'/,
  );
  assert.throws(
    () => validateTargetBranch("feat/ric-65-something"),
    /Target branch must strictly be 'staging\/ric-119-120-readonly-20261124'/,
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
        fetchWithTimeout(`https://${API_HOST}/redirect-check`, {
          redirect: "follow",
        }),
      /STAGING_REQUEST_FAILED/,
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

test("unset, false and malformed authorization allow only readiness GETs and SAFE_HALT", async (t) => {
  for (const value of [undefined, "0", "false", "true", "01", "1 ", true, 1]) {
    const { mockFetch, recordedRequests } = createMockFetch();
    const fetch = t.mock.method(globalThis, "fetch", mockFetch);
    const env = { ...activeEnv, KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: value };
    Object.defineProperty(env, "_prismaClient", {
      get: () => assert.fail("Readiness entered database initialization"),
    });

    const result = await runHostedStagingAcceptance(env);
    assert.equal(result.status, "SAFE_HALT");
    assert.equal(result.activeWindow, false);
    assert.equal(result.leadCreation, null);
    assert.deepEqual(result.readiness, { apiHealth: "ok", supabaseAuth: "ok" });
    assert.deepEqual(
      recordedRequests.map(({ url, method }) => [
        new URL(url).pathname,
        method,
      ]),
      [
        [`/v13/deployments/${DEPLOYMENT_ID}`, "GET"],
        ["/v1/health", "GET"],
        ["/auth/v1/health", "GET"],
      ],
    );
    assert.deepEqual(recordedRequests[1].headers, {
      "x-vercel-protection-bypass": activeEnv.VERCEL_AUTOMATION_BYPASS_SECRET,
    });
    assert.deepEqual(recordedRequests[2].headers, {
      apikey: candidateEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    fetch.mock.restore();
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
          ...candidateEnv,
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0",
        }),
      /STAGING_HEALTH_FAILURE: Deployed API did not report a connected database/,
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
          ...candidateEnv,
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0",
        }),
      /DATABASE_IDENTITY_MISMATCH: Deployed API did not report the dedicated staging database/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("readiness gate strictly rejects missing, unconfigured, or disconnected database health", async () => {
  const origFetch = globalThis.fetch;

  try {
    const baseEnv = {
      ...candidateEnv,
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0", // Readiness mode only
    };

    // 1. Missing database property in health JSON
    const { mockFetch: mockMissingDb } = createMockFetch({
      omitDatabaseProperty: true,
    });
    globalThis.fetch = mockMissingDb;
    await assert.rejects(
      () => runHostedStagingAcceptance(baseEnv),
      /STAGING_HEALTH_FAILURE: Deployed API did not report a connected database/,
    );

    // 2. Database status is 'unconfigured'
    const { mockFetch: mockUnconfigured } = createMockFetch({
      apiHealthDatabase: { status: "unconfigured" },
    });
    globalThis.fetch = mockUnconfigured;
    await assert.rejects(
      () => runHostedStagingAcceptance(baseEnv),
      /STAGING_HEALTH_FAILURE: Deployed API did not report a connected database/,
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
      /STAGING_HEALTH_FAILURE: Deployed API did not report a connected database/,
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
      /DATABASE_IDENTITY_MISMATCH: Deployed API did not report the dedicated staging database/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
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
      () =>
        stagingDatabaseConfig(
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
    /TEST_CONTACT_UNAUTHORIZED: Configured test contact does not match approved contact/,
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
      ...candidateEnv,
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
      KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
      KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
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
          KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
        }),
      /MANDATORY_AUTH_MISSING.*KHLIM_STAGING_ADMIN_AAL2_TOKEN/,
    );

    // Missing User AAL1 Token
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...baseEnv,
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
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
          ...candidateEnv,
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
          KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
          KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
          KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
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
          ...candidateEnv,
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
          KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
          KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
          KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
          KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
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
    ...candidateEnv,
    KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
    KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
    KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
    KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
    KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
    KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
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
    ...candidateEnv,
    KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
    KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
    KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
    KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
    KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
    KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
    KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
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
      /STATUS_INVARIANT_VIOLATION: Expected status NEW/,
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
      ...candidateEnv,
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
      KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
      KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
      KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
      KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
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
    ...candidateEnv,
    KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
    KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
    KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
    KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
    KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
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

test("RIC-65 closes the owned pool when database preflight fails", async (t) => {
  const apiRequire = createRequire(
    new URL("../apps/api/package.json", import.meta.url),
  );
  const { Pool } = apiRequire("pg");
  const socketConnect = t.mock.method(Socket.prototype, "connect", () => {
    throw new Error("Unexpected socket connection");
  });
  const query = t.mock.method(Pool.prototype, "query", async () => {
    throw new Error("synthetic database failure");
  });
  const end = t.mock.method(Pool.prototype, "end");
  const { mockFetch, recordedRequests } = createMockFetch();
  t.mock.method(globalThis, "fetch", mockFetch);

  await assert.rejects(
    () => runHostedStagingAcceptance(activeEnv),
    /DATABASE_PREFLIGHT_FAILURE/,
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
    ["GET", "GET", "GET", "GET"],
  );
});

test("safety regression: active mode requires approved test phone and fails closed if missing or mismatched", async () => {
  const origFetch = globalThis.fetch;
  const { mockFetch } = createMockFetch();
  globalThis.fetch = mockFetch;

  try {
    const baseEnv = {
      ...candidateEnv,
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
      KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
      KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
      KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
      KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
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
          ...candidateEnv,
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_APPROVED_USER_SUBJECT: USER_SUBJECT,
          KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: ADMIN_SUBJECT,
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
          KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
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
  const { mockFetch, recordedRequests } = createMockFetch({ leadId });

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
      ...activeEnv,
      KHLIM_STAGING_USER_AAL1_TOKEN: userToken,
      KHLIM_STAGING_ADMIN_AAL2_TOKEN: adminToken,
      KHLIM_STAGING_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
      KHLIM_STAGING_APPROVED_TEST_PHONE: APPROVED_STAGING_TEST_PHONE,
      KHLIM_STAGING_DATABASE_URL: `postgresql://postgres@db.${STAGING_SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
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
    const [management, ...requests] = recordedRequests;
    assert.equal(new URL(management.url).origin, "https://api.vercel.com");
    assert.equal(
      new URL(management.url).pathname,
      `/v13/deployments/${DEPLOYMENT_ID}`,
    );
    assert.equal(
      new URL(management.url).searchParams.get("teamId"),
      STAGING_VERCEL_TEAM_ID,
    );
    assert.deepEqual(management.headers, {
      Authorization: `Bearer ${candidateEnv.KHLIM_STAGING_VERCEL_TOKEN}`,
      Accept: "application/json",
    });
    assert.ok(recordedRequests.every(({ redirect }) => redirect === "error"));
    for (const request of requests) {
      const url = new URL(request.url);
      if (url.hostname === SUPABASE_HOST) {
        if (url.pathname.endsWith("/jwks.json")) {
          assert.equal(request.headers, undefined);
        } else {
          assert.deepEqual(request.headers, {
            apikey: candidateEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          });
        }
        continue;
      }
      assert.equal(url.hostname, API_HOST);
      assert.equal(
        request.headers["x-vercel-protection-bypass"],
        activeEnv.VERCEL_AUTOMATION_BYPASS_SECRET,
      );
      if (request.headers.Authorization) {
        assert.match(url.pathname, /^\/v1\/admin\/academy\/leads/);
        assert.ok(
          [
            `Bearer ${env.KHLIM_STAGING_USER_AAL1_TOKEN}`,
            `Bearer ${env.KHLIM_STAGING_ADMIN_AAL2_TOKEN}`,
          ].includes(request.headers.Authorization),
        );
      }
      assert.equal(request.headers.apikey, undefined);
    }
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("both workflows pin the same branch and use protected candidate inputs", async () => {
  const workflows = await Promise.all([
    read(".github/workflows/ric-65-hosted-staging-acceptance.yml"),
    read(".github/workflows/staging-acceptance.yml"),
  ]);
  for (const workflow of workflows) {
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /pull_request:|push:/);
    assert.ok(
      workflow.includes(
        `if: github.ref == 'refs/heads/${DEDICATED_STAGING_BRANCH}'`,
      ),
    );
    assert.match(workflow, /environment: staging/);
    assert.match(workflow, /type: boolean\s+required: true\s+default: false/);
    assert.match(workflow, /active_window_authorized == true && '1' \|\| '0'/);
    assert.match(
      workflow,
      /KHLIM_STAGING_EXPECTED_COMMIT_SHA: \$\{\{ vars\.KHLIM_STAGING_EXPECTED_COMMIT_SHA/,
    );
    assert.match(
      workflow,
      /KHLIM_STAGING_DEPLOYMENT_ID: \$\{\{ vars\.KHLIM_STAGING_DEPLOYMENT_ID/,
    );
    assert.doesNotMatch(
      workflow,
      /KHLIM_STAGING_EXPECTED_COMMIT_SHA:.*github\.sha|KHLIM_STAGING_API_ALLOWLIST|secrets\.VERCEL_TOKEN/,
    );
    for (const name of [
      "DATABASE_URL",
      "ADMIN_AAL2_TOKEN",
      "USER_AAL1_TOKEN",
      "APPROVED_USER_SUBJECT",
      "APPROVED_ADMIN_SUBJECT",
      "TEST_PHONE",
      "APPROVED_TEST_PHONE",
    ]) {
      assert.ok(
        workflow.includes(
          `KHLIM_STAGING_${name}: \${{ inputs.active_window_authorized == true && secrets.KHLIM_STAGING_${name} || '' }}`,
        ),
      );
    }
  }
  assert.match(workflows[1], /ric-65-hosted/);
  const doc = await read("docs/testing/ric-65-hosted-staging-acceptance.md");
  for (const text of [
    DEDICATED_STAGING_BRANCH,
    STAGING_SUPABASE_PROJECT_ID,
    STAGING_VERCEL_TEAM_ID,
    STAGING_VERCEL_API_PROJECT_ID,
    STAGING_VERCEL_WEB_PROJECT_ID,
    "SAFE_HALT",
    "KHLIM_STAGING_EXPECTED_COMMIT_SHA",
    "KHLIM_STAGING_DEPLOYMENT_ID",
    "source=3x3-oct24",
    "MFA AAL2",
    "HTTP 409",
  ])
    assert.ok(doc.includes(text), `Runbook is missing ${text}`);
});

test("invalid targets or approvals fail before any request or database client", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () =>
    assert.fail("Unexpected network request"),
  );
  for (const branch of [
    "main",
    "production",
    "staging/ric-65-academy-soft-launch",
    `refs/tags/${DEDICATED_STAGING_BRANCH}`,
  ]) {
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...activeEnv,
          KHLIM_STAGING_TARGET_BRANCH: branch,
        }),
      /STAGING_TARGET_VIOLATION/,
    );
  }

  for (const origin of [
    "https://khlim.com",
    "https://www.khlim.com",
    "https://api.khlim.com",
    "https://admin.khlim.com",
    "https://app.khlim.com",
    "https://khlim-api-staging.onrender.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://unauthorized-staging.invalid",
    "https://api-preview.linardi.vercel.app",
    "https://khlim-digital-ecosystem-api-git-staging-dc7b4a-rbl-productions.vercel.app",
    `http://${API_HOST}`,
    `https://${API_HOST}:8443`,
    `https://${API_HOST}/v1`,
    `https://${API_HOST}/.`,
    `https://${API_HOST}/?`,
    `https://${API_HOST}?x=y`,
    `https://${API_HOST}/#`,
    `https://${API_HOST}#fragment`,
    `https://user:password-secret@${API_HOST}`,
    `https://@${API_HOST}`,
    `https://${API_HOST}\\junk`,
    `https://${API_HOST}.evil.test`,
    "not a URL",
  ]) {
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...activeEnv,
          KHLIM_STAGING_API_URL: origin,
        }),
      (error) =>
        error.message.startsWith("STAGING_TARGET_VIOLATION:") &&
        !error.message.includes("password-secret"),
      origin,
    );
  }
  for (const suffix of ["/path", "?", "#", ":8443", "\\"]) {
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...activeEnv,
          NEXT_PUBLIC_SUPABASE_URL: `https://${SUPABASE_HOST}${suffix}`,
        }),
      /STAGING_TARGET_VIOLATION/,
    );
  }
  await assert.rejects(
    () =>
      runHostedStagingAcceptance({
        ...activeEnv,
        NEXT_PUBLIC_SUPABASE_URL: `https://user:password-secret@${SUPABASE_HOST}`,
      }),
    /STAGING_TARGET_VIOLATION/,
  );
  for (const [overrides, error] of [
    [
      {
        KHLIM_STAGING_API_ALLOWLIST: "attacker-khlim.vercel.app",
        KHLIM_STAGING_API_URL: "https://attacker-khlim.vercel.app",
      },
      /Custom API allowlists/,
    ],
    [
      {
        KHLIM_STAGING_EXPECTED_COMMIT_SHA: undefined,
        GITHUB_SHA: APPROVED_SHA,
      },
      /MISSING_EXPECTED_COMMIT_SHA/,
    ],
    [
      { KHLIM_STAGING_EXPECTED_COMMIT_SHA: APPROVED_SHA.slice(0, 7) },
      /MISSING_EXPECTED_COMMIT_SHA/,
    ],
    [{ KHLIM_STAGING_DEPLOYMENT_ID: undefined }, /MISSING_DEPLOYMENT_ID/],
    [
      { KHLIM_STAGING_DEPLOYMENT_ID: "dpl_Invalid/path" },
      /MISSING_DEPLOYMENT_ID/,
    ],
    [
      { KHLIM_STAGING_VERCEL_TOKEN: "", VERCEL_TOKEN: "ignored-generic-token" },
      /Missing Vercel authentication token/,
    ],
    [
      { KHLIM_STAGING_VERCEL_TOKEN: "placeholder-token" },
      /Missing Vercel authentication token/,
    ],
  ]) {
    await assert.rejects(
      () => runHostedStagingAcceptance({ ...activeEnv, ...overrides }),
      error,
    );
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("failed Vercel provenance prevents all application requests and database construction", async (t) => {
  const apiRequire = createRequire(
    new URL("../apps/api/package.json", import.meta.url),
  );
  const pool = t.mock.method(apiRequire("pg"), "Pool", function () {
    assert.fail("Constructed a database pool");
  });
  const socket = t.mock.method(Socket.prototype, "connect", () => {
    assert.fail("Opened a network socket");
  });

  const cases = [
    [
      "wrong branch",
      { gitSource: { ...candidateMetadata.gitSource, ref: "main" } },
      /DEPLOYMENT_BRANCH_MISMATCH/,
    ],
    [
      "wrong project",
      { projectId: "prj_Unexpected" },
      /DEPLOYMENT_PROJECT_MISMATCH/,
    ],
    [
      "conflicting project",
      { project: { id: "prj_Unexpected" } },
      /DEPLOYMENT_PROJECT_MISMATCH/,
    ],
    ["wrong team", { ownerId: "team_Unexpected" }, /DEPLOYMENT_TEAM_MISMATCH/],
    [
      "conflicting team",
      { team: { id: "team_Unexpected" } },
      /DEPLOYMENT_TEAM_MISMATCH/,
    ],
    ["production", { target: "production" }, /DEPLOYMENT_TARGET_MISMATCH/],
    ["legacy staging", { target: "staging" }, /DEPLOYMENT_TARGET_MISMATCH/],
    [
      "custom environment",
      { customEnvironment: { type: "production" } },
      /DEPLOYMENT_TARGET_MISMATCH/,
    ],
    ["not ready", { readyState: "BUILDING" }, /DEPLOYMENT_NOT_READY/],
    ["conflicting state", { status: "CANCELED" }, /DEPLOYMENT_NOT_READY/],
    ["deleted", { deletedAt: 1 }, /DEPLOYMENT_NOT_READY/],
    [
      "stale SHA",
      { gitSource: { ...candidateMetadata.gitSource, sha: "a".repeat(40) } },
      /DEPLOYMENT_COMMIT_MISMATCH/,
    ],
    [
      "short SHA",
      {
        gitSource: {
          ...candidateMetadata.gitSource,
          sha: APPROVED_SHA.slice(0, 7),
        },
      },
      /DEPLOYMENT_COMMIT_MISMATCH/,
    ],
    ["wrong ID", { id: "dpl_Stale" }, /DEPLOYMENT_ID_MISMATCH/],
    [
      "conflicting refs",
      { meta: { githubCommitRef: "main" } },
      /DEPLOYMENT_BRANCH_MISMATCH/,
    ],
    [
      "conflicting SHAs",
      { meta: { githubCommitSha: "a".repeat(40) } },
      /DEPLOYMENT_COMMIT_MISMATCH/,
    ],
    [
      "hostname mismatch",
      { url: "attacker-khlim.vercel.app" },
      /DEPLOYMENT_HOSTNAME_MISMATCH/,
    ],
    ["mutable alias", { alias: [API_HOST] }, /DEPLOYMENT_HOSTNAME_MISMATCH/],
    [
      "metadata-only branch",
      { gitSource: { ...candidateMetadata.gitSource, ref: null } },
      /DEPLOYMENT_METADATA_INCOMPLETE/,
    ],
    [
      "metadata-only SHA",
      { gitSource: { ...candidateMetadata.gitSource, sha: undefined } },
      /DEPLOYMENT_METADATA_INCOMPLETE/,
    ],

    ...[
      "id",
      "ownerId",
      "projectId",
      "target",
      "url",
      "readyState",
      "gitSource",
    ].map((key) => [
      `missing ${key}`,
      { [key]: undefined },
      /DEPLOYMENT_METADATA_INCOMPLETE/,
    ]),
  ];
  for (const [label, overrides, error] of cases) {
    await t.test(label, async (test) => {
      const deployment = { ...candidateMetadata, ...overrides };
      // Simulate JSON serialization, including omitted undefined fields.
      const { mockFetch, recordedRequests } = createMockFetch({
        vercelDeploymentResponse: JSON.parse(JSON.stringify(deployment)),
      });
      test.mock.method(globalThis, "fetch", mockFetch);
      const env = { ...activeEnv, KHLIM_STAGING_EXPECTED_BRANCH: "main" };
      Object.defineProperty(env, "_prismaClient", {
        get: () =>
          assert.fail("Failed provenance entered database initialization"),
      });
      await assert.rejects(() => runHostedStagingAcceptance(env), error);
      assert.equal(recordedRequests.length, 1);
      const [{ url, headers, redirect }] = recordedRequests;
      assert.equal(new URL(url).origin, "https://api.vercel.com");
      assert.equal(redirect, "error");
      assert.deepEqual(headers, {
        Authorization: `Bearer ${candidateEnv.KHLIM_STAGING_VERCEL_TOKEN}`,
        Accept: "application/json",
      });
    });
  }

  const { mockFetch, recordedRequests } = createMockFetch();
  t.mock.method(globalThis, "fetch", mockFetch);
  await assert.rejects(
    () =>
      runHostedStagingAcceptance({
        ...candidateEnv,
        KHLIM_STAGING_API_URL: "https://attacker-khlim.vercel.app",
      }),
    /DEPLOYMENT_HOSTNAME_MISMATCH/,
  );
  assert.equal(recordedRequests.length, 1);
  assert.equal(pool.mock.callCount(), 0);
  assert.equal(socket.mock.callCount(), 0);
});

test("Vercel API errors fail closed without exposing exception or response details", async () => {
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        env: candidateEnv,
        fetchImpl: async () => ({ ok: false, status: 404 }),
      }),
    /DEPLOYMENT_VERIFICATION_FAILED: Failed to fetch deployment metadata from Vercel API: HTTP 404/,
  );
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        env: candidateEnv,
        fetchImpl: async () => {
          throw new Error(
            "sentinel-token postgres://user:password@secret.host/postgres",
          );
        },
      }),
    {
      message:
        "DEPLOYMENT_INTROSPECTION_FAILED: Vercel management request failed or timed out",
    },
  );
  await assert.rejects(
    () =>
      verifyVercelDeploymentIdentity({
        env: candidateEnv,
        fetchImpl: async () => ({
          ok: true,
          json: async () => {
            throw new Error("raw response with sentinel-token");
          },
        }),
      }),
    /DEPLOYMENT_METADATA_INCOMPLETE/,
  );
});

test("a later separately approved immutable deployment can be attested", async () => {
  const nextHost = "khlim-api-next12345-rbl-productions.vercel.app";
  const nextId = "dpl_NextCandidate";
  const nextSha = "b".repeat(40);
  const identity = await verifyVercelDeploymentIdentity({
    env: {
      ...candidateEnv,
      GITHUB_SHA: APPROVED_SHA,
      KHLIM_STAGING_API_URL: `https://${nextHost}:443/`,
      KHLIM_STAGING_DEPLOYMENT_ID: nextId,
      KHLIM_STAGING_EXPECTED_COMMIT_SHA: nextSha,
    },
    fetchImpl: async (url) => {
      assert.equal(url.pathname, `/v13/deployments/${nextId}`);
      return {
        ok: true,
        json: async () => ({
          ...candidateMetadata,
          id: nextId,
          url: nextHost,
          gitSource: { ...candidateMetadata.gitSource, sha: nextSha },
          meta: {
            githubCommitRef: DEDICATED_STAGING_BRANCH,
            githubCommitSha: nextSha,
          },
        }),
      };
    },
  });
  assert.equal(identity.verified, true);
  assert.equal(identity.deploymentId, nextId);
  assert.equal(identity.deployedSha, nextSha);
  assert.equal(identity.origin, `https://${nextHost}`);
});

test("the broader staging verifier attests both previews and always stays in readiness", async (t) => {
  const webHost = "khlim-web-abc123xyz-rbl-productions.vercel.app";
  const webId = "dpl_MockWeb001";
  let webProjectId = STAGING_VERCEL_WEB_PROJECT_ID;
  const env = {
    ...activeEnv,
    KHLIM_STAGING_WEB_URL: `https://${webHost}`,
    KHLIM_STAGING_WEB_DEPLOYMENT_ID: webId,
    KHLIM_STAGING_WEB_VERCEL_BYPASS_SECRET: "mock-web-bypass",
    PAYMENT_PROVIDER: "billplz",
    BILLPLZ_SANDBOX: "1",
    BILLPLZ_SECRET_KEY: "mock-key",
    BILLPLZ_COLLECTION_ID: "mock-collection",
    BILLPLZ_X_SIGNATURE_KEY: "mock-signature",
    _prismaClient: {
      academyLead: {
        count: async () => assert.fail("Unexpected database query"),
      },
    },
  };
  const requestUrls = [];
  const { mockFetch } = createMockFetch();
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    requestUrls.push(String(url));
    assert.equal(options.method ?? "GET", "GET");
    assert.equal(options.redirect, "error");
    if (url.hostname === "api.vercel.com" && url.pathname.endsWith(webId)) {
      return {
        ok: true,
        json: async () => ({
          ...candidateMetadata,
          id: webId,
          projectId: webProjectId,
          project: { id: webProjectId },
          url: webHost,
        }),
      };
    }
    if (url.hostname === webHost) {
      assert.deepEqual(options.headers, {
        "x-vercel-protection-bypass": "mock-web-bypass",
      });
      return { ok: true };
    }
    assert.notEqual(
      options.headers?.["x-vercel-protection-bypass"],
      "mock-web-bypass",
    );
    return mockFetch(url, options);
  });

  await assert.rejects(
    () => runStagingAcceptance({ ...env, BILLPLZ_SANDBOX: "0" }),
    /refuses production payments/,
  );
  assert.equal(fetch.mock.callCount(), 0);

  for (const wrongProject of [
    "prj_Other",
    "prj_MockAdmin",
    STAGING_VERCEL_API_PROJECT_ID,
  ]) {
    webProjectId = wrongProject;
    requestUrls.length = 0;
    await assert.rejects(
      () =>
        runStagingAcceptance({
          ...env,
          KHLIM_STAGING_WEB_PROJECT_ID: wrongProject,
        }),
      /DEPLOYMENT_PROJECT_MISMATCH/,
    );
    assert.equal(requestUrls.length, 2);
    assert.ok(
      requestUrls.every(
        (url) => new URL(url).origin === "https://api.vercel.com",
      ),
    );
  }
  webProjectId = STAGING_VERCEL_WEB_PROJECT_ID;
  requestUrls.length = 0;

  const result = await runStagingAcceptance(env);
  assert.equal(result.status, "SAFE_HALT");
  assert.deepEqual(result.readiness, {
    apiHealth: "ok",
    supabaseAuth: "ok",
    web: "ok",
  });
  assert.deepEqual(
    requestUrls.map((url) => new URL(url).hostname),
    ["api.vercel.com", "api.vercel.com", API_HOST, SUPABASE_HOST, webHost],
  );
});

test("the network deadline is still active while reading response bodies", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => ({
    json: () =>
      new Promise((resolve, reject) => {
        const watchdog = setTimeout(() => resolve("deadline escaped"), 500);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(watchdog);
            reject(signal.reason);
          },
          { once: true },
        );
      }),
  }));
  const response = await fetchWithTimeout(`https://${API_HOST}`, {}, 10);
  await assert.rejects(response.json(), { name: "TimeoutError" });
});

test("active auth rejects bad signed claims and unauthorized Admin access before every lead POST", async (t) => {
  const foreignKey = await generateKeyPair("ES256");
  const cases = [
    [
      "expired user",
      {
        KHLIM_STAGING_USER_AAL1_TOKEN: await signToken(USER_SUBJECT, "aal1", {
          exp: 1,
        }),
      },
      /AUTH_TOKEN_REJECTED.*AAL1/,
    ],
    [
      "invalid Admin signature",
      {
        KHLIM_STAGING_ADMIN_AAL2_TOKEN: await signToken(
          ADMIN_SUBJECT,
          "aal2",
          {},
          foreignKey.privateKey,
        ),
      },
      /AUTH_TOKEN_REJECTED.*AAL2/,
    ],
    [
      "wrong issuer",
      {
        KHLIM_STAGING_ADMIN_AAL2_TOKEN: await signToken(ADMIN_SUBJECT, "aal2", {
          iss: "https://foreign.supabase.co/auth/v1",
        }),
      },
      /AUTH_TOKEN_REJECTED.*AAL2/,
    ],
    [
      "wrong audience",
      {
        KHLIM_STAGING_USER_AAL1_TOKEN: await signToken(USER_SUBJECT, "aal1", {
          aud: "other",
        }),
      },
      /AUTH_TOKEN_REJECTED.*AAL1/,
    ],
    [
      "missing expiry",
      {
        KHLIM_STAGING_ADMIN_AAL2_TOKEN: await signToken(ADMIN_SUBJECT, "aal2", {
          exp: undefined,
        }),
      },
      /AUTH_TOKEN_REJECTED.*AAL2/,
    ],
    [
      "wrong subject",
      { KHLIM_STAGING_ADMIN_AAL2_TOKEN: await signToken(USER_SUBJECT, "aal2") },
      /AUTH_TOKEN_REJECTED.*AAL2/,
    ],
    [
      "wrong user AAL",
      { KHLIM_STAGING_USER_AAL1_TOKEN: await signToken(USER_SUBJECT, "aal2") },
      /AUTH_TOKEN_REJECTED.*AAL1/,
    ],
    [
      "wrong Admin AAL",
      {
        KHLIM_STAGING_ADMIN_AAL2_TOKEN: await signToken(ADMIN_SUBJECT, "aal1"),
      },
      /AUTH_TOKEN_REJECTED.*AAL2/,
    ],
    [
      "same approved subject",
      { KHLIM_STAGING_APPROVED_ADMIN_SUBJECT: USER_SUBJECT.toUpperCase() },
      /AUTH_SUBJECT_CONFIGURATION_REJECTED/,
    ],
    ["Admin lacks Academy Lead role", {}, /AUTH_ADMIN_ROLE_REJECTED.*403/, 403],
  ];

  for (const [label, overrides, error, adminSummaryStatus] of cases) {
    await t.test(label, async (test) => {
      const { mockFetch, recordedRequests } = createMockFetch({
        adminSummaryStatus,
      });
      test.mock.method(globalThis, "fetch", mockFetch);
      const logs = test.mock.method(console, "error", () => {});
      const dbCount = test.mock.fn(async () => 0);
      const env = {
        ...activeEnv,
        ...overrides,
        _prismaClient: { academyLead: { count: dbCount } },
      };
      await assert.rejects(() => runHostedStagingAcceptance(env), error);
      assert.ok(recordedRequests.every(({ method }) => method === "GET"));
      const authenticatedAppRequests = recordedRequests.filter(
        ({ url, headers }) =>
          new URL(url).hostname === API_HOST && headers.Authorization,
      );
      assert.deepEqual(
        authenticatedAppRequests.map(({ url }) => new URL(url).pathname),
        adminSummaryStatus ? ["/v1/admin/academy/leads/summary"] : [],
      );
      assert.equal(dbCount.mock.callCount(), adminSummaryStatus ? 1 : 0);
      const [entry] = logs.mock.calls[0].arguments;
      assert.deepEqual(JSON.parse(entry), {
        event: "staging.hosted_acceptance.active_failure",
        phase: "BEFORE_SUBMISSION",
      });
    });
  }
});

test("owner-view REST metadata works with the optional nested team and project omitted", async () => {
  const { team: _team, project: _project, ...metadata } = candidateMetadata;
  const identity = await verifyVercelDeploymentIdentity({
    env: candidateEnv,
    fetchImpl: async () => ({ ok: true, json: async () => metadata }),
  });
  assert.equal(identity.verified, true);
});

test("each Actions approval guard rejects an unapproved dispatch before checkout", async () => {
  for (const workflowPath of [
    ".github/workflows/ric-65-hosted-staging-acceptance.yml",
    ".github/workflows/staging-acceptance.yml",
  ]) {
    const workflow = await read(workflowPath);
    const firstStep = workflow
      .split("- name: Require approved runner dispatch\n")[1]
      .split(/\n      - /)[0];
    const shellGuard = firstStep.split("run: |\n")[1];
    const dispatch = (sha, runner, candidate = APPROVED_SHA) =>
      spawnSync("/bin/bash", ["-e", "-c", shellGuard], {
        env: {
          GITHUB_SHA: sha,
          KHLIM_STAGING_EXPECTED_COMMIT_SHA: candidate,
          KHLIM_STAGING_EXPECTED_RUNNER_SHA: runner,
        },
      }).status;
    const otherSha = "a".repeat(40);
    assert.equal(dispatch(APPROVED_SHA, ""), 0);
    assert.equal(dispatch(otherSha, ""), 1);
    assert.equal(dispatch(otherSha, otherSha), 0);
    assert.equal(dispatch(APPROVED_SHA, otherSha), 1);
    assert.equal(dispatch(otherSha, otherSha, ""), 1);
    assert.ok(
      workflow.indexOf("Require approved runner dispatch") <
        workflow.indexOf("actions/checkout@"),
    );
    assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
    assert.match(
      workflow,
      /test "\$\(git rev-parse --verify HEAD\)" = "\$GITHUB_SHA"/,
    );
    assert.doesNotMatch(workflow, /vars\.KHLIM_STAGING_WEB_PROJECT_ID/);
  }
});

test("runtime rejects dispatch and actual checkout mismatches before any acceptance network request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () =>
    assert.fail("Unexpected network request"),
  );
  const head = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const alternate = head === APPROVED_SHA ? "a".repeat(40) : APPROVED_SHA;
  for (const env of [
    {
      GITHUB_SHA: alternate,
      KHLIM_STAGING_EXPECTED_COMMIT_SHA: undefined,
      KHLIM_STAGING_EXPECTED_RUNNER_SHA: alternate,
    },
    { GITHUB_SHA: head, KHLIM_STAGING_EXPECTED_RUNNER_SHA: alternate },
    { GITHUB_SHA: alternate, KHLIM_STAGING_EXPECTED_RUNNER_SHA: alternate },
  ]) {
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          ...activeEnv,
          GITHUB_ACTIONS: "true",
          ...env,
        }),
      /RUNNER_PROVENANCE_MISMATCH/,
    );
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("records the opaque key before a request and preserves it for partial-failure reconciliation", async (t) => {
  for (const phase of [
    "VALIDATION_SUBMISSION_UNCERTAIN",
    "LEAD_SUBMISSION_UNCERTAIN",
    "LEAD_RECEIPT_CONFIRMED",
  ]) {
    await t.test(phase, async (subtest) => {
      const log = subtest.mock.method(console, "log", () => {});
      const failure = subtest.mock.method(console, "error", () => {});
      const { mockFetch, recordedRequests } = createMockFetch();
      const inspectLog = () =>
        log.mock.calls.map(({ arguments: [entry] }) => JSON.parse(entry));
      let failedRequest;
      subtest.mock.method(globalThis, "fetch", async (url, options) => {
        const body = options.body && JSON.parse(options.body);
        if (url.pathname === "/v1/academy/leads" && body) {
          const marker = inspectLog().findLast(
            (entry) => entry.idempotencyKey === body.idempotencyKey,
          );
          assert.ok(
            marker?.attemptId,
            "Opaque attempt and key must precede the POST",
          );
          if (
            (phase === "VALIDATION_SUBMISSION_UNCERTAIN" &&
              body.consent === false) ||
            (phase === "LEAD_SUBMISSION_UNCERTAIN" && marker.phase === phase)
          ) {
            failedRequest = body;
            throw new Error("synthetic lost response");
          }
        }
        return mockFetch(url, options);
      });
      const env = {
        ...activeEnv,
        _prismaClient: {
          academyLead: {
            count: async ({ where }) => (where.idempotencyKey ? 2 : 1),
          },
        },
      };
      await assert.rejects(
        () => runHostedStagingAcceptance(env),
        phase === "LEAD_RECEIPT_CONFIRMED"
          ? /DATABASE_PERSISTENCE_VIOLATION/
          : /STAGING_REQUEST_FAILED/,
      );
      const [line] = failure.mock.calls[0].arguments;
      const entry = JSON.parse(line);
      assert.equal(entry.phase, phase);
      const marker = inspectLog().findLast(
        (row) => row.idempotencyKey === entry.idempotencyKey,
      );
      assert.equal(marker.attemptId, entry.attemptId);
      if (failedRequest) {
        assert.equal(entry.idempotencyKey, failedRequest.idempotencyKey);
        assert.ok(
          !recordedRequests.some(
            ({ body }) => body?.idempotencyKey === entry.idempotencyKey,
          ),
        );
      }
      const output = JSON.stringify([...inspectLog(), entry]);
      for (const privateValue of [
        APPROVED_STAGING_TEST_PHONE,
        userToken,
        adminToken,
        USER_SUBJECT,
        ADMIN_SUBJECT,
        "@synthetic.khlim.test",
      ]) {
        assert.ok(!output.includes(privateValue));
      }
    });
  }
});
