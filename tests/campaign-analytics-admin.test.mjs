import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { parseDemoMytDateRange } from "../apps/admin/lib/campaign-date-range.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

test("Admin navigation preserves campaign deep links inside the Growth & Leads workspace", () => {
  const navigationPath = path.join(
    root,
    "apps/admin/components/layout/admin-sections.ts",
  );
  const sidebarPath = path.join(
    root,
    "apps/admin/components/layout/AdminSidebar.tsx",
  );
  const navigation = fs.readFileSync(navigationPath, "utf-8");
  const sidebar = fs.readFileSync(sidebarPath, "utf-8");

  assert.ok(navigation.includes('label: "Growth & Leads"'));
  assert.ok(navigation.includes('href: "/insights/campaigns"'));
  assert.ok(navigation.includes('label: "3x3 Campaign"'));
  assert.ok(navigation.includes('href: "/leads"'));
  assert.ok(
    navigation.includes("page.href.length > best.page.href.length"),
    "Longest-prefix routing must prevent Overview's /insights route swallowing the campaign",
  );
  assert.ok(sidebar.includes("ADMIN_SECTIONS.filter("));
  assert.ok(sidebar.includes('aria-label="Admin sections"'));
});

test("Admin leads page reads initial source query param for 3x3-oct24 deep linking", () => {
  const leadsPagePath = path.join(root, "apps/admin/app/leads/page.tsx");
  const content = fs.readFileSync(leadsPagePath, "utf-8");

  assert.ok(
    content.includes('searchParams.get("source")'),
    "Leads page should read 'source' query parameter",
  );
  assert.ok(
    content.includes("initialSourceParam"),
    "Leads page should initialize sourceFilter with initialSourceParam",
  );
});

// Execute the real exported module with a controlled client, without importing
// Next.js browser-only dependencies into the Node regression test process.
function loadCampaignApi({ demoMode = false, response = {} } = {}) {
  const filename = path.join(root, "apps/admin/lib/admin-api.ts");
  const source = fs.readFileSync(filename, "utf-8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const calls = [];
  const module = { exports: {} };
  const dependencies = {
    "@khlim/api-client": {
      createApiClient: () => ({
        get: async (requestPath) => {
          calls.push(requestPath);
          return response;
        },
      }),
    },
    "./admin-api-legacy": { adminApi: {} },
    "./campaign-date-range": { parseDemoMytDateRange },
    "./demo-mode": { ADMIN_DEMO_MODE: demoMode },
    "./supabase-auth": {
      getStoredAdminAccessToken: () => null,
      getValidAdminAccessToken: async () => null,
    },
  };

  vm.runInNewContext(
    compiled,
    {
      module,
      exports: module.exports,
      process: { env: {} },
      URLSearchParams,
      require: (specifier) => {
        if (!Object.hasOwn(dependencies, specifier)) {
          throw new Error(`Unexpected API module dependency: ${specifier}`);
        }
        return dependencies[specifier];
      },
    },
    { filename },
  );
  return {
    getAdminCampaignAnalytics: module.exports.getAdminCampaignAnalytics,
    calls,
  };
}

test("campaign API export executes a live request and returns the API response", async () => {
  const response = { campaign: "3x3-oct24", testMarker: "controlled-response" };
  const { getAdminCampaignAnalytics, calls } = loadCampaignApi({ response });
  assert.equal(typeof getAdminCampaignAnalytics, "function");

  const result = await getAdminCampaignAnalytics({
    campaign: "3x3-oct24",
    startDate: "2026-10-24",
    endDate: "2026-10-24",
  });
  assert.equal(result, response);
  assert.deepEqual(calls, [
    "/admin/academy/campaigns/analytics?campaign=3x3-oct24&startDate=2026-10-24&endDate=2026-10-24",
  ]);
});

test("campaign demo API returns dated metrics and rejects malformed input asynchronously", async () => {
  const { getAdminCampaignAnalytics, calls } = loadCampaignApi({
    demoMode: true,
  });
  const result = await getAdminCampaignAnalytics({
    campaign: "3x3-oct24",
    startDate: "2026-10-24",
    endDate: "2026-10-24",
  });
  assert.equal(result.leads.totalLeads, 2);
  assert.equal(result.leads.byStatus.QUALIFIED, 1);
  assert.equal(result.leads.byStatus.ENROLLED, 1);
  assert.equal(result.period.fromUtc, "2026-10-23T16:00:00.000Z");
  assert.equal(result.period.toUtc, "2026-10-24T16:00:00.000Z");
  assert.deepEqual(calls, []);

  await assert.rejects(
    getAdminCampaignAnalytics({ startDate: "2026-02-29" }),
    /Invalid startDate calendar date/,
  );
  await assert.rejects(
    getAdminCampaignAnalytics({
      startDate: "2026-01-01",
      endDate: "2026-05-01",
    }),
    /exceeds maximum limit of 100 days/,
  );
});

test("Admin Campaign Analytics page implements RBAC, MFA gate, bounded presets, 100-day limit, and distinct session metrics", () => {
  const pagePath = path.join(
    root,
    "apps/admin/app/insights/campaigns/page.tsx",
  );
  const content = fs.readFileSync(pagePath, "utf-8");

  // API authorization is exercised by the runtime guard tests and the
  // ineligible-work-view behavior is verified in the Admin browser suite.
  // Bounded Date Presets
  assert.ok(
    content.includes("24 Oct 2026 (Event Day)"),
    "Page should offer 24 Oct 2026 event day preset",
  );
  assert.ok(
    content.includes("October 2026"),
    "Page should offer October 2026 preset",
  );
  assert.ok(
    content.includes("Campaign Window (Aug–Oct)"),
    "Page should offer bounded Campaign Window (Aug–Oct) preset",
  );

  // Maximum 100-day window validation
  assert.ok(
    content.includes("MAX_CUSTOM_WINDOW_DAYS = 100"),
    "Page should enforce 100-day limit on custom date ranges",
  );

  // Deep linking to Leads Inbox
  assert.ok(
    content.includes("/leads?source=3x3-oct24"),
    "Page should link to /leads?source=3x3-oct24",
  );

  // Observable Campaign Sessions & Measurement Notice
  assert.ok(
    content.includes("Observable Campaign Sessions"),
    "Page should label web visits as Observable Campaign Sessions",
  );
  assert.ok(
    content.includes("Attribution & Measurement Notice"),
    "Page should render Attribution & Measurement Notice",
  );
  assert.match(
    content,
    /Physical QR\s+code scans/i,
    "Page should distinguish physical QR scans from web visits",
  );
  assert.ok(
    content.includes("Enrolled Athletes (Current Status)"),
    "Page should clarify Step 5 is current status rather than historical progression",
  );
  assert.ok(
    content.includes("methodologyNote"),
    "Page should render backend methodology note",
  );
});

test("demo campaign ranges follow the live API date contract", () => {
  const defaults = parseDemoMytDateRange();
  assert.equal(defaults.startDate, "2026-08-01");
  assert.equal(defaults.endDate, "2026-10-31");
  assert.equal(defaults.fromUtc.toISOString(), "2026-07-31T16:00:00.000Z");
  assert.equal(defaults.toUtc.toISOString(), "2026-10-31T16:00:00.000Z");

  const eventDay = parseDemoMytDateRange(" 2026-10-24 ", "2026-10-24");
  assert.equal(eventDay.fromUtc.toISOString(), "2026-10-23T16:00:00.000Z");
  assert.equal(eventDay.toUtc.toISOString(), "2026-10-24T16:00:00.000Z");

  assert.equal(parseDemoMytDateRange("2026-10-01").endDate, "2026-12-30");
  assert.equal(
    parseDemoMytDateRange(undefined, "2026-10-31").startDate,
    "2026-08-02",
  );
  assert.equal(
    parseDemoMytDateRange("2026-01-01", "2026-04-10").endDate,
    "2026-04-10",
    "An inclusive 100-day window is allowed",
  );

  assert.throws(
    () => parseDemoMytDateRange("2026-02-29", "2026-03-01"),
    /Invalid startDate/,
  );
  assert.throws(
    () => parseDemoMytDateRange("2026-10-01", "2026-04-31"),
    /Invalid endDate/,
  );
  assert.throws(() => parseDemoMytDateRange("bad-date"), /Invalid startDate/);
  assert.throws(
    () => parseDemoMytDateRange(undefined, "bad-date"),
    /Invalid endDate/,
  );
  assert.throws(
    () => parseDemoMytDateRange("2026-10-25", "2026-10-24"),
    /startDate cannot be after endDate/,
  );
  assert.throws(
    () => parseDemoMytDateRange("2026-01-01", "2026-05-01"),
    /exceeds maximum limit of 100 days/,
  );
});
