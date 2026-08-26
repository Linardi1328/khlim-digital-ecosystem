import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

test("shared locale package preserves the agreed language baseline", async () => {
  const manifest = await readJson("packages/i18n/package.json");
  const source = await read("packages/i18n/src/index.ts");

  assert.equal(manifest.scripts.typecheck, "tsc --noEmit");
  assert.match(source, /"en"/);
  assert.match(source, /"ms"/);
  assert.match(source, /"zh-Hans"/);
  assert.match(source, /"zh-Hant"/);
  assert.match(source, /"hi"/);
  assert.match(source, /DEFAULT_LOCALE: SupportedLocale = "en"/);
  assert.match(source, /"zh-hk": "zh-Hant"/);
  assert.match(source, /"zh-cn": "zh-Hans"/);
});

test("API client has one authenticated transport boundary", async () => {
  const manifest = await readJson("packages/api-client/package.json");
  const source = await read("packages/api-client/src/index.ts");

  assert.equal(manifest.scripts.typecheck, "tsc --noEmit");
  assert.match(source, /getAccessToken/);
  assert.match(source, /Bearer \$\{accessToken\}/);
  assert.match(source, /authenticated \?\? true/);
  assert.match(source, /class ApiError/);
  assert.match(source, /API path must start with/);
});

test("deployment tiers are explicit and templates never contain live credentials", async () => {
  const development = await read(".env.example");
  const staging = await read("config/environments/staging.env.example");
  const production = await read("config/environments/production.env.example");
  const docs = await read("config/environments/README.md");

  assert.match(development, /NODE_ENV=development/);
  assert.match(development, /KHLIM_ENV=development/);
  assert.match(staging, /NODE_ENV=production/);
  assert.match(staging, /KHLIM_ENV=staging/);
  assert.match(production, /NODE_ENV=production/);
  assert.match(production, /KHLIM_ENV=production/);
  assert.match(staging, /example\.invalid/);
  assert.match(production, /example\.invalid/);
  assert.match(docs, /Real secrets belong in provider\/CI secret stores/);
});

test("API environment and logging foundations keep deployment identity and secrets separate", async () => {
  const environment = await read("apps/api/src/environment.ts");
  const logger = await read("apps/api/src/logger.ts");
  const main = await read("apps/api/src/main.ts");

  assert.match(environment, /KHLIM_ENV/);
  assert.match(environment, /staging requires NODE_ENV=production/);
  assert.match(environment, /production requires NODE_ENV=production/);
  assert.match(logger, /\[redacted\]/);
  assert.match(logger, /authorization\|cookie\|password\|secret\|token/);
  assert.match(logger, /JSON\.stringify/);
  assert.match(main, /createStructuredLogger/);
  assert.match(main, /api\.started/);
});
