import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for RLS lockdown tests");
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("RLS lockdown tests require a database whose name contains 'test'");
  }

  return true;
}

function prismaMappedTables(schema) {
  return [...schema.matchAll(/@@map\("([^"]+)"\)/g)]
    .map((match) => match[1])
    .sort();
}

const enabled = databaseTestsEnabled();

test(
  "Supabase Data API RLS lockdown is applied without blocking Prisma owner access",
  { skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests" },
  async () => {
    const schema = await readFile(
      new URL("../../prisma/schema.prisma", import.meta.url),
      "utf8",
    );
    const expectedTables = prismaMappedTables(schema);
    const prisma = new PrismaService();
    const client = prisma.client;

    try {
      const rows = await client.$queryRaw`
        SELECT
          c.relname AS "tableName",
          c.relrowsecurity AS "rowSecurityEnabled",
          c.relforcerowsecurity AS "rowSecurityForced"
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relname <> '_prisma_migrations'
        ORDER BY c.relname
      `;

      const byTable = new Map(rows.map((row) => [row.tableName, row]));
      const missingTables = expectedTables.filter((table) => !byTable.has(table));
      const rlsDisabled = expectedTables.filter(
        (table) => !byTable.get(table)?.rowSecurityEnabled,
      );
      const rlsForced = expectedTables.filter(
        (table) => byTable.get(table)?.rowSecurityForced,
      );

      assert.deepEqual(missingTables, [], "All Prisma tables must exist after migrations");
      assert.deepEqual(rlsDisabled, [], "All Prisma tables must have RLS enabled");
      assert.deepEqual(
        rlsForced,
        [],
        "RLS must not be forced for the server-side table owner",
      );

      const userCount = await client.user.count();
      assert.equal(
        typeof userCount,
        "number",
        "Prisma table-owner reads must continue to work with RLS enabled",
      );
    } finally {
      await prisma.onModuleDestroy();
    }
  },
);
