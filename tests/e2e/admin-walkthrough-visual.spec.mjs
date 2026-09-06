import { expect, test } from "@playwright/test";

const reviewRoutes = [
  ["dashboard", "/"],
  ["programmes", "/programmes"],
  ["scheduling", "/scheduling"],
  ["payments", "/payments"],
  ["accounts", "/users"],
];

for (const [name, path] of reviewRoutes) {
  test(`capture Admin ${name} walkthrough view`, async ({ page, viewport }, testInfo) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.getByText("DEMO MODE", { exact: true })).toBeVisible();

    const width = viewport?.width ?? 0;
    await page.screenshot({
      path: testInfo.outputPath(`admin-${name}-${width}.png`),
      fullPage: true,
    });
  });
}
