import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { probeDatabase } = require("../apps/api/dist/database/health-probe.js");
const { HealthController } = require("../apps/api/dist/health.controller.js");

function fixtureUrl({ host, port, user, hasPassword = true }) {
  const url = new URL(`postgresql://${host}:${port}/postgres`);
  url.username = user;
  if (hasPassword) url.password = randomUUID();
  return url.toString();
}

function failingOperation(error, origin) {
  return {
    query: async () => {
      throw error;
    },
    close: async () => {},
    errorOrigin: () => origin,
  };
}

test("unknown pool errors emit only allowlisted connection diagnostics", async (t) => {
  const events = [];
  t.mock.method(process.stderr, "write", (line) => {
    events.push(JSON.parse(line));
    return true;
  });
  const url = fixtureUrl({
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    port: 6543,
    user: "postgres.syntheticproject",
  });
  const error = new TypeError("synthetic private driver error");
  error.code = "UNRECOGNIZED_PRIVATE_CODE";
  const result = await probeDatabase(url, () =>
    failingOperation(error, "pg_pool"),
  );
  assert.equal(result.connected, false);
  assert.equal(result.category, "unknown");
  assert.deepEqual(result.diagnostic, {
    origin: "pg_pool",
    errorShape: "type_error",
    connectionMode: "supavisor_transaction",
    poolerUsername: "project_scoped",
    passwordPresent: true,
  });
  const controller = new HealthController({ probe: async () => result });
  assert.deepEqual(await controller.getHealth(), {
    service: "khlim-api",
    status: "error",
    database: { status: "disconnected" },
  });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].diagnostic, result.diagnostic);
  assert.doesNotMatch(
    JSON.stringify({ events, result }),
    /synthetic private driver|UNRECOGNIZED_PRIVATE_CODE|syntheticproject|pooler.supabase.com/,
  );
  assert.equal(JSON.stringify({ events, result }).includes(new URL(url).password), false);
});

test("unknown error diagnostics distinguish pooler modes safely", async () => {
  for (const [host, port, user, hasPassword, mode, scoped] of [
    [
      "aws-0-ap-southeast-1.pooler.supabase.com",
      6543,
      "postgres.syntheticproject",
      true,
      "supavisor_transaction",
      "project_scoped",
    ],
    [
      "aws-0-ap-southeast-1.pooler.supabase.com",
      5432,
      "postgres",
      true,
      "supavisor_session",
      "other",
    ],
    [
      "db.syntheticproject.supabase.co",
      5432,
      "postgres",
      false,
      "supabase_direct",
      "not_applicable",
    ],
    [
      "127.0.0.1",
      5432,
      "postgres",
      true,
      "other",
      "not_applicable",
    ],
  ]) {
    const url = fixtureUrl({ host, port, user, hasPassword });
    const result = await probeDatabase(url, () =>
      failingOperation(new Error("synthetic failure"), "prisma_adapter"),
    );
    assert.equal(result.category, "unknown");
    assert.deepEqual(result.diagnostic, {
      origin: "prisma_adapter",
      errorShape: "error",
      connectionMode: mode,
      poolerUsername: scoped,
      passwordPresent: hasPassword,
    });
    assert.equal(JSON.stringify(result).includes(host), false);
    assert.equal(JSON.stringify(result).includes(user), false);
    if (hasPassword) {
      assert.equal(JSON.stringify(result).includes(new URL(url).password), false);
    }
  }
});
