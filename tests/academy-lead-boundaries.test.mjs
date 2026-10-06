import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { Module } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const {
  AcademyLeadsService,
} = require("./dist/academy/academy-leads.service.js");
const {
  AcademyLeadsController,
} = require("./dist/academy/academy-leads.controller.js");
const { loadApiRuntimeConfig } = require("./dist/environment.js");

function fixture(overrides = {}) {
  const counts = new Map();
  const logs = [];
  const client = {
    submissionRateLimit: {
      findMany: async () => [],
      deleteMany: async () => ({ count: 0 }),
      upsert: async ({ where }) => {
        const count = (counts.get(where.key) ?? 0) + 1;
        counts.set(where.key, count);
        return { count };
      },
    },
    organization: { findUnique: async () => ({ status: "ACTIVE" }) },
    programmeOffering: { findFirst: async () => null },
    academyLead: {
      findUnique: async () => null,
      create: async () => assert.fail("Unexpected lead write"),
    },
    ...overrides,
  };
  const service = new AcademyLeadsService({ client });
  service.logger = { error: (event) => logs.push(event) };
  return { service, client, counts, logs };
}

async function httpServer(environment, service, callback) {
  class TestModule {}
  Module({
    controllers: [AcademyLeadsController],
    providers: [{ provide: AcademyLeadsService, useValue: service }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app
    .getHttpAdapter()
    .getInstance()
    .set("trust proxy", loadApiRuntimeConfig(environment).trustedProxy);
  await app.listen(0, "127.0.0.1");
  try {
    await callback(
      `http://127.0.0.1:${app.getHttpServer().address().port}/academy/leads`,
    );
  } finally {
    await app.close();
  }
}

async function post(url, body, headers = {}) {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("proxy configuration is explicit, consistent and fails closed", () => {
  for (const value of ["false", "0", ""]) {
    assert.equal(
      loadApiRuntimeConfig({
        TRUST_PROXY: value,
        KHLIM_TRUST_PROXY: "true",
        VERCEL: "1",
      }).trustedProxy,
      false,
    );
  }
  assert.equal(
    loadApiRuntimeConfig({ NODE_ENV: "production", VERCEL: "1" }).trustedProxy,
    false,
  );
  for (const key of ["TRUST_PROXY", "KHLIM_TRUST_PROXY"]) {
    for (const value of ["true", "1"]) {
      assert.throws(
        () => loadApiRuntimeConfig({ [key]: value }),
        /explicit TRUST_PROXY_ADDRESSES/,
      );
      assert.deepEqual(
        loadApiRuntimeConfig({
          [key]: value,
          TRUST_PROXY_ADDRESSES: "127.0.0.1,10.0.0.0/24,::1",
        }).trustedProxy,
        ["127.0.0.1", "10.0.0.0/24", "::1"],
      );
    }
  }
  for (const addresses of [
    "0.0.0.0/0",
    "::/0",
    "10.0.0.0/33",
    "garbage",
    "true",
    "127.0.0.1/8/2",
  ]) {
    assert.throws(
      () =>
        loadApiRuntimeConfig({
          TRUST_PROXY: "true",
          TRUST_PROXY_ADDRESSES: addresses,
        }),
      /IPs or non-global CIDRs/,
    );
  }
});

test("real HTTP requests ignore spoofed headers on direct and nontrusted paths", async () => {
  for (const environment of [
    {},
    { TRUST_PROXY: "true", TRUST_PROXY_ADDRESSES: "192.0.2.9" },
  ]) {
    const seen = [];
    await httpServer(
      environment,
      {
        createPublicLead: async (_body, ip) => {
          seen.push(ip);
          return {};
        },
      },
      async (url) => {
        await post(
          url,
          {},
          { "x-forwarded-for": "203.0.113.1", "x-real-ip": "203.0.113.2" },
        );
        await post(
          url,
          {},
          { "x-forwarded-for": "198.51.100.3", "x-real-ip": "198.51.100.4" },
        );
      },
    );
    assert.deepEqual(seen, ["127.0.0.1", "127.0.0.1"]);
  }
});

test("trusted proxy resolves nearest untrusted address; spoofing cannot evade IP quota", async () => {
  const { service } = fixture();
  const seen = [];
  const adapter = {
    createPublicLead: async (body, ip) => {
      seen.push(ip);
      await service.checkRateLimits(ip, body.phone);
      return { status: "RECEIVED" };
    },
  };
  await httpServer(
    { TRUST_PROXY: "true", TRUST_PROXY_ADDRESSES: "127.0.0.1,10.0.0.9" },
    adapter,
    async (url) => {
      for (let i = 0; i < 31; i++) {
        const response = await post(
          url,
          { phone: `+6012345${String(i).padStart(4, "0")}` },
          {
            "x-forwarded-for": `203.0.113.${i + 1}, 198.51.100.20, 10.0.0.9`,
            "x-real-ip": `203.0.113.${i + 1}`,
          },
        );
        assert.equal(response.status, i < 30 ? 201 : 429);
        if (i === 30) assert.equal(response.headers.get("retry-after"), "600");
      }
    },
  );
  assert.deepEqual([...new Set(seen)], ["198.51.100.20"]);
});

test("limiter database failure returns 503 with Retry-After and logs no submitted PII", async () => {
  const { service, client, logs } = fixture();
  client.submissionRateLimit.upsert = async () => {
    throw new Error("secret +60123456789 203.0.113.10");
  };
  await httpServer(
    {},
    {
      createPublicLead: async () =>
        service.checkRateLimits("203.0.113.10", "+60123456789"),
    },
    async (url) => {
      const response = await post(url, {});
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("retry-after"), "30");
      assert.doesNotMatch(
        await response.text(),
        /secret|60123456789|203\.0\.113/,
      );
    },
  );
  assert.deepEqual(logs, ["academy.leads.rate_limit_storage_failed"]);
});

test("cleanup bounds selection, preserves unrelated counters and reports failure", async () => {
  const { service, client, logs } = fixture();
  const now = new Date();
  client.submissionRateLimit.findMany = async (query) => {
    assert.equal(query.take, 500);
    assert.deepEqual(query.where, {
      key: { startsWith: "lead:" },
      expiresAt: { lt: now },
    });
    return [{ key: "lead:expired:owned" }];
  };
  client.submissionRateLimit.deleteMany = async (query) => {
    assert.deepEqual(query.where, {
      key: { in: ["lead:expired:owned"] },
      expiresAt: { lt: now },
    });
    return { count: 1 };
  };
  assert.equal(await service.cleanupExpiredRateLimits(now), 1);
  client.submissionRateLimit.findMany = async () => {
    throw new Error("private database detail");
  };
  await assert.rejects(
    service.cleanupExpiredRateLimits(),
    /cleanup unavailable/,
  );
  assert.deepEqual(logs, ["academy.leads.rate_limit_cleanup_failed"]);
});

test("closed offerings have a stable code and consume no submission quota", async () => {
  const { service, counts } = fixture();
  await assert.rejects(
    service.createPublicLead(
      {
        guardianName: "Test Guardian",
        phone: "0123456789",
        childAge: 10,
        consent: true,
        programmeOfferingId: "00000000-0000-4000-8000-000000000002",
      },
      "127.0.0.1",
    ),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().code, "LEAD_OFFERING_UNAVAILABLE");
      return true;
    },
  );
  assert.equal(counts.size, 0);
});
