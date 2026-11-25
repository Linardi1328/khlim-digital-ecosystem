import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = process.env.RIC191_SCREENSHOT_DIR || "";

async function maybeCapture(page, filename, fullPage = false) {
  if (!SCREENSHOT_DIR) return;
  const vp = page.viewportSize();
  if (!vp || vp.width < 1024) return;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('[role="dialog"] *').forEach((el) => {
      if (el.scrollTop > 0) el.scrollTop = 0;
    });
  });
  await page.waitForTimeout(80);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage,
  });
}

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

const SYNTHETIC_PROGRAMMES = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    code: "ACAD-U12",
    name: "KHLIM Academy U12",
    description: "Synthetic U12 programme",
    sportCode: "BASKETBALL",
    sportName: "Basketball",
    minimumAge: 10,
    maximumAge: 12,
    level: "DEVELOPMENT",
    active: true,
    offeringsCount: 1,
  },
];

const SYNTHETIC_VENUES = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    name: "Sports Garage (Synthetic)",
    address: "Petaling Jaya, Selangor",
    courts: [],
    activeOfferingsCount: 0,
    upcomingSessionsCount: 0,
    closurePeriods: [],
  },
];

function makeSyntheticSession(overrides = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    programmeOfferingId: "00000000-0000-4000-8000-000000000301",
    name: "Ages 10–12 Saturday (Synthetic)",
    publicationState: "PUBLISHED",
    version: 1,
    programme: {
      id: "00000000-0000-4000-8000-000000000101",
      name: "KHLIM Academy U12",
      minimumAge: 10,
      maximumAge: 12,
    },
    venue: {
      id: "00000000-0000-4000-8000-000000000201",
      name: "Sports Garage (Synthetic)",
      address: "Petaling Jaya, Selangor",
    },
    capacity: 20,
    seatsRemaining: 19,
    seatCounts: {
      RECEIVED: 1,
      UNDER_REVIEW: 0,
      CONFIRMED: 1,
      REJECTED: 0,
      CANCELLED: 0,
    },
    enrollmentOpensAt: null,
    enrollmentClosesAt: null,
    coachDisplayName: "Coach Sengjun",
    weekday: 6,
    startTime: "14:00",
    endTime: "16:00",
    timezone: "Asia/Kuala_Lumpur",
    firstSessionDate: "2026-12-19",
    recurrence: "WEEKLY",
    ageReferenceRule: "FIXED_DATE",
    ageReferenceDate: "2026-12-31",
    publishedAt: "2026-12-01T02:00:00.000Z",
    closedAt: null,
    createdAt: "2026-12-01T01:00:00.000Z",
    updatedAt: "2026-12-01T02:00:00.000Z",
    ...overrides,
  };
}

function makeSyntheticPolicyContent(suffix = "v1") {
  const hash = (d, idx) => `${d.repeat(63)}${idx}`;
  return {
    GUARDIAN_AUTHORITY: {
      en: {
        ref: `synthetic://academy-registration/guardian-authority/${suffix}`,
        sha256: hash("1", 1),
      },
      ms: {
        ref: `synthetic://academy-registration/guardian-authority/${suffix}`,
        sha256: hash("1", 2),
      },
      "zh-Hans": {
        ref: `synthetic://academy-registration/guardian-authority/${suffix}`,
        sha256: hash("1", 3),
      },
    },
    REGISTRATION_PRIVACY: {
      en: {
        ref: `synthetic://academy-registration/registration-privacy/${suffix}`,
        sha256: hash("2", 1),
      },
      ms: {
        ref: `synthetic://academy-registration/registration-privacy/${suffix}`,
        sha256: hash("2", 2),
      },
      "zh-Hans": {
        ref: `synthetic://academy-registration/registration-privacy/${suffix}`,
        sha256: hash("2", 3),
      },
    },
    MARKETING: {
      en: {
        ref: `synthetic://academy-registration/marketing/${suffix}`,
        sha256: hash("3", 1),
      },
      ms: {
        ref: `synthetic://academy-registration/marketing/${suffix}`,
        sha256: hash("3", 2),
      },
      "zh-Hans": {
        ref: `synthetic://academy-registration/marketing/${suffix}`,
        sha256: hash("3", 3),
      },
    },
    PHOTOGRAPHY: {
      en: {
        ref: `synthetic://academy-registration/photography/${suffix}`,
        sha256: hash("4", 1),
      },
      ms: {
        ref: `synthetic://academy-registration/photography/${suffix}`,
        sha256: hash("4", 2),
      },
      "zh-Hans": {
        ref: `synthetic://academy-registration/photography/${suffix}`,
        sha256: hash("4", 3),
      },
    },
  };
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
    ],
    ...overrides,
  };
}

test.describe("RIC-191 Admin Academy Registrations, Sessions & Consent Policies", () => {
  test("Authoritative session filter, POST search (HTTP 200, MY local & E.164 phone), detail, and status transitions", async ({
    page,
  }) => {
    let currentDetail = makeSyntheticDetail();
    const listUrls = [];
    const searchBodies = [];
    const patchBodies = [];

    // Authoritative session list includes a 3rd session NOT present on page 1 of registrations!
    await page.route(/\/v1\/admin\/academy\/registration-sessions$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            makeSyntheticSession(),
            makeSyntheticSession({
              id: "00000000-0000-4000-8000-000000000003",
              name: "Off-Page Draft Cohort (Synthetic)",
              publicationState: "DRAFT",
            }),
          ],
        }),
      }),
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations\/search$/,
      async (route) => {
        const body = route.request().postDataJSON();
        searchBodies.push(body);
        await route.fulfill({
          status: 200,
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

    // Authoritative session filter includes off-page session independently of table rows
    const sessionSelect = page.getByTestId("registration-session-filter");
    await expect(sessionSelect).toContainText(
      "Off-Page Draft Cohort (Synthetic)",
    );

    // Minimal PII in list table
    await expect(page.getByText("KAR-7H3QK9XM")).toBeVisible();
    await expect(page.locator("table")).not.toContainText("+60123456789");
    await expect(page.locator("table")).not.toContainText("2015-03-02");

    // Malaysian local phone POST search (HTTP 200, never in URL)
    const searchBox = page.getByPlaceholder(/Search player, guardian/i);
    await searchBox.fill("012-3456789");
    await expect.poll(() => searchBodies.length).toBeGreaterThan(0);
    expect(searchBodies[searchBodies.length - 1].q).toBe("012-3456789");
    expect(page.url()).not.toContain("012-3456789");
    for (const url of listUrls) {
      expect(url).not.toContain("q=");
    }

    // E.164 phone POST search
    const prevCount = searchBodies.length;
    await searchBox.fill("+60123456789");
    await expect.poll(() => searchBodies.length).toBeGreaterThan(prevCount);
    expect(searchBodies[searchBodies.length - 1].q).toBe("+60123456789");

    // Open audited Detail Drawer & transition RECEIVED -> CONFIRMED -> CANCELLED
    await page.getByTestId("review-registration-reg-syn-001").click();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();

    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    const confirmDialog = page.getByRole("dialog", {
      name: /Change status to CONFIRMED/i,
    });
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(
      "does not confirm payment collection",
    );

    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await expect(page.getByTestId("status-update-feedback")).toContainText(
      "CONFIRMED",
    );
    expect(patchBodies[0]).toEqual({
      status: "CONFIRMED",
      expectedVersion: 1,
    });

    await page.selectOption("#registration-next-status", "CANCELLED");
    await expect(page.getByTestId("open-status-confirm-btn")).toBeDisabled();
    await page.selectOption("#registration-reason-code", "GUARDIAN_REQUEST");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();

    expect(patchBodies[1]).toEqual({
      status: "CANCELLED",
      reasonCode: "GUARDIAN_REQUEST",
      expectedVersion: 2,
    });
    await expect(page.getByTestId("terminal-status-notice")).toBeVisible();
  });

  test("Functional Admin Training Sessions: empty state, incomplete draft create, edit, incomplete publish rejection, publish with approvals, stale version, and terminal close", async ({
    page,
  }) => {
    let sessionsStore = [];
    const createBodies = [];
    const patchBodies = [];
    const publishBodies = [];
    const closeBodies = [];

    await page.route(/\/v1\/admin\/academy\/registrations(\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      }),
    );

    await page.route(/\/v1\/admin\/operations-data\/programmes$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_PROGRAMMES),
      }),
    );

    await page.route(/\/v1\/admin\/operations-data\/venues$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_VENUES),
      }),
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions$/,
      async (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ items: sessionsStore }),
          });
        }
        const body = route.request().postDataJSON();
        createBodies.push(body);
        const created = makeSyntheticSession({
          id: "00000000-0000-4000-8000-000000000501",
          name: body.name,
          capacity: body.capacity,
          seatsRemaining: body.capacity,
          seatCounts: {
            RECEIVED: 0,
            UNDER_REVIEW: 0,
            CONFIRMED: 0,
            REJECTED: 0,
            CANCELLED: 0,
          },
          publicationState: "DRAFT",
          version: 1,
          coachDisplayName: body.coachDisplayName ?? null,
          weekday: body.weekday ?? null,
          startTime: body.startTime ?? null,
          endTime: body.endTime ?? null,
          firstSessionDate: body.firstSessionDate ?? null,
          recurrence: body.recurrence ?? null,
          ageReferenceRule: body.ageReferenceRule ?? null,
          ageReferenceDate: body.ageReferenceDate ?? null,
          publishedAt: null,
          closedAt: null,
        });
        sessionsStore = [created];
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(created),
        });
      },
    );

    let patchCalls = 0;
    await page.route(
      /\/v1\/admin\/academy\/registration-sessions\/00000000-0000-4000-8000-000000000501$/,
      async (route) => {
        patchCalls += 1;
        const body = route.request().postDataJSON();
        patchBodies.push(body);
        // First PATCH simulates STALE_VERSION
        if (patchCalls === 1) {
          sessionsStore = [{ ...sessionsStore[0], version: 2 }];
          return route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 409,
              code: "STALE_VERSION",
              message: "stale version",
            }),
          });
        }
        const updated = {
          ...sessionsStore[0],
          ...body,
          version: sessionsStore[0].version + 1,
        };
        sessionsStore = [updated];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updated),
        });
      },
    );

    let publishCalls = 0;
    await page.route(
      /\/v1\/admin\/academy\/registration-sessions\/00000000-0000-4000-8000-000000000501\/publish$/,
      async (route) => {
        publishCalls += 1;
        const body = route.request().postDataJSON();
        publishBodies.push(body);
        if (publishCalls === 1) {
          return route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 409,
              code: "SESSION_INCOMPLETE",
              message: "incomplete",
              fieldErrors: [
                { field: "firstSessionDate", code: "REQUIRED" },
                { field: "programme.sport", code: "INVALID_VALUE" },
              ],
            }),
          });
        }
        const published = {
          ...sessionsStore[0],
          publicationState: "PUBLISHED",
          version: sessionsStore[0].version + 1,
          publishedAt: "2026-12-02T03:00:00.000Z",
        };
        sessionsStore = [published];
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(published),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions\/00000000-0000-4000-8000-000000000501\/close$/,
      async (route) => {
        const body = route.request().postDataJSON();
        closeBodies.push(body);
        const closed = {
          ...sessionsStore[0],
          publicationState: "CLOSED",
          version: sessionsStore[0].version + 1,
          closedAt: "2026-12-03T03:00:00.000Z",
        };
        sessionsStore = [closed];
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(closed),
        });
      },
    );

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Training Sessions/i }).click();

    // 1) Empty state
    await expect(page.getByTestId("sessions-empty-state")).toBeVisible();
    await maybeCapture(page, "15-admin-sessions-empty.png", true);

    // 2) Create incomplete draft (nullable schedule fields left blank!)
    await page.getByTestId("create-session-draft-btn").click();
    await expect(page.getByTestId("session-editor-form")).toBeVisible();
    await page.selectOption(
      "#session-programme-id",
      "00000000-0000-4000-8000-000000000101",
    );
    await page.fill("#session-name", "Synthetic U12 Draft");
    await page.selectOption(
      "#session-venue-id",
      "00000000-0000-4000-8000-000000000201",
    );
    await page.fill("#session-capacity", "18");
    await maybeCapture(page, "16-admin-session-form.png");

    await page.getByTestId("save-session-btn").click();
    await expect(page.getByTestId("sessions-action-banner")).toContainText(
      "Synthetic U12 Draft",
    );
    expect(createBodies[0].weekday).toBeNull();
    expect(createBodies[0].firstSessionDate).toBeNull();

    // 3) Edit draft -> first hits STALE_VERSION (refreshes list, never silently retries)
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000501")
      .click();
    await page.fill("#session-coach-name", "Coach Sengjun");
    await page.selectOption("#session-weekday", "6");
    await page.fill("#session-start-time", "14:00");
    await page.fill("#session-end-time", "16:00");
    await page.fill("#session-first-date", "2026-12-19");
    await page.selectOption("#session-recurrence", "WEEKLY");
    await page.selectOption("#session-age-rule", "FIXED_DATE");
    await page.fill("#session-age-ref-date", "2026-12-31");
    await page.getByTestId("save-session-btn").click();

    await expect(page.getByTestId("session-form-error")).toContainText(
      "modified by another administrator",
    );
    expect(patchCalls).toBe(1);

    // Close & re-open edit with refreshed v2 -> saves cleanly
    await page.getByRole("button", { name: "Cancel" }).click();
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000501")
      .click();
    await page.fill("#session-coach-name", "Coach Sengjun");
    await page.selectOption("#session-weekday", "6");
    await page.fill("#session-start-time", "14:00");
    await page.fill("#session-end-time", "16:00");
    await page.fill("#session-first-date", "2026-12-19");
    await page.selectOption("#session-recurrence", "WEEKLY");
    await page.selectOption("#session-age-rule", "FIXED_DATE");
    await page.fill("#session-age-ref-date", "2026-12-31");
    await page.getByTestId("save-session-btn").click();
    await expect(page.getByTestId("sessions-action-banner")).toContainText(
      "updated (v3)",
    );
    expect(patchBodies[1].expectedVersion).toBe(2);

    // 4) Publish dialog -> both checkboxes start unchecked, button disabled until both checked
    await page
      .getByTestId("publish-session-00000000-0000-4000-8000-000000000501")
      .click();
    await expect(page.locator("#publish-schedule-approved")).not.toBeChecked();
    await expect(page.locator("#publish-age-rule-approved")).not.toBeChecked();
    const publishConfirmBtn = page.getByRole("button", {
      name: "Publish Session",
    });
    await expect(publishConfirmBtn).toBeDisabled();

    await page.check("#publish-schedule-approved");
    await expect(publishConfirmBtn).toBeDisabled();
    await page.check("#publish-age-rule-approved");
    await expect(publishConfirmBtn).toBeEnabled();
    await maybeCapture(page, "17-admin-session-publish-dialog.png");

    // First publish returns SESSION_INCOMPLETE (displays server fieldErrors)
    await publishConfirmBtn.click();
    await expect(page.getByTestId("publish-session-error")).toContainText(
      "Programme sport",
    );

    // Second publish succeeds -> PUBLISHED
    await publishConfirmBtn.click();
    await expect(page.getByTestId("sessions-action-banner")).toContainText(
      "PUBLISHED",
    );
    expect(publishBodies[1]).toEqual({
      expectedVersion: 3,
      approvals: { scheduleApproved: true, ageRuleApproved: true },
    });
    await maybeCapture(page, "18-admin-sessions-list.png", true);

    // 5) Close published session -> explicit confirmation -> terminal CLOSED (no edit/reopen)
    await page
      .getByTestId("close-session-00000000-0000-4000-8000-000000000501")
      .click();
    const closeDialog = page.getByRole("dialog", { name: /Close /i });
    await expect(closeDialog).toContainText("terminal");
    await maybeCapture(page, "19-admin-session-close-dialog.png");

    await page.getByRole("button", { name: "Close Session" }).click();
    await expect(page.getByTestId("sessions-action-banner")).toContainText(
      "CLOSED",
    );
    expect(closeBodies[0]).toEqual({ expectedVersion: 4 });
    await expect(
      page.getByTestId(
        "session-closed-terminal-00000000-0000-4000-8000-000000000501",
      ),
    ).toBeVisible();
    await expect(
      page.getByTestId("edit-session-00000000-0000-4000-8000-000000000501"),
    ).toHaveCount(0);
  });

  test("Functional Admin Consent Policies: no current policy, create draft, approve & replace, retire, stale version, and ACADEMY_ADMIN role boundary", async ({
    page,
    viewport,
  }) => {
    let policyState = {
      current: null,
      items: [],
    };
    const approveBodies = [];
    const retireBodies = [];

    await page.route(/\/v1\/admin\/academy\/registrations(\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      }),
    );

    await page.route(/\/v1\/admin\/academy\/registration-sessions$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-policies$/,
      async (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(policyState),
          });
        }
        const body = route.request().postDataJSON();
        const created = {
          id: `pol-${policyState.items.length + 1}`,
          policyVersion: body.policyVersion,
          status: "DRAFT",
          version: 1,
          content: body.content,
          approvedAt: null,
          retiredAt: null,
          createdAt: "2026-12-01T01:00:00.000Z",
          updatedAt: "2026-12-01T01:00:00.000Z",
        };
        policyState = {
          ...policyState,
          items: [created, ...policyState.items],
        };
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(created),
        });
      },
    );

    let approveAttempt = 0;
    await page.route(
      /\/v1\/admin\/academy\/registration-policies\/pol-\d+\/approve$/,
      async (route) => {
        approveAttempt += 1;
        const body = route.request().postDataJSON();
        approveBodies.push(body);
        const id = route.request().url().split("/").slice(-2)[0];

        // Simulate STALE_VERSION on first approve attempt for pol-1
        if (approveAttempt === 1) {
          policyState = {
            ...policyState,
            items: policyState.items.map((p) =>
              p.id === id ? { ...p, version: 2 } : p,
            ),
          };
          return route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 409,
              code: "STALE_VERSION",
              message: "stale version",
            }),
          });
        }

        const prevCurrent = policyState.current;
        const nextItems = policyState.items.map((p) => {
          if (p.id === id) {
            return {
              ...p,
              status: "APPROVED",
              version: p.version + 1,
              approvedAt: "2026-12-02T04:00:00.000Z",
            };
          }
          if (prevCurrent && p.id === prevCurrent.id) {
            // Replacement automatically retires previously approved policy & increments its version
            return {
              ...p,
              status: "RETIRED",
              version: p.version + 1,
              retiredAt: "2026-12-02T04:00:00.000Z",
            };
          }
          return p;
        });
        const newCurrent = nextItems.find((p) => p.id === id) ?? null;
        policyState = { current: newCurrent, items: nextItems };
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newCurrent),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-policies\/pol-\d+\/retire$/,
      async (route) => {
        const body = route.request().postDataJSON();
        retireBodies.push(body);
        const id = route.request().url().split("/").slice(-2)[0];
        const nextItems = policyState.items.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "RETIRED",
                version: p.version + 1,
                retiredAt: "2026-12-03T04:00:00.000Z",
              }
            : p,
        );
        const retired = nextItems.find((p) => p.id === id);
        policyState = {
          current: policyState.current?.id === id ? null : policyState.current,
          items: nextItems,
        };
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(retired),
        });
      },
    );

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Consent Policies/i }).click();

    // 1) No current approved policy -> clear closed warning
    await expect(
      page.getByTestId("no-current-approved-policy-card"),
    ).toBeVisible();
    await maybeCapture(page, "20-admin-policies-empty.png", true);

    // 2) Create synthetic policy draft
    await page.getByTestId("create-policy-draft-btn").click();
    await expect(page.getByTestId("policy-create-form")).toBeVisible();
    await page.fill("#policy-version-input", "SYNTHETIC-V1");
    const sampleContent = makeSyntheticPolicyContent("v1");
    for (const [cat, byLocale] of Object.entries(sampleContent)) {
      for (const [loc, val] of Object.entries(byLocale)) {
        await page.fill(`#policy-ref-${cat}-${loc}`, val.ref);
        await page.fill(`#policy-sha-${cat}-${loc}`, val.sha256);
      }
    }
    await maybeCapture(page, "21-admin-policy-create-form.png");

    await page.getByTestId("submit-policy-draft-btn").click();
    await expect(page.getByTestId("policies-action-banner")).toContainText(
      "SYNTHETIC-V1",
    );

    // 3) Approve draft -> first hits STALE_VERSION (refreshes to v2, no silent retry)
    await page.getByTestId("approve-policy-pol-1").click();
    await page.getByRole("button", { name: "Approve Policy" }).click();
    await expect(page.getByTestId("policies-action-banner")).toContainText(
      "modified by another administrator",
    );
    expect(approveBodies[0]).toEqual({ expectedVersion: 1 });

    // Second approve succeeds using refreshed v2 -> becomes Current Approved Policy
    await page.getByTestId("approve-policy-pol-1").click();
    await page.getByRole("button", { name: "Approve Policy" }).click();
    await expect(
      page.getByTestId("current-approved-policy-card"),
    ).toContainText("SYNTHETIC-V1");
    expect(approveBodies[1]).toEqual({ expectedVersion: 2 });
    await maybeCapture(page, "22-admin-policies-active.png", true);

    // 4) Add a 2nd draft and approve replacement -> dialog warns previous policy will retire
    policyState = {
      ...policyState,
      items: [
        {
          id: "pol-2",
          policyVersion: "SYNTHETIC-V2",
          status: "DRAFT",
          version: 1,
          content: makeSyntheticPolicyContent("v2"),
          approvedAt: null,
          retiredAt: null,
          createdAt: "2026-12-02T01:00:00.000Z",
          updatedAt: "2026-12-02T01:00:00.000Z",
        },
        ...policyState.items,
      ],
    };
    await page.getByRole("button", { name: "Refresh" }).click();
    await page.getByTestId("approve-policy-pol-2").click();
    const approveReplacementDialog = page.getByRole("dialog", {
      name: /Approve policy "SYNTHETIC-V2"/i,
    });
    await expect(approveReplacementDialog).toContainText(
      "automatically retires the currently approved policy",
    );
    await maybeCapture(page, "23-admin-policy-approve-dialog.png");

    await page.getByRole("button", { name: "Approve Policy" }).click();
    await expect(
      page.getByTestId("current-approved-policy-card"),
    ).toContainText("SYNTHETIC-V2");

    // 5) ACADEMY_ADMIN role boundary: must NOT see Approve or Retire controls
    if (viewport && viewport.width >= 1024) {
      await page
        .getByRole("button", { name: "Switch active work view" })
        .click();
      await page
        .getByRole("menuitemradio", { name: "ACADEMY ADMIN", exact: true })
        .click();
      await expect(page.getByTestId("policy-authority-readonly")).toBeVisible();
      await expect(page.getByTestId("retire-current-policy-btn")).toHaveCount(
        0,
      );
      await expect(page.getByTestId("retire-policy-pol-2")).toHaveCount(0);

      // Switch back to SUPER_ADMIN to test retirement
      await page
        .getByRole("button", { name: "Switch active work view" })
        .click();
      await page
        .getByRole("menuitemradio", { name: "SUPER ADMIN", exact: true })
        .click();
    }

    // 6) Retire current policy -> dialog warns registration closes -> current becomes null
    await page.getByTestId("retire-current-policy-btn").click();
    const retireDialog = page.getByRole("dialog", {
      name: /Retire policy "SYNTHETIC-V2"/i,
    });
    await expect(retireDialog).toContainText(
      "immediately closes public Academy registration",
    );
    await maybeCapture(page, "24-admin-policy-retire-dialog.png");

    await page.getByRole("button", { name: "Retire Policy" }).click();
    await expect(
      page.getByTestId("no-current-approved-policy-card"),
    ).toBeVisible();
    expect(retireBodies[0]).toEqual({ expectedVersion: 2 });
  });

  test("Handles 401/403 sensitive-state cleanup, session filter retry, and zero horizontal overflow across 7 viewports", async ({
    page,
  }) => {
    const listPattern = /\/v1\/admin\/academy\/registrations(\?.*)?$/;
    const sessionsPattern = /\/v1\/admin\/academy\/registration-sessions$/;

    // 1) Session filter failure -> shows inline Retry button without blocking registrations
    let sessionAttempts = 0;
    await page.route(sessionsPattern, (route) => {
      sessionAttempts += 1;
      if (sessionAttempts === 1) {
        return route.fulfill({ status: 503, body: "unavailable" });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [makeSyntheticSession()] }),
      });
    });
    await page.route(listPattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_LIST),
      }),
    );

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.getByTestId("retry-session-filter-btn")).toBeVisible();
    await page.getByTestId("retry-session-filter-btn").click();
    await expect(page.getByTestId("retry-session-filter-btn")).toHaveCount(0);
    await expect(page.getByTestId("registration-session-filter")).toContainText(
      "Ages 10–12 Saturday (Synthetic)",
    );

    // 2) 401 expiration clears loaded records
    await page.unroute(listPattern);
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
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );
    await expect(page.locator("body")).not.toContainText("KAR-7H3QK9XM");

    // 3) 403 AAL1 / unauthorized
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

    // 4) Zero horizontal overflow across all 7 required viewport widths (360-1440px)
    await page.unroute(listPattern);
    await page.route(listPattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SYNTHETIC_LIST),
      }),
    );
    await page.route(/\/v1\/admin\/academy\/registration-policies$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ current: null, items: [] }),
      }),
    );
    await page.reload({ waitUntil: "networkidle" });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        overflow,
        `Admin /registrations overflow at ${vp.width}px: ${overflow}px`,
      ).toBeLessThanOrEqual(2);
    }
  });
});
