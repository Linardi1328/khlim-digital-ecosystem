import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect(overflow).toBe(false);
}

async function expectMinimumHeight(locator, minimum = 44) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeGreaterThanOrEqual(minimum);
}

test("audit trail exposes immutable read-only inspection and bounded filters", async ({
  page,
}) => {
  await page.goto("/audit", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Operational Audit Trail" })).toBeVisible();
  await expect(page.getByText("Append-only invariant:")).toBeVisible();
  await expect(page.getByText(/Showing \d+ of \d+ matching event/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Inspect" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Inspect" }).first().click();
  await expect(page.getByText("Structured metadata")).toBeVisible();
  await expect(page.getByText(/no edit or delete controls/i)).toBeVisible();
});

test("settings page distinguishes persisted defaults from historical financial records", async ({
  page,
}) => {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Platform Settings & Verified Boundaries" }),
  ).toBeVisible();
  await expect(page.getByText("No retroactive financial conversion.")).toBeVisible();
  await expect(page.getByText(/not synthetic uptime/i)).toBeVisible();
  await expect(page.getByText(/No API keys, passwords, database URLs, or webhook secrets/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const currency = page.getByLabel("Authoritative default currency");
  await currency.selectOption("SGD");
  const save = page.getByRole("button", { name: "Save defaults" });
  await expectMinimumHeight(currency);
  await expectMinimumHeight(save);

  page.once("dialog", (dialog) => dialog.accept());
  await save.click();
  await expect(page.getByText(/Demo mode accepted the preview only/)).toBeVisible();
});

test("governance pages remain mobile-safe", async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 500, "Mobile governance check only");

  for (const path of ["/audit", "/settings"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("DEMO MODE", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
