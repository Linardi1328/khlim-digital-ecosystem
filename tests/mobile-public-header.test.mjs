import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("mobile public header keeps language and primary account actions reachable", async () => {
  const header = await read("apps/web/components/layout/public-header.tsx");

  assert.match(header, /public-header-locale/);
  assert.match(header, /<LocaleSwitcher \/>/);
  assert.match(header, /public-header-mobile-quick-actions/);
  assert.match(header, /href="\/auth\/login"/);
  assert.match(header, /href="\/enrol"/);
  assert.match(header, /@media \(max-width: 640px\)/);
  assert.match(
    header,
    /\.public-header-locale\s*\{\s*display:\s*block\s*!important;/,
  );
  assert.match(
    header,
    /\.public-header-mobile-quick-actions\s*\{[\s\S]*?display:\s*flex\s*!important;/,
  );
});
