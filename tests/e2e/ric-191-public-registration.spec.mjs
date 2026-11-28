import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = process.env.RIC191_SCREENSHOT_DIR || "";

async function maybeCapture(page, filename, fullPage = true) {
  if (!SCREENSHOT_DIR) return;
  const projectDir = path.join(SCREENSHOT_DIR, test.info().project.name);
  fs.mkdirSync(projectDir, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: path.join(projectDir, filename),
    fullPage,
  });
}

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

function makeSyntheticConfig(version = "SYNTHETIC-EXAMPLE") {
  const suffix = version === "SYNTHETIC-EXAMPLE-2" ? "v2" : "v1";
  const hashBase =
    version === "SYNTHETIC-EXAMPLE-2"
      ? ["5", "6", "7", "8"]
      : ["1", "2", "3", "4"];
  const mkHash = (digit, localeIdx) => `${digit.repeat(63)}${localeIdx}`;

  return {
    registrationOpen: true,
    closedReasonCode: null,
    consent: {
      policyVersion: version,
      approvedAt: "2026-12-01T03:00:00.000Z",
      locales: ["en", "ms", "zh-Hans"],
      items: [
        {
          type: "GUARDIAN_AUTHORITY",
          required: true,
          defaultChecked: false,
          content: {
            en: {
              ref: `synthetic://academy-registration/guardian-authority/${suffix}`,
              sha256: mkHash(hashBase[0], 1),
            },
            ms: {
              ref: `synthetic://academy-registration/guardian-authority/${suffix}`,
              sha256: mkHash(hashBase[0], 2),
            },
            "zh-Hans": {
              ref: `synthetic://academy-registration/guardian-authority/${suffix}`,
              sha256: mkHash(hashBase[0], 3),
            },
          },
        },
        {
          type: "REGISTRATION_PRIVACY",
          required: true,
          defaultChecked: false,
          content: {
            en: {
              ref: `synthetic://academy-registration/registration-privacy/${suffix}`,
              sha256: mkHash(hashBase[1], 1),
            },
            ms: {
              ref: `synthetic://academy-registration/registration-privacy/${suffix}`,
              sha256: mkHash(hashBase[1], 2),
            },
            "zh-Hans": {
              ref: `synthetic://academy-registration/registration-privacy/${suffix}`,
              sha256: mkHash(hashBase[1], 3),
            },
          },
        },
        {
          type: "MARKETING",
          required: false,
          defaultChecked: false,
          content: {
            en: {
              ref: `synthetic://academy-registration/marketing/${suffix}`,
              sha256: mkHash(hashBase[2], 1),
            },
            ms: {
              ref: `synthetic://academy-registration/marketing/${suffix}`,
              sha256: mkHash(hashBase[2], 2),
            },
            "zh-Hans": {
              ref: `synthetic://academy-registration/marketing/${suffix}`,
              sha256: mkHash(hashBase[2], 3),
            },
          },
        },
        {
          type: "PHOTOGRAPHY",
          required: false,
          defaultChecked: false,
          content: {
            en: {
              ref: `synthetic://academy-registration/photography/${suffix}`,
              sha256: mkHash(hashBase[3], 1),
            },
            ms: {
              ref: `synthetic://academy-registration/photography/${suffix}`,
              sha256: mkHash(hashBase[3], 2),
            },
            "zh-Hans": {
              ref: `synthetic://academy-registration/photography/${suffix}`,
              sha256: mkHash(hashBase[3], 3),
            },
          },
        },
      ],
    },
    options: {
      gender: ["MALE", "FEMALE"],
      jerseySize: ["YS", "YM", "YL", "AS", "AM", "AL", "AXL"],
      guardianRelationship: [
        "MOTHER",
        "FATHER",
        "LEGAL_GUARDIAN",
        "GRANDPARENT",
        "OTHER_RELATIVE",
      ],
      emergencyContactRelationship: [
        "MOTHER",
        "FATHER",
        "LEGAL_GUARDIAN",
        "GRANDPARENT",
        "OTHER_RELATIVE",
        "FRIEND",
        "OTHER",
      ],
    },
    idempotencyKey: {
      header: "Idempotency-Key",
      minLength: 22,
      maxLength: 128,
      pattern: "^[A-Za-z0-9_-]{22,128}$",
    },
  };
}

const SYNTHETIC_SESSIONS = {
  registrationOpen: true,
  items: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Ages 10–12 Saturday (Synthetic Cohort)",
      programmeName: "KHLIM Academy",
      venue: {
        name: "Sports Garage",
        address:
          "The Annex 4, Jalan 19/1, Seksyen 19, 46300 Petaling Jaya, Selangor",
      },
      coachDisplayName: "Coach Sengjun",
      weekday: 6,
      startTime: "14:00",
      endTime: "16:00",
      timezone: "Asia/Kuala_Lumpur",
      firstSessionDate: "2026-12-19",
      recurrence: "WEEKLY",
      minAge: 10,
      maxAge: 12,
      ageReference: { rule: "FIXED_DATE", date: "2026-12-31" },
      registrationOpensAt: null,
      registrationClosesAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Ages 13–15 Saturday (Synthetic Cohort)",
      programmeName: "KHLIM Academy",
      venue: {
        name: "Sports Garage",
        address:
          "The Annex 4, Jalan 19/1, Seksyen 19, 46300 Petaling Jaya, Selangor",
      },
      coachDisplayName: "Coach Sengjun",
      weekday: 6,
      startTime: "16:00",
      endTime: "18:00",
      timezone: "Asia/Kuala_Lumpur",
      firstSessionDate: "2026-12-19",
      recurrence: "WEEKLY",
      minAge: 13,
      maxAge: 15,
      ageReference: { rule: "FIXED_DATE", date: "2026-12-31" },
      registrationOpensAt: null,
      registrationClosesAt: null,
    },
  ],
};

const SYNTHETIC_RECEIPT = {
  id: "00000000-0000-4000-8000-000000000099",
  referenceCode: "KAR-7H3QK9XM",
  status: "RECEIVED",
  reservesPlace: false,
  receivedAt: "2026-12-10T04:21:00.000Z",
  messageCode: "REGISTRATION_RECEIVED_PENDING_REVIEW",
  session: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Ages 10–12 Saturday (Synthetic Cohort)",
  },
};

async function setupBasePublicMocks(
  page,
  { config = makeSyntheticConfig(), sessions = SYNTHETIC_SESSIONS } = {},
) {
  await page.addInitScript(() => {
    localStorage.setItem("khlim_analytics_consent", "denied");
  });
  await page.route("**/v1/academy/registration-config*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(config),
    }),
  );
  await page.route("**/v1/academy/sessions*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sessions),
    }),
  );
  await page.route("**/editorial/**", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
}

async function fillStep1And2(page) {
  await page.fill("#player-full-name", "Synthetic Player One");
  await page.fill("#player-dob", "2015-03-02");
  await page.selectOption("#player-gender", "MALE");
  await page.selectOption("#player-jersey-size", "YM");
  await page.fill("#player-phone", "+60123456789");
  await page.getByTestId("step1-next-btn").click();

  await expect(page.getByTestId("registration-step-2")).toBeVisible();
  await page.fill("#guardian-full-name", "Synthetic Guardian One");
  await page.fill("#guardian-phone", "012-3456789");
  await page.selectOption("#guardian-relationship", "MOTHER");
  await page.fill("#emergency-full-name", "Synthetic Emergency One");
  await page.fill("#emergency-phone", "+60139876543");
  await page.selectOption("#emergency-relationship", "GRANDPARENT");
  await page.getByTestId("step2-next-btn").click();

  await expect(page.getByTestId("registration-step-3")).toBeVisible();
}

test.describe("RIC-191 Public Academy Registration V1", () => {
  test("Full funnel: Home -> Academy -> Published Sessions -> 3-step Form -> Receipt (HTTP 201) preserves campaign source & privacy", async ({
    page,
  }) => {
    await setupBasePublicMocks(page);

    let capturedRequest = null;
    let capturedKey = null;
    await page.route("**/v1/academy/registrations", async (route) => {
      capturedRequest = route.request().postDataJSON();
      capturedKey = route.request().headers()["idempotency-key"];
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_RECEIPT),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?source=3x3-oct24", { waitUntil: "networkidle" });

    // Home -> Academy
    await page.locator('.desktop-nav a[href*="/academy"]').click();
    await expect(page).toHaveURL(/\/academy\?source=3x3-oct24/);

    const sessionsContainer = page.getByTestId(
      "registration-sessions-available",
    );
    await expect(sessionsContainer).toBeVisible();
    await expect(sessionsContainer).toContainText(
      "Ages 10–12 Saturday (Synthetic Cohort)",
    );
    await expect(sessionsContainer).toContainText("2:00 PM – 4:00 PM");
    await expect(sessionsContainer).toContainText("Coach Sengjun");
    await maybeCapture(page, "01-academy-sessions-desktop.png");

    // Capture mobile Academy sessions too
    await page.setViewportSize({ width: 390, height: 844 });
    await maybeCapture(page, "02-academy-sessions-mobile.png");
    await page.setViewportSize({ width: 1280, height: 900 });

    // Click Register Now -> /academy/register with sessionId + source
    await page
      .getByTestId("register-now-00000000-0000-4000-8000-000000000001")
      .click();
    await expect(page).toHaveURL(
      /\/academy\/register\?.*sessionId=00000000-0000-4000-8000-000000000001/,
    );
    await expect(page).toHaveURL(/source=3x3-oct24/);

    // Step 1 preselected session + age guidance
    await expect(page.getByTestId("registration-step-1")).toBeVisible();
    await page.fill("#player-full-name", "Synthetic Player One");
    await page.fill("#player-dob", "2015-03-02");
    await expect(page.getByTestId("age-eligibility-guidance")).toContainText(
      "11",
    );
    await page.selectOption("#player-gender", "MALE");
    await page.selectOption("#player-jersey-size", "YM");
    await page.fill("#player-phone", "+60123456789");
    await maybeCapture(page, "03-registration-step1.png");
    await page.getByTestId("step1-next-btn").click();

    // Step 2
    await expect(page.getByTestId("registration-step-2")).toBeVisible();
    await page.fill("#guardian-full-name", "Synthetic Guardian One");
    await page.fill("#guardian-phone", "012-3456789");
    await page.selectOption("#guardian-relationship", "MOTHER");
    await page.fill("#emergency-full-name", "Synthetic Emergency One");
    await page.fill("#emergency-phone", "+60139876543");
    await page.selectOption("#emergency-relationship", "GRANDPARENT");
    await maybeCapture(page, "04-registration-step2.png");

    // Back navigation preserves in-memory state
    await page.getByTestId("step2-back-btn").click();
    await expect(page.locator("#player-full-name")).toHaveValue(
      "Synthetic Player One",
    );
    await page.getByTestId("step1-next-btn").click();
    await expect(page.locator("#guardian-full-name")).toHaveValue(
      "Synthetic Guardian One",
    );
    await page.getByTestId("step2-next-btn").click();

    // Step 3: all checkboxes start unchecked
    await expect(page.getByTestId("registration-step-3")).toBeVisible();
    await expect(
      page.locator("#consent-checkbox-GUARDIAN_AUTHORITY"),
    ).not.toBeChecked();
    await expect(
      page.locator("#consent-checkbox-REGISTRATION_PRIVACY"),
    ).not.toBeChecked();
    await expect(page.locator("#consent-checkbox-MARKETING")).not.toBeChecked();
    await expect(
      page.locator("#consent-checkbox-PHOTOGRAPHY"),
    ).not.toBeChecked();

    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");
    await maybeCapture(page, "05-registration-step3.png");

    // Verify ZERO PII in localStorage / sessionStorage
    const storageDump = await page.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
    }));
    expect(storageDump.local).not.toContain("Synthetic Player One");
    expect(storageDump.session).not.toContain("Synthetic Player One");
    expect(storageDump.local).not.toContain("012-3456789");
    expect(storageDump.session).not.toContain("012-3456789");

    // Submit -> Receipt
    await page.getByTestId("registration-submit-btn").click();
    await expect(page.getByTestId("registration-receipt-card")).toBeVisible();
    await expect(page.getByTestId("receipt-reference-code")).toHaveText(
      "KAR-7H3QK9XM",
    );
    await expect(page.getByTestId("registration-receipt-card")).toContainText(
      "Registration Received — Pending Academy Review",
    );
    await expect(
      page.getByTestId("registration-receipt-card"),
    ).not.toContainText("Enrolled");
    await expect(
      page.getByTestId("registration-receipt-card"),
    ).not.toContainText("Payment confirmed");
    await maybeCapture(page, "06-registration-received.png");

    // Verify URL contains NO PII
    expect(page.url()).not.toContain("Synthetic");
    expect(page.url()).not.toContain("012-3456789");

    // Verify exact backend contract payload & Idempotency-Key
    expect(capturedKey).toMatch(/^[A-Za-z0-9_-]{22,128}$/);
    expect(capturedRequest).toEqual({
      sessionId: "00000000-0000-4000-8000-000000000001",
      locale: "en",
      consentVersion: "SYNTHETIC-EXAMPLE",
      source: "3x3-oct24",
      player: {
        fullName: "Synthetic Player One",
        dateOfBirth: "2015-03-02",
        gender: "MALE",
        jerseySize: "YM",
        phone: "+60123456789",
      },
      guardian: {
        fullName: "Synthetic Guardian One",
        phone: "012-3456789",
        relationship: "MOTHER",
        authorityConfirmed: true,
      },
      emergencyContact: {
        fullName: "Synthetic Emergency One",
        phone: "+60139876543",
        relationship: "GRANDPARENT",
      },
      consents: {
        registrationPrivacy: true,
        marketing: false,
        photography: false,
      },
    });
    expect("age" in capturedRequest.player).toBe(false);
  });

  test("Closed registration, empty sessions, and temporary outage with retry action", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("khlim_analytics_consent", "denied");
    });

    // 1) Closed registration
    await page.route("**/v1/academy/registration-config*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          registrationOpen: false,
          closedReasonCode: "REGISTRATION_NOT_CONFIGURED",
          consent: null,
          options: {},
          idempotencyKey: {},
        }),
      }),
    );
    await page.route("**/v1/academy/sessions*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ registrationOpen: false, items: [] }),
      }),
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/academy/register", { waitUntil: "networkidle" });
    await expect(page.getByTestId("registration-page-closed")).toBeVisible();
    await expect(
      page
        .getByTestId("registration-page-closed")
        .locator('a[href*="/interest"]'),
    ).toBeVisible();
    await maybeCapture(page, "07-registration-closed.png");

    // 2) No available sessions (registrationOpen: true, items: [])
    await page.unroute("**/v1/academy/registration-config*");
    await page.unroute("**/v1/academy/sessions*");
    await setupBasePublicMocks(page, {
      sessions: { registrationOpen: true, items: [] },
    });
    await page.goto("/academy/register", { waitUntil: "networkidle" });
    await expect(page.getByTestId("registration-page-empty")).toBeVisible();

    // 3) Temporary API outage -> Retry recovers cleanly (never shown as empty)
    await page.unroute("**/v1/academy/sessions*");
    let attempts = 0;
    await page.route("**/v1/academy/sessions*", (route) => {
      attempts += 1;
      if (attempts === 1) {
        return route.fulfill({ status: 503, body: "outage" });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_SESSIONS),
      });
    });

    await page.goto("/academy", { waitUntil: "networkidle" });
    await expect(page.getByTestId("registration-sessions-error")).toBeVisible();
    await expect(page.getByTestId("registration-sessions-empty")).toHaveCount(
      0,
    );
    await page
      .getByTestId("registration-sessions-error")
      .getByRole("button")
      .click();
    await expect(
      page.getByTestId("registration-sessions-available"),
    ).toBeVisible();
  });

  test("Validation errors, SESSION_FULL refresh, CONSENT_VERSION_MISMATCH, PLAYER_AGE_INELIGIBLE, and unresolved wording block", async ({
    page,
  }) => {
    await setupBasePublicMocks(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      "/academy/register?sessionId=00000000-0000-4000-8000-000000000001",
      { waitUntil: "networkidle" },
    );

    // Invalid required fields on Step 1 focus first invalid input
    await page.getByTestId("step1-next-btn").click();
    await expect(page.locator("#player-full-name")).toBeFocused();
    await maybeCapture(page, "08-validation-error-step1.png");

    await fillStep1And2(page);
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");

    // SESSION_FULL: failed list refresh must not permit another submission.
    await page.unroute("**/v1/academy/sessions*");
    let sessionRefreshCalls = 0;
    await page.route("**/v1/academy/sessions*", (route) => {
      sessionRefreshCalls += 1;
      if (sessionRefreshCalls === 1)
        return route.fulfill({ status: 503, body: "outage" });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          registrationOpen: true,
          items: [SYNTHETIC_SESSIONS.items[1]],
        }),
      });
    });
    await page.route("**/v1/academy/registrations", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 409,
          code: "SESSION_FULL",
          message: "Session is full",
        }),
      }),
    );

    await page.getByTestId("registration-submit-btn").click();
    await expect(page.getByTestId("registration-step-1")).toBeVisible();
    const retrySessions = page.getByTestId("registration-session-refresh-btn");
    await expect(retrySessions).toBeEnabled();
    expect(sessionRefreshCalls).toBe(1);
    await expect(
      page.locator("#session-option-00000000-0000-4000-8000-000000000002"),
    ).not.toBeChecked();
    await retrySessions.click();
    await expect(retrySessions).toHaveCount(0);
    expect(sessionRefreshCalls).toBe(2);
    await expect(
      page.locator("#session-option-00000000-0000-4000-8000-000000000001"),
    ).toHaveCount(0);
    await maybeCapture(page, "09-session-full-error.png");

    // Pick remaining session and test CONSENT_VERSION_MISMATCH
    await page.check("#session-option-00000000-0000-4000-8000-000000000002");
    await page.getByTestId("step1-next-btn").click();
    await page.getByTestId("step2-next-btn").click();

    await page.unroute("**/v1/academy/registration-config*");
    let configRefreshCalls = 0;
    await page.route("**/v1/academy/registration-config*", (route) => {
      configRefreshCalls += 1;
      if (configRefreshCalls === 1)
        return route.fulfill({ status: 503, body: "outage" });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSyntheticConfig("SYNTHETIC-EXAMPLE-2")),
      });
    });

    await page.unroute("**/v1/academy/registrations");
    let postCall = 0;
    await page.route("**/v1/academy/registrations", async (route) => {
      postCall += 1;
      if (postCall === 1) {
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "CONSENT_VERSION_MISMATCH",
            message: "stale consent",
            details: { currentConsentVersion: "SYNTHETIC-EXAMPLE-2" },
          }),
        });
      }
      return route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 422,
          code: "PLAYER_AGE_INELIGIBLE",
          message: "ineligible",
          details: { minAge: 13, maxAge: 15 },
        }),
      });
    });

    await page.getByTestId("registration-submit-btn").click();
    // Failed refresh leaves rejected wording unusable; GET-only retry recovers.
    await expect(page.getByTestId("registration-submit-btn")).toBeDisabled();
    const retryConfig = page.getByTestId("registration-config-refresh-btn");
    await expect(retryConfig).toBeEnabled();
    expect(postCall).toBe(1);
    expect(configRefreshCalls).toBe(1);
    await expect(
      page.locator("#consent-checkbox-GUARDIAN_AUTHORITY"),
    ).toHaveCount(0);
    await retryConfig.click();
    await expect(retryConfig).toHaveCount(0);
    expect(postCall).toBe(1);
    expect(configRefreshCalls).toBe(2);
    // Consent updated -> checkboxes reset, non-consent details preserved!
    await expect(page.getByTestId("registration-step-3")).toContainText(
      "SYNTHETIC-EXAMPLE-2",
    );
    await expect(
      page.locator("#consent-checkbox-GUARDIAN_AUTHORITY"),
    ).not.toBeChecked();
    await expect(page.getByTestId("registration-step-3")).toContainText(
      "Synthetic Player One",
    );

    // Re-accept v2 consents -> triggers PLAYER_AGE_INELIGIBLE (422)
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");
    await page.getByTestId("registration-submit-btn").click();
    await expect(page.getByTestId("registration-step-1")).toBeVisible();
    await expect(page.getByTestId("registration-error-banner")).toContainText(
      "13–15",
    );

    // Unapproved/unresolved consent wording blocks submission cleanly
    await page.unroute("**/v1/academy/registration-config*");
    await page.route("**/v1/academy/registration-config*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...makeSyntheticConfig("2026-12-UNAPPROVED"),
          consent: {
            policyVersion: "2026-12-UNAPPROVED",
            approvedAt: "2026-12-01T00:00:00.000Z",
            locales: ["en", "ms", "zh-Hans"],
            items: [
              {
                type: "GUARDIAN_AUTHORITY",
                required: true,
                defaultChecked: false,
                content: {
                  en: { ref: "legal/unapproved/authority", sha256: "abc" },
                },
              },
            ],
          },
        }),
      }),
    );

    await page.goto(
      "/academy/register?sessionId=00000000-0000-4000-8000-000000000002",
      { waitUntil: "networkidle" },
    );
    await fillStep1And2(page);
    await expect(
      page.getByTestId("consent-wording-unavailable-alert"),
    ).toBeVisible();
    await expect(page.getByTestId("registration-submit-btn")).toBeDisabled();
  });

  test("Network interruption preserves exact idempotent retry key and payload, blocks double-submit and edits while pending", async ({
    page,
  }) => {
    await setupBasePublicMocks(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      "/academy/register?sessionId=00000000-0000-4000-8000-000000000001",
      { waitUntil: "networkidle" },
    );
    await fillStep1And2(page);
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");

    let releaseFirstPost;
    const firstPostGate = new Promise((resolve) => {
      releaseFirstPost = resolve;
    });
    let firstPostStarted;
    const firstPostStartedPromise = new Promise((resolve) => {
      firstPostStarted = resolve;
    });

    const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
    const seenKeys = [];
    const seenPayloads = [];
    await page.route("**/v1/academy/registrations", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      const payload = route.request().postDataJSON();
      seenKeys.push(key);
      seenPayloads.push(payload);
      if (seenKeys.length === 1) {
        firstPostStarted();
        await firstPostGate;
        await route.abort("failed");
        return;
      }
      // Return HTTP 200 idempotent replay ONLY when both a valid non-empty key and payload match the original request
      const keysMatch =
        typeof key === "string" &&
        IDEMPOTENCY_KEY_PATTERN.test(key) &&
        key === seenKeys[0];
      const payloadsMatch =
        JSON.stringify(payload) === JSON.stringify(seenPayloads[0]);
      if (!keysMatch || !payloadsMatch) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "IDEMPOTENCY_KEY_CONFLICT",
            message: "Key or payload mismatch on retry",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_RECEIPT),
      });
    });

    await page.getByTestId("registration-submit-btn").click();
    await firstPostStartedPromise;

    // While first POST is pending: submit, edit buttons, and consent controls are disabled; second submit sends 0 extra POSTs
    await expect(page.getByTestId("registration-submit-btn")).toBeDisabled();
    await expect(
      page.locator("#consent-checkbox-GUARDIAN_AUTHORITY"),
    ).toBeDisabled();
    await expect(
      page
        .getByTestId("registration-step-3")
        .getByRole("button", {
          name: "Edit",
        })
        .first(),
    ).toBeDisabled();
    await page.getByTestId("registration-step-3").dispatchEvent("submit");
    expect(seenKeys.length).toBe(1);
    expect(seenKeys[0]).toMatch(IDEMPOTENCY_KEY_PATTERN);

    // Abort held request -> ambiguous retry panel appears
    releaseFirstPost();
    await expect(page.getByTestId("ambiguous-retry-panel")).toBeVisible();
    expect(seenKeys.length).toBe(1);

    // Retry original attempt -> must reuse EXACT same non-empty Idempotency-Key and payload
    await page.getByTestId("retry-original-attempt-btn").click();
    await expect(page.getByTestId("registration-receipt-card")).toBeVisible();
    expect(seenKeys.length).toBe(2);
    expect(seenKeys[0]).toMatch(IDEMPOTENCY_KEY_PATTERN);
    expect(seenKeys[1]).toBe(seenKeys[0]);
    expect(seenPayloads[1]).toEqual(seenPayloads[0]);
  });

  test("Malformed success receipt preserves exact idempotent retry key and payload", async ({
    page,
  }) => {
    await setupBasePublicMocks(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      "/academy/register?sessionId=00000000-0000-4000-8000-000000000001",
      { waitUntil: "networkidle" },
    );
    await fillStep1And2(page);
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");

    const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
    const seenKeys = [];
    const seenPayloads = [];
    await page.route("**/v1/academy/registrations", async (route) => {
      const key = route.request().headers()["idempotency-key"];
      const payload = route.request().postDataJSON();
      seenKeys.push(key);
      seenPayloads.push(payload);
      if (seenKeys.length === 1) {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
        return;
      }
      const keysMatch =
        typeof key === "string" &&
        IDEMPOTENCY_KEY_PATTERN.test(key) &&
        key === seenKeys[0];
      const payloadsMatch =
        JSON.stringify(payload) === JSON.stringify(seenPayloads[0]);
      if (!keysMatch || !payloadsMatch) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "IDEMPOTENCY_KEY_CONFLICT",
            message: "Key or payload mismatch on retry",
          }),
        });
        return;
      }
      // Second call succeeds with HTTP 200 idempotent replay!
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_RECEIPT),
      });
    });

    await page.getByTestId("registration-submit-btn").click();
    await expect(page.getByTestId("ambiguous-retry-panel")).toBeVisible();
    expect(seenKeys.length).toBe(1);
    expect(seenKeys[0]).toMatch(IDEMPOTENCY_KEY_PATTERN);

    // Retry original attempt -> must reuse EXACT same non-empty Idempotency-Key
    await page.getByTestId("retry-original-attempt-btn").click();
    await expect(page.getByTestId("registration-receipt-card")).toBeVisible();
    expect(seenKeys.length).toBe(2);
    expect(seenKeys[1]).toBe(seenKeys[0]);
    expect(seenPayloads[1]).toEqual(seenPayloads[0]);
  });

  test("Language switching resets consents, hides competing header CTA, and all 7 viewports (360-1440px) have zero overflow including Receipt in EN, MS, ZH-Hans", async ({
    page,
  }) => {
    await setupBasePublicMocks(page);
    await page.route("**/v1/academy/registrations", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_RECEIPT),
      }),
    );

    // First verify open /academy prioritizes Register Now and removes obsolete pending-booking contradictions
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/academy?source=ric191-open-qa", {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("academy-hero-register-now")).toBeVisible();
    await expect(
      page.getByTestId("academy-hero-register-interest-secondary"),
    ).toBeVisible();
    await expect(page.getByTestId("academy-final-register-now")).toBeVisible();
    await expect(
      page.getByTestId("academy-open-secondary-interest"),
    ).toBeVisible();
    await expect(page.locator("#training-sessions")).not.toContainText(
      "Pending confirmation",
    );
    await expect(page.locator("#training-sessions")).not.toContainText(
      "Online registration is not open yet",
    );
    await expect(page.getByTestId("academy-next-steps")).toContainText(
      "Submit your online registration",
    );
    await maybeCapture(page, "after-academy-open-mobile-390.png");

    // Check /academy zero overflow across 360 and 390px
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        overflow,
        `Horizontal overflow on open /academy at ${vp.width}px: ${overflow}px`,
      ).toBeLessThanOrEqual(2);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      "/academy/register?sessionId=00000000-0000-4000-8000-000000000001&source=ric191-open-qa",
      { waitUntil: "networkidle" },
    );

    // No competing primary Register Interest CTA in header quick-actions during active registration
    await expect(
      page.locator(".public-header-mobile-quick-actions"),
    ).toHaveCount(0);
    await expect(
      page.locator('header .public-header-auth-actions a[href*="/interest"]'),
    ).toHaveCount(0);

    // Switch to Bahasa Melayu
    await page
      .locator(".public-header-locale select")
      .first()
      .selectOption("ms");
    await expect(page.locator("html")).toHaveAttribute("lang", "ms");
    await expect(page.locator("h1")).toContainText("Daftar ke Akademi KHLIM");
    await maybeCapture(page, "13-registration-mobile-ms.png");

    await fillStep1And2(page);
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await expect(
      page.locator("#consent-checkbox-GUARDIAN_AUTHORITY"),
    ).toBeChecked();

    // Switch to Simplified Chinese while on Step 3 -> consent MUST reset!
    await page
      .locator(".public-header-locale select")
      .first()
      .selectOption("zh-Hans");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
    await expect(
      page.locator("#consent-checkbox-GUARDIAN_AUTHORITY"),
    ).not.toBeChecked();
    await expect(page.getByTestId("registration-step-3")).toContainText(
      "本地测试文本",
    );
    await maybeCapture(page, "14-registration-mobile-zh.png");

    // Verify zero horizontal overflow on Step 3 across all 7 required viewport widths
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        overflow,
        `Horizontal overflow on /academy/register Step 3 at ${vp.width}px: ${overflow}px`,
      ).toBeLessThanOrEqual(2);
    }

    // Submit and verify zero horizontal overflow on the Receipt screen across all 7 viewports in EN, MS, and ZH-Hans!
    await page.setViewportSize({ width: 390, height: 844 });
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");
    await page.getByTestId("registration-submit-btn").click();
    await expect(page.getByTestId("registration-receipt-card")).toBeVisible();
    await expect(page.getByTestId("receipt-reference-code")).toHaveText(
      "KAR-7H3QK9XM",
    );

    for (const loc of ["en", "ms", "zh-Hans"]) {
      await page
        .locator(".public-header-locale select")
        .first()
        .selectOption(loc);
      await expect(page.locator("html")).toHaveAttribute("lang", loc);
      await expect(page.getByTestId("registration-receipt-card")).toBeVisible();
      await expect(page.getByTestId("receipt-reference-code")).toHaveText(
        "KAR-7H3QK9XM",
      );
      for (const vp of VIEWPORTS) {
        await page.setViewportSize(vp);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `Horizontal overflow on Receipt (${loc}) at ${vp.width}px: ${overflow}px`,
        ).toBeLessThanOrEqual(2);
      }
    }

    // Clipboard fallback: when navigator.clipboard is unavailable, never claim copied and direct user to manual copy
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined,
      });
    });
    await page.getByTestId("copy-reference-code-btn").click();
    await expect(
      page.getByTestId("copy-reference-manual-notice"),
    ).toBeVisible();
    await expect(page.getByTestId("copy-reference-code-btn")).not.toContainText(
      /copied|disalin|已复制/i,
    );
  });

  test("Consent gate blocks ambiguous retry when switched to locale with unapproved wording", async ({
    page,
  }) => {
    const partialMsConfig = makeSyntheticConfig("SYNTHETIC-EXAMPLE");
    partialMsConfig.consent.items[0].content.ms = {
      ref: "unapproved/ms/guardian-authority",
      sha256: "f".repeat(64),
    };
    await page.route("**/v1/academy/registration-config*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(partialMsConfig),
      }),
    );
    await page.route("**/v1/academy/sessions*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_SESSIONS),
      }),
    );

    let postCount = 0;
    await page.route("**/v1/academy/registrations", async (route) => {
      postCount += 1;
      await route.abort("failed");
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      "/academy/register?sessionId=00000000-0000-4000-8000-000000000001",
      { waitUntil: "networkidle" },
    );
    await fillStep1And2(page);
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");

    await page.getByTestId("registration-submit-btn").click();
    await expect(page.getByTestId("ambiguous-retry-panel")).toBeVisible();
    await expect(page.getByTestId("retry-original-attempt-btn")).toBeEnabled();
    expect(postCount).toBe(1);

    // Switch to MS where wording is unresolved -> both Submit and Retry original must be disabled
    await page
      .locator(".public-header-locale select")
      .first()
      .selectOption("ms");
    await expect(page.locator("html")).toHaveAttribute("lang", "ms");
    await expect(page.getByTestId("registration-submit-btn")).toBeDisabled();
    await expect(page.getByTestId("retry-original-attempt-btn")).toBeDisabled();
    expect(postCount).toBe(1);
  });

  test("Round 2 (7oc/7oe): query session fallback when selected session disappears and overlapping recovery vs full loads clear loading cleanly", async ({
    page,
  }) => {
    const SESSION_A = "00000000-0000-4000-8000-000000000001";
    const SESSION_B = "00000000-0000-4000-8000-000000000002";
    const SESSION_C = "00000000-0000-4000-8000-000000000003";
    const secondSession = {
      ...SYNTHETIC_SESSIONS.items[0],
      id: SESSION_B,
      name: "Sunday Ages 10–12 Cohort",
    };
    const thirdSession = {
      ...SYNTHETIC_SESSIONS.items[0],
      id: SESSION_C,
      name: "Wednesday Newer Full-Load Cohort",
    };

    let sessionFetchCount = 0;
    let holdRecovery3 = false;
    let recovery3Started = () => {};
    let releaseRecovery3 = () => {};
    let recovery3Settled = Promise.resolve();

    const trackReqDone = (req) =>
      new Promise((resolve) => {
        const done = (candidate) => {
          if (candidate !== req) return;
          page.off("requestfinished", done);
          page.off("requestfailed", done);
          resolve();
        };
        page.on("requestfinished", done);
        page.on("requestfailed", done);
      });

    await page.route("**/v1/academy/registration-config*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSyntheticConfig("SYNTHETIC-EXAMPLE")),
      }),
    );

    await page.route("**/v1/academy/sessions*", async (route) => {
      sessionFetchCount += 1;
      if (sessionFetchCount === 1) {
        // Initial load: both A (querySessionId) and B available
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            registrationOpen: true,
            closedReason: null,
            items: [SYNTHETIC_SESSIONS.items[0], secondSession],
          }),
        });
        return;
      }
      if (sessionFetchCount === 2) {
        // Recovery load after B returns 409 SESSION_NOT_AVAILABLE: drops B, keeps query session A
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            registrationOpen: true,
            closedReason: null,
            items: [SYNTHETIC_SESSIONS.items[0]],
          }),
        });
        return;
      }
      if (sessionFetchCount === 3 && holdRecovery3) {
        // Overlapping stale recovery load: held open until full load (#4) finishes, then returns stale B
        holdRecovery3 = false;
        recovery3Settled = trackReqDone(route.request());
        const gate = new Promise((r) => {
          releaseRecovery3 = r;
        });
        recovery3Started();
        await gate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            registrationOpen: true,
            closedReason: null,
            items: [secondSession],
          }),
        });
        return;
      }
      // Newer full load (#4): returns authoritative C
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          registrationOpen: true,
          closedReason: null,
          items: [thirdSession],
        }),
      });
    });

    await page.route("**/v1/academy/registrations", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 409,
          code: "SESSION_NOT_AVAILABLE",
          message: "Selected session is no longer available",
        }),
      }),
    );

    // 1) 7oc: Navigate with ?sessionId=A, select B, keep B selected, submit -> 409 triggers refresh dropping B -> A auto-selected without clicking A!
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/academy/register?sessionId=${SESSION_A}`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator(`#session-option-${SESSION_A}`)).toBeChecked();
    await page.locator(`#session-option-${SESSION_B}`).check();
    await expect(page.locator(`#session-option-${SESSION_B}`)).toBeChecked();

    await fillStep1And2(page);
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");
    await page.getByTestId("registration-submit-btn").click();

    await expect.poll(() => sessionFetchCount).toBe(2);
    await expect(page.locator(`#session-option-${SESSION_B}`)).toHaveCount(0);
    await expect(page.locator(`#session-option-${SESSION_A}`)).toBeChecked();

    // 2) 7oe: Overlap a pending recovery refresh (#3) with a newer full load (#4) -> loading clears & newer C stays visible when stale #3 settles!
    holdRecovery3 = true;
    const recovery3StartedP = new Promise((r) => {
      recovery3Started = r;
    });
    await page.getByTestId("step1-next-btn").click();
    await page.getByTestId("step2-next-btn").click();
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");
    await page.getByTestId("registration-submit-btn").click();
    await recovery3StartedP;

    // Trigger full load (loadConfigAndSessions) while recovery #3 is still in flight
    await page.evaluate((nextSessionId) => {
      window.history.replaceState(
        null,
        "",
        `/academy/register?sessionId=${nextSessionId}`,
      );
    }, SESSION_C);

    await expect.poll(() => sessionFetchCount).toBe(4);
    await expect(page.locator(`#session-option-${SESSION_C}`)).toBeVisible();
    await expect(page.locator(`#session-option-${SESSION_C}`)).toBeChecked();

    // Release stale recovery #3 (returning stale B) -> must NOT clobber newer C or strand loading!
    releaseRecovery3();
    await recovery3Settled;
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await expect(page.locator(`#session-option-${SESSION_C}`)).toBeVisible();
    await expect(page.locator(`#session-option-${SESSION_B}`)).toHaveCount(0);
  });

  test("Round 2 (7oi): overlapping clipboard writes keep latest feedback", async ({
    page,
  }) => {
    const SESSION_A = "00000000-0000-4000-8000-000000000001";
    await setupBasePublicMocks(page);
    await page.route("**/v1/academy/registrations", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_RECEIPT),
      }),
    );

    // Override clipboard so first write is deferred & fails while second write succeeds immediately (7oi)
    await page.addInitScript(() => {
      window.__clipboardResolvers = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () =>
            new Promise((resolve, reject) => {
              window.__clipboardResolvers.push({ resolve, reject });
            }),
        },
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/academy/register?sessionId=${SESSION_A}`, {
      waitUntil: "networkidle",
    });
    await fillStep1And2(page);
    await page.check("#consent-checkbox-GUARDIAN_AUTHORITY");
    await page.check("#consent-checkbox-REGISTRATION_PRIVACY");
    await page.getByTestId("registration-submit-btn").click();
    await expect(page.getByTestId("registration-receipt-card")).toBeVisible();

    const copyBtn = page.getByTestId("copy-reference-code-btn");
    // Click 1 (deferred -> will reject later)
    await copyBtn.click();
    // Click 2 (succeeds immediately -> sets copied)
    await copyBtn.click();
    await page.evaluate(() => {
      // Resolve newer Click 2 first, then reject older Click 1
      window.__clipboardResolvers[1].resolve();
    });
    await expect(copyBtn).toContainText(/copied|disalin|已复制/i);
    await page.evaluate(() => {
      window.__clipboardResolvers[0].reject(new Error("Stale clipboard fail"));
    });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    // Stale failure from Click 1 MUST NOT overwrite Click 2's "copied" feedback with manual notice!
    await expect(copyBtn).toContainText(/copied|disalin|已复制/i);
    await expect(page.getByTestId("copy-reference-manual-notice")).toHaveCount(
      0,
    );
  });
});
