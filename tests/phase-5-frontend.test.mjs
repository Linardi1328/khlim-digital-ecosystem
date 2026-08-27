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

test("Phase 5 website resolves shared platform sources without lockfile drift", async () => {
  const manifest = await readJson("apps/web/package.json");
  const tsconfig = await readJson("apps/web/tsconfig.json");
  const layout = await read("apps/web/app/layout.tsx");

  assert.equal(manifest.dependencies["@khlim/api-client"], undefined);
  assert.equal(manifest.dependencies["@khlim/design-tokens"], undefined);
  assert.equal(manifest.dependencies["@khlim/i18n"], undefined);
  assert.equal(
    tsconfig.compilerOptions.paths["@khlim/api-client"][0],
    "../../packages/api-client/src/index.ts",
  );
  assert.equal(
    tsconfig.compilerOptions.paths["@khlim/api-client/schema"][0],
    "../../packages/api-client/src/schema.d.ts",
  );
  assert.equal(
    tsconfig.compilerOptions.paths["@khlim/i18n"][0],
    "../../packages/i18n/src/index.ts",
  );
  assert.match(layout, /packages\/design-tokens\/src\/tokens\.css/);
});

test("Phase 5 API integration uses the versioned API base without duplicating v1", async () => {
  const api = await read("apps/web/lib/api-service.ts");
  const env = await read(".env.example");
  assert.match(env, /NEXT_PUBLIC_API_BASE_URL=http:\/\/localhost:3001\/v1/);
  assert.match(api, /"\/academy\/offerings"/);
  assert.match(api, /"\/me"/);
  assert.doesNotMatch(api, /"\/v1\/academy\/offerings"/);
});

test("Phase 5 uses backend membership DTO names and never activates memberships in the browser", async () => {
  const enrol = await read("apps/web/app/enrol/page.tsx");
  const api = await read("apps/web/lib/api-service.ts");
  assert.match(enrol, /offeringId:\s*offering\.id/);
  assert.match(enrol, /planId:\s*plan\.id/);
  assert.match(enrol, /acceptTerms:\s*true/);
  assert.doesNotMatch(enrol, /status:\s*["']ACTIVE["']/);
  assert.doesNotMatch(api, /INITIAL_(PROGRAMMES|OFFERINGS|MEMBERSHIP_PLANS)/);
});

test("Phase 5 checkout never renders KHLIM-owned card or CVV fields", async () => {
  const enrol = await read("apps/web/app/enrol/page.tsx");
  assert.doesNotMatch(enrol, /label=["']Card Number["']/i);
  assert.doesNotMatch(enrol, /label=["']CVV["']/i);
  assert.match(enrol, /prepareCheckout/);
  assert.match(enrol, /window\.location\.assign\(checkout\.checkoutUrl\)/);
});

test("Phase 5 confirmation requires verified backend state and has an explicit verification error state", async () => {
  const confirmation = await read("apps/web/app/enrol/confirmation/page.tsx");
  assert.match(confirmation, /getMembershipBilling/);
  assert.match(confirmation, /listAthleteMemberships/);
  assert.match(confirmation, /"error"/);
  assert.match(
    confirmation,
    /No payment or membership success is being assumed/,
  );
  assert.doesNotMatch(confirmation, /memberships\[0\]/);
});

test("Phase 5 Supabase session handling refreshes expiring sessions and refuses placeholder configuration", async () => {
  const auth = await read("apps/web/lib/supabase-auth.ts");
  assert.match(auth, /grant_type=refresh_token/);
  assert.match(auth, /getValidAccessToken/);
  assert.match(auth, /expires_at/);
  assert.match(auth, /example\.supabase\.co/);
  assert.match(auth, /Supabase Auth is not configured/);
  assert.doesNotMatch(auth, /\|\|\s*["']https:\/\/example\.supabase\.co/);
});

test("Phase 5 registration handles email-confirmation mode without pretending the user is signed in", async () => {
  const authContext = await read("apps/web/lib/auth-context.tsx");
  const register = await read("apps/web/app/auth/register/page.tsx");
  assert.match(authContext, /emailConfirmationRequired/);
  assert.match(authContext, /authenticated:\s*false/);
  assert.match(register, /Verify your email to continue/);
});

test("Phase 5 recovery includes an actual reset-password page", async () => {
  await access(new URL("apps/web/app/auth/reset-password/page.tsx", root));
  const recovery = await read("apps/web/app/auth/reset-password/page.tsx");
  assert.match(recovery, /supabaseUpdatePassword/);
  assert.match(recovery, /restoreRecoverySessionFromUrl/);
});

test("Phase 5 managed-athlete forms collect only fields supported by the family API", async () => {
  const enrol = await read("apps/web/app/enrol/page.tsx");
  const players = await read("apps/web/app/portal/players/page.tsx");
  const switcher = await read("apps/web/components/portal/child-switcher.tsx");
  const onboarding = await read("apps/web/app/onboarding/guardian/page.tsx");

  assert.doesNotMatch(enrol, /newChildGender/);
  assert.doesNotMatch(players, /gender:/);
  assert.doesNotMatch(switcher, /newChildGender|gender:/);
  assert.doesNotMatch(onboarding, /emergencyContact/);
});

test("Phase 5 account UI never claims unsupported deactivation was queued", async () => {
  const account = await read("apps/web/app/portal/account/page.tsx");
  assert.match(account, /Not yet available/);
  assert.doesNotMatch(account, /queued for administrative review/i);
});

test("Phase 5 public copy does not hard-code unverified venues or programme tiers", async () => {
  const footer = await read("apps/web/components/layout/public-footer.tsx");
  const about = await read("apps/web/app/about/page.tsx");
  const privacy = await read("apps/web/app/privacy/page.tsx");
  const terms = await read("apps/web/app/terms/page.tsx");

  assert.doesNotMatch(footer, /Seri Kembangan|Cyberjaya|Advanced Elite/i);
  assert.doesNotMatch(about, /Founded by passionate basketball coaches/i);
  assert.match(
    privacy,
    /Later capabilities such as attendance\s+or development records require separate implementation/,
  );
  assert.match(
    terms,
    /Detailed session scheduling, cancellations, replacement sessions,\s+attendance, and term-adjustment rules are later operational\s+capabilities/,
  );
});

test("Phase 5 responsive rules separate desktop and mobile navigation", async () => {
  const css = await read("apps/web/app/globals.css");
  const header = await read("apps/web/components/layout/public-header.tsx");
  const portal = await read("apps/web/components/portal/portal-shell.tsx");
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /\.mobile-menu-btn/);
  assert.match(css, /\.portal-desktop-sidebar/);
  assert.match(css, /\.portal-mobile-bottom-nav/);
  assert.match(header, /mobile-menu-btn/);
  assert.match(portal, /portal-mobile-bottom-nav/);
});

test("Phase 5 legal pages remain clearly draft content", async () => {
  const terms = await read("apps/web/app/terms/page.tsx");
  const privacy = await read("apps/web/app/privacy/page.tsx");
  assert.match(terms, /DRAFT/);
  assert.match(privacy, /DRAFT/);
  assert.doesNotMatch(privacy, />\s*Malaysian PDPA Compliant\s*</i);
});

test("Phase 5 public and portal route surfaces exist", async () => {
  const routes = [
    "apps/web/app/page.tsx",
    "apps/web/app/academy/page.tsx",
    "apps/web/app/programmes/page.tsx",
    "apps/web/app/programmes/[offeringId]/page.tsx",
    "apps/web/app/about/page.tsx",
    "apps/web/app/contact/page.tsx",
    "apps/web/app/auth/login/page.tsx",
    "apps/web/app/auth/register/page.tsx",
    "apps/web/app/auth/forgot-password/page.tsx",
    "apps/web/app/onboarding/guardian/page.tsx",
    "apps/web/app/enrol/page.tsx",
    "apps/web/app/portal/dashboard/page.tsx",
    "apps/web/app/portal/players/page.tsx",
    "apps/web/app/portal/membership/page.tsx",
    "apps/web/app/portal/payments/page.tsx",
    "apps/web/app/portal/schedule/page.tsx",
    "apps/web/app/portal/notifications/page.tsx",
    "apps/web/app/portal/account/page.tsx",
  ];
  for (const route of routes) await access(new URL(route, root));
});
