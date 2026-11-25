import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

const MOCK_OFFERINGS = [
  {
    id: "off-u12-2026",
    name: "U12 Youth Development",
    capacity: 20,
    startsOn: "2026-11-28",
    programme: {
      id: "prog-u12",
      name: "Youth Development",
      description: "Structured basketball fundamentals for ages 10–12.",
      level: "DEVELOPMENT",
      minimumAge: 10,
      maximumAge: 12,
      sport: { code: "BASKETBALL", name: "Basketball" },
    },
    venue: { id: "v-sg", name: "Sports Garage, Petaling Jaya" },
    planEligibilities: [
      {
        plan: {
          id: "plan-quarterly",
          name: "Quarterly Plan",
          billingFrequency: "UPFRONT",
          currency: "MYR",
          upfrontAmountMinor: 45000,
          monthlyAmountMinor: null,
          commitmentCycles: 1,
          durationMonths: 3,
          benefitsSummary: "Weekly structured training.",
        },
      },
    ],
  },
];

async function setupPublicMocks(page) {
  await page.addInitScript(() => {
    localStorage.setItem("khlim_analytics_consent", "denied");
  });
  await page.route("**/academy/offerings*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(MOCK_OFFERINGS),
    }),
  );
  await page.route("**/editorial/achievements*", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.route("**/editorial/player-spotlights*", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
}

test.describe("RIC-184 Academy information, V1 availability, localization & QA", () => {
  test("Home -> Academy -> Training Sessions -> Register Interest preserves campaign attribution and locale", async ({
    page,
  }) => {
    await setupPublicMocks(page);

    let capturedLeadPayload = null;
    await page.route("**/academy/leads*", async (route) => {
      capturedLeadPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "lead-mock-1",
          status: "NEW",
          message: "ok",
          createdAt: "2026-11-24T00:00:00Z",
        }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?source=ric184-qa", { waitUntil: "networkidle" });

    // Switch language to Bahasa Melayu and verify persistence across funnel
    await page
      .locator(".public-header-locale select")
      .first()
      .selectOption("ms");
    await expect(page.locator("html")).toHaveAttribute("lang", "ms");

    // Navigate Home -> Academy via header nav
    await page.locator('.desktop-nav a[href*="/academy"]').click();
    await expect(page).toHaveURL(/\/academy\?source=ric184-qa/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ms");

    // Verify Training Sessions & Venue section in BM
    const trainingSection = page.locator("#training-sessions");
    await expect(trainingSection).toBeVisible();
    await expect(trainingSection).toContainText("Sports Garage");
    await expect(trainingSection).toContainText(
      "The Annex 4, Jalan 19/1, Seksyen 19, 46300 Petaling Jaya, Selangor",
    );
    await expect(trainingSection).toContainText("Sengjun");
    await expect(trainingSection).toContainText("2:00–4:00 PM");
    await expect(trainingSection).toContainText("4:00–6:00 PM");
    await expect(trainingSection).toContainText("Sabtu");
    await expect(trainingSection).toContainText("Disahkan");
    await expect(trainingSection).toContainText("Cadangan");

    // Verify Google Maps directions link
    const directionsLink = trainingSection.locator(
      'a[href*="google.com/maps/search"]',
    );
    await expect(directionsLink).toHaveAttribute("target", "_blank");
    await expect(directionsLink).toHaveAttribute("rel", /noopener/);

    // Navigate Training Sessions -> Register Interest
    await trainingSection.locator('a[href*="/interest"]').first().click();
    await expect(page).toHaveURL(/\/interest\?source=ric184-qa/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ms");

    // Submit mocked interest lead
    await page.fill("#guardianName", "Aisyah Rahman");
    await page.fill("#phone", "0123456789");
    await page.fill("#childAge", "11");
    await page.check("#interest-privacy-consent");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("main")).toContainText(
      "Pendaftaran Minat Diterima!",
    );
    expect(capturedLeadPayload).toBeTruthy();
    expect(capturedLeadPayload.source).toBe("ric184-qa");
    // Deferred /enrol CTA must not be shown while V1 enrolment is COMING_SOON
    await expect(page.locator('main a[href*="/enrol"]')).toHaveCount(0);
  });

  test("Homepage removes draft archive-slot placeholders on editorial outage and avoids duplicate stories", async ({
    page,
  }) => {
    await setupPublicMocks(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    // No internal editorial archive-slot instructions or draft cards
    await expect(page.locator("body")).not.toContainText(
      "Reserve this lead story",
    );
    await expect(
      page.locator("#achievements .home-achievement-card"),
    ).toHaveCount(0);
    await expect(
      page.locator("#achievements .home-editorial-notice"),
    ).toBeVisible();

    // Curated verified honours are visible and disjoint from player spotlight milestones
    const teamHeadings = await page
      .locator("#achievements .verified-milestone-card h3")
      .allTextContents();
    const repHeadings = await page
      .locator("#player-spotlight .verified-milestone-card h3")
      .allTextContents();
    expect(teamHeadings.length).toBe(3);
    expect(repHeadings.length).toBe(3);
    for (const h of teamHeadings) {
      expect(repHeadings).not.toContain(h);
    }

    // 4:3 frame standardization check
    const aspectRatio = await page
      .locator("#achievements .verified-milestone-media")
      .first()
      .evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width / rect.height;
      });
    expect(aspectRatio).toBeGreaterThan(1.25);
    expect(aspectRatio).toBeLessThan(1.42);
  });

  test("Complete localization on Spotlight & Academy in EN, BM, and ZH-CN", async ({
    page,
  }) => {
    await setupPublicMocks(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("/spotlight", { waitUntil: "networkidle" });
    await page
      .locator(".public-header-locale select")
      .first()
      .selectOption("zh-Hans");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");

    // Club gallery captions & verified honours localized in Simplified Chinese
    await expect(page.locator("#club-event-gallery")).toContainText(
      "赛前战术围圈",
    );
    await expect(page.locator("#club-event-gallery")).not.toContainText(
      "Pre-Game Strategy Circle",
    );
    await expect(page.locator("#verified-team-honours")).toContainText(
      "女子 KU-16 组",
    );
    await expect(page.locator("#verified-team-honours")).not.toContainText(
      "Champion — Girls KU-16",
    );

    // Academy training sessions localized in Simplified Chinese
    await page.goto("/academy", { waitUntil: "networkidle" });
    await expect(page.locator("#training-sessions")).toContainText("10–12 岁");
    await expect(page.locator("#training-sessions")).toContainText("13–15 岁");
    await expect(page.locator("#training-sessions")).toContainText("星期六");
    await expect(page.locator("#training-sessions")).toContainText("已确认");
  });

  test("V1 feature availability blocks direct navigation to deferred routes, avoids unnecessary API calls, preserves campaign attribution, and hides demo preview", async ({
    page,
  }) => {
    await setupPublicMocks(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    const forbiddenRequests = [];
    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("/academy/offerings") ||
        url.includes("/me/schedule") ||
        url.includes("/me/notifications") ||
        url.includes("/athletes/")
      ) {
        forbiddenRequests.push(url);
      }
    });

    for (const deferredRoute of [
      "/enrol?source=ric184-gate",
      "/enrol/confirmation?source=ric184-gate",
      "/portal?source=ric184-gate",
      "/portal/dashboard?source=ric184-gate",
      "/portal/schedule?source=ric184-gate",
      "/portal/notifications?source=ric184-gate",
      "/portal/players/synthetic-athlete-1?source=ric184-gate",
    ]) {
      await page.goto(deferredRoute, { waitUntil: "networkidle" });
      await expect(page.locator("main")).toContainText("Coming Soon");
      const interestCta = page.locator('main a[href*="/interest"]').first();
      await expect(interestCta).toBeVisible();
      await expect(interestCta).toHaveAttribute(
        "href",
        /\/interest\?source=ric184-gate/,
      );
      await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(
        0,
      );
      await expect(page.locator('aside[aria-label*="Portal" i]')).toHaveCount(
        0,
      );
    }

    expect(
      forbiddenRequests,
      `Deferred routes must not fetch feature-specific APIs while disabled: ${forbiddenRequests.join(", ")}`,
    ).toEqual([]);

    // Verify Coming Soon localizes cleanly in BM and ZH-Hans
    await page.goto("/enrol?source=ric184-gate", { waitUntil: "networkidle" });
    await page
      .locator(".public-header-locale select")
      .first()
      .selectOption("ms");
    await expect(page.locator("main")).toContainText("Akan Datang");
    await page
      .locator(".public-header-locale select")
      .first()
      .selectOption("zh-Hans");
    await expect(page.locator("main")).toContainText("即将开放");
    await page
      .locator(".public-header-locale select")
      .first()
      .selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Unfinished editorial demo preview is hidden (404)
    const demoRes = await page.goto(
      "/spotlight/editorial-preview-player-achievement",
      { waitUntil: "domcontentloaded" },
    );
    expect(demoRes?.status()).toBe(404);

    // Account registration page has locale switcher and Home back link
    await page.goto("/auth/register", { waitUntil: "networkidle" });
    await expect(page.locator(".auth-home-link")).toBeVisible();
    await expect(
      page.locator('select[aria-label*="language" i]'),
    ).toBeVisible();
  });

  test("Responsive layout has zero horizontal overflow across all 7 required viewports", async ({
    page,
  }) => {
    await setupPublicMocks(page);
    const routes = [
      "/",
      "/academy",
      "/programmes",
      "/spotlight",
      "/interest",
      "/enrol",
      "/auth/register",
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `Horizontal overflow on ${route} at ${vp.width}px: ${overflow}px`,
        ).toBeLessThanOrEqual(2);
      }
    }
  });

  test("Account registration has zero horizontal overflow across all 7 viewports in EN, MS, and ZH-Hans", async ({
    page,
  }) => {
    await setupPublicMocks(page);
    await page.goto("/auth/register", { waitUntil: "networkidle" });
    const localeSelect = page.locator("select[aria-label]").first();

    for (const locale of ["en", "ms", "zh-Hans"]) {
      await localeSelect.selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);

      for (const vp of VIEWPORTS) {
        await page.setViewportSize(vp);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `Horizontal overflow on /auth/register (${locale}) at ${vp.width}px: ${overflow}px`,
        ).toBeLessThanOrEqual(2);
      }
    }
  });

  test("Homepage hero and Academy group section withhold youth photography when youth media rights are disabled", async ({
    page,
  }) => {
    const youthMediaEnabled =
      process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED === "1";
    await setupPublicMocks(page);

    const requestedYouthAssets = [];
    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("/media/khlim/team-hero") ||
        url.includes("/media/home/") ||
        url.includes("/media/khlim/training-group-1280.webp") ||
        url.includes("/media/achievements/")
      ) {
        requestedYouthAssets.push(url);
      }
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.goto("/academy", { waitUntil: "networkidle" });

    if (!youthMediaEnabled) {
      expect(
        requestedYouthAssets,
        `No youth photo assets may be requested while fail-closed: ${requestedYouthAssets.join(", ")}`,
      ).toEqual([]);
      await expect(
        page.locator('[data-testid="academy-training-fallback"]'),
      ).toBeVisible();
      await expect(page.locator('img[src*="training-group-1280"]')).toHaveCount(
        0,
      );
    }
  });

  test("Programme detail distinguishes loading, unavailable (with retry), successful empty, not-found, and available states", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("khlim_analytics_consent", "denied");
    });

    // 1. Loading -> Outage (503) -> Retry -> Available
    let failFirst = true;
    let releaseFirstRequest;
    const firstRequestGate = new Promise((resolve) => {
      releaseFirstRequest = resolve;
    });
    await page.route("**/academy/offerings*", async (route) => {
      if (failFirst) {
        await firstRequestGate;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: '{"message":"temporarily unavailable"}',
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(MOCK_OFFERINGS),
      });
    });

    await page.goto("/programmes/off-u12-2026?source=ric184-detail", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator('main[aria-busy="true"]')).toContainText(
      "Loading offering…",
    );
    releaseFirstRequest();

    const alert = page.locator('main p[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(
      "Programme details are temporarily unavailable.",
    );
    await expect(page.getByTestId("offering-detail-empty")).toHaveCount(0);
    await expect(page.getByTestId("offering-detail-not-found")).toHaveCount(0);
    const interestLink = page
      .locator('main a[href*="/interest?source=ric184-detail"]')
      .first();
    await expect(interestLink).toBeVisible();
    await expect(interestLink.locator("button")).toHaveCount(0);

    failFirst = false;
    await page.getByRole("button", { name: "Try Again" }).click();
    await expect(
      page.getByRole("heading", { name: "U12 Youth Development" }),
    ).toBeVisible();
    await expect(alert).toHaveCount(0);

    // 2. Successful empty catalogue ([]) -> distinct empty state
    await page.unroute("**/academy/offerings*");
    await page.route("**/academy/offerings*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: "[]",
      }),
    );
    await page.goto("/programmes/off-u12-2026?source=ric184-detail", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("offering-detail-empty")).toBeVisible();
    await expect(page.locator("main h1")).toContainText(
      "No open programme offerings right now",
    );
    await expect(page.locator('main p[role="alert"]')).toHaveCount(0);

    // 3. Non-empty catalogue without matching ID -> distinct not-found state
    await page.unroute("**/academy/offerings*");
    await page.route("**/academy/offerings*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(MOCK_OFFERINGS),
      }),
    );
    await page.goto("/programmes/non-existent-id?source=ric184-detail", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("offering-detail-not-found")).toBeVisible();
    await expect(page.locator("main h1")).toContainText(
      "Programme offering not found",
    );
    await expect(page.locator('main p[role="alert"]')).toHaveCount(0);
  });
});
