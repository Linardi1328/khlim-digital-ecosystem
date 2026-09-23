import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("staging acceptance fails closed on production/local/placeholder configuration", async () => {
  const script = await read("scripts/verify-staging-acceptance.mjs");
  assert.match(script, /BILLPLZ_SANDBOX !== "1"/);
  assert.match(script, /PAYMENT_PROVIDER !== "billplz"/);
  assert.match(script, /replace-with\|example\|placeholder/i);
  assert.match(script, /must use HTTPS/);
  assert.match(script, /localhost/);
});

test("staging acceptance verifies deployed web API and Supabase Auth without moving money", async () => {
  const script = await read("scripts/verify-staging-acceptance.mjs");
  const docs = await read("docs/testing/staging-acceptance.md");
  assert.match(script, /\/v1\/health/);
  assert.match(script, /\/auth\/v1\/health/);
  assert.match(script, /no money-moving request was made/);
  assert.match(docs, /Guardian acceptance journey/);
  assert.match(docs, /Billplz sandbox/);
});

test("live staging gate is manual and secrets-backed rather than pretending CI has external credentials", async () => {
  const workflow = await read(".github/workflows/staging-acceptance.yml");
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /secrets\.KHLIM_STAGING_WEB_URL/);
  assert.match(workflow, /KHLIM_STAGING_BILLPLZ_SECRET_KEY/);
  assert.doesNotMatch(workflow, /pull_request:/);
});
