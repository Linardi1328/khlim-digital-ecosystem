import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

test("dependency installs are reproducible and supply-chain scripts are explicit", async () => {
  const manifest = await readJson("package.json");
  const workflow = await read(".github/workflows/ppo-pr-validation.yml");

  assert.equal(manifest.packageManager, "pnpm@10.15.0");
  assert.deepEqual(manifest.pnpm.onlyBuiltDependencies, ["@prisma/engines", "prisma"]);
  assert.deepEqual(manifest.pnpm.ignoredBuiltDependencies, [
    "@scarf/scarf",
    "@sentry/cli",
    "unrs-resolver",
  ]);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  await access(new URL("pnpm-lock.yaml", root));
});

test("Phase 1 code quality and generated contract gates are mandatory in CI", async () => {
  const manifest = await readJson("package.json");
  const workflow = await read(".github/workflows/ppo-pr-validation.yml");

  assert.equal(manifest.devDependencies.eslint, "10.9.1");
  assert.equal(manifest.devDependencies.prettier, "3.9.6");
  assert.equal(manifest.devDependencies["openapi-typescript"], "7.13.0");
  assert.match(workflow, /pnpm lint/);
  assert.match(workflow, /pnpm format:check/);
  assert.match(workflow, /pnpm openapi:check/);
  assert.match(workflow, /pnpm bootstrap:verify/);
});

test("Prisma uses a lazy PostgreSQL driver-adapter boundary", async () => {
  const api = await readJson("apps/api/package.json");
  const schema = await read("prisma/schema.prisma");
  const service = await read("apps/api/src/database/prisma.service.ts");
  const module = await read("apps/api/src/database/database.module.ts");

  assert.equal(api.dependencies["@prisma/adapter-pg"], "7.9.1");
  assert.match(schema, /engineType\s+=\s+"client"/);
  assert.match(schema, /moduleFormat\s+=\s+"cjs"/);
  assert.match(service, /new PrismaPg/);
  assert.match(service, /DATABASE_URL is required before database access/);
  assert.match(module, /@Global\(\)/);
});

test("Supabase JWT verification is isolated behind JWKS verification", async () => {
  const api = await readJson("apps/api/package.json");
  const verifier = await read("apps/api/src/auth/supabase-jwt-verifier.ts");

  assert.equal(api.dependencies.jose, "6.2.10");
  assert.match(verifier, /createRemoteJWKSet/);
  assert.match(verifier, /jwtVerify/);
  assert.match(verifier, /audience.*authenticated/s);
  assert.doesNotMatch(verifier, /service_role/);
});

test("Sentry is present but disabled when DSNs are absent", async () => {
  const api = await readJson("apps/api/package.json");
  const web = await readJson("apps/web/package.json");
  const admin = await readJson("apps/admin/package.json");
  const apiInstrument = await read("apps/api/src/instrument.ts");
  const webInstrument = await read("apps/web/instrumentation-client.ts");

  assert.equal(api.dependencies["@sentry/nestjs"], "10.71.0");
  assert.equal(web.dependencies["@sentry/nextjs"], "10.71.0");
  assert.equal(admin.dependencies["@sentry/nextjs"], "10.71.0");
  assert.match(apiInstrument, /enabled: Boolean\(dsn\)/);
  assert.match(apiInstrument, /sendDefaultPii: false/);
  assert.match(webInstrument, /NEXT_PUBLIC_SENTRY_DSN/);
});

test("OpenAPI source and generated API types are committed artifacts", async () => {
  const apiManifest = await readJson("apps/api/package.json");
  const apiClient = await readJson("packages/api-client/package.json");
  const exporter = await read("apps/api/src/export-openapi.ts");

  assert.equal(
    apiManifest.scripts["openapi:export"],
    "nest build && node dist/export-openapi.js",
  );
  assert.equal(apiClient.exports["./schema"], "./src/schema.d.ts");
  assert.match(exporter, /openapi\/khlim-v1\.json/);
  await access(new URL("openapi/khlim-v1.json", root));
  await access(new URL("packages/api-client/src/schema.d.ts", root));
});
