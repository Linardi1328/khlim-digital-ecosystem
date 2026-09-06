import { expect, test } from "@playwright/test";

test("capture public walkthrough homepage for visual review", async ({
  page,
  viewport,
}, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", {
      name: "Developing players. Building futures.",
    }),
  ).toBeVisible();

  const posters = page.locator(".home-khero-poster img");
  await expect(posters).toHaveCount(4);
  await page.locator(".home-khero-section").scrollIntoViewIfNeeded();

  for (let index = 0; index < 4; index += 1) {
    const poster = posters.nth(index);
    await poster.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        poster.evaluate(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }

  const width = viewport?.width ?? 0;
  await page.screenshot({
    path: testInfo.outputPath(`public-home-${width}.png`),
    fullPage: true,
  });
});
