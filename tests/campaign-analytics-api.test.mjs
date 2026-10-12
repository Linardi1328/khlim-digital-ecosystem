import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseMytDateRange,
  isValidCalendarDate,
  MAX_REPORTING_WINDOW_DAYS,
} from "../apps/api/dist/academy/academy-campaigns.validation.js";
import {
  AcademyCampaignsService,
  POSTHOG_DEFAULT_QUERY_HOST,
} from "../apps/api/dist/academy/academy-campaigns.service.js";
import { AcademyCampaignsAdminController } from "../apps/api/dist/academy/academy-campaigns-admin.controller.js";
import { AuthorizationGuard } from "../apps/api/dist/auth/authorization.guard.js";
import {
  REQUIRED_ROLES_KEY,
  MFA_REQUIRED_KEY,
} from "../apps/api/dist/auth/auth.constants.js";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";
const FOREIGN_ORG_ID = "00000000-0000-4000-8000-000000000002";

test("isValidCalendarDate validates real calendar days, leap years, and month lengths", () => {
  // Valid calendar dates
  assert.equal(isValidCalendarDate("2026-10-24"), true);
  assert.equal(isValidCalendarDate("2026-08-01"), true);
  assert.equal(isValidCalendarDate("2026-10-31"), true);
  assert.equal(isValidCalendarDate("2024-02-29"), true, "2024 is a leap year");
  assert.equal(
    isValidCalendarDate("2000-02-29"),
    true,
    "2000 is a leap century",
  );

  // Invalid calendar dates
  assert.equal(
    isValidCalendarDate("2026-02-29"),
    false,
    "2026 is not a leap year",
  );
  assert.equal(
    isValidCalendarDate("2026-04-31"),
    false,
    "April has only 30 days",
  );
  assert.equal(
    isValidCalendarDate("2026-06-31"),
    false,
    "June has only 30 days",
  );
  assert.equal(
    isValidCalendarDate("2026-09-31"),
    false,
    "September has only 30 days",
  );
  assert.equal(
    isValidCalendarDate("2026-11-31"),
    false,
    "November has only 30 days",
  );
  assert.equal(
    isValidCalendarDate("2026-13-01"),
    false,
    "Month 13 does not exist",
  );
  assert.equal(
    isValidCalendarDate("2026-00-15"),
    false,
    "Month 0 does not exist",
  );
  assert.equal(
    isValidCalendarDate("2026-10-32"),
    false,
    "Day 32 does not exist",
  );
  assert.equal(isValidCalendarDate("not-a-date"), false);
  assert.equal(isValidCalendarDate(""), false);
});

test("parseMytDateRange handles start-inclusive, end-exclusive UTC boundaries and 100-day window", () => {
  // Exact 24 October 2026 event day in MYT (UTC+8)
  const eventDay = parseMytDateRange("2026-10-24", "2026-10-24");
  assert.equal(eventDay.startDate, "2026-10-24");
  assert.equal(eventDay.endDate, "2026-10-24");
  assert.equal(eventDay.fromUtc.toISOString(), "2026-10-23T16:00:00.000Z");
  assert.equal(eventDay.toUtc.toISOString(), "2026-10-24T16:00:00.000Z");
  assert.equal(eventDay.toUtc.getTime() - eventDay.fromUtc.getTime(), 86400000);

  // Default bounded campaign window (August 1 to October 31, 2026)
  const defaultRange = parseMytDateRange(undefined, undefined);
  assert.equal(defaultRange.startDate, "2026-08-01");
  assert.equal(defaultRange.endDate, "2026-10-31");
  assert.equal(defaultRange.fromUtc.toISOString(), "2026-07-31T16:00:00.000Z");
  assert.equal(defaultRange.toUtc.toISOString(), "2026-10-31T16:00:00.000Z");
  const defaultDays =
    (defaultRange.toUtc.getTime() - defaultRange.fromUtc.getTime()) / 86400000;
  assert.equal(defaultDays, 92);
  assert.ok(defaultDays <= MAX_REPORTING_WINDOW_DAYS);

  // One-sided MYT date arithmetic must preserve calendar days.
  assert.equal(parseMytDateRange("2026-10-01").endDate, "2026-12-30");
  assert.equal(
    parseMytDateRange(undefined, "2026-10-31").startDate,
    "2026-08-02",
  );

  // Rejection of invalid calendar dates
  assert.throws(() => parseMytDateRange("2026-02-29", "2026-03-01"), {
    name: "BadRequestException",
  });
  assert.throws(() => parseMytDateRange("2026-04-31", "2026-05-01"), {
    name: "BadRequestException",
  });
  assert.throws(() => parseMytDateRange("invalid", "2026-10-24"), {
    name: "BadRequestException",
  });

  // Rejection when start date is after end date
  assert.throws(() => parseMytDateRange("2026-10-25", "2026-10-24"), {
    name: "BadRequestException",
  });

  // Rejection when window exceeds MAX_REPORTING_WINDOW_DAYS (100 days)
  assert.throws(() => parseMytDateRange("2026-01-01", "2026-05-01"), {
    name: "BadRequestException",
    message: /exceeds maximum limit of 100 days/,
  });
});

test("AcademyCampaignsService computes authoritative lead status distributions and current-status rates", async () => {
  const mockPrisma = {
    client: {
      academyLead: {
        groupBy: async ({ where, by, _count }) => {
          assert.deepEqual(by, ["status"]);
          assert.deepEqual(_count, { _all: true });
          assert.equal(where.source, "3x3-oct24");
          assert.equal(where.organizationId, DEFAULT_ORG_ID);
          assert.ok(where.createdAt.gte instanceof Date);
          assert.ok(where.createdAt.lt instanceof Date);
          return [
            { status: "NEW", _count: { _all: 1 } },
            { status: "CONTACTED", _count: { _all: 1 } },
            { status: "QUALIFIED", _count: { _all: 1 } },
            { status: "ENROLLED", _count: { _all: 2 } },
            { status: "CLOSED", _count: { _all: 1 } },
          ];
        },
      },
    },
  };

  const service = new AcademyCampaignsService(mockPrisma);
  const result = await service.getCampaignAnalytics(DEFAULT_ORG_ID, {
    campaign: "3x3-oct24",
    startDate: "2026-10-24",
    endDate: "2026-10-24",
  });

  assert.equal(result.leads.totalLeads, 6);
  assert.equal(result.leads.byStatus.NEW, 1);
  assert.equal(result.leads.byStatus.CONTACTED, 1);
  assert.equal(result.leads.byStatus.QUALIFIED, 1);
  assert.equal(result.leads.byStatus.ENROLLED, 2);
  assert.equal(result.leads.byStatus.CLOSED, 1);
  assert.equal(result.leads.enrolledCount, 2);
  // 2 / 6 * 100 = 33.33%
  assert.equal(result.leads.enrolledRate, 33.33);

  // Methodology note explicitly mentions database authority and current status distribution
  assert.match(result.methodologyNote, /Database records are authoritative/);
  assert.match(result.methodologyNote, /current status distribution/);
});

test("AcademyCampaignsService enforces strict tenant isolation: foreign organization with matching leads cannot query shared campaign traffic", async () => {
  // Even if foreign organization has 1 or more matching leads in the database,
  // it must NEVER be granted access to KHLIM's private PostHog aggregates.
  const mockForeignRecords = [
    { status: "NEW", _count: { _all: 1 } },
    { status: "ENROLLED", _count: { _all: 1 } },
  ];

  let fetchAttempted = false;
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchAttempted = true;
    return { ok: true, status: 200, json: async () => ({ results: [] }) };
  };

  try {
    const mockPrisma = {
      client: {
        academyLead: {
          groupBy: async ({ where }) => {
            assert.equal(where.organizationId, FOREIGN_ORG_ID);
            return mockForeignRecords;
          },
        },
      },
    };

    const service = new AcademyCampaignsService(mockPrisma);
    const result = await service.getCampaignAnalytics(FOREIGN_ORG_ID, {
      campaign: "3x3-oct24",
    });

    // Foreign org sees its own database leads
    assert.equal(result.leads.totalLeads, 2);
    assert.equal(result.leads.enrolledCount, 1);

    // But private traffic is strictly blocked under tenant isolation
    assert.equal(result.traffic.status, "CONFIG_REQUIRED");
    assert.equal(result.traffic.observableLandingSessions, null);
    assert.equal(result.traffic.interestFormEngagement, null);
    assert.equal(result.traffic.clientSubmitSuccesses, null);
    assert.match(
      result.traffic.reason,
      /not associated with the active organization/,
    );
    assert.equal(
      fetchAttempted,
      false,
      "PostHog fetch must not be attempted for foreign tenant",
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("AcademyCampaignsService handles PostHog query credentials, separate query host, and resilient errors", async () => {
  const envNames = [
    "POSTHOG_API_KEY",
    "POSTHOG_PERSONAL_API_KEY",
    "POSTHOG_PROJECT_API_KEY",
    "POSTHOG_QUERY_HOST",
    "POSTHOG_HOST",
  ];
  const previousEnv = Object.fromEntries(
    envNames.map((name) => [name, process.env[name]]),
  );
  const origFetch = globalThis.fetch;

  try {
    delete process.env.POSTHOG_API_KEY;
    delete process.env.POSTHOG_PERSONAL_API_KEY;
    delete process.env.POSTHOG_PROJECT_API_KEY;
    delete process.env.POSTHOG_QUERY_HOST;
    process.env.POSTHOG_HOST = "https://us.i.posthog.com";

    const mockPrisma = {
      client: {
        academyLead: {
          groupBy: async () => [],
        },
      },
    };

    const service = new AcademyCampaignsService(mockPrisma);

    // 1. Missing credentials returns CONFIG_REQUIRED
    const noCredsResult = await service.getCampaignAnalytics(DEFAULT_ORG_ID, {
      campaign: "3x3-oct24",
    });
    assert.equal(noCredsResult.traffic.status, "CONFIG_REQUIRED");
    assert.match(noCredsResult.traffic.reason, /credentials not configured/);

    // 2. Query host separation and valid response parsing
    process.env.POSTHOG_API_KEY = "test-query-key";
    let requestedUrl = "";
    let requestedHeaders = {};
    let requestedBody = null;

    globalThis.fetch = async (url, options) => {
      requestedUrl = String(url);
      requestedHeaders = options.headers;
      requestedBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            ["campaign_landing", 75],
            ["interest_form_view", 30],
            ["interest_submit_success_client", 8],
          ],
        }),
      };
    };

    const validResult = await service.getCampaignAnalytics(DEFAULT_ORG_ID, {
      campaign: "3x3-oct24",
      startDate: "2026-10-24",
      endDate: "2026-10-24",
    });

    // Query must hit us.posthog.com (query host), NOT us.i.posthog.com (ingestion host)
    assert.equal(
      requestedUrl,
      `${POSTHOG_DEFAULT_QUERY_HOST}/api/projects/652783/query/`,
    );
    assert.equal(requestedHeaders.Authorization, "Bearer test-query-key");
    assert.match(
      requestedBody.query.query,
      /count\(DISTINCT coalesce\(properties\.\$session_id, distinct_id\)\)/,
    );
    assert.match(
      requestedBody.query.query,
      /properties\.campaign = '3x3-oct24'/,
    );
    assert.match(
      requestedBody.query.query,
      /timestamp >= '2026-10-23T16:00:00.000Z'/,
    );
    assert.match(
      requestedBody.query.query,
      /timestamp < '2026-10-24T16:00:00.000Z'/,
    );

    assert.equal(validResult.traffic.status, "AVAILABLE");
    assert.equal(validResult.traffic.observableLandingSessions, 75);
    assert.equal(validResult.traffic.interestFormEngagement, 30);
    assert.equal(validResult.traffic.clientSubmitSuccesses, 8);

    // 3. HTTP failure returns status: "ERROR" (never AVAILABLE with 0)
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ detail: "Invalid personal API key" }),
    });

    const errorResult = await service.getCampaignAnalytics(DEFAULT_ORG_ID, {
      campaign: "3x3-oct24",
    });
    assert.equal(errorResult.traffic.status, "ERROR");
    assert.equal(errorResult.traffic.observableLandingSessions, null);
    assert.match(
      errorResult.traffic.reason,
      /temporarily unavailable/,
    );

    // 4. Malformed response (missing results array) returns status: "ERROR"
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ error: "Query syntax failure", results: null }),
    });

    const malformedResult = await service.getCampaignAnalytics(DEFAULT_ORG_ID, {
      campaign: "3x3-oct24",
    });
    assert.equal(malformedResult.traffic.status, "ERROR");
    assert.equal(malformedResult.traffic.observableLandingSessions, null);
    assert.match(malformedResult.traffic.reason, /temporarily unavailable/);
  } finally {
    for (const name of envNames) {
      const value = previousEnv[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    globalThis.fetch = origFetch;
  }
});

test("AcademyCampaignsAdminController authorization guard enforces roles and MFA", async () => {
  assert.equal(
    Reflect.getMetadata("path", AcademyCampaignsAdminController),
    "admin/academy/campaigns",
  );
  assert.deepEqual(
    Reflect.getMetadata(REQUIRED_ROLES_KEY, AcademyCampaignsAdminController),
    ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  );
  assert.equal(
    Reflect.getMetadata(MFA_REQUIRED_KEY, AcademyCampaignsAdminController),
    true,
  );

  // Run actual authorization policy against the decorated controller.
  const reflector = {
    getAllAndOverride(key, targets) {
      for (const target of targets) {
        const value = Reflect.getMetadata(key, target);
        if (value !== undefined) return value;
      }
      return undefined;
    },
  };
  const guard = new AuthorizationGuard(reflector, {
    canAccessAthlete: async () => false,
  });
  const contextFor = (roles, authenticatorAssuranceLevel) => ({
    getHandler: () =>
      AcademyCampaignsAdminController.prototype.getCampaignAnalytics,
    getClass: () => AcademyCampaignsAdminController,
    switchToHttp: () => ({
      getRequest: () => ({
        authenticatedUser: { roles, authenticatorAssuranceLevel },
      }),
    }),
  });

  await assert.rejects(
    () => guard.canActivate(contextFor(["ACADEMY_ADMIN"], "aal1")),
    { name: "ForbiddenException", message: /MFA/ },
  );
  await assert.rejects(
    () => guard.canActivate(contextFor(["EVENT_STAFF"], "aal2")),
    { name: "ForbiddenException", message: /permissions/ },
  );
  assert.equal(
    await guard.canActivate(contextFor(["ACADEMY_ADMIN"], "aal2")),
    true,
  );
});
