import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

test("Admin API client exports getAdminCampaignAnalytics with demo fallback and live request", () => {
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
});

test("Admin Campaign Analytics page implements RBAC, MFA gate, date presets, and authoritative funnel", () => {
  const pagePath = path.join(
    root,
    "apps/admin/app/insights/campaigns/page.tsx",
  );
  const content = fs.readFileSync(pagePath, "utf-8");

  // Auth & RBAC
  assert.ok(
    content.includes('hasRole(["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"])'),
    "Page should enforce SUPER_ADMIN, MANAGEMENT, ACADEMY_ADMIN roles",
  );
  assert.ok(
    content.includes("mfaSatisfied"),
    "Page should check mfaSatisfied for non-demo sessions",
  );
  assert.ok(
    content.includes("Restricted Access"),
    "Page should show restricted access warning when not eligible",
  );

  // Date Filtering
  assert.ok(
    content.includes("24 Oct 2026 (Event Day)"),
    "Page should offer 24 Oct 2026 event day preset",
  );
  assert.ok(
    content.includes("October 2026"),
    "Page should offer October 2026 preset",
  );
  assert.ok(content.includes("All Time"), "Page should offer All Time preset");

  // Deep linking to Leads Inbox
  assert.ok(
    content.includes("/leads?source=3x3-oct24"),
    "Page should link to /leads?source=3x3-oct24",
  );

  // Funnel & Methodology
  assert.ok(
    content.includes("Campaign Conversion Funnel"),
    "Page should include Campaign Conversion Funnel visualization",
  );
  assert.ok(
    content.includes("Authoritative Database Pipeline"),
    "Page should include Authoritative Database Pipeline breakdown",
  );
  assert.ok(
    content.includes("methodologyNote"),
    "Page should render methodology note on data boundaries",
  );
});
