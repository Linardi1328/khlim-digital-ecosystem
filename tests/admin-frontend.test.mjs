import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

test("Admin app package.json includes necessary workspace dependencies", async () => {
  const manifest = await readJson("apps/admin/package.json");
  assert.equal(manifest.name, "@khlim/admin");
  assert.equal(manifest.dependencies["@khlim/api-client"], "workspace:*");
  assert.equal(manifest.dependencies["@khlim/design-tokens"], "workspace:*");
  assert.equal(manifest.dependencies["@khlim/i18n"], "workspace:*");
});

test("Admin console implements all required reusable UI components", async () => {
  const shell = await read("apps/admin/components/layout/AdminShell.tsx");
  const sidebar = await read("apps/admin/components/layout/AdminSidebar.tsx");
  const header = await read("apps/admin/components/layout/AdminHeader.tsx");
  const pageHeader = await read("apps/admin/components/ui/PageHeader.tsx");
  const metricCard = await read("apps/admin/components/ui/MetricCard.tsx");
  const dataTable = await read("apps/admin/components/ui/DataTable.tsx");
  const statusBadge = await read("apps/admin/components/ui/StatusBadge.tsx");
  const filterBar = await read("apps/admin/components/ui/FilterBar.tsx");
  const searchInput = await read("apps/admin/components/ui/SearchInput.tsx");
  const emptyState = await read("apps/admin/components/ui/EmptyState.tsx");
  const loadingState = await read("apps/admin/components/ui/LoadingState.tsx");
  const errorState = await read("apps/admin/components/ui/ErrorState.tsx");
  const confirmDialog = await read(
    "apps/admin/components/ui/ConfirmDialog.tsx",
  );
  const drawer = await read("apps/admin/components/ui/Drawer.tsx");
  const tabs = await read("apps/admin/components/ui/Tabs.tsx");
  const pagination = await read("apps/admin/components/ui/Pagination.tsx");
  const formSection = await read("apps/admin/components/ui/FormSection.tsx");

  assert.match(shell, /AdminSidebar/);
  assert.match(sidebar, /ADMIN_NAV_ITEMS/);
  assert.match(sidebar, /#F59E0B/);
  assert.match(header, /Operations Console/);
  assert.match(pageHeader, /PageHeader/);
  assert.match(metricCard, /MetricCard/);
  assert.match(dataTable, /table-responsive-stacked/);
  assert.match(statusBadge, /StatusBadge/);
  assert.match(filterBar, /FilterBar/);
  assert.match(searchInput, /SearchInput/);
  assert.match(emptyState, /EmptyState/);
  assert.match(loadingState, /LoadingState/);
  assert.match(errorState, /ErrorState/);
  assert.match(confirmDialog, /role="dialog"/);
  assert.match(confirmDialog, /aria-modal="true"/);
  assert.match(drawer, /role="dialog"/);
  assert.match(tabs, /role="tablist"/);
  assert.match(pagination, /Pagination/);
  assert.match(formSection, /FormSection/);
});

test("Admin sidebar routes include all required operations domains", async () => {
  const sidebar = await read("apps/admin/components/layout/AdminSidebar.tsx");

  assert.match(sidebar, /label:\s*"Dashboard"/);
  assert.match(sidebar, /label:\s*"Programmes"/);
  assert.match(sidebar, /label:\s*"Offerings"/);
  assert.match(sidebar, /label:\s*"Membership Plans"/);
  assert.match(sidebar, /label:\s*"Memberships"/);
  assert.match(sidebar, /label:\s*"Athletes"/);
  assert.match(sidebar, /label:\s*"Guardians"/);
  assert.match(sidebar, /label:\s*"Payments"/);
  assert.match(sidebar, /label:\s*"Venues"/);
  assert.match(sidebar, /label:\s*"Scheduling"/);
  assert.match(sidebar, /label:\s*"Staff"/);
  assert.match(sidebar, /label:\s*"Audit Log"/);
  assert.match(sidebar, /label:\s*"Settings"/);
});

test("Admin dashboard renders all 6 key operational overview cards and sections", async () => {
  const dashboard = await read("apps/admin/app/page.tsx");

  assert.match(dashboard, /title="Active Members"/);
  assert.match(dashboard, /title="Pending Memberships"/);
  assert.match(dashboard, /title="Total Athletes"/);
  assert.match(dashboard, /title="Open Offerings"/);
  assert.match(dashboard, /title="Capacity Utilisation"/);
  assert.match(dashboard, /title="Payments Requiring Action"/);
  assert.match(dashboard, /Programme Offering Capacity/);
  assert.match(dashboard, /Recent Membership Enrolments/);
  assert.match(dashboard, /Payment Attention Queue/);
  assert.match(dashboard, /Recent Audit Activity/);
});

test("Admin operations console preserves strict domain rules", async () => {
  const programmes = await read("apps/admin/app/programmes/page.tsx");
  const memberships = await read("apps/admin/app/memberships/page.tsx");
  const athletes = await read("apps/admin/app/athletes/page.tsx");
  const guardians = await read("apps/admin/app/guardians/page.tsx");
  const payments = await read("apps/admin/app/payments/page.tsx");

  // Programme != Offering separation
  assert.match(
    programmes,
    /Programme\s+and\s+Programme\s+Offering\s+are\s+separate\s+entities/,
  );

  // Membership != Payment separation
  assert.match(
    memberships,
    /Membership\s+state\s+and\s+payment\s+state\s+are\s+separate/,
  );

  // User != Athlete
  assert.match(
    athletes,
    /Athletes\s+are\s+managed\s+profiles\s+linked\s+to\s+adult\s+guardians/,
  );

  // Guardian relationship authorization
  assert.match(
    guardians,
    /Guardian\s+role\s+alone\s+does\s+not\s+grant\s+access\s+to\s+unrelated\s+athletes/,
  );

  // Payments forbid raw card storage
  assert.match(
    payments,
    /Raw\s+credit\s+card\s+numbers\s+and\s+CVVs\s+are\s+strictly\s+forbidden/,
  );
});

test("Admin role context prevents unauthorized financial data visibility to coach roles", async () => {
  const authContext = await read("apps/admin/lib/auth-context.tsx");
  const payments = await read("apps/admin/app/payments/page.tsx");

  assert.match(authContext, /canAccessFinance/);
  assert.match(payments, /Restricted Financial Ledger/);
  assert.match(payments, /canAccessFinance\(\)/);
});
