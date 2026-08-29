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
  await expect(logo).toHaveAttribute("src", "/khlim-logo.jpg");
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
  await expectMinimumHeight(quick.locator('a[href="/enrol"]'));
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

test("mobile drawer and carousel controls stay finger-friendly", async ({
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

  const carousel = page.getByRole("region", {
    name: "KHLIM academy photo highlights",
  });
  await expectMinimumHeight(
    carousel.getByRole("button", { name: /previous/i }),
  );
  await expectMinimumHeight(carousel.getByRole("button", { name: /next/i }));

  const slideButtons = carousel.getByRole("group").getByRole("button");
  const count = await slideButtons.count();
  for (let index = 0; index < count; index += 1) {
    await expectMinimumHeight(slideButtons.nth(index));
  }
});
