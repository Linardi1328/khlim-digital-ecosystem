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

    // Intercept backend API call to verify browser client contract safely without uncontrolled mutations
    await page.route("**/v1/academy/leads", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        interceptedPayload = JSON.parse(request.postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "offering-3x3-prep",
            title: "3x3 Basketball Intensive",
            slug: "3x3-intensive",
            minAge: 8,
            maxAge: 16,
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

    // 2. Test fail-closed validation: Submitting without consent must be blocked
    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Register"), button:has-text("Submit")',
      )
      .first();
    await expect(submitBtn).toBeVisible();

    // Fill in required fields without checking consent
    const guardianInput = page
      .locator(
        'input[name="guardianName"], input#guardianName, input[placeholder*="Guardian"], input[placeholder*="Parent"]',
      )
      .first();
    if (await guardianInput.isVisible()) {
      await guardianInput.fill("Synthetic Parent Rehearsal");
    }

    const phoneInput = page
      .locator('input[name="phone"], input#phone, input[type="tel"]')
      .first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(APPROVED_STAGING_TEST_PHONE);
    }

    const emailInput = page
      .locator('input[name="email"], input#email, input[type="email"]')
      .first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("staging-rehearsal@synthetic.khlim.test");
    }

    const ageInput = page
      .locator('input[name="childAge"], input#childAge, input[type="number"]')
      .first();
    if (await ageInput.isVisible()) {
      await ageInput.fill("10");
    }

    // Try submit without consent
    await submitBtn.click();

    // Explicitly assert that the client-side consent validation error is visible before checking payload
    const consentError = page.locator(
      '#interest-privacy-consent-error, [role="alert"]:has-text("consent"), [role="alert"]',
    );
    await expect(consentError.first()).toBeVisible();
    expect(interceptedPayload).toBeNull(); // No request sent without consent

    // 3. Check explicit consent
    const consentCheckbox = page
      .locator(
        'input[type="checkbox"]#interest-privacy-consent, input[type="checkbox"]#consent, input[type="checkbox"]',
      )
      .first();
    if (await consentCheckbox.isVisible()) {
      await consentCheckbox.check();
    }

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
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });
});
