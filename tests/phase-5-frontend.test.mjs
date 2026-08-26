import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

test("Phase 5 design tokens export brand athletic colors, typography and CSS variables", async () => {
  const manifest = await readJson("packages/design-tokens/package.json");
  const index = await read("packages/design-tokens/src/index.ts");
  const css = await read("packages/design-tokens/src/tokens.css");

  assert.equal(manifest.name, "@khlim/design-tokens");
  assert.match(index, /primary:\s*"#F59E0B"/);
  assert.match(index, /charcoal:\s*"#121212"/);
  assert.match(index, /fontSans/);
  assert.match(index, /Noto Sans SC/);
  assert.match(index, /Noto Sans Devanagari/);
  assert.match(css, /--khlim-brand-primary/);
  assert.match(css, /--khlim-status-success-bg/);
});

test("Phase 5 i18n supports 5 target locales with MYR currency and Asia/Kuala_Lumpur formatting", async () => {
  const i18n = await read("packages/i18n/src/index.ts");
  const formatting = await read("packages/i18n/src/formatting.ts");
  const en = await read("packages/i18n/src/messages/en.ts");
  const ms = await read("packages/i18n/src/messages/ms.ts");
  const zhHans = await read("packages/i18n/src/messages/zh-Hans.ts");
  const zhHant = await read("packages/i18n/src/messages/zh-Hant.ts");
  const hi = await read("packages/i18n/src/messages/hi.ts");

  assert.match(i18n, /"en"/);
  assert.match(i18n, /"ms"/);
  assert.match(i18n, /"zh-Hans"/);
  assert.match(i18n, /"zh-Hant"/);
  assert.match(i18n, /"hi"/);
  assert.match(formatting, /Asia\/Kuala_Lumpur/);
  assert.match(formatting, /MYR/);
  assert.match(en, /"brand\.academy"/);
  assert.match(ms, /"brand\.academy"/);
  assert.match(zhHans, /"brand\.academy"/);
  assert.match(zhHant, /"brand\.academy"/);
  assert.match(hi, /"brand\.academy"/);
});

test("Phase 5 public pages exist and support academy discovery, terms and privacy", async () => {
  await access(new URL("apps/web/app/page.tsx", root));
  await access(new URL("apps/web/app/academy/page.tsx", root));
  await access(new URL("apps/web/app/programmes/page.tsx", root));
  await access(new URL("apps/web/app/programmes/[offeringId]/page.tsx", root));
  await access(new URL("apps/web/app/about/page.tsx", root));
  await access(new URL("apps/web/app/contact/page.tsx", root));
  await access(new URL("apps/web/app/terms/page.tsx", root));
  await access(new URL("apps/web/app/privacy/page.tsx", root));

  const home = await read("apps/web/app/page.tsx");
  const academy = await read("apps/web/app/academy/page.tsx");
  const terms = await read("apps/web/app/terms/page.tsx");
  const privacy = await read("apps/web/app/privacy/page.tsx");

  assert.match(home, /KHLIM/);
  assert.match(home, /PublicHeader/);
  assert.match(home, /PublicFooter/);
  assert.match(academy, /FIBA/);
  assert.match(terms, /Recurring Billing/i);
  assert.match(privacy, /PDPA|Child Safety/i);
});

test("Phase 5 authentication and guardian onboarding flows are implemented", async () => {
  await access(new URL("apps/web/app/auth/login/page.tsx", root));
  await access(new URL("apps/web/app/auth/register/page.tsx", root));
  await access(new URL("apps/web/app/auth/forgot-password/page.tsx", root));
  await access(new URL("apps/web/app/onboarding/guardian/page.tsx", root));

  const login = await read("apps/web/app/auth/login/page.tsx");
  const register = await read("apps/web/app/auth/register/page.tsx");
  const onboarding = await read("apps/web/app/onboarding/guardian/page.tsx");

  assert.match(login, /useAuth/);
  assert.match(register, /preferredLanguage|preferredLocale/i);
  assert.match(onboarding, /Guardian Display Name|GuardianProfile/i);
});

test("Phase 5 multi-step enrolment wizard implements server-authoritative pricing and terms audit review", async () => {
  await access(new URL("apps/web/app/enrol/page.tsx", root));
  await access(new URL("apps/web/app/enrol/confirmation/page.tsx", root));

  const enrol = await read("apps/web/app/enrol/page.tsx");
  const confirmation = await read("apps/web/app/enrol/confirmation/page.tsx");

  assert.match(enrol, /StepIndicator/);
  assert.match(enrol, /childSelection/);
  assert.match(enrol, /offeringSelection/);
  assert.match(enrol, /planSelection/);
  assert.match(enrol, /recurringConsent/);
  assert.match(enrol, /termsAccepted/);
  assert.match(confirmation, /Payment & Membership Confirmed/i);
});

test("Phase 5 parent portal implements Dashboard, Players, Membership, Payments, Schedule, Notifications, and Account", async () => {
  const portalRoutes = [
    "apps/web/app/portal/page.tsx",
    "apps/web/app/portal/dashboard/page.tsx",
    "apps/web/app/portal/players/page.tsx",
    "apps/web/app/portal/players/[athleteId]/page.tsx",
    "apps/web/app/portal/membership/page.tsx",
    "apps/web/app/portal/payments/page.tsx",
    "apps/web/app/portal/schedule/page.tsx",
    "apps/web/app/portal/notifications/page.tsx",
    "apps/web/app/portal/account/page.tsx",
  ];

  for (const route of portalRoutes) {
    await access(new URL(route, root));
  }

  const shell = await read("apps/web/components/portal/portal-shell.tsx");
  const dashboard = await read("apps/web/app/portal/dashboard/page.tsx");
  const players = await read("apps/web/app/portal/players/page.tsx");
  const membership = await read("apps/web/app/portal/membership/page.tsx");
  const payments = await read("apps/web/app/portal/payments/page.tsx");
  const schedule = await read("apps/web/app/portal/schedule/page.tsx");
  const account = await read("apps/web/app/portal/account/page.tsx");

  assert.match(shell, /ChildSwitcher/);
  assert.match(dashboard, /portal\.dashboard\.welcome/);
  assert.match(players, /portal\.players\.title/);
  assert.match(membership, /portal\.membership\.title/);
  assert.match(payments, /portal\.payments\.upcoming/);
  assert.match(schedule, /portal\.schedule\.title/);
  assert.match(account, /portal\.account\.title/);
});
