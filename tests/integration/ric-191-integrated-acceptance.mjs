/**
 * RIC-191 — Reproducible Local PostgreSQL + NestJS + Web + Admin Integrated Acceptance Harness
 *
 * SAFETY BOUNDARIES (FAIL-CLOSED):
 * 1. Requires `KHLIM_TEST_DATABASE=1`.
 * 2. Requires `DATABASE_URL` pointing strictly to a local loopback host (`localhost`, `127.0.0.1`, `::1`).
 * 3. Requires the target database name to contain `test` (disposable local test database only).
 * 4. Uses 100% synthetic records, synthetic policy refs (`synthetic://`), and ephemeral per-run HMAC keys.
 * 5. Never connects to hosted staging, production, Supabase Cloud, or external payment providers.
 *
 * REAL VS. SIMULATED COMPONENTS:
 * - REAL: Built NestJS `AppModule`, PostgreSQL database with deployed Prisma migrations,
 *   database triggers/constraints/RLS, HMAC blind-index phone search, optimistic concurrency,
 *   server-side RBAC/AAL2 guards (including real HTTP 403 for `ACADEMY_ADMIN` on policy approve),
 *   built `@khlim/web` (zero request interception), and built `@khlim/admin`.
 * - SIMULATED (strictly in-process for local testing without hosted Supabase):
 *   1. `SupabaseJwtService.verify` is stubbed in-process to recognize two synthetic AAL2 staff tokens
 *      (`synthetic-aal2-super-admin` -> SUPER_ADMIN, `synthetic-aal2-academy-admin` -> ACADEMY_ADMIN)
 *      backed by real `User` and `OrganizationMembership` rows in the disposable PostgreSQL database.
 *   2. Playwright attaches `Authorization: Bearer synthetic-aal2-super-admin` on `/v1/admin/**` requests
 *      and calls `route.continue({ headers })` so 100% of HTTP traffic hits the real NestJS server.
 *
 * Usage: see `docs/implementation/ric-191-integrated-acceptance-procedure.md`.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(
  process.env.RIC191_INT_ROOT || path.join(__dirname, "../.."),
);

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const SPORT_ID = "00000000-0000-4000-8000-000000000010";
const PROG_ID = "00000000-0000-4000-8000-000000000101";
const VENUE_ID = "00000000-0000-4000-8000-000000000201";

const SUPER_ADMIN_TOKEN = "synthetic-aal2-super-admin";
const ACADEMY_ADMIN_TOKEN = "synthetic-aal2-academy-admin";

const WEB_PORT = Number(process.env.RIC191_INT_WEB_PORT || 3191);
const ADMIN_PORT = Number(process.env.RIC191_INT_ADMIN_PORT || 3192);
const API_PORT = Number(process.env.RIC191_INT_API_PORT || 3193);

const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const ADMIN_URL = `http://127.0.0.1:${ADMIN_PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}/v1`;

function assertSafeDisposableLocalDatabase() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") {
    throw new Error(
      "Refusing to run: set KHLIM_TEST_DATABASE=1 to opt into disposable local PostgreSQL acceptance.",
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Refusing to run: DATABASE_URL is required.");
  }
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Refusing to run: DATABASE_URL is not a valid URL.");
  }
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
    throw new Error(
      `Refusing to run against non-local database host "${parsed.hostname}". Only localhost/127.0.0.1/::1 is permitted.`,
    );
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to run against database "${dbName}". Disposable database name must include "test".`,
    );
  }
}

function assertIntegratedArtifactsExist() {
  const apiEntry = path.join(REPO_ROOT, "apps/api/dist/app.module.js");
  const regController = path.join(
    REPO_ROOT,
    "apps/api/dist/academy/registration/registration.controllers.js",
  );
  const webBuild = path.join(REPO_ROOT, "apps/web/.next/BUILD_ID");
  const adminBuild = path.join(REPO_ROOT, "apps/admin/.next/BUILD_ID");

  if (!fs.existsSync(apiEntry) || !fs.existsSync(regController)) {
    throw new Error(
      `RIC-190 backend build artifacts not found under ${REPO_ROOT}/apps/api/dist. ` +
        "Until PR #126 is merged into main, run this harness from an isolated integration worktree combining PR #126 + PR #127 (see docs/implementation/ric-191-integrated-acceptance-procedure.md).",
    );
  }
  if (!fs.existsSync(webBuild) || !fs.existsSync(adminBuild)) {
    throw new Error(
      `Built Next.js apps not found under ${REPO_ROOT}/apps/{web,admin}/.next. ` +
        `Build with NEXT_PUBLIC_API_BASE_URL=${API_URL} NEXT_PUBLIC_ADMIN_DEMO_MODE=true pnpm build first.`,
    );
  }
}

function syntheticPolicyContentV1() {
  const hash = (d, i) => `${d.repeat(63)}${i}`;
  return {
    GUARDIAN_AUTHORITY: {
      en: {
        ref: "synthetic://academy-registration/guardian-authority/v1",
        sha256: hash("1", 1),
      },
      ms: {
        ref: "synthetic://academy-registration/guardian-authority/v1",
        sha256: hash("1", 2),
      },
      "zh-Hans": {
        ref: "synthetic://academy-registration/guardian-authority/v1",
        sha256: hash("1", 3),
      },
    },
    REGISTRATION_PRIVACY: {
      en: {
        ref: "synthetic://academy-registration/registration-privacy/v1",
        sha256: hash("2", 1),
      },
      ms: {
        ref: "synthetic://academy-registration/registration-privacy/v1",
        sha256: hash("2", 2),
      },
      "zh-Hans": {
        ref: "synthetic://academy-registration/registration-privacy/v1",
        sha256: hash("2", 3),
      },
    },
    MARKETING: {
      en: {
        ref: "synthetic://academy-registration/marketing/v1",
        sha256: hash("3", 1),
      },
      ms: {
        ref: "synthetic://academy-registration/marketing/v1",
        sha256: hash("3", 2),
      },
      "zh-Hans": {
        ref: "synthetic://academy-registration/marketing/v1",
        sha256: hash("3", 3),
      },
    },
    PHOTOGRAPHY: {
      en: {
        ref: "synthetic://academy-registration/photography/v1",
        sha256: hash("4", 1),
      },
      ms: {
        ref: "synthetic://academy-registration/photography/v1",
        sha256: hash("4", 2),
      },
      "zh-Hans": {
        ref: "synthetic://academy-registration/photography/v1",
        sha256: hash("4", 3),
      },
    },
  };
}

function nextFutureSaturdayIso() {
  const today = new Date();
  const candidate = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + 14,
    ),
  );
  while (candidate.getUTCDay() !== 6) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate.toISOString().slice(0, 10);
}

async function waitForHttpReady(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry until deadline
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startRealNestApi() {
  process.env.KHLIM_ENV = "development";
  process.env.KHLIM_REGISTRATION_HMAC_KEYS = `v1:${randomBytes(32).toString("base64")}`;

  const apiRequire = createRequire(
    path.join(REPO_ROOT, "apps/api/package.json"),
  );
  const rootRequire = createRequire(path.join(REPO_ROOT, "package.json"));

  const { NestFactory } = apiRequire("@nestjs/core");
  const { UnauthorizedException } = apiRequire("@nestjs/common");
  const { AppModule } = rootRequire(
    path.join(REPO_ROOT, "apps/api/dist/app.module.js"),
  );
  const { PrismaService } = rootRequire(
    path.join(REPO_ROOT, "apps/api/dist/database/prisma.service.js"),
  );
  const { SupabaseJwtService } = rootRequire(
    path.join(REPO_ROOT, "apps/api/dist/auth/supabase-jwt.service.js"),
  );

  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn"],
  });
  app.setGlobalPrefix("v1");
  app.enableCors({
    origin: [
      WEB_URL,
      ADMIN_URL,
      `http://localhost:${WEB_PORT}`,
      `http://localhost:${ADMIN_PORT}`,
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  });

  const prisma = app.get(PrismaService).client;

  // Simulated local JWT verification only — backed by real PostgreSQL User & Membership rows
  const identities = new Map([
    [
      SUPER_ADMIN_TOKEN,
      {
        subject: "ric191-int-super-admin",
        email: "super.int@example.test",
        payload: {
          sub: "ric191-int-super-admin",
          aal: "aal2",
          aud: "authenticated",
        },
      },
    ],
    [
      ACADEMY_ADMIN_TOKEN,
      {
        subject: "ric191-int-academy-admin",
        email: "academy.int@example.test",
        payload: {
          sub: "ric191-int-academy-admin",
          aal: "aal2",
          aud: "authenticated",
        },
      },
    ],
  ]);

  app.get(SupabaseJwtService).verify = async (token) => {
    const identity = identities.get(token);
    if (!identity) {
      throw new UnauthorizedException("Invalid synthetic test token");
    }
    return identity;
  };

  // Deterministic clean slate on disposable local test DB
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE academy_registration_consents, academy_registrations, academy_registration_sessions, academy_registration_policies RESTART IDENTITY CASCADE`,
  );

  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      slug: "khlim-synthetic-int",
      name: "KHLIM Synthetic Integration Org",
    },
  });

  const sport = await prisma.sport.upsert({
    where: { code: "BASKETBALL" },
    update: {},
    create: {
      id: SPORT_ID,
      code: "BASKETBALL",
      defaultName: "Basketball",
    },
  });

  await prisma.organizationSport.upsert({
    where: {
      organizationId_sportId: {
        organizationId: ORG_ID,
        sportId: sport.id,
      },
    },
    update: {},
    create: {
      organizationId: ORG_ID,
      sportId: sport.id,
    },
  });

  await prisma.programme.upsert({
    where: { id: PROG_ID },
    update: { active: true, minimumAge: 10, maximumAge: 12 },
    create: {
      id: PROG_ID,
      organizationId: ORG_ID,
      sportId: sport.id,
      code: "ACAD-U12-SYN",
      name: "KHLIM Academy U12 (Synthetic)",
      description: "Synthetic integration test programme",
      minimumAge: 10,
      maximumAge: 12,
      level: "DEVELOPMENT",
      active: true,
    },
  });

  await prisma.venue.upsert({
    where: { id: VENUE_ID },
    update: {},
    create: {
      id: VENUE_ID,
      organizationId: ORG_ID,
      name: "Sports Garage (Synthetic)",
      address: "Petaling Jaya, Selangor",
    },
  });

  for (const [tokenKey, role] of [
    [SUPER_ADMIN_TOKEN, "SUPER_ADMIN"],
    [ACADEMY_ADMIN_TOKEN, "ACADEMY_ADMIN"],
  ]) {
    const ident = identities.get(tokenKey);
    let user = await prisma.user.findUnique({
      where: { authProviderSubject: ident.subject },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          authProviderSubject: ident.subject,
          email: ident.email,
          status: "ACTIVE",
        },
      });
    }
    const existingMembership = await prisma.organizationMembership.findFirst({
      where: { organizationId: ORG_ID, userId: user.id },
    });
    if (!existingMembership) {
      await prisma.organizationMembership.create({
        data: {
          organizationId: ORG_ID,
          userId: user.id,
          status: "ACTIVE",
          roleAssignments: { create: [{ role }] },
        },
      });
    }
  }

  await app.listen(API_PORT, "127.0.0.1");
  return { app, prisma };
}

function startNextServer(pkgFilter, port) {
  const child = spawn(
    "pnpm",
    [
      "--filter",
      pkgFilter,
      "exec",
      "next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    },
  );
  return child;
}

async function stopChild(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
      resolve();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function runIntegratedSteps() {
  const req = createRequire(path.join(REPO_ROOT, "package.json"));
  const { chromium } = req("@playwright/test");

  const browser = await chromium.launch();
  const passed = [];
  const record = (step, detail) => {
    console.log(`[PASS] Step ${step}: ${detail}`);
    passed.push({ step, detail });
  };

  try {
    // Admin browser context attaches synthetic AAL2 Bearer token ONLY and forwards all traffic to real API
    const adminContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const adminPage = await adminContext.newPage();
    await adminPage.route(`${API_URL}/admin/**`, async (route) => {
      const headers = {
        ...route.request().headers(),
        authorization: `Bearer ${SUPER_ADMIN_TOKEN}`,
      };
      await route.continue({ headers });
    });

    // Public parent context has zero interception (100% direct to real API)
    const webContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const webPage = await webContext.newPage();

    const initialPub = await fetch(`${API_URL}/academy/sessions`).then((r) =>
      r.json(),
    );
    assert.equal(
      initialPub.registrationOpen,
      false,
      "Registration must be closed before policy approval",
    );

    // Step 1: Create synthetic consent policy via Admin UI
    await adminPage.goto(`${ADMIN_URL}/registrations`, {
      waitUntil: "networkidle",
    });
    await adminPage.getByRole("tab", { name: /Consent Policies/i }).click();
    await adminPage
      .getByTestId("no-current-approved-policy-card")
      .waitFor({ state: "visible" });

    await adminPage.getByTestId("create-policy-draft-btn").click();
    await adminPage.fill("#policy-version-input", "SYNTHETIC-V1");
    const content = syntheticPolicyContentV1();
    for (const [cat, byLocale] of Object.entries(content)) {
      for (const [loc, val] of Object.entries(byLocale)) {
        await adminPage.fill(`#policy-ref-${cat}-${loc}`, val.ref);
        await adminPage.fill(`#policy-sha-${cat}-${loc}`, val.sha256);
      }
    }
    await adminPage.getByTestId("submit-policy-draft-btn").click();
    await adminPage
      .getByTestId("policies-action-banner")
      .waitFor({ state: "visible" });
    record(
      1,
      "Created synthetic consent policy draft SYNTHETIC-V1 in PostgreSQL",
    );

    // Verify real backend RBAC authorization: ACADEMY_ADMIN receives HTTP 403 on policy approval
    const policiesRes = await fetch(
      `${API_URL}/admin/academy/registration-policies`,
      { headers: { Authorization: `Bearer ${SUPER_ADMIN_TOKEN}` } },
    ).then((r) => r.json());
    assert.equal(policiesRes.current, null);
    assert.equal(policiesRes.items.length, 1);
    const policyId = policiesRes.items[0].id;
    const forbiddenApprove = await fetch(
      `${API_URL}/admin/academy/registration-policies/${policyId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACADEMY_ADMIN_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expectedVersion: 1 }),
      },
    );
    assert.equal(
      forbiddenApprove.status,
      403,
      "Real API RBAC must reject ACADEMY_ADMIN policy approval with 403",
    );

    // Step 2: Approve policy via SUPER_ADMIN UI
    await adminPage.getByTestId(`approve-policy-${policyId}`).click();
    await adminPage.getByRole("button", { name: "Approve Policy" }).click();
    await adminPage
      .getByTestId("current-approved-policy-card")
      .waitFor({ state: "visible" });
    record(
      2,
      "Approved SYNTHETIC-V1 via SUPER_ADMIN UI (and verified real API 403 for ACADEMY_ADMIN)",
    );

    // Step 3: Create and publish synthetic training session (capacity = 1)
    await adminPage.getByRole("tab", { name: /Training Sessions/i }).click();
    await adminPage
      .getByTestId("sessions-empty-state")
      .waitFor({ state: "visible" });

    const firstDate = nextFutureSaturdayIso();
    const ageRefDate = `${firstDate.slice(0, 4)}-12-31`;

    await adminPage.getByTestId("create-session-draft-btn").click();
    await adminPage
      .getByTestId("session-editor-form")
      .waitFor({ state: "visible" });
    await adminPage.waitForFunction(
      () =>
        !document
          .querySelector("#session-programme-id")
          ?.hasAttribute("disabled"),
    );
    await adminPage.selectOption("#session-programme-id", PROG_ID);
    await adminPage.fill("#session-name", "Synthetic U12 Int Saturday");
    await adminPage.selectOption("#session-venue-id", VENUE_ID);
    await adminPage.fill("#session-capacity", "1");
    await adminPage.fill("#session-coach-name", "Coach Sengjun");
    await adminPage.selectOption("#session-weekday", "6");
    await adminPage.fill("#session-start-time", "14:00");
    await adminPage.fill("#session-end-time", "16:00");
    await adminPage.fill("#session-first-date", firstDate);
    await adminPage.selectOption("#session-recurrence", "WEEKLY");
    await adminPage.selectOption("#session-age-rule", "FIXED_DATE");
    await adminPage.fill("#session-age-ref-date", ageRefDate);
    await adminPage.getByTestId("save-session-btn").click();
    await adminPage
      .getByTestId("sessions-action-banner")
      .waitFor({ state: "visible" });

    const sessionsAfterCreate = await fetch(
      `${API_URL}/admin/academy/registration-sessions`,
      { headers: { Authorization: `Bearer ${SUPER_ADMIN_TOKEN}` } },
    ).then((r) => r.json());
    assert.equal(sessionsAfterCreate.items.length, 1);
    const sessionId = sessionsAfterCreate.items[0].id;

    await adminPage.getByTestId(`publish-session-${sessionId}`).click();
    await adminPage.check("#publish-schedule-approved");
    await adminPage.check("#publish-age-rule-approved");
    await adminPage.getByRole("button", { name: "Publish Session" }).click();
    await adminPage.waitForFunction(() =>
      document.body.innerText.includes("is now PUBLISHED"),
    );
    record(
      3,
      `Created and published session ${sessionId} (capacity=1, firstDate=${firstDate})`,
    );

    // Steps 4 & 5: Parent completes public 3-step registration & receives non-reserving receipt
    let capturedIdempotencyKey = null;
    let capturedSubmitPayload = null;
    let capturedSubmitStatus = null;
    webPage.on("request", (reqObj) => {
      if (
        reqObj.url().endsWith("/v1/academy/registrations") &&
        reqObj.method() === "POST"
      ) {
        capturedIdempotencyKey = reqObj.headers()["idempotency-key"] ?? null;
        capturedSubmitPayload = reqObj.postDataJSON();
      }
    });
    webPage.on("response", (resObj) => {
      if (
        resObj.url().endsWith("/v1/academy/registrations") &&
        resObj.request().method() === "POST"
      ) {
        capturedSubmitStatus = resObj.status();
      }
    });

    await webPage.goto(`${WEB_URL}/academy?source=int-acceptance`, {
      waitUntil: "networkidle",
    });
    await webPage
      .getByText("Synthetic U12 Int Saturday")
      .waitFor({ state: "visible" });
    await webPage.getByTestId(`register-now-${sessionId}`).click();
    await webPage.waitForURL(/\/academy\/register/);

    const refYear = Number(ageRefDate.slice(0, 4));
    const dob = `${refYear - 11}-05-15`;

    await webPage.fill("#player-full-name", "Synthetic Int Player One");
    await webPage.fill("#player-dob", dob);
    await webPage.selectOption("#player-gender", "MALE");
    await webPage.selectOption("#player-jersey-size", "YM");
    await webPage.getByTestId("step1-next-btn").click();

    await webPage.fill("#guardian-full-name", "Synthetic Int Guardian One");
    await webPage.fill("#guardian-phone", "012-345 6789");
    await webPage.selectOption("#guardian-relationship", "MOTHER");
    await webPage.fill("#emergency-full-name", "Synthetic Int Emergency One");
    await webPage.fill("#emergency-phone", "013-987 6543");
    await webPage.selectOption("#emergency-relationship", "GRANDPARENT");
    await webPage.getByTestId("step2-next-btn").click();

    await webPage.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await webPage.check("#consent-checkbox-REGISTRATION_PRIVACY");
    await webPage.getByTestId("registration-submit-btn").click();

    await webPage
      .getByTestId("registration-receipt-card")
      .waitFor({ state: "visible" });
    const refCode1 = (
      await webPage.getByTestId("receipt-reference-code").innerText()
    ).trim();
    assert.match(refCode1, /^KAR-/);
    assert.equal(capturedSubmitStatus, 201);
    assert.ok(capturedIdempotencyKey && capturedIdempotencyKey.length >= 22);
    const receiptBody = await webPage
      .getByTestId("registration-receipt-card")
      .innerText();
    assert.match(receiptBody, /No training place is reserved/i);
    record(
      4,
      `Parent submitted public registration via Web UI -> real HTTP 201 (${refCode1})`,
    );
    record(
      5,
      `Parent received non-reserving receipt (${refCode1}, reservesPlace: false)`,
    );

    // Submit 2nd RECEIVED registration while capacity=1 has 0 confirmed seats to test Step 9 over-confirmation
    const reg2Res = await fetch(`${API_URL}/academy/registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `ric191-int-reg2-${Date.now()}-${randomUUID().slice(0, 8)}`,
      },
      body: JSON.stringify({
        ...capturedSubmitPayload,
        player: {
          ...capturedSubmitPayload.player,
          fullName: "Synthetic Int Player Two",
        },
        guardian: {
          ...capturedSubmitPayload.guardian,
          fullName: "Synthetic Int Guardian Two",
          phone: "+60128889999",
        },
      }),
    });
    assert.equal(reg2Res.status, 201);
    const reg2Json = await reg2Res.json();

    // Step 6: Admin locates registration via authoritative session filter & Malaysian local phone POST search (HTTP 200)
    await adminPage.getByRole("tab", { name: /Registrations/i }).click();
    await adminPage.waitForFunction(() =>
      document.body.innerText.includes("Synthetic Int Player One"),
    );
    await adminPage.selectOption("#registration-session-filter", sessionId);

    let searchStatus = null;
    adminPage.on("response", (resObj) => {
      if (resObj.url().endsWith("/v1/admin/academy/registrations/search")) {
        searchStatus = resObj.status();
      }
    });
    await adminPage.locator('input[type="search"]').fill("012-345 6789");
    await adminPage.waitForFunction(
      (code) =>
        document.body.innerText.includes(code) &&
        !document.body.innerText.includes("Synthetic Int Player Two"),
      refCode1,
    );
    assert.equal(searchStatus, 200);

    await adminPage.getByRole("button", { name: "Review" }).first().click();
    await adminPage
      .getByText("Review & Status Transition")
      .waitFor({ state: "visible" });
    await adminPage.getByText("+60123456789").waitFor({ state: "visible" });
    record(
      6,
      `Admin located ${refCode1} via authoritative session filter & Malaysian local phone POST search (HTTP 200)`,
    );

    // Step 7: Admin confirms registration (RECEIVED -> CONFIRMED)
    await adminPage.selectOption("#registration-next-status", "CONFIRMED");
    await adminPage.getByTestId("open-status-confirm-btn").click();
    await adminPage
      .getByRole("button", { name: "Confirm Status Change" })
      .click();
    await adminPage
      .getByTestId("status-update-feedback")
      .waitFor({ state: "visible" });
    assert.match(
      await adminPage.getByTestId("status-update-feedback").innerText(),
      /CONFIRMED/,
    );
    await adminPage.getByRole("button", { name: "Close drawer" }).click();
    record(7, `Admin confirmed registration ${refCode1} in PostgreSQL`);

    // Step 8: Authoritative confirmed seat count updates to 1 / 1 (0 remaining)
    await adminPage.getByRole("tab", { name: /Training Sessions/i }).click();
    await adminPage.waitForFunction(
      () =>
        document.body.innerText.includes("1 / 1 confirmed") &&
        document.body.innerText.includes("0 remaining"),
    );
    record(
      8,
      "Confirmed seat count updated authoritatively to 1 / 1 confirmed (0 remaining)",
    );

    // Step 9: Capacity constraints block confirming 2nd registration & reject new public submit
    await adminPage.getByRole("tab", { name: /Registrations/i }).click();
    await adminPage
      .locator('input[type="search"]')
      .fill(reg2Json.referenceCode);
    await adminPage.waitForFunction(
      (code) => document.body.innerText.includes(code),
      reg2Json.referenceCode,
    );
    await adminPage.getByRole("button", { name: "Review" }).first().click();
    await adminPage.selectOption("#registration-next-status", "CONFIRMED");
    await adminPage.getByTestId("open-status-confirm-btn").click();
    await adminPage
      .getByRole("button", { name: "Confirm Status Change" })
      .click();
    await adminPage
      .getByTestId("status-update-feedback")
      .waitFor({ state: "visible" });
    assert.match(
      await adminPage.getByTestId("status-update-feedback").innerText(),
      /capacity|full/i,
    );
    await adminPage.getByRole("button", { name: "Close drawer" }).click();

    const pubFull = await fetch(`${API_URL}/academy/sessions`).then((r) =>
      r.json(),
    );
    assert.equal(pubFull.registrationOpen, true);
    assert.equal(pubFull.items.length, 0);
    const fullSubmitRes = await fetch(`${API_URL}/academy/registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `ric191-int-full-${Date.now()}-${randomUUID().slice(0, 8)}`,
      },
      body: JSON.stringify({
        ...capturedSubmitPayload,
        player: {
          ...capturedSubmitPayload.player,
          fullName: "Synthetic Int Player Full",
        },
      }),
    });
    assert.equal(fullSubmitRes.status, 409);
    assert.equal((await fullSubmitRes.json()).code, "SESSION_FULL");
    record(
      9,
      `Capacity enforcement blocked confirming ${reg2Json.referenceCode} (CAPACITY_EXCEEDED) & rejected public submit (409 SESSION_FULL)`,
    );

    // Step 10: Terminal session closure blocks new registrations
    await adminPage.getByRole("tab", { name: /Training Sessions/i }).click();
    await adminPage.getByTestId(`close-session-${sessionId}`).click();
    await adminPage.getByRole("button", { name: "Close Session" }).click();
    await adminPage.waitForFunction(() =>
      document.body.innerText.includes("is now CLOSED"),
    );

    const closedSubmitRes = await fetch(`${API_URL}/academy/registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `ric191-int-closed-${Date.now()}-${randomUUID().slice(0, 8)}`,
      },
      body: JSON.stringify({
        ...capturedSubmitPayload,
        player: {
          ...capturedSubmitPayload.player,
          fullName: "Synthetic Int Player Closed",
        },
      }),
    });
    assert.equal(closedSubmitRes.status, 409);
    assert.equal((await closedSubmitRes.json()).code, "SESSION_NOT_AVAILABLE");
    record(
      10,
      `Closed session ${sessionId} -> new registration rejected with 409 SESSION_NOT_AVAILABLE`,
    );

    // Step 11: Identical retry with original Idempotency-Key returns HTTP 200 with original receipt
    const replayRes = await fetch(`${API_URL}/academy/registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": capturedIdempotencyKey,
      },
      body: JSON.stringify(capturedSubmitPayload),
    });
    assert.equal(replayRes.status, 200);
    const replayJson = await replayRes.json();
    assert.equal(replayJson.referenceCode, refCode1);
    assert.equal(replayJson.reservesPlace, false);
    record(
      11,
      `Identical Idempotency-Key replay returned HTTP 200 (${refCode1}) even after closure`,
    );

    // Step 12: Retiring current policy immediately closes public registration
    await adminPage.getByRole("tab", { name: /Consent Policies/i }).click();
    await adminPage.getByTestId("retire-current-policy-btn").click();
    await adminPage.getByRole("button", { name: "Retire Policy" }).click();
    await adminPage
      .getByTestId("no-current-approved-policy-card")
      .waitFor({ state: "visible" });

    const pubAfterRetire = await fetch(`${API_URL}/academy/sessions`).then(
      (r) => r.json(),
    );
    assert.equal(pubAfterRetire.registrationOpen, false);
    assert.deepEqual(pubAfterRetire.items, []);
    await webPage.goto(`${WEB_URL}/academy/register`, {
      waitUntil: "networkidle",
    });
    await webPage
      .getByTestId("registration-page-closed")
      .waitFor({ state: "visible" });
    record(
      12,
      "Retired current policy SYNTHETIC-V1 -> public registration closed (registrationOpen: false)",
    );

    console.log(
      `\n=== ALL ${passed.length}/12 REPRODUCIBLE POSTGRES INTEGRATED ACCEPTANCE STEPS PASSED ===`,
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  assertSafeDisposableLocalDatabase();
  assertIntegratedArtifactsExist();

  let nestHandle = null;
  let webProc = null;
  let adminProc = null;

  try {
    nestHandle = await startRealNestApi();
    webProc = startNextServer("@khlim/web", WEB_PORT);
    adminProc = startNextServer("@khlim/admin", ADMIN_PORT);

    await Promise.all([
      waitForHttpReady(`${WEB_URL}/academy`),
      waitForHttpReady(`${ADMIN_URL}/registrations`),
    ]);

    await runIntegratedSteps();
  } finally {
    await Promise.all([stopChild(webProc), stopChild(adminProc)]);
    if (nestHandle?.app) {
      await nestHandle.app.close().catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error("RIC-191 INTEGRATED ACCEPTANCE FAILED:", error);
  process.exit(1);
});
