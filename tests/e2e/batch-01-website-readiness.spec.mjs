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

    // Verify all 3 approved KHero illustrations loaded on Homepage
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator(".home-khero-poster").first().scrollIntoViewIfNeeded();
    await expect(page.locator(".home-khero-poster img")).toHaveCount(3);

    // Verify all 4 approved adult coach portraits + academy crest loaded on /academy
    await page.goto("/academy", { waitUntil: "domcontentloaded" });
    await page.locator(".academy-coaches-grid").scrollIntoViewIfNeeded();
    await expect(page.locator(".academy-coaches-grid img")).toHaveCount(4);
    await expect(page.getByTestId("academy-training-fallback")).toBeVisible();
  });

  test("2. Programmes page maintains distinct loading, unavailable, empty, and available states while keeping informational pathway useful", async ({
    page,
  }) => {
    let mode = "slow_fail";
    await page.route("**/academy/offerings", async (route) => {
      if (mode === "slow_fail") {
        await new Promise((r) => setTimeout(r, 350));
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

    await page.goto("/programmes?source=3x3-oct24", {
      waitUntil: "domcontentloaded",
    });

    // Distinct loading state
    await expect(page.getByTestId("programmes-state-loading")).toBeVisible();

    // Distinct unavailable state + useful informational pathway + Register Interest attribution
    await expect(
      page.getByTestId("programmes-state-unavailable"),
    ).toBeVisible();
    await expect(page.locator('main p[role="alert"]')).toContainText(
      "Programme listings are temporarily unavailable.",
    );
    await expect(page.getByTestId("programmes-state-empty")).toHaveCount(0);
    await expect(page.getByTestId("programmes-state-available")).toHaveCount(0);

    const pathway = page.getByTestId("programmes-pathway-overview");
    await expect(pathway).toBeVisible();
    await expect(pathway).toContainText("Informational overview only");
    await expect(pathway).toContainText("U9 — Ages 5–9");
    await expect(pathway).toContainText("U12 — Ages 10–12");
    await expect(pathway).toContainText("U15 — Ages 13–15");

    const outageInterest = page.getByTestId("programmes-outage-interest-cta");
    await expect(outageInterest).toHaveAttribute(
      "href",
      /\/interest\?source=3x3-oct24/,
    );

    // Recover to empty state
    mode = "empty";
    await page.getByRole("button", { name: "Try Again" }).click();
    await expect(page.getByTestId("programmes-state-empty")).toBeVisible();
    await expect(page.getByTestId("programmes-state-unavailable")).toHaveCount(
      0,
    );

    // Recover to available state
    mode = "available";
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("programmes-state-available")).toBeVisible();
    await expect(page.locator(".khlim-offering-card")).toHaveCount(1);
    await expect(page.getByText("U12 Development Cohort")).toBeVisible();
    await expect(pathway).toBeVisible();

    // Verify localization parity across EN, MS, ZH-Hans
    const switcher = visibleLocaleSwitcher(page);
    await switcher.selectOption("ms");
    await expect(pathway).toContainText("Gambaran maklumat sahaja");
    await switcher.selectOption("zh-Hans");
    await expect(pathway).toContainText("仅为参考说明");
    await switcher.selectOption("en");
    await expect(pathway).toContainText("Informational overview only");
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
});
