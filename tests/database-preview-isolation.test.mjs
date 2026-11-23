import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { after, test } from "node:test";

const require = createRequire(import.meta.url);
const apiRequire = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const pg = apiRequire("pg");
const { Client, Pool } = pg;
let poolsCreated = 0;
// Install before importing the health probe, which subclasses pg.Pool.
pg.Pool = class extends Pool {
  constructor(...args) {
    super(...args);
    poolsCreated++;
  }
};
after(() => {
  pg.Pool = Pool;
});
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

const deploymentCases = [
  ["explicit Preview", { ...PREVIEW, KHLIM_ENV: "production" }],
  ["all markers absent", {}],
  ["only the Vercel marker", { VERCEL: "1" }],
  ["unknown target", { VERCEL: "1", VERCEL_ENV: "unknown" }],
  ["production target alone", { VERCEL_ENV: "production" }],
  [
    "contradictory Vercel targets",
    {
      VERCEL: "1",
      VERCEL_ENV: "production",
      VERCEL_TARGET_ENV: "preview",
    },
  ],
  [
    "production marker with staging app context",
    {
      VERCEL: "1",
      VERCEL_ENV: "production",
      KHLIM_ENV: "staging",
    },
  ],
  [
    "local-like settings without Vercel markers",
    {
      NODE_ENV: "development",
      KHLIM_ENV: "development",
    },
  ],
  ["development target", { VERCEL: "1", VERCEL_ENV: "development" }],
  [
    "unmarked hosted runtime",
    { NODE_ENV: "production", KHLIM_ENV: "production" },
  ],
];

test("only consistent Vercel production markers authorize ordinary remote pg configuration", () => {
  const url = databaseUrl({ user: `postgres.${PRODUCTION}` });
  for (const [name, env] of deploymentCases) {
    assert.throws(() => pgClientConfigForApi(url.href, env), REJECTED, name);
  }
  const config = pgClientConfigForApi(url.href, {
    VERCEL: "1",
    VERCEL_ENV: "production",
    VERCEL_TARGET_ENV: "production",
    KHLIM_ENV: "production",
    NODE_ENV: "production",
  });
  assert.equal(config.connectionString, url.href);
  const client = new Client(config);
  assert.equal(client.user, `postgres.${PRODUCTION}`);
  assert.equal(client.host, HOST);
});

test("unmarked development keeps explicit loopback access and staging keeps verified TLS", () => {
  for (const local of [
    "postgresql://localhost:5432/test",
    "postgresql://127.0.0.1:5432/test",
    "postgresql:///test?host=localhost",
  ]) {
    assert.equal(pgClientConfigForApi(local, {}).connectionString, local);
    assert.equal(
      pgClientConfigForApi(local, { VERCEL_ENV: "development" })
        .connectionString,
      local,
    );
    assert.throws(() => pgClientConfigForApi(local, PREVIEW), REJECTED);
  }
  const config = pgClientConfigForApi(databaseUrl().href, {});
  assert.equal(config.host, HOST);
  assert.deepEqual(config.ssl, { rejectUnauthorized: true, servername: HOST });
});

test("ambiguous or rejected configuration blocks Prisma pool creation, sockets and SQL", async (t) => {
  const url = databaseUrl({ user: `postgres.${PRODUCTION}` });
  const redirected = databaseUrl();
  redirected.searchParams.set("user", `postgres.${PRODUCTION}`);
  const loopbackOverride = new URL("postgresql://127.0.0.1:5432/postgres");
  loopbackOverride.searchParams.set("host", HOST);
  loopbackOverride.searchParams.set("user", `postgres.${PRODUCTION}`);
  const hostless = new URL(loopbackOverride);
  hostless.host = "";
  const values = [
    "DATABASE_URL",
    "VERCEL",
    "VERCEL_ENV",
    "VERCEL_TARGET_ENV",
    "KHLIM_ENV",
    "KHLIM_RIC84_SUPABASE_CA_2021",
    "NODE_ENV",
    "PGHOST",
  ];
  const restore = values.map((key) => [key, process.env[key]]);
  t.after(() => {
    for (const [key, value] of restore) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const fail = () => assert.fail("rejected configuration reached PostgreSQL");
  const poolConnect = t.mock.method(Pool.prototype, "connect", fail);
  const socketConnect = t.mock.method(Socket.prototype, "connect", fail);
  const sql = t.mock.method(Client.prototype, "query", fail);
  const logs = [];
  t.mock.method(process.stderr, "write", (line) => {
    logs.push(String(line));
    return true;
  });
  const cases = [
    ...deploymentCases.map(([name, env]) => [name, env, url]),
    ["Preview identity override", PREVIEW, redirected],
    ["nonlocal effective pg host", {}, loopbackOverride],
    ["hostless URL with remote pg host", {}, hostless],
    [
      "hostless URL with remote PGHOST",
      { PGHOST: HOST },
      new URL("postgresql:///postgres"),
    ],
    ["missing configuration", PREVIEW, undefined],
  ];
  const previousPoolCount = poolsCreated;
  for (const [name, env, fixture] of cases) {
    for (const key of values) delete process.env[key];
    Object.assign(process.env, env);
    if (fixture) process.env.DATABASE_URL = fixture.href;
    const prisma = new PrismaService();
    await assert.rejects(
      async () => prisma.client.$executeRaw`SELECT 1`,
      fixture ? REJECTED : /DATABASE_URL is required before database access/,
      name,
    );
    const probe = await prisma.probe();
    assert.equal(probe.stage, "configuration", name);
    assert.equal(
      probe.category,
      fixture ? "preview_database_rejected" : "missing_database_url",
      name,
    );
    assert.deepEqual(
      await new HealthController(prisma).getHealth(),
      {
        service: "khlim-api",
        status: "error",
        database: { status: "disconnected" },
      },
      name,
    );
    await prisma.onModuleDestroy();
  }

  assert.equal(poolsCreated, previousPoolCount);
  assert.equal(poolConnect.mock.callCount(), 0);
  assert.equal(socketConnect.mock.callCount(), 0);
  assert.equal(sql.mock.callCount(), 0);
  assert.equal(logs.length, cases.length);
  for (const log of logs) {
    assert.equal(JSON.parse(log).stage, "configuration");
    assert.doesNotMatch(log, /postgresql:|supabase\.com/);
    for (const secret of [url.password, redirected.password, PRODUCTION]) {
      assert.ok(!log.includes(secret));
    }
  }
});
