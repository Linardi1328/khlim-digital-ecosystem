import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Consent management defaults to off, requires opt-in, and supports withdrawal", async () => {
  const code = await read("apps/web/lib/analytics-consent.ts");

  // Defaults to off / null
  assert.match(code, /getAnalyticsConsent\(\):\s*AnalyticsConsentStatus/);
  assert.match(code, /hasAnalyticsConsent\(\):\s*boolean/);
  assert.match(code, /return getAnalyticsConsent\(\) === "granted"/);

  // Explicit opt-in and withdrawal
  assert.match(code, /setAnalyticsConsent\(status:\s*"granted" \| "denied"\)/);
  assert.match(code, /withdrawAnalyticsConsent\(\)/);
  assert.match(code, /localStorage\.removeItem\(ANALYTICS_ANON_ID_KEY\)/);
  assert.match(code, /window\.dispatchEvent/);
});

test("PostHog client strictly gates on consent, strips all PII, and deduplicates events", async () => {
  const code = await read("apps/web/lib/posthog.ts");

  // Consent-gated
  assert.match(code, /if \(!isAnalyticsActive\(\)\)/);
  assert.match(
    code,
    /return isPostHogConfigured\(\) && hasAnalyticsConsent\(\)/,
  );

  // Permitted events only
  assert.match(code, /"campaign_landing"/);
  assert.match(code, /"interest_form_view"/);
  assert.match(code, /"interest_submit_success_client"/);

  // PII prevention
  assert.match(code, /FORBIDDEN_KEY_PATTERNS/);
  assert.match(code, /\/name\/i/);
  assert.match(code, /\/phone\/i/);
  assert.match(code, /\/email\/i/);
  assert.match(code, /\/child\/i/);
  assert.match(code, /\/guardian\/i/);

  // Safe error handling: never throws or fails registration
  assert.match(code, /catch\s*\{[\s\S]*?return false;\s*\}/);

  // Deduplication
  assert.match(code, /khlim_tracked_landing_/);
  assert.match(code, /khlim_tracked_form_view_/);
});

test("Cookie and Privacy policies document 24 Oct 3x3 campaign analytics and US Cloud processing", async () => {
  const cookies = await read("apps/web/app/cookies/page.tsx");
  const privacy = await read("apps/web/app/privacy/page.tsx");

  // Cookies policy covers PostHog US Cloud and Project 652783
  assert.match(cookies, /PostHog \(US Cloud, Project ID 652783\)/);
  assert.match(cookies, /PostHog \(US Cloud, ID Projek 652783\)/);
  assert.match(cookies, /AnalyticsPreferencesControl/);
  assert.match(cookies, /autocapture/);

  // Privacy policy covers PostHog US Cloud and PDPA section 129 cross-border transfers
  assert.match(privacy, /PostHog \(US Cloud\)/);
  assert.match(privacy, /section 129 of the Personal Data Protection Act 2010/);
  assert.match(privacy, /seksyen 129 Akta Perlindungan Data Peribadi 2010/);
});

test("Cookie consent messages are completely localized across all 5 supported languages", async () => {
  const { complianceWebMessages } = await import(
    new URL("packages/i18n/src/messages/compliance-web.ts", root).href
  );

  const expectedLocales = ["en", "ms", "zh-Hans", "zh-Hant", "hi"];
  const expectedKeys = [
    "compliance.consent.bannerTitle",
    "compliance.consent.bannerBody",
    "compliance.consent.acceptButton",
    "compliance.consent.declineButton",
    "compliance.consent.cookiePolicyLink",
    "compliance.consent.statusTitle",
    "compliance.consent.withdrawnStatus",
    "compliance.consent.grantedStatus",
    "compliance.consent.withdrawButton",
    "compliance.consent.grantButton",
  ];

  for (const locale of expectedLocales) {
    const dict = complianceWebMessages[locale];
    assert.ok(dict, `Locale ${locale} dictionary must exist`);
    for (const key of expectedKeys) {
      assert.ok(
        dict[key] && dict[key].length > 0,
        `Key ${key} must exist and be non-empty in ${locale}`,
      );
    }
  }
});
