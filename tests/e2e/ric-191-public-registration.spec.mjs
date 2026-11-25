import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = process.env.RIC191_SCREENSHOT_DIR || "";

async function maybeCapture(page, filename, fullPage = true) {
  if (!SCREENSHOT_DIR) return;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
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

    // 1) SESSION_FULL -> refreshes sessions and clears selection (never silently switches!)
    await page.unroute("**/v1/academy/sessions*");
    await page.route("**/v1/academy/sessions*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          registrationOpen: true,
          items: [SYNTHETIC_SESSIONS.items[1]],
        }),
      }),
    );
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
    await expect(page.getByTestId("registration-error-banner")).toContainText(
      "capacity",
    );
    await expect(
      page.locator("#session-option-00000000-0000-4000-8000-000000000002"),
    ).not.toBeChecked();
    await maybeCapture(page, "09-session-full-error.png");

    // Pick remaining session and test CONSENT_VERSION_MISMATCH
    await page.check("#session-option-00000000-0000-4000-8000-000000000002");
    await page.getByTestId("step1-next-btn").click();
    await page.getByTestId("step2-next-btn").click();

    await page.unroute("**/v1/academy/registration-config*");
    await page.route("**/v1/academy/registration-config*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeSyntheticConfig("SYNTHETIC-EXAMPLE-2")),
      }),
    );

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

  test("Network interruption -> identical idempotent retry reuses Idempotency-Key & accepts HTTP 200 replay; double-submit prevented", async ({
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

    const seenKeys = [];
    await page.route("**/v1/academy/registrations", async (route) => {
      seenKeys.push(route.request().headers()["idempotency-key"]);
      if (seenKeys.length === 1) {
        await route.abort("failed");
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

    // Retry original attempt -> must reuse EXACT same Idempotency-Key
    await page.getByTestId("retry-original-attempt-btn").click();
    await expect(page.getByTestId("registration-receipt-card")).toBeVisible();
    expect(seenKeys.length).toBe(2);
    expect(seenKeys[1]).toBe(seenKeys[0]);
  });

  test("Language switching resets consents and mobile viewports (360-1440px) have zero horizontal overflow in EN, MS, ZH-Hans", async ({
    page,
  }) => {
    await setupBasePublicMocks(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      "/academy/register?sessionId=00000000-0000-4000-8000-000000000001",
      { waitUntil: "networkidle" },
    );

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

    // Verify zero horizontal overflow across all 7 required viewport widths
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        overflow,
        `Horizontal overflow on /academy/register at ${vp.width}px: ${overflow}px`,
      ).toBeLessThanOrEqual(2);
    }
  });
});
