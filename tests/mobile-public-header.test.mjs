import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("mobile public header keeps language, tagline, and primary account actions reachable", async () => {
  const header = await read("apps/web/components/layout/public-header.tsx");
  const styles = await read(
    "apps/web/components/layout/public-header.module.css",
  );

  assert.match(header, /public-header-locale/);
  assert.match(header, /<LocaleSwitcher \/>/);
  assert.match(header, /public-header-brand-tagline/);
  assert.match(header, /public-header-mobile-quick-actions/);
  assert.match(header, /href="\/auth\/login"/);
  assert.match(header, /href="\/enrol"/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(styles, /\.locale\s*\{\s*display:\s*block\s*!important;/);
  assert.match(
    styles,
    /\.brandTagline\s*\{[^}]*display:\s*block\s*!important;/,
  );
  assert.doesNotMatch(
    styles,
    /\.brandTagline\s*\{[^}]*display:\s*none\s*!important;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*?\.mobileQuickActions\s*\{[\s\S]*?display:\s*flex;/,
  );
});

test("age-inclusive public controls preserve 44px interaction targets", async () => {
  const files = await Promise.all([
    read("apps/web/components/layout/public-header.tsx"),
    read("apps/web/components/layout/locale-switcher.tsx"),
    read("apps/web/components/ui/sheet.tsx"),
    read("apps/web/components/home/hero-carousel.tsx"),
  ]);
  const combined = files.join("\n");

  assert.match(combined, /minHeight: "44px"/);
  assert.match(combined, /minWidth: "44px"/);
  assert.match(combined, /width: "44px"/);
  assert.match(combined, /height: "44px"/);
});

test("public logo uses the committed JPEG directly without build-time conversion", async () => {
  const logo = await read("apps/web/components/layout/brand-logo.tsx");
  const manifest = JSON.parse(await read("apps/web/package.json"));
  const nextConfig = await read("apps/web/next.config.ts");
  const gitignore = await read(".gitignore");

  assert.match(logo, /src="\/khlim-logo\.jpg"/);
  assert.match(logo, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.equal(manifest.scripts.build, "next build");
  assert.equal(manifest.scripts.dev, "next dev");
  assert.equal(manifest.scripts.start, "next start");
  assert.doesNotMatch(nextConfig, /khlim-logo/);
  assert.doesNotMatch(nextConfig, /writeFileSync|readFileSync|data:image/);
  assert.doesNotMatch(gitignore, /apps\/web\/public\/khlim-logo/);
});
