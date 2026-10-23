import { expect, test } from "@playwright/test";

// Every external request is intercepted: no live Supabase, API, or youth records.
const API = "http://127.0.0.1:3001/v1";
const AUTH = "http://127.0.0.1:4000";
const allowOrigin = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,apikey,content-type",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "content-type": "application/json",
};
const json = (route, data, status = 200) =>
  route.fulfill({
    status,
    headers: allowOrigin,
    body: JSON.stringify(data),
  });

async function installSyntheticStaff(page, apiHandler, mfaSatisfied = true) {
  await page.route(`${AUTH}/auth/v1/**`, (route) => {
    if (route.request().url().includes("/token?grant_type=password")) {
      return json(route, {
        access_token: "synthetic-access-token",
        refresh_token: "synthetic-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: { id: "synthetic-staff-id", email: "qa@example.test" },
      });
    }
    if (route.request().url().endsWith("/auth/v1/user")) {
      return json(route, { factors: [] });
    }
    return json(route, {});
  });
  await page.route(`${API}/**`, (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/v1/admin/session") {
      return json(route, {
        id: "synthetic-staff-id",
        displayName: "QA Staff",
        email: "qa@example.test",
        roles: ["ACADEMY_ADMIN"],
        mfaSatisfied,
        authenticatorAssuranceLevel: mfaSatisfied ? "aal2" : "aal1",
      });
    }
    return apiHandler(route, pathname);
  });
}

async function openAdminView(page, path) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Staff email").fill("qa@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill(`qa-${crypto.randomUUID()}`);
  await page.getByRole("button", { name: "Sign in to Admin Console" }).click();
}

test("live-mode notification sender is single-flight and reports real API failures", async ({
  page,
}) => {
  const sends = [];
  let shouldReject = false;
  await installSyntheticStaff(page, (route, path) => {
    if (path === "/v1/admin/notifications") {
      if (route.request().method() === "GET") return json(route, []);
      sends.push(route.request().postDataJSON());
      return json(
        route,
        shouldReject
          ? { message: "Recipient is not accessible in this organization" }
          : { id: "synthetic-send", _count: { receipts: 1 } },
        shouldReject ? 403 : 201,
      );
    }
    if (path === "/v1/admin/operations-data/offerings") {
      return json(route, [
        {
          id: "offering-a",
          name: "Synthetic U12",
          programmeName: "Synthetic Academy",
          venueName: "Synthetic Court",
          status: "OPEN",
          enrolledCount: 1,
        },
      ]);
    }
    if (path === "/v1/admin/operations-data/guardians") {
      return json(route, []);
    }
    return json(route, []);
  });
  await openAdminView(page, "/notifications");
  await expect(page.getByText("Compose a family notification")).toBeVisible();
  await page.locator("#notice-audience").selectOption("OFFERING");
  await page.locator("#notice-target").selectOption("offering-a");
  await page.locator("#notice-title").fill("Synthetic court change");
  await page
    .locator("#notice-message")
    .fill("Synthetic message, not delivered.");

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Send in-app notification" }).click();
  expect(sends).toHaveLength(0);

  await page.locator("#notice-audience").selectOption("USER");
  await page.locator("#notice-audience").selectOption("OFFERING");
  await expect(page.locator("#notice-target")).toHaveValue("");
  await page.locator("#notice-target").selectOption("offering-a");

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator("form")
    .first()
    .evaluate((form) => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
  await expect.poll(() => sends.length).toBe(1);
  expect(sends[0].audience).toBe("OFFERING");
  expect(sends[0].programmeOfferingId).toBe("offering-a");

  shouldReject = true;
  await page.locator("#notice-target").selectOption("offering-a");
  await page.locator("#notice-title").fill("Synthetic failure");
  await page.locator("#notice-message").fill("Synthetic failure message.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Send in-app notification" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recipient is not accessible" }),
  ).toBeVisible();
});

test("AAL1 staff cannot access notification composer", async ({ page }) => {
  await installSyntheticStaff(page, (route) => json(route, []), false);
  await openAdminView(page, "/notifications");
  await expect(page.getByText("MFA verification required")).toBeVisible();
  await expect(page.getByText("Compose a family notification")).toHaveCount(0);
});

test("late roster A cannot overwrite B, and attendance uses canonical athlete IDs", async ({
  page,
}) => {
  const sessionA = "00000000-0000-4000-8000-000000000001";
  const sessionB = "00000000-0000-4000-8000-000000000002";
  const athleteB = "00000000-0000-4000-8000-000000000003";
  const at = "2026-11-14T08:00:00.000Z";
  const sessions = [sessionA, sessionB].map((id, index) => ({
    id,
    programmeOfferingId: "offering-a",
    title: index ? "Session B" : "Session A",
    startsAt: at,
    endsAt: "2026-11-14T09:00:00.000Z",
    venueName: "Synthetic Court",
    courtName: null,
    coachName: null,
    notes: null,
    status: "SCHEDULED",
    cancellationReason: null,
    _count: { attendances: 0 },
  }));
  let resolveA;
  let sawLateA = false;
  const delayedA = new Promise((resolve) => {
    resolveA = resolve;
  });
  const writes = [];
  let attendance = "UNMARKED";
  await installSyntheticStaff(page, async (route, path) => {
    if (
      path === "/v1/admin/scheduling/sessions" &&
      route.request().method() === "GET"
    ) {
      return json(route, sessions);
    }
    if (path === "/v1/admin/operations-data/offerings") return json(route, []);
    if (path.endsWith(`/${sessionA}/roster`)) {
      await delayedA;
      sawLateA = true;
      return json(route, {
        sessionId: sessionA,
        programmeOfferingId: "offering-a",
        players: [
          {
            athleteId: "athlete-a",
            athleteName: "Player A",
            attendanceStatus: "UNMARKED",
          },
        ],
      });
    }
    if (path.endsWith(`/${sessionB}/roster`)) {
      return json(route, {
        sessionId: sessionB,
        programmeOfferingId: "offering-a",
        players: [
          {
            athleteId: athleteB,
            athleteName: "Player B",
            attendanceStatus: attendance,
          },
        ],
      });
    }
    if (
      path.endsWith(`/${sessionB}/attendance`) &&
      route.request().method() === "PUT"
    ) {
      writes.push(route.request().postDataJSON());
      attendance = "PRESENT";
      return json(route, { status: "PRESENT" });
    }
    return json(route, []);
  });
  await openAdminView(page, "/scheduling");
  await expect(page.getByText("Session A", { exact: true })).toBeVisible();
  await page
    .getByText("Session A", { exact: true })
    .locator("xpath=ancestor::article")
    .getByRole("button", { name: /Attendance/ })
    .click();
  await page
    .getByText("Session B", { exact: true })
    .locator("xpath=ancestor::article")
    .getByRole("button", { name: /Attendance/ })
    .click();
  await expect(page.getByText("Player B")).toBeVisible();
  resolveA();
  await expect.poll(() => sawLateA).toBe(true);
  await expect(page.getByText("Player B")).toBeVisible();
  await expect(page.getByText("Player A")).toHaveCount(0);
  const select = page.getByRole("combobox", {
    name: "Attendance for Player B",
  });
  await expect(select.locator('option[value="UNMARKED"]')).toHaveText(
    "Not marked",
  );
  await select.selectOption("PRESENT");
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toEqual({ athleteId: athleteB, status: "PRESENT" });
});
