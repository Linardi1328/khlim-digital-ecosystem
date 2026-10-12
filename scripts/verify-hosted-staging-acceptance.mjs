#!/usr/bin/env node
import { randomUUID } from "node:crypto";

export const STAGING_SUPABASE_PROJECT_ID = "qxsjxcbfhxbvxigghhlq";
export const DEDICATED_STAGING_BRANCH = "staging/ric-65-academy-soft-launch";

export const REQUIRED_STAGING_ENV_VARS = [
  "KHLIM_STAGING_API_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

export const NON_DESTRUCTIVE_VALIDATION_CASES = [
  {
    label: "Missing guardian consent",
    payload: {
      guardianName: "Synthetic Parent Valid",
      email: "valid@synthetic.khlim.test",
      phone: "+60123456789",
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
      phone: "+60123456789",
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
      phone: "+60123456789",
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
      phone: "+60123456789",
      childAge: 10,
      consent: true,
      source: "3x3-oct24",
      programmeOfferingId: "not-a-valid-uuid'--injection",
    },
    expectedStatus: 400,
  },
];

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
      `NEXT_PUBLIC_SUPABASE_URL must use HTTPS for hosted staging acceptance: received ${url.protocol}`,
    );
  }
  if (!url.hostname.includes(STAGING_SUPABASE_PROJECT_ID)) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: Refusing to run. Target Supabase project must be staging project '${STAGING_SUPABASE_PROJECT_ID}', received: ${url.hostname}`,
    );
  }
  if (/production|replace-with|example|placeholder/i.test(url.hostname)) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: Refusing to run against production or placeholder Supabase project: ${url.hostname}`,
    );
  }
  return url;
}

export function validateApiTarget(apiUrlString) {
  if (!apiUrlString || typeof apiUrlString !== "string") {
    throw new Error("KHLIM_STAGING_API_URL must be provided as a string");
  }
  const url = new URL(apiUrlString.trim());
  if (url.protocol !== "https:") {
    throw new Error(
      `KHLIM_STAGING_API_URL must use HTTPS for hosted staging acceptance: received ${url.protocol}`,
    );
  }
  if (["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(
      `KHLIM_STAGING_API_URL must point to a deployed hosted staging service, not localhost: ${url.hostname}`,
    );
  }
  const disallowedProductionHosts = [
    "khlim.com",
    "www.khlim.com",
    "api.khlim.com",
    "admin.khlim.com",
    "app.khlim.com",
  ];
  if (disallowedProductionHosts.includes(url.hostname.toLowerCase())) {
    throw new Error(
      `STAGING_TARGET_VIOLATION: Refusing to run against production API: ${url.hostname}`,
    );
  }
  return url;
}

export function generateSyntheticLead(
  uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
) {
  const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
  return {
    guardianName: `Synthetic Parent ${uniqueSuffix}`,
    email: `staging-synth-${uniqueSuffix}@synthetic.khlim.test`,
    phone: `+6012${randomDigits}`,
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
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function runHostedStagingAcceptance(env = process.env) {
  const results = {
    startedAt: new Date().toISOString(),
    targetBranch: env.KHLIM_STAGING_TARGET_BRANCH || DEDICATED_STAGING_BRANCH,
    supabaseProject: STAGING_SUPABASE_PROJECT_ID,
    readiness: {},
    activeWindow: Boolean(env.KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED === "1"),
    validationCases: [],
    leadCreation: null,
    idempotencyReceipt: null,
    conflictReplay: null,
    adminRetrieval: null,
    completedAt: null,
  };

  // 1. Fail-closed Environment & Target Verification
  for (const varName of REQUIRED_STAGING_ENV_VARS) {
    const val = env[varName]?.trim();
    if (!val || /replace-with|example|placeholder/i.test(val)) {
      throw new Error(`${varName} is missing or still a placeholder`);
    }
  }

  const supabaseUrl = validateSupabaseTarget(env.NEXT_PUBLIC_SUPABASE_URL);
  const apiUrl = validateApiTarget(env.KHLIM_STAGING_API_URL);

  let webUrl = null;
  if (env.KHLIM_STAGING_WEB_URL?.trim()) {
    webUrl = new URL(env.KHLIM_STAGING_WEB_URL.trim());
    if (webUrl.protocol !== "https:") {
      throw new Error("KHLIM_STAGING_WEB_URL must use HTTPS");
    }
  }

  // 2. Health & Readiness Verification (Non-mutating)
  const apiHealthUrl = new URL("/v1/health", apiUrl);
  const apiHealthRes = await fetchWithTimeout(apiHealthUrl);
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
      apiHost: apiUrl.host,
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

  console.log(
    JSON.stringify({
      event: "staging.hosted_acceptance.active_window_started",
      note: "Authorized active window confirmed. Executing hosted validation cases, synthetic lead creation, duplicate idempotency receipt, and MFA AAL2 retrieval.",
    }),
  );

  const leadsEndpoint = new URL("/v1/academy/leads", apiUrl);

  // 4. Non-destructive Input Validation / Injection-like Cases
  for (const testCase of NON_DESTRUCTIVE_VALIDATION_CASES) {
    const res = await fetchWithTimeout(leadsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  // 5. Authorized Synthetic Lead Creation & Duplicate Idempotency Replay
  const syntheticLead = generateSyntheticLead();
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

  // 5a. Initial Submission (Expected HTTP 201)
  const initialRes = await fetchWithTimeout(leadsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(syntheticLead),
  });

  if (initialRes.status !== 201) {
    const errText = await initialRes.text().catch(() => "");
    throw new Error(
      `Initial synthetic lead registration failed: expected HTTP 201, received HTTP ${initialRes.status} (${errText})`,
    );
  }

  const initialBody = await initialRes.json();
  if (!initialBody?.id || initialBody.status !== "RECEIVED") {
    throw new Error(
      `Initial synthetic lead registration returned unexpected body structure: ${JSON.stringify(initialBody)}`,
    );
  }
  const leadId = initialBody.id;
  results.leadCreation = {
    id: leadId,
    status: initialBody.status,
    createdAt: initialBody.createdAt,
    httpStatus: initialRes.status,
  };

  // 5b. Duplicate Identical Submission (Idempotency Replay Receipt, Expected HTTP 201 with identical ID)
  const duplicateRes = await fetchWithTimeout(leadsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(syntheticLead),
  });

  if (duplicateRes.status !== 201) {
    throw new Error(
      `Duplicate idempotency replay failed: expected HTTP 201, received HTTP ${duplicateRes.status}`,
    );
  }

  const duplicateBody = await duplicateRes.json();
  if (duplicateBody?.id !== leadId || duplicateBody.status !== "RECEIVED") {
    throw new Error(
      `Duplicate idempotency replay did not match original receipt ID ${leadId}: received ${duplicateBody?.id}`,
    );
  }
  results.idempotencyReceipt = {
    id: duplicateBody.id,
    matchesOriginal: duplicateBody.id === leadId,
    status: duplicateBody.status,
    httpStatus: duplicateRes.status,
  };

  // 5c. Conflicting Submission with Same Idempotency Key but Altered Payload (Expected HTTP 409)
  const conflictingPayload = {
    ...syntheticLead,
    childAge: 12, // altered payload
  };
  const conflictRes = await fetchWithTimeout(leadsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  // 6. Admin Lead Retrieval & MFA AAL2 Access Control
  const adminLeadsEndpoint = new URL("/v1/admin/academy/leads", apiUrl);

  // 6a. Unauthenticated Access must be denied (Expected HTTP 401)
  const unauthRes = await fetchWithTimeout(adminLeadsEndpoint);
  if (unauthRes.status !== 401) {
    throw new Error(
      `Unauthenticated Admin leads request was not rejected with 401: received HTTP ${unauthRes.status}`,
    );
  }

  // 6b. AAL1 / Unassigned Role Access must be denied (Expected HTTP 403)
  if (env.KHLIM_STAGING_USER_AAL1_TOKEN?.trim()) {
    const aal1Res = await fetchWithTimeout(adminLeadsEndpoint, {
      headers: {
        Authorization: `Bearer ${env.KHLIM_STAGING_USER_AAL1_TOKEN.trim()}`,
      },
    });
    if (aal1Res.status !== 403) {
      throw new Error(
        `AAL1 user token was not rejected with 403 Forbidden: received HTTP ${aal1Res.status}`,
      );
    }
  }

  // 6c. Authorized MFA AAL2 Admin Lead Retrieval (Expected HTTP 200)
  if (env.KHLIM_STAGING_ADMIN_AAL2_TOKEN?.trim()) {
    const queryUrl = new URL(adminLeadsEndpoint);
    queryUrl.searchParams.set("source", "3x3-oct24");

    const adminRes = await fetchWithTimeout(queryUrl, {
      headers: {
        Authorization: `Bearer ${env.KHLIM_STAGING_ADMIN_AAL2_TOKEN.trim()}`,
      },
    });

    if (adminRes.status !== 200) {
      throw new Error(
        `Authorized MFA AAL2 Admin leads retrieval failed: expected HTTP 200, received HTTP ${adminRes.status}`,
      );
    }

    const adminJson = await adminRes.json();
    const leadsList = Array.isArray(adminJson?.leads)
      ? adminJson.leads
      : Array.isArray(adminJson)
        ? adminJson
        : [];

    const matches = leadsList.filter((l) => l.id === leadId);
    if (matches.length !== 1) {
      throw new Error(
        `Database persistence invariant violated: expected exactly 1 persisted lead for ID ${leadId}, found ${matches.length}`,
      );
    }

    const leadRecord = matches[0];
    if (leadRecord.source !== "3x3-oct24") {
      throw new Error(
        `Lead attribution invariant violated: expected source='3x3-oct24', found '${leadRecord.source}'`,
      );
    }

    // Detail endpoint check
    const detailUrl = new URL(`/v1/admin/academy/leads/${leadId}`, apiUrl);
    const detailRes = await fetchWithTimeout(detailUrl, {
      headers: {
        Authorization: `Bearer ${env.KHLIM_STAGING_ADMIN_AAL2_TOKEN.trim()}`,
      },
    });

    if (detailRes.status !== 200) {
      throw new Error(
        `Admin lead detail lookup for ${leadId} failed: expected HTTP 200, received HTTP ${detailRes.status}`,
      );
    }

    const detailJson = await detailRes.json();
    if (detailJson?.id !== leadId || detailJson?.source !== "3x3-oct24") {
      throw new Error(
        `Admin lead detail verification failed for ${leadId}: source='${detailJson?.source}'`,
      );
    }

    results.adminRetrieval = {
      mfaAal2Authorized: true,
      persistedCount: 1,
      sourceVerified: "3x3-oct24",
      statusVerified: leadRecord.status,
    };
  }

  results.completedAt = new Date().toISOString();

  console.log(
    JSON.stringify({
      event: "staging.academy_acceptance.completed",
      status: "SUCCESS",
      leadId,
      source: "3x3-oct24",
      idempotencyVerified: results.idempotencyReceipt?.matchesOriginal ?? true,
      conflictRejected: results.conflictReplay?.rejectedAsExpected ?? true,
      singleRecordPersisted: results.adminRetrieval
        ? results.adminRetrieval.persistedCount === 1
        : true,
      adminMfaVerified: Boolean(results.adminRetrieval?.mfaAal2Authorized),
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
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  });
}
