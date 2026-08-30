import { expect, test } from "@playwright/test";

test("KPI health dashboard exposes explicit persisted operational signals", async ({
  page,
}) => {
  const response = await page.goto("/insights", {
    waitUntil: "domcontentloaded",
  });

  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(500);
  await expect(
    page.getByRole("heading", { name: "KPI & Operational Health" }),
  ).toBeVisible();
  await expect(page.getByText("30-day academy KPIs")).toBeVisible();
  await expect(page.getByText("Operational backlog")).toBeVisible();
  await expect(page.getByText("Payment processing health")).toBeVisible();
  await expect(page.getByText("Active Memberships")).toBeVisible();
  await expect(page.getByText("Attendance Rate")).toBeVisible();
  await expect(page.getByText(/no predicted, estimated, or synthetic trends/i)).toBeVisible();

  const refresh = page.getByRole("button", { name: "Refresh health data" });
  await expect(refresh).toBeVisible();
  const refreshBox = await refresh.boundingBox();
  expect(refreshBox).not.toBeNull();
  expect(refreshBox.height).toBeGreaterThanOrEqual(44);

  const reviewMemberships = page.getByRole("link", {
    name: "Review memberships",
  });
  await expect(reviewMemberships).toBeVisible();
  const reviewBox = await reviewMemberships.boundingBox();
  expect(reviewBox).not.toBeNull();
  expect(reviewBox.height).toBeGreaterThanOrEqual(44);
});

test("KPI health dashboard has no horizontal overflow", async ({ page }) => {
  await page.goto("/insights", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(250);

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 2;
  });

  expect(overflow).toBe(false);
});

test("coach demo role cannot open reporting insights from navigation", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width < 1024, "Desktop role preview only");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Switch demo role" }).click();
  await page.getByRole("button", { name: "COACH", exact: true }).click();

  await expect(
    page.getByRole("link", { name: "KPI & Health", exact: true }),
  ).toHaveCount(0);
});
