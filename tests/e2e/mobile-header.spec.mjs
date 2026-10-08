import { expect, test } from "@playwright/test";

async function expectMinimumHeight(locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeGreaterThanOrEqual(44);
}

test("mobile header actions and brand lockup stay visible", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const logo = page.locator(".public-header-logo");
  const tagline = page.locator(".public-header-brand-tagline");
  const locale = page.locator(".public-header-locale select");
  const menu = page.locator(".mobile-menu-btn");
  const quick = page.locator(".public-header-mobile-quick-actions");

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
  await expect(tagline).toBeVisible();
  await expect(quick).toBeVisible();
  await expectMinimumHeight(locale);
  await expectMinimumHeight(menu);
  await expectMinimumHeight(quick.locator('a[href="/auth/login"]'));
  await expectMinimumHeight(quick.locator('a[href="/interest"]'));
});

test("mobile language switch stays inline", async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const locale = page.locator(".public-header-locale select");
  await locale.selectOption("zh-Hans");

  await expect(locale).toHaveValue("zh-Hans");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang))
    .toBe("zh-Hans");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("compact 320px header keeps tagline and controls without overflow", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".public-header-brand-tagline")).toBeVisible();
  await expect(page.locator(".public-header-locale select")).toBeVisible();
  await expect(page.locator(".mobile-menu-btn")).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 2,
  );
  expect(overflow).toBe(false);
});

test("mobile drawer and academy hero actions stay finger-friendly", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.locator(".mobile-menu-btn").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expectMinimumHeight(dialog.getByRole("button", { name: /close/i }));
  await expectMinimumHeight(dialog.locator("select"));

  const drawerLinks = await dialog.getByRole("link").all();
  for (const link of drawerLinks) {
    await expectMinimumHeight(link);
  }

  await dialog.getByRole("button", { name: /close/i }).click();

  const hero = page.locator(".home-hero-carousel");
  await expect(hero).toBeVisible();
  await expectMinimumHeight(hero.locator('a[href="/interest"]'));
  await expectMinimumHeight(hero.locator('a[href="/programmes"]'));
  await expect(hero.locator(".home-carousel-arrow")).toHaveCount(0);
  await expect(hero.locator(".home-carousel-dots")).toHaveCount(0);
});

test("mobile sheet portal covers full viewport and unconstrains overlay on 375px and 390px mobile viewports", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");

  const mobileViewports = [
    { width: 375, height: 667 },
    { width: 390, height: 844 },
  ];

  for (const vp of mobileViewports) {
    await page.setViewportSize(vp);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Open sheet
    await page.locator(".mobile-menu-btn").click();
    const dialog = page.getByRole("dialog");
    const overlay = page.locator(".sheet-overlay");

    await expect(dialog).toBeVisible();
    await expect(overlay).toBeVisible();

    // Verify overlay is portaled outside header into body
    await expect(page.locator("header .sheet-overlay")).toHaveCount(0);
    await expect(page.locator("body > .sheet-overlay")).toHaveCount(1);

    // Verify overlay spans entire viewport height and width (unconstrained by header)
    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y).toBe(0);
    expect(box.height).toBe(vp.height);
    expect(box.width).toBe(vp.width);

    // Verify body scroll lock while open
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    // Close with Escape key
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .not.toBe("hidden");

    // Reopen and close by clicking overlay backdrop
    await page.locator(".mobile-menu-btn").click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(15, 100);
    await expect(dialog).toHaveCount(0);
  }
});
