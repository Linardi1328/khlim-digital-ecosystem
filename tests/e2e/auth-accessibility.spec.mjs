import { expect, test } from "@playwright/test";

test("sign-in keeps an explicit home action alongside the logo shortcut", async ({
  page,
}) => {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

  const home = page.locator(".auth-home-link");
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute("href", "/");

  const box = await home.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeGreaterThanOrEqual(44);

  const logo = page.locator(".auth-brand-logo");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", "/khlim-logo.jpg");
});
