import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  STAGING_SUPABASE_PROJECT_ID,
  DEDICATED_STAGING_BRANCH,
  NON_DESTRUCTIVE_VALIDATION_CASES,
  maskEmail,
  maskPhone,
  maskName,
  validateSupabaseTarget,
  validateApiTarget,
  generateSyntheticLead,
  runHostedStagingAcceptance,
} from "../scripts/verify-hosted-staging-acceptance.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("validateSupabaseTarget enforces project qxsjxcbfhxbvxigghhlq, HTTPS, and non-production targets", () => {
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

  // Rejects wrong Supabase project
  assert.throws(
    () => validateSupabaseTarget("https://wrongprojectid12345.supabase.co"),
    /STAGING_TARGET_VIOLATION.*qxsjxcbfhxbvxigghhlq/,
  );

  // Rejects production marker in URL
  assert.throws(
    () =>
      validateSupabaseTarget(
        "https://qxsjxcbfhxbvxigghhlq-production.supabase.co",
      ),
    /STAGING_TARGET_VIOLATION.*production/,
  );

  // Rejects placeholder
  assert.throws(
    () =>
      validateSupabaseTarget(
        "https://qxsjxcbfhxbvxigghhlq-replace-with-actual.supabase.co",
      ),
    /STAGING_TARGET_VIOLATION/,
  );
});

test("validateApiTarget enforces HTTPS, non-localhost, and non-production hosts", () => {
  // Valid staging API URL
  const valid = validateApiTarget("https://khlim-api-staging.onrender.com");
  assert.equal(valid.hostname, "khlim-api-staging.onrender.com");

  // Rejects HTTP
  assert.throws(
    () => validateApiTarget("http://khlim-api-staging.onrender.com"),
    /must use HTTPS/,
  );

  // Rejects localhost / 127.0.0.1
  assert.throws(
    () => validateApiTarget("https://localhost:3001"),
    /must point to a deployed hosted staging service/,
  );
  assert.throws(
    () => validateApiTarget("https://127.0.0.1:3001"),
    /must point to a deployed hosted staging service/,
  );

  // Rejects production domains
  assert.throws(
    () => validateApiTarget("https://api.khlim.com"),
    /STAGING_TARGET_VIOLATION.*production/,
  );
  assert.throws(
    () => validateApiTarget("https://khlim.com"),
    /STAGING_TARGET_VIOLATION.*production/,
  );
});

test("PII masking utilities protect emails, phones, and personal names", () => {
  // Mask email
  assert.match(
    maskEmail("synthetic.parent@synthetic.khlim.test"),
    /^s\*\*\*t@synthetic\.khlim\.test$/,
  );
  assert.equal(maskEmail(null), "***");
  assert.equal(maskEmail("invalid-email"), "***");

  // Mask phone
  const maskedPhone = maskPhone("+60123456789");
  assert.equal(maskedPhone, "+6012***789");
  assert.ok(!maskedPhone.includes("3456"));
  assert.equal(maskPhone(null), "***");

  // Mask name
  const maskedName = maskName("Synthetic Parent Malaysian");
  assert.equal(maskedName, "S*** P*** M***");
  assert.equal(maskName(null), "***");
});

test("generateSyntheticLead creates valid synthetic payloads with explicit consent and 3x3-oct24 attribution", () => {
  const lead = generateSyntheticLead("test-123");
  assert.equal(lead.guardianName, "Synthetic Parent test-123");
  assert.equal(lead.email, "staging-synth-test-123@synthetic.khlim.test");
  assert.match(lead.phone, /^\+6012\d{7}$/);
  assert.equal(lead.childAge, 10);
  assert.equal(lead.consent, true);
  assert.equal(lead.source, "3x3-oct24");
  assert.match(
    lead.idempotencyKey,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
});

test("hosted staging runner fails closed when required staging variables are missing", async () => {
  await assert.rejects(
    () => runHostedStagingAcceptance({}),
    /KHLIM_STAGING_API_URL is missing or still a placeholder/,
  );

  await assert.rejects(
    () =>
      runHostedStagingAcceptance({
        KHLIM_STAGING_API_URL: "https://api-staging.test",
        NEXT_PUBLIC_SUPABASE_URL: "replace-with-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      }),
    /NEXT_PUBLIC_SUPABASE_URL is missing or still a placeholder/,
  );
});

test("safety gate halts before hosted mutations when active window is not authorized", async () => {
  const origFetch = globalThis.fetch;
  const recordedRequests = [];

  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    recordedRequests.push({ url: urlStr, method: options.method || "GET" });

    if (urlStr.endsWith("/v1/health")) {
      return { ok: true, status: 200, json: async () => ({ status: "ok" }) };
    }
    if (urlStr.endsWith("/auth/v1/health")) {
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return { ok: true, status: 200 };
  };

  try {
    const env = {
      KHLIM_STAGING_API_URL: "https://api-staging.khlim.test",
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

test("authorized active window verifies non-destructive cases, lead creation, duplicate idempotency, and MFA AAL2 retrieval", async () => {
  const origFetch = globalThis.fetch;
  const recordedRequests = [];
  let leadCreatedInDb = null;
  const leadId = "c2a95d10-8b9a-4e89-a2e6-7a13c9a0b123";

  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : null;
    recordedRequests.push({
      url: urlStr,
      method,
      body,
      headers: options.headers,
    });

    // Health endpoints
    if (urlStr.endsWith("/v1/health")) {
      return { ok: true, status: 200, json: async () => ({ status: "ok" }) };
    }
    if (urlStr.endsWith("/auth/v1/health")) {
      return { ok: true, status: 200, json: async () => ({}) };
    }

    // Lead submission endpoint
    if (urlStr.endsWith("/v1/academy/leads")) {
      if (method === "POST") {
        // Validation rejections
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

        // Idempotency conflict simulation
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

        // Duplicate replay simulation
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

        // Initial creation
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

    // Admin endpoints
    if (urlStr.includes("/v1/admin/academy/leads")) {
      const authHeader = options.headers?.Authorization;
      if (!authHeader) {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            message: "Authenticated user context is required",
          }),
        };
      }
      if (authHeader.includes("aal1-token")) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ message: "MFA assurance level 2 is required" }),
        };
      }
      if (authHeader.includes("admin-aal2-token")) {
        if (urlStr.endsWith(`/v1/admin/academy/leads/${leadId}`)) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: leadId,
              source: "3x3-oct24",
              status: "NEW",
              guardianName: leadCreatedInDb?.guardianName,
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            leads: [
              {
                id: leadId,
                source: "3x3-oct24",
                status: "NEW",
                guardianName: leadCreatedInDb?.guardianName,
              },
            ],
            total: 1,
          }),
        };
      }
    }

    return { ok: false, status: 404 };
  };

  try {
    const env = {
      KHLIM_STAGING_API_URL: "https://api-staging.khlim.test",
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
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("RIC-65 workflow and documentation strictly encode staging targets, manual dispatch, and security invariants", async () => {
  const workflow = await read(
    ".github/workflows/ric-65-hosted-staging-acceptance.yml",
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

  // Documentation checks
  assert.match(doc, /qxsjxcbfhxbvxigghhlq/);
  assert.match(doc, /staging\/ric-65-academy-soft-launch/);
  assert.match(doc, /source=3x3-oct24/);
  assert.match(doc, /MFA assurance level 2/);
  assert.match(doc, /MFA AAL2/);
  assert.match(doc, /Do not pause KYNEXA/);
  assert.match(doc, /LEAD_IDEMPOTENCY_CONFLICT/);
});
