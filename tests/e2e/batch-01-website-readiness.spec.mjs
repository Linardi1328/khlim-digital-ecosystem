import { expect, test } from "@playwright/test";

const mockOfferings = [
  {
    id: "batch01-offering-u12",
    name: "U12 Development Cohort",
    capacity: 18,
    startsOn: "2027-02-06",
    endsOn: null,
    programme: {
      id: "prog-u12",
      code: "U12-DEV",
      name: "Youth Basketball Development",
      description: "Structured basketball fundamentals and team habits.",
      minimumAge: 10,
      maximumAge: 12,
      level: "DEVELOPMENT",
      sport: { code: "BASKETBALL", defaultName: "Basketball" },
    },
    venue: { name: "Sports Garage, Seksyen 19" },
    planEligibilities: [],
  },
];

function visibleLocaleSwitcher(page) {
  return page
    .locator(
      ".public-header-locale select:visible, .public-mobile-locale select:visible",
    )
    .first();
}

test.describe("Batch 01: Visual assets, Contact upgrade, and Programmes resilience", () => {
  test("1. All approved public visual assets load with zero broken image requests across key pages", async ({
    page,
  }) => {
    const brokenImages = [];
    page.on("response", (response) => {
      const req = response.request();
      if (req.resourceType() === "image" && response.status() >= 400) {
        brokenImages.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.route("**/v1/**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ message: "unavailable" }),
      }),
    );

    const pagesToInspect = [
      "/",
      "/academy",
      "/spotlight",
      "/about",
      "/contact",
      "/programmes",
    ];
    for (const route of pagesToInspect) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const images = page.locator("img");
      const count = await images.count();
      for (let i = 0; i < count; i += 1) {
        const img = images.nth(i);
        await img.scrollIntoViewIfNeeded();
        const src = await img.getAttribute("src");
        await expect
          .poll(
            () => img.evaluate((el) => el.complete && el.naturalWidth > 0),
            {
              message: `Expected image on ${route} to load cleanly: ${src}`,
              timeout: 10_000,
            },
          )
          .toBe(true);
      }

      const hasOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 2,
      );
      expect(hasOverflow, `Horizontal overflow detected on ${route}`).toBe(
        false,
      );
    }

    expect(brokenImages, "No broken image HTTP responses allowed").toEqual([]);

    // Verify all 3 approved KHero illustrations load on Homepage
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator(".home-khero-poster").first().scrollIntoViewIfNeeded();
    await expect(page.locator(".home-khero-poster img")).toHaveCount(3);

    // Verify approved KH Basketball Club crest loads on /spotlight
    await page.goto("/spotlight", { waitUntil: "domcontentloaded" });
    const clubCrest = page.locator(
      '#achievements img[src*="kh-basketball-club"]',
    );
    await clubCrest.scrollIntoViewIfNeeded();
    await expect(clubCrest).toBeVisible();

    // Verify all 4 approved adult coach portraits + academy crest loaded on /academy
    await page.goto("/academy", { waitUntil: "domcontentloaded" });
    await page.locator(".academy-coaches-grid").scrollIntoViewIfNeeded();
    await expect(page.locator(".academy-coaches-grid img")).toHaveCount(4);
    await expect(page.getByTestId("academy-training-fallback")).toBeVisible();
  });

  test("2. Academy consolidates Programmes without standalone nav or U9/U12/U15 duplication and /programmes redirects preserving campaign params", async ({
    page,
  }) => {
    let mode = "slow_fail";
    let releaseSlowFail;
    const slowFailGate = new Promise((resolve) => {
      releaseSlowFail = resolve;
    });
    await page.route("**/academy/offerings", async (route) => {
      if (mode === "slow_fail") {
        await slowFailGate;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ message: "unavailable" }),
        });
        return;
      }
      if (mode === "empty") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: "[]",
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(mockOfferings),
      });
    });

    await page.goto("/programmes?source=3x3-oct24&utm_medium=social", {
      waitUntil: "domcontentloaded",
    });

    // Redirect lands on /academy#programmes preserving campaign query parameters
    await expect(page).toHaveURL(
      /\/academy\?source=3x3-oct24&utm_medium=social#programmes$/,
    );

    // Programmes is removed as a standalone nav item in header (desktop/mobile) and footer
    await expect(
      page.locator(".desktop-nav").getByRole("link", { name: "Programmes" }),
    ).toHaveCount(0);
    await expect(
      page.locator("footer").getByRole("heading", { name: "Programmes" }),
    ).toHaveCount(0);
    await expect(page.locator('footer a[href="/programmes"]')).toHaveCount(0);
    if (await page.locator(".mobile-menu-btn").isVisible()) {
      await page.locator(".mobile-menu-btn").click();
      await expect(
        page.getByRole("dialog").getByRole("link", { name: "Programmes" }),
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
    }

    const catalogue = page.locator("#programmes");

    // Distinct loading state (held deterministically until asserted)
    await expect(
      catalogue.getByTestId("programmes-state-loading"),
    ).toBeVisible();
    releaseSlowFail();

    // Distinct unavailable state + useful Academy pathway (single canonical U9/U12/U15, zero duplication)
    await expect(
      catalogue.getByTestId("programmes-state-unavailable"),
    ).toBeVisible();
    await expect(catalogue.locator('p[role="alert"]')).toContainText(
      "Programme listings are temporarily unavailable.",
    );
    await expect(catalogue.getByTestId("programmes-state-empty")).toHaveCount(
      0,
    );
    await expect(
      catalogue.getByTestId("programmes-state-available"),
    ).toHaveCount(0);

    const pathway = page.getByTestId("academy-pathway-overview");
    await expect(pathway).toBeVisible();
    await expect(pathway).toContainText("Informational overview only");
    await expect(page.getByText("U9 — Ages 5–9")).toHaveCount(1);
    await expect(page.getByText("U12 — Ages 10–12")).toHaveCount(1);
    await expect(page.getByText("U15 — Ages 13–15")).toHaveCount(1);

    const outageInterest = page.getByTestId("programmes-outage-interest-cta");
    await expect(outageInterest).toHaveAttribute(
      "href",
      /\/interest\?source=3x3-oct24/,
    );

    // Recover to empty state
    mode = "empty";
    await catalogue.getByRole("button", { name: "Try Again" }).click();
    await expect(catalogue.getByTestId("programmes-state-empty")).toBeVisible();
    await expect(
      catalogue.getByTestId("programmes-state-unavailable"),
    ).toHaveCount(0);

    // Recover to available state and verify programme detail route stays intact
    mode = "available";
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      catalogue.getByTestId("programmes-state-available"),
    ).toBeVisible();
    await expect(catalogue.locator(".khlim-offering-card")).toHaveCount(1);
    await expect(catalogue.getByText("U12 Development Cohort")).toBeVisible();
    await expect(pathway).toBeVisible();

    // Verify localization parity across EN, MS, ZH-Hans
    const switcher = visibleLocaleSwitcher(page);
    await switcher.selectOption("ms");
    await expect(pathway).toContainText("Gambaran maklumat sahaja");
    await switcher.selectOption("zh-Hans");
    await expect(pathway).toContainText("仅为参考说明");
    await switcher.selectOption("en");
    await expect(pathway).toContainText("Informational overview only");

    // Verify existing programme detail route still works cleanly and links back to /academy#programmes
    await catalogue
      .locator('a[href="/programmes/batch01-offering-u12?source=3x3-oct24"]')
      .click();
    await expect(page).toHaveURL(
      /\/programmes\/batch01-offering-u12\?source=3x3-oct24$/,
    );
    await expect(
      page.getByRole("heading", { name: "U12 Development Cohort" }),
    ).toBeVisible();
    await expect(
      page.locator('main a[href="/academy?source=3x3-oct24#programmes"]'),
    ).toBeVisible();
  });

  test("3. Contact page supports WhatsApp primary, email secondary, categories, privacy gate, safe encoding, and honest fallbacks", async ({
    page,
  }) => {
    await page.goto("/contact?source=3x3-oct24", {
      waitUntil: "domcontentloaded",
    });

    // Business disclosure preserved
    await expect(page.locator("main address")).toContainText(
      "KHLIM Basketball Sdn. Bhd. (1277329-U)",
    );

    const whatsappCard = page.getByTestId("contact-channel-whatsapp");
    const emailCard = page.getByTestId("contact-channel-email");
    await expect(whatsappCard).toBeVisible();
    await expect(emailCard).toBeVisible();

    const hasWhatsApp =
      (await page.getByTestId("contact-whatsapp-direct-link").count()) > 0;
    const hasEmail =
      (await page.getByTestId("contact-email-direct-link").count()) > 0;

    if (!hasWhatsApp) {
      await expect(whatsappCard).toContainText(
        "WhatsApp channel not configured",
      );
    }
    if (!hasEmail) {
      await expect(emailCard).toContainText("Email enquiries unavailable");
    }

    if (hasWhatsApp || hasEmail) {
      // Verify all 6 categories exist in dropdown
      const categorySelect = page.locator("#contact-category");
      await expect(categorySelect).toBeVisible();
      const optionValues = await categorySelect
        .locator("option")
        .evaluateAll((opts) => opts.map((o) => o.value));
      expect(optionValues).toEqual([
        "academy_registration",
        "training_programmes_schedules",
        "membership_fees",
        "tournaments_events",
        "partnerships_sponsorships",
        "general_enquiries",
      ]);

      // Sensitive-info warning & honest non-delivery disclosure visible
      await expect(page.locator("#contact-sensitive-warning")).toContainText(
        "Do not include passwords",
      );
      await expect(page.getByTestId("contact-enquiry-card")).toContainText(
        "does not transmit, store, or confirm delivery",
      );

      // Privacy acknowledgement blocks personalized link generation
      await categorySelect.selectOption("membership_fees");
      await page.locator("#contact-name").fill("Wei Ming & Family");
      await page.locator("#contact-email").fill("weiming@example.test");
      await page
        .locator("#contact-message")
        .fill("Asking about <script>alert(1)</script> U12 & fees? #2026");

      await expect(page.getByTestId("contact-generated-preview")).toHaveCount(
        0,
      );
      if (hasWhatsApp) {
        await expect(
          page.getByTestId("contact-whatsapp-submit"),
        ).toBeDisabled();
      }
      if (hasEmail) {
        await expect(page.getByTestId("contact-email-submit")).toBeDisabled();
      }

      // Keyboard-accessible privacy acknowledgement unlocks preview and encoded URLs
      const privacyCheckbox = page.locator("#contact-privacy-consent");
      await privacyCheckbox.focus();
      await expect(privacyCheckbox).toBeFocused();
      await page.keyboard.press("Space");
      await expect(privacyCheckbox).toBeChecked();

      const preview = page.getByTestId("contact-generated-preview");
      await expect(preview).toBeVisible();
      // Safe plain-text rendering: literal <script> text shown, zero script elements injected
      await expect(
        page.getByTestId("contact-generated-preview-text"),
      ).toContainText("<script>alert(1)</script>");
      await expect(preview.locator("script")).toHaveCount(0);

      if (hasWhatsApp) {
        const waHref = await page
          .getByTestId("contact-whatsapp-link")
          .getAttribute("href");
        expect(waHref).toMatch(/^https:\/\/wa\.me\/[1-9]\d{7,14}\?text=/);
        const decoded = decodeURIComponent(waHref.split("?text=")[1]);
        expect(decoded).toContain("Membership and fees");
        expect(decoded).toContain("Wei Ming & Family");
        expect(decoded).toContain("#2026");
      }

      if (hasEmail) {
        const mailHref = await page
          .getByTestId("contact-email-link")
          .getAttribute("href");
        expect(mailHref).toMatch(
          /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+\?subject=.*&body=/,
        );
        expect(mailHref).not.toContain("U12 & fees");
      }
    } else {
      // Honest fallback when neither channel is configured
      await expect(page.getByTestId("contact-enquiry-card")).toContainText(
        "Direct enquiry channels not configured yet",
      );
      const interestFallback = page
        .getByTestId("contact-enquiry-card")
        .getByRole("link", { name: "Register Academy Interest" });
      await expect(interestFallback).toHaveAttribute(
        "href",
        /\/interest\?source=3x3-oct24/,
      );
    }

    // Localization parity across EN, MS, ZH-Hans
    const switcher = visibleLocaleSwitcher(page);
    await switcher.selectOption("ms");
    await expect(page.locator("main h1")).toContainText("Hubungi Akademi");
    await switcher.selectOption("zh-Hans");
    await expect(page.locator("main h1")).toContainText("联系 KHLIM 篮球学院");
    await switcher.selectOption("en");
    await expect(page.locator("main h1")).toContainText(
      "Contact KHLIM Basketball Academy",
    );

    // Zero horizontal overflow
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 2,
    );
    expect(hasOverflow).toBe(false);
  });

  test("4. Programme level filters expose aria-pressed and update polite live-region announcements when switching between levels with identical counts", async ({
    page,
  }) => {
    const equalCountOfferings = [
      mockOfferings[0],
      {
        id: "batch01-offering-u15-comp",
        name: "U15 Competitive Squad",
        capacity: 15,
        startsOn: "2027-02-13",
        endsOn: null,
        programme: {
          id: "prog-u15",
          code: "U15-COMP",
          name: "Youth Basketball Competitive",
          description: "Structured competitive match preparation.",
          minimumAge: 13,
          maximumAge: 15,
          level: "COMPETITIVE",
          sport: { code: "BASKETBALL", defaultName: "Basketball" },
        },
        venue: { name: "Sports Garage, Seksyen 19" },
        planEligibilities: [],
      },
    ];

    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(equalCountOfferings),
      });
    });

    await page.goto("/academy#programmes", { waitUntil: "domcontentloaded" });

    const catalogue = page.locator("#programmes");
    const statusRegion = catalogue.getByTestId("programmes-live-status");
    await expect(
      catalogue.getByTestId("programmes-state-available"),
    ).toBeVisible();
    await expect(statusRegion).toHaveAttribute("role", "status");
    await expect(statusRegion).toHaveAttribute("aria-live", "polite");

    const allBtn = catalogue.getByRole("button", { name: "All levels" });
    const devBtn = catalogue.getByRole("button", { name: "Development" });
    const compBtn = catalogue.getByRole("button", { name: "Competitive" });

    // Initial state: All levels pressed, 2 offerings announced with level label
    await expect(allBtn).toHaveAttribute("aria-pressed", "true");
    await expect(devBtn).toHaveAttribute("aria-pressed", "false");
    await expect(compBtn).toHaveAttribute("aria-pressed", "false");
    await expect(catalogue.locator(".khlim-offering-card")).toHaveCount(2);
    await expect(statusRegion).toHaveText(
      "Showing 2 open programme offering(s) for All levels.",
    );

    // Filter to Development (count = 1)
    await devBtn.click();
    await expect(allBtn).toHaveAttribute("aria-pressed", "false");
    await expect(devBtn).toHaveAttribute("aria-pressed", "true");
    await expect(compBtn).toHaveAttribute("aria-pressed", "false");
    await expect(catalogue.locator(".khlim-offering-card")).toHaveCount(1);
    await expect(catalogue.getByText("U12 Development Cohort")).toBeVisible();
    const devStatusText = await statusRegion.innerText();
    expect(devStatusText).toBe(
      "Showing 1 open programme offering(s) for Development.",
    );

    // Switch to Competitive (identical count = 1): aria-pressed updates and live status text changes
    await compBtn.click();
    await expect(allBtn).toHaveAttribute("aria-pressed", "false");
    await expect(devBtn).toHaveAttribute("aria-pressed", "false");
    await expect(compBtn).toHaveAttribute("aria-pressed", "true");
    await expect(catalogue.locator(".khlim-offering-card")).toHaveCount(1);
    await expect(catalogue.getByText("U15 Competitive Squad")).toBeVisible();
    const compStatusText = await statusRegion.innerText();
    expect(compStatusText).toBe(
      "Showing 1 open programme offering(s) for Competitive.",
    );
    expect(compStatusText).not.toBe(devStatusText);

    // Verify localized live-region announcement and preserved aria-pressed in MS and ZH-Hans
    const switcher = visibleLocaleSwitcher(page);
    await switcher.selectOption("ms");
    await expect(
      catalogue.getByRole("button", { name: "Kompetitif" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(statusRegion).toHaveText(
      "Memaparkan 1 tawaran program terbuka untuk Kompetitif.",
    );

    await switcher.selectOption("zh-Hans");
    await expect(
      catalogue.getByRole("button", { name: "竞技级" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(statusRegion).toHaveText(
      "正在显示“竞技级”的 1 个开放课程班次。",
    );

    // Return to English and reset to All levels
    await switcher.selectOption("en");
    await allBtn.click();
    await expect(allBtn).toHaveAttribute("aria-pressed", "true");
    await expect(compBtn).toHaveAttribute("aria-pressed", "false");
    await expect(catalogue.locator(".khlim-offering-card")).toHaveCount(2);
    await expect(statusRegion).toHaveText(
      "Showing 2 open programme offering(s) for All levels.",
    );
  });
});
