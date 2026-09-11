import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const schemaUrl = new URL("../prisma/schema.prisma", import.meta.url);
const migrationsUrl = new URL("../prisma/migrations/", import.meta.url);
const lockdownMigrationUrl = new URL(
  "../prisma/migrations/20260911000000_supabase_data_api_rls_lockdown/migration.sql",
  import.meta.url,
);

function prismaMappedTables(schema) {
  return [...schema.matchAll(/@@map\("([^"]+)"\)/g)]
    .map((match) => match[1])
    .sort();
}

function rlsEnabledTables(migrations) {
  return [
    ...migrations.matchAll(
      /ALTER TABLE "public"\."([^"]+)" ENABLE ROW LEVEL SECURITY;/g,
    ),
  ].map((match) => match[1]);
}

async function readMigrationHistory() {
  const entries = await readdir(migrationsUrl, { withFileTypes: true });
  const migrationDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const migrations = await Promise.all(
    migrationDirectories.map((directory) =>
      readFile(new URL(`${directory}/migration.sql`, migrationsUrl), "utf8"),
    ),
  );

  return migrations.join("\n");
}

test("migration history enables RLS for every Prisma-mapped application table", async () => {
  const [schema, migrations, lockdownMigration] = await Promise.all([
    readFile(schemaUrl, "utf8"),
    readMigrationHistory(),
    readFile(lockdownMigrationUrl, "utf8"),
  ]);

  const expectedTables = prismaMappedTables(schema);
  const protectedTables = new Set(rlsEnabledTables(migrations));
  const missingTables = expectedTables.filter(
    (table) => !protectedTables.has(table),
  );

  assert.ok(
    expectedTables.length > 0,
    "Expected Prisma-mapped application tables",
  );
  assert.deepEqual(
    missingTables,
    [],
    "Every Prisma-mapped application table must enable RLS in migration history",
  );
  assert.doesNotMatch(
    lockdownMigration,
    /\bCREATE\s+POLICY\b/i,
    "This lockdown slice must remain default-deny for Supabase Data API roles",
  );
  assert.doesNotMatch(
    lockdownMigration,
    /\bFORCE\s+ROW\s+LEVEL\s+SECURITY\b/i,
    "Server-side Prisma table-owner access must remain available",
  );
});
