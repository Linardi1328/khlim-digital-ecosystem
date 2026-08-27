import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Admin app reuses workspace aliases without redundant lockfile declarations", async () => {
  const manifest = JSON.parse(await read("apps/admin/package.json"));
  const tsconfig = await read("apps/admin/tsconfig.json");

  assert.equal(manifest.name, "@khlim/admin");
  assert.equal(manifest.dependencies["@khlim/api-client"], undefined);
  assert.equal(manifest.dependencies["@khlim/design-tokens"], undefined);
  assert.equal(manifest.dependencies["@khlim/i18n"], undefined);
  assert.match(tsconfig, /@khlim\/api-client/);
  assert.match(tsconfig, /@khlim\/i18n/);
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

  assert.match(
    programmes,
    /Programme\s+and\s+Programme\s+Offering\s+are\s+separate\s+entities/,
  );
  assert.match(
    memberships,
    /Membership\s+state\s+and\s+payment\s+state\s+are\s+separate/,
  );
  assert.match(
    athletes,
    /Athletes\s+are\s+managed\s+profiles\s+linked\s+to\s+adult\s+guardians/,
  );
  assert.match(
    guardians,
    /Guardian\s+role\s+alone\s+does\s+not\s+grant\s+access\s+to\s+unrelated\s+athletes/,
  );
  assert.match(
    payments,
    /Raw\s+credit\s+card\s+numbers\s+and\s+CVVs\s+are\s+strictly\s+forbidden/,
  );
});

test("Admin finance visibility gates payment fetching and rendering", async () => {
  const authContext = await read("apps/admin/lib/auth-context.tsx");
  const payments = await read("apps/admin/app/payments/page.tsx");
  const dashboard = await read("apps/admin/app/page.tsx");

  assert.match(authContext, /canAccessFinance/);
  assert.match(payments, /Restricted Financial Ledger/);
  assert.match(payments, /const canViewFinance = canAccessFinance\(\)/);
  assert.match(payments, /\[canViewFinance\]/);

  const paymentGuardIndex = payments.indexOf("if (!canViewFinance)");
  const paymentFetchIndex = payments.indexOf("adminApi.listPayments()");
  assert.ok(paymentGuardIndex >= 0);
  assert.ok(paymentFetchIndex > paymentGuardIndex);

  assert.match(dashboard, /const canViewFinance = canAccessFinance\(\)/);
  assert.match(dashboard, /canViewFinance\s*\?\s*adminApi\.listPayments\(\)/);
  assert.match(
    dashboard,
    /Payment operations are hidden for the current staff role/,
  );
  assert.match(dashboard, /Finance roles only/);
});

test("Admin shared data interactions remain keyboard and pagination safe", async () => {
  const dataTable = await read("apps/admin/components/ui/DataTable.tsx");
  const pagination = await read("apps/admin/components/ui/Pagination.tsx");

  assert.match(dataTable, /tabIndex=\{onRowClick \? 0 : undefined\}/);
  assert.match(dataTable, /e\.key === "Enter" \|\| e\.key === " "/);
  assert.match(dataTable, /e\.target !== e\.currentTarget/);

  assert.match(pagination, /const safeTotalPages = Math\.max\(1, totalPages\)/);
  assert.match(pagination, /const displayPage = Math\.min/);
  assert.match(pagination, /onPageChange\(displayPage\)/);
});

test("Admin privileged access is denied unless explicit demo mode is enabled", async () => {
  const demoMode = await read("apps/admin/lib/demo-mode.ts");
  const authContext = await read("apps/admin/lib/auth-context.tsx");
  const shell = await read("apps/admin/components/layout/AdminShell.tsx");
  const header = await read("apps/admin/components/layout/AdminHeader.tsx");
  const api = await read("apps/admin/lib/admin-api.ts");

  assert.match(demoMode, /NEXT_PUBLIC_ADMIN_DEMO_MODE/);
  assert.match(demoMode, /Changes are not persisted/);
  assert.match(authContext, /ADMIN_DEMO_MODE \? DEMO_ADMIN_USER : null/);
  assert.match(authContext, /if \(!ADMIN_DEMO_MODE \|\| !user\) return/);
  assert.match(shell, /Staff authentication is not configured/);
  assert.match(shell, /DEMO MODE/);
  assert.match(header, /isDemoMode && role/);
  assert.doesNotMatch(api, /mock-admin-token/);
  assert.match(api, /Promise\.reject\(integrationPending\(method\)\)/);
});

test("Web and admin Vercel builds disable standalone output only on Vercel", async () => {
  const adminConfig = await read("apps/admin/next.config.ts");
  const webConfig = await read("apps/web/next.config.ts");

  for (const config of [adminConfig, webConfig]) {
    assert.match(config, /process\.env\.VERCEL \? undefined : "standalone"/);
  }
});
