import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("admin exposes an isolated Cloudflare Pages static export mode", async () => {
  const config = await read("apps/admin/next.config.ts");

  assert.match(config, /CLOUDFLARE_PAGES/);
  assert.match(config, /isCloudflarePages[\s\S]*?"export"/);
  assert.match(
    config,
    /images:\s*isCloudflarePages\s*\?\s*\{\s*unoptimized:\s*true\s*\}/,
  );
  assert.match(config, /trailingSlash:\s*isCloudflarePages/);
  assert.match(config, /process\.env\.VERCEL[\s\S]*?undefined/);
  assert.match(config, /"standalone"/);
});

test("Cloudflare export CI builds only the Admin artifact without deployment secrets", async () => {
  const workflow = await read(".github/workflows/admin-cloudflare-export.yml");

  assert.match(workflow, /name:\s*Admin Cloudflare Export/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /CLOUDFLARE_PAGES:\s*"1"/);
  assert.match(workflow, /NEXT_PUBLIC_ADMIN_DEMO_MODE:\s*"true"/);
  assert.match(workflow, /pnpm --filter @khlim\/admin build/);
  assert.match(workflow, /apps\/admin\/out\/index\.html/);
  assert.doesNotMatch(
    workflow,
    /CLOUDFLARE_API_TOKEN|wrangler deploy|pages deploy/i,
  );
});
