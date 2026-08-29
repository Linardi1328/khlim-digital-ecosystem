import { expect, test } from "@playwright/test";

const liveBase = "https://famous-entremet-dc295c.netlify.app";

async function gotoLive(page, path = "/") {
  const response = await page.goto(`${liveBase}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
}

async function expectMinimumTarget(locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

test("live public routes and logo are healthy", async ({ page }) => {
  for (const path of [
    "/",
    "/academy",
    "/programmes",
    "/about",
    "/contact",
    "/spotlight",
    "/terms",
    "/privacy",
    "/auth/login",
  ]) {
    await gotoLive(page, path);
    await expect(page.locator("body")).not.toContainText(
      /Application error|Internal Server Error/i,
    );

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 2,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBe(false);

    const brokenImages = await page.locator("img:visible").evaluateAll((images) =>
      images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute("src")),
    );
    expect(brokenImages, `broken images on ${path}`).toEqual([]);
  }
});

test("live mobile controls meet the 44px baseline", async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await gotoLive(page);

  const logo = page.locator(".public-header-logo");
  await expect(logo).toHaveAttribute("src", "/khlim-logo.jpg");
  await expect
    .poll(() =>
      logo.evaluate(
        (image) =>
          image instanceof HTMLImageElement &&
          image.complete &&
          image.naturalWidth > 0,
      ),
    )
    .toBe(true);

  await expect(page.locator(".public-header-brand-tagline")).toBeVisible();
  await expectMinimumTarget(page.locator(".public-header-locale select"));
  await expectMinimumTarget(page.locator(".mobile-menu-btn"));

  const quick = page.locator(".public-header-mobile-quick-actions");
  await expectMinimumTarget(quick.locator('a[href="/auth/login"]'));
  await expectMinimumTarget(quick.locator('a[href="/enrol"]'));

  await page.locator(".mobile-menu-btn").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expectMinimumTarget(dialog.getByRole("button", { name: /close/i }));
  await expectMinimumTarget(dialog.locator("select"));

  const drawerLinks = await dialog.getByRole("link").all();
  for (const link of drawerLinks) {
    await expectMinimumTarget(link);
  }

  await dialog.getByRole("button", { name: /close/i }).click();

  const carousel = page.getByRole("region", {
    name: "KHLIM academy photo highlights",
  });
  await expectMinimumTarget(
    carousel.getByRole("button", { name: /previous/i }),
  );
  await expectMinimumTarget(carousel.getByRole("button", { name: /next/i }));

  const dots = carousel.getByRole("group").getByRole("button");
  const count = await dots.count();
  for (let index = 0; index < count; index += 1) {
    await expectMinimumTarget(dots.nth(index));
  }
});

test("live mobile language and navigation remain functional", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width > 500, "Mobile only");
  await gotoLive(page);

  const locale = page.locator(".public-header-locale select");
  await locale.selectOption("ms");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang))
    .toBe("ms");
  await expect(
    page.getByRole("heading", {
      name: "Memartabatkan Bola Keranjang Remaja di Malaysia",
    }),
  ).toBeVisible();

  await locale.selectOption("en");
  await page.locator(".mobile-menu-btn").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("link", { name: "Programmes", exact: true }).click();
  await expect(page).toHaveURL(`${liveBase}/programmes`);
});

test("live sign-in and enrolment keep clear escape and redirect paths", async ({
  page,
}) => {
  await gotoLive(page, "/auth/login");
  const home = page.locator(".auth-home-link");
  await expectMinimumTarget(home);
  await expect(home).toHaveAttribute("href", "/");
  await expect(page.locator(".auth-brand-logo")).toHaveAttribute(
    "src",
    "/khlim-logo.jpg",
  );

  await gotoLive(page, "/enrol");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fenrol/);
});
