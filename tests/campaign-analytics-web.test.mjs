import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import { test } from "node:test";

register("./test-ts-loader.mjs", import.meta.url);

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

// In-memory web storage mock
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) ?? null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i) {
    return Array.from(this.store.keys())[i] ?? null;
  }
}

function setupMockBrowser(
  initialHref = "http://localhost:3000/?source=3x3-oct24",
) {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const eventListeners = new Map();

  const mockWindow = {
    location: {
      href: initialHref,
      pathname: "/",
    },
    addEventListener: (event, handler) => {
      if (!eventListeners.has(event)) eventListeners.set(event, []);
      eventListeners.get(event).push(handler);
    },
    removeEventListener: (event, handler) => {
      const list = eventListeners.get(event) || [];
      eventListeners.set(
        event,
        list.filter((h) => h !== handler),
      );
    },
    dispatchEvent: (event) => {
      const list = eventListeners.get(event.type) || [];
      for (const handler of list) {
        handler(event);
      }
      return true;
    },
  };

  class MockCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }

  globalThis.window = mockWindow;
  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;
  globalThis.CustomEvent = MockCustomEvent;

  return { mockWindow, localStorage, sessionStorage, eventListeners };
}

test("Consent management defaults to off, requires explicit opt-in, and clears storage upon withdrawal", async () => {
  const { localStorage, sessionStorage } = setupMockBrowser();

  const {
    getAnalyticsConsent,
    hasAnalyticsConsent,
    setAnalyticsConsent,
    withdrawAnalyticsConsent,
    ANALYTICS_ANON_ID_KEY,
    ANALYTICS_SESSION_ID_KEY,
    ANALYTICS_CONSENT_STORAGE_KEY,
  } = await import("../apps/web/lib/analytics-consent.ts");

  // 1. Defaults to off / null
  assert.equal(getAnalyticsConsent(), null);
  assert.equal(hasAnalyticsConsent(), false);

  // 2. Explicit opt-in
  setAnalyticsConsent("granted");
  assert.equal(getAnalyticsConsent(), "granted");
  assert.equal(hasAnalyticsConsent(), true);
  assert.equal(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY), "granted");

  // 3. Populate mock tracking and session markers
  localStorage.setItem(ANALYTICS_ANON_ID_KEY, "anon-test-uuid");
  sessionStorage.setItem(ANALYTICS_SESSION_ID_KEY, "sess-test-uuid");
  sessionStorage.setItem("khlim_tracked_landing_session_3x3-oct24", "1");
  sessionStorage.setItem("khlim_tracked_form_view_3x3-oct24", "1");

  // 4. Withdrawal purges all client persistence
  withdrawAnalyticsConsent();
  assert.equal(getAnalyticsConsent(), "denied");
  assert.equal(hasAnalyticsConsent(), false);
  assert.equal(localStorage.getItem(ANALYTICS_ANON_ID_KEY), null);
  assert.equal(sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY), null);
  assert.equal(
    sessionStorage.getItem("khlim_tracked_landing_session_3x3-oct24"),
    null,
  );
  assert.equal(
    sessionStorage.getItem("khlim_tracked_form_view_3x3-oct24"),
    null,
  );
});

test("PostHog client strictly gates on consent, suppresses PII/GeoIP/profiles, and deduplicates landing across Home/Academy", async () => {
  const { sessionStorage } = setupMockBrowser();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-phc-key";

  const {
    trackCampaignLanding,
    trackInterestFormView,
    trackInterestSubmitSuccess,
    POSTHOG_DEFAULT_INGESTION_HOST,
    CAMPAIGN_TOKEN_3X3,
  } = await import("../apps/web/lib/posthog.ts");

  const { setAnalyticsConsent, withdrawAnalyticsConsent } =
    await import("../apps/web/lib/analytics-consent.ts");

  let capturedRequests = [];
  globalThis.fetch = async (url, options) => {
    capturedRequests.push({
      url: String(url),
      method: options.method,
      headers: options.headers,
      body: JSON.parse(options.body),
    });
    return { ok: true, status: 200, json: async () => ({ status: 1 }) };
  };

  // 1. Without consent, no tracking occurs
  capturedRequests = [];
  const landingWithoutConsent = await trackCampaignLanding(
    CAMPAIGN_TOKEN_3X3,
    "/",
  );
  assert.equal(landingWithoutConsent, false);
  assert.equal(capturedRequests.length, 0);
  assert.equal(
    sessionStorage.getItem("khlim_tracked_landing_session_3x3-oct24"),
    null,
  );

  // 2. User grants consent (e.g. post-landing banner acceptance)
  setAnalyticsConsent("granted");

  // 3. Campaign landing records exactly once with minimal properties and privacy flags
  capturedRequests = [];
  const landingWithConsent = await trackCampaignLanding(
    CAMPAIGN_TOKEN_3X3,
    "/?source=3x3-oct24#hero",
  );
  assert.equal(landingWithConsent, true);
  assert.equal(capturedRequests.length, 1);

  const req = capturedRequests[0];
  assert.equal(req.url, `${POSTHOG_DEFAULT_INGESTION_HOST}/capture/`);
  assert.equal(req.body.event, "campaign_landing");
  assert.equal(req.body.api_key, "test-phc-key");

  // Strict privacy properties
  assert.equal(req.body.properties.campaign, "3x3-oct24");
  assert.equal(req.body.properties.path, "/"); // query and hash stripped!
  assert.equal(req.body.properties.$process_person_profile, false);
  assert.equal(req.body.properties.$geoip_disable, true);
  assert.ok(req.body.properties.distinct_id);
  assert.ok(req.body.properties.$session_id);

  // Strictly prohibited properties
  assert.equal(req.body.properties.$current_url, undefined);
  assert.equal(req.body.properties.source, undefined);
  assert.equal(req.body.properties.query, undefined);

  // Session marker was persisted only after successful transmission
  assert.equal(
    sessionStorage.getItem("khlim_tracked_landing_session_3x3-oct24"),
    "1",
  );

  // 4. Session deduplication: Navigating to /academy in same session does not send duplicate event
  capturedRequests = [];
  const secondLanding = await trackCampaignLanding(
    CAMPAIGN_TOKEN_3X3,
    "/academy",
  );
  assert.equal(secondLanding, false);
  assert.equal(capturedRequests.length, 0);

  // 5. Form engagement tracking: organic visitors are rejected without fallback to 3x3-oct24
  capturedRequests = [];
  const organicFormView = await trackInterestFormView(null, "offering-1");
  assert.equal(organicFormView, false);
  assert.equal(capturedRequests.length, 0);

  const organicSubmit = await trackInterestSubmitSuccess(
    undefined,
    "offering-1",
  );
  assert.equal(organicSubmit, false);
  assert.equal(capturedRequests.length, 0);

  // 6. Campaign form engagement
  capturedRequests = [];
  const campaignFormView = await trackInterestFormView(
    CAMPAIGN_TOKEN_3X3,
    "offering-1",
  );
  assert.equal(campaignFormView, true);
  assert.equal(capturedRequests.length, 1);
  assert.equal(capturedRequests[0].body.event, "interest_form_view");
  assert.equal(capturedRequests[0].body.properties.offering_id, "offering-1");
  assert.equal(capturedRequests[0].body.properties.path, "/interest");

  // Form engagement deduplication in same session
  capturedRequests = [];
  const repeatFormView = await trackInterestFormView(
    CAMPAIGN_TOKEN_3X3,
    "offering-1",
  );
  assert.equal(repeatFormView, false);
  assert.equal(capturedRequests.length, 0);

  // 7. Lead submission success client receipt
  capturedRequests = [];
  const submitReceipt = await trackInterestSubmitSuccess(
    CAMPAIGN_TOKEN_3X3,
    "offering-1",
  );
  assert.equal(submitReceipt, true);
  assert.equal(capturedRequests.length, 1);
  assert.equal(
    capturedRequests[0].body.event,
    "interest_submit_success_client",
  );

  // 8. Consent withdrawal stops all tracking and clears session markers
  withdrawAnalyticsConsent();
  capturedRequests = [];
  const postWithdrawalLanding = await trackCampaignLanding(
    CAMPAIGN_TOKEN_3X3,
    "/",
  );
  assert.equal(postWithdrawalLanding, false);
  assert.equal(capturedRequests.length, 0);
  assert.equal(
    sessionStorage.getItem("khlim_tracked_landing_session_3x3-oct24"),
    null,
  );
});

test("Network failures do not permanently block session tracking and are handled safely", async () => {
  setupMockBrowser();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-phc-key";

  const { trackCampaignLanding, CAMPAIGN_TOKEN_3X3 } =
    await import("../apps/web/lib/posthog.ts");
  const { setAnalyticsConsent } =
    await import("../apps/web/lib/analytics-consent.ts");

  setAnalyticsConsent("granted");

  // Simulate network throwing an exception
  globalThis.fetch = async () => {
    throw new Error("Simulated network dropout");
  };

  const failedResult = await trackCampaignLanding(CAMPAIGN_TOKEN_3X3, "/");
  assert.equal(failedResult, false);
  // Dedup marker must NOT be set on failure
  assert.equal(
    sessionStorage.getItem("khlim_tracked_landing_session_3x3-oct24"),
    null,
  );

  // Network recovers
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ status: 1 }),
  });

  const recoveredResult = await trackCampaignLanding(CAMPAIGN_TOKEN_3X3, "/");
  assert.equal(recoveredResult, true);
  assert.equal(
    sessionStorage.getItem("khlim_tracked_landing_session_3x3-oct24"),
    "1",
  );
});

test("Cookie and Privacy policies document 24 Oct 3x3 campaign analytics, US Cloud processing, and suppressed profiles/GeoIP", async () => {
  const cookies = await read("apps/web/app/cookies/page.tsx");
  const privacy = await read("apps/web/app/privacy/page.tsx");

  // Cookies policy covers PostHog US Cloud, Project 652783, and suppressed features
  assert.match(cookies, /PostHog \(US Cloud, Project ID 652783\)/);
  assert.match(cookies, /PostHog \(US Cloud, ID Projek 652783\)/);
  assert.match(cookies, /AnalyticsPreferencesControl/);
  assert.match(cookies, /autocapture/);
  assert.match(cookies, /suppresses person profiles and geolocation lookups/);
  assert.match(cookies, /without transmitting full URLs or raw query strings/);

  // Privacy policy covers PostHog US Cloud and PDPA section 129 cross-border transfers
  assert.match(privacy, /PostHog \(US Cloud\)/);
  assert.match(privacy, /section 129 of the Personal Data Protection Act 2010/);
  assert.match(privacy, /seksyen 129 Akta Perlindungan Data Peribadi 2010/);
  assert.match(
    privacy,
    /explicitly suppress person profiles and geolocation lookups/,
  );
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
