import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

const workspaceDirectories = [
  "apps/web",
  "apps/admin",
  "apps/api",
  "apps/mobile",
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
  assert.equal(manifest.devDependencies.prisma, "7.9.1");
  assert.equal(manifest.devDependencies.turbo, "2.5.6");
  assert.equal(manifest.devDependencies.typescript, "5.9.2");
  assert.equal(manifest.scripts.dev, "turbo run dev");
  assert.equal(manifest.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(manifest.scripts["prisma:validate"], "prisma validate");
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
  assert.deepEqual(manifest.exports, {
    "./base.json": "./base.json",
    "./expo.json": "./expo.json",
    "./nextjs.json": "./nextjs.json",
    "./node.json": "./node.json",
  });
  assert.deepEqual(base.compilerOptions, {
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    isolatedModules: true,
    noEmit: true,
    noUncheckedIndexedAccess: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: true,
    target: "ES2022",
  });
  assert.deepEqual(node, {
    $schema: "https://json.schemastore.org/tsconfig",
    extends: "./base.json",
    compilerOptions: {
      lib: ["ES2022"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
    },
  });
  assert.deepEqual(nextjs, {
    $schema: "https://json.schemastore.org/tsconfig",
    extends: "./base.json",
    compilerOptions: {
      incremental: true,
      jsx: "preserve",
      lib: ["DOM", "DOM.Iterable", "ES2022"],
      module: "ESNext",
      moduleResolution: "Bundler",
      plugins: [{ name: "next" }],
    },
  });
  assert.deepEqual(expo, {
    $schema: "https://json.schemastore.org/tsconfig",
    extends: "./base.json",
    compilerOptions: {
      allowJs: true,
      jsx: "react-native",
      lib: ["ES2022"],
      module: "ESNext",
      moduleResolution: "Bundler",
      customConditions: ["react-native"],
    },
  });
});

test("each application inherits the matching runtime TypeScript foundation", async () => {
  const simpleConsumers = {
    "apps/web/tsconfig.json": "../../packages/typescript-config/nextjs.json",
    "apps/admin/tsconfig.json": "../../packages/typescript-config/nextjs.json",
    "apps/mobile/tsconfig.json": "../../packages/typescript-config/expo.json",
  };

  for (const [path, expectedBase] of Object.entries(simpleConsumers)) {
    assert.deepEqual(await readJson(path), { extends: expectedBase });
  }

  const api = await readJson("apps/api/tsconfig.json");
  assert.equal(api.extends, "../../packages/typescript-config/node.json");
  assert.deepEqual(api.compilerOptions, {
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    noEmit: false,
    outDir: "./dist",
    rootDir: "./src",
    sourceMap: true,
  });
  assert.deepEqual(api.include, ["src/**/*.ts"]);
});

test("website and admin are the first web clients while mobile remains reserved", async () => {
  const web = await readJson("apps/web/package.json");
  const admin = await readJson("apps/admin/package.json");
  const mobile = await readJson("apps/mobile/package.json");

  assert.equal(web.name, "@khlim/web");
  assert.equal(admin.name, "@khlim/admin");
  assert.equal(mobile.name, "@khlim/mobile");
  assert.equal(web.dependencies.next, "16.3.2");
  assert.equal(admin.dependencies.next, "16.3.2");
  assert.equal(mobile.dependencies, undefined);
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
