import { expect, test } from "@playwright/test";

const liveBase = "https://famous-entremet-dc295c.netlify.app";
const publicRoutes = [
  "/",
  "/academy",
  "/programmes",
  "/about",
  "/contact",
  "/spotlight",
  "/terms",
  "/privacy",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
];

async function auditPage(page, path) {
  const pageErrors = [];
  const failedRequests = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(liveBase)) {
      failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`);
    }
  });

  const response = await page.goto(`${liveBase}${path}`, {
    waitUntil: "networkidle",
  });

  expect.soft(response, `${path} should return a document`).not.toBeNull();
  if (response) {
    expect.soft(response.status(), `${path} status`).toBeLessThan(400);
  }

  await expect.soft(page.locator("body"), `${path} body`).toBeVisible();
  await expect
    .soft(page.locator("body"), `${path} should not show a fatal error`)
    .not.toContainText(/Application error|Internal Server Error/i);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect.soft(overflow, `${path} should not overflow horizontally`).toBe(false);

  const brokenImages = await page.locator("img:visible").evaluateAll((images) =>
    images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => ({ alt: image.alt, src: image.getAttribute("src") })),
  );
  expect.soft(brokenImages, `${path} broken images`).toEqual([]);
  expect.soft(pageErrors, `${path} page errors`).toEqual([]);
  expect.soft(failedRequests, `${path} failed same-origin requests`).toEqual([]);
}

for (const path of publicRoutes) {
  test(`live public route ${path} is healthy`, async ({ page }) => {
    await auditPage(page, path);
  });
}

test("live mobile header keeps critical controls visible and tappable", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await page.goto(liveBase, { waitUntil: "networkidle" });

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
        (image) =>
          image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(tagline).toBeVisible();
  await expect(locale).toBeVisible();
  await expect(menu).toBeVisible();
  await expect(quick).toBeVisible();

  for (const control of [locale, menu]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  for (const link of [
    quick.locator('a[href="/auth/login"]'),
    quick.locator('a[href="/enrol"]'),
  ]) {
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  await page.screenshot({
    path: `test-results/live-home-${viewport.width}x${viewport.height}.png`,
    fullPage: true,
  });
});

test("live mobile header remains usable at 320px", async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(liveBase, { waitUntil: "networkidle" });

  await expect(page.locator(".public-header-brand-tagline")).toBeVisible();
  await expect(page.locator(".public-header-locale select")).toBeVisible();
  await expect(page.locator(".mobile-menu-btn")).toBeVisible();
  await expect(page.locator(".public-header-mobile-quick-actions")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect(overflow).toBe(false);
});

test("live locale switcher works directly on mobile", async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await page.goto(liveBase, { waitUntil: "networkidle" });

  const locale = page.locator(".public-header-locale select");
  await expect(locale).toBeVisible();
  await expect(locale.locator("option")).toHaveCount(5);

  await locale.selectOption("ms");
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("ms");
  await expect(
    page.getByRole("heading", { name: "Memartabatkan Bola Keranjang Remaja di Malaysia" }),
  ).toBeVisible();

  await locale.selectOption("zh-Hans");
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("zh-Hans");
});

test("live mobile menu navigates core public pages", async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");

  for (const [label, path] of [
    ["Academy", "/academy"],
    ["Programmes", "/programmes"],
    ["About", "/about"],
    ["Contact", "/contact"],
  ]) {
    await page.goto(liveBase, { waitUntil: "networkidle" });
    await page.locator(".mobile-menu-btn").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${liveBase}${path}`);
  }
});

test("live sign-in gives users an obvious route home and complete branding", async ({
  page,
}) => {
  await page.goto(`${liveBase}/auth/login`, { waitUntil: "networkidle" });

  const home = page.locator(".auth-home-link");
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute("href", "/");
  const homeBox = await home.boundingBox();
  expect(homeBox).not.toBeNull();
  expect(homeBox.height).toBeGreaterThanOrEqual(44);

  const logo = page.locator(".auth-brand-logo");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", "/khlim-logo.jpg");
  await expect
    .poll(() =>
      logo.evaluate(
        (image) =>
          image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
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
});

test("live enrolment preserves intended authentication redirect", async ({ page }) => {
  await page.goto(`${liveBase}/enrol`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fenrol/);
});

test("live protected portal routes redirect safely to sign-in", async ({ page }) => {
  for (const path of [
    "/portal/dashboard",
    "/portal/players",
    "/portal/membership",
    "/portal/payments",
    "/portal/schedule",
    "/portal/notifications",
    "/portal/account",
  ]) {
    await page.goto(`${liveBase}${path}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login\?redirect=/);
    expect(decodeURIComponent(new URL(page.url()).searchParams.get("redirect"))).toBe(path);
  }
});
