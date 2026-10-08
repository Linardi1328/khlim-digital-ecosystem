import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/academy",
  "/programmes",
  "/interest",
  "/about",
  "/contact",
  "/spotlight",
  "/spotlight/editorial-preview-player-achievement",
  "/terms",
  "/privacy",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

const protectedRoutes = [
  "/portal/dashboard",
  "/portal/players",
  "/portal/membership",
  "/portal/payments",
  "/portal/schedule",
  "/portal/notifications",
  "/portal/account",
];

async function expectHealthyDocument(page, path) {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `Expected a document response for ${path}`).not.toBeNull();
  expect(response.status(), `Unexpected server error for ${path}`).toBeLessThan(
    500,
  );

  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("body")).not.toContainText("Internal Server Error");

  await page.waitForTimeout(300);

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 2;
  });
  expect(overflow, `Horizontal overflow detected on ${path}`).toBe(false);
  expect(pageErrors, `Uncaught browser errors on ${path}`).toEqual([]);
}

async function openMobileMenu(page) {
  await page.locator(".mobile-menu-btn").click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

function visibleLocaleSwitcher(page) {
  return page.locator(".public-header-locale select:visible");
}

for (const path of publicRoutes) {
  test(`public route ${path} renders without a fatal browser error`, async ({
    page,
  }) => {
    await expectHealthyDocument(page, path);
  });
}

test("homepage keeps academy actions primary without inactive carousel controls", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.locator(".home-hero-carousel");
  await expect(hero).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Developing players. Building futures.",
    }),
  ).toBeVisible();
  await expect(hero.locator('a[href="/interest"]')).toBeVisible();
  await expect(hero.locator('a[href="/programmes"]')).toBeVisible();
  await expect(hero.locator(".home-carousel-arrow")).toHaveCount(0);
  await expect(hero.locator(".home-carousel-dots")).toHaveCount(0);
});

test("homepage exposes achievements and a publication-safe Player Spotlight preview", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Achievements that shaped KHLIM." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "When KHLIM players make the news." }),
  ).toBeVisible();
  await expect(
    page.getByText("AI-assisted example, not a real player claim."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Preview article format →" }).click();
  await expect(page).toHaveURL(
    /\/spotlight\/editorial-preview-player-achievement$/,
  );
  await expect(
    page.getByText("Editorial preview — not a real player result."),
  ).toBeVisible();
  await expect(
    page.getByText("Facts first. Storytelling second."),
  ).toBeVisible();
});

test("language choice persists after reload and restores document language", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await visibleLocaleSwitcher(page).selectOption("ms");

  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang))
    .toBe("ms");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("khlim_locale")))
    .toBe("ms");
  await expect(
    page.getByRole("heading", {
      name: "Membangunkan pemain. Membina masa depan.",
    }),
  ).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(visibleLocaleSwitcher(page)).toHaveValue("ms");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang))
    .toBe("ms");
  await expect(
    page.getByRole("heading", {
      name: "Membangunkan pemain. Membina masa depan.",
    }),
  ).toBeVisible();
});

test("academy product copy renders in every supported locale", async ({
  page,
}) => {
  const expected = [
    ["en", "The KHLIM development approach"],
    ["ms", "Pendekatan pembangunan KHLIM"],
    ["zh-Hans", "KHLIM 球员发展方法"],
    ["zh-Hant", "KHLIM 球員發展方法"],
    ["hi", "KHLIM का खिलाड़ी विकास दृष्टिकोण"],
  ];

  await page.goto("/academy", { waitUntil: "domcontentloaded" });

  for (const [locale, title] of expected) {
    await visibleLocaleSwitcher(page).selectOption(locale);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang))
      .toBe(locale);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /academy\.|portal\.|legal\./,
    );
  }
});

test("desktop header navigation reaches core public pages", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width < 1024, "Desktop navigation only");

  await page.goto("/", { waitUntil: "domcontentloaded" });

  for (const [label, path] of [
    ["Academy", "/academy"],
    ["Programmes", "/programmes"],
    ["About", "/about"],
    ["Contact", "/contact"],
  ]) {
    await page
      .locator(".desktop-nav")
      .getByRole("link", { name: label })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await page.goto("/", { waitUntil: "domcontentloaded" });
  }
});

test("mobile menu opens and navigates", async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 500, "Mobile navigation only");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await openMobileMenu(page);
  await page.getByRole("link", { name: "Academy", exact: true }).click();
  await expect(page).toHaveURL(/\/academy$/);
});

test("login page exposes branded authentication controls", async ({ page }) => {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

  const logo = page.locator(".auth-brand-logo");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", "/khs-academy-logo.webp");
  await expect
    .poll(() =>
      logo.evaluate(
        (element) =>
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(page.getByText("KHLIM", { exact: true })).toBeVisible();
  await expect(page.getByText("Digital Sports Ecosystem")).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("link", { name: /forgot/i })).toHaveAttribute(
    "href",
    "/auth/forgot-password",
  );
  await expect(
    page.getByRole("button").filter({ hasText: /sign|log/i }),
  ).toBeVisible();
});

for (const path of protectedRoutes) {
  test(`unauthenticated ${path} redirects to login`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login\?redirect=/);
    expect(
      decodeURIComponent(new URL(page.url()).searchParams.get("redirect")),
    ).toBe(path);
  });
}

test("unauthenticated enrolment redirects to login when continuing", async ({
  page,
}) => {
  await page.goto("/enrol", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fenrol/);
});

test("unknown route returns a real not-found response rather than a server crash", async ({
  page,
}) => {
  const response = await page.goto("/__khlim_qa_missing_route__", {
    waitUntil: "domcontentloaded",
  });
  expect(response).not.toBeNull();
  expect(response.status()).toBe(404);
});

test("interest registration form supports campaign attribution and responsive layout", async ({
  page,
}) => {
  await page.goto("/interest?source=3x3-oct24", {
    waitUntil: "domcontentloaded",
  });

  // Verify form inputs and actions
  await expect(page.locator('input[autoComplete="name"]')).toBeVisible();
  await expect(page.locator('input[type="tel"]')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="number"]')).toBeVisible();
  await expect(page.locator("#interest-privacy-consent")).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();

  // Test responsive viewports for horizontal overflow
  for (const width of [390, 412, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 2;
    });
    expect(overflow, `Horizontal overflow detected at ${width}px`).toBe(false);
  }
});

test("public journey retains 3x3-oct24 attribution through rendered Home -> Academy -> Programmes -> Interest navigation", async ({
  page,
}) => {
  await page.goto("/?source=3x3-oct24", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".public-header-logo")).toBeVisible();

  // 1. Navigate to Academy via rendered header navigation
  let academyLink;
  if (await page.locator(".mobile-menu-btn").isVisible()) {
    await openMobileMenu(page);
    academyLink = page
      .getByRole("dialog")
      .locator('a[href*="/academy"]:visible')
      .first();
  } else {
    academyLink = page.locator('header a[href*="/academy"]:visible').first();
  }
  await expect(academyLink).toBeVisible();
  await academyLink.click();
  await expect(page).toHaveURL(/\/academy/);
  expect(new URL(page.url()).searchParams.get("source")).toBe("3x3-oct24");

  // 2. On Academy, navigate to Programmes via rendered CTA
  const programmesLink = page
    .locator('main a[href*="/programmes"]:visible')
    .first();
  await expect(programmesLink).toBeVisible();
  await programmesLink.click();
  await expect(page).toHaveURL(/\/programmes/);
  expect(new URL(page.url()).searchParams.get("source")).toBe("3x3-oct24");

  // 3. On Programmes, click Register Interest via rendered offering CTA
  const interestLink = page
    .locator('main a[href*="/interest"]:visible')
    .first();
  await expect(interestLink).toBeVisible();
  await interestLink.click();

  // 4. Final Interest URL must contain exactly source=3x3-oct24
  await expect(page).toHaveURL(/\/interest/);
  const finalUrl = new URL(page.url());
  expect(finalUrl.searchParams.get("source")).toBe("3x3-oct24");
});

test("about page preserves 3x3-oct24 campaign attribution across header links and programmes CTA", async ({
  page,
}) => {
  await page.goto("/about?source=3x3-oct24", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".public-header-logo")).toBeVisible();

  // 1. Verify rendered header links retain campaign attribution
  const headerInterestLink = page
    .locator('header a[href*="/interest"]:visible')
    .first();
  await expect(headerInterestLink).toBeVisible();
  expect(await headerInterestLink.getAttribute("href")).toContain(
    "source=3x3-oct24",
  );

  // 2. Navigate to Programmes via rendered About CTA
  const programmesCta = page
    .locator('main a[href*="/programmes"]:visible')
    .first();
  await expect(programmesCta).toBeVisible();
  await programmesCta.click();
  await expect(page).toHaveURL(/\/programmes/);
  expect(new URL(page.url()).searchParams.get("source")).toBe("3x3-oct24");
});

test("contact page preserves 3x3-oct24 campaign attribution across header Register Interest link", async ({
  page,
}) => {
  await page.goto("/contact?source=3x3-oct24", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".public-header-logo")).toBeVisible();

  // 1. Verify header Register Interest link retains campaign attribution
  const headerInterestLink = page
    .locator('header a[href*="/interest"]:visible')
    .first();
  await expect(headerInterestLink).toBeVisible();
  expect(await headerInterestLink.getAttribute("href")).toContain(
    "source=3x3-oct24",
  );

  // 2. Click Register Interest and verify destination preserves campaign source
  await headerInterestLink.click();
  await expect(page).toHaveURL(/\/interest/);
  expect(new URL(page.url()).searchParams.get("source")).toBe("3x3-oct24");
});

test("contact page displays authoritative business details card and enquiry channel", async ({
  page,
}) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Contact KHLIM Basketball Academy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Official Academy Details" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Send an Enquiry" }),
  ).toBeVisible();
  const address = page.locator("main address");
  await expect(address).toBeVisible();
  await expect(address).toContainText("KHLIM Basketball");

  // Verify structured contact fields and channels
  const mailtoLink = address.locator('a[href^="mailto:"]');
  const telLink = address.locator('a[href^="tel:"]');

  if ((await mailtoLink.count()) > 0) {
    await expect(mailtoLink.first()).toBeVisible();
    const href = await mailtoLink.first().getAttribute("href");
    expect(href).toMatch(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/);

    // When email is configured, enquiry form controls are interactive
    await expect(page.locator('input[autoComplete="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator("#contact-message")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  } else {
    // When email is unconfigured, scoped warning is visible without disabling business card
    await expect(page.locator('main [role="alert"]')).toBeVisible();
  }

  if ((await telLink.count()) > 0) {
    await expect(telLink.first()).toBeVisible();
    const telHref = await telLink.first().getAttribute("href");
    expect(telHref).toMatch(/^tel:[+0-9\s()-]+/);
  }
});
