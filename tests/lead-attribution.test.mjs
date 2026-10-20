import assert from "node:assert/strict";
import { register } from "node:module";
import { test, describe } from "node:test";

register("./test-ts-loader.mjs", import.meta.url);

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

function setupMockBrowser(initialHref = "http://localhost:3000/") {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();

  const mockWindow = {
    location: {
      href: initialHref,
      pathname: new URL(initialHref).pathname,
      search: new URL(initialHref).search,
    },
  };

  globalThis.window = mockWindow;
  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;

  return { mockWindow, localStorage, sessionStorage };
}

describe("Lead Attribution and Campaign Source Resolution", () => {
  test("Sanitizes and extracts campaign candidate from various query parameters", async () => {
    const {
      sanitizeCampaignToken,
      extractCampaignCandidate,
      getQueryCampaignSource,
    } = await import("../apps/web/lib/campaign-source.ts");

    // Valid bounded campaign tokens
    assert.equal(sanitizeCampaignToken("3x3-oct24"), "3x3-oct24");
    assert.equal(sanitizeCampaignToken("instagram_ad"), "instagram_ad");
    assert.equal(sanitizeCampaignToken("SUMMER_CAMP_2025"), "SUMMER_CAMP_2025");
    assert.equal(sanitizeCampaignToken("a".repeat(64)), "a".repeat(64));

    // Whitespace trimming
    assert.equal(sanitizeCampaignToken("  3x3-oct24  "), "3x3-oct24");

    // Invalid / malformed tokens rejected to null
    assert.equal(sanitizeCampaignToken(null), null);
    assert.equal(sanitizeCampaignToken(undefined), null);
    assert.equal(sanitizeCampaignToken(""), null);
    assert.equal(sanitizeCampaignToken("   "), null);
    assert.equal(sanitizeCampaignToken("a".repeat(65)), null); // exceeds 64 chars
    assert.equal(sanitizeCampaignToken("with spaces"), null);
    assert.equal(sanitizeCampaignToken("<script>alert(1)</script>"), null);
    assert.equal(sanitizeCampaignToken("source;drop table"), null);
    assert.equal(sanitizeCampaignToken("../traversal"), null);

    // Extraction prioritization from URLSearchParams
    const params1 = new URLSearchParams("source=direct-src&utm_source=utm-src");
    assert.equal(extractCampaignCandidate(params1), "direct-src");

    const params2 = new URLSearchParams("utm_source=utm-src&ref=ref-src");
    assert.equal(extractCampaignCandidate(params2), "utm-src");

    const params3 = new URLSearchParams("ref=ref-src&campaign=camp-src");
    assert.equal(extractCampaignCandidate(params3), "ref-src");

    const params4 = new URLSearchParams("campaign=camp-src");
    assert.equal(extractCampaignCandidate(params4), "camp-src");

    // getQueryCampaignSource sanitizes candidate
    assert.equal(getQueryCampaignSource(params4), "camp-src");
    assert.equal(
      getQueryCampaignSource(new URLSearchParams("source=bad%20token")),
      null,
    );
  });

  test("Session persistence and cross-page retrieval across visitor journey", async () => {
    const { sessionStorage } = setupMockBrowser(
      "http://localhost:3000/?source=flyer-qr24",
    );
    const { resolveCampaignSource, SESSION_STORAGE_KEY } =
      await import("../apps/web/lib/campaign-source.ts");

    // 1. Initial arrival with query parameter
    const params = new URLSearchParams("source=flyer-qr24");
    const source1 = resolveCampaignSource(params);
    assert.equal(source1, "flyer-qr24");
    assert.equal(sessionStorage.getItem(SESSION_STORAGE_KEY), "flyer-qr24");

    // 2. Navigation to internal page without query parameters: retrieves from sessionStorage
    const source2 = resolveCampaignSource();
    assert.equal(source2, "flyer-qr24");

    const emptyParams = new URLSearchParams("");
    const source3 = resolveCampaignSource(emptyParams);
    assert.equal(source3, "flyer-qr24");

    // 3. Arrival with a new valid campaign query updates sessionStorage
    const newParams = new URLSearchParams("utm_source=facebook-promo");
    const source4 = resolveCampaignSource(newParams);
    assert.equal(source4, "facebook-promo");
    assert.equal(sessionStorage.getItem(SESSION_STORAGE_KEY), "facebook-promo");

    // 4. Tampered / invalid token in sessionStorage is rejected
    sessionStorage.setItem(SESSION_STORAGE_KEY, "invalid token with spaces");
    const source5 = resolveCampaignSource();
    assert.equal(source5, null);
  });

  test("Explicit fallback: resolveLeadSubmissionSource returns 'unattributed' for untracked visits", async () => {
    const { sessionStorage } = setupMockBrowser("http://localhost:3000/");
    const {
      resolveCampaignSource,
      resolveLeadSubmissionSource,
      UNATTRIBUTED_CAMPAIGN_SOURCE,
    } = await import("../apps/web/lib/campaign-source.ts");

    assert.equal(UNATTRIBUTED_CAMPAIGN_SOURCE, "unattributed");

    // Clean session, no query params
    sessionStorage.clear();
    assert.equal(resolveCampaignSource(), null);
    assert.equal(resolveCampaignSource(null), null);
    assert.equal(resolveCampaignSource(new URLSearchParams()), null);

    // resolveLeadSubmissionSource MUST return explicit "unattributed"
    assert.equal(resolveLeadSubmissionSource(), "unattributed");
    assert.equal(resolveLeadSubmissionSource(null), "unattributed");
    assert.equal(
      resolveLeadSubmissionSource(new URLSearchParams()),
      "unattributed",
    );

    // Visitor with malformed / rejected token falls back to "unattributed"
    assert.equal(
      resolveLeadSubmissionSource(new URLSearchParams("source=bad<token>")),
      "unattributed",
    );

    // Visitor with valid campaign token returns the actual campaign token
    assert.equal(
      resolveLeadSubmissionSource(new URLSearchParams("source=3x3-oct24")),
      "3x3-oct24",
    );
  });

  test("buildUrlWithSource preserves tracked tokens but omits 'unattributed' and null", async () => {
    setupMockBrowser();
    const { buildUrlWithSource, UNATTRIBUTED_CAMPAIGN_SOURCE } =
      await import("../apps/web/lib/campaign-source.ts");

    // 1. With valid campaign token
    assert.equal(
      buildUrlWithSource("/interest", "3x3-oct24"),
      "/interest?source=3x3-oct24",
    );

    // 2. Preserves existing query parameters
    assert.equal(
      buildUrlWithSource("/interest?offering=u12-serdang", "3x3-oct24"),
      "/interest?offering=u12-serdang&source=3x3-oct24",
    );

    // 3. With explicit 'unattributed' fallback -> MUST NOT append source parameter
    assert.equal(
      buildUrlWithSource("/interest", UNATTRIBUTED_CAMPAIGN_SOURCE),
      "/interest",
    );
    assert.equal(buildUrlWithSource("/interest", "unattributed"), "/interest");

    // 4. With null / undefined / empty -> MUST NOT append source parameter
    assert.equal(buildUrlWithSource("/interest", null), "/interest");
    assert.equal(buildUrlWithSource("/interest", undefined), "/interest");
    assert.equal(buildUrlWithSource("/interest", ""), "/interest");

    // 5. Does not duplicate source if already present in base URL
    assert.equal(
      buildUrlWithSource("/interest?source=existing-source", "new-source"),
      "/interest?source=existing-source",
    );

    // 6. With additionalParams
    assert.equal(
      buildUrlWithSource("/interest", "3x3-oct24", {
        tab: "schedule",
        ref: undefined,
      }),
      "/interest?tab=schedule&source=3x3-oct24",
    );
  });

  test("Rejects sample contact-info strings and phone-like patterns from token sanitization and storage", async () => {
    const { sanitizeCampaignToken, SESSION_STORAGE_KEY } =
      await import("../apps/web/lib/campaign-source.ts");
    const { sessionStorage } = setupMockBrowser();

    const sensitiveInputs = [
      "+601100000001",
      "+60 11-0000 0001",
      "011-00000001",
      "012-000-0001",
      "parent@example.com",
      "guardian.name@khlim.com",
      "Lee Chong Wei",
      "IC: 900101-14-1234",
      "password123!",
      "<script>alert(1)</script>",
      "Bearer eyJhbGciOi...",
    ];

    for (const input of sensitiveInputs) {
      assert.equal(
        sanitizeCampaignToken(input),
        null,
        `Sample input '${input}' should be rejected by sanitizeCampaignToken`,
      );
    }

    // Verify session storage does not store these sample contact values
    const sampleEmail = "parent@example.com";
    const samplePhone = "+601100000001";
    const sampleName = "Lee Chong Wei";

    assert.equal(sanitizeCampaignToken(sampleEmail), null);
    assert.equal(sanitizeCampaignToken(samplePhone), null);
    assert.equal(sanitizeCampaignToken(sampleName), null);

    assert.equal(sessionStorage.getItem(SESSION_STORAGE_KEY), null);
    assert.equal(sessionStorage.length, 0);
  });

  test("Rejects digits-only phone numbers in query parameters and session storage, falling back to 'unattributed'", async () => {
    const {
      sanitizeCampaignToken,
      getQueryCampaignSource,
      resolveCampaignSource,
      resolveLeadSubmissionSource,
      isPhoneLikeToken,
      SESSION_STORAGE_KEY,
    } = await import("../apps/web/lib/campaign-source.ts");

    // 1. Phone-like numeric tokens (digits-only without leading '+', hyphen-separated, and underscore-separated)
    const phoneLikeTokens = [
      "01100000001", // Malaysian 11-digit local mobile
      "0120000001", // Malaysian 10-digit local mobile
      "601100000001", // Malaysian 12-digit mobile with 601 prefix
      "60120000001", // Malaysian 11-digit mobile with 601 prefix
      "14155552671", // International 11-digit numeric
      "011-00000001", // Malaysian mobile with hyphen
      "012-000-0001", // Malaysian mobile with multiple hyphens
      "011_00000001", // Malaysian mobile with underscore
      "012_000_0001", // Malaysian mobile with multiple underscores
      "6011_0000_0001", // Malaysian mobile with prefix and underscores
    ];

    for (const phoneToken of phoneLikeTokens) {
      assert.equal(
        isPhoneLikeToken(phoneToken),
        true,
        `isPhoneLikeToken should identify '${phoneToken}' as phone-like`,
      );
      assert.equal(
        sanitizeCampaignToken(phoneToken),
        null,
        `sanitizeCampaignToken should reject phone-like '${phoneToken}' to null`,
      );
    }

    // 2. Legitimate campaign IDs are NOT rejected
    const legitimateCampaigns = [
      "3x3-oct24",
      "holiday_clinic_2026",
      "summer2025",
      "camp-123",
      "2026-10-24", // Date-based slug
      "2025", // 4-digit year slug
      "20261024", // 8-digit date slug
      "ig_stories_ad",
      "flyer-qr24",
    ];

    for (const legitId of legitimateCampaigns) {
      assert.equal(
        isPhoneLikeToken(legitId),
        false,
        `isPhoneLikeToken should NOT reject legitimate campaign '${legitId}'`,
      );
      assert.equal(
        sanitizeCampaignToken(legitId),
        legitId,
        `sanitizeCampaignToken should preserve legitimate campaign '${legitId}'`,
      );
    }

    // 3. Digits-only phone in query parameters: does not persist and falls back to unattributed
    for (const phoneToken of phoneLikeTokens) {
      const { sessionStorage } = setupMockBrowser(
        `http://localhost:3000/?source=${phoneToken}`,
      );
      sessionStorage.clear();

      const params = new URLSearchParams(`source=${phoneToken}`);
      assert.equal(getQueryCampaignSource(params), null);
      assert.equal(resolveCampaignSource(params), null);
      assert.equal(
        sessionStorage.getItem(SESSION_STORAGE_KEY),
        null,
        `Phone number '${phoneToken}' must not be stored in sessionStorage`,
      );
      assert.equal(
        resolveLeadSubmissionSource(params),
        "unattributed",
        `resolveLeadSubmissionSource must return 'unattributed' for phone '${phoneToken}'`,
      );
    }

    // 4. Digits-only phone already in session storage: rejected and falls back to unattributed
    for (const phoneToken of phoneLikeTokens) {
      const { sessionStorage } = setupMockBrowser(
        "http://localhost:3000/interest",
      );
      sessionStorage.setItem(SESSION_STORAGE_KEY, phoneToken);

      assert.equal(
        resolveCampaignSource(),
        null,
        `resolveCampaignSource must reject stored phone '${phoneToken}'`,
      );
      assert.equal(
        resolveLeadSubmissionSource(),
        "unattributed",
        `resolveLeadSubmissionSource must fall back to 'unattributed' for stored phone '${phoneToken}'`,
      );
    }
  });

  test("Rejects 'unattributed' as an input campaign source and preserves existing session attribution", async () => {
    const {
      sanitizeCampaignToken,
      getQueryCampaignSource,
      resolveCampaignSource,
      resolveLeadSubmissionSource,
      SESSION_STORAGE_KEY,
      UNATTRIBUTED_CAMPAIGN_SOURCE,
    } = await import("../apps/web/lib/campaign-source.ts");

    // 1. Direct sanitization rejects 'unattributed' as a valid tracking campaign
    assert.equal(sanitizeCampaignToken(UNATTRIBUTED_CAMPAIGN_SOURCE), null);
    assert.equal(sanitizeCampaignToken("unattributed"), null);

    const unattributedParams = new URLSearchParams("source=unattributed");
    assert.equal(getQueryCampaignSource(unattributedParams), null);

    // 2. When visitor arrives with ?source=unattributed on clean session -> resolve returns null, lead returns unattributed
    const { sessionStorage } = setupMockBrowser(
      "http://localhost:3000/?source=unattributed",
    );
    sessionStorage.clear();

    assert.equal(resolveCampaignSource(unattributedParams), null);
    assert.equal(sessionStorage.getItem(SESSION_STORAGE_KEY), null);
    assert.equal(
      resolveLeadSubmissionSource(unattributedParams),
      "unattributed",
    );

    // 3. When visitor already has a valid tracked campaign, ?source=unattributed DOES NOT overwrite it
    sessionStorage.setItem(SESSION_STORAGE_KEY, "3x3-oct24");
    assert.equal(resolveCampaignSource(unattributedParams), "3x3-oct24");
    assert.equal(sessionStorage.getItem(SESSION_STORAGE_KEY), "3x3-oct24");
    assert.equal(resolveLeadSubmissionSource(unattributedParams), "3x3-oct24");
  });

  test("Campaign source helper resolution sequence: initial URL, dynamic query transition, stored preservation, untagged navigation, and phone rejection", async () => {
    const {
      resolveCampaignSource,
      resolveLeadSubmissionSource,
      buildUrlWithSource,
      SESSION_STORAGE_KEY,
    } = await import("../apps/web/lib/campaign-source.ts");

    // 1. Initial campaign URL with no parent source prop
    const { sessionStorage } = setupMockBrowser(
      "http://localhost:3000/?source=3x3-oct24",
    );
    const initialParams = new URLSearchParams("source=3x3-oct24");
    const initialSource = resolveCampaignSource(initialParams);
    assert.equal(initialSource, "3x3-oct24");
    assert.equal(sessionStorage.getItem(SESSION_STORAGE_KEY), "3x3-oct24");
    assert.equal(
      buildUrlWithSource("/interest", initialSource),
      "/interest?source=3x3-oct24",
    );
    assert.equal(
      buildUrlWithSource("/academy", initialSource),
      "/academy?source=3x3-oct24",
    );
    assert.equal(
      buildUrlWithSource("/enrol", initialSource),
      "/enrol?source=3x3-oct24",
    );

    // 2. Client-side source query change while header/footer stay mounted
    const changedParams = new URLSearchParams("source=holiday_clinic_2026");
    const updatedSource = resolveCampaignSource(changedParams);
    assert.equal(updatedSource, "holiday_clinic_2026");
    assert.equal(
      sessionStorage.getItem(SESSION_STORAGE_KEY),
      "holiday_clinic_2026",
    );
    assert.equal(
      buildUrlWithSource("/interest", updatedSource),
      "/interest?source=holiday_clinic_2026",
    );
    assert.equal(
      buildUrlWithSource("/programmes", updatedSource),
      "/programmes?source=holiday_clinic_2026",
    );
    assert.equal(
      buildUrlWithSource("/enrol", updatedSource),
      "/enrol?source=holiday_clinic_2026",
    );

    // 3. Stored campaign preservation across untagged internal navigation
    const emptyParams = new URLSearchParams("");
    const preservedSource = resolveCampaignSource(emptyParams);
    assert.equal(preservedSource, "holiday_clinic_2026");
    assert.equal(
      buildUrlWithSource("/interest", preservedSource),
      "/interest?source=holiday_clinic_2026",
    );
    assert.equal(
      buildUrlWithSource("/enrol", preservedSource),
      "/enrol?source=holiday_clinic_2026",
    );

    // 4. Untagged navigation with fresh session
    sessionStorage.clear();
    const freshUntaggedParams = new URLSearchParams("");
    const untaggedSource = resolveCampaignSource(freshUntaggedParams);
    assert.equal(untaggedSource, null);
    assert.equal(
      resolveLeadSubmissionSource(freshUntaggedParams),
      "unattributed",
    );
    assert.equal(buildUrlWithSource("/interest", untaggedSource), "/interest");
    assert.equal(buildUrlWithSource("/academy", untaggedSource), "/academy");
    assert.equal(buildUrlWithSource("/enrol", untaggedSource), "/enrol");

    // 5. Rejection of phone-like campaign values
    const phoneParams = new URLSearchParams("source=01100000001");
    const phoneResolved = resolveCampaignSource(phoneParams);
    assert.equal(phoneResolved, null);
    assert.equal(sessionStorage.getItem(SESSION_STORAGE_KEY), null);
    assert.equal(resolveLeadSubmissionSource(phoneParams), "unattributed");
    assert.equal(buildUrlWithSource("/interest", phoneResolved), "/interest");
    assert.equal(buildUrlWithSource("/enrol", phoneResolved), "/enrol");

    // 6. Rejection of underscore-formatted phone number
    const underscorePhoneParams = new URLSearchParams("source=011_0000_0002");
    const underscorePhoneResolved = resolveCampaignSource(
      underscorePhoneParams,
    );
    assert.equal(underscorePhoneResolved, null);
    assert.equal(
      resolveLeadSubmissionSource(underscorePhoneParams),
      "unattributed",
    );
    assert.equal(
      buildUrlWithSource("/enrol", underscorePhoneResolved),
      "/enrol",
    );
  });

  test("Initial-loading state preserves valid campaign attribution and localized announcement", async () => {
    const {
      getQueryCampaignSource,
      resolveLeadSubmissionSource,
      buildUrlWithSource,
    } = await import("../apps/web/lib/campaign-source.ts");

    // 1. Initial valid campaign URL resolves synchronously during initial render
    const initialParams = new URLSearchParams("source=3x3-oct24");
    const synchronousSource = getQueryCampaignSource(initialParams);
    assert.equal(
      synchronousSource,
      "3x3-oct24",
      "Valid campaign token must resolve synchronously on initial render without waiting for effects",
    );
    assert.equal(
      buildUrlWithSource("/interest", synchronousSource),
      "/interest?source=3x3-oct24",
      "Navigable links in loading shell must never drop a fresh valid campaign token",
    );
    assert.equal(
      buildUrlWithSource("/programmes", synchronousSource),
      "/programmes?source=3x3-oct24",
      "Footer links in loading shell must retain the valid campaign token",
    );

    // 2. Initial untagged or invalid phone query falls back safely
    const untaggedParams = new URLSearchParams("");
    assert.equal(getQueryCampaignSource(untaggedParams), null);
    assert.equal(resolveLeadSubmissionSource(untaggedParams), "unattributed");

    const phoneParams = new URLSearchParams("source=011_0000_0002");
    assert.equal(getQueryCampaignSource(phoneParams), null);
    assert.equal(resolveLeadSubmissionSource(phoneParams), "unattributed");

    // 3. Verify localized loading announcement keys exist in i18n messages
    const { interestWebMessages } =
      await import("../packages/i18n/src/messages/interest-web.ts");
    assert.equal(
      interestWebMessages.en["interest.loading"],
      "Loading registration form...",
      "English translation for interest.loading must exist",
    );
    assert.equal(
      interestWebMessages.ms["interest.loading"],
      "Memuatkan borang pendaftaran...",
      "Malay translation for interest.loading must exist",
    );
  });
});
