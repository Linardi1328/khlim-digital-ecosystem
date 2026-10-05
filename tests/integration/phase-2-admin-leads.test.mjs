import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
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

const KHLIM_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const FOREIGN_ORGANIZATION_ID = randomUUID();
const USER_ID = randomUUID();
const COACH_USER_ID = randomUUID();
const SUBJECT = `phase-2-admin-leads-${USER_ID}`;
const COACH_SUBJECT = `phase-2-coach-leads-${COACH_USER_ID}`;

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

const ownedRatePrefixes = [
  ...["127.0.0.1", "::ffff:127.0.0.1"].map(
    (value) =>
      `lead:ip:${createHash("sha256").update(value).digest("hex").slice(0, 32)}:`,
  ),
  ...["+60123456789", "+60198881111"].map(
    (value) =>
      `lead:phone:${createHash("sha256").update(value).digest("hex").slice(0, 32)}:`,
  ),
];

async function cleanup(client) {
  await client.auditEvent.deleteMany({
    where: { actorUserId: { in: [USER_ID, COACH_USER_ID] } },
  });
  await client.academyLead.deleteMany({
    where: {
      OR: [
        { guardianName: { startsWith: `Test Lead ${USER_ID}` } },
        { organizationId: FOREIGN_ORGANIZATION_ID },
      ],
    },
  });
  await client.submissionRateLimit.deleteMany({
    where: {
      OR: [
        ...ownedRatePrefixes.map((prefix) => ({ key: { startsWith: prefix } })),
        { key: "lead:expired:test-row" },
      ],
    },
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
  await client.organization.deleteMany({
    where: { id: FOREIGN_ORGANIZATION_ID },
  });
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
        guardianName: `Test Lead ${USER_ID} Guardian One`,
        phone: "0123456789",
        email: "test.lead.1@example.test",
        childAge: 10,
        source: "3x3-oct24",
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
      const persisted = await client.academyLead.findUnique({
        where: { id: leadId },
      });
      assert.equal(persisted.organizationId, KHLIM_ORGANIZATION_ID);
      assert.equal(persisted.source, "3x3-oct24");
      assert.equal(persisted.phone, "+60123456789");
      assert.deepEqual(Object.keys(createRes.body).sort(), [
        "createdAt",
        "id",
        "message",
        "status",
      ]);

      // Simultaneous identical submissions persist exactly one record.
      const concurrentPayload = {
        ...leadPayload,
        idempotencyKey: `concurrent-${USER_ID}`,
      };
      const receipts = await Promise.all(
        [1, 2].map(() =>
          jsonRequest(baseUrl, "/v1/academy/leads", {
            method: "POST",
            body: concurrentPayload,
          }),
        ),
      );
      assert.deepEqual(
        receipts.map((item) => item.response.status),
        [201, 201],
      );
      assert.equal(receipts[0].body.id, receipts[1].body.id);
      assert.equal(
        await client.academyLead.count({
          where: {
            organizationId: KHLIM_ORGANIZATION_ID,
            idempotencyKey: concurrentPayload.idempotencyKey,
          },
        }),
        1,
      );

      const countersBeforeInvalidOffering =
        await client.submissionRateLimit.findMany({ orderBy: { key: "asc" } });
      const unavailable = await jsonRequest(baseUrl, "/v1/academy/leads", {
        method: "POST",
        body: {
          ...leadPayload,
          idempotencyKey: `unavailable-${USER_ID}`,
          programmeOfferingId: randomUUID(),
        },
      });
      assert.equal(unavailable.response.status, 400);
      assert.equal(unavailable.body.code, "LEAD_OFFERING_UNAVAILABLE");
      assert.deepEqual(
        await client.submissionRateLimit.findMany({ orderBy: { key: "asc" } }),
        countersBeforeInvalidOffering,
      );

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
        body: { ...leadPayload, guardianName: `Test Lead ${USER_ID} Altered` },
        clientIp: "10.0.0.1",
      });
      assert.equal(conflictRes.response.status, 409);
      assert.equal(conflictRes.body.code, "LEAD_IDEMPOTENCY_CONFLICT");

      // 3b. Rate limiting: 5 per hour per phone
      const ratePhone = "0198881111";
      for (let i = 1; i <= 5; i++) {
        const res = await jsonRequest(baseUrl, "/v1/academy/leads", {
          method: "POST",
          body: {
            guardianName: `Test Lead ${USER_ID} Rate ${i}`,
            phone: ratePhone,
            childAge: 10,
            consent: true,
            idempotencyKey: `test-rate-token-${i}`,
          },
          clientIp: `10.0.1.${i}`,
        });
        assert.equal(res.response.status, 201);
      }

      // 6th submission with same phone exhausts rate limit -> 429
      const rateLimitExceededRes = await jsonRequest(
        baseUrl,
        "/v1/academy/leads",
        {
          method: "POST",
          body: {
            guardianName: `Test Lead ${USER_ID} Rate 6`,
            phone: ratePhone,
            childAge: 10,
            consent: true,
            idempotencyKey: "test-rate-token-6",
          },
          clientIp: "10.0.1.6",
        },
      );
      assert.equal(rateLimitExceededRes.response.status, 429);
      assert.equal(
        rateLimitExceededRes.response.headers.get("retry-after"),
        "3600",
      );
      assert.match(
        String(rateLimitExceededRes.body?.message),
        /Too many registrations for this contact number/,
      );

      // Replay of previous submission (test-rate-token-1) returns 201 receipt even when rate limits are exhausted
      const rateReplayRes = await jsonRequest(baseUrl, "/v1/academy/leads", {
        method: "POST",
        body: {
          guardianName: `Test Lead ${USER_ID} Rate 1`,
          phone: ratePhone,
          childAge: 10,
          consent: true,
          idempotencyKey: "test-rate-token-1",
        },
        clientIp: "10.0.1.1",
      });
      assert.equal(rateReplayRes.response.status, 201);
      assert.equal(rateReplayRes.body.status, "RECEIVED");

      // 3c. Cleanup of expired rate limits
      await client.submissionRateLimit.create({
        data: {
          key: "lead:expired:test-row",
          count: 5,
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
      assert.equal(found.guardianName, `Test Lead ${USER_ID} Guardian One`);
      assert.equal(found.phone, "+60123456789");

      // 4e. Foreign tenant isolation
      await client.organization.upsert({
        where: { id: FOREIGN_ORGANIZATION_ID },
        update: { status: "ACTIVE" },
        create: {
          id: FOREIGN_ORGANIZATION_ID,
          slug: `foreign-org-${FOREIGN_ORGANIZATION_ID}`,
          name: "Foreign Org",
          status: "ACTIVE",
        },
      });
      const foreignLead = await client.academyLead.create({
        data: {
          organizationId: FOREIGN_ORGANIZATION_ID,
          guardianName: `Test Lead ${USER_ID} Foreign Tenant`,
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
          guardianName: `Test Lead ${USER_ID} Concurrent Race`,
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
      const leadAuditLogs = await client.auditEvent.findMany({
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
      try {
        await cleanup(client);
      } finally {
        await app.close();
      }
    }
  },
);
