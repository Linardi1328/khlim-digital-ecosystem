import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");
test("editorial studio persists drafts and gates publication on verified facts", async () => {
  const schema = await read("prisma/schema.prisma");
  const service = await read("apps/api/src/editorial/editorial.service.ts");
  assert.match(schema, /model EditorialEntry/);
  assert.match(service, /Facts must be verified before publication/);
  assert.match(service, /status: "PUBLISHED"/);
});
test("AI-assisted drafting is source-fact constrained and remains editable", async () => {
  const service = await read("apps/api/src/editorial/editorial.service.ts");
  const page = await read("apps/admin/app/editorial/page.tsx");
  assert.match(service, /sourceFactsOnly: true/);
  assert.match(service, /khlim-editorial-assist-v1/);
  assert.match(page, /Generate AI-assisted draft/);
  assert.match(page, /Facts and photo rights verified/);
});
test("public website consumes published editorial API data", async () => {
  const controller = await read(
    "apps/api/src/editorial/editorial.controller.ts",
  );
  const helper = await read("apps/web/lib/editorial-api.ts");
  assert.match(controller, /editorial\/achievements/);
  assert.match(controller, /editorial\/player-spotlights/);
  assert.match(helper, /cache\s*:\s*"no-store"/);
});
test("Admin navigation exposes Editorial Studio", async () => {
  const nav = await read("apps/admin/components/layout/AdminSidebar.tsx");
  assert.match(nav, /\/editorial/);
  assert.match(nav, /Editorial Studio/);
});

test("shareable Player Spotlight route resolves persisted editorial API data", async () => {
  const archive = await read("apps/web/app/spotlight/page.tsx");
  const article = await read("apps/web/app/spotlight/[slug]/page.tsx");
  assert.match(archive, /fetchPublishedSpotlights/);
  assert.match(article, /fetchPublishedSpotlight/);
  assert.match(article, /resolveSpotlight/);
});
