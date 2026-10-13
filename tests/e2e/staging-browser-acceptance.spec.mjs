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

const APPROVED_STAGING_TEST_PHONE = "+60120000000";

test.describe("RIC-65 Browser Registration Acceptance & Staging UX Rehearsal", () => {
  test("responsive interest form preserves 3x3-oct24 attribution and validates submission with controlled test phone", async ({
    page,
  }) => {
    let interceptedPayload = null;

    const corsHeaders = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "*",
    };

    // Intercept backend API call to verify browser client contract safely without uncontrolled mutations
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
        interceptedPayload = JSON.parse(request.postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          headers: corsHeaders,
          body: JSON.stringify({
            id: "rehearsal-lead-c2a95d10",
            status: "RECEIVED",
            message: "Thank you for registering",
            createdAt: new Date().toISOString(),
          }),
        });
        return;
      }
      await route.continue();
    });

    // Also mock offerings if queried
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
    await expect(
      page
        .locator(
          ':has-text("Thank you"), :has-text("registered"), :has-text("received"), [data-testid="success"]',
        )
        .first(),
    ).toBeVisible({ timeout: 5000 });
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
