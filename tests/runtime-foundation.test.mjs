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

test("website and admin have executable Next.js runtime scaffolds", async () => {
  for (const app of ["web", "admin"]) {
    const manifest = await readJson(`apps/${app}/package.json`);
    const nextConfig = await read(`apps/${app}/next.config.ts`);
    const layout = await read(`apps/${app}/app/layout.tsx`);
    const page = await read(`apps/${app}/app/page.tsx`);

    assert.equal(manifest.dependencies.next, "16.3.2");
    assert.equal(manifest.dependencies.react, "19.2.8");
    assert.equal(manifest.dependencies["react-dom"], "19.2.8");
    assert.equal(manifest.scripts.build, "next build");
    assert.equal(manifest.scripts.typecheck, "tsc --noEmit");
    if (app === "web") {
      assert.match(
        nextConfig,
        /process\.env\.VERCEL \|\| process\.env\.NETLIFY/,
      );
      assert.match(
        nextConfig,
        /output: isManagedNextHost \? undefined : "standalone"/,
      );
    } else {
      assert.match(
        nextConfig,
        /output: process\.env\.VERCEL \? undefined : "standalone"/,
      );
    }
    assert.match(layout, /<html lang="en">/);

    if (app === "web") {
      assert.match(page, /useI18n/);
      assert.match(page, /t\("brand\.academy"\)/);
    } else {
      assert.match(page, /KHLIM/);
    }
  }
});

test("API scaffold exposes a versioned health boundary and OpenAPI", async () => {
  const manifest = await readJson("apps/api/package.json");
  const tsconfig = await readJson("apps/api/tsconfig.json");
  const main = await read("apps/api/src/main.ts");
  const health = await read("apps/api/src/health.controller.ts");
  const environment = await read("apps/api/src/environment.ts");

  assert.equal(manifest.dependencies["@nestjs/core"], "11.2.1");
  assert.equal(manifest.dependencies["@nestjs/swagger"], "11.4.7");
  assert.equal(manifest.dependencies["@prisma/client"], "7.9.1");
  assert.equal(tsconfig.compilerOptions.experimentalDecorators, true);
  assert.equal(tsconfig.compilerOptions.emitDecoratorMetadata, true);
  assert.equal(tsconfig.compilerOptions.noEmit, false);
  assert.match(main, /setGlobalPrefix\("v1"\)/);
  assert.match(main, /SwaggerModule\.setup\("docs"/);
  assert.match(health, /@Controller\("health"\)/);
  assert.match(health, /status: "ok"/);
  assert.match(environment, /Invalid NODE_ENV/);
  assert.match(environment, /Invalid PORT/);
});

test("development environment contract contains placeholders rather than production credentials", async () => {
  const sample = await read(".env.example");

  for (const key of [
    "NODE_ENV=development",
    "PORT=3001",
    "NEXT_PUBLIC_API_BASE_URL=",
    "DATABASE_URL=",
    "SUPABASE_URL=",
    "SUPABASE_ANON_KEY=",
    "SUPABASE_JWT_ISSUER=",
    "SENTRY_DSN=",
  ]) {
    assert.match(
      sample,
      new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  assert.match(sample, /Never commit real credentials/);
  assert.match(sample, /example\.supabase\.co/);
});

test("mobile remains an intentionally deferred client", async () => {
  const manifest = await readJson("apps/mobile/package.json");
  const readme = await read("apps/mobile/README.md");

  assert.equal(manifest.dependencies, undefined);
  assert.match(readme, /intentionally reserved/);
  assert.match(readme, /same authenticated REST APIs/);
});
