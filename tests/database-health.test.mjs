import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";

const require = createRequire(import.meta.url);
const apiRequire = createRequire(
  new globalThis.URL("../apps/api/package.json", import.meta.url),
);
const {
  probeDatabase,
  classifyProbeError,
  PROBE_DEADLINE_MS,
} = require("../apps/api/dist/database/health-probe.js");
const { HealthController } = require("../apps/api/dist/health.controller.js");
const fixtureUrl = new globalThis.URL("postgresql://127.0.0.1:1/test");
fixtureUrl.username = "synthetic";
fixtureUrl.password = randomUUID();
const URL = fixtureUrl.toString();

function operation(error) {
  let closed = 0;
  return {
    query: async () => {
      if (error) throw error;
      return [{ result: 1 }];
    },
    close: async () => {
      closed++;
    },
    get closed() {
      return closed;
    },
  };
}

test("successful Prisma probe closes its isolated client and returns connected", async () => {
  const op = operation();
  const result = await probeDatabase(URL, () => op);
  assert.equal(result.connected, true);
  assert.equal(result.category, undefined);
  assert.equal(result.stage, "query");
  assert.ok(result.durationMs >= 0);
  assert.equal(op.closed, 1);
});

test("missing/invalid configuration fails before creating any database client", async () => {
  for (const [url, category] of [
    [undefined, "missing_database_url"],
    ["  ", "missing_database_url"],
    ["not a URL", "invalid_database_url"],
    ["https://example.invalid", "invalid_database_url"],
  ]) {
    const result = await probeDatabase(url, () =>
      assert.fail("must not connect"),
    );
    assert.equal(result.connected, false);
    assert.equal(result.stage, "configuration");
    assert.equal(result.category, category);
  }
});

for (const [code, category] of [
  ["ENOTFOUND", "dns_failure"],
  ["EAI_AGAIN", "dns_failure"],
  ["ENETUNREACH", "network_unreachable"],
  ["EHOSTUNREACH", "network_unreachable"],
  ["ECONNREFUSED", "connection_refused"],
  ["ECONNRESET", "network_unreachable"],
  ["28P01", "auth_rejected"],
  ["28000", "auth_rejected"],
  ["CERT_HAS_EXPIRED", "tls_failure"],
  ["P1011", "tls_failure"],
  ["57014", "probe_timeout"],
  ["ETIMEDOUT", "probe_timeout"],
  ["P1002", "probe_timeout"],
  ["53300", "query_failure"],
]) {
  test(`nested Prisma/pg ${code} is classified as ${category} without raw error fields`, async () => {
    const error = {
      code: "P2010",
      message: `secret ${URL}`,
      meta: {
        driverAdapterError: {
          cause: { originalCode: code, originalMessage: "private data" },
        },
      },
    };
    const op = operation(error);
    const result = await probeDatabase(URL, () => op);
    assert.equal(result.connected, false);
    assert.equal(result.category, category);
    assert.equal(result.code, code);
    assert.equal(op.closed, 1);
    assert.doesNotMatch(
      JSON.stringify(result),
      /synthetic|private|postgresql|originalMessage/,
    );
  });
}

test("classifier handles pg code-less timeouts, TLS adapter kinds, cycles and hostile getters", () => {
  assert.deepEqual(classifyProbeError(new Error("Query read timeout")), {
    category: "probe_timeout",
  });
  assert.deepEqual(
    classifyProbeError({ cause: { kind: "TlsConnectionError", reason: URL } }),
    { category: "tls_failure" },
  );
  const error = { code: "secret-user-code", message: URL };
  error.cause = error;
  Object.defineProperty(error, "meta", {
    get() {
      throw new Error(URL);
    },
  });
  assert.deepEqual(classifyProbeError(error), { category: "unknown" });
});

test("unknown pg errors report only fixed diagnostics", async (t) => {
  const events = [];
  t.mock.method(process.stderr, "write", (line) => {
    events.push(JSON.parse(line));
    return true;
  });
  const password = "test-only-secret-123";
  const poolerUrl =
    `postgresql://postgres.qxsjxcbfhxbvxigghhlq:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  const driverError = new TypeError(`private driver error ${password}`);
  driverError.code = "PRIVATE_NOT_ALLOWLISTED";
  const failingOperation = () => ({
    query: async () => {
      throw driverError;
    },
    close: async () => {},
    errorOrigin: () => "pg_pool",
  });
  const controller = new HealthController({
    probe: () => probeDatabase(poolerUrl, failingOperation),
  });
  assert.deepEqual(await controller.getHealth(), {
    service: "khlim-api",
    status: "error",
    database: { status: "disconnected" },
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].category, "unknown");
  assert.equal(events[0].stage, "query");
  assert.equal(events[0].code, undefined);
  assert.deepEqual(events[0].diagnostic, {
    origin: "pg_pool",
    errorShape: "type_error",
    connectionMode: "supavisor_transaction",
    poolerUsername: "project_scoped",
    passwordPresent: true,
  });
  assert.doesNotMatch(
    JSON.stringify(events),
    /test-only-secret|private driver|aws-0|postgresql:\/\/|qxsjxcb|PRIVATE_NOT_ALLOWLISTED/,
  );
});

test("unknown errors classify endpoints without values", async () => {
  const fixtures = [
    [
      "postgresql://postgres.example:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
      "supavisor_transaction",
      "project_scoped",
      true,
    ],
    [
      "postgresql://postgres:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
      "supavisor_session",
      "other",
      true,
    ],
    [
      "postgresql://postgres@db.example.supabase.co:5432/postgres",
      "supabase_direct",
      "not_applicable",
      false,
    ],
    [
      "postgresql://postgres:secret@127.0.0.1:5432/postgres",
      "other",
      "not_applicable",
      true,
    ],
  ];
  for (const [url, mode, username, hasPassword] of fixtures) {
    const result = await probeDatabase(url, () => ({
      query: async () => {
        throw new Error(`sensitive failure ${url}`);
      },
      close: async () => {},
    }));
    assert.equal(result.category, "unknown");
    assert.deepEqual(result.diagnostic, {
      origin: "unavailable",
      errorShape: "error",
      connectionMode: mode,
      poolerUsername: username,
      passwordPresent: hasPassword,
    });
    assert.doesNotMatch(
      JSON.stringify(result),
      /secret|sensitive failure|postgresql:\/\/|example\.supabase|127\.0\.0\.1/,
    );
  }
});

test("2-second watchdog closes in-flight work instead of abandoning the Promise.race", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let rejectQuery;
  let inFlight = false;
  let closed = 0;
  const pending = probeDatabase(URL, () => ({
    query() {
      inFlight = true;
      return new Promise((_, reject) => {
        rejectQuery = reject;
      });
    },
    async close() {
      closed++;
      inFlight = false;
      rejectQuery(new Error("socket closed"));
    },
  }));
  t.mock.timers.tick(PROBE_DEADLINE_MS);
  const result = await pending;
  assert.equal(result.category, "probe_timeout");
  assert.equal(result.code, "KHLIM_PROBE_TIMEOUT");
  assert.equal(result.connected, false);
  assert.equal(closed, 1);
  assert.equal(inFlight, false);
});

test("a slow successful probe inside the deadline is not misclassified", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let resolve;
  const pending = probeDatabase(URL, () => ({
    query: () =>
      new Promise((r) => {
        resolve = r;
      }),
    close: async () => {},
  }));
  t.mock.timers.tick(PROBE_DEADLINE_MS - 1);
  resolve([{ result: 1 }]);
  assert.equal((await pending).connected, true);
});

test("synchronous setup/query failures and cleanup failures are not healthy and still dispose", async () => {
  const setup = await probeDatabase(URL, () => {
    throw { code: "P1013", message: URL };
  });
  assert.equal(setup.category, "invalid_database_url");
  assert.equal(setup.stage, "configuration");
  let closed = 0;
  const query = await probeDatabase(URL, () => ({
    query() {
      throw { code: "ECONNREFUSED" };
    },
    async close() {
      closed++;
    },
  }));
  assert.equal(query.category, "connection_refused");
  assert.equal(closed, 1);
  const cleanup = await probeDatabase(URL, () => ({
    query: async () => {},
    close: async () => {
      throw new Error(URL);
    },
  }));
  assert.equal(cleanup.connected, false);
  assert.equal(cleanup.stage, "cleanup");
});

test("public response stays minimal; exactly one structured redacted failure event per probe", async (t) => {
  const events = [];
  t.mock.method(process.stderr, "write", (line) => {
    events.push(JSON.parse(line));
    return true;
  });
  const error = {
    code: "P2010",
    message: URL,
    stack: "JWT private-user",
    meta: {
      cause: {
        code: "28P01",
        username: "private-user",
        parameters: ["private data"],
      },
    },
  };
  const controller = new HealthController({
    probe: () => probeDatabase(URL, () => operation(error)),
  });
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.deepEqual(await controller.getHealth(), {
      service: "khlim-api",
      status: "error",
      database: { status: "disconnected" },
    });
    assert.deepEqual(await new HealthController().getHealth(), {
      service: "khlim-api",
      status: "error",
      database: { status: "unconfigured" },
    });
    const success = new HealthController({
      probe: () => probeDatabase(URL, () => operation()),
    });
    assert.deepEqual(await success.getHealth(), {
      service: "khlim-api",
      status: "ok",
      database: { status: "connected" },
    });
    assert.equal(events.length, 2);
    assert.equal(events[0].event, "database.health_probe.failed");
    assert.equal(events[0].category, "auth_rejected");
    assert.equal(events[0].code, "28P01");
    assert.equal(events[1].category, "missing_database_support");
    assert.deepEqual(
      Object.keys(events[0]).sort(),
      [
        "timestamp",
        "level",
        "service",
        "event",
        "durationMs",
        "stage",
        "category",
        "code",
      ].sort(),
    );
    assert.doesNotMatch(
      JSON.stringify(events),
      /postgresql|synthetic|private|password|username|stack|parameters|JWT/,
    );
    assert.ok(!JSON.stringify(events).includes(fixtureUrl.password));
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test(
  "real Prisma/pg handshake to an owned nonresponsive loopback server is bounded and sockets close",
  { timeout: 7000 },
  async () => {
    const sockets = new Set();
    let peerClosed;
    const closed = new Promise((resolve) => {
      peerClosed = resolve;
    });
    const server = createServer((socket) => {
      sockets.add(socket);
      // Drain startup bytes without answering, so this synthetic peer observes
      // the client's FIN rather than retaining unread data in paused mode.
      socket.resume();
      socket.on("close", () => {
        sockets.delete(socket);
        peerClosed();
      });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      // URL attempts to disable timeouts must not override the probe's own bounds.
      const result = await probeDatabase(
        `postgresql://synthetic:fixture@127.0.0.1:${address.port}/test?connectionTimeoutMillis=0&query_timeout=0`,
      );
      assert.equal(result.connected, false);
      assert.equal(result.category, "probe_timeout");
      assert.ok(result.durationMs < 4000);
      let timer;
      try {
        await Promise.race([
          closed,
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("probe leaked its socket")),
              1000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      assert.equal(sockets.size, 0);
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

test("real pg acquisition preserves ECONNREFUSED before Prisma normalizes it", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  const result = await probeDatabase(
    `postgresql://synthetic:fixture@127.0.0.1:${port}/test`,
  );
  assert.equal(result.connected, false);
  assert.equal(result.category, "connection_refused");
  assert.equal(result.code, "ECONNREFUSED");
  assert.equal(result.stage, "connect");
});

test("concurrent health requests share one bounded operation and log once per failed request", async (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = URL;
  t.after(() => {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });
  const probeModule = require("../apps/api/dist/database/health-probe.js");
  const {
    PrismaService,
  } = require("../apps/api/dist/database/prisma.service.js");
  let finish;
  let calls = 0;
  t.mock.method(probeModule, "probeDatabase", () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  let events = 0;
  t.mock.method(process.stderr, "write", () => {
    events++;
    return true;
  });
  const service = new PrismaService();
  const controller = new HealthController(service);
  const first = controller.getHealth();
  const second = controller.getHealth();
  assert.equal(calls, 1);
  finish({
    connected: false,
    durationMs: 1,
    stage: "connect",
    category: "dns_failure",
    code: "ENOTFOUND",
  });
  await Promise.all([first, second]);
  assert.equal(events, 2);
  assert.equal((await controller.getHealth()).status, "error");
  assert.equal(
    calls,
    1,
    "sequential requests inside the TTL reuse bounded work",
  );
  assert.equal(events, 3, "cached failures still log exactly once per request");
  t.mock.timers.tick(1001);
  const next = controller.getHealth();
  assert.equal(calls, 2);
  finish({ connected: true, durationMs: 1, stage: "query" });
  await next;
  assert.equal(events, 3);
  delete process.env.DATABASE_URL;
  const missing = controller.getHealth();
  assert.equal(calls, 3, "missing configuration cannot reuse cached success");
  finish({
    connected: false,
    durationMs: 0,
    stage: "configuration",
    category: "missing_database_url",
  });
  assert.equal((await missing).status, "error");
  assert.equal(events, 4);
});

test("stalled cleanup is bounded by the remaining overall deadline", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let clock = 0;
  let closeCalled = false;
  let enterCleanup;
  const entered = new Promise((resolve) => {
    enterCleanup = resolve;
  });
  const resultPromise = probeDatabase(
    URL,
    () => ({
      query: async () => {
        clock = 1500;
      },
      close: () => {
        closeCalled = true;
        enterCleanup();
        return new Promise(() => {});
      },
    }),
    () => clock,
  );
  await entered;
  clock = PROBE_DEADLINE_MS;
  t.mock.timers.tick(500);
  const result = await resultPromise;
  assert.equal(closeCalled, true);
  assert.equal(result.connected, false);
  assert.equal(result.stage, "cleanup");
  assert.equal(result.category, "probe_timeout");
  assert.equal(result.durationMs, PROBE_DEADLINE_MS);
});

test("expired query budget initiates disposal without waiting on stalled pool bookkeeping", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let clock = 0;
  let closeCalled = false;
  let rejectCleanup;
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  t.after(() => process.off("unhandledRejection", onUnhandled));
  const pending = probeDatabase(
    URL,
    () => ({
      query: () => new Promise(() => {}),
      close: () => {
        closeCalled = true;
        return new Promise((_, reject) => {
          rejectCleanup = reject;
        });
      },
    }),
    () => clock,
  );
  clock = PROBE_DEADLINE_MS;
  t.mock.timers.tick(PROBE_DEADLINE_MS);
  const result = await pending;
  assert.equal(closeCalled, true);
  assert.equal(result.stage, "query");
  assert.equal(result.category, "probe_timeout");
  assert.equal(result.durationMs, PROBE_DEADLINE_MS);
  rejectCleanup(new Error("late cleanup failure"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(unhandled, [], "late cleanup rejection must be observed");
});

test(
  "real Prisma query timeout closes a peer that authenticates but never answers SELECT",
  { timeout: 7000 },
  async () => {
    const sockets = new Set();
    let querySeen = false;
    let peerClosed;
    const closed = new Promise((resolve) => {
      peerClosed = resolve;
    });
    const server = createServer((socket) => {
      sockets.add(socket);
      let authenticated = false;
      socket.on("data", () => {
        if (!authenticated) {
          authenticated = true;
          // Minimal PostgreSQL AuthenticationOk + ReadyForQuery. No credentials
          // are verified or stored by this owned synthetic loopback-only peer.
          socket.write(
            Buffer.from([82, 0, 0, 0, 8, 0, 0, 0, 0, 90, 0, 0, 0, 5, 73]),
          );
        } else {
          querySeen = true;
        }
      });
      socket.on("close", () => {
        sockets.delete(socket);
        peerClosed();
      });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { port } = server.address();
      const result = await probeDatabase(
        `postgresql://synthetic:fixture@127.0.0.1:${port}/test`,
      );
      assert.equal(querySeen, true);
      assert.equal(result.connected, false);
      assert.equal(result.category, "probe_timeout");
      assert.equal(result.stage, "query");
      assert.ok(result.durationMs < 4000);
      let timer;
      try {
        await Promise.race([
          closed,
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("query leaked its socket")),
              1000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      assert.equal(sockets.size, 0);
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

test(
  "a successful Prisma query stays healthy without injecting pooler-incompatible startup settings",
  { timeout: 5000 },
  async () => {
    const sockets = new Set();
    let startup = "";
    let startupBuffer = Buffer.alloc(0);
    const message = (tag, payload) => {
      const size = Buffer.alloc(4);
      size.writeInt32BE(payload.length + 4);
      return Buffer.concat([Buffer.from(tag), size, payload]);
    };
    const server = createServer((socket) => {
      sockets.add(socket);
      let authenticated = false;
      socket.on("data", (data) => {
        if (!authenticated) {
          // TCP can split the startup packet; inspect only the complete frame.
          startupBuffer = Buffer.concat([startupBuffer, data]);
          if (startupBuffer.length < 4) return;
          const startupLength = startupBuffer.readUInt32BE(0);
          if (startupLength < 8 || startupLength > 65536) {
            socket.destroy();
            return;
          }
          if (startupBuffer.length < startupLength) return;
          startup = startupBuffer.subarray(0, startupLength).toString("utf8");
          authenticated = true;
          socket.write(
            Buffer.from([82, 0, 0, 0, 8, 0, 0, 0, 0, 90, 0, 0, 0, 5, 73]),
          );
        } else if (data[0] === 81) {
          // SELECT 1: one text-format int4 column, one row, command complete.
          const column = Buffer.alloc(18);
          column.writeInt32BE(23, 6);
          column.writeInt16BE(4, 10);
          column.writeInt32BE(-1, 12);
          socket.write(
            Buffer.concat([
              message(
                "T",
                Buffer.concat([
                  Buffer.from([0, 1]),
                  Buffer.from("result\0"),
                  column,
                ]),
              ),
              message("D", Buffer.from([0, 1, 0, 0, 0, 1, 49])),
              message("C", Buffer.from("SELECT 1\0")),
              message("Z", Buffer.from("I")),
            ]),
          );
        } else if (data[0] === 88) {
          socket.end();
        }
      });
      socket.on("close", () => sockets.delete(socket));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { port } = server.address();
      const result = await probeDatabase(
        `postgresql://synthetic:fixture@127.0.0.1:${port}/test`,
      );
      assert.equal(result.connected, true);
      assert.equal(result.category, undefined);
      assert.doesNotMatch(
        startup,
        /statement_timeout|query_timeout|connectionTimeoutMillis/,
      );
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

test("HTTP health retains 200 and minimal JSON for connected/disconnected/unconfigured states", async (t) => {
  apiRequire("reflect-metadata");
  const { Module } = apiRequire("@nestjs/common");
  const { NestFactory } = apiRequire("@nestjs/core");
  const {
    PrismaService,
  } = require("../apps/api/dist/database/prisma.service.js");
  const events = [];
  t.mock.method(process.stderr, "write", (line) => {
    events.push(JSON.parse(line));
    return true;
  });
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    for (const connected of [true, false, undefined]) {
      class TestModule {}
      Module({
        controllers: [HealthController],
        providers:
          connected === undefined
            ? []
            : [
                {
                  provide: PrismaService,
                  useValue: {
                    probe: async () => ({
                      connected,
                      durationMs: 1,
                      stage: "query",
                      ...(connected
                        ? {}
                        : { category: "dns_failure", code: "ENOTFOUND" }),
                    }),
                  },
                },
              ],
      })(TestModule);
      const app = await NestFactory.create(TestModule, { logger: false });
      app.setGlobalPrefix("v1");
      try {
        await app.listen(0, "127.0.0.1");
        const response = await fetch(`${await app.getUrl()}/v1/health`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          service: "khlim-api",
          status: connected ? "ok" : "error",
          database: {
            status:
              connected === undefined
                ? "unconfigured"
                : connected
                  ? "connected"
                  : "disconnected",
          },
        });
      } finally {
        await app.close();
      }
    }
    assert.equal(events.length, 2);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test("production health never exposes a database project reference or failure reason", async (t) => {
  t.mock.method(process.stderr, "write", () => true);
  const previousUrl = process.env.DATABASE_URL;
  const previousEnv = process.env.KHLIM_ENV;
  process.env.DATABASE_URL =
    "postgresql://postgres.syntheticref@aws-0.pooler.supabase.com:6543/test";
  process.env.KHLIM_ENV = "production";
  try {
    const response = await new HealthController({
      probe: async () => ({
        connected: false,
        durationMs: 2,
        stage: "query",
        category: "auth_rejected",
        code: "28P01",
      }),
    }).getHealth();
    assert.deepEqual(response, {
      service: "khlim-api",
      status: "error",
      database: { status: "disconnected" },
    });
  } finally {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    if (previousEnv === undefined) delete process.env.KHLIM_ENV;
    else process.env.KHLIM_ENV = previousEnv;
  }
});
