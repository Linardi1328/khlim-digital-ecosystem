import assert from "node:assert/strict";
import { X509Certificate, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  pgClientConfigForApi,
} = require("../apps/api/dist/database/pg-client-config.js");
const {
  SUPABASE_ROOT_2021_CA_PEM,
} = require("../apps/api/dist/database/supabase-root-2021-ca.js");

const STAGING_REF = "qxsjxcbfhxbvxigghhlq";
const HOST = "aws-0-ap-southeast-1.pooler.supabase.com";
const ENABLED = {
  KHLIM_ENV: "staging",
  KHLIM_RIC84_SUPABASE_CA_2021: "1",
};

function databaseUrl(options = {}) {
  const url = new URL(
    `postgresql://${options.host ?? HOST}:${options.port ?? 6543}/postgres`,
  );
  url.username = options.username ?? `postgres.${STAGING_REF}`;
  url.password = randomUUID();
  return url;
}

test("pinned public CA has expected fingerprint and validity", () => {
  const ca = new X509Certificate(SUPABASE_ROOT_2021_CA_PEM);
  assert.equal(ca.ca, true);
  assert.equal(
    ca.fingerprint256,
    "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
  );
  assert.ok(Date.now() < Date.parse(ca.validTo));
});

test("staging SSL verifies the pinned CA and pooler hostname", () => {
  const url = databaseUrl();
  // Simulate an unsafe query parameter: the explicit staged config must win.
  url.searchParams.set("sslmode", "no-verify");
  const config = pgClientConfigForApi(url.toString(), ENABLED);
  assert.equal(config.ssl?.rejectUnauthorized, true);
  assert.equal(config.ssl?.servername, HOST);
  assert.equal(config.ssl?.ca, SUPABASE_ROOT_2021_CA_PEM);
  assert.equal(config.host, HOST);
  assert.equal(config.port, 6543);
  assert.equal(config.user, `postgres.${STAGING_REF}`);
  assert.equal(config.password, url.password);
  assert.ok(!JSON.stringify(config.ssl).includes(url.password));
});

test("staging trust fails closed on wrong endpoints and production", () => {
  const url = databaseUrl();
  const invalidUrls = [
    databaseUrl({ username: "postgres.anotherproject" }),
    databaseUrl({ port: 5432 }),
    databaseUrl({ host: "127.0.0.1" }),
  ];
  for (const invalidUrl of invalidUrls) {
    assert.throws(
      () => pgClientConfigForApi(invalidUrl.toString(), ENABLED),
      /RIC-84 staging CA trust scope mismatch/,
    );
  }
  assert.throws(
    () =>
      pgClientConfigForApi(url.toString(), {
        ...ENABLED,
        KHLIM_ENV: "production",
      }),
    /RIC-84 staging CA trust scope mismatch/,
  );
});

test("no opt-in preserves current database URL parsing", () => {
  const url = databaseUrl();
  const config = pgClientConfigForApi(url.toString(), {});
  assert.equal(config.host, HOST);
  assert.equal(config.password, url.password);
  assert.equal(config.ssl, undefined);
});
