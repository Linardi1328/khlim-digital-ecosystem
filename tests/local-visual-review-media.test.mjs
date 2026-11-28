import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  APPROVED_YOUTH_MEDIA,
  clubEventGallery,
  verifiedRepresentativeMilestones,
  verifiedTeamResults,
} from "../apps/web/lib/editorial-content.ts";
import {
  LOCAL_VISUAL_REVIEW_ALLOWLIST,
  LOCAL_VISUAL_REVIEW_PREFIX,
  isAllowedRecoveredVisualReviewPath,
  isLocalVisualReviewActive,
  isLoopbackHostHeader,
  isLoopbackHostname,
  resolveLocalVisualReviewImageUrl,
} from "../apps/web/lib/local-visual-review-media.ts";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);

function requireTs(filePath) {
  const ts = require("typescript");
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
      return requireTs(resolved.endsWith(".ts") ? resolved : `${resolved}.ts`);
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

test("local visual review allowlist covers all 32 restored placements and excludes unverified placeholders", () => {
  assert.equal(LOCAL_VISUAL_REVIEW_ALLOWLIST.length, 32);
  assert.equal(
    new Set(LOCAL_VISUAL_REVIEW_ALLOWLIST).size,
    32,
    "Allowlist entries must be unique",
  );

  // Covers all 9 verified team honours, 5 representative milestones, and 9 club gallery items
  for (const item of [
    ...verifiedTeamResults,
    ...verifiedRepresentativeMilestones,
    ...clubEventGallery,
  ]) {
    assert.ok(item.imageUrl?.startsWith("/media/"));
    const rel = item.imageUrl.slice("/media/".length);
    assert.equal(
      isAllowedRecoveredVisualReviewPath(rel),
      true,
      `Expected ${rel} to be in the local visual review allowlist`,
    );
  }

  // Covers Homepage hero desktop + mobile variants (8) and Academy training group (1)
  for (const rel of [
    "khlim/team-hero-wide-1920.webp",
    "khlim/team-hero-1920.webp",
    "home/team-huddle-desktop.webp",
    "home/team-huddle-mobile.webp",
    "home/sideline-energy-desktop.webp",
    "home/sideline-energy-mobile.webp",
    "home/court-together-desktop.webp",
    "home/court-together-mobile.webp",
    "khlim/training-group-1280.webp",
  ]) {
    assert.equal(isAllowedRecoveredVisualReviewPath(rel), true);
  }

  // Excludes unverified placeholder and arbitrary paths
  assert.equal(
    isAllowedRecoveredVisualReviewPath("khero/coming-soon.webp"),
    false,
  );
  assert.equal(isAllowedRecoveredVisualReviewPath("../package.json"), false);

  // Production consent registry stays empty (no manufactured consent records)
  assert.equal(APPROVED_YOUTH_MEDIA.length, 0);
});

test("local visual review resolution fails closed in production, when disabled, or on non-loopback hosts", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevFlag = process.env.NEXT_PUBLIC_LOCAL_VISUAL_REVIEW;

  try {
    // 1. Loopback helpers accept only strict loopback values
    for (const valid of ["127.0.0.1", "localhost", "::1", "[::1]"]) {
      assert.equal(isLoopbackHostname(valid), true);
    }
    for (const invalid of [
      "",
      "khlim.com",
      "localhost.evil.com",
      "192.168.1.10",
      "0.0.0.0",
    ]) {
      assert.equal(isLoopbackHostname(invalid), false);
    }
    for (const validHost of [
      "127.0.0.1:3197",
      "localhost:3000",
      "[::1]:3197",
      "localhost",
    ]) {
      assert.equal(isLoopbackHostHeader(validHost), true);
    }
    for (const invalidHost of [
      "example.com",
      "localhost.attacker.test:3000",
      "127.0.0.1.evil.test",
      "10.0.0.5:3000",
    ]) {
      assert.equal(isLoopbackHostHeader(invalidHost), false);
    }

    // 2. Production always fails closed even with opt-in flag set
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_LOCAL_VISUAL_REVIEW = "1";
    assert.equal(isLocalVisualReviewActive("127.0.0.1"), false);
    assert.equal(
      resolveLocalVisualReviewImageUrl(
        "/media/khlim/team-hero-wide-1920.webp",
        "127.0.0.1",
      ),
      undefined,
    );

    // 3. Development without explicit opt-in fails closed
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_LOCAL_VISUAL_REVIEW = "0";
    assert.equal(isLocalVisualReviewActive("127.0.0.1"), false);
    assert.equal(
      resolveLocalVisualReviewImageUrl(
        "/media/khlim/team-hero-wide-1920.webp",
        "127.0.0.1",
      ),
      undefined,
    );

    // 4. Development with opt-in on non-loopback host fails closed
    process.env.NEXT_PUBLIC_LOCAL_VISUAL_REVIEW = "1";
    assert.equal(isLocalVisualReviewActive("192.168.1.25"), false);
    assert.equal(
      resolveLocalVisualReviewImageUrl(
        "/media/khlim/team-hero-wide-1920.webp",
        "preview.khlim.test",
      ),
      undefined,
    );

    // 5. SSR (no window, no override) stays disabled to guarantee identical SSR/hydration HTML
    assert.equal(isLocalVisualReviewActive(), false);
    assert.equal(
      resolveLocalVisualReviewImageUrl("/media/khlim/team-hero-wide-1920.webp"),
      undefined,
    );

    // 6. Development with opt-in on loopback resolves allowlisted paths only
    assert.equal(isLocalVisualReviewActive("127.0.0.1"), true);
    assert.equal(
      resolveLocalVisualReviewImageUrl(
        "/media/khlim/team-hero-wide-1920.webp",
        "127.0.0.1",
      ),
      `${LOCAL_VISUAL_REVIEW_PREFIX}khlim/team-hero-wide-1920.webp`,
    );
    assert.equal(
      resolveLocalVisualReviewImageUrl(
        "/media/khlim/team-hero-wide-1920.webp",
        true,
      ),
      `${LOCAL_VISUAL_REVIEW_PREFIX}khlim/team-hero-wide-1920.webp`,
    );
    assert.equal(
      resolveLocalVisualReviewImageUrl(
        "/media/khlim/team-hero-wide-1920.webp",
        false,
      ),
      undefined,
    );
    assert.equal(
      resolveLocalVisualReviewImageUrl(
        "/media/khero/coming-soon.webp",
        "127.0.0.1",
      ),
      undefined,
    );
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevFlag === undefined) {
      delete process.env.NEXT_PUBLIC_LOCAL_VISUAL_REVIEW;
    } else {
      process.env.NEXT_PUBLIC_LOCAL_VISUAL_REVIEW = prevFlag;
    }
  }
});

test("next.config.ts unconditionally disables NEXT_PUBLIC_LOCAL_VISUAL_REVIEW in production and hosted builds and web dev binds loopback", async () => {
  const nextConfig = await readFile(
    new URL("apps/web/next.config.ts", root),
    "utf8",
  );
  const webPkg = JSON.parse(
    await readFile(new URL("apps/web/package.json", root), "utf8"),
  );
  assert.match(
    nextConfig,
    /NEXT_PUBLIC_LOCAL_VISUAL_REVIEW:\s*process\.env\.NODE_ENV === "development" &&\s*!process\.env\.VERCEL &&\s*!process\.env\.VERCEL_ENV &&\s*process\.env\.KHLIM_LOCAL_VISUAL_REVIEW === "1"\s*\?\s*"1"\s*:\s*"0"/,
  );
  assert.equal(webPkg.scripts.dev, "next dev -H 127.0.0.1");
});

test("api/preview-media/recovered enforces production, hosted, opt-in, loopback, allowlist, traversal, and symlink containment gates", async () => {
  const routePath = fileURLToPath(
    new URL("apps/web/app/api/preview-media/[...path]/route.ts", root),
  );
  const { GET } = requireTs(routePath);

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "khlim-recovered-media-test-"),
  );
  const outsideFile = path.join(tempRoot, "secret.txt");
  fs.writeFileSync(outsideFile, "TOP_SECRET");

  const recoveryMediaDir = path.join(tempRoot, "recovery-media");
  const khlimDir = path.join(recoveryMediaDir, "khlim");
  fs.mkdirSync(khlimDir, { recursive: true });
  fs.writeFileSync(
    path.join(khlimDir, "team-hero-wide-1920.webp"),
    Buffer.from([0x52, 0x49, 0x46, 0x46]),
  );
  // Symlink escape attempt masquerading as an allowlisted asset
  fs.symlinkSync(outsideFile, path.join(khlimDir, "training-group-1280.webp"));

  const prevNodeEnv = process.env.NODE_ENV;
  const prevReview = process.env.KHLIM_LOCAL_VISUAL_REVIEW;
  const prevRecoveryDir = process.env.KHLIM_PRIVATE_MEDIA_RECOVERY_DIR;
  const prevVercel = process.env.VERCEL;
  const prevVercelEnv = process.env.VERCEL_ENV;

  try {
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    process.env.KHLIM_PRIVATE_MEDIA_RECOVERY_DIR = recoveryMediaDir;

    // 1. Disabled by default when KHLIM_LOCAL_VISUAL_REVIEW !== "1" -> 403
    delete process.env.KHLIM_LOCAL_VISUAL_REVIEW;
    const disabledRes = await GET(
      new Request(
        "http://127.0.0.1:3197/api/preview-media/recovered/khlim/team-hero-wide-1920.webp",
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "khlim", "team-hero-wide-1920.webp"],
        }),
      },
    );
    assert.equal(disabledRes.status, 403);

    // 2. Enabled on loopback serves allowlisted asset with strict non-public headers -> 200
    process.env.KHLIM_LOCAL_VISUAL_REVIEW = "1";
    const okRes = await GET(
      new Request(
        "http://127.0.0.1:3197/api/preview-media/recovered/khlim/team-hero-wide-1920.webp",
        { headers: { host: "127.0.0.1:3197" } },
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "khlim", "team-hero-wide-1920.webp"],
        }),
      },
    );
    assert.equal(okRes.status, 200);
    assert.equal(okRes.headers.get("content-type"), "image/webp");
    assert.equal(
      okRes.headers.get("cache-control"),
      "private, no-store, must-revalidate",
    );
    assert.equal(
      okRes.headers.get("x-robots-tag"),
      "noindex, nofollow, noimageindex",
    );
    assert.equal(okRes.headers.get("x-public-ready"), "false");
    assert.equal(okRes.headers.get("x-local-visual-review"), "true");

    // 3. Non-allowlisted asset (including unverified coming-soon.webp) -> 404
    const blockedPlaceholder = await GET(
      new Request(
        "http://127.0.0.1:3197/api/preview-media/recovered/khero/coming-soon.webp",
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "khero", "coming-soon.webp"],
        }),
      },
    );
    assert.equal(blockedPlaceholder.status, 404);

    // 4. Symlink pointing outside recovery directory -> 403
    const symlinkRes = await GET(
      new Request(
        "http://127.0.0.1:3197/api/preview-media/recovered/khlim/training-group-1280.webp",
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "khlim", "training-group-1280.webp"],
        }),
      },
    );
    assert.equal(symlinkRes.status, 403);

    // 5. Non-loopback URL or forwarded Host header -> 403
    const nonLoopbackUrlRes = await GET(
      new Request(
        "http://192.168.1.50:3197/api/preview-media/recovered/khlim/team-hero-wide-1920.webp",
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "khlim", "team-hero-wide-1920.webp"],
        }),
      },
    );
    assert.equal(nonLoopbackUrlRes.status, 403);

    const forwardedHostRes = await GET(
      new Request(
        "http://127.0.0.1:3197/api/preview-media/recovered/khlim/team-hero-wide-1920.webp",
        { headers: { "x-forwarded-host": "preview.khlim.example" } },
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "khlim", "team-hero-wide-1920.webp"],
        }),
      },
    );
    assert.equal(forwardedHostRes.status, 403);

    // 6. Path traversal -> 400
    const traversalRes = await GET(
      new Request(
        "http://127.0.0.1:3197/api/preview-media/recovered/../secret.txt",
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "..", "secret.txt"],
        }),
      },
    );
    assert.equal(traversalRes.status, 400);

    // 7. Hosted VERCEL / VERCEL_ENV always blocked -> 403
    process.env.VERCEL_ENV = "preview";
    const hostedRes = await GET(
      new Request(
        "http://127.0.0.1:3197/api/preview-media/recovered/khlim/team-hero-wide-1920.webp",
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "khlim", "team-hero-wide-1920.webp"],
        }),
      },
    );
    assert.equal(hostedRes.status, 403);
    delete process.env.VERCEL_ENV;

    // 8. Production NODE_ENV always blocked -> 403
    process.env.NODE_ENV = "production";
    const prodRes = await GET(
      new Request(
        "http://127.0.0.1:3197/api/preview-media/recovered/khlim/team-hero-wide-1920.webp",
      ),
      {
        params: Promise.resolve({
          path: ["recovered", "khlim", "team-hero-wide-1920.webp"],
        }),
      },
    );
    assert.equal(prodRes.status, 403);
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevReview === undefined) delete process.env.KHLIM_LOCAL_VISUAL_REVIEW;
    else process.env.KHLIM_LOCAL_VISUAL_REVIEW = prevReview;
    if (prevRecoveryDir === undefined)
      delete process.env.KHLIM_PRIVATE_MEDIA_RECOVERY_DIR;
    else process.env.KHLIM_PRIVATE_MEDIA_RECOVERY_DIR = prevRecoveryDir;
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercelEnv;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
