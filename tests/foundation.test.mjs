import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

const workspaceDirectories = [
  "apps/mobile",
  "apps/admin",
  "apps/api",
  "packages/api-client",
  "packages/design-tokens",
  "packages/i18n",
  "packages/types",
  "packages/eslint-config",
  "packages/typescript-config",
  "packages/testing",
];

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("root tooling is pinned to the Phase 1 baseline", async () => {
  const manifest = await readJson("package.json");

  assert.equal(manifest.private, true);
  assert.equal(manifest.packageManager, "pnpm@10.15.0");
  assert.deepEqual(manifest.engines, { node: "24.x", pnpm: "10.15.0" });
  assert.equal(manifest.devDependencies.turbo, "2.5.6");
  assert.equal(manifest.devDependencies.typescript, "5.9.2");
  assert.equal(manifest.scripts.test, "node --test tests/foundation.test.mjs");
});

test("pnpm includes only the planned workspace boundaries", async () => {
  const workspace = await readFile(new URL("pnpm-workspace.yaml", root), "utf8");
  assert.equal(workspace, 'packages:\n  - "apps/*"\n  - "packages/*"\n');

  const names = new Set();
  for (const directory of workspaceDirectories) {
    const manifest = await readJson(`${directory}/package.json`);
    assert.equal(manifest.private, true, `${directory} must remain private`);
    assert.match(manifest.name, /^@khlim\/[a-z0-9-]+$/);
    assert.equal(names.has(manifest.name), false, `${manifest.name} must be unique`);
    names.add(manifest.name);
  }
});

test("Turborepo exposes the common deterministic task graph", async () => {
  const turbo = await readJson("turbo.json");
  assert.deepEqual(Object.keys(turbo.tasks).sort(), [
    "build",
    "dev",
    "lint",
    "test",
    "typecheck",
  ]);
  assert.equal(turbo.tasks.dev.cache, false);
  assert.equal(turbo.tasks.dev.persistent, true);
});

test("the Prisma boundary starts with PostgreSQL and versioned migrations", async () => {
  const schema = await readFile(new URL("prisma/schema.prisma", root), "utf8");
  const migrationMarker = await readFile(
    new URL("prisma/migrations/.gitkeep", root),
    "utf8",
  );

  assert.match(schema, /provider = "postgresql"/);
  assert.match(schema, /env\("DATABASE_URL"\)/);
  assert.equal(migrationMarker, "");
});
