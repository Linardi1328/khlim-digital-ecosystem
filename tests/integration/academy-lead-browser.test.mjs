import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const { NestFactory } = require("@nestjs/core");
const { UnauthorizedException } = require("@nestjs/common");
const { AppModule } = require("./dist/app.module.js");
const { PrismaService } = require("./dist/database/prisma.service.js");
const { SupabaseJwtService } = require("./dist/auth/supabase-jwt.service.js");
const {
  AcademyLeadsService,
} = require("./dist/academy/academy-leads.service.js");
const organizationId = "00000000-0000-4000-8000-000000000001";
const enabled = process.env.KHLIM_TEST_BROWSER_DATABASE === "1";
if (enabled) {
  const url = new URL(process.env.DATABASE_URL);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !url.pathname.endsWith("_browser_test")
  ) {
    throw new Error(
      "Browser acceptance requires an isolated local *_browser_test database",
    );
  }
}

async function startNext(app, port) {
  const appRoot = `${root}apps/${app}`;
  const appRequire = createRequire(`${appRoot}/package.json`);
  const child = spawn(
    process.execPath,
    [
      appRequire.resolve("next/dist/bin/next"),
      "start",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PUBLIC_ADMIN_DEMO_MODE: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (data) => {
    output = (output + data).slice(-20000);
  });
  child.stderr.on("data", (data) => {
    output = (output + data).slice(-20000);
  });
  child.on("error", (error) => {
    output += error.message;
  });
  return {
    async ready() {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null)
          throw new Error(`${app} exited: ${output}`);
        try {
          const response = await fetch(
            `http://127.0.0.1:${port}/${app === "web" ? "interest" : "login"}`,
            { signal: AbortSignal.timeout(3000) },
          );
          if (response.ok) return;
        } catch {
          /* Wait for startup, with a bounded deadline. */
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw new Error(`${app} startup timed out: ${output}`);
    },
    async stop() {
      child.kill("SIGTERM");
      const force = setTimeout(() => child.kill("SIGKILL"), 5000);
      force.unref();
      if (child.exitCode === null)
        await new Promise((resolve) => child.once("exit", resolve));
      clearTimeout(force);
      await writeFile(`${root}test-results/academy-lead-${app}.log`, output);
    },
  };
}

async function fillInterest(page, name, phone) {
  await page.getByLabel("Guardian Full Name", { exact: false }).fill(name);
  await page
    .getByLabel("Mobile / WhatsApp Number", { exact: false })
    .fill(phone);
  await page
    .getByLabel("Email Address (Optional)")
    .fill("browser.guardian@example.test");
  await page.getByLabel("Child's Age (in years)", { exact: false }).fill("10");
  await page.locator("#interest-privacy-consent").check();
  await expect(
    page.getByLabel("Programme Interest", { exact: true }),
  ).toBeEnabled();
}

test(
  "browser → real Nest API → PostgreSQL → non-demo Admin inbox and audit (JWT double)",
  {
    skip: enabled
      ? false
      : "Set KHLIM_TEST_BROWSER_DATABASE=1 with isolated database and production builds",
    timeout: 180000,
  },
  async () => {
    const run = randomUUID();
    const userId = randomUUID();
    const guardian = `Browser Guardian ${run}`;
    const phone = `019${String(Date.now()).slice(-7)}`;
    const normalizedPhone = `+6${phone}`;
    const token = `browser-staff-${run}`;
    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("v1");
    app.enableCors({
      origin: ["http://127.0.0.1:3100", "http://127.0.0.1:3102"],
    });
    const client = app.get(PrismaService).client;
    const jwt = app.get(SupabaseJwtService);
    // This verifies real tenant/role/MFA guards, not Supabase sign-in or real TOTP.
    jwt.verify = async (value) => {
      if (value !== token) throw new UnauthorizedException();
      return {
        subject: run,
        email: `browser-${run}@example.test`,
        payload: { sub: run, aud: "authenticated", aal: "aal2" },
      };
    };
    const processes = [];
    let browser;
    let context;
    await mkdir(`${root}test-results`, { recursive: true });
    try {
      await client.user.create({
        data: {
          id: userId,
          authProviderSubject: run,
          email: `browser-${run}@example.test`,
          roleAssignments: { create: [{ role: "ACADEMY_ADMIN" }] },
        },
      });
      await client.organizationMembership.create({
        data: {
          organizationId,
          userId,
          status: "ACTIVE",
          roleAssignments: { create: [{ role: "ACADEMY_ADMIN" }] },
        },
      });
      await app.listen(3101, "127.0.0.1");
      for (const [name, port] of [
        ["web", 3100],
        ["admin", 3102],
      ])
        processes.push(await startNext(name, port));
      await Promise.all(processes.map((server) => server.ready()));
      browser = await chromium.launch();
      context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      await context.tracing.start({ screenshots: true, snapshots: true });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:3100/interest?source=3x3-oct24");
      await fillInterest(page, guardian, phone);

      // Inject a storage outage only inside this test process. The production limiter
      // and controller still execute, including fail-closed response handling.
      const model = client.submissionRateLimit;
      const originalUpsert = model.upsert;
      model.upsert = async () => {
        throw new Error("simulated limiter storage outage");
      };
      const failure = page.waitForResponse(
        (response) =>
          response.url().endsWith("/v1/academy/leads") &&
          response.request().method() === "POST",
      );
      try {
        await page
          .getByRole("button", { name: "Submit Interest", exact: true })
          .click();
        assert.equal((await failure).status(), 503);
        await expect(page.getByRole("alert").first()).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Interest Received!" }),
        ).toHaveCount(0);
        assert.equal(
          await client.academyLead.count({ where: { guardianName: guardian } }),
          0,
        );
        await expect(
          page.getByLabel("Guardian Full Name", { exact: false }),
        ).toHaveValue(guardian);
      } finally {
        model.upsert = originalUpsert;
      }

      const submission = page.waitForResponse(
        (response) =>
          response.url().endsWith("/v1/academy/leads") &&
          response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Submit Interest", exact: true })
        .click();
      const response = await submission;
      assert.equal(response.status(), 201);
      assert.equal(response.request().headers().authorization, undefined);
      const receipt = await response.json();
      const payload = response.request().postDataJSON();
      await expect(
        page.getByRole("heading", { name: "Interest Received!" }),
      ).toBeVisible();
      const persisted = await client.academyLead.findUnique({
        where: { id: receipt.id },
      });
      assert.equal(persisted.organizationId, organizationId);
      assert.equal(persisted.source, "3x3-oct24");
      assert.equal(persisted.phone, normalizedPhone);
      assert.equal(persisted.email, "browser.guardian@example.test");
      const replay = await fetch("http://127.0.0.1:3101/v1/academy/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      assert.equal(replay.status, 201);
      assert.equal((await replay.json()).id, receipt.id);
      assert.equal(
        await client.academyLead.count({ where: { guardianName: guardian } }),
        1,
      );
      await page.screenshot({
        path: `${root}test-results/academy-lead-received.png`,
        fullPage: true,
      });

      const staff = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      await staff.addInitScript(
        (session) => {
          window.localStorage.setItem(
            "khlim_admin_supabase_session",
            JSON.stringify(session),
          );
        },
        {
          access_token: token,
          refresh_token: "test-only",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user: { id: run, email: `browser-${run}@example.test` },
        },
      );
      const inbox = await staff.newPage();
      await inbox.goto("http://127.0.0.1:3102/leads");
      const row = inbox.getByRole("row").filter({ hasText: guardian });
      await expect(row).toBeVisible({ timeout: 15000 });
      await expect(
        inbox.getByText("Demo mode: Showing synthetic Academy lead data.", {
          exact: false,
        }),
      ).toHaveCount(0);
      await row.getByRole("button", { name: "View & Manage" }).click();
      await inbox.locator("#lead-drawer-status").selectOption("CONTACTED");
      await inbox
        .locator("#lead-drawer-notes")
        .fill("Browser acceptance: manual follow-up planned.");
      await inbox
        .getByRole("button", { name: "Save Changes", exact: true })
        .click();
      await expect(
        inbox.getByText("Lead updated successfully.", { exact: true }),
      ).toBeVisible();
      const updated = await client.academyLead.findUnique({
        where: { id: receipt.id },
      });
      assert.equal(updated.status, "CONTACTED");
      assert.equal(
        updated.notes,
        "Browser acceptance: manual follow-up planned.",
      );
      const audits = await client.auditEvent.findMany({
        where: { entityId: receipt.id, action: "ACADEMY_LEAD_UPDATED" },
      });
      assert.equal(audits.length, 1);
      assert.equal(audits[0].actorUserId, userId);
      assert.doesNotMatch(
        JSON.stringify(audits[0].metadata),
        new RegExp(normalizedPhone.replace("+", "\\+")),
      );
      await inbox.screenshot({
        path: `${root}test-results/academy-lead-admin-updated.png`,
        fullPage: true,
      });
      await staff.close();
      // Obtain the real service to ensure test setup did not replace business logic.
      assert.ok(app.get(AcademyLeadsService));
    } finally {
      if (context)
        await context.tracing.stop({
          path: `${root}test-results/academy-lead-browser-trace.zip`,
        });
      if (browser) await browser.close();
      await Promise.all(processes.map((server) => server.stop()));
      try {
        await client.auditEvent.deleteMany({ where: { actorUserId: userId } });
        await client.academyLead.deleteMany({
          where: { organizationId, guardianName: guardian },
        });
        const hashes = [normalizedPhone, "127.0.0.1", "::ffff:127.0.0.1"].map(
          (value) =>
            createHash("sha256").update(value).digest("hex").slice(0, 32),
        );
        await client.submissionRateLimit.deleteMany({
          where: {
            OR: hashes.flatMap((hash) =>
              ["ip", "phone"].map((kind) => ({
                key: { startsWith: `lead:${kind}:${hash}:` },
              })),
            ),
          },
        });
        await client.organizationMembership.deleteMany({ where: { userId } });
        await client.userRoleAssignment.deleteMany({ where: { userId } });
        await client.user.deleteMany({ where: { id: userId } });
      } finally {
        await app.close();
      }
    }
  },
);
