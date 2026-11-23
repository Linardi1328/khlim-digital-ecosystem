import { expect, test } from "@playwright/test";
import { homeAcademyWebMessages } from "../../packages/i18n/src/messages/home-academy-web.ts";

const mockOfferings = [
  {
    id: "synthetic-offering-1",
    name: "Youth Basketball Academy",
    capacity: 20,
    startsOn: "2027-01-15",
    endsOn: null,
    programme: {
      id: "prog-youth-1",
      code: "YOUTH-DEV",
      name: "Youth Basketball Development",
      description: "Fundamental skill development and teamwork.",
      minimumAge: 8,
      maximumAge: 14,
      level: "DEVELOPMENT",
      sport: { code: "BASKETBALL", defaultName: "Basketball" },
    },
    venue: { name: "Court 1" },
    planEligibilities: [],
  },
];

function visibleLocaleSwitcher(page) {
  return page.locator(".public-header-locale select:visible");
}

test.describe("RIC-184: Homepage offerings failure recovery and truthful status", () => {
  test("1. API 503 displays honest error, not empty-catalogue message", async ({
    page,
  }) => {
    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ message: "temporarily unavailable" }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const alert = page.locator(
      'section.home-programmes-section p[role="alert"]',
    );
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(
      "Programme listings are temporarily unavailable.",
    );
    await expect(
      page.getByText("No open programme offerings are currently published."),
    ).toHaveCount(0);
  });

  test("2. Retry invokes another GET without document reload", async ({
    page,
  }) => {
    let getCount = 0;
    await page.route("**/academy/offerings", async (route) => {
      getCount++;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ message: "temporarily unavailable" }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator('section.home-programmes-section p[role="alert"]'),
    ).toBeVisible();
    expect(getCount).toBe(1);

    await page.evaluate(() => {
      window.__homepageMarker = "no-reload-verified";
    });

    await page.getByRole("button", { name: "Try Again" }).click();

    await expect.poll(() => getCount).toBe(2);

    const marker = await page.evaluate(() => window.__homepageMarker);
    expect(marker).toBe("no-reload-verified");
  });

  test("3. Recovery to HTTP 200 with offerings renders actual cards", async ({
    page,
  }) => {
    let failRequest = true;
    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: failRequest ? 503 : 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: failRequest
          ? '{"message":"unavailable"}'
          : JSON.stringify(mockOfferings),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator('section.home-programmes-section p[role="alert"]'),
    ).toBeVisible();

    failRequest = false;
    await page.getByRole("button", { name: "Try Again" }).click();

    await expect(page.locator(".khlim-offering-card")).toHaveCount(1);
    await expect(
      page.locator('section.home-programmes-section p[role="alert"]'),
    ).toHaveCount(0);
    await expect(page.getByText("Youth Basketball Academy")).toBeVisible();
  });

  test("4. Recovery to HTTP 200 [] renders legitimate empty state", async ({
    page,
  }) => {
    let failRequest = true;
    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: failRequest ? 503 : 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: failRequest ? '{"message":"unavailable"}' : "[]",
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator('section.home-programmes-section p[role="alert"]'),
    ).toBeVisible();

    failRequest = false;
    await page.getByRole("button", { name: "Try Again" }).click();

    await expect(
      page.getByText("No open programme offerings are currently published."),
    ).toBeVisible();
    await expect(
      page.locator('section.home-programmes-section p[role="alert"]'),
    ).toHaveCount(0);
  });

  test("5. Slow response shows loading rather than false emptiness", async ({
    page,
  }) => {
    await page.route("**/academy/offerings", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: "[]",
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const section = page.locator("section.home-programmes-section");
    await expect(
      section.getByText("Loading current academy offerings…"),
    ).toBeVisible();
    await expect(
      section.getByText("No open programme offerings are currently published."),
    ).toHaveCount(0);
    await expect(section.locator('p[role="alert"]')).toHaveCount(0);
  });

  test("6. Error and Retry remain usable through keyboard interaction", async ({
    page,
  }) => {
    let failRequest = true;
    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: failRequest ? 503 : 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: failRequest
          ? '{"message":"unavailable"}'
          : JSON.stringify(mockOfferings),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const retryBtn = page.getByRole("button", { name: "Try Again" });
    await expect(retryBtn).toBeVisible();

    failRequest = false;
    await retryBtn.focus();
    await expect(retryBtn).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.locator(".khlim-offering-card")).toHaveCount(1);
  });

  test("7. English, Malay, and Simplified Chinese show correct error messages", async ({
    page,
  }) => {
    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: '{"message":"unavailable"}',
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const alert = page.locator(
      'section.home-programmes-section p[role="alert"]',
    );
    await expect(alert).toContainText(
      "Programme listings are temporarily unavailable.",
    );

    const switcher = visibleLocaleSwitcher(page);
    if (await switcher.isVisible()) {
      await switcher.selectOption("ms");
      await expect(alert).toContainText(
        "Senarai program tidak dapat dimuatkan",
      );

      await switcher.selectOption("zh-Hans");
      await expect(alert).toContainText("暂时无法加载课程列表。");
    }
  });

  test("8. Other supported translations pass existing completeness checks", () => {
    expect(
      homeAcademyWebMessages["zh-Hant"]["home.programmes.catalogueLoadError"],
    ).toBe("暫時無法載入課程列表。請重試。");
    expect(
      homeAcademyWebMessages.hi["home.programmes.catalogueLoadError"],
    ).toBe("फ़िलहाल कार्यक्रम सूची लोड नहीं हो सकी। कृपया फिर से प्रयास करें।");
  });

  test("9. Register Interest remains reachable during API failure", async ({
    page,
  }) => {
    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: '{"message":"unavailable"}',
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const section = page.locator("section.home-programmes-section");
    const interestBtn = section.getByRole("link", {
      name: "Register Interest",
    });
    await expect(interestBtn).toBeVisible();
    await expect(interestBtn).toHaveAttribute("href", /\/interest/);
  });

  test("10. source=3x3-oct24 survives navigation to /interest during outage", async ({
    page,
  }) => {
    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: '{"message":"unavailable"}',
      });
    });

    await page.goto("/?source=3x3-oct24", { waitUntil: "domcontentloaded" });
    const section = page.locator("section.home-programmes-section");
    const interestBtn = section.getByRole("link", {
      name: "Register Interest",
    });
    await expect(interestBtn).toBeVisible();

    await interestBtn.click();
    await page.waitForURL(/\/interest/);
    expect(page.url()).toContain("source=3x3-oct24");
  });

  test("11. Retry does not create a lead or call lead POST endpoint", async ({
    page,
  }) => {
    let leadPostCalled = false;
    await page.route("**/academy/leads", async (route) => {
      if (route.request().method() === "POST") {
        leadPostCalled = true;
      }
      await route.fulfill({ status: 200, body: "{}" });
    });

    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: '{"message":"unavailable"}',
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Try Again" }).click();

    expect(leadPostCalled).toBe(false);
  });

  test("12. No uncaught browser errors or horizontal overflow on error state", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.route("**/academy/offerings", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: '{"message":"unavailable"}',
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator('section.home-programmes-section p[role="alert"]'),
    ).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 2;
    });

    expect(hasOverflow).toBe(false);
    expect(pageErrors).toEqual([]);
  });
});
