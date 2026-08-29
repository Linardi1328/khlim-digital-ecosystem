import { expect, test } from "@playwright/test";

test.describe("mobile public header", () => {
  test.beforeEach(async ({ page, viewport }) => {
    test.skip(
      !viewport || viewport.width > 500,
      "Mobile header acceptance only",
    );
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test(
    "keeps language, menu, login, and registration actions visible",
    async ({ page }) => {
      await expect(page.locator(".public-header-locale select")).toBeVisible();
      await expect(page.locator(".mobile-menu-btn")).toBeVisible();

      const quickActions = page.locator(".public-header-mobile-quick-actions");
      await expect(quickActions).toBeVisible();
      await expect(quickActions.locator('a[href="/auth/login"]')).toBeVisible();
      await expect(quickActions.locator('a[href="/enrol"]')).toBeVisible();
    },
  );

  test(
    "changes language directly from the top bar without opening the menu",
    async ({ page }) => {
      const locale = page.locator(".public-header-locale select");
      await locale.selectOption("zh-Hans");

      await expect(locale).toHaveValue("zh-Hans");
      await expect
        .poll(() => page.evaluate(() => document.documentElement.lang))
        .toBe("zh-Hans");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    },
  );
});
