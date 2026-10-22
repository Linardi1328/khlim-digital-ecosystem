import { expect, test } from "@playwright/test";

const adminRoutes = [
  "/",
  "/leads",
  "/reports",
  "/insights",
  "/programmes",
  "/offerings",
  "/plans",
  "/memberships",
  "/athletes",
  "/guardians",
  "/payments",
  "/venues",
  "/scheduling",
  "/editorial",
  "/moderation",
  "/notifications",
  "/users",
  "/staff",
  "/audit",
  "/settings",
  "/insights/campaigns",
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

test("desktop nine-section navigation reaches every operations tab", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width < 1024, "Desktop navigation only");
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const sidebar = page.getByRole("navigation", { name: "Admin sections" });
  await expect(sidebar.getByRole("link")).toHaveCount(9);

  const sections = [
    ["Overview", "Dashboard", "/"],
    ["Overview", "Reports", "/reports"],
    ["Overview", "KPI & Health", "/insights"],
    ["Growth & Leads", "Leads", "/leads"],
    ["Growth & Leads", "3x3 Campaign", "/insights/campaigns"],
    ["Academy Setup", "Programmes", "/programmes"],
    ["Academy Setup", "Offerings", "/offerings"],
    ["Academy Setup", "Membership Plans", "/plans"],
    ["Members & Families", "Memberships", "/memberships"],
    ["Members & Families", "Athletes", "/athletes"],
    ["Members & Families", "Guardians", "/guardians"],
    ["Training Operations", "Scheduling", "/scheduling"],
    ["Training Operations", "Venues & Courts", "/venues"],
    ["Finance", "Payments", "/payments"],
    ["Content Management", "Editorial Studio", "/editorial"],
    ["Content Management", "Moderation", "/moderation"],
    ["Communications", "Notifications", "/notifications"],
    ["Team & Administration", "Accounts & Access", "/users"],
    ["Team & Administration", "Staff", "/staff"],
    ["Team & Administration", "Audit Log", "/audit"],
    ["Team & Administration", "Settings", "/settings"],
  ];

  for (const [section, tab, path] of sections) {
    await sidebar.getByRole("link", { name: section, exact: true }).click();
    if (path !== "/payments" && path !== "/notifications") {
      await page
        .getByRole("navigation", { name: section + " pages" })
        .getByRole("link", { name: tab, exact: true })
        .click();
    }
    await expect(page).toHaveURL(new RegExp(path === "/" ? "/$" : path + "$"));
    await expect(
      page.getByLabel("How to use " + tab),
    ).toBeVisible();
  }
});

test("mobile drawer opens a section and its related tabs", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width > 500, "Mobile navigation only");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByText("Operations Menu")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Admin sections" })
    .getByRole("link", { name: "Academy Setup", exact: true })
    .click();
  await expect(page).toHaveURL(/\/programmes$/);
  await page
    .getByRole("navigation", { name: "Academy Setup pages" })
    .getByRole("link", { name: "Offerings", exact: true })
    .click();
  await expect(page).toHaveURL(/\/offerings$/);
});

test("reports expose explicit date, refresh, and export controls", async ({
  page,
}) => {
  await page.goto("/reports", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Operations Reports" }),
  ).toBeVisible();
  await expect(page.getByLabel("From")).toBeVisible();
  await expect(page.getByLabel("To")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh report" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await expect(page.getByText("Active Memberships")).toBeVisible();
  await expect(page.getByText("Attendance Rate")).toBeVisible();

  for (const control of [
    page.getByLabel("From"),
    page.getByLabel("To"),
    page.getByRole("button", { name: "Refresh report" }),
    page.getByRole("button", { name: "Export CSV" }),
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test("moderation shows explicit publication decisions and safety blockers", async ({
  page,
}) => {
  await page.goto("/moderation", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Editorial Moderation" }),
  ).toBeVisible();
  await expect(page.getByText("Publication safety rule:")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve & publish" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Needs verification/ }).click();
  await expect(page.getByText("Resolve before publication:")).toBeVisible();
  await expect(page.getByText(/Facts and photo rights/)).toBeVisible();
});

test("coach work view hides privileged workspaces and tabs", async ({
  page,
  viewport,
}) => {
  test.skip(!viewport || viewport.width < 1024, "Desktop role preview only");
  await page.goto("/payments", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Switch active work view" }).click();
  await page.getByRole("menuitemradio", { name: "COACH", exact: true }).click();

  const sidebar = page.getByRole("navigation", { name: "Admin sections" });
  for (const restrictedSection of [
    "Finance",
    "Growth & Leads",
    "Academy Setup",
    "Content Management",
    "Team & Administration",
  ]) {
    await expect(
      sidebar.getByRole("link", { name: restrictedSection, exact: true }),
    ).toHaveCount(0);
  }
  await expect(page.getByText("Restricted Financial Ledger")).toBeVisible();
  await sidebar.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Finance roles only").first()).toBeVisible();
  await expect(
    page.getByText("Declined mandates & unconfirmed charges"),
  ).toHaveCount(0);
});

test("clickable table rows support keyboard activation", async ({ page }) => {
  await page.goto("/athletes", { waitUntil: "domcontentloaded" });
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  await firstRow.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("payments UI never renders KHLIM-owned raw card credential fields", async ({
  page,
}) => {
  await page.goto("/payments", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[name*="card" i]')).toHaveCount(0);
  await expect(page.locator('input[name*="cvv" i]')).toHaveCount(0);
  await expect(page.locator('input[name*="cvc" i]')).toHaveCount(0);
});

for (const width of [375, 390]) {
  test(`3x3 Campaign conversion dashboard renders cleanly at ${width}px without horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/insights/campaigns", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "3x3 Campaign" }),
    ).toBeVisible();
    await expect(page.getByText("3x3-oct24").first()).toBeVisible();
    await expect(page.getByText("MYT (UTC+8)").first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 2;
    });
    expect(
      overflow,
      `Horizontal overflow detected on /insights/campaigns at ${width}px`,
    ).toBe(false);

    // Date presets
    await expect(
      page.getByRole("button", { name: "24 Oct 2026 (Event Day)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Campaign Window (Aug–Oct)" }),
    ).toBeVisible();

    // Funnel & Notice
    await expect(
      page.getByText("Attribution & Measurement Notice:"),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/leads?source=3x3-oct24"]').first(),
    ).toBeVisible();
  });
}

test("3x3 Campaign dashboard links directly to Leads Inbox with 3x3-oct24 pre-filter", async ({
  page,
}) => {
  await page.goto("/insights/campaigns", { waitUntil: "domcontentloaded" });
  const openLeadsLink = page
    .locator('a[href="/leads?source=3x3-oct24"]')
    .first();
  await expect(openLeadsLink).toBeVisible();

  await openLeadsLink.click();
  await expect(page).toHaveURL(/\/leads\?source=3x3-oct24/);
});

test("3x3 campaign analytics rejects an ineligible demo work view", async ({
  page,
}) => {
  await page.goto("/insights/campaigns", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "3x3 Campaign" }),
  ).toBeVisible();

  let campaignRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/admin/academy/campaigns/analytics")) {
      campaignRequests += 1;
    }
  });

  await page.getByRole("button", { name: "Switch active work view" }).click();
  await page.getByRole("menuitemradio", { name: "EVENT STAFF" }).click();
  await expect(page.getByText("Restricted Access")).toBeVisible();
  expect(campaignRequests).toBe(0);
});

test("3x3 demo campaign lead metrics respect the selected MYT acquisition window", async ({
  page,
}) => {
  await page.goto("/insights/campaigns", { waitUntil: "domcontentloaded" });
  const confirmedLeads = page
    .getByRole("region", { name: "Campaign Overview Metrics" })
    .locator(":scope > div")
    .first();

  async function applyDates(from, to) {
    await page.locator("#campaign-start-date").fill(from);
    await page.locator("#campaign-end-date").fill(to);
    await page.getByRole("button", { name: "Apply", exact: true }).click();
  }

  // Fixed campaign fixtures remain within the window even after October 2026.
  await applyDates("2026-10-01", "2026-10-31");
  await expect(confirmedLeads.getByText("3", { exact: true })).toBeVisible();

  // The event day includes the two event-acquired demo leads.
  await applyDates("2026-10-24", "2026-10-24");
  await expect(confirmedLeads.getByText("2", { exact: true })).toBeVisible();

  // A MYT window between acquisitions includes no campaign demo leads.
  await applyDates("2026-10-20", "2026-10-23");
  await expect(confirmedLeads.getByText("0", { exact: true })).toBeVisible();
});
