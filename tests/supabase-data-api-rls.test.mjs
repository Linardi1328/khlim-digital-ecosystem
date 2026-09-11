import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const schemaUrl = new URL("../prisma/schema.prisma", import.meta.url);
const migrationUrl = new URL(
  "../prisma/migrations/20260911000000_supabase_data_api_rls_lockdown/migration.sql",
  import.meta.url,
);

function prismaMappedTables(schema) {
  return [...schema.matchAll(/@@map\("([^"]+)"\)/g)]
    .map((match) => match[1])
    .sort();
}

function rlsEnabledTables(migration) {
  return [
    ...migration.matchAll(
      /ALTER TABLE "public"\."([^"]+)" ENABLE ROW LEVEL SECURITY;/g,
    ),
  ]
    .map((match) => match[1])
    .sort();
}

test("Supabase Data API lockdown covers every Prisma-mapped application table", async () => {
  const [schema, migration] = await Promise.all([
    readFile(schemaUrl, "utf8"),
    readFile(migrationUrl, "utf8"),
  ]);

  const expectedTables = prismaMappedTables(schema);
  const protectedTables = rlsEnabledTables(migration);

  assert.ok(expectedTables.length > 0, "Expected Prisma-mapped application tables");
  assert.deepEqual(
    protectedTables,
    expectedTables,
    "Every Prisma-mapped application table must explicitly enable RLS",
  );
  assert.doesNotMatch(
    migration,
    /\bCREATE\s+POLICY\b/i,
    "This lockdown slice must remain default-deny for Supabase Data API roles",
  );
  assert.doesNotMatch(
    migration,
    /\bFORCE\s+ROW\s+LEVEL\s+SECURITY\b/i,
    "Server-side Prisma table-owner access must remain available",
  );
});
