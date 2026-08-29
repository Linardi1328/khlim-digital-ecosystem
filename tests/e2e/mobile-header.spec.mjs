import { expect, test } from "@playwright/test";

test("mobile header actions stay visible", async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const locale = page.locator(".public-header-locale select");
  const menu = page.locator(".mobile-menu-btn");
  const quick = page.locator(".public-header-mobile-quick-actions");

  await expect(locale).toBeVisible();
  await expect(menu).toBeVisible();
  await expect(quick).toBeVisible();
  await expect(quick.locator('a[href="/auth/login"]')).toBeVisible();
  await expect(quick.locator('a[href="/enrol"]')).toBeVisible();
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
