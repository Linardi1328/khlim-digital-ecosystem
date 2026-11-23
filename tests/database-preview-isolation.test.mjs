import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const apiRequire = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { Client, Pool } = apiRequire("pg");
const {
  pgClientConfigForApi,
} = require("../apps/api/dist/database/pg-client-config.js");
const {
  PrismaService,
} = require("../apps/api/dist/database/prisma.service.js");
const { HealthController } = require("../apps/api/dist/health.controller.js");

const STAGING = "qxsjxcbfhxbvxigghhlq";
const PRODUCTION = "fmpsuhjlbpfgscfjbsvb";
const HOST = "aws-0-ap-southeast-1.pooler.supabase.com";
const PREVIEW = { VERCEL_ENV: "preview", KHLIM_ENV: "staging" };
const PINNED = { ...PREVIEW, KHLIM_RIC84_SUPABASE_CA_2021: "1" };
const REJECTED = { code: "KHLIM_PREVIEW_DB_REJECTED" };

function databaseUrl({
  host = HOST,
  port = "6543",
  user = `postgres.${STAGING}`,
} = {}) {
  const url = new URL(`postgresql://${host}${port ? `:${port}` : ""}/postgres`);
  url.username = user;
  url.password = randomUUID();
  return url;
}

test("Preview uses the approved effective pg destination and verifies TLS with or without the pinned CA", () => {
  const url = databaseUrl({ user: `postgres%2E${STAGING}` });
  url.searchParams.set("sslmode", "verify-full");
  for (const environment of [PREVIEW, PINNED]) {
    const client = new Client(pgClientConfigForApi(url.href, environment));
    assert.equal(client.host, HOST);
    assert.equal(client.port, 6543);
    assert.equal(client.user, `postgres.${STAGING}`);
    assert.equal(client.database, "postgres");
    assert.equal(client.ssl.rejectUnauthorized, true);
    assert.equal(client.ssl.servername, HOST);
    assert.equal(Boolean(client.ssl.ca), environment === PINNED);
    assert.equal(client.ssl.checkServerIdentity, undefined);
  }
});

test("the isolated probe retains the approved pg destination and pinned TLS with an owned transport", async (t) => {
  const url = databaseUrl();
  url.searchParams.set("sslmode", "require");
  const env = { ...PINNED, DATABASE_URL: url.href };
  for (const [key, value] of Object.entries(env)) {
    const previous = process.env[key];
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
    process.env[key] = value;
  }
  const socketConnect = t.mock.method(Socket.prototype, "connect", () => {
    assert.fail("Preview probe attempted a network connection");
  });
  const connect = t.mock.method(Client.prototype, "connect", (done) => {
    done(
      Object.assign(new Error("synthetic refusal"), { code: "ECONNREFUSED" }),
    );
  });

  const probe = await new PrismaService().probe();
  assert.equal(probe.stage, "connect");
  assert.equal(probe.code, "ECONNREFUSED");
  assert.equal(connect.mock.callCount(), 1);
  assert.equal(socketConnect.mock.callCount(), 0);
  const { this: client } = connect.mock.calls[0];
  assert.equal(client.host, HOST);
  assert.equal(client.port, 6543);
  assert.equal(client.user, `postgres.${STAGING}`);
  assert.equal(client.database, "postgres");
  assert.equal(client.ssl.rejectUnauthorized, true);
  assert.equal(client.ssl.servername, HOST);
  assert.equal(client.ssl.checkServerIdentity, undefined);
  assert.equal(client.ssl.ca, pgClientConfigForApi(url.href, PINNED).ssl.ca);
  assert.equal(client.connection.stream.destroyed, true);
});

test("Preview rejects production, unknown projects, and unapproved endpoint shapes", () => {
  for (const overrides of [
    { user: `postgres.${PRODUCTION}` },
    { user: "postgres.unknownproject" },
    { user: `postgres.${STAGING}.${PRODUCTION}` },
    { host: `db.${PRODUCTION}.supabase.co`, port: "5432", user: "postgres" },
    { host: `db.${STAGING}.supabase.co`, port: "5432", user: "postgres" },
    { host: `${HOST}.example.test` },
    { host: `${HOST}.` },
    { host: "%2fvar%2frun" },
    { host: "aws-1-ap-southeast-1.pooler.supabase.com" },
    { port: "5432" },
    { port: "" },
  ]) {
    assert.throws(
      () => pgClientConfigForApi(databaseUrl(overrides).href, PREVIEW),
      REJECTED,
    );
  }
});

test("query and TLS overrides are rejected before pg parses them", () => {
  for (const [key, value] of [
    ["host", "127.0.0.1"],
    ["port", "5432"],
    ["user", `postgres.${PRODUCTION}`],
    ["connectionString", databaseUrl({ user: `postgres.${PRODUCTION}` }).href],
    ["ssl", "0"],
    ["sslmode", "no-verify"],
    ["sslmode", "disable"],
    ["sslrootcert", "/synthetic/path"],
    ["sslnegotiation", "direct"],
    ["uselibpqcompat", "true"],
  ]) {
    const url = databaseUrl();
    url.searchParams.set(key, value);
    for (const environment of [
      PREVIEW,
      PINNED,
      { ...PINNED, VERCEL_ENV: undefined },
    ]) {
      assert.throws(
        () => pgClientConfigForApi(url.href, environment),
        REJECTED,
      );
    }
  }
  const url = databaseUrl();
  for (const search of [
    "?sslmode=require&sslmode=verify-full",
    "?%68ost=127.0.0.1",
  ]) {
    url.search = search;
    assert.throws(() => pgClientConfigForApi(url.href, PINNED), REJECTED);
  }
});

test("malformed configuration and mis-scoped CA flags fail with fixed codes", () => {
  const url = databaseUrl();
  for (const value of ["", "invalid", url.href.replace(url.password, "%zz")]) {
    assert.throws(() => pgClientConfigForApi(value, PREVIEW), REJECTED);
  }
  for (const env of [
    { ...PREVIEW, KHLIM_RIC84_SUPABASE_CA_2021: "true" },
    { ...PINNED, KHLIM_ENV: "production" },
    { ...PINNED, VERCEL_ENV: "production" },
  ]) {
    assert.throws(() => pgClientConfigForApi(url.href, env), {
      code: "KHLIM_STAGING_CA_SCOPE",
    });
  }
});

test("Vercel Preview detection is independent of KHLIM_ENV and ambiguous Vercel context fails closed", () => {
  const url = databaseUrl({ user: `postgres.${PRODUCTION}` });
  for (const env of [
    { ...PREVIEW, KHLIM_ENV: "production" },
    { VERCEL: "1" },
    { VERCEL: "1", VERCEL_ENV: "unknown" },
  ]) {
    assert.throws(() => pgClientConfigForApi(url.href, env), REJECTED);
  }
  const config = pgClientConfigForApi(url.href, {
    VERCEL: "1",
    VERCEL_ENV: "production",
    KHLIM_ENV: "production",
  });
  assert.equal(config.connectionString, url.href);
  const client = new Client(config);
  assert.equal(client.host, HOST);
  assert.equal(client.port, 6543);
  assert.equal(client.user, `postgres.${PRODUCTION}`);
  assert.equal(client.ssl, false);

  // If Vercel system markers are not exposed, production-like hosted
  // environments must still reject any production connection destination.
  for (const markersMissing of [
    { NODE_ENV: "production" },
    { NODE_ENV: "production", KHLIM_ENV: "production" },
    { KHLIM_ENV: "staging" },
    { KHLIM_ENV: "production" },
  ]) {
    assert.throws(() => pgClientConfigForApi(url.href, markersMissing), REJECTED);
  }
});

test("rejected or absent Preview configuration blocks Prisma writes and health before pool acquisition or network access", async (t) => {
  const url = databaseUrl({ user: `postgres.${PRODUCTION}` });
  const redirected = databaseUrl();
  redirected.searchParams.set("user", `postgres.${PRODUCTION}`);
  const values = [
    "DATABASE_URL",
    "VERCEL_ENV",
    "KHLIM_ENV",
    "KHLIM_RIC84_SUPABASE_CA_2021",
  ];
  const restore = values.map((key) => [key, process.env[key]]);
  t.after(() => {
    for (const [key, value] of restore) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.VERCEL_ENV = "preview";
  process.env.KHLIM_ENV = "staging";
  delete process.env.KHLIM_RIC84_SUPABASE_CA_2021;

  const fail = () =>
    assert.fail("rejected configuration reached network acquisition");
  const poolConnect = t.mock.method(Pool.prototype, "connect", fail);
  const socketConnect = t.mock.method(Socket.prototype, "connect", fail);
  const logs = [];
  t.mock.method(process.stderr, "write", (line) => {
    logs.push(String(line));
    return true;
  });

  for (const fixture of [url, redirected, undefined]) {
    if (fixture) process.env.DATABASE_URL = fixture.href;
    else delete process.env.DATABASE_URL;
    const prisma = new PrismaService();
    await assert.rejects(
      async () =>
        prisma.client
          .$executeRaw`INSERT INTO ric120_synthetic_probe VALUES (1)`,
      fixture ? REJECTED : /DATABASE_URL is required before database access/,
    );
    const probe = await prisma.probe();
    assert.equal(probe.stage, "configuration");
    assert.equal(
      probe.category,
      fixture ? "preview_database_rejected" : "missing_database_url",
    );
    assert.deepEqual(await new HealthController(prisma).getHealth(), {
      service: "khlim-api",
      status: "error",
      database: { status: "disconnected" },
    });
    await prisma.onModuleDestroy();
  }

  assert.equal(poolConnect.mock.callCount(), 0);
  assert.equal(socketConnect.mock.callCount(), 0);
  assert.equal(logs.length, 3);
  for (const log of logs) {
    assert.equal(JSON.parse(log).stage, "configuration");
    assert.doesNotMatch(log, /postgresql:|supabase\.com/);
    for (const secret of [url.password, redirected.password, PRODUCTION]) {
      assert.ok(!log.includes(secret));
    }
  }
});
