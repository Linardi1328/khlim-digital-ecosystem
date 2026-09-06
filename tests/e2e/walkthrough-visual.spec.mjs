import { expect, test } from "@playwright/test";

test("capture public walkthrough homepage for visual review", async ({
  page,
  viewport,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Developing players. Building futures." }),
  ).toBeVisible();
  await expect(page.locator(".home-khero-poster img")).toHaveCount(4);

  const width = viewport?.width ?? 0;
  await page.screenshot({
    path: testInfo.outputPath(`public-home-${width}.png`),
    fullPage: true,
  });
});
