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
    /\.brandTagline\s*\{[\s\S]*?display:\s*block\s*!important;/,
  );
  assert.doesNotMatch(
    styles,
    /\.brandTagline\s*\{[\s\S]*?display:\s*none\s*!important;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*?\.mobileQuickActions\s*\{[\s\S]*?display:\s*flex;/,
  );
});

test("public logo is materialized as a browser-safe WebP before build and dev", async () => {
  const logo = await read("apps/web/components/layout/brand-logo.tsx");
  const manifest = JSON.parse(await read("apps/web/package.json"));
  const materializer = await read("apps/web/scripts/materialize-logo.mjs");
  const gitignore = await read(".gitignore");

  assert.match(logo, /src="\/khlim-logo\.webp"/);
  assert.match(logo, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(manifest.scripts.build, /materialize-logo\.mjs/);
  assert.match(manifest.scripts.dev, /materialize-logo\.mjs/);
  assert.equal(manifest.scripts.start, "next start");
  assert.match(materializer, /data:image\\\/webp;base64/);
  assert.match(materializer, /khlim-logo\.webp/);
  assert.match(materializer, /riff !== "RIFF"/);
  assert.match(materializer, /webp !== "WEBP"/);
  assert.match(gitignore, /apps\/web\/public\/khlim-logo\.webp/);
});
