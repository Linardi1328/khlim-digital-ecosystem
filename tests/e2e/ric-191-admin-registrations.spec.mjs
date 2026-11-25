import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = process.env.RIC191_SCREENSHOT_DIR || "";

async function maybeCapture(page, filename, fullPage = false) {
  if (!SCREENSHOT_DIR) return;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage,
  });
}

const SYNTHETIC_LIST = {
  items: [
    {
      id: "reg-syn-001",
      referenceCode: "KAR-7H3QK9XM",
      status: "RECEIVED",
      version: 1,
      sessionId: "00000000-0000-4000-8000-000000000001",
      sessionName: "Ages 10–12 Saturday (Synthetic)",
      playerFullName: "Synthetic Player One",
      ageAtReference: 11,
      createdAt: "2026-12-10T04:21:00.000Z",
      updatedAt: "2026-12-10T04:21:00.000Z",
    },
    {
      id: "reg-syn-002",
      referenceCode: "KAR-9M2PL4VR",
      status: "UNDER_REVIEW",
      version: 2,
      sessionId: "00000000-0000-4000-8000-000000000002",
      sessionName: "Ages 13–15 Saturday (Synthetic)",
      playerFullName: "Synthetic Player Two",
      ageAtReference: 14,
      createdAt: "2026-12-10T05:10:00.000Z",
      updatedAt: "2026-12-10T05:30:00.000Z",
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

function makeSyntheticDetail(overrides = {}) {
  return {
    id: "reg-syn-001",
    referenceCode: "KAR-7H3QK9XM",
    status: "RECEIVED",
    version: 1,
    sessionId: "00000000-0000-4000-8000-000000000001",
    sessionName: "Ages 10–12 Saturday (Synthetic)",
    playerFullName: "Synthetic Player One",
    ageAtReference: 11,
    createdAt: "2026-12-10T04:21:00.000Z",
    updatedAt: "2026-12-10T04:21:00.000Z",
    player: {
      fullName: "Synthetic Player One",
      dateOfBirth: "2015-03-02",
      gender: "MALE",
      jerseySize: "YM",
      phone: null,
    },
    guardian: {
      fullName: "Synthetic Guardian One",
      phone: "+60123456789",
      relationship: "MOTHER",
      authorityConfirmed: true,
    },
    emergencyContact: {
      fullName: "Synthetic Emergency One",
      phone: "+60139876543",
      relationship: "GRANDPARENT",
    },
    source: "3x3-oct24",
    statusReasonCode: null,
    statusChangedAt: null,
    consents: [
      {
        type: "GUARDIAN_AUTHORITY",
        granted: true,
        policyVersion: "SYNTHETIC-EXAMPLE",
        locale: "en",
        contentSha256: "11111111111111111111111111111111",
        acceptedAt: "2026-12-10T04:21:00.000Z",
        withdrawnAt: null,
      },
      {
        type: "REGISTRATION_PRIVACY",
        granted: true,
        policyVersion: "SYNTHETIC-EXAMPLE",
        locale: "en",
        contentSha256: "22222222222222222222222222222222",
        acceptedAt: "2026-12-10T04:21:00.000Z",
        withdrawnAt: null,
      },
      {
        type: "MARKETING",
        granted: false,
        policyVersion: "SYNTHETIC-EXAMPLE",
        locale: "en",
        contentSha256: "33333333333333333333333333333333",
        acceptedAt: "2026-12-10T04:21:00.000Z",
        withdrawnAt: null,
      },
      {
        type: "PHOTOGRAPHY",
        granted: false,
        policyVersion: "SYNTHETIC-EXAMPLE",
        locale: "en",
        contentSha256: "44444444444444444444444444444444",
        acceptedAt: "2026-12-10T04:21:00.000Z",
        withdrawnAt: null,
      },
    ],
    ...overrides,
  };
}

test.describe("RIC-191 Admin Academy Registrations Management", () => {
  test("List, POST search (never in URL), filters, audited detail, confirmation dialog, and valid status transition", async ({
    page,
  }) => {
    let currentDetail = makeSyntheticDetail();
    const listUrls = [];
    const searchBodies = [];
    const patchBodies = [];

    await page.route(
      /\/v1\/admin\/academy\/registrations\/search$/,
      async (route) => {
        const body = route.request().postDataJSON();
        searchBodies.push(body);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...SYNTHETIC_LIST,
            items: [SYNTHETIC_LIST.items[0]],
            total: 1,
          }),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-syn-001\/status$/,
      async (route) => {
        const body = route.request().postDataJSON();
        patchBodies.push(body);
        currentDetail = makeSyntheticDetail({
          status: body.status,
          version: currentDetail.version + 1,
          statusReasonCode: body.reasonCode ?? null,
          statusChangedAt: "2026-12-10T06:00:00.000Z",
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentDetail),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-syn-001$/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentDetail),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations(\?.*)?$/,
      async (route) => {
        listUrls.push(route.request().url());
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SYNTHETIC_LIST),
        });
      },
    );

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Academy Registrations" }),
    ).toBeVisible();
    await expect(page.getByText("KAR-7H3QK9XM")).toBeVisible();
    await expect(page.getByText("Synthetic Player One")).toBeVisible();
    // Minimal PII in list table: guardian phone and DOB must not appear before opening detail
    await expect(page.locator("table")).not.toContainText("+60123456789");
    await expect(page.locator("table")).not.toContainText("2015-03-02");
    await maybeCapture(page, "10-admin-registrations-list.png", true);

    // POST Search: query travels strictly in JSON body, never in URL
    const searchBox = page.getByPlaceholder(/Search player, guardian/i);
    await searchBox.fill("KAR-7H3QK9XM");
    await expect.poll(() => searchBodies.length).toBeGreaterThan(0);
    expect(searchBodies[searchBodies.length - 1].q).toBe("KAR-7H3QK9XM");
    expect(page.url()).not.toContain("KAR-7H3QK9XM");
    for (const url of listUrls) {
      expect(url).not.toContain("q=");
    }

    // Open audited Detail Drawer
    await page.getByTestId("review-registration-reg-syn-001").click();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();
    await expect(page.getByTestId("registration-detail-content")).toContainText(
      "+60123456789",
    );
    await expect(page.getByTestId("registration-detail-content")).toContainText(
      "GUARDIAN_AUTHORITY",
    );
    await maybeCapture(page, "11-admin-registration-detail.png");

    // Transition RECEIVED -> CONFIRMED with confirmation dialog
    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    const confirmDialog = page.getByRole("dialog", {
      name: /Change status to CONFIRMED/i,
    });
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(
      "does not confirm payment collection",
    );
    await maybeCapture(page, "12-admin-status-confirm-dialog.png");

    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await expect(page.getByTestId("status-update-feedback")).toContainText(
      "CONFIRMED",
    );
    expect(patchBodies[0]).toEqual({
      status: "CONFIRMED",
      expectedVersion: 1,
    });

    // Transition CONFIRMED -> CANCELLED requires reason code, then becomes terminal
    await page.selectOption("#registration-next-status", "CANCELLED");
    await expect(page.getByTestId("open-status-confirm-btn")).toBeDisabled();
    await page.selectOption("#registration-reason-code", "GUARDIAN_REQUEST");
    await expect(page.getByTestId("open-status-confirm-btn")).toBeEnabled();
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();

    expect(patchBodies[1]).toEqual({
      status: "CANCELLED",
      reasonCode: "GUARDIAN_REQUEST",
      expectedVersion: 2,
    });
    await expect(page.getByTestId("terminal-status-notice")).toBeVisible();
  });

  test("STALE_VERSION refreshes record without auto-replay, and CAPACITY_EXCEEDED surfaces cleanly", async ({
    page,
  }) => {
    let detailVersion = 1;

    await page.route(/\/v1\/admin\/academy\/registrations(\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_LIST),
      }),
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-syn-001$/,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeSyntheticDetail({
              version: detailVersion,
              status: detailVersion === 1 ? "RECEIVED" : "UNDER_REVIEW",
            }),
          ),
        }),
    );

    let patchAttempt = 0;
    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-syn-001\/status$/,
      (route) => {
        patchAttempt += 1;
        if (patchAttempt === 1) {
          detailVersion = 2;
          return route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 409,
              code: "STALE_VERSION",
              message: "Version conflict",
            }),
          });
        }
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "CAPACITY_EXCEEDED",
            message: "Capacity exceeded",
          }),
        });
      },
    );

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await page.getByTestId("review-registration-reg-syn-001").click();
    await expect(page.getByTestId("registration-detail-content")).toContainText(
      "v1",
    );

    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();

    // Auto-refreshes to v2, never auto-replays PATCH
    await expect(page.getByTestId("status-update-feedback")).toContainText(
      "modified by another administrator",
    );
    await expect(page.getByTestId("registration-detail-content")).toContainText(
      "v2",
    );
    expect(patchAttempt).toBe(1);

    // Second attempt hits CAPACITY_EXCEEDED
    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await expect(page.getByTestId("status-update-feedback")).toContainText(
      "configured seat capacity",
    );
  });

  test("Handles 401 expiration, 403 AAL1/unauthorized, and role-aware Sessions & Policies tabs", async ({
    page,
  }) => {
    // 1) 401 session expiration clears data and prompts re-auth
    const listPattern = /\/v1\/admin\/academy\/registrations(\?.*)?$/;
    await page.route(listPattern, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 401,
          message: "Unauthorized",
          error: "Unauthorized",
        }),
      }),
    );

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );

    // 2) 403 AAL1 / unauthorized
    await page.unroute(listPattern);
    await page.route(listPattern, (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 403,
          message: "MFA AAL2 required",
          error: "Forbidden",
        }),
      }),
    );

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Access Restricted",
    );
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "AAL2 MFA",
    );

    // 3) Sessions and Policies readiness tabs
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await expect(
      page.getByTestId("admin-registration-sessions-panel"),
    ).toBeVisible();
    await expect(
      page.getByTestId("admin-registration-sessions-panel"),
    ).toContainText("Awaiting Codex F4 OpenAPI Response DTOs");

    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await expect(
      page.getByTestId("admin-consent-policies-panel"),
    ).toBeVisible();
    await expect(page.getByTestId("policy-authority-approver")).toBeVisible();
  });
});
