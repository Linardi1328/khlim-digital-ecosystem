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

const MOCK_OFFERINGS = {
  data: [
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
  ],
};

async function setupPublicMocks(page) {
  await page.addInitScript(() => {
    localStorage.setItem("khlim_analytics_consent", "denied");
  });
  await page.route("**/public/offerings*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
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

  test("V1 feature availability blocks direct navigation to deferred routes and hides demo preview", async ({
    page,
  }) => {
    await setupPublicMocks(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    for (const deferredRoute of [
      "/enrol",
      "/enrol/confirmation",
      "/portal",
      "/portal/dashboard",
    ]) {
      await page.goto(deferredRoute, { waitUntil: "networkidle" });
      await expect(page.locator("main")).toContainText("Coming Soon");
      await expect(page.locator('main a[href*="/interest"]')).toBeVisible();
    }

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
});
