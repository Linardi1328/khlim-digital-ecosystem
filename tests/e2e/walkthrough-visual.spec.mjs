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

  const posterFrames = page.locator(".home-khero-poster");
  const rightsPending = page.locator(
    '.home-khero-poster [data-media-rights="pending"]',
  );
  const approvedImages = page.locator(".home-khero-poster img");

  await expect(posterFrames).toHaveCount(4);
  await expect(rightsPending).toHaveCount(4);
  await expect(approvedImages).toHaveCount(0);
  await page.locator(".home-khero-section").scrollIntoViewIfNeeded();

  for (let index = 0; index < 4; index += 1) {
    const placeholder = rightsPending.nth(index);
    await placeholder.scrollIntoViewIfNeeded();
    await expect(placeholder).toBeVisible();
  }

  const width = viewport?.width ?? 0;
  await page.screenshot({
    path: testInfo.outputPath(`public-home-${width}.png`),
    fullPage: true,
  });
});
