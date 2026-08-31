import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const {
  AdminGovernanceService,
} = require("../../apps/api/dist/admin/admin-governance.service.js");

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for governance persistence tests");
  }
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("Governance persistence tests require a test database");
  }
  return true;
}

const enabled = databaseTestsEnabled();

test(
  "admin governance settings and immutable audit trail persist in PostgreSQL",
  { skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests" },
  async () => {
    const prisma = new PrismaService();
    const governance = new AdminGovernanceService(prisma);
    const client = prisma.client;
    const actor = {
      id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      authProviderSubject: "governance-test-admin",
      email: "governance.admin@example.test",
      preferredLocale: "en",
      roles: ["SUPER_ADMIN"],
      authenticatorAssuranceLevel: "aal2",
    };

    try {
      const initial = await governance.getSettings();
      assert.equal(initial.id, "academy-defaults");

      const nextCurrency = initial.currency === "MYR" ? "SGD" : "MYR";
      const updated = await governance.updateSettings(actor, {
        currency: nextCurrency,
        timezone: "Asia/Kuala_Lumpur",
      });
      assert.equal(updated.currency, nextCurrency);
      assert.equal(updated.changed, true);
      assert.equal(updated.version, initial.version + 1);

      const audit = await client.auditEvent.findFirst({
        where: {
          action: "PLATFORM_SETTINGS_UPDATED",
          entityId: "academy-defaults",
          actorUserId: actor.id,
        },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(audit);
      assert.match(audit.summary, /Platform defaults changed/);

      await assert.rejects(
        () =>
          client.auditEvent.update({
            where: { id: audit.id },
            data: { summary: "tampered" },
          }),
        /append-only|cannot be updated or deleted/i,
      );

      await assert.rejects(
        () => client.auditEvent.delete({ where: { id: audit.id } }),
        /append-only|cannot be updated or deleted/i,
      );

      const stillPresent = await client.auditEvent.findUnique({
        where: { id: audit.id },
      });
      assert.equal(stillPresent?.summary, audit.summary);
    } finally {
      await prisma.onModuleDestroy();
    }
  },
);
