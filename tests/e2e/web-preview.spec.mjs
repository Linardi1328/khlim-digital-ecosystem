import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/academy",
  "/programmes",
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
  await page.getByRole("button", { name: "Open Mobile Menu" }).click();
  await expect(page.getByText("KHLIM Navigation")).toBeVisible();
}

function visibleLocaleSwitcher(page) {
  return page.locator('select[aria-label="Select Language"]:visible');
}

for (const path of publicRoutes) {
  test(`public route ${path} renders without a fatal browser error`, async ({
    page,
  }) => {
    await expectHealthyDocument(page, path);
  });
}

test("homepage carousel controls change the active slide", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const carousel = page.getByRole("region", {
    name: "KHLIM academy photo highlights",
  });
  await expect(carousel).toBeVisible();

  const firstDot = page.getByRole("button", {
    name: /Show academy photo 1:/,
  });
  const thirdDot = page.getByRole("button", {
    name: /Show academy photo 3:/,
  });

  await expect(firstDot).toHaveAttribute("aria-current", "true");
  await thirdDot.click();
  await expect(thirdDot).toHaveAttribute("aria-current", "true");
  await expect(firstDot).not.toHaveAttribute("aria-current", "true");
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

test("language choice persists after reload", async ({ page, viewport }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  if (viewport && viewport.width <= 640) {
    await openMobileMenu(page);
  }

  await visibleLocaleSwitcher(page).selectOption("ms");

  await expect
    .poll(() => page.evaluate(() => document.documentElement.lang))
    .toBe("ms");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("khlim_locale")))
    .toBe("ms");

  await page.reload({ waitUntil: "domcontentloaded" });

  if (viewport && viewport.width <= 640) {
    await openMobileMenu(page);
  }

  await expect(visibleLocaleSwitcher(page)).toHaveValue("ms");
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

test("login page exposes the expected authentication controls", async ({
  page,
}) => {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

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
