import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  STAGING_SUPABASE_PROJECT_ID,
  DEDICATED_STAGING_BRANCH,
  APPROVED_STAGING_TEST_PHONE,
  NON_DESTRUCTIVE_VALIDATION_CASES,
  maskEmail,
  maskPhone,
  maskName,
  sanitizeErrorMessage,
  validateSupabaseTarget,
  validateApiTarget,
  validateTargetBranch,
  generateSyntheticLead,
  fetchWithTimeout,
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
  adminAal1Status = 403,
  adminAal2Items = null,
  adminDetailItem = null,
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
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "ok",
          database: apiHealthDatabase,
        }),
      };
    }

    if (urlStr.endsWith("/auth/v1/health")) {
      return { ok: true, status: 200, json: async () => ({}) };
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

        if (leadCreatedInDb && body.childAge === 12) {
          return {
            ok: false,
            status: 409,
            json: async () => ({
              code: "LEAD_IDEMPOTENCY_CONFLICT",
              message: "Submission token already used with a different payload",
            }),
          };
        }

        if (
          leadCreatedInDb &&
          leadCreatedInDb.idempotencyKey === body.idempotencyKey
        ) {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: leadCreatedInDb.id,
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
      if (!auth) return { ok: false, status: 401 };

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

test("hosted staging runner fails closed when required staging variables are missing", async () => {
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
});

test("safety gate halts before hosted mutations when active window is not authorized", async () => {
  const origFetch = globalThis.fetch;
  const { mockFetch, recordedRequests } = createMockFetch();
  globalThis.fetch = mockFetch;

  try {
    const env = {
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
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
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
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
        }),
      /STAGING_TARGET_VIOLATION: Deployed API database is bound to project 'foreign-production-ref'/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: runner fails closed when mandatory MFA AAL2 or AAL1 tokens are missing in active window", async () => {
  const origFetch = globalThis.fetch;
  const { mockFetch } = createMockFetch();
  globalThis.fetch = mockFetch;

  try {
    // Missing Admin AAL2 Token
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "", // missing
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
        }),
      /MANDATORY_AUTH_MISSING.*KHLIM_STAGING_ADMIN_AAL2_TOKEN/,
    );

    // Missing User AAL1 Token
    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
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
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
        }),
      /AUTH_GATE_FAILURE: AAL1 user token was not rejected with 403 Forbidden: received HTTP 200/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safety regression: runner fails closed if Admin list parser finds incorrect count or invalid lead status", async () => {
  const origFetch = globalThis.fetch;
  const leadId = "c2a95d10-8b9a-4e89-a2e6-7a13c9a0b123";

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
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
        }),
      /STATUS_INVARIANT_VIOLATION: Expected status='NEW', found 'CONTACTED'/,
    );

    // 2. Admin returns 0 matching items (persistence invariant violation)
    const { mockFetch: mockZeroItems } = createMockFetch({
      leadId,
      adminAal2Items: [],
    });
    globalThis.fetch = mockZeroItems;

    await assert.rejects(
      () =>
        runHostedStagingAcceptance({
          KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
          NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
          KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1",
          KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-token",
          KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token",
        }),
      /PERSISTENCE_INVARIANT_VIOLATION: Expected exactly 1 persisted lead for ID in Admin list, found 0/,
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("authorized active window verifies non-destructive cases, lead creation, duplicate idempotency, and MFA AAL2 retrieval", async () => {
  const origFetch = globalThis.fetch;
  const leadId = "c2a95d10-8b9a-4e89-a2e6-7a13c9a0b123";
  const { mockFetch } = createMockFetch({ leadId });
  globalThis.fetch = mockFetch;

  try {
    const env = {
      KHLIM_STAGING_API_URL: "https://khlim-api-staging.onrender.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://qxsjxcbfhxbvxigghhlq.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-test",
      KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "1", // Authorized active window
      KHLIM_STAGING_USER_AAL1_TOKEN: "aal1-token-sample",
      KHLIM_STAGING_ADMIN_AAL2_TOKEN: "admin-aal2-token-sample",
    };

    const results = await runHostedStagingAcceptance(env);

    // 1. Validation test assertions
    assert.equal(
      results.validationCases.length,
      NON_DESTRUCTIVE_VALIDATION_CASES.length,
    );
    assert.ok(results.validationCases.every((c) => c.passed));

    // 2. Initial synthetic lead assertion
    assert.equal(results.leadCreation.httpStatus, 201);
    assert.equal(results.leadCreation.id, leadId);
    assert.equal(results.leadCreation.status, "RECEIVED");

    // 3. Duplicate idempotency replay assertion
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

  // Documentation checks
  assert.match(doc, /qxsjxcbfhxbvxigghhlq/);
  assert.match(doc, /staging\/ric-65-academy-soft-launch/);
  assert.match(doc, /source=3x3-oct24/);
  assert.match(doc, /MFA assurance level 2/);
  assert.match(doc, /MFA AAL2/);
  assert.match(doc, /Do not pause KYNEXA/);
  assert.match(doc, /LEAD_IDEMPOTENCY_CONFLICT/);
});
