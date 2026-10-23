import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Public header has active, accessible navigation and a vector mobile menu", async () => {
  const header = await read("apps/web/components/layout/public-header.tsx");
  const styles = await read(
    "apps/web/components/layout/public-header.module.css",
  );
  assert.match(header, /usePathname/);
  assert.match(header, /aria-current=/);
  assert.match(header, /pathname === link\.href\.split\("\?"\)\[0\]/);
  assert.match(header, /<svg[\s\S]*?<path d="M4 6h16M4 12h16M4 18h16" \/>/);
  assert.doesNotMatch(header, />\s*☰\s*</);
  assert.match(styles, /\.navLinkActive/);
  assert.match(header, /\? styles\.navLinkActive\s*:\s*undefined/);
  assert.match(styles, /\.mobileMenuBtn:hover\s*\{\s*background: #f4f4f5;/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("Public forms preserve readable select chevrons and high-contrast focus", async () => {
  const css = await read("apps/web/app/globals.css");
  const select = await read("apps/web/components/ui/select.tsx");
  const locale = await read("apps/web/components/layout/locale-switcher.tsx");
  assert.match(css, /main select:not\(\[multiple\]\):not\(\[size\]\)/);
  assert.match(css, /background-position: right 14px center/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /-webkit-appearance: auto !important/);
  assert.match(css, /appearance: auto !important/);
  assert.match(css, /background-image: none !important/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(select, /backgroundImage: chevron/);
  assert.match(locale, /backgroundImage: chevron/);
});
