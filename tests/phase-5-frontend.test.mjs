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

test("Phase 5 web application uses @khlim/api-client transport and real backend OpenAPI routes", async () => {
  const manifest = await readJson("apps/web/package.json");
  const apiService = await read("apps/web/lib/api-service.ts");

  assert.equal(manifest.dependencies["@khlim/api-client"], "workspace:*");
  assert.equal(manifest.dependencies["@khlim/design-tokens"], "workspace:*");
  assert.equal(manifest.dependencies["@khlim/i18n"], "workspace:*");

  // OpenAPI path contract calls
  assert.match(apiService, /\/v1\/academy\/offerings/);
  assert.match(apiService, /\/v1\/me/);
  assert.match(apiService, /\/v1\/me\/guardian-profile/);
  assert.match(apiService, /\/v1\/me\/preferences/);
  assert.match(apiService, /\/v1\/me\/athletes/);
  assert.match(apiService, /\/v1\/athletes\/\$\{athleteId\}\/memberships/);
  assert.match(
    apiService,
    /\/v1\/athletes\/\$\{athleteId\}\/memberships\/\$\{membershipId\}\/billing/,
  );
  assert.match(
    apiService,
    /\/v1\/athletes\/\$\{athleteId\}\/memberships\/\$\{membershipId\}\/checkout/,
  );
});

test("Phase 5 prohibits hardcoded runtime mock business data and client-side authoritative pricing", async () => {
  const apiService = await read("apps/web/lib/api-service.ts");
  const types = await read("apps/web/lib/types.ts");
  const enrol = await read("apps/web/app/enrol/page.tsx");

  // Verify mock business arrays are completely absent from api-service
  assert.doesNotMatch(apiService, /INITIAL_PROGRAMMES/);
  assert.doesNotMatch(apiService, /INITIAL_OFFERINGS/);
  assert.doesNotMatch(apiService, /INITIAL_MEMBERSHIP_PLANS/);

  // Verify enrolment wizard loads live backend offerings
  assert.match(enrol, /apiService\.getPublicOfferings\(\)/);
  assert.match(enrol, /planEligibilities/);
  assert.match(enrol, /recurringAmountMinor/);
});

test("Phase 5 checkout forbids raw Card Number, Expiry, and CVV fields owned by KHLIM", async () => {
  const enrol = await read("apps/web/app/enrol/page.tsx");

  // Verify no raw credit card input fields are rendered by KHLIM
  assert.doesNotMatch(enrol, /label="Card Number"/i);
  assert.doesNotMatch(enrol, /label="CVV"/i);
  assert.doesNotMatch(enrol, /placeholder="•••"/i);
  assert.doesNotMatch(enrol, /placeholder="4242/i);

  // Verify handoff calls backend prepareCheckout
  assert.match(enrol, /apiService\.prepareCheckout/);
  assert.match(enrol, /apiService\.createPendingMembership/);
});

test("Phase 5 enforces real Supabase Auth session handling and prohibits default-authenticated portal access", async () => {
  const supabaseAuth = await read("apps/web/lib/supabase-auth.ts");
  const authContext = await read("apps/web/lib/auth-context.tsx");
  const portalShell = await read(
    "apps/web/components/portal/portal-shell.tsx",
  );

  // Supabase Auth endpoints
  assert.match(supabaseAuth, /\/auth\/v1\/token\?grant_type=password/);
  assert.match(supabaseAuth, /\/auth\/v1\/signup/);
  assert.match(supabaseAuth, /\/auth\/v1\/recover/);
  assert.match(supabaseAuth, /\/auth\/v1\/logout/);

  // Auth context starts unauthenticated
  assert.match(authContext, /useState<boolean>\(false\)/);

  // Portal shell redirects unauthenticated users
  assert.match(portalShell, /router\.replace\(`/);
  assert.match(portalShell, /auth\/login\?redirect=/);
});

test("Phase 5 enrolment confirmation verifies authoritative backend state and rejects fake URL payment activation", async () => {
  const confirmation = await read("apps/web/app/enrol/confirmation/page.tsx");

  // Must query backend billing/membership status rather than assuming URL paid state
  assert.match(confirmation, /apiService\.getMembershipBilling/);
  assert.match(confirmation, /apiService\.listAthleteMemberships/);
  assert.match(confirmation, /status === "ACTIVE"/);
  assert.match(confirmation, /PENDING/);
});

test("Phase 5 accessible Dialog and Sheet components implement ARIA roles, focus management, and Escape key handling", async () => {
  const dialog = await read("apps/web/components/ui/dialog.tsx");
  const sheet = await read("apps/web/components/ui/sheet.tsx");

  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /aria-labelledby/);
  assert.match(dialog, /addEventListener\("keydown",\s*handleKeyDown\)/);
  assert.match(dialog, /document\.body\.style\.overflow = "hidden"/);

  assert.match(sheet, /role="dialog"/);
  assert.match(sheet, /aria-modal="true"/);
  assert.match(sheet, /addEventListener\("keydown",\s*handleKeyDown\)/);
});
