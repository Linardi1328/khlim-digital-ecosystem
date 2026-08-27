import { expect, test } from "@playwright/test";

const adminRoutes = [
  "/",
  "/programmes",
  "/offerings",
  "/plans",
  "/memberships",
  "/athletes",
  "/guardians",
  "/payments",
  "/venues",
  "/scheduling",
  "/staff",
  "/audit",
  "/settings",
];

async function expectHealthyAdminDocument(page, path) {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `Expected a document response for ${path}`).not.toBeNull();
  expect(response.status(), `Unexpected server error for ${path}`).toBeLessThan(
    500,
  );

  await expect(page.getByText("DEMO MODE", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
  await expect(page.locator("body")).not.toContainText("Application error");
  await page.waitForTimeout(250);

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 2;
  });
  expect(overflow, `Horizontal overflow detected on ${path}`).toBe(false);
  expect(pageErrors, `Uncaught browser errors on ${path}`).toEqual([]);
}

for (const path of adminRoutes) {
  test(`${path} renders without fatal browser errors or viewport overflow`, async ({
    page,
  }) => {
    await expectHealthyAdminDocument(page, path);
  });
}

test("desktop navigation reaches every core operations domain", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width < 1024, "Desktop navigation only");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  for (const [label, path] of [
    ["Programmes", "/programmes"],
    ["Offerings", "/offerings"],
    ["Membership Plans", "/plans"],
    ["Memberships", "/memberships"],
    ["Athletes", "/athletes"],
    ["Guardians", "/guardians"],
    ["Payments", "/payments"],
    ["Venues", "/venues"],
    ["Scheduling", "/scheduling"],
    ["Staff", "/staff"],
    ["Audit Log", "/audit"],
    ["Settings", "/settings"],
  ]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test("mobile drawer navigation opens and reaches programmes", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width > 500, "Mobile navigation only");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByText("Operations Menu")).toBeVisible();
  await page.getByRole("link", { name: "Programmes", exact: true }).click();
  await expect(page).toHaveURL(/\/programmes$/);
});

test("demo role preview hides finance ledger from coach role", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width < 1024, "Desktop role preview only");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Switch demo role" }).click();
  await page.getByRole("button", { name: "COACH", exact: true }).click();
  await page.getByRole("link", { name: "Payments", exact: true }).click();
  await expect(page.getByText("Restricted Financial Ledger")).toBeVisible();
});

test("payments UI never renders KHLIM-owned raw card credential fields", async ({
  page,
}) => {
  await page.goto("/payments", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[name*="card" i]')).toHaveCount(0);
  await expect(page.locator('input[name*="cvv" i]')).toHaveCount(0);
  await expect(page.locator('input[name*="cvc" i]')).toHaveCount(0);
});
