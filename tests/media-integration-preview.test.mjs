import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);

async function read(relPath) {
  return readFile(new URL(relPath, root), "utf8");
}

test("static contract: media registry enforces fail-closed rights and authorization mapping", async () => {
  const registrySource = await read("apps/web/lib/media-registry.ts");

  // Registry exports
  assert.match(registrySource, /export const STAGED_MEDIA_ASSETS/);
  assert.match(
    registrySource,
    /export function getMediaAuthorizationScorecard/,
  );

  // Import the pure registry
  const { STAGED_MEDIA_ASSETS, getMediaAuthorizationScorecard } = await import(
    new URL("apps/web/lib/media-registry.ts", root).href
  );

  assert.equal(
    STAGED_MEDIA_ASSETS.length,
    14,
    "Must contain exactly 14 staged assets",
  );

  // Invariant 1: All assets in staging pack have publicReady: false
  for (const asset of STAGED_MEDIA_ASSETS) {
    assert.equal(
      asset.publicReady,
      false,
      `Asset ${asset.file} must have publicReady: false until authorization is completed`,
    );
    assert.ok(
      asset.authorizationRequiredFrom.length > 0,
      `Asset ${asset.file} must specify required authorization parties`,
    );
  }

  // Invariant 2: Scorecard reflects fail-closed state
  const scorecard = getMediaAuthorizationScorecard();
  assert.equal(scorecard.totalStaged, 14);
  assert.equal(scorecard.verifiedCount, 0);
  assert.equal(scorecard.publicReadyCount, 0);
  assert.equal(scorecard.pendingApprovalCount, 14);
  assert.equal(scorecard.brandOwnerApprovalRequiredCount, 4);
  assert.equal(scorecard.mascotArtworkApprovalRequiredCount, 3);
  assert.equal(scorecard.coachAndPhotographerReleaseRequiredCount, 4);
  assert.equal(scorecard.guardianAndPhotographerConsentRequiredCount, 3);
  assert.equal(scorecard.minorAssetsCount, 3);
});

test("media safety: deployable public directory contains verified approved assets and no removed khlim-logo.jpg", async () => {
  const publicDir = fileURLToPath(new URL("apps/web/public", root));

  function scanFiles(dir) {
    let files = [];
    for (const item of readdirSync(dir)) {
      const full = `${dir}/${item}`;
      if (statSync(full).isDirectory()) {
        files = files.concat(scanFiles(full));
      } else {
        files.push(full);
      }
    }
    return files;
  }

  const allPublicFiles = scanFiles(publicDir);

  // 1. khlim-logo.jpg must remain deleted from public tree
  assert.ok(
    !allPublicFiles.some((f) => f.endsWith("khlim-logo.jpg")),
    "khlim-logo.jpg must not be present in public tree",
  );

  // 2. Verified publication-cleared media is present in public tree
  assert.ok(
    allPublicFiles.some((f) => f.includes("coaches/seng-jun.webp")),
    "seng-jun.webp must be present in public tree",
  );
  assert.ok(
    allPublicFiles.some((f) => f.includes("coaches/jia-xuan.webp")),
    "jia-xuan.webp must be present in public tree",
  );
  assert.ok(
    allPublicFiles.some((f) => f.includes("coaches/puimann.webp")),
    "puimann.webp must be present in public tree",
  );
  assert.ok(
    allPublicFiles.some((f) => f.includes("coaches/woon.webp")),
    "woon.webp must be present in public tree",
  );
  assert.ok(
    allPublicFiles.some((f) => f.includes("khero/meet-khero.webp")),
    "meet-khero.webp must be present in public tree",
  );
  assert.ok(
    allPublicFiles.some((f) => f.includes("brand/academy-crest.webp")),
    "academy-crest.webp must be present in public tree",
  );

  // 2b. Unavailable youth media kept out of public tree pending signed custodian releases
  assert.ok(
    !allPublicFiles.some((f) => f.includes("team-hero-1920")),
    "team-hero-1920 must be kept out of public tree pending signed custodian releases",
  );
  assert.ok(
    !allPublicFiles.some((f) => f.includes("team-hero-wide-1920")),
    "team-hero-wide-1920 must be kept out of public tree pending signed custodian releases",
  );
  assert.ok(
    !allPublicFiles.some((f) => f.includes("training-group-1280")),
    "training-group-1280 must be kept out of public tree pending signed custodian releases",
  );
  assert.ok(
    !allPublicFiles.some((f) => f.includes("/media/achievements/")),
    "achievements youth photos must be kept out of public tree pending signed custodian releases",
  );

  // 3. .gitignore contains staging pack directory
  const gitignore = await read(".gitignore");
  assert.match(gitignore, /docs\/media\/staging-pack\//);

  // 4. RIGHTS-MANIFEST.md documents director confirmation
  const manifestMd = await read("media/RIGHTS-MANIFEST.md");
  assert.match(manifestMd, /Approved Website Media Integration/);
  assert.match(manifestMd, /team-hero-1920\.webp/);
  assert.match(manifestMd, /director/i);
});

test("KHero transcripts and 3-language surrounding content support", async () => {
  const kheroSectionSource = await read(
    "apps/web/components/home/khero-section.tsx",
  );

  // Must render transcripts container
  assert.match(kheroSectionSource, /home-khero-transcripts/);

  // Must render exactly 3 approved posters
  assert.match(kheroSectionSource, /\/media\/khero\/meet-khero\.webp/);
  assert.match(kheroSectionSource, /\/media\/khero\/khero-meaning\.webp/);
  assert.match(kheroSectionSource, /\/media\/khero\/khero-way\.webp/);

  // Surrounding content keys exist in home-academy-web.ts across en, ms, zh-Hans
  const i18nSource = await read(
    "packages/i18n/src/messages/home-academy-web.ts",
  );
  assert.match(i18nSource, /home\.khero\.transcripts\.title/);
  assert.match(i18nSource, /home\.khero\.poster\.meet\.tagline/);
  assert.match(i18nSource, /home\.khero\.poster\.meaning\.origin/);
  assert.match(i18nSource, /home\.khero\.poster\.way\.motto/);
});

describe("media preview browser acceptance", () => {
  test("browser/preview: renders authorization scorecard, media inspection, and mode controls", async () => {
    const { mountComponent } = await import("./helpers/browser-mount.mjs");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await mountComponent(page, { component: "mediaPreviewPage" });

      // Header and fail-closed notice
      await expect(page.locator("h1")).toContainText(
        "Media Integration & Rights Console",
      );
      await expect(page.locator("main")).toContainText(
        "Private Local Preview — Not for Public Deployment",
      );

      // Scorecard cards
      await expect(page.locator("main")).toContainText("Total Staged Assets");
      await expect(page.locator("main")).toContainText("14");
      await expect(page.locator("main")).toContainText("Brand Owner Sign-off");
      await expect(page.locator("main")).toContainText(
        "Guardian Consent (Minors)",
      );
      await expect(page.locator("main")).toContainText("0 / 14"); // 0 public ready

      // Filter by KHero tab
      const kheroTab = page.locator('button:has-text("KHero Mascot")');
      await kheroTab.click();

      // Verify transcripts container is visible
      await expect(page.locator("main")).toContainText("Meet KHero");
      await expect(page.locator("main")).toContainText(
        "Every player starts somewhere",
      );

      // Filter by Youth tab
      const youthTab = page.locator('button:has-text("Youth & Hero")');
      await youthTab.click();

      // Verify youth safeguards
      await expect(page.locator("main")).toContainText(
        "Photographs containing identifiable children require documented guardian consent",
      );

      // Toggle to Public Safe mode
      const publicSafeBtn = page.locator(
        'button:has-text("Public Production Safe")',
      );
      await publicSafeBtn.click();

      // In public safe mode, youth minors must show withheld notice
      await expect(page.locator("main")).toContainText(
        "WITHHELD FROM PUBLIC TREES PENDING GUARDIAN RELEASES",
      );
    } finally {
      await browser.close();
    }
  });

  test("api/preview-media: enforces allowlist, content-type, and path traversal protection", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const ts = await import("typescript");

    function requireTs(filePath) {
      const code = fs.readFileSync(filePath, "utf8");
      const js = ts.transpileModule(code, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText;
      const m = { exports: {} };
      const customRequire = (id) => {
        if (id.startsWith(".")) {
          const resolved = path.resolve(path.dirname(filePath), id);
          return requireTs(
            resolved.endsWith(".ts") ? resolved : resolved + ".ts",
          );
        }
        return require(id);
      };

      const fn = new Function(
        "require",
        "module",
        "exports",
        "__filename",
        "__dirname",
        js,
      );
      fn(customRequire, m, m.exports, filePath, path.dirname(filePath));
      return m.exports;
    }

    const routePath = fileURLToPath(
      new URL(
        "../apps/web/app/api/preview-media/[...path]/route.ts",
        import.meta.url,
      ),
    );
    const { GET } = requireTs(routePath);

    const os = await import("node:os");
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "khlim-staging-pack-test-"),
    );
    const brandingDir = path.join(tempDir, "branding");
    fs.mkdirSync(brandingDir, { recursive: true });
    fs.writeFileSync(
      path.join(brandingDir, "khlim-laurel-crest.webp"),
      Buffer.from([0x52, 0x49, 0x46, 0x46]),
    );

    const prevEnv = process.env.STAGING_MEDIA_PACK_DIR;
    process.env.STAGING_MEDIA_PACK_DIR = tempDir;

    try {
      // 1. Valid registered staged asset
      const validRes = await GET(
        new Request(
          "http://localhost/api/preview-media/branding/khlim-laurel-crest.webp",
        ),
        {
          params: Promise.resolve({
            path: ["branding", "khlim-laurel-crest.webp"],
          }),
        },
      );
      assert.equal(validRes.status, 200);
      assert.equal(validRes.headers.get("content-type"), "image/webp");
      assert.equal(validRes.headers.get("x-public-ready"), "false");
      assert.equal(
        validRes.headers.get("x-media-rights-status"),
        "BRAND_OWNER_APPROVAL_REQUIRED",
      );

      // 2. Unregistered asset returns 404
      const unregRes = await GET(
        new Request(
          "http://localhost/api/preview-media/branding/unregistered-asset.webp",
        ),
        {
          params: Promise.resolve({
            path: ["branding", "unregistered-asset.webp"],
          }),
        },
      );
      assert.equal(unregRes.status, 404);

      // 3. Path traversal attack returns 400
      const traversalRes = await GET(
        new Request(
          "http://localhost/api/preview-media/..%2F..%2Fpackage.json",
        ),
        {
          params: Promise.resolve({
            path: ["..", "package.json"],
          }),
        },
      );
      assert.equal(traversalRes.status, 400);

      // 4. Production guard fails closed with 403
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        const prodRes = await GET(
          new Request(
            "http://localhost/api/preview-media/branding/khlim-laurel-crest.webp",
          ),
          {
            params: Promise.resolve({
              path: ["branding", "khlim-laurel-crest.webp"],
            }),
          },
        );
        assert.equal(prodRes.status, 403);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    } finally {
      if (prevEnv !== undefined) {
        process.env.STAGING_MEDIA_PACK_DIR = prevEnv;
      } else {
        delete process.env.STAGING_MEDIA_PACK_DIR;
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // 5. Preview page source enforces production notFound guard
    const pageSource = await read("apps/web/app/preview/media/page.tsx");
    assert.match(pageSource, /process\.env\.NODE_ENV === "production"/);
    assert.match(pageSource, /notFound\(\)/);
  });
});
