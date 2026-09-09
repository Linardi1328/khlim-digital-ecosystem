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

test("sign-in exposes language choice and accessible password visibility", async ({
  page,
}) => {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

  const language = page.locator("select").first();
  await expect(language).toHaveValue("en");
  await language.selectOption("ms");
  await expect(page.locator("html")).toHaveAttribute("lang", "ms");

  const password = page.locator('input[autocomplete="current-password"]');
  await expect(password).toHaveAttribute("type", "password");
  await password.locator("..").getByRole("button").click();
  await expect(password).toHaveAttribute("type", "text");
});

test("localized sign-in remains within a normal desktop viewport", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "desktop viewport acceptance",
  );
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

  const language = page.locator("select").first();
  for (const locale of ["en", "ms", "zh-Hans", "zh-Hant", "hi"]) {
    await language.selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const viewport = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.innerHeight + 1);
  }
});
