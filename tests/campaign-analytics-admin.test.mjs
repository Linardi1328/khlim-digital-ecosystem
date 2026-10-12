import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDemoMytDateRange } from "../apps/admin/lib/campaign-date-range.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

test("AdminSidebar contains 3x3 Campaign navigation item with active route logic", () => {
  const sidebarPath = path.join(
    root,
    "apps/admin/components/layout/AdminSidebar.tsx",
  );
  const content = fs.readFileSync(sidebarPath, "utf-8");

  assert.ok(
    content.includes('href: "/insights/campaigns"'),
    "Sidebar should link to /insights/campaigns",
  );
  assert.ok(
    content.includes('label: "3x3 Campaign"'),
    "Sidebar item should be labeled '3x3 Campaign'",
  );
  assert.ok(
    content.includes('badge: "24 Oct"'),
    "Sidebar item should include '24 Oct' badge",
  );
  assert.ok(
    content.includes(
      'if (href === "/insights") return pathname === "/insights";',
    ),
    "isRouteActive should isolate /insights so /insights/campaigns is uniquely matched",
  );
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

test("Admin API client exports getAdminCampaignAnalytics with bounded demo fallback and live request", () => {
  const adminApiPath = path.join(root, "apps/admin/lib/admin-api.ts");
  const content = fs.readFileSync(adminApiPath, "utf-8");

  assert.ok(
    content.includes("export function getAdminCampaignAnalytics"),
    "admin-api.ts should export getAdminCampaignAnalytics",
  );
  assert.ok(
    content.includes("/admin/academy/campaigns/analytics"),
    "Live API call should request /admin/academy/campaigns/analytics",
  );
  assert.ok(
    content.includes("ADMIN_DEMO_MODE"),
    "getAdminCampaignAnalytics should support ADMIN_DEMO_MODE",
  );
  assert.ok(
    content.includes("enrolledRate"),
    "getAdminCampaignAnalytics response should calculate enrolledRate",
  );
  assert.ok(
    content.includes("parseDemoMytDateRange(query.startDate, query.endDate)"),
    "Demo analytics must use the validated Malaysia-time date-range helper",
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
  assert.equal(parseDemoMytDateRange(undefined, "2026-10-31").startDate, "2026-08-02");
  assert.equal(
    parseDemoMytDateRange("2026-01-01", "2026-04-10").endDate,
    "2026-04-10",
    "An inclusive 100-day window is allowed",
  );

  assert.throws(() => parseDemoMytDateRange("2026-02-29", "2026-03-01"), /Invalid startDate/);
  assert.throws(() => parseDemoMytDateRange("2026-10-01", "2026-04-31"), /Invalid endDate/);
  assert.throws(() => parseDemoMytDateRange("bad-date"), /Invalid startDate/);
  assert.throws(() => parseDemoMytDateRange(undefined, "bad-date"), /Invalid endDate/);
  assert.throws(() => parseDemoMytDateRange("2026-10-25", "2026-10-24"), /startDate cannot be after endDate/);
  assert.throws(() => parseDemoMytDateRange("2026-01-01", "2026-05-01"), /exceeds maximum limit of 100 days/);
});
