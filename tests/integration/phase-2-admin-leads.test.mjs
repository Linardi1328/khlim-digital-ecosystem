import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const apiRequire = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const require = createRequire(import.meta.url);

const { UnauthorizedException } = apiRequire("@nestjs/common");
const { NestFactory } = apiRequire("@nestjs/core");
const { AppModule } = require("../../apps/api/dist/app.module.js");
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const {
  SupabaseJwtService,
} = require("../../apps/api/dist/auth/supabase-jwt.service.js");
const {
  AcademyLeadsService,
} = require("../../apps/api/dist/academy/academy-leads.service.js");
const {
  resolveClientIp,
} = require("../../apps/api/dist/academy/academy-leads.controller.js");

const KHLIM_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const FOREIGN_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000093";
const USER_ID = "93939393-9393-4393-8393-939393939393";
const COACH_USER_ID = "94949494-9494-4494-8494-949494949494";
const SUBJECT = "phase-2-admin-leads-subject";
const COACH_SUBJECT = "phase-2-coach-leads-subject";

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Phase 2 Admin leads tests");
  }
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("Phase 2 Admin leads tests require a test database");
  }
  return true;
}

function installJwtDouble(jwt) {
  const identities = new Map([
    [
      "academy-aal2",
      {
        subject: SUBJECT,
        email: "phase2.academy-leads@example.test",
        payload: {
          sub: SUBJECT,
          email: "phase2.academy-leads@example.test",
          aal: "aal2",
          aud: "authenticated",
        },
      },
    ],
    [
      "academy-aal1",
      {
        subject: SUBJECT,
        email: "phase2.academy-leads@example.test",
        payload: {
          sub: SUBJECT,
          email: "phase2.academy-leads@example.test",
          aal: "aal1",
          aud: "authenticated",
        },
      },
    ],
    [
      "coach-aal2",
      {
        subject: COACH_SUBJECT,
        email: "phase2.coach@example.test",
        payload: {
          sub: COACH_SUBJECT,
          email: "phase2.coach@example.test",
          aal: "aal2",
          aud: "authenticated",
        },
      },
    ],
  ]);

  jwt.verify = async (token) => {
    const identity = identities.get(token);
    if (!identity) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    return identity;
  };
}

async function jsonRequest(baseUrl, path, options = {}) {
  const headers = new Headers();
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.clientIp) {
    headers.set("x-forwarded-for", options.clientIp);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : null,
  };
}

async function cleanup(client) {
  await client.academyLead.deleteMany({
    where: {
      OR: [
        { guardianName: { startsWith: "Test Lead" } },
        { organizationId: FOREIGN_ORGANIZATION_ID },
      ],
    },
  });
  await client.submissionRateLimit.deleteMany({
    where: {
      OR: [{ key: { startsWith: "test-" } }, { key: { startsWith: "lead:" } }],
    },
  });
  await client.auditLog.deleteMany({
    where: { entityType: "ACADEMY_LEAD" },
  });
  await client.organizationMembership.deleteMany({
    where: { userId: { in: [USER_ID, COACH_USER_ID] } },
  });
  await client.userRoleAssignment.deleteMany({
    where: { userId: { in: [USER_ID, COACH_USER_ID] } },
  });
  await client.user.deleteMany({
    where: { id: { in: [USER_ID, COACH_USER_ID] } },
  });
  await client.$executeRaw`
    DELETE FROM organizations WHERE id = ${FOREIGN_ORGANIZATION_ID}::uuid
  `;
}

const enabled = databaseTestsEnabled();

test(
  "Phase 2 Admin Leads HTTP integration: public create, idempotency, rate limiting, MFA role gating, detail and updates",
  { skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests" },
  async () => {
    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("v1");

    const prisma = app.get(PrismaService);
    const client = prisma.client;
    installJwtDouble(app.get(SupabaseJwtService));

    await cleanup(client);

    // Setup Admin User with ACADEMY_ADMIN
    const adminUser = await client.user.create({
      data: {
        id: USER_ID,
        authProviderSubject: SUBJECT,
        email: "phase2.academy-leads@example.test",
        roleAssignments: { create: [{ role: "ACADEMY_ADMIN" }] },
      },
    });
    await client.organizationMembership.create({
      data: {
        organizationId: KHLIM_ORGANIZATION_ID,
        userId: adminUser.id,
        status: "ACTIVE",
        roleAssignments: { create: [{ role: "ACADEMY_ADMIN" }] },
      },
    });

    // Setup Coach User with COACH only
    const coachUser = await client.user.create({
      data: {
        id: COACH_USER_ID,
        authProviderSubject: COACH_SUBJECT,
        email: "phase2.coach@example.test",
        roleAssignments: { create: [{ role: "COACH" }] },
      },
    });
    await client.organizationMembership.create({
      data: {
        organizationId: KHLIM_ORGANIZATION_ID,
        userId: coachUser.id,
        status: "ACTIVE",
        roleAssignments: { create: [{ role: "COACH" }] },
      },
    });

    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.equal(typeof address, "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      // 1. Public lead submission
      const leadPayload = {
        guardianName: "Test Lead Guardian One",
        phone: "0123456789",
        email: "test.lead.1@example.test",
        childAge: 10,
        source: "soft-launch-oct26",
        consent: true,
        idempotencyKey: "test-token-uuid-1",
      };

      const createRes = await jsonRequest(baseUrl, "/v1/academy/leads", {
        method: "POST",
        body: leadPayload,
        clientIp: "10.0.0.1",
      });

      assert.equal(createRes.response.status, 201);
      assert.equal(createRes.body.status, "RECEIVED");
      assert.ok(createRes.body.id);
      const leadId = createRes.body.id;

      // 2. Idempotency: exact replay returns 201 with identical receipt
      const replayRes = await jsonRequest(baseUrl, "/v1/academy/leads", {
        method: "POST",
        body: leadPayload,
        clientIp: "10.0.0.1",
      });
      assert.equal(replayRes.response.status, 201);
      assert.equal(replayRes.body.id, leadId);

      // 3. Idempotency conflict: same token, different payload returns 409
      const conflictRes = await jsonRequest(baseUrl, "/v1/academy/leads", {
        method: "POST",
        body: { ...leadPayload, guardianName: "Test Lead Altered" },
        clientIp: "10.0.0.1",
      });
      assert.equal(conflictRes.response.status, 409);

      // 3b. Rate limiting: 3 per hour per phone
      const ratePhone = "0198881111";
      for (let i = 1; i <= 3; i++) {
        const res = await jsonRequest(baseUrl, "/v1/academy/leads", {
          method: "POST",
          body: {
            guardianName: `Test Lead Rate ${i}`,
            phone: ratePhone,
            childAge: 10,
            consent: true,
            idempotencyKey: `test-rate-token-${i}`,
          },
          clientIp: "10.0.0.2",
        });
        assert.equal(res.response.status, 201);
      }

      // 4th submission with same phone exhausts rate limit -> 429
      const rateLimitExceededRes = await jsonRequest(
        baseUrl,
        "/v1/academy/leads",
        {
          method: "POST",
          body: {
            guardianName: "Test Lead Rate 4",
            phone: ratePhone,
            childAge: 10,
            consent: true,
            idempotencyKey: "test-rate-token-4",
          },
          clientIp: "10.0.0.2",
        },
      );
      assert.equal(rateLimitExceededRes.response.status, 429);
      assert.ok(rateLimitExceededRes.response.headers.get("retry-after"));
      assert.match(
        String(rateLimitExceededRes.body?.message),
        /Too many registration submissions/,
      );

      // Replay of previous submission (test-rate-token-1) returns 201 receipt even when rate limits are exhausted
      const rateReplayRes = await jsonRequest(baseUrl, "/v1/academy/leads", {
        method: "POST",
        body: {
          guardianName: "Test Lead Rate 1",
          phone: ratePhone,
          childAge: 10,
          consent: true,
          idempotencyKey: "test-rate-token-1",
        },
        clientIp: "10.0.0.2",
      });
      assert.equal(rateReplayRes.response.status, 201);
      assert.equal(rateReplayRes.body.status, "RECEIVED");

      // 3c. Cleanup of expired rate limits
      await client.submissionRateLimit.create({
        data: {
          key: "lead:expired:test-row",
          attempts: 5,
          expiresAt: new Date(Date.now() - 60000),
        },
      });
      const leadsService = app.get(AcademyLeadsService);
      const cleanedRows = await leadsService.cleanupExpiredRateLimits();
      assert.ok(cleanedRows >= 1);
      const expiredCheck = await client.submissionRateLimit.findUnique({
        where: { key: "lead:expired:test-row" },
      });
      assert.equal(expiredCheck, null);

      // 3d. Direct caller IP spoofing protection
      const directIp = resolveClientIp(
        { headers: { "x-forwarded-for": "203.0.113.195" }, ip: "127.0.0.1" },
        false,
      );
      assert.equal(directIp, "127.0.0.1");

      const proxyIp = resolveClientIp(
        { headers: { "x-forwarded-for": "203.0.113.195, 10.0.0.1" } },
        true,
      );
      assert.equal(proxyIp, "203.0.113.195");

      // 4. Role and MFA gating on Admin endpoints
      // 4a. Unauthenticated -> 401
      const unauthRes = await jsonRequest(baseUrl, "/v1/admin/academy/leads");
      assert.equal(unauthRes.response.status, 401);

      // 4b. Low MFA (aal1) -> 403
      const aal1Res = await jsonRequest(baseUrl, "/v1/admin/academy/leads", {
        token: "academy-aal1",
      });
      assert.equal(aal1Res.response.status, 403);
      assert.match(String(aal1Res.body?.message), /MFA assurance level 2/);

      // 4c. Coach role (disallowed) -> 403
      const coachRes = await jsonRequest(baseUrl, "/v1/admin/academy/leads", {
        token: "coach-aal2",
      });
      assert.equal(coachRes.response.status, 403);

      // 4d. Authorized Academy Admin (aal2) -> 200
      const adminListRes = await jsonRequest(
        baseUrl,
        "/v1/admin/academy/leads?status=NEW",
        { token: "academy-aal2" },
      );
      assert.equal(adminListRes.response.status, 200);
      assert.ok(Array.isArray(adminListRes.body.items));
      const found = adminListRes.body.items.find((i) => i.id === leadId);
      assert.ok(found);
      assert.equal(found.guardianName, "Test Lead Guardian One");
      assert.equal(found.phone, "+60123456789");

      // 4e. Foreign tenant isolation
      await client.$executeRaw`
        INSERT INTO organizations (id, slug, name, default_locale, time_zone, created_at, updated_at)
        VALUES (${FOREIGN_ORGANIZATION_ID}::uuid, 'foreign-org', 'Foreign Org', 'en-MY', 'Asia/Kuala_Lumpur', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      const foreignLead = await client.academyLead.create({
        data: {
          organizationId: FOREIGN_ORGANIZATION_ID,
          guardianName: "Test Lead Foreign Tenant",
          phone: "+60181112233",
          childAge: 11,
          status: "NEW",
          consentVersion: "2026-10-v1",
          consentAt: new Date(),
        },
      });

      // KHLIM admin list should NOT include foreign lead
      const khlimListRes = await jsonRequest(
        baseUrl,
        "/v1/admin/academy/leads",
        { token: "academy-aal2" },
      );
      assert.equal(khlimListRes.response.status, 200);
      const foundForeign = khlimListRes.body.items.find(
        (i) => i.id === foreignLead.id,
      );
      assert.equal(foundForeign, undefined);

      // KHLIM admin detail on foreign lead should return 404
      const foreignDetailRes = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/leads/${foreignLead.id}`,
        { token: "academy-aal2" },
      );
      assert.equal(foreignDetailRes.response.status, 404);

      // KHLIM admin update on foreign lead should return 404
      const foreignUpdateRes = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/leads/${foreignLead.id}`,
        {
          method: "PATCH",
          token: "academy-aal2",
          body: {
            status: "CONTACTED",
            expectedUpdatedAt: foreignLead.updatedAt.toISOString(),
          },
        },
      );
      assert.equal(foreignUpdateRes.response.status, 404);

      // 5. Admin Detail endpoint
      const detailRes = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/leads/${leadId}`,
        { token: "academy-aal2" },
      );
      assert.equal(detailRes.response.status, 200);
      assert.equal(detailRes.body.id, leadId);
      const originalUpdatedAt = detailRes.body.updatedAt;

      // 6. Admin Update endpoint: status and notes
      const updateRes = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/leads/${leadId}`,
        {
          method: "PATCH",
          token: "academy-aal2",
          body: {
            status: "CONTACTED",
            notes: "Contacted on WhatsApp; scheduled trial for next Saturday.",
            expectedUpdatedAt: originalUpdatedAt,
          },
        },
      );
      assert.equal(updateRes.response.status, 200);
      assert.equal(updateRes.body.status, "CONTACTED");
      assert.equal(
        updateRes.body.notes,
        "Contacted on WhatsApp; scheduled trial for next Saturday.",
      );

      // 7. Update concurrency conflict detection (409)
      const staleUpdateRes = await jsonRequest(
        baseUrl,
        `/v1/admin/academy/leads/${leadId}`,
        {
          method: "PATCH",
          token: "academy-aal2",
          body: {
            status: "QUALIFIED",
            expectedUpdatedAt: originalUpdatedAt, // stale timestamp
          },
        },
      );
      assert.equal(staleUpdateRes.response.status, 409);

      // 7b. Concurrent staff writes: exactly one 200, one 409, and only one audit log
      const concurrentLead = await client.academyLead.create({
        data: {
          organizationId: KHLIM_ORGANIZATION_ID,
          guardianName: "Test Lead Concurrent Race",
          phone: "+60172223344",
          childAge: 12,
          status: "NEW",
          consentVersion: "2026-10-v1",
          consentAt: new Date(),
        },
      });
      const initialUpdatedAtIso = concurrentLead.updatedAt.toISOString();

      const [concurrentResA, concurrentResB] = await Promise.all([
        jsonRequest(baseUrl, `/v1/admin/academy/leads/${concurrentLead.id}`, {
          method: "PATCH",
          token: "academy-aal2",
          body: {
            status: "QUALIFIED",
            notes: "Update attempt A",
            expectedUpdatedAt: initialUpdatedAtIso,
          },
        }),
        jsonRequest(baseUrl, `/v1/admin/academy/leads/${concurrentLead.id}`, {
          method: "PATCH",
          token: "academy-aal2",
          body: {
            status: "ENROLLED",
            notes: "Update attempt B",
            expectedUpdatedAt: initialUpdatedAtIso,
          },
        }),
      ]);

      const concurrentStatuses = [
        concurrentResA.response.status,
        concurrentResB.response.status,
      ].sort();
      assert.deepEqual(concurrentStatuses, [200, 409]);

      // Check audit logs: only 1 audit log created for this lead
      const leadAuditLogs = await client.auditLog.findMany({
        where: {
          entityType: "ACADEMY_LEAD",
          entityId: concurrentLead.id,
        },
      });
      assert.equal(leadAuditLogs.length, 1);
      assert.equal(leadAuditLogs[0].action, "ACADEMY_LEAD_UPDATED");

      // 8. Lead Summary endpoint
      const summaryRes = await jsonRequest(
        baseUrl,
        "/v1/admin/academy/leads/summary",
        { token: "academy-aal2" },
      );
      assert.equal(summaryRes.response.status, 200);
      assert.ok(typeof summaryRes.body.newLeads === "number");
      assert.ok(typeof summaryRes.body.needsFollowUp === "number");
      assert.ok(summaryRes.body.byStatus);
      assert.ok(typeof summaryRes.body.byStatus.CONTACTED === "number");
    } finally {
      await app.close();
      await cleanup(client);
    }
  },
);
