import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE_URL)) {
  throw new Error(
    `ric-191-deferred-enrolment.spec.mjs requires explicit loopback PLAYWRIGHT_BASE_URL, got "${BASE_URL}".`,
  );
}
test.use({ baseURL: BASE_URL });

const SUPABASE_SESSION_STORAGE_KEY = "khlim_supabase_session";

const SYNTHETIC_ACCOUNT = {
  id: "acc-syn-parent-1",
  email: "parent.syn@example.test",
  displayName: "Synthetic Parent",
  preferredLocale: "en",
  status: "ACTIVE",
  roles: ["GUARDIAN"],
  guardianProfile: {
    id: "guard-syn-1",
    displayName: "Synthetic Parent",
    phone: "+60123456789",
    preferredLocale: "en",
  },
};

const SYNTHETIC_ATHLETE = {
  id: "ath-syn-1",
  displayName: "Synthetic Junior Player",
  dateOfBirth: "2015-05-10",
  gender: "MALE",
};

const SYNTHETIC_OFFERINGS = [
  {
    id: "off-syn-1",
    name: "Synthetic U12 Academy Intake",
    status: "OPEN",
    capacity: 20,
    enrolledCount: 5,
    availablePlaces: 15,
    startsOn: "2026-12-01",
    endsOn: "2027-03-01",
    programme: {
      id: "prog-syn-1",
      code: "ACAD-U12",
      name: "KHLIM Academy U12",
      minimumAge: 10,
      maximumAge: 12,
      level: "DEVELOPMENT",
    },
    venue: {
      id: "venue-syn-1",
      name: "Sports Garage (Synthetic)",
      address: "Petaling Jaya",
    },
    planEligibilities: [
      {
        id: "elig-syn-1",
        plan: {
          id: "plan-syn-upfront",
          name: "Term Upfront Plan (Synthetic)",
          billingFrequency: "UPFRONT",
          durationMonths: 3,
          commitmentCycles: 1,
          recurringAmountMinor: 0,
          upfrontAmountMinor: 60000,
          currency: "MYR",
          sessionAllowance: 12,
          benefitsSummary: "Synthetic test plan",
          active: true,
        },
      },
    ],
  },
];

const PENDING_MEMBERSHIP = {
  id: "mem-syn-pending-1",
  athleteId: SYNTHETIC_ATHLETE.id,
  programmeOfferingId: SYNTHETIC_OFFERINGS[0].id,
  membershipPlanId: SYNTHETIC_OFFERINGS[0].planEligibilities[0].plan.id,
  status: "PENDING",
};

async function setupAuthenticatedEnrolWizard(page, handlers) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  await page.addInitScript(
    ({ storageKey, exp }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: "synthetic-web-parent-token",
          refresh_token: "synthetic-web-refresh-token",
          expires_in: 3600,
          expires_at: exp,
          token_type: "bearer",
          user: { id: "acc-syn-parent-1", email: "parent.syn@example.test" },
        }),
      );
    },
    { storageKey: SUPABASE_SESSION_STORAGE_KEY, exp: expiresAt },
  );

  await page.route(/\/v1\/me$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SYNTHETIC_ACCOUNT),
    }),
  );

  await page.route(/\/v1\/me\/athletes$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "link-syn-1",
          relationshipType: "guardian",
          status: "ACTIVE",
          athlete: SYNTHETIC_ATHLETE,
        },
      ]),
    }),
  );

  await page.route(/\/v1\/academy\/offerings$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SYNTHETIC_OFFERINGS),
    }),
  );

  await page.route(
    new RegExp(`/v1/athletes/${SYNTHETIC_ATHLETE.id}/memberships$`),
    async (route) => {
      if (route.request().method() === "POST") {
        return handlers.onCreateMembership(route);
      }
      return handlers.onListMemberships(route);
    },
  );

  await page.route(
    new RegExp(
      `/v1/athletes/${SYNTHETIC_ATHLETE.id}/memberships/${PENDING_MEMBERSHIP.id}/checkout$`,
    ),
    async (route) => handlers.onPrepareCheckout(route),
  );

  await page.route(
    new RegExp(
      `/v1/athletes/${SYNTHETIC_ATHLETE.id}/memberships/${PENDING_MEMBERSHIP.id}/billing$`,
    ),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          membership: PENDING_MEMBERSHIP,
          invoices: [],
          payments: [],
        }),
      }),
  );
}

async function advanceWizardToStep5AndSubmit(page) {
  await page.goto("/enrol", { waitUntil: "networkidle" });
  await expect(page.getByText("Synthetic Junior Player").first()).toBeVisible();

  // Step 1 (Player) -> Step 2 (Programme)
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Synthetic U12 Academy Intake").first(),
  ).toBeVisible();

  // Step 2 -> Step 3 (Plan)
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Term Upfront Plan (Synthetic)").first(),
  ).toBeVisible();

  // Step 3 -> Step 4 (Terms)
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const checkboxes = page.locator('input[type="checkbox"]');
  const checkboxCount = await checkboxes.count();
  for (let i = 0; i < checkboxCount; i += 1) {
    await checkboxes.nth(i).check();
  }

  // Step 4 -> Step 5 (Payment)
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Submit Step 5 (Create pending membership & prepare checkout)
  const submitBtn = page
    .locator("main button")
    .filter({ hasNotText: /Back/i })
    .last();
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();
}

test.describe("IR-05 Deferred Enrolment & Checkout Browser Verification", () => {
  test("Server 403 FEATURE_NOT_AVAILABLE on createPendingMembership shows ComingSoonPanel with zero recovery lookups and no confirmation navigation", async ({
    page,
  }) => {
    let listCalls = 0;
    let checkoutCalls = 0;

    await setupAuthenticatedEnrolWizard(page, {
      onCreateMembership: (route) =>
        route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 403,
            code: "FEATURE_NOT_AVAILABLE",
            feature: "V1_ENROLMENT",
            message: "This feature is not available yet",
          }),
        }),
      onListMemberships: (route) => {
        listCalls += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([PENDING_MEMBERSHIP]),
        });
      },
      onPrepareCheckout: (route) => {
        checkoutCalls += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ checkoutUrl: "/enrol?unexpected=1" }),
        });
      },
    });

    const createMembershipResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        new RegExp(`/v1/athletes/${SYNTHETIC_ATHLETE.id}/memberships$`).test(
          res.url(),
        ),
    );

    await advanceWizardToStep5AndSubmit(page);

    const createMembershipResponse = await createMembershipResponsePromise;
    expect(createMembershipResponse.status()).toBe(403);
    const createMembershipBody = await createMembershipResponse.json();
    expect(createMembershipBody.code).toBe("FEATURE_NOT_AVAILABLE");

    await expect(page.locator("#coming-soon-heading")).toBeVisible();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    expect(listCalls).toBe(0);
    expect(checkoutCalls).toBe(0);
    expect(page.url()).not.toContain("/enrol/confirmation");
  });

  test("Server 403 FEATURE_NOT_AVAILABLE on prepareCheckout shows ComingSoonPanel with zero recovery lookups and no confirmation navigation", async ({
    page,
  }) => {
    let listCalls = 0;

    await setupAuthenticatedEnrolWizard(page, {
      onCreateMembership: (route) =>
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(PENDING_MEMBERSHIP),
        }),
      onListMemberships: (route) => {
        listCalls += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([PENDING_MEMBERSHIP]),
        });
      },
      onPrepareCheckout: (route) =>
        route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 403,
            code: "FEATURE_NOT_AVAILABLE",
            feature: "V1_ENROLMENT",
            message: "This feature is not available yet",
          }),
        }),
    });

    const prepareCheckoutResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        new RegExp(
          `/v1/athletes/${SYNTHETIC_ATHLETE.id}/memberships/${PENDING_MEMBERSHIP.id}/checkout$`,
        ).test(res.url()),
    );

    await advanceWizardToStep5AndSubmit(page);

    const prepareCheckoutResponse = await prepareCheckoutResponsePromise;
    expect(prepareCheckoutResponse.status()).toBe(403);
    const prepareCheckoutBody = await prepareCheckoutResponse.json();
    expect(prepareCheckoutBody.code).toBe("FEATURE_NOT_AVAILABLE");

    await expect(page.locator("#coming-soon-heading")).toBeVisible();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    expect(listCalls).toBe(0);
    expect(page.url()).not.toContain("/enrol/confirmation");
  });

  test("Ordinary recoverable errors preserve membership recovery lookup and confirmation fallback navigation", async ({
    page,
  }) => {
    // Control: createPendingMembership fails with ordinary 409 -> recovers existing pending membership
    // via GET /memberships -> prepareCheckout fails with ordinary 503 -> navigates to /enrol/confirmation
    let listCalls = 0;
    let checkoutCalls = 0;

    await setupAuthenticatedEnrolWizard(page, {
      onCreateMembership: (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            message: "Existing pending membership",
          }),
        }),
      onListMemberships: (route) => {
        listCalls += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([PENDING_MEMBERSHIP]),
        });
      },
      onPrepareCheckout: (route) => {
        checkoutCalls += 1;
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 503,
            message: "Payment provider temporarily unavailable",
          }),
        });
      },
    });

    await advanceWizardToStep5AndSubmit(page);

    await page.waitForURL(
      new RegExp(
        `/enrol/confirmation\\?athleteId=${SYNTHETIC_ATHLETE.id}&membershipId=${PENDING_MEMBERSHIP.id}`,
      ),
    );
    expect(listCalls).toBe(1);
    expect(checkoutCalls).toBe(1);
  });

  test("Round 2 (7oZ): account switch on /enrol clears previous-account child PII, consents, and foreign athleteId", async ({
    page,
  }) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    let activeUser = "A";

    await page.addInitScript(
      ({ storageKey, exp }) => {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "synthetic-web-parent-token-a",
            refresh_token: "synthetic-web-refresh-token-a",
            expires_in: 3600,
            expires_at: exp,
            token_type: "bearer",
            user: { id: "acc-syn-parent-a", email: "parent.a@example.test" },
          }),
        );
      },
      { storageKey: SUPABASE_SESSION_STORAGE_KEY, exp: expiresAt },
    );

    await page.route(/\/v1\/me$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          activeUser === "A"
            ? {
                ...SYNTHETIC_ACCOUNT,
                id: "acc-syn-parent-a",
                email: "parent.a@example.test",
                displayName: "Parent Account A",
              }
            : {
                ...SYNTHETIC_ACCOUNT,
                id: "acc-syn-parent-b",
                email: "parent.b@example.test",
                displayName: "Parent Account B",
              },
        ),
      }),
    );

    await page.route(/\/v1\/me\/athletes$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          activeUser === "A"
            ? [
                {
                  id: "link-a-1",
                  relationshipType: "guardian",
                  status: "ACTIVE",
                  athlete: {
                    id: "ath-account-a-1",
                    displayName: "Account A Child",
                    dateOfBirth: "2015-05-10",
                  },
                },
              ]
            : [],
        ),
      }),
    );

    await page.route(/\/v1\/academy\/offerings$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_OFFERINGS),
      }),
    );

    await page.goto("/enrol?athleteId=ath-account-a-1", {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("Account A Child").first()).toBeVisible();

    // Fill new child PII + consent in Account A
    await page.locator('input[type="radio"][name="athlete"]').last().check();
    const childNameInput = page.getByRole("textbox").first();
    const childDobInput = page.locator('input[type="date"]').first();
    await childNameInput.fill("Secret Child From Account A");
    await childDobInput.fill("2016-04-12");
    const consentCheckbox = page.locator("#new-minor-data-consent");
    await consentCheckbox.check();
    await expect(consentCheckbox).toBeChecked();

    // Switch to Account B via cross-tab storage event
    activeUser = "B";
    await page.evaluate(
      ({ storageKey, exp }) => {
        const nextSession = JSON.stringify({
          access_token: "synthetic-web-parent-token-b",
          refresh_token: "synthetic-web-refresh-token-b",
          expires_in: 3600,
          expires_at: exp,
          token_type: "bearer",
          user: { id: "acc-syn-parent-b", email: "parent.b@example.test" },
        });
        window.localStorage.setItem(storageKey, nextSession);
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: storageKey,
            newValue: nextSession,
          }),
        );
      },
      { storageKey: SUPABASE_SESSION_STORAGE_KEY, exp: expiresAt },
    );

    // Account A child name, DOB, consent, and foreign athlete must all be wiped!
    await expect(page.locator("body")).not.toContainText("Account A Child");
    await expect(childNameInput).toHaveValue("");
    await expect(childDobInput).toHaveValue("");
    await expect(page.locator("#new-minor-data-consent")).toHaveCount(0);
  });

  test("R2-FINAL-02: delayed /v1/me restoration for Account A resolving after logout cannot restore Account A PII on /enrol", async ({
    page,
  }) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    let meCalls = 0;
    let firstMeStarted;
    const firstMeStartedP = new Promise((r) => {
      firstMeStarted = r;
    });
    let releaseFirstMe;
    const firstMeGate = new Promise((r) => {
      releaseFirstMe = r;
    });

    await page.addInitScript(
      ({ storageKey, exp }) => {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "synthetic-web-parent-token-a",
            refresh_token: "synthetic-web-refresh-token-a",
            expires_in: 3600,
            expires_at: exp,
            token_type: "bearer",
            user: { id: "acc-syn-parent-a", email: "parent.a@example.test" },
          }),
        );
      },
      { storageKey: SUPABASE_SESSION_STORAGE_KEY, exp: expiresAt },
    );

    await page.route(/\/v1\/me$/, async (route) => {
      meCalls += 1;
      if (meCalls === 1) {
        firstMeStarted();
        await firstMeGate;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...SYNTHETIC_ACCOUNT,
          id: "acc-syn-parent-a",
          email: "parent.a@example.test",
          displayName: "Parent Account A",
        }),
      });
    });

    await page.route(/\/v1\/me\/athletes$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "link-a-delayed",
            relationshipType: "guardian",
            status: "ACTIVE",
            athlete: {
              id: "ath-delayed-a",
              displayName: "Delayed Account A Child",
              dateOfBirth: "2015-05-10",
            },
          },
        ]),
      }),
    );

    await page.route(/\/v1\/academy\/offerings$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_OFFERINGS),
      }),
    );

    await page.goto("/enrol", { waitUntil: "domcontentloaded" });
    await firstMeStartedP;

    // Cross-tab logout clears storage while bootstrap /v1/me is still pending
    await page.evaluate((storageKey) => {
      window.localStorage.removeItem(storageKey);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: null,
        }),
      );
    }, SUPABASE_SESSION_STORAGE_KEY);

    // Release delayed /v1/me for Account A -> MUST NOT restore Account A or its child!
    releaseFirstMe();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await expect(page.locator("body")).not.toContainText(
      "Delayed Account A Child",
    );
    await expect(page.locator("body")).not.toContainText("Parent Account A");
  });
});
