import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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

test("Admin surfaces use the official KHLIM Sports Academy logo", async () => {
  const shell = await read("apps/admin/components/layout/AdminShell.tsx");
  const sidebar = await read("apps/admin/components/layout/AdminSidebar.tsx");
  const layout = await read("apps/admin/app/layout.tsx");

  await access(new URL("apps/admin/public/khs-academy-logo.webp", root));
  assert.match(shell, /\/khs-academy-logo\.webp/);
  assert.match(sidebar, /\/khs-academy-logo\.webp/);
  assert.match(layout, /\/khs-academy-logo\.webp/);
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

test("Admin sidebar routes include the operations and access-control domains", async () => {
  const sidebar = await read("apps/admin/components/layout/AdminSidebar.tsx");

  for (const label of [
    "Dashboard",
    "Programmes",
    "Offerings",
    "Membership Plans",
    "Memberships",
    "Athletes",
    "Guardians",
    "Payments",
    "Venues",
    "Scheduling",
    "Editorial Studio",
    "Notifications",
    "Accounts & Access",
    "Staff",
    "Audit Log",
    "Settings",
  ]) {
    assert.match(sidebar, new RegExp(`label:\\s*"${label}"`));
  }

  assert.match(sidebar, /roles:\s*MANAGEMENT/);
  assert.match(sidebar, /roles:\s*FINANCE/);
  assert.match(sidebar, /roles:\s*SESSION_OPERATIONS/);
  assert.match(sidebar, /minHeight:\s*44/);
});

test("Admin dashboard renders persisted snapshot metrics without fake trends", async () => {
  const dashboard = await read("apps/admin/app/page.tsx");

  assert.match(dashboard, /getAdminOverview/);
  assert.match(dashboard, /title="Active Members"/);
  assert.match(dashboard, /title="Pending Memberships"/);
  assert.match(dashboard, /title="Total Athletes"/);
  assert.match(dashboard, /title="Open Offerings"/);
  assert.match(dashboard, /title="Capacity Utilisation"/);
  assert.match(dashboard, /title="Payments Requiring Action"/);
  assert.match(dashboard, /LIVE API SNAPSHOT/);
  assert.match(dashboard, /Quick operations/);
  assert.match(dashboard, /Session security/);
  assert.doesNotMatch(dashboard, /\+8\.4%|\+3\.2%/);
});

test("Admin dashboard waits for authenticated AAL2 before loading privileged overview data", async () => {
  const dashboard = await read("apps/admin/app/page.tsx");

  assert.match(dashboard, /isAuthenticated/);
  assert.match(dashboard, /mfaSatisfied/);
  assert.match(
    dashboard,
    /if \(!isDemoMode && \(!isAuthenticated \|\| !mfaSatisfied\)\)/,
  );
  assert.match(dashboard, /\[isDemoMode, isAuthenticated, mfaSatisfied\]/);

  const authGuardIndex = dashboard.indexOf(
    "if (!isDemoMode && (!isAuthenticated || !mfaSatisfied))",
  );
  const overviewFetchIndex = dashboard.indexOf("getAdminOverview()");

  assert.ok(authGuardIndex >= 0);
  assert.ok(overviewFetchIndex > authGuardIndex);
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

test("Admin finance visibility remains role gated", async () => {
  const authContext = await read("apps/admin/lib/auth-context.tsx");
  const payments = await read("apps/admin/app/payments/page.tsx");
  const dashboard = await read("apps/admin/app/page.tsx");

  assert.match(authContext, /canAccessFinance/);
  assert.match(authContext, /FINANCE_ADMIN/);
  assert.match(payments, /Restricted Financial Ledger/);
  assert.match(payments, /const canViewFinance = canAccessFinance\(\)/);
  assert.match(payments, /\[canViewFinance\]/);

  const paymentGuardIndex = payments.indexOf("if (!canViewFinance)");
  const paymentFetchIndex = payments.indexOf("adminApi.listPayments()");
  assert.ok(paymentGuardIndex >= 0);
  assert.ok(paymentFetchIndex > paymentGuardIndex);

  assert.match(dashboard, /const canViewFinance = canAccessFinance\(\)/);
  assert.match(dashboard, /paymentsAttentionCount/);
  assert.match(dashboard, /Finance roles only/);
});

test("Finance staff can deliberately recover stale checkout holds", async () => {
  const payments = await read("apps/admin/app/payments/page.tsx");
  const api = await read("apps/admin/lib/admin-api.ts");

  assert.match(api, /\/admin\/billing\/reconcile-stale-checkouts/);
  assert.match(
    api,
    /Checkout reconciliation is unavailable in Admin demo mode/,
  );
  assert.match(payments, /Recover stale checkouts/);
  assert.match(payments, /window\.confirm/);
  assert.match(payments, /reconcileStaleCheckouts/);
  assert.match(payments, /const canViewFinance = canAccessFinance\(\)/);
  assert.match(payments, /result\.expired/);
  assert.match(payments, /result\.actionRequired/);
  assert.match(
    payments,
    /Provider-created checkouts remain untouched for review/,
  );
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

test("Real staff authentication restores a distinct Supabase session and remains MFA gated", async () => {
  const demoMode = await read("apps/admin/lib/demo-mode.ts");
  const supabaseAuth = await read("apps/admin/lib/supabase-auth.ts");
  const authContext = await read("apps/admin/lib/auth-context.tsx");
  const shell = await read("apps/admin/components/layout/AdminShell.tsx");
  const header = await read("apps/admin/components/layout/AdminHeader.tsx");
  const api = await read("apps/admin/lib/admin-api.ts");

  assert.match(demoMode, /NEXT_PUBLIC_ADMIN_DEMO_MODE/);
  assert.match(demoMode, /Changes are not persisted/);
  assert.match(supabaseAuth, /khlim_admin_supabase_session/);
  assert.match(supabaseAuth, /grant_type=password/);
  assert.match(supabaseAuth, /grant_type=refresh_token/);
  assert.match(supabaseAuth, /\/factors/);
  assert.match(supabaseAuth, /factor_type: "totp"/);
  assert.match(supabaseAuth, /\/challenge/);
  assert.match(supabaseAuth, /\/verify/);
  assert.match(supabaseAuth, /status !== "verified"/);
  assert.match(supabaseAuth, /storeSession\(verified\)/);
  assert.match(authContext, /restoreAdminSupabaseSession/);
  assert.match(authContext, /getAdminSession/);
  assert.match(authContext, /mfaSatisfied/);
  assert.match(shell, /Sign in to Admin Console/);
  assert.match(shell, /MFA verification required/);
  assert.match(shell, /Set up authenticator/);
  assert.match(shell, /Authenticator code/);
  assert.match(shell, /Verify MFA/);
  assert.match(shell, /listAdminTotpFactors/);
  assert.match(shell, /enrollAdminTotpFactor/);
  assert.match(shell, /challengeAdminTotpFactor/);
  assert.match(shell, /verifyAdminTotpFactor/);
  assert.match(shell, /pattern="\[0-9\]\{6\}"/);
  assert.match(
    shell,
    /No privileged admin data is shown before MFA\s+succeeds/,
  );
  assert.match(shell, /minHeight:\s*46/);
  assert.match(header, /MFA VERIFIED/);
  assert.match(header, /Sign out/);
  assert.match(header, /availableWorkViews = isDemoMode/);
  assert.match(header, /user\?\.roles/);
  assert.match(header, /Changes navigation only/);
  assert.match(
    authContext,
    /!ADMIN_DEMO_MODE && !user\.roles\.includes\(newRole\)/,
  );
  assert.doesNotMatch(api, /mock-admin-token|khlim_admin_access_token/);
  assert.match(api, /getValidAdminAccessToken/);
});

test("Accounts and Access UI manages organization authority without mutating global identity", async () => {
  const accounts = await read("apps/admin/app/users/page.tsx");
  const api = await read("apps/admin/lib/admin-api.ts");

  assert.match(accounts, /Accounts & Access/);
  assert.match(accounts, /SUPER_ADMIN/);
  assert.match(accounts, /FINANCE_ADMIN/);
  assert.match(
    accounts,
    /Global identity and family relationships were not changed/,
  );
  assert.match(
    accounts,
    /Your own organization roles and membership status cannot\s+be changed/,
  );
  assert.match(accounts, /does not suspend the global user account/);
  assert.match(accounts, /window\.confirm/);
  assert.match(accounts, /min-height:\s*44px/);
  assert.match(api, /\/admin\/users/);
  assert.match(api, /staff-roles/);
  assert.match(api, /updateAdminAccountStatus/);
});

test("Admin API exposes staff session, MFA-protected overview, and management account search", async () => {
  const accessController = await read(
    "apps/api/src/admin/admin-access.controller.ts",
  );
  const identityController = await read(
    "apps/api/src/admin/admin.controller.ts",
  );
  const service = await read("apps/api/src/admin/admin.service.ts");

  assert.match(accessController, /@Get\("session"\)/);
  assert.match(accessController, /@Get\("overview"\)/);
  assert.match(accessController, /@RequireAnyRole\(\.\.\.STAFF_ROLES\)/);
  assert.match(accessController, /@RequireMfa\(\)/);
  assert.match(identityController, /@Get\(\)/);
  assert.match(identityController, /@Query\("q"\)/);
  assert.match(service, /getSession\(/);
  assert.match(service, /getOverview\(/);
  assert.match(service, /listUsers\(/);
  assert.match(service, /paymentsAttentionCount/);
  assert.match(service, /Math\.min\(requestedTake, 50\)/);
});

test("managed hosts disable standalone output without changing Admin deployment semantics", async () => {
  const adminConfig = await read("apps/admin/next.config.ts");
  const webConfig = await read("apps/web/next.config.ts");

  assert.match(adminConfig, /process\.env\.VERCEL \? undefined : "standalone"/);
  assert.match(webConfig, /const isVercel = Boolean\(process\.env\.VERCEL\)/);
  assert.match(webConfig, /output: isVercel \? undefined : "standalone"/);
  assert.doesNotMatch(webConfig, /process\.env\.NETLIFY/);
});
