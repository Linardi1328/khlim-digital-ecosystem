/**
 * RIC-65 Browser Registration Acceptance & Staging UX Rehearsal
 *
 * NOTE: This spec provides client-side mocked UX rehearsal testing for the
 * browser registration flow and authentication guards. It intercepts HTTP requests
 * within Playwright to test form behavior, fail-closed validation, and client-side
 * redirect semantics without mutating remote staging or production databases.
 *
 * For live, fail-closed verification of hosted API endpoints, Supabase MFA AAL2,
 * and direct database persistence invariants, see:
 * scripts/verify-hosted-staging-acceptance.mjs
 */

import { expect, test } from "@playwright/test";

test.use({ bypassCSP: true });

const APPROVED_STAGING_TEST_PHONE = "+60120000000";
const SYNTHETIC_ORGANIC_PHONE = "+60120000001";
const SYNTHETIC_PHONE_USER_2 = "+60120000002";
const SYNTHETIC_PHONE_USER_3 = "+60120000003";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "*",
};

async function setupLeadApiMocks(page, onLeadPost) {
  await page.route("**/v1/academy/offerings**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify([
        {
          id: "offering-3x3-prep",
          name: "3x3 Basketball Intensive",
          capacity: 20,
          startsOn: null,
          endsOn: null,
          programme: {
            id: "prog-3x3",
            code: "3X3-PREP",
            name: "3x3 Basketball Intensive",
            description: "Intensive 3x3 training",
            minimumAge: 8,
            maximumAge: 16,
            level: "ALL",
            sport: { code: "BASKETBALL", defaultName: "Basketball" },
          },
          venue: null,
          planEligibilities: [],
        },
      ]),
    });
  });

  await page.route("**/v1/academy/leads", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
      return;
    }
    if (request.method() === "POST") {
      const payload = JSON.parse(request.postData() || "{}");
      if (onLeadPost) {
        onLeadPost(payload);
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({
          id: "rehearsal-lead-" + Math.random().toString(36).slice(2, 10),
          status: "RECEIVED",
          message: "Thank you for registering",
          createdAt: new Date().toISOString(),
        }),
      });
      return;
    }
    await route.continue();
  });
}

test.describe("RIC-65 Browser Registration Acceptance & Staging UX Rehearsal", () => {
  test("responsive interest form preserves 3x3-oct24 attribution and validates submission with controlled test phone", async ({
    page,
  }) => {
    let interceptedPayload = null;
    await setupLeadApiMocks(page, (payload) => {
      interceptedPayload = payload;
    });

    // 1. Visit Interest page with campaign attribution
    await page.goto("/interest?source=3x3-oct24", {
      waitUntil: "domcontentloaded",
    });

    // Verify main form container is visible
    const formHeading = page.locator("h1, h2").first();
    await expect(formHeading).toBeVisible();

    const form = page.locator("main form");
    await expect(form).toBeVisible();

    // 2. Test fail-closed validation: Submitting without consent must be blocked
    const submitBtn = form.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();

    // Fill in required fields without checking consent
    const guardianInput = form
      .locator(
        'input#guardianName, input[name="guardianName"], input[autoComplete="name"]',
      )
      .first();
    await expect(guardianInput).toBeVisible();
    await guardianInput.fill("Synthetic Parent Rehearsal");

    const phoneInput = form
      .locator('input#phone, input[name="phone"], input[type="tel"]')
      .first();
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill(APPROVED_STAGING_TEST_PHONE);

    const emailInput = form
      .locator('input#email, input[name="email"], input[type="email"]')
      .first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("staging-rehearsal@synthetic.khlim.test");
    }

    const ageInput = form
      .locator('input#childAge, input[name="childAge"], input[type="number"]')
      .first();
    await expect(ageInput).toBeVisible();
    await ageInput.fill("10");

    // Try submit without consent
    await submitBtn.click();

    // Explicitly assert that the client-side consent validation error is visible before checking payload
    const consentError = form.locator(
      '#interest-privacy-consent-error, [role="alert"]:has-text("consent")',
    );
    await expect(consentError.first()).toBeVisible();
    expect(interceptedPayload).toBeNull(); // No request sent without consent

    // 3. Check explicit consent
    const consentCheckbox = form
      .locator(
        'input[type="checkbox"]#interest-privacy-consent, input[type="checkbox"]#consent, input[type="checkbox"]',
      )
      .first();
    await expect(consentCheckbox).toBeVisible();
    await consentCheckbox.check();

    // 4. Submit form with valid synthetic payload
    await submitBtn.click();

    // Wait for submission to complete
    await expect.poll(() => interceptedPayload !== null).toBe(true);

    // 5. Invariant assertions on browser-submitted payload
    expect(interceptedPayload.source).toBe("3x3-oct24");
    expect(interceptedPayload.phone).toBe(APPROVED_STAGING_TEST_PHONE);
    expect(interceptedPayload.consent).toBe(true);
    expect(interceptedPayload.childAge).toBe(10);
    expect(interceptedPayload.idempotencyKey).toBeTruthy();

    // 6. Confirm UI renders success confirmation
    await expect(page.locator("main h2")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);
  });

  test("untagged /interest registration submits with explicit 'unattributed' campaign source in lead payload", async ({
    page,
  }) => {
    let interceptedPayload = null;
    await setupLeadApiMocks(page, (payload) => {
      interceptedPayload = payload;
    });

    // Visit /interest cleanly with no campaign query parameters
    await page.goto("/interest", {
      waitUntil: "domcontentloaded",
    });

    const form = page.locator("main form");
    await expect(form).toBeVisible();

    const guardianInput = form
      .locator(
        'input#guardianName, input[name="guardianName"], input[autoComplete="name"]',
      )
      .first();
    await guardianInput.fill("Synthetic Organic Guardian");

    const phoneInput = form
      .locator('input#phone, input[name="phone"], input[type="tel"]')
      .first();
    await phoneInput.fill(SYNTHETIC_ORGANIC_PHONE);

    const ageInput = form
      .locator('input#childAge, input[name="childAge"], input[type="number"]')
      .first();
    await ageInput.fill("12");

    const consentCheckbox = form
      .locator(
        'input[type="checkbox"]#interest-privacy-consent, input[type="checkbox"]#consent, input[type="checkbox"]',
      )
      .first();
    await consentCheckbox.check();

    const submitBtn = form.locator('button[type="submit"]');
    await submitBtn.click();

    // Wait for submission to complete
    await expect.poll(() => interceptedPayload !== null).toBe(true);

    // Assert untagged submission resolves to explicit "unattributed" fallback
    expect(interceptedPayload.source).toBe("unattributed");
    expect(interceptedPayload.consent).toBe(true);
    expect(interceptedPayload.idempotencyKey).toBeTruthy();
    expect(interceptedPayload.guardianName).toBe("Synthetic Organic Guardian");

    await expect(page.locator("main h2")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);
  });

  test("phone-like source in query parameter does not enter the lead payload's source field and falls back to 'unattributed'", async ({
    page,
  }) => {
    let interceptedPayload = null;
    await setupLeadApiMocks(page, (payload) => {
      interceptedPayload = payload;
    });

    // 1. Visit /interest with digits-only phone pattern in source query
    await page.goto("/interest?source=01100000001", {
      waitUntil: "domcontentloaded",
    });

    const form = page.locator("main form");
    await expect(form).toBeVisible();

    const guardianInput = form
      .locator(
        'input#guardianName, input[name="guardianName"], input[autoComplete="name"]',
      )
      .first();
    await guardianInput.fill("Synthetic Phone Query Visitor");

    const phoneInput = form
      .locator('input#phone, input[name="phone"], input[type="tel"]')
      .first();
    await phoneInput.fill(SYNTHETIC_PHONE_USER_2);

    const ageInput = form
      .locator('input#childAge, input[name="childAge"], input[type="number"]')
      .first();
    await ageInput.fill("9");

    const consentCheckbox = form
      .locator(
        'input[type="checkbox"]#interest-privacy-consent, input[type="checkbox"]#consent, input[type="checkbox"]',
      )
      .first();
    await consentCheckbox.check();

    const submitBtn = form.locator('button[type="submit"]');
    await submitBtn.click();

    await expect.poll(() => interceptedPayload !== null).toBe(true);

    // The phone number from query param must NEVER be sent as source; fallback to unattributed
    expect(interceptedPayload.source).toBe("unattributed");
    expect(interceptedPayload.source).not.toContain("01100000001");
    expect(interceptedPayload.consent).toBe(true);

    // 2. Also verify underscore-formatted phone number query parameter is rejected
    interceptedPayload = null;
    await page.goto("/interest?source=011_0000_0002", {
      waitUntil: "domcontentloaded",
    });

    const form2 = page.locator("main form");
    await expect(form2).toBeVisible();

    await form2
      .locator('input#guardianName, input[name="guardianName"]')
      .first()
      .fill("Synthetic Underscore Phone Visitor");

    await form2
      .locator('input#phone, input[name="phone"]')
      .first()
      .fill(SYNTHETIC_PHONE_USER_3);

    await form2
      .locator('input#childAge, input[name="childAge"]')
      .first()
      .fill("8");

    await form2
      .locator(
        'input[type="checkbox"]#interest-privacy-consent, input[type="checkbox"]',
      )
      .first()
      .check();

    await form2.locator('button[type="submit"]').click();

    await expect.poll(() => interceptedPayload !== null).toBe(true);
    expect(interceptedPayload.source).toBe("unattributed");
    expect(interceptedPayload.source).not.toContain("011_0000_0002");
    expect(interceptedPayload.source).not.toContain("0000_0002");

    // 3. Verify phone-like source does not enter mobile menu /enrol link
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileMenuBtn = page.locator(".mobile-menu-btn");
    await expect(mobileMenuBtn).toBeVisible();
    await mobileMenuBtn.click();
    const mobileEnrolLink = page
      .getByRole("dialog")
      .locator('a[href*="/enrol"]')
      .first();
    await expect(mobileEnrolLink).toHaveAttribute("href", "/enrol");
  });

  test("changing campaign query parameters client-side updates rendered header and footer links while components remain mounted", async ({
    page,
  }) => {
    await setupLeadApiMocks(page);

    // 1. Visit landing page with initial campaign source
    await page.goto("/?source=3x3-oct24", {
      waitUntil: "domcontentloaded",
    });

    // Assert initial rendered header and footer navigation links carry the initial campaign
    const headerInterestLink = page
      .locator('header a[href*="/interest"]:visible')
      .first();
    const footerProgrammesLink = page
      .locator('footer a[href*="/programmes"]')
      .first();

    await expect(headerInterestLink).toBeVisible();
    await expect(headerInterestLink).toHaveAttribute(
      "href",
      "/interest?source=3x3-oct24",
    );
    await expect(footerProgrammesLink).toHaveAttribute(
      "href",
      "/programmes?source=3x3-oct24",
    );

    // 2. Perform client-side query parameter transition while page components remain mounted
    await page.evaluate(() => {
      window.__noReloadMarker = true;
      window.history.pushState({}, "", "/?source=holiday_clinic_2026");
      window.dispatchEvent(new Event("popstate"));
    });

    // Assert that header and footer reactively updated their rendered hrefs without re-mounting
    await expect(headerInterestLink).toHaveAttribute(
      "href",
      "/interest?source=holiday_clinic_2026",
    );
    await expect(footerProgrammesLink).toHaveAttribute(
      "href",
      "/programmes?source=holiday_clinic_2026",
    );
    expect(await page.evaluate(() => window.__noReloadMarker === true)).toBe(
      true,
    );

    // 3. Navigate through the visible desktop link or the mobile/tablet sheet.
    const menuButton = page.locator(".mobile-menu-btn");
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page
        .getByRole("dialog")
        .locator('a[href*="/academy"]')
        .click();
    } else {
      await page
        .locator('header a[href*="/academy"]:visible')
        .first()
        .click();
    }

    await expect(page).toHaveURL(/\/academy\?source=holiday_clinic_2026/);

    // Header and footer on the new page continue carrying the active campaign
    await expect(
      page.locator('header a[href*="/interest"]:visible').first(),
    ).toHaveAttribute("href", "/interest?source=holiday_clinic_2026");
    await expect(
      page.locator('footer a[href*="/programmes"]').first(),
    ).toHaveAttribute("href", "/programmes?source=holiday_clinic_2026");
    await expect(
      page.locator('footer a[href*="/enrol"]').first(),
    ).toHaveAttribute("href", "/enrol?source=holiday_clinic_2026");

    // 4. Mobile menu enrolment link carries active campaign source in mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileMenuBtn = page.locator(".mobile-menu-btn");
    await expect(mobileMenuBtn).toBeVisible();
    await mobileMenuBtn.click();

    const mobileEnrolLink = page
      .getByRole("dialog")
      .locator('a[href*="/enrol"]')
      .first();
    await expect(mobileEnrolLink).toHaveAttribute(
      "href",
      "/enrol?source=holiday_clinic_2026",
    );

    // 5. Navigate to untagged route client-side and verify stored campaign source is preserved in mobile menu
    await page.evaluate(() => {
      window.history.pushState({}, "", "/programmes");
      window.dispatchEvent(new Event("popstate"));
    });
    if (!(await page.getByRole("dialog").isVisible())) {
      await mobileMenuBtn.click();
    }
    await expect(
      page.getByRole("dialog").locator('a[href*="/enrol"]').first(),
    ).toHaveAttribute("href", "/enrol?source=holiday_clinic_2026");
  });

  test("protected staff portal routes strictly redirect unauthenticated browser sessions to login", async ({
    page,
  }) => {
    // Attempt to access staff / portal routes directly without authenticated session
    await page.goto("/portal/dashboard", {
      waitUntil: "domcontentloaded",
    });

    // Browser must be redirected to login via client-side auth guard
    await expect(page).toHaveURL(/\/auth\/login(\?|$)/, { timeout: 10_000 });
    expect(page.url()).toContain("redirect=%2Fportal%2Fdashboard");
    await expect(
      page.locator(
        'h1:has-text("Dashboard"), [data-testid="portal-dashboard"]',
      ),
    ).not.toBeVisible();
  });
});
