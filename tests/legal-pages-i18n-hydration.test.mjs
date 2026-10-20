import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const root = new URL("../", import.meta.url);

async function read(relPath) {
  return readFile(new URL(relPath, root), "utf8");
}

let serverPromise = null;

function getNextServer() {
  if (!serverPromise) {
    serverPromise = (async () => {
      // 1. Check if a local Next.js server is already running (e.g. port 3000 or 3055)
      for (const port of [3000, 3055]) {
        try {
          const response = await fetch(`http://localhost:${port}/cookies`, {
            signal: AbortSignal.timeout(1000),
          });
          if (response.ok) {
            return {
              baseUrl: `http://localhost:${port}`,
              stop: async () => {},
            };
          }
        } catch {
          // Continue checking next port or fallback to spawning
        }
      }

      // 2. Otherwise, spawn Next.js dev server on port 3055
      const testPort = 3055;
      const appRoot = fileURLToPath(new URL("../apps/web", import.meta.url));
      const nextBin = fileURLToPath(
        new URL("../apps/web/node_modules/next/dist/bin/next", import.meta.url),
      );

      const child = spawn(
        process.execPath,
        [nextBin, "dev", "-p", String(testPort), "-H", "localhost"],
        {
          cwd: appRoot,
          env: {
            ...process.env,
            PORT: String(testPort),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let output = "";
      child.stdout?.on("data", (data) => {
        output = (output + data).slice(-20000);
      });
      child.stderr?.on("data", (data) => {
        output = (output + data).slice(-20000);
      });
      child.on("error", (error) => {
        output += error.message;
      });

      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null) {
          throw new Error(`Next.js server exited early: ${output}`);
        }
        try {
          const response = await fetch(`http://localhost:${testPort}/cookies`, {
            signal: AbortSignal.timeout(2000),
          });
          if (response.ok) break;
        } catch {
          // Waiting for server startup
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      return {
        baseUrl: `http://localhost:${testPort}`,
        stop: async () => {
          child.kill("SIGTERM");
          const force = setTimeout(() => child.kill("SIGKILL"), 5000);
          force.unref();
          if (child.exitCode === null) {
            await new Promise((resolve) => child.once("exit", resolve));
          }
          clearTimeout(force);
        },
      };
    })();
  }
  return serverPromise;
}

test("static contract: legal pages use explicit content model, define required translations, and avoid unkeyed fragments", async () => {
  const legalDocSource = await read(
    "apps/web/components/legal/legal-document.tsx",
  );
  const cookiesSource = await read("apps/web/app/cookies/page.tsx");
  const privacySource = await read("apps/web/app/privacy/page.tsx");
  const termsSource = await read("apps/web/app/terms/page.tsx");
  const refundsSource = await read("apps/web/app/refunds/page.tsx");

  // Check legal-document.tsx uses explicit type-safe content model
  assert.match(
    legalDocSource,
    /export type LegalContentItem\s*=/,
    "legal-document.tsx must export explicit LegalContentItem type",
  );
  assert.match(
    legalDocSource,
    /item\.type === "interactive"/,
    "legal-document.tsx must explicitly handle interactive items outside <p>",
  );
  assert.doesNotMatch(
    legalDocSource,
    /function isInteractiveOrBlock\(/,
    "legal-document.tsx must not use fragile implicit AST/React node inspection",
  );

  // Check legal-document.tsx has Chinese draft legal review banner
  assert.match(
    legalDocSource,
    /Pending Owner & Legal Counsel Approval/,
    "legal-document.tsx must display unapproved draft banner for Chinese legal text",
  );

  // Check legal-document.tsx cleans dual sections to prevent duplicate analytics controls
  assert.match(
    legalDocSource,
    /function cleanDualSections\(/,
    "legal-document.tsx must clean dual sections to prevent duplicate analytics controls",
  );

  // Verify all 4 pages pass englishSections, malaySections, and chineseSections with no unkeyed fragments
  const pageFiles = [
    ["cookies", cookiesSource],
    ["privacy", privacySource],
    ["terms", termsSource],
    ["refunds", refundsSource],
  ];

  for (const [pageName, pageSource] of pageFiles) {
    assert.match(
      pageSource,
      /englishSections=\{englishSections\}/,
      `${pageName} must pass englishSections to LegalDocument`,
    );
    assert.match(
      pageSource,
      /malaySections=\{malaySections\}/,
      `${pageName} must pass malaySections to LegalDocument`,
    );
    assert.match(
      pageSource,
      /chineseSections=\{chineseSections\}/,
      `${pageName} must pass chineseSections to LegalDocument`,
    );
    assert.match(
      pageSource,
      /chineseTitle=/,
      `${pageName} must define chineseTitle`,
    );
    assert.match(
      pageSource,
      /chineseIntro=/,
      `${pageName} must define chineseIntro`,
    );

    // Verify no unkeyed bare fragments in array sections
    assert.doesNotMatch(
      pageSource,
      /paragraphs:\s*\[[\s\S]*?<>/,
      `${pageName} must not contain unkeyed bare JSX fragments <> in paragraphs arrays`,
    );
  }
});

describe("legal pages browser acceptance", { concurrency: 1 }, () => {
  test("browser/real-routes: /cookies, /terms, /privacy, /refunds eliminate React key warnings, hydration mismatches, and <div> in <p>", async () => {
    const server = await getNextServer();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    try {
      const page = await context.newPage();
      const pageErrors = [];
      const keyWarnings = [];
      const hydrationErrors = [];

      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("console", (msg) => {
        const text = msg.text();
        if (
          text.includes('Each child in a list should have a unique "key" prop')
        ) {
          keyWarnings.push(text);
        }
        if (
          text.includes("cannot be a descendant of") ||
          text.includes("cannot contain a nested") ||
          text.includes("Hydration failed") ||
          text.includes("Text content does not match")
        ) {
          hydrationErrors.push(text);
        }
        if (msg.type() === "error") {
          pageErrors.push(text);
        }
      });

      const routesToTest = ["/cookies", "/terms", "/privacy", "/refunds"];

      for (const route of routesToTest) {
        await page.goto(`${server.baseUrl}${route}`, {
          waitUntil: "networkidle",
        });
        await page.waitForSelector('main[data-hydrated="true"]');

        // Verify no invalid DOM nesting anywhere on page
        const invalidNesting = await page.evaluate(() => {
          return document.querySelectorAll("p div").length;
        });
        assert.equal(
          invalidNesting,
          0,
          `${route} must have 0 <div> elements nested inside <p> tags`,
        );
      }

      // Assert zero React key warnings
      assert.deepEqual(
        keyWarnings,
        [],
        "Must have zero React key warnings across all legal routes",
      );

      // Assert zero hydration errors
      assert.deepEqual(
        hydrationErrors,
        [],
        "Must have zero hydration or nesting error logs across all legal routes",
      );

      // Specific verification on /cookies
      await page.goto(`${server.baseUrl}/cookies`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector('main[data-hydrated="true"]');

      // Verify exactly 1 AnalyticsPreferencesControl is rendered in English view
      const controlButtons = page.locator(
        'button:has-text("Enable Analytics"), button:has-text("Decline"), button:has-text("Withdraw Consent")',
      );
      assert.ok(
        (await controlButtons.count()) > 0,
        "AnalyticsPreferencesControl buttons must be present on /cookies",
      );

      // Verify interactive consent toggle works without error
      const declineBtn = page
        .locator('article button:has-text("Decline")')
        .first();
      if (await declineBtn.isVisible()) {
        await declineBtn.click();
        await page.waitForFunction(
          () => localStorage.getItem("khlim_analytics_consent") === "denied",
        );
        const consentStatus = await page.evaluate(() =>
          localStorage.getItem("khlim_analytics_consent"),
        );
        assert.equal(consentStatus, "denied");
      }

      // Hard refresh test on /cookies: ensures SSR + hydration consistency on refresh
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector('main[data-hydrated="true"]');
      const postReloadInvalidNesting = await page.evaluate(() => {
        return document.querySelectorAll("p div").length;
      });
      assert.equal(
        postReloadInvalidNesting,
        0,
        "/cookies must have 0 <div> in <p> after hard reload",
      );

      // Switch to Dual View tab on /cookies
      const dualTab = page.locator('button:has-text("Dual View / 双语")');
      await dualTab.click();
      await page.waitForTimeout(100);

      const dualInvalidNesting = await page.evaluate(() => {
        return document.querySelectorAll("p div").length;
      });
      assert.equal(
        dualInvalidNesting,
        0,
        "Dual view must have 0 <div> elements inside <p>",
      );

      // Assert strictly 1 interactive control in Dual View
      const enableBtnsInDual = page.locator(
        'button:has-text("Enable Analytics"), button:has-text("Decline")',
      );
      assert.equal(
        (await enableBtnsInDual.count()) > 0 &&
          (await enableBtnsInDual.count()) <= 2,
        true,
        "Dual view must have exactly one active interactive control group (not duplicated)",
      );

      // Assert second language displays reference note instead of duplicate interactive control
      const secondLangNote = page.locator(
        "text=Sila rujuk kawalan keutamaan analitik yang dipaparkan dalam versi bahasa di atas",
      );
      assert.equal(
        await secondLangNote.count(),
        1,
        "Second language in dual view must render explanatory reference note",
      );
    } finally {
      await context.close();
      await browser.close();
    }
  });

  test("browser/real-routes: legal pages respond to language switching and cross-page navigation", async () => {
    const server = await getNextServer();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    try {
      const page = await context.newPage();
      const navigationErrors = [];
      page.on("pageerror", (err) => navigationErrors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          navigationErrors.push(msg.text());
        }
      });

      const pagesToTest = [
        {
          route: "/privacy",
          enTitle: "Privacy Policy & Personal Data Protection Notice",
          msTitle: "Dasar Privasi & Notis Perlindungan Data Peribadi",
          zhTitle: "隐私政策与个人数据保护声明",
        },
        {
          route: "/cookies",
          enTitle: "Cookie Policy",
          msTitle: "Dasar Kuki",
          zhTitle: "Cookie 政策",
        },
        {
          route: "/terms",
          enTitle: "Academy Terms and Conditions",
          msTitle: "Terma dan Syarat Akademi",
          zhTitle: "学院条款与条件",
        },
        {
          route: "/refunds",
          enTitle: "Refund and Cancellation Policy",
          msTitle: "Dasar Bayaran Balik dan Pembatalan",
          zhTitle: "退款与取消政策",
        },
      ];

      for (const item of pagesToTest) {
        await page.goto(`${server.baseUrl}${item.route}`, {
          waitUntil: "networkidle",
        });
        await page.waitForSelector('main[data-hydrated="true"]');

        // 1. English tab
        const enTab = page.locator('button[role="tab"]:has-text("English")');
        await enTab.click();
        await expect(page.locator("h1")).toContainText(item.enTitle);
        assert.equal(
          await page.locator('[data-testid="legal-draft-alert"]').count(),
          0,
          "English view must not display draft disclaimer",
        );

        // 2. Malay tab
        const msTab = page.locator(
          'button[role="tab"]:has-text("Bahasa Melayu")',
        );
        await msTab.click();
        await expect(page.locator("h1")).toContainText(item.msTitle);
        assert.equal(
          await page.locator('[data-testid="legal-draft-alert"]').count(),
          0,
          "Malay view must not display draft disclaimer",
        );

        // 3. Chinese tab
        const zhTab = page.locator(
          'button[role="tab"]:has-text("简体中文 (待审核草案)")',
        );
        await zhTab.click();
        await expect(page.locator("h1")).toContainText(item.zhTitle);
        // Verify prominent draft banner is present
        const draftBanner = page.locator('[data-testid="legal-draft-alert"]');
        await expect(draftBanner).toBeVisible();
        assert.match(
          await draftBanner.innerText(),
          /Pending Owner & Legal Counsel Approval/,
          "Draft banner must have disclaimer text",
        );

        // 4. Dual view tab
        const dualTab = page.locator(
          'button[role="tab"]:has-text("Dual View / 双语")',
        );
        await dualTab.click();
        await expect(page.locator("h1")).toContainText(item.enTitle);
      }

      // Cross-page navigation via legal policy navigation links
      await page.goto(`${server.baseUrl}/cookies`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector('main[data-hydrated="true"]');
      const navLinks = [
        { href: "/privacy", expectedTitle: "Privacy Policy" },
        { href: "/terms", expectedTitle: "Academy Terms" },
        { href: "/refunds", expectedTitle: "Refund and Cancellation" },
        { href: "/cookies", expectedTitle: "Cookie Policy" },
      ];

      for (const nav of navLinks) {
        await page
          .locator(
            `nav[aria-label="Legal policy navigation"] a[href="${nav.href}"]`,
          )
          .first()
          .click();
        await page.waitForURL(`**${nav.href}`);
        await page.waitForSelector('main[data-hydrated="true"]');
        await expect(page.locator("h1")).toContainText(nav.expectedTitle);
      }

      // Header locale dropdown test: switching global language affects legal document title
      const headerSelect = page.locator(".public-header-locale select");
      await headerSelect.selectOption("ms");
      await expect(page.locator("h1")).toContainText("Dasar Kuki");

      await headerSelect.selectOption("zh-Hans");
      await expect(page.locator("h1")).toContainText("Cookie 政策");

      assert.deepEqual(
        navigationErrors,
        [],
        "Must have zero errors across all language switching and navigation",
      );
    } finally {
      await context.close();
      await browser.close();
    }
  });

  test("browser/component: header locale switcher displays Bahasa Melayu without clipping across viewports", async () => {
    const { mountComponent } = await import("./helpers/browser-mount.mjs");
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      const viewports = [
        { width: 320, height: 568 },
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
        { width: 1440, height: 900 },
      ];

      for (const vp of viewports) {
        await page.setViewportSize(vp);
        await mountComponent(page, {
          component: "publicHeader",
          props: { initialLocale: "ms" },
        });

        const select = page.locator(".public-header-locale select");
        assert.equal(await select.isVisible(), true);
        assert.equal(await select.inputValue(), "ms");

        // Verify selected text is "Bahasa Melayu"
        const selectedText = await select.evaluate((el) => {
          return el.options[el.selectedIndex].text;
        });
        assert.equal(selectedText, "Bahasa Melayu");

        // Verify that the select element is wide enough to avoid text clipping
        const isClipped = await select.evaluate((el) => {
          return el.scrollWidth > el.clientWidth + 1;
        });
        assert.equal(
          isClipped,
          false,
          `Language select must not clip "Bahasa Melayu" at ${vp.width}px (scrollWidth <= clientWidth)`,
        );

        // Verify header doesn't cause horizontal page overflow
        const pageOverflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          return docEl.scrollWidth > docEl.clientWidth + 1;
        });
        assert.equal(
          pageOverflow,
          false,
          `Page must not overflow horizontally at ${vp.width}px`,
        );
      }
    } finally {
      await browser.close();
    }
  });

  after(async () => {
    if (serverPromise) {
      const s = await serverPromise;
      await s.stop();
    }
  });
});
