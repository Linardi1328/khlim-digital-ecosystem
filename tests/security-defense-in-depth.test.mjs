import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationUrl = new URL(
  "../prisma/migrations/20260916130000_security_defense_in_depth/migration.sql",
  import.meta.url,
);
const apiMainUrl = new URL("../apps/api/src/main.ts", import.meta.url);
const webConfigUrl = new URL("../apps/web/next.config.ts", import.meta.url);
const adminConfigUrl = new URL("../apps/admin/next.config.ts", import.meta.url);

test("Supabase public schema stays closed to direct browser data access", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(
    migration,
    /ALTER TABLE "public"\."_prisma_migrations" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migration,
    /REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon/,
  );
  assert.match(
    migration,
    /REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated/,
  );
  assert.match(
    migration,
    /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM anon/,
  );
  assert.match(
    migration,
    /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM authenticated/,
  );
  assert.match(
    migration,
    /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC/,
  );
  assert.match(
    migration,
    /ALTER FUNCTION "public"\."prevent_audit_event_mutation"\(\)[\s\S]*SET search_path = pg_catalog, public/,
  );
  assert.match(
    migration,
    /ALTER FUNCTION "public"\."default_audit_event_organization"\(\)[\s\S]*SET search_path = pg_catalog, public/,
  );
});

test("database rejects structurally invalid payment and capacity values", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  for (const constraint of [
    "programme_offerings_capacity_positive",
    "payment_schedules_installment_count_positive",
    "payment_schedules_amount_positive",
    "payment_installments_sequence_positive",
    "payment_installments_amount_positive",
    "payments_amount_positive",
    "payments_attempt_number_positive",
    "payments_currency_format",
  ]) {
    assert.match(migration, new RegExp(`CONSTRAINT "${constraint}"`));
  }
});

test("browser applications emit defense-in-depth security headers", async () => {
  const [webConfig, adminConfig] = await Promise.all([
    readFile(webConfigUrl, "utf8"),
    readFile(adminConfigUrl, "utf8"),
  ]);

  for (const config of [webConfig, adminConfig]) {
    assert.match(config, /Content-Security-Policy/);
    assert.match(config, /frame-ancestors 'none'/);
    assert.match(config, /X-Content-Type-Options/);
    assert.match(config, /X-Frame-Options/);
    assert.match(config, /Referrer-Policy/);
    assert.match(config, /Permissions-Policy/);
    assert.match(config, /Strict-Transport-Security/);
  }

  assert.match(
    adminConfig,
    /headers: isCloudflarePages[\s\S]*\? undefined/,
    "Static Cloudflare export must not pretend it can emit Next.js response headers",
  );
});

test("production API removes framework hints and hides Swagger by default", async () => {
  const apiMain = await readFile(apiMainUrl, "utf8");

  assert.match(apiMain, /disable\("x-powered-by"\)/);
  assert.match(apiMain, /Cache-Control", "no-store"/);
  assert.match(apiMain, /Content-Security-Policy/);
  assert.match(apiMain, /runtime\.deploymentEnv !== "production"/);
  assert.match(apiMain, /KHLIM_API_DOCS_ENABLED === "1"/);
  assert.match(apiMain, /if \(apiDocsEnabled\)/);
});
