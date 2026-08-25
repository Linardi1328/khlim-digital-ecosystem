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

test("shared TypeScript configs define strict runtime-specific foundations", async () => {
  const manifest = await readJson("packages/typescript-config/package.json");
  const base = await readJson("packages/typescript-config/base.json");
  const node = await readJson("packages/typescript-config/node.json");
  const nextjs = await readJson("packages/typescript-config/nextjs.json");
  const expo = await readJson("packages/typescript-config/expo.json");

  assert.deepEqual(manifest.files, [
    "base.json",
    "expo.json",
    "nextjs.json",
    "node.json",
  ]);
  assert.equal(base.compilerOptions.strict, true);
  assert.equal(base.compilerOptions.noEmit, true);
  assert.equal(base.compilerOptions.isolatedModules, true);
  assert.equal(base.compilerOptions.target, "ES2022");

  assert.equal(node.extends, "./base.json");
  assert.equal(node.compilerOptions.module, "NodeNext");
  assert.equal(node.compilerOptions.moduleResolution, "NodeNext");

  assert.equal(nextjs.extends, "./base.json");
  assert.equal(nextjs.compilerOptions.jsx, "preserve");
  assert.equal(nextjs.compilerOptions.moduleResolution, "Bundler");
  assert.deepEqual(nextjs.compilerOptions.plugins, [{ name: "next" }]);

  assert.equal(expo.extends, "./base.json");
  assert.equal(expo.compilerOptions.jsx, "react-native");
  assert.equal(expo.compilerOptions.moduleResolution, "Bundler");
  assert.deepEqual(expo.compilerOptions.customConditions, ["react-native"]);
});

test("each application inherits only its matching shared TypeScript config", async () => {
  const consumers = {
    "apps/admin/tsconfig.json": "../../packages/typescript-config/nextjs.json",
    "apps/api/tsconfig.json": "../../packages/typescript-config/node.json",
    "apps/mobile/tsconfig.json": "../../packages/typescript-config/expo.json",
  };

  for (const [path, expectedBase] of Object.entries(consumers)) {
    assert.deepEqual(await readJson(path), { extends: expectedBase });
  }
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
