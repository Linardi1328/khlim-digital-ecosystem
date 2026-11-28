import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = process.env.RIC191_SCREENSHOT_DIR || "";
const ADMIN_SUPABASE_SESSION_STORAGE_KEY = "khlim_admin_supabase_session";
const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";
const SECONDARY_ORG_ID = "00000000-0000-4000-8000-000000000002";

async function setupAuthenticatedAdminSession(page, initialOverrides = {}) {
  let currentSession = {
    id: "staff-user-1",
    organizationId: DEFAULT_ORG_ID,
    email: "super@example.test",
    displayName: "Synthetic Super Admin",
    preferredLocale: "en",
    roles: ["SUPER_ADMIN", "ACADEMY_ADMIN"],
    authenticatorAssuranceLevel: "aal2",
    mfaSatisfied: true,
    ...initialOverrides,
  };
  let sessionFetchCount = 0;

  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  await page.addInitScript(
    ({ storageKey, exp }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: "synthetic-e2e-aal2-token",
          refresh_token: "synthetic-e2e-refresh-token",
          expires_in: 3600,
          expires_at: exp,
          token_type: "bearer",
          user: {
            id: "staff-user-1",
            email: "super@example.test",
          },
        }),
      );
    },
    { storageKey: ADMIN_SUPABASE_SESSION_STORAGE_KEY, exp: expiresAt },
  );

  await page.route(/\/v1\/admin\/session$/, (route) => {
    sessionFetchCount += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentSession),
    });
  });

  return {
    setSession(nextOverrides) {
      currentSession = { ...currentSession, ...nextOverrides };
    },
    async switchSession(nextOverrides) {
      const before = sessionFetchCount;
      currentSession = { ...currentSession, ...nextOverrides };
      await page.evaluate((storageKey) => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: storageKey,
            newValue: window.localStorage.getItem(storageKey),
          }),
        );
      }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
      await expect.poll(() => sessionFetchCount).toBeGreaterThan(before);
    },
  };
}

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

function trackRequestSettlement(page, req) {
  return new Promise((resolve) => {
    const onDone = (candidate) => {
      if (candidate !== req) return;
      page.off("requestfinished", onDone);
      page.off("requestfailed", onDone);
      resolve();
    };
    page.on("requestfinished", onDone);
    page.on("requestfailed", onDone);
  });
}

async function flushUiAfterSettled(page, settledPromise) {
  await settledPromise;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
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
    await setupAuthenticatedAdminSession(page);
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
    await expect(page.getByTestId("terminal-status-notice")).toBeVisible();

    expect(patchBodies[1]).toEqual({
      status: "CANCELLED",
      reasonCode: "GUARDIAN_REQUEST",
      expectedVersion: 2,
    });
  });

  test("Functional Admin Training Sessions: empty state, incomplete draft create, edit, incomplete publish rejection, publish with approvals, stale version, and terminal close", async ({
    page,
  }) => {
    await setupAuthenticatedAdminSession(page);
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
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(sessionsStore[0]),
          });
        }
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

    // 3) Edit draft -> verify accessible locked Programme label, then hit STALE_VERSION
    // (disables Save, shows attempted changes, requires explicit reload into editor)
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000501")
      .click();
    await expect(
      page.getByLabel("Programme (locked after creation)"),
    ).toHaveValue("KHLIM Academy U12");
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
    await expect(page.getByTestId("save-session-btn")).toBeDisabled();
    await expect(
      page.getByTestId("session-stale-conflict-panel"),
    ).toContainText("Coach Sengjun");
    expect(patchCalls).toBe(1);

    // Explicitly load refreshed v2 into editor -> review comparison -> re-apply and save cleanly
    await page.getByTestId("reload-refreshed-session-btn").click();
    await expect(page.getByTestId("session-conflict-comparison")).toContainText(
      "Loaded latest version (v2)",
    );
    await expect(page.getByTestId("save-session-btn")).toBeEnabled();
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

  test("Functional Admin Consent Policies: no current policy, create draft, approve & replace with predecessor binding, retire, stale version, and ACADEMY_ADMIN role boundary", async ({
    page,
  }) => {
    const auth = await setupAuthenticatedAdminSession(page);
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
    const initialApproveDialog = page.getByRole("dialog", {
      name: /Approve policy "SYNTHETIC-V1"/i,
    });
    await expect(initialApproveDialog).toContainText(
      "No currently approved consent policy will be retired",
    );
    await page.getByRole("button", { name: "Approve Policy" }).click();
    await expect(page.getByTestId("policies-action-banner")).toContainText(
      "modified by another administrator",
    );
    expect(approveBodies[0]).toEqual({
      expectedVersion: 1,
      expectedApprovedPolicyId: null,
      expectedApprovedPolicyVersion: null,
    });

    // Second approve succeeds using refreshed v2 -> becomes Current Approved Policy (v3)
    await page.getByTestId("approve-policy-pol-1").click();
    await page.getByRole("button", { name: "Approve Policy" }).click();
    await expect(
      page.getByTestId("current-approved-policy-card"),
    ).toContainText("SYNTHETIC-V1");
    expect(approveBodies[1]).toEqual({
      expectedVersion: 2,
      expectedApprovedPolicyId: null,
      expectedApprovedPolicyVersion: null,
    });
    await maybeCapture(page, "22-admin-policies-active.png", true);

    // 4) Add a 2nd draft and approve replacement -> dialog names exact predecessor & sends predecessor binding
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
      "automatically retires the currently approved policy (SYNTHETIC-V1, v3)",
    );
    await maybeCapture(page, "23-admin-policy-approve-dialog.png");

    await page.getByRole("button", { name: "Approve Policy" }).click();
    await expect(
      page.getByTestId("current-approved-policy-card"),
    ).toContainText("SYNTHETIC-V2");
    expect(approveBodies[2]).toEqual({
      expectedVersion: 1,
      expectedApprovedPolicyId: "pol-1",
      expectedApprovedPolicyVersion: 3,
    });

    // 5) ACADEMY_ADMIN server-authoritative role boundary across all viewports
    policyState = {
      ...policyState,
      items: [
        {
          id: "pol-3",
          policyVersion: "SYNTHETIC-V3-DRAFT",
          status: "DRAFT",
          version: 1,
          content: makeSyntheticPolicyContent("v3"),
          approvedAt: null,
          retiredAt: null,
          createdAt: "2026-12-03T01:00:00.000Z",
          updatedAt: "2026-12-03T01:00:00.000Z",
        },
        ...policyState.items,
      ],
    };
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByTestId("approve-policy-pol-3")).toBeVisible();
    await expect(page.getByTestId("retire-policy-pol-3")).toBeVisible();

    await auth.switchSession({ roles: ["ACADEMY_ADMIN"] });
    await expect(page.getByTestId("policy-authority-readonly")).toBeVisible();
    await expect(page.getByTestId("approve-policy-pol-3")).toHaveCount(0);
    await expect(page.getByTestId("retire-current-policy-btn")).toHaveCount(0);
    await expect(page.getByTestId("retire-policy-pol-2")).toHaveCount(0);
    await expect(page.getByTestId("retire-policy-pol-3")).toHaveCount(0);

    // Restore SUPER_ADMIN session to confirm draft approval returns and test retirement
    await auth.switchSession({ roles: ["SUPER_ADMIN", "ACADEMY_ADMIN"] });
    await expect(page.getByTestId("approve-policy-pol-3")).toBeVisible();

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
    await setupAuthenticatedAdminSession(page);
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

    // 2) 401 expiration clears already-mounted records without reloading the page
    await expect(page.locator("body")).toContainText("KAR-7H3QK9XM");
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
    // Trigger an in-place refetch on the mounted registrations list (no page reload)
    await page.selectOption("#registration-status-filter", "RECEIVED");
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

  test("CR-25 same-user, same-role organization switching isolates delayed reads, mutations, STALE_VERSION follow-ups, and 401 cleanup", async ({
    page,
  }) => {
    const auth = await setupAuthenticatedAdminSession(page, {
      id: "staff-user-1",
      roles: ["SUPER_ADMIN"],
      organizationId: DEFAULT_ORG_ID,
    });

    let contextPhase = "OLD_CONTEXT";
    let listRequestsInNewContext = 0;

    const oldSummary = {
      id: "reg-old-1",
      referenceCode: "KAR-OLDORG01",
      status: "RECEIVED",
      version: 1,
      sessionId: "00000000-0000-4000-8000-000000000301",
      sessionName: "Old Context Session",
      playerFullName: "Synthetic Old Org Player",
      guardianFullName: "Synthetic Old Org Guardian",
      source: "old-org",
      createdAt: "2026-12-01T01:00:00.000Z",
      updatedAt: "2026-12-01T01:00:00.000Z",
    };
    const oldDetail = makeSyntheticDetail({
      id: "reg-old-1",
      referenceCode: "KAR-OLDORG01",
      status: "RECEIVED",
      version: 1,
      player: {
        fullName: "Synthetic Old Org Player",
        dateOfBirth: "2015-03-02",
        gender: "MALE",
        jerseySize: "YM",
        phone: null,
      },
      guardian: {
        fullName: "Synthetic Old Org Guardian",
        phone: "+60129990001",
        relationship: "MOTHER",
        authorityConfirmed: true,
      },
    });

    const oldSession = makeSyntheticSession({
      id: "00000000-0000-4000-8000-000000000901",
      name: "Old Org Session Alpha",
      publicationState: "PUBLISHED",
      version: 2,
    });
    const oldPolicy = {
      id: "pol-old-1",
      policyVersion: "SYNTHETIC-OLD-POL",
      status: "APPROVED",
      version: 2,
      content: makeSyntheticPolicyContent("v1"),
      approvedAt: "2026-12-01T02:00:00.000Z",
      retiredAt: null,
      createdAt: "2026-12-01T01:00:00.000Z",
      updatedAt: "2026-12-01T02:00:00.000Z",
    };

    // Deferred gates for deterministic stale-response ordering
    let releasePatchSuccess;
    const patchSuccessGate = new Promise((resolve) => {
      releasePatchSuccess = resolve;
    });
    let patchSuccessStarted;
    const patchSuccessStartedPromise = new Promise((resolve) => {
      patchSuccessStarted = resolve;
    });

    let releaseFollowUpDetail;
    const followUpDetailGate = new Promise((resolve) => {
      releaseFollowUpDetail = resolve;
    });
    let followUpDetailStarted;
    const followUpDetailStartedPromise = new Promise((resolve) => {
      followUpDetailStarted = resolve;
    });

    let releaseSessionClose;
    const sessionCloseGate = new Promise((resolve) => {
      releaseSessionClose = resolve;
    });
    let sessionCloseStarted;
    const sessionCloseStartedPromise = new Promise((resolve) => {
      sessionCloseStarted = resolve;
    });

    let releasePolicyRetire;
    const policyRetireGate = new Promise((resolve) => {
      releasePolicyRetire = resolve;
    });
    let policyRetireStarted;
    const policyRetireStartedPromise = new Promise((resolve) => {
      policyRetireStarted = resolve;
    });

    let detailGetCount = 0;
    let patchCallCount = 0;
    let failNextDetailWith401 = false;

    let releaseDelayedOrgAList;
    const delayedOrgAListGate = new Promise((resolve) => {
      releaseDelayedOrgAList = resolve;
    });
    let delayedOrgAListStarted;
    const delayedOrgAListStartedPromise = new Promise((resolve) => {
      delayedOrgAListStarted = resolve;
    });
    let delayedOrgAListSettled;
    let holdNextOrgAList = false;

    await page.route(
      /\/v1\/admin\/academy\/registrations(\?.*)?$/,
      async (route) => {
        if (contextPhase === "NEW_EMPTY_CONTEXT") {
          listRequestsInNewContext += 1;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: [],
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
          });
        }
        if (holdNextOrgAList) {
          holdNextOrgAList = false;
          delayedOrgAListSettled = trackRequestSettlement(
            page,
            route.request(),
          );
          delayedOrgAListStarted();
          await delayedOrgAListGate;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [oldSummary],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
        });
      },
    );

    await page.route(/\/v1\/admin\/academy\/registrations\/search$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: contextPhase === "NEW_EMPTY_CONTEXT" ? [] : [oldSummary],
          total: contextPhase === "NEW_EMPTY_CONTEXT" ? 0 : 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      }),
    );

    let patchSuccessSettled;
    let followUpDetailSettled;
    let sessionCloseSettled;
    let policyRetireSettled;

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-old-1$/,
      async (route) => {
        detailGetCount += 1;
        if (failNextDetailWith401) {
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 401,
              message: "Unauthorized",
              error: "Unauthorized",
            }),
          });
        }
        // 3rd detail GET is the STALE_VERSION follow-up read -> hold until after auth switch
        if (detailGetCount === 3) {
          followUpDetailSettled = trackRequestSettlement(page, route.request());
          followUpDetailStarted();
          await followUpDetailGate;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...oldDetail,
              version: 3,
              status: "UNDER_REVIEW",
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(oldDetail),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-old-1\/status$/,
      async (route) => {
        patchCallCount += 1;
        if (patchCallCount === 1) {
          patchSuccessSettled = trackRequestSettlement(page, route.request());
          patchSuccessStarted();
          await patchSuccessGate;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...oldDetail,
              status: "CONFIRMED",
              version: 2,
            }),
          });
        }
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "STALE_VERSION",
            message: "stale version",
          }),
        });
      },
    );

    await page.route(/\/v1\/admin\/academy\/registration-sessions$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: contextPhase === "NEW_EMPTY_CONTEXT" ? [] : [oldSession],
        }),
      }),
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions\/00000000-0000-4000-8000-000000000901\/close$/,
      async (route) => {
        sessionCloseSettled = trackRequestSettlement(page, route.request());
        sessionCloseStarted();
        await sessionCloseGate;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...oldSession,
            publicationState: "CLOSED",
            version: 3,
            closedAt: "2026-12-03T01:00:00.000Z",
          }),
        });
      },
    );

    await page.route(/\/v1\/admin\/academy\/registration-policies$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          contextPhase === "NEW_EMPTY_CONTEXT"
            ? { current: null, items: [] }
            : { current: oldPolicy, items: [oldPolicy] },
        ),
      }),
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-policies\/pol-old-1\/retire$/,
      async (route) => {
        policyRetireSettled = trackRequestSettlement(page, route.request());
        policyRetireStarted();
        await policyRetireGate;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...oldPolicy,
            status: "RETIRED",
            version: 3,
            retiredAt: "2026-12-03T01:00:00.000Z",
          }),
        });
      },
    );

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("KAR-OLDORG01");

    // Keep identical user id ("staff-user-1") and identical role ("SUPER_ADMIN"),
    // rotating ONLY the server-resolved organizationId (CR-25).
    const switchOrg = async (orgId) => {
      await auth.switchSession({
        id: "staff-user-1",
        roles: ["SUPER_ADMIN"],
        organizationId: orgId,
      });
    };

    // 0) Delayed list read from Org A -> switch to Org B (same user, same role) -> release Org A list
    holdNextOrgAList = true;
    await page.selectOption("#registration-status-filter", "RECEIVED");
    await delayedOrgAListStartedPromise;
    contextPhase = "NEW_EMPTY_CONTEXT";
    await switchOrg(SECONDARY_ORG_ID);
    await expect(page.getByText("No registrations found")).toBeVisible();
    releaseDelayedOrgAList();
    await flushUiAfterSettled(page, delayedOrgAListSettled);
    await expect(page.locator("body")).not.toContainText("KAR-OLDORG01");
    await expect(page.locator("body")).not.toContainText(
      "Synthetic Old Org Player",
    );

    // Return to Org A for mutation & conflict follow-up isolation tests
    contextPhase = "OLD_CONTEXT";
    await switchOrg(DEFAULT_ORG_ID);
    await expect(page.locator("body")).toContainText("KAR-OLDORG01");

    // 1) Delayed registration status mutation -> switch org -> release old response
    await page.getByRole("button", { name: "Review" }).first().click();
    await expect(page.locator("body")).toContainText("+60129990001");
    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await patchSuccessStartedPromise;

    contextPhase = "NEW_EMPTY_CONTEXT";
    await switchOrg(SECONDARY_ORG_ID);

    await expect(page.getByText("No registrations found")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("KAR-OLDORG01");
    await expect(page.locator("body")).not.toContainText(
      "Synthetic Old Org Player",
    );
    const refreshesBeforeRelease = listRequestsInNewContext;

    // Release stale PATCH response -> observe browser settlement -> MUST be ignored completely!
    releasePatchSuccess();
    await flushUiAfterSettled(page, patchSuccessSettled);
    await expect(page.locator("body")).not.toContainText("KAR-OLDORG01");
    await expect(page.locator("body")).not.toContainText(
      "Synthetic Old Org Player",
    );
    await expect(page.locator("body")).not.toContainText(
      "Registration status updated",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(listRequestsInNewContext).toBe(refreshesBeforeRelease);

    // 2) Delayed STALE_VERSION follow-up detail GET -> switch org -> release old detail
    contextPhase = "OLD_CONTEXT";
    await switchOrg(DEFAULT_ORG_ID);
    await expect(page.locator("body")).toContainText("KAR-OLDORG01");

    await page.getByRole("button", { name: "Review" }).first().click();
    await expect(page.locator("body")).toContainText("+60129990001");
    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await followUpDetailStartedPromise;

    contextPhase = "NEW_EMPTY_CONTEXT";
    await switchOrg(SECONDARY_ORG_ID);
    await expect(page.getByText("No registrations found")).toBeVisible();

    releaseFollowUpDetail();
    await flushUiAfterSettled(page, followUpDetailSettled);
    await expect(page.locator("body")).not.toContainText("KAR-OLDORG01");
    await expect(page.locator("body")).not.toContainText("+60129990001");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // 3) Delayed Training Session close mutation -> switch org -> release old response
    contextPhase = "OLD_CONTEXT";
    await switchOrg(DEFAULT_ORG_ID);
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await expect(page.locator("body")).toContainText("Old Org Session Alpha");

    await page
      .getByTestId("close-session-00000000-0000-4000-8000-000000000901")
      .click();
    await page.getByRole("button", { name: "Close Session" }).click();
    await sessionCloseStartedPromise;

    contextPhase = "NEW_EMPTY_CONTEXT";
    await switchOrg(SECONDARY_ORG_ID);
    await expect(page.getByTestId("sessions-empty-state")).toBeVisible();

    releaseSessionClose();
    await flushUiAfterSettled(page, sessionCloseSettled);
    await expect(page.locator("body")).not.toContainText(
      "Old Org Session Alpha",
    );
    await expect(page.getByTestId("sessions-action-banner")).toHaveCount(0);

    // 4) Delayed Consent Policy retire mutation -> switch org -> release old response
    contextPhase = "OLD_CONTEXT";
    await switchOrg(DEFAULT_ORG_ID);
    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await expect(
      page.getByTestId("current-approved-policy-card"),
    ).toContainText("SYNTHETIC-OLD-POL");

    await page.getByTestId("retire-current-policy-btn").click();
    await page.getByRole("button", { name: "Retire Policy" }).click();
    await policyRetireStartedPromise;

    contextPhase = "NEW_EMPTY_CONTEXT";
    await switchOrg(SECONDARY_ORG_ID);
    await expect(
      page.getByTestId("no-current-approved-policy-card"),
    ).toBeVisible();

    releasePolicyRetire();
    await flushUiAfterSettled(page, policyRetireSettled);
    await expect(page.locator("body")).not.toContainText("SYNTHETIC-OLD-POL");
    await expect(page.getByTestId("policies-action-banner")).toHaveCount(0);

    // Return to Registrations tab under OLD_CONTEXT for 401 search-input clearing verification
    contextPhase = "OLD_CONTEXT";
    await switchOrg(DEFAULT_ORG_ID);
    await page.getByRole("tab", { name: /Registrations/i }).click();
    await expect(page.locator("body")).toContainText("KAR-OLDORG01");

    // 5) 401 clears sensitive search input + pending state + loaded records immediately
    const searchBox = page.locator('input[type="search"]');
    await searchBox.fill("012-999 0001");
    await expect(searchBox).toHaveValue("012-999 0001");
    failNextDetailWith401 = true;
    await page.getByRole("button", { name: "Review" }).first().click();

    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );
    await expect(searchBox).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("KAR-OLDORG01");
    await expect(page.locator("body")).not.toContainText(
      "Synthetic Old Org Player",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("Global 401/403 invalidation from one concurrent request blocks delayed responses in other mounted components", async ({
    page,
  }) => {
    await setupAuthenticatedAdminSession(page);
    // Part A (Parent fetchAuthoritativeSessionFilter 401 -> Child AdminTrainingSessionsTab delayed response):
    // Parent's session filter read returns 401 while the mounted Sessions tab has a delayed
    // session list response in flight. Releasing the delayed child response MUST NOT restore old data.
    let releaseParent401;
    const parent401Gate = new Promise((resolve) => {
      releaseParent401 = resolve;
    });
    let parentReadStarted;
    const parentReadStartedPromise = new Promise((resolve) => {
      parentReadStarted = resolve;
    });

    let releaseChildSessions;
    const childSessionsGate = new Promise((resolve) => {
      releaseChildSessions = resolve;
    });
    let childSessionsStarted;
    const childSessionsStartedPromise = new Promise((resolve) => {
      childSessionsStarted = resolve;
    });

    let childSessionsSettled;
    let sessionGetCount = 0;

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

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions$/,
      async (route) => {
        sessionGetCount += 1;
        // 1st GET is parent's always-active session filter -> returns 401 once released
        if (sessionGetCount === 1) {
          parentReadStarted();
          await parent401Gate;
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 401,
              message: "Unauthorized",
              error: "Unauthorized",
            }),
          });
        }
        // 2nd GET is mounted child AdminTrainingSessionsTab -> delayed success response
        childSessionsSettled = trackRequestSettlement(page, route.request());
        childSessionsStarted();
        await childSessionsGate;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              makeSyntheticSession({
                id: "00000000-0000-4000-8000-000000000951",
                name: "Leaked Concurrent Session",
                publicationState: "PUBLISHED",
              }),
            ],
          }),
        });
      },
    );

    await page.goto("/registrations", { waitUntil: "domcontentloaded" });
    await parentReadStartedPromise;

    // Switch to Training Sessions tab while parent's session filter read is still in flight
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await childSessionsStartedPromise;

    // Release parent 401 -> propagates global invalidation to mounted AdminTrainingSessionsTab
    releaseParent401();
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );

    // Now release the child tab's delayed session response -> observe settlement -> MUST NOT populate old data!
    releaseChildSessions();
    await flushUiAfterSettled(page, childSessionsSettled);
    await expect(page.locator("body")).not.toContainText(
      "Leaked Concurrent Session",
    );
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );

    // Part B (Child 403 -> Parent delayed session filter response):
    // On a fresh reload, parent's authoritative session filter is delayed while the mounted
    // Consent Policies tab receives HTTP 403. Releasing parent's delayed response MUST NOT restore filter data.
    await page.unroute(/\/v1\/admin\/academy\/registrations(\?.*)?$/);
    await page.unroute(/\/v1\/admin\/academy\/registration-sessions$/);

    let releaseDelayedParentFilter;
    const delayedParentFilterGate = new Promise((resolve) => {
      releaseDelayedParentFilter = resolve;
    });
    let parentFilterStarted;
    const parentFilterStartedPromise = new Promise((resolve) => {
      parentFilterStarted = resolve;
    });
    let parentFilterSettled;

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

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions$/,
      async (route) => {
        parentFilterSettled = trackRequestSettlement(page, route.request());
        parentFilterStarted();
        await delayedParentFilterGate;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              makeSyntheticSession({
                id: "00000000-0000-4000-8000-000000000952",
                name: "Leaked Parent Filter Session",
                publicationState: "PUBLISHED",
              }),
            ],
          }),
        });
      },
    );

    await page.route(/\/v1\/admin\/academy\/registration-policies$/, (route) =>
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

    await page.reload({ waitUntil: "domcontentloaded" });
    await parentFilterStartedPromise;

    // Open Consent Policies tab -> receives 403 -> triggers global invalidation in parent
    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Access Restricted",
    );

    // Release delayed parent session filter response -> observe settlement -> MUST NOT populate session count or dropdown!
    releaseDelayedParentFilter();
    await flushUiAfterSettled(page, parentFilterSettled);
    await expect(
      page.getByRole("tab", { name: /Training Sessions/i }),
    ).toContainText("0");
    await page.getByRole("tab", { name: /Registrations/i }).click();
    await expect(page.getByTestId("registration-session-filter")).toHaveCount(
      0,
    );
    await expect(page.locator("body")).not.toContainText(
      "Leaked Parent Filter Session",
    );
  });

  test("Post-401/403 ordinary UI interactions (tab switching) never clear invalidation, never fire refetches, and never re-enable child tabs", async ({
    page,
  }) => {
    await setupAuthenticatedAdminSession(page);
    let regListRequests = 0;
    let sessionListRequests = 0;
    let policyListRequests = 0;
    let failMode = "NONE";

    await page.route(
      /\/v1\/admin\/academy\/registrations(\?.*)?$/,
      async (route) => {
        regListRequests += 1;
        if (failMode === "401") {
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 401,
              message: "Unauthorized",
              error: "Unauthorized",
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SYNTHETIC_LIST),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions$/,
      async (route) => {
        sessionListRequests += 1;
        if (failMode === "403") {
          return route.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 403,
              message: "MFA AAL2 required",
              error: "Forbidden",
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [makeSyntheticSession()] }),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-policies$/,
      async (route) => {
        policyListRequests += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ current: null, items: [] }),
        });
      },
    );

    // Part 1: Trigger global 401 on initial load -> switch through every tab -> 0 extra requests!
    failMode = "401";
    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );
    await expect(page.getByTestId("auth-recovery-btn")).toHaveText(
      "Sign In Again",
    );

    const regAfter401 = regListRequests;
    const sessAfter401 = sessionListRequests;
    const polAfter401 = policyListRequests;

    // Tab switching must NOT clear Session Expired or fire any backend calls
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page.waitForTimeout(150);
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );

    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await page.waitForTimeout(150);
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );

    await page.getByRole("tab", { name: /Registrations/i }).click();
    await page.waitForTimeout(150);
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );
    await expect(page.getByTestId("registration-session-filter")).toHaveCount(
      0,
    );

    expect(regListRequests).toBe(regAfter401);
    expect(sessionListRequests).toBe(sessAfter401);
    expect(policyListRequests).toBe(polAfter401);

    // Part 2: Trigger global 403 -> tab switching triggers 0 requests -> explicit Re-verify Access restores access!
    failMode = "403";
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Access Restricted",
    );
    await expect(page.getByTestId("auth-recovery-btn")).toHaveText(
      "Re-verify Access",
    );

    const regAfter403 = regListRequests;
    const sessAfter403 = sessionListRequests;
    const polAfter403 = policyListRequests;

    // Even if backend would now return 200, ordinary tab navigation MUST NOT re-enable or refetch!
    failMode = "NONE";
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page.waitForTimeout(150);
    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await page.waitForTimeout(150);
    await page.getByRole("tab", { name: /Registrations/i }).click();
    await page.waitForTimeout(150);

    expect(regListRequests).toBe(regAfter403);
    expect(sessionListRequests).toBe(sessAfter403);
    expect(policyListRequests).toBe(polAfter403);
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Access Restricted",
    );

    // Only explicit recovery button restores access
    await page.getByTestId("auth-recovery-btn").click();
    await expect(page.getByText("KAR-7H3QK9XM")).toBeVisible();
    await expect(page.getByTestId("registrations-error-state")).toHaveCount(0);

    // Part 3: PR #129 HTTP 403 FEATURE_NOT_AVAILABLE renders distinct deferred-feature state with 0 auto-retries
    await page.unroute(/\/v1\/admin\/academy\/registrations(\?.*)?$/);
    let deferredCalls = 0;
    await page.route(/\/v1\/admin\/academy\/registrations(\?.*)?$/, (route) => {
      deferredCalls += 1;
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 403,
          code: "FEATURE_NOT_AVAILABLE",
          feature: "V1_PORTAL",
          message: "This feature is not available yet",
        }),
      });
    });

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Feature Not Available",
    );
    await expect(
      page.getByTestId("registrations-error-state"),
    ).not.toContainText("Access Restricted");
    await expect(page.getByTestId("auth-recovery-btn")).toHaveCount(0);
    await page.waitForTimeout(250);
    expect(deferredCalls).toBe(1);
  });

  test("Admin usability: readable labels, safe missing age, discoverable mobile tabs, and drawer responsiveness at 360px-1440px", async ({
    page,
  }) => {
    await setupAuthenticatedAdminSession(page);
    const listWithMissingAge = {
      ...SYNTHETIC_LIST,
      items: [
        SYNTHETIC_LIST.items[0],
        {
          ...SYNTHETIC_LIST.items[1],
          id: "reg-syn-null-age",
          referenceCode: "KAR-NULLAGE1",
          ageAtReference: null,
        },
      ],
    };

    await page.route(/\/v1\/admin\/academy\/registrations(\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listWithMissingAge),
      }),
    );
    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-syn-001$/,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeSyntheticDetail()),
        }),
    );
    await page.route(/\/v1\/admin\/academy\/registration-sessions$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [makeSyntheticSession()] }),
      }),
    );
    await page.route(/\/v1\/admin\/academy\/registration-policies$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ current: null, items: [] }),
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

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.getByText("KAR-7H3QK9XM")).toBeVisible();

    // Safe missing-age display (never dangling " yrs")
    await expect(page.locator("table")).not.toContainText(/^\s*yrs$/m);
    const nullAgeRow = page.locator("tr", { hasText: "KAR-NULLAGE1" });
    await expect(nullAgeRow).toContainText("—");
    await expect(nullAgeRow).not.toContainText(" yrs");

    // All 3 tabs discoverable inside viewport at 360px and 390px
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

      for (const tabName of [
        /Registrations/i,
        /Training Sessions/i,
        /Consent Policies/i,
      ]) {
        const box = await page
          .getByRole("tab", { name: tabName })
          .boundingBox();
        expect(box, `Tab ${tabName} visible at ${vp.width}px`).toBeTruthy();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 2);
      }
    }

    // Readable display labels & Escape accessibility in Registration detail drawer at 360px
    await page.setViewportSize({ width: 360, height: 800 });
    await page.getByTestId("review-registration-reg-syn-001").click();
    const detail = page.getByTestId("registration-detail-content");
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("Male");
    await expect(detail).toContainText("Youth Medium (YM)");
    await expect(detail).toContainText("Mother");
    await expect(detail).toContainText("Grandparent");
    await expect(detail).toContainText("Guardian Authority Acknowledgment");
    await expect(detail).toContainText("English (en)");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Session Create Drawer narrow-screen layout & zero overflow at 360px
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page.getByTestId("create-session-draft-btn").click();
    await expect(page.getByTestId("session-editor-form")).toBeVisible();
    const sessOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(sessOverflow).toBeLessThanOrEqual(2);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Consent Policy Create Drawer narrow-screen stacked Ref/SHA-256 layout at 360px & 390px
    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await page.getByTestId("create-policy-draft-btn").click();
    await expect(page.getByTestId("policy-create-form")).toBeVisible();
    const refBox = await page
      .locator("#policy-ref-GUARDIAN_AUTHORITY-en")
      .boundingBox();
    const shaBox = await page
      .locator("#policy-sha-GUARDIAN_AUTHORITY-en")
      .boundingBox();
    expect(refBox && shaBox).toBeTruthy();
    // Stacked vertically at 360px (shaBox sits below refBox, full readable width!)
    expect(shaBox.y).toBeGreaterThan(refBox.y + 20);
    expect(refBox.width).toBeGreaterThan(220);
    expect(shaBox.width).toBeGreaterThan(220);
    const polOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(polOverflow).toBeLessThanOrEqual(2);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("Behavioral regressions: pagination clamping, conflict-refresh 401 invalidation, stale mutation isolation, strict capacity, publish conflict invalidation, editor instance isolation, and policy draft pending lock", async ({
    page,
  }) => {
    await setupAuthenticatedAdminSession(page);
    const regPage1 = {
      ...SYNTHETIC_LIST.items[0],
      id: "reg-p1",
      referenceCode: "KAR-PAGEONE1",
      playerFullName: "Page One Player",
    };
    const regPage2 = {
      ...SYNTHETIC_LIST.items[0],
      id: "reg-p2",
      referenceCode: "KAR-PAGETWO2",
      playerFullName: "Page Two Player",
    };

    const sessA = makeSyntheticSession({
      id: "00000000-0000-4000-8000-000000000801",
      name: "Session Alpha Draft",
      publicationState: "DRAFT",
      version: 3,
      coachDisplayName: "Coach Alpha",
    });
    const sessB = makeSyntheticSession({
      id: "00000000-0000-4000-8000-000000000802",
      name: "Session Beta Draft",
      publicationState: "DRAFT",
      version: 1,
      coachDisplayName: "Coach Beta",
    });

    let page2Collapsed = false;
    const requestedPages = [];
    await page.route(/\/v1\/admin\/academy\/registrations(\?.*)?$/, (route) => {
      const url = new URL(route.request().url());
      const reqPage = Number(url.searchParams.get("page") || "1");
      requestedPages.push(reqPage);
      if (reqPage === 2 && !page2Collapsed) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [regPage2],
            total: 2,
            page: 2,
            limit: 20,
            totalPages: 2,
          }),
        });
      }
      if (reqPage === 2 && page2Collapsed) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [],
            total: 1,
            page: 2,
            limit: 20,
            totalPages: 1,
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [regPage1],
          total: page2Collapsed ? 1 : 2,
          page: 1,
          limit: 20,
          totalPages: page2Collapsed ? 1 : 2,
        }),
      });
    });

    let conflictRefreshReturns401 = false;
    let detailP1Gets = 0;
    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-p1$/,
      (route) => {
        detailP1Gets += 1;
        if (conflictRefreshReturns401 && detailP1Gets >= 2) {
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 401,
              message: "Unauthorized",
              error: "Unauthorized",
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeSyntheticDetail({
              id: "reg-p1",
              referenceCode: "KAR-PAGEONE1",
              playerFullName: "Page One Player",
              status: "RECEIVED",
              version: 1,
            }),
          ),
        });
      },
    );

    await page.route(/\/v1\/admin\/academy\/registrations\/reg-p2$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeSyntheticDetail({
            id: "reg-p2",
            referenceCode: "KAR-PAGETWO2",
            playerFullName: "Page Two Player",
            status: "RECEIVED",
            version: 1,
          }),
        ),
      }),
    );

    let holdP2Patch = false;
    let releaseP2Patch;
    const p2PatchGate = new Promise((resolve) => {
      releaseP2Patch = resolve;
    });
    let p2PatchStarted;
    const p2PatchStartedPromise = new Promise((resolve) => {
      p2PatchStarted = resolve;
    });
    let p2PatchSettled;

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-p2\/status$/,
      async (route) => {
        page2Collapsed = true;
        if (holdP2Patch) {
          p2PatchSettled = trackRequestSettlement(page, route.request());
          p2PatchStarted();
          await p2PatchGate;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeSyntheticDetail({
              id: "reg-p2",
              referenceCode: "KAR-PAGETWO2",
              playerFullName: "Page Two Player",
              status: "CONFIRMED",
              version: 2,
            }),
          ),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-p1\/status$/,
      (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "STALE_VERSION",
            message: "stale version",
          }),
        }),
    );

    let sessionListState = [sessA, sessB];
    let sessionCreatePosts = 0;
    await page.route(
      /\/v1\/admin\/academy\/registration-sessions$/,
      (route) => {
        if (route.request().method() === "POST") {
          sessionCreatePosts += 1;
          return route.fulfill({ status: 201, body: JSON.stringify(sessA) });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: sessionListState }),
        });
      },
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

    let releaseSessionASave;
    const sessionASaveGate = new Promise((resolve) => {
      releaseSessionASave = resolve;
    });
    let sessionASaveStarted;
    const sessionASaveStartedPromise = new Promise((resolve) => {
      sessionASaveStarted = resolve;
    });
    let sessionASaveSettled;
    await page.route(
      /\/v1\/admin\/academy\/registration-sessions\/00000000-0000-4000-8000-000000000801$/,
      async (route) => {
        sessionASaveSettled = trackRequestSettlement(page, route.request());
        sessionASaveStarted();
        await sessionASaveGate;
        const updated = {
          ...sessA,
          coachDisplayName: "Coach Alpha Updated",
          version: 4,
        };
        sessionListState = [updated, sessB];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updated),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions\/00000000-0000-4000-8000-000000000801\/publish$/,
      (route) => {
        sessionListState = [{ ...sessA, version: 5 }, sessB];
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "STALE_VERSION",
            message: "Session changed before publish",
          }),
        });
      },
    );

    let releasePolicyPost;
    const policyPostGate = new Promise((resolve) => {
      releasePolicyPost = resolve;
    });
    let policyPostStarted;
    const policyPostStartedPromise = new Promise((resolve) => {
      policyPostStarted = resolve;
    });
    await page.route(
      /\/v1\/admin\/academy\/registration-policies$/,
      async (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ current: null, items: [] }),
          });
        }
        policyPostStarted();
        await policyPostGate;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "pol-pending-1",
            policyVersion: "SYNTHETIC-LOCK",
            status: "DRAFT",
            version: 1,
            content: makeSyntheticPolicyContent("v1"),
            approvedAt: null,
            retiredAt: null,
            createdAt: "2026-12-01T00:00:00.000Z",
            updatedAt: "2026-12-01T00:00:00.000Z",
          }),
        });
      },
    );

    // 1) Pagination recovery + ConfirmDialog Escape guard while status PATCH is pending:
    // on page 2, hold PATCH open and press Escape -> neither ConfirmDialog nor underlying Drawer closes!
    // Release PATCH -> page 2 refresh returns items=[] & totalPages=1 -> clamps to page 1.
    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("KAR-PAGEONE1");
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.locator("body")).toContainText("KAR-PAGETWO2");

    holdP2Patch = true;
    await page.getByTestId("review-registration-reg-p2").click();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();
    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await p2PatchStartedPromise;

    // Pressing Escape while ConfirmDialog is loading must NOT close ConfirmDialog or the underlying Drawer
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: /Change status to CONFIRMED/i }),
    ).toBeVisible();

    releaseP2Patch();
    await flushUiAfterSettled(page, p2PatchSettled);
    await expect(page.getByTestId("status-update-feedback")).toContainText(
      "CONFIRMED",
    );
    await page.getByRole("button", { name: "Close drawer" }).click();
    await expect(page.locator("body")).toContainText("KAR-PAGEONE1");
    expect(requestedPages[requestedPages.length - 1]).toBe(1);

    // 2) Training Sessions: strict capacity validation rejects "1e3" and "12.5" (0 POSTs)
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page.getByTestId("create-session-draft-btn").click();
    await page.selectOption(
      "#session-programme-id",
      "00000000-0000-4000-8000-000000000101",
    );
    await page.fill("#session-name", "Strict Capacity Check");
    await page.selectOption(
      "#session-venue-id",
      "00000000-0000-4000-8000-000000000201",
    );
    // Input type=number rejects non-numeric on some browsers, so set value via DOM to test noValidate parser directly
    await page.locator("#session-capacity").evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(el, "12.5");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.getByTestId("save-session-btn").click();
    await expect(page.getByTestId("session-form-error")).toBeVisible();
    expect(sessionCreatePosts).toBe(0);
    await page.getByRole("button", { name: "Close drawer" }).click();

    // 3) Pending save on Session A must NOT close Session B's editor drawer
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000801")
      .click();
    await page.fill("#session-coach-name", "Coach Alpha Updated");
    await page.getByTestId("save-session-btn").click();
    await sessionASaveStartedPromise;

    // Close Session A drawer with Escape while its PATCH is pending, then open Session B
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("session-editor-form")).toHaveCount(0);
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000802")
      .click();
    await expect(page.locator("#session-name")).toHaveValue(
      "Session Beta Draft",
    );

    releaseSessionASave();
    await flushUiAfterSettled(page, sessionASaveSettled);
    // Wait for Session A's save handler to finish and update the page banner before asserting Session B stays open
    await expect(page.getByTestId("sessions-action-banner")).toContainText(
      'Session "Session Alpha Draft" updated (v4).',
    );
    // Session B drawer must remain open with Session B's values intact!
    await expect(page.getByTestId("session-editor-form")).toBeVisible();
    await expect(page.locator("#session-name")).toHaveValue(
      "Session Beta Draft",
    );
    await page.getByRole("button", { name: "Close drawer" }).click();

    // 4) Publish STALE_VERSION invalidates publish dialog and clears acknowledgements
    await page
      .getByTestId("publish-session-00000000-0000-4000-8000-000000000801")
      .click();
    await page.check("#publish-schedule-approved");
    await page.check("#publish-age-rule-approved");
    await page.getByRole("button", { name: "Publish Session" }).click();
    // Dialog closes and warning banner instructs staff to reopen from refreshed draft
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("sessions-action-banner")).toContainText(
      "Reopen Publish",
    );
    // Reopening starts with BOTH checkboxes unchecked
    await page
      .getByTestId("publish-session-00000000-0000-4000-8000-000000000801")
      .click();
    await expect(page.locator("#publish-schedule-approved")).not.toBeChecked();
    await expect(page.locator("#publish-age-rule-approved")).not.toBeChecked();
    await page.getByRole("button", { name: "Cancel" }).click();

    // 5) Consent Policy Create Drawer disables content inputs while draft POST is pending
    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await page.getByTestId("create-policy-draft-btn").click();
    await page.fill("#policy-version-input", "SYNTHETIC-LOCK");
    const content = makeSyntheticPolicyContent("v1");
    for (const [cat, locales] of Object.entries(content)) {
      for (const [loc, val] of Object.entries(locales)) {
        await page.fill(`#policy-ref-${cat}-${loc}`, val.ref);
        await page.fill(`#policy-sha-${cat}-${loc}`, val.sha256);
      }
    }
    await page.getByTestId("submit-policy-draft-btn").click();
    await policyPostStartedPromise;
    await expect(page.locator("#policy-version-input")).toBeDisabled();
    await expect(
      page.locator("#policy-ref-GUARDIAN_AUTHORITY-en"),
    ).toBeDisabled();
    await expect(
      page.locator("#policy-sha-GUARDIAN_AUTHORITY-en"),
    ).toBeDisabled();
    releasePolicyPost();
    await expect(page.getByTestId("policies-action-banner")).toContainText(
      "SYNTHETIC-LOCK",
    );

    // 6) Conflict refresh follow-up GET returning 401 triggers global auth invalidation
    await page.getByRole("tab", { name: /Registrations/i }).click();
    await expect(page.locator("body")).toContainText("KAR-PAGEONE1");
    conflictRefreshReturns401 = true;
    await page.getByTestId("review-registration-reg-p1").click();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();
    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await expect(page.getByTestId("registrations-error-state")).toContainText(
      "Session Expired",
    );
    await expect(page.locator("body")).not.toContainText("KAR-PAGEONE1");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("IR-03 Missing session after STALE_VERSION conflict refresh renders honest unavailable notice with disabled Save and safe dismissal", async ({
    page,
  }) => {
    await setupAuthenticatedAdminSession(page);
    const missingSessionId = "00000000-0000-4000-8000-000000000888";
    let sessionsStore = [
      makeSyntheticSession({
        id: missingSessionId,
        name: "Vanishing Cohort Draft",
        publicationState: "DRAFT",
        version: 1,
        coachDisplayName: "Coach Original",
      }),
    ];

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
    await page.route(/\/v1\/admin\/academy\/registration-sessions$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: sessionsStore }),
      }),
    );
    await page.route(
      new RegExp(
        `/v1/admin/academy/registration-sessions/${missingSessionId}$`,
      ),
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 404,
              code: "NOT_FOUND",
              message: "Registration session not found",
            }),
          });
        }
        // Target session disappears before the conflict refresh GET runs
        sessionsStore = [];
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            code: "STALE_VERSION",
            message: "stale version",
          }),
        });
      },
    );

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page.getByTestId(`edit-session-${missingSessionId}`).click();
    await page.fill("#session-coach-name", "Coach Attempted Edit");
    await page.getByTestId("save-session-btn").click();

    const missingNotice = page.getByTestId("session-stale-missing-notice");
    await expect(missingNotice).toBeVisible();
    await expect(missingNotice).toContainText("no longer available");
    await expect(page.locator("body")).not.toContainText(
      "Loading latest session version",
    );
    await expect(
      page.getByTestId("session-stale-conflict-panel"),
    ).toContainText("Coach Attempted Edit");
    await expect(page.getByTestId("save-session-btn")).toBeDisabled();
    await expect(page.getByTestId("reload-refreshed-session-btn")).toHaveCount(
      0,
    );

    await page.getByTestId("dismiss-missing-session-btn").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("sessions-empty-state")).toBeVisible();
  });

  test("FINAL-01 fail-closed authentication revalidation blocks UI during pending /admin/session, isolates delayed Org A responses, survives superseded session failure, and handles logout during pending restore", async ({
    page,
  }) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    await page.addInitScript(
      ({ storageKey, exp }) => {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "synthetic-final01-token-org-a",
            refresh_token: "synthetic-final01-refresh",
            expires_in: 3600,
            expires_at: exp,
            token_type: "bearer",
            user: { id: "staff-user-1", email: "super@example.test" },
          }),
        );
      },
      { storageKey: ADMIN_SUPABASE_SESSION_STORAGE_KEY, exp: expiresAt },
    );

    const orgASummary = {
      ...SYNTHETIC_LIST.items[0],
      id: "reg-org-a-1",
      referenceCode: "KAR-ORGA0001",
      playerFullName: "Org A Player One",
    };
    const orgADetail = makeSyntheticDetail({
      id: "reg-org-a-1",
      referenceCode: "KAR-ORGA0001",
      playerFullName: "Org A Player One",
    });
    const orgBSummary = {
      ...SYNTHETIC_LIST.items[0],
      id: "reg-org-b-2",
      referenceCode: "KAR-ORGB0002",
      playerFullName: "Org B Player Two",
    };

    let activeBackendOrg = "ORG_A";
    let sessionCallCount = 0;

    // Explicit Promise gates for deterministic ordering (zero fixed delays)
    let releaseSupersededFailSession;
    const supersededFailSessionGate = new Promise((r) => {
      releaseSupersededFailSession = r;
    });
    let supersededSessionStarted;
    const supersededSessionStartedPromise = new Promise((r) => {
      supersededSessionStarted = r;
    });
    let supersededSessionSettled;

    let releaseLogoutRaceSession;
    const logoutRaceSessionGate = new Promise((r) => {
      releaseLogoutRaceSession = r;
    });
    let logoutRaceSessionStarted;
    const logoutRaceSessionStartedPromise = new Promise((r) => {
      logoutRaceSessionStarted = r;
    });
    let logoutRaceSessionSettled;

    let releaseDelayedOrgAPatch;
    const delayedOrgAPatchGate = new Promise((r) => {
      releaseDelayedOrgAPatch = r;
    });
    let delayedOrgAPatchStarted;
    const delayedOrgAPatchStartedPromise = new Promise((r) => {
      delayedOrgAPatchStarted = r;
    });
    let delayedOrgAPatchSettled;

    let releaseDelayedOrgAList;
    const delayedOrgAListGate = new Promise((r) => {
      releaseDelayedOrgAList = r;
    });
    let delayedOrgAListStarted;
    const delayedOrgAListStartedPromise = new Promise((r) => {
      delayedOrgAListStarted = r;
    });
    let delayedOrgAListSettled;
    let holdNextOrgAList = false;

    await page.route(/\/v1\/admin\/session$/, async (route) => {
      sessionCallCount += 1;
      const callNum = sessionCallCount;

      // Call #1: Initial Org A load
      if (callNum === 1) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "staff-user-1",
            organizationId: DEFAULT_ORG_ID,
            email: "super@example.test",
            displayName: "Synthetic Super Admin",
            preferredLocale: "en",
            roles: ["SUPER_ADMIN"],
            authenticatorAssuranceLevel: "aal2",
            mfaSatisfied: true,
          }),
        });
      }

      // Call #2: Held pending revalidation that will later FAIL after Call #3 succeeds
      if (callNum === 2) {
        supersededSessionSettled = trackRequestSettlement(
          page,
          route.request(),
        );
        supersededSessionStarted();
        await supersededFailSessionGate;
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 500,
            message: "Superseded session failure",
          }),
        });
      }

      // Call #3: Newer valid Org B session succeeds while Call #2 is still pending
      if (callNum === 3) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "staff-user-1",
            organizationId: SECONDARY_ORG_ID,
            email: "super@example.test",
            displayName: "Synthetic Super Admin",
            preferredLocale: "en",
            roles: ["SUPER_ADMIN"],
            authenticatorAssuranceLevel: "aal2",
            mfaSatisfied: true,
          }),
        });
      }

      // Call #4: Pending restoration racing against cross-tab logout -> resolves 200 after logout
      logoutRaceSessionSettled = trackRequestSettlement(page, route.request());
      logoutRaceSessionStarted();
      await logoutRaceSessionGate;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "staff-user-1",
          organizationId: DEFAULT_ORG_ID,
          email: "super@example.test",
          displayName: "Synthetic Super Admin",
          preferredLocale: "en",
          roles: ["SUPER_ADMIN"],
          authenticatorAssuranceLevel: "aal2",
          mfaSatisfied: true,
        }),
      });
    });

    await page.route(/\/v1\/admin\/academy\/registration-sessions$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [makeSyntheticSession()] }),
      }),
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations(\?.*)?$/,
      async (route) => {
        if (holdNextOrgAList) {
          holdNextOrgAList = false;
          delayedOrgAListSettled = trackRequestSettlement(
            page,
            route.request(),
          );
          delayedOrgAListStarted();
          await delayedOrgAListGate;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: [orgASummary],
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
          });
        }
        const item = activeBackendOrg === "ORG_B" ? orgBSummary : orgASummary;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [item],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-org-a-1$/,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(orgADetail),
        }),
    );

    await page.route(
      /\/v1\/admin\/academy\/registrations\/reg-org-a-1\/status$/,
      async (route) => {
        delayedOrgAPatchSettled = trackRequestSettlement(page, route.request());
        delayedOrgAPatchStarted();
        await delayedOrgAPatchGate;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...orgADetail,
            status: "CONFIRMED",
            version: 2,
          }),
        });
      },
    );

    // 1) Load Org A, open detail drawer, and queue a delayed Org A status mutation
    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("KAR-ORGA0001");
    await expect(
      page.getByTestId("review-registration-reg-org-a-1"),
    ).toBeVisible();

    await page.getByTestId("review-registration-reg-org-a-1").click();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();
    await page.selectOption("#registration-next-status", "CONFIRMED");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await delayedOrgAPatchStartedPromise;

    // 2) Begin cross-tab session revalidation (Call #2 held pending behind supersededFailSessionGate)
    await page.evaluate((storageKey) => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: window.localStorage.getItem(storageKey),
        }),
      );
    }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
    await supersededSessionStartedPromise;

    // Throughout the pending /admin/session interval, Org A records & mutation controls MUST be gone!
    await expect(page.getByText("Verifying staff access…")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("KAR-ORGA0001");
    await expect(page.locator("body")).not.toContainText("Org A Player One");
    await expect(
      page.getByTestId("review-registration-reg-org-a-1"),
    ).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Registrations/i })).toHaveCount(
      0,
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Release delayed Org A mutation while /admin/session is STILL pending -> MUST NOT restore Org A!
    releaseDelayedOrgAPatch();
    await flushUiAfterSettled(page, delayedOrgAPatchSettled);
    await expect(page.getByText("Verifying staff access…")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("KAR-ORGA0001");
    await expect(page.locator("body")).not.toContainText("Org A Player One");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // 3) Newer revalidation (Call #3) succeeds for Org B while Call #2 is still pending -> Org B loads normally
    activeBackendOrg = "ORG_B";
    await page.evaluate((storageKey) => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: window.localStorage.getItem(storageKey),
        }),
      );
    }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
    await expect(page.locator("body")).toContainText("KAR-ORGB0002");
    await expect(page.locator("body")).toContainText("Org B Player Two");
    await expect(page.locator("body")).not.toContainText("KAR-ORGA0001");

    // 4) Now release superseded Call #2 to FAIL (HTTP 500) -> MUST NOT clear or overwrite Org B!
    releaseSupersededFailSession();
    await flushUiAfterSettled(page, supersededSessionSettled);
    await expect(page.locator("body")).toContainText("KAR-ORGB0002");
    await expect(page.locator("body")).toContainText("Org B Player Two");
    await expect(page.getByText("Sign in to Admin Console")).toHaveCount(0);

    // 5) Queue a delayed list read, then start pending revalidation (Call #4) and cross-tab logout ->
    // releasing BOTH the delayed read and superseded Call #4 (200 OK) MUST NOT restore UI!
    holdNextOrgAList = true;
    await page.selectOption("#registration-status-filter", "RECEIVED");
    await delayedOrgAListStartedPromise;

    await page.evaluate((storageKey) => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: window.localStorage.getItem(storageKey),
        }),
      );
    }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
    await logoutRaceSessionStartedPromise;
    await expect(page.getByText("Verifying staff access…")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("KAR-ORGB0002");

    releaseDelayedOrgAList();
    await flushUiAfterSettled(page, delayedOrgAListSettled);
    await expect(page.getByText("Verifying staff access…")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("KAR-ORGA0001");
    await expect(page.locator("body")).not.toContainText("KAR-ORGB0002");

    // Cross-tab logout clears localStorage and dispatches storage event while Call #4 is still in flight
    await page.evaluate((storageKey) => {
      window.localStorage.removeItem(storageKey);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: null,
        }),
      );
    }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
    await expect(
      page.getByRole("button", { name: "Sign in to Admin Console" }),
    ).toBeVisible();

    // Release superseded Call #4 (200 OK) -> MUST NOT restore authenticated UI!
    releaseLogoutRaceSession();
    await flushUiAfterSettled(page, logoutRaceSessionSettled);
    await expect(
      page.getByRole("button", { name: "Sign in to Admin Console" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("KAR-ORGA0001");
    await expect(page.locator("body")).not.toContainText("KAR-ORGB0002");
  });

  test("Round 2 (7oK/7np/7ns/7nu/7nx/7n2/7n6/7n-/7oE): same-context renewal preserves unsaved draft, stale conflict refresh by ID, disabled pending fields, policy refresh accuracy, and modal keyboard trap", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    await page.addInitScript(
      ({ storageKey, exp }) => {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "synthetic-e2e-aal2-token",
            refresh_token: "synthetic-e2e-refresh-token",
            expires_in: 3600,
            expires_at: exp,
            token_type: "bearer",
            user: {
              id: "staff-round2-1",
              email: "staff.r2@example.test",
            },
          }),
        );
      },
      { storageKey: ADMIN_SUPABASE_SESSION_STORAGE_KEY, exp: expiresAt },
    );

    let sessionCallCount = 0;
    let holdNextSessionGate = null;
    let holdNextSessionStarted = null;
    let nextSessionRole = "SUPER_ADMIN";
    let nextSessionOrg = "00000000-0000-4000-8000-000000000001";
    let nextSessionMfa = true;

    await page.route("**/v1/admin/session", async (route) => {
      sessionCallCount += 1;
      if (holdNextSessionGate) {
        const gate = holdNextSessionGate;
        const started = holdNextSessionStarted;
        holdNextSessionGate = null;
        holdNextSessionStarted = null;
        started();
        await gate;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "staff-round2-1",
          organizationId: nextSessionOrg,
          email: "staff.r2@example.test",
          displayName: "Round 2 Staff",
          roles: [nextSessionRole],
          mfaSatisfied: nextSessionMfa,
          preferredLocale: "en",
          authenticatorAssuranceLevel: nextSessionMfa ? "aal2" : "aal1",
        }),
      });
    });

    const reg1 = {
      id: "reg-r2-1",
      referenceCode: "KAR-R2TEST01",
      status: "RECEIVED",
      version: 2,
      playerFullName: "Round Two Player",
      playerDateOfBirth: "2015-03-02",
      ageAtReference: 11,
      sessionId: "00000000-0000-4000-8000-000000000901",
      sessionName: "Session R2 Alpha",
      createdAt: "2026-08-01T02:00:00.000Z",
      updatedAt: "2026-08-01T02:00:00.000Z",
    };

    const reg1Detail = makeSyntheticDetail({
      id: "reg-r2-1",
      referenceCode: "KAR-R2TEST01",
      status: "RECEIVED",
      version: 2,
      playerFullName: "Round Two Player",
      sessionId: "00000000-0000-4000-8000-000000000901",
      sessionName: "Session R2 Alpha",
    });

    const sessionAlpha = makeSyntheticSession({
      id: "00000000-0000-4000-8000-000000000901",
      name: "Session R2 Alpha",
      publicationState: "DRAFT",
      version: 3,
      capacity: 18,
      coachDisplayName: "Coach R2",
    });

    const listQueryLog = [];
    let detailFetchMode = "ok";
    let statusPatchMode = "conflict";
    let sessionListOmitAlpha = false;
    let sessionByIdMode = "ok";
    let policyListFailNext = false;

    let sessionSaveHoldStarted;
    let sessionSaveHoldStartedPromise = new Promise((r) => {
      sessionSaveHoldStarted = r;
    });
    let releaseSessionSave;
    let sessionSaveGate = new Promise((r) => {
      releaseSessionSave = r;
    });
    let holdNextSessionSave = false;

    await page.route(
      /\/v1\/admin\/academy\/registrations(\/|\?|$)/,
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (
          url.includes("/registrations/reg-r2-1/status") &&
          method === "PATCH"
        ) {
          if (statusPatchMode === "conflict") {
            statusPatchMode = "ok";
            await route.fulfill({
              status: 409,
              contentType: "application/json",
              body: JSON.stringify({
                statusCode: 409,
                code: "STALE_VERSION",
                message: "Registration version mismatch",
              }),
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...reg1Detail,
              status: "UNDER_REVIEW",
              version: 4,
            }),
          });
          return;
        }

        if (url.includes("/registrations/reg-r2-1") && method === "GET") {
          if (detailFetchMode === "fail_once") {
            detailFetchMode = "v3";
            await route.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({
                statusCode: 500,
                message: "Temporary detail outage",
              }),
            });
            return;
          }
          const version = detailFetchMode === "v3" ? 3 : 2;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ...reg1Detail, version }),
          });
          return;
        }

        if (method === "GET") {
          listQueryLog.push(new URL(url).searchParams.get("status") ?? "ALL");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: [reg1],
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
          });
          return;
        }

        await route.continue();
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions(\/|\?|$)/,
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (
          url.includes(
            "/registration-sessions/00000000-0000-4000-8000-000000000901",
          ) &&
          method === "GET"
        ) {
          if (sessionByIdMode === "404") {
            await route.fulfill({
              status: 404,
              contentType: "application/json",
              body: JSON.stringify({
                statusCode: 404,
                code: "NOT_FOUND",
                message: "Session not found",
              }),
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...sessionAlpha,
              version: 5,
              coachDisplayName: "Coach Server V5",
            }),
          });
          return;
        }

        if (
          url.includes(
            "/registration-sessions/00000000-0000-4000-8000-000000000901",
          ) &&
          method === "PATCH"
        ) {
          if (holdNextSessionSave) {
            holdNextSessionSave = false;
            sessionSaveHoldStarted();
            await sessionSaveGate;
          }
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 409,
              code: "STALE_VERSION",
              message: "Session modified concurrently",
            }),
          });
          return;
        }

        const orgBSession = makeSyntheticSession({
          id: "00000000-0000-4000-8000-000000000902",
          name: "Org B Unique Cohort",
          publicationState: "DRAFT",
          version: 1,
          capacity: 15,
          coachDisplayName: "Coach Org B Server",
        });

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items:
              nextSessionOrg === SECONDARY_ORG_ID
                ? [orgBSession]
                : sessionListOmitAlpha
                  ? []
                  : [sessionAlpha],
          }),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-policies(\/|\?|$)/,
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (url.includes("/approve") && method === "POST") {
          policyListFailNext = true;
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 409,
              code: "STALE_VERSION",
              message: "Policy predecessor changed",
            }),
          });
          return;
        }
        if (policyListFailNext) {
          policyListFailNext = false;
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              statusCode: 500,
              message: "Policy list temporarily unavailable",
            }),
          });
          return;
        }
        const draftPolicy = {
          id: "pol-r2-draft-1",
          policyVersion: "SYNTHETIC-R2-V1",
          status: "DRAFT",
          version: 1,
          content: makeSyntheticPolicyContent("r2"),
          createdAt: "2026-08-01T00:00:00.000Z",
          approvedAt: null,
          retiredAt: null,
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ current: null, items: [draftPolicy] }),
        });
      },
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

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("KAR-R2TEST01");

    // --- 7n- & 7oE: Modal keyboard accessibility (Tab, Shift+Tab, nested ConfirmDialog, Escape, focus restoration) ---
    const reviewBtn = page.getByTestId("review-registration-reg-r2-1");
    await reviewBtn.focus();
    await reviewBtn.click();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();

    const drawerDialog = page.locator('[role="dialog"]').first();
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      const insideDrawer = await drawerDialog.evaluate((el) =>
        el.contains(document.activeElement),
      );
      expect(insideDrawer).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    const stillInsideDrawer = await drawerDialog.evaluate((el) =>
      el.contains(document.activeElement),
    );
    expect(stillInsideDrawer).toBe(true);

    // Nested ConfirmDialog over Drawer
    await page.selectOption("#registration-next-status", "UNDER_REVIEW");
    await page.getByTestId("open-status-confirm-btn").click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(2);
    const confirmDialog = page.locator('[role="dialog"]').nth(1);
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press("Tab");
      const insideConfirm = await confirmDialog.evaluate((el) =>
        el.contains(document.activeElement),
      );
      expect(insideConfirm).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    const insideConfirmAfterShiftTab = await confirmDialog.evaluate((el) =>
      el.contains(document.activeElement),
    );
    expect(insideConfirmAfterShiftTab).toBe(true);

    // Escape closes ONLY ConfirmDialog, keeping Drawer open
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();

    // --- 7ns: Failed STALE_VERSION follow-up detail refresh disables Apply Status Change until Refresh Record succeeds ---
    detailFetchMode = "fail_once";
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await expect(page.getByTestId("status-update-feedback")).toContainText(
      "Could not refresh the latest registration record",
    );
    await page.selectOption("#registration-next-status", "UNDER_REVIEW");
    await expect(page.getByTestId("open-status-confirm-btn")).toBeDisabled();
    await page.getByTestId("refresh-registration-detail-btn").click();
    await expect(page.getByTestId("registration-detail-content")).toContainText(
      "v3",
    );
    await page.selectOption("#registration-next-status", "UNDER_REVIEW");
    await expect(page.getByTestId("open-status-confirm-btn")).toBeEnabled();

    // Close Drawer with Escape -> focus restores to Review button (7oE)
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    const restoredToReview = await reviewBtn.evaluate(
      (el) => document.activeElement === el,
    );
    expect(restoredToReview).toBe(true);

    // CnB6: Reopen drawer and confirm status update (which disables Apply Status Change opener);
    // focus MUST move to an operable control inside the remaining Drawer (never stuck on disabled button or body).
    await reviewBtn.click();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();
    await page.selectOption("#registration-next-status", "UNDER_REVIEW");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await expect(page.getByTestId("open-status-confirm-btn")).toBeDisabled();
    // Assert focus moved specifically to an operable control (Close drawer button), not container or body (C3A9)
    await expect(
      page
        .locator('[role="dialog"]')
        .first()
        .getByRole("button", { name: "Close drawer" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    // --- 7oK + 7n6 + 7nx + 7n2: Training Sessions ---
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000901")
      .click();
    await page.fill("#session-coach-name", "Unsaved Draft Coach");

    // 7oK: Trigger same-context token renewal -> workspace hides during pending /admin/session, then resumes unsaved draft!
    let releaseRenewal;
    holdNextSessionGate = new Promise((r) => {
      releaseRenewal = r;
    });
    const renewalStartedPromise = new Promise((r) => {
      holdNextSessionStarted = r;
    });
    await page.evaluate((storageKey) => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: window.localStorage.getItem(storageKey),
        }),
      );
    }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
    await renewalStartedPromise;
    await expect(page.getByTestId("admin-revalidating-gate")).toBeVisible();
    await expect(page.getByTestId("session-editor-form")).toHaveCount(0);
    expect(sessionCallCount).toBeGreaterThanOrEqual(2);

    releaseRenewal();
    await expect(page.getByTestId("session-editor-form")).toBeVisible();
    await expect(page.locator("#session-coach-name")).toHaveValue(
      "Unsaved Draft Coach",
    );

    // 7n6 + 7nx + 7n2: Hold PATCH -> editable fields disabled while saving; on 409 STALE_VERSION,
    // recover via GET /registration-sessions/:id even when list endpoint omits the session!
    sessionListOmitAlpha = true;
    holdNextSessionSave = true;
    await page.getByTestId("save-session-btn").click();
    await sessionSaveHoldStartedPromise;
    await expect(page.locator("#session-coach-name")).toBeDisabled();
    await expect(page.locator("#session-capacity")).toBeDisabled();

    releaseSessionSave();
    await expect(
      page.getByTestId("session-stale-conflict-panel"),
    ).toContainText("v5");
    await expect(page.locator("#session-coach-name")).toBeEnabled();
    await page.getByRole("button", { name: "Close drawer" }).click();

    // --- 7nu: Consent Policies failed refresh after STALE_VERSION must NOT claim latest policies are loaded ---
    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await page.getByTestId("approve-policy-pol-r2-draft-1").click();
    await page.getByRole("button", { name: "Approve Policy" }).click();
    await expect(page.getByTestId("policies-action-banner")).toContainText(
      "could not be refreshed",
    );
    await expect(page.getByTestId("policies-action-banner")).not.toContainText(
      "latest policies are now loaded",
    );

    // --- 7oK negative + CnCC: Changed organization destroys workspace and unsaved session draft ---
    sessionListOmitAlpha = false;
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000901")
      .click();
    await page.fill("#session-coach-name", "Should Be Destroyed On Org Change");
    nextSessionOrg = SECONDARY_ORG_ID;
    await page.evaluate((storageKey) => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: window.localStorage.getItem(storageKey),
        }),
      );
    }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
    // Wait for data unique to Organization B after verification, then open B's session editor
    // and assert the coach input contains B's authoritative server value (not Org A's draft!).
    await expect(page.getByTestId("session-editor-form")).toHaveCount(0);
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await expect(page.locator("body")).toContainText("Org B Unique Cohort");
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000902")
      .click();
    await expect(page.getByTestId("session-editor-form")).toBeVisible();
    await expect(page.locator("#session-coach-name")).toHaveValue(
      "Coach Org B Server",
    );
    await expect(page.locator("#session-coach-name")).not.toHaveValue(
      "Should Be Destroyed On Org Change",
    );
  });

  test("R2-FINAL-01: same-context revalidation during pending status PATCH, session Save, and policy Approve reconciles pending flags without clobbering or duplicate replay", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    await page.addInitScript(
      ({ storageKey, exp }) => {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "synthetic-r2final-aal2-token",
            refresh_token: "synthetic-r2final-refresh-token",
            expires_in: 3600,
            expires_at: exp,
            token_type: "bearer",
            user: {
              id: "staff-r2final-1",
              email: "r2final@example.test",
            },
          }),
        );
      },
      { storageKey: ADMIN_SUPABASE_SESSION_STORAGE_KEY, exp: expiresAt },
    );

    let holdSessionGate = null;
    let holdSessionStarted = null;
    await page.route("**/v1/admin/session", async (route) => {
      if (holdSessionGate) {
        const gate = holdSessionGate;
        const started = holdSessionStarted;
        holdSessionGate = null;
        holdSessionStarted = null;
        started();
        await gate;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "staff-r2final-1",
          organizationId: DEFAULT_ORG_ID,
          email: "r2final@example.test",
          displayName: "R2 Final Staff",
          roles: ["SUPER_ADMIN", "MANAGEMENT"],
          mfaSatisfied: true,
          preferredLocale: "en",
          authenticatorAssuranceLevel: "aal2",
        }),
      });
    });

    const triggerSameContextRenewal = async () => {
      let release;
      holdSessionGate = new Promise((r) => {
        release = r;
      });
      const started = new Promise((r) => {
        holdSessionStarted = r;
      });
      await page.evaluate((storageKey) => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: storageKey,
            newValue: window.localStorage.getItem(storageKey),
          }),
        );
      }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
      await started;
      await expect(page.getByTestId("admin-revalidating-gate")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      return release;
    };

    const regRow = {
      id: "reg-r2f-1",
      referenceCode: "KAR-R2FINAL1",
      status: "RECEIVED",
      version: 2,
      playerFullName: "R2 Final Player",
      ageAtReference: 11,
      sessionId: "00000000-0000-4000-8000-000000000951",
      sessionName: "Session R2 Final",
      createdAt: "2026-08-01T02:00:00.000Z",
      updatedAt: "2026-08-01T02:00:00.000Z",
    };
    const regDetail = makeSyntheticDetail({
      id: "reg-r2f-1",
      referenceCode: "KAR-R2FINAL1",
      status: "RECEIVED",
      version: 2,
      playerFullName: "R2 Final Player",
      sessionId: "00000000-0000-4000-8000-000000000951",
      sessionName: "Session R2 Final",
    });
    const sessionRow = makeSyntheticSession({
      id: "00000000-0000-4000-8000-000000000951",
      name: "Session R2 Final",
      publicationState: "DRAFT",
      version: 3,
      capacity: 20,
      coachDisplayName: "Coach Original",
    });
    const policyDraft = {
      id: "pol-r2f-1",
      policyVersion: "SYNTHETIC-R2F-V1",
      status: "DRAFT",
      version: 1,
      content: makeSyntheticPolicyContent("r2f"),
      createdAt: "2026-08-01T00:00:00.000Z",
      approvedAt: null,
      retiredAt: null,
    };

    let statusPatchCount = 0;
    const searchQueryHistory = [];
    let statusPatchStarted;
    const statusPatchStartedP = new Promise((r) => {
      statusPatchStarted = r;
    });
    let releaseStatusPatch;
    const statusPatchGate = new Promise((r) => {
      releaseStatusPatch = r;
    });
    let statusPatchSettled = Promise.resolve();
    let detailVersion = 2;

    let sessionPatchCount = 0;
    let sessionPatchStarted;
    const sessionPatchStartedP = new Promise((r) => {
      sessionPatchStarted = r;
    });
    let releaseSessionPatch;
    const sessionPatchGate = new Promise((r) => {
      releaseSessionPatch = r;
    });
    let sessionPatchSettled = Promise.resolve();
    let sessionServerVersion = 3;

    let policyApproveCount = 0;
    let policyApproveStarted;
    const policyApproveStartedP = new Promise((r) => {
      policyApproveStarted = r;
    });
    let releasePolicyApprove;
    const policyApproveGate = new Promise((r) => {
      releasePolicyApprove = r;
    });
    let policyApproveSettled = Promise.resolve();
    let policyApprovedOnServer = false;

    await page.route(
      /\/v1\/admin\/academy\/registrations(\/|\?|$)/,
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (
          url.includes("/registrations/reg-r2f-1/status") &&
          method === "PATCH"
        ) {
          statusPatchCount += 1;
          if (statusPatchCount === 1) {
            statusPatchSettled = trackRequestSettlement(page, route.request());
            statusPatchStarted();
            await statusPatchGate;
            detailVersion = 3;
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                ...regDetail,
                status: "UNDER_REVIEW",
                version: 3,
              }),
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...regDetail,
              status: "CONFIRMED",
              version: 4,
            }),
          });
          return;
        }
        if (url.includes("/registrations/search") && method === "POST") {
          const body = route.request().postDataJSON();
          if (body && typeof body.q === "string") {
            searchQueryHistory.push(body.q);
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              items: [
                {
                  ...regRow,
                  status: detailVersion >= 3 ? "UNDER_REVIEW" : "RECEIVED",
                  version: detailVersion,
                },
              ],
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
          });
          return;
        }
        if (url.includes("/registrations/reg-r2f-1") && method === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...regDetail,
              status: detailVersion >= 3 ? "UNDER_REVIEW" : "RECEIVED",
              version: detailVersion,
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                ...regRow,
                status: detailVersion >= 3 ? "UNDER_REVIEW" : "RECEIVED",
                version: detailVersion,
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions(\/|\?|$)/,
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (
          url.includes(
            "/registration-sessions/00000000-0000-4000-8000-000000000951",
          ) &&
          method === "PATCH"
        ) {
          sessionPatchCount += 1;
          if (sessionPatchCount === 1) {
            sessionPatchSettled = trackRequestSettlement(page, route.request());
            sessionPatchStarted();
            await sessionPatchGate;
            sessionServerVersion = 4;
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                ...sessionRow,
                coachDisplayName: "Coach Interrupted Pending",
                version: 4,
              }),
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...sessionRow,
              coachDisplayName: "Coach Verified Retry",
              version: 5,
            }),
          });
          return;
        }
        if (
          url.includes(
            "/registration-sessions/00000000-0000-4000-8000-000000000951",
          ) &&
          method === "GET"
        ) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...sessionRow,
              coachDisplayName:
                sessionServerVersion >= 4
                  ? "Coach Authoritative Server V4"
                  : "Coach Original",
              version: sessionServerVersion,
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                ...sessionRow,
                coachDisplayName:
                  sessionServerVersion >= 4
                    ? "Coach Authoritative Server V4"
                    : "Coach Original",
                version: sessionServerVersion,
              },
            ],
          }),
        });
      },
    );

    await page.route(
      /\/v1\/admin\/academy\/registration-policies(\/|\?|$)/,
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (url.includes("/approve") && method === "POST") {
          policyApproveCount += 1;
          policyApproveSettled = trackRequestSettlement(page, route.request());
          policyApproveStarted();
          await policyApproveGate;
          policyApprovedOnServer = true;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...policyDraft,
              status: "APPROVED",
              version: 2,
              approvedAt: "2026-08-01T03:00:00.000Z",
            }),
          });
          return;
        }
        const current = policyApprovedOnServer
          ? {
              ...policyDraft,
              status: "APPROVED",
              version: 2,
              approvedAt: "2026-08-01T03:00:00.000Z",
            }
          : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            current,
            items: [current ?? policyDraft],
          }),
        });
      },
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

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("KAR-R2FINAL1");

    // 0) CnBl + C3BA: Change search input just before same-context renewal -> assert NO search fired before renewal, then debounce restarts cleanly after renewal!
    const searchBox = page.locator('input[type="search"]').first();
    await searchBox.fill("Amina");
    const releaseSearchRenewal = await triggerSameContextRenewal();
    expect(searchQueryHistory.includes("Amina")).toBe(false);
    releaseSearchRenewal();
    await expect.poll(() => searchQueryHistory.includes("Amina")).toBe(true);
    await searchBox.fill("");
    await expect(page.locator("body")).toContainText("KAR-R2FINAL1");

    // 1) Registration status PATCH pending during same-context renewal
    await page.getByTestId("review-registration-reg-r2f-1").click();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();
    await page.selectOption("#registration-next-status", "UNDER_REVIEW");
    await page.getByTestId("open-status-confirm-btn").click();
    await page.getByRole("button", { name: "Confirm Status Change" }).click();
    await statusPatchStartedP;

    const releaseRenewal1 = await triggerSameContextRenewal();
    releaseStatusPatch();
    await flushUiAfterSettled(page, statusPatchSettled);
    await expect(page.getByTestId("admin-revalidating-gate")).toBeVisible();

    releaseRenewal1();
    await expect(page.getByTestId("registration-detail-content")).toBeVisible();
    await expect(page.getByTestId("status-update-feedback")).toContainText(
      "interrupted your prior status update",
    );
    await expect(page.getByTestId("registration-detail-content")).toContainText(
      "v3",
    );
    // Confirm dialog cleared, pending flag recovered, no duplicate PATCH sent!
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    expect(statusPatchCount).toBe(1);
    await page.selectOption("#registration-next-status", "CONFIRMED");
    await expect(page.getByTestId("open-status-confirm-btn")).toBeEnabled();
    await page.getByRole("button", { name: "Close drawer" }).click();

    // 2) Training Session Save PATCH pending during same-context renewal
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000951")
      .click();
    await page.fill("#session-coach-name", "Coach Interrupted Pending");
    await page.getByTestId("save-session-btn").click();
    await sessionPatchStartedP;

    const releaseRenewal2 = await triggerSameContextRenewal();
    releaseSessionPatch();
    await flushUiAfterSettled(page, sessionPatchSettled);
    await expect(page.getByTestId("admin-revalidating-gate")).toBeVisible();

    releaseRenewal2();
    await expect(page.getByTestId("session-editor-form")).toBeVisible();
    // Preserved draft visible, saving flag NOT locked (inputs enabled), Save disabled until explicit review!
    await expect(page.locator("#session-coach-name")).toHaveValue(
      "Coach Interrupted Pending",
    );
    await expect(page.locator("#session-coach-name")).toBeEnabled();
    await expect(
      page.getByTestId("session-interrupted-save-notice"),
    ).toContainText("v4");
    await expect(page.getByTestId("save-session-btn")).toBeDisabled();
    expect(sessionPatchCount).toBe(1);

    // Explicit review loads distinct server v4 coach and unlocks Save cleanly (CnCE)
    await page.getByTestId("load-interrupted-session-btn").click();
    await expect(
      page.getByTestId("session-interrupted-save-notice"),
    ).toHaveCount(0);
    await expect(page.locator("#session-coach-name")).toHaveValue(
      "Coach Authoritative Server V4",
    );
    await expect(page.getByTestId("save-session-btn")).toBeEnabled();
    await page.getByRole("button", { name: "Close drawer" }).click();

    // 3) Consent Policy Approve pending during same-context renewal
    await page.getByRole("tab", { name: /Consent Policies/i }).click();
    await page.getByTestId("approve-policy-pol-r2f-1").click();
    await page.getByRole("button", { name: "Approve Policy" }).click();
    await policyApproveStartedP;

    const releaseRenewal3 = await triggerSameContextRenewal();
    releasePolicyApprove();
    await flushUiAfterSettled(page, policyApproveSettled);
    await expect(page.getByTestId("admin-revalidating-gate")).toBeVisible();

    releaseRenewal3();
    await expect(page.getByTestId("policies-action-banner")).toContainText(
      "interrupted your policy approve",
    );
    // Confirmation dialog cleared, mutating flag not locked, list refreshed with server APPROVED state, no duplicate POST!
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByTestId("current-approved-policy-card"),
    ).toContainText("SYNTHETIC-R2F-V1");
    expect(policyApproveCount).toBe(1);
  });

  test("R2-FINAL-01 edge case: second same-context renewal while interrupted-save recovery GET is pending does not strand editor in refreshing state", async ({
    page,
  }) => {
    const authPayload = {
      id: "staff-r2-double",
      organizationId: DEFAULT_ORG_ID,
      email: "double-renewal@khlim.example.test",
      displayName: "Double Renewal Staff",
      roles: ["SUPER_ADMIN", "MANAGEMENT"],
      mfaSatisfied: true,
      preferredLocale: "en",
      authenticatorAssuranceLevel: "aal2",
    };

    const sessionRow = makeSyntheticSession({
      id: "00000000-0000-4000-8000-000000000952",
      name: "Double Renewal Recovery Cohort",
      coachDisplayName: "Coach Original",
      version: 3,
      publicationState: "PUBLISHED",
    });

    await setupAuthenticatedAdminSession(page, authPayload);

    let holdNextSessionAuth = false;
    let sessionAuthStarted = () => {};
    let releaseSessionAuth = () => {};

    await page.unroute(/\/v1\/admin\/session$/);
    await page.route(/\/v1\/admin\/session$/, async (route) => {
      if (holdNextSessionAuth) {
        holdNextSessionAuth = false;
        const gate = new Promise((r) => {
          releaseSessionAuth = r;
        });
        sessionAuthStarted();
        await gate;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(authPayload),
      });
    });

    const triggerSameContextRenewal = async () => {
      holdNextSessionAuth = true;
      const started = new Promise((r) => {
        sessionAuthStarted = r;
      });
      await page.evaluate((storageKey) => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: storageKey,
            newValue: window.localStorage.getItem(storageKey),
          }),
        );
      }, ADMIN_SUPABASE_SESSION_STORAGE_KEY);
      await started;
      await expect(page.getByTestId("admin-revalidating-gate")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      return () => releaseSessionAuth();
    };

    let sessionPatchCount = 0;
    let sessionPatchStarted;
    const sessionPatchStartedP = new Promise((r) => {
      sessionPatchStarted = r;
    });
    let releaseSessionPatch;
    const sessionPatchGate = new Promise((r) => {
      releaseSessionPatch = r;
    });
    let sessionPatchSettled = Promise.resolve();
    let sessionServerVersion = 3;

    let recoveryGetCount = 0;
    let recoveryGet1Started;
    const recoveryGet1StartedP = new Promise((r) => {
      recoveryGet1Started = r;
    });
    let releaseRecoveryGet1;
    const recoveryGet1Gate = new Promise((r) => {
      releaseRecoveryGet1 = r;
    });
    let recoveryGet1Settled = Promise.resolve();

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

    await page.route(
      /\/v1\/admin\/academy\/registration-sessions(\/|\?|$)/,
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (
          url.includes(
            "/registration-sessions/00000000-0000-4000-8000-000000000952",
          ) &&
          method === "PATCH"
        ) {
          sessionPatchCount += 1;
          sessionPatchSettled = trackRequestSettlement(page, route.request());
          sessionPatchStarted();
          await sessionPatchGate;
          sessionServerVersion = 4;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...sessionRow,
              coachDisplayName: "Coach Double Renewal Edit",
              version: 4,
            }),
          });
          return;
        }
        if (
          url.includes(
            "/registration-sessions/00000000-0000-4000-8000-000000000952",
          ) &&
          method === "GET"
        ) {
          recoveryGetCount += 1;
          if (recoveryGetCount === 1) {
            recoveryGet1Settled = trackRequestSettlement(page, route.request());
            recoveryGet1Started();
            await recoveryGet1Gate;
            // Even if this superseded recovery GET resolves late with stale v3, it must be ignored
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                ...sessionRow,
                coachDisplayName: "Coach Stale Recovery",
                version: 3,
              }),
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...sessionRow,
              coachDisplayName: "Coach Authoritative V4",
              version: sessionServerVersion,
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                ...sessionRow,
                coachDisplayName:
                  sessionServerVersion >= 4
                    ? "Coach Authoritative V4"
                    : "Coach Original",
                version: sessionServerVersion,
              },
            ],
          }),
        });
      },
    );

    await page.route(/\/v1\/admin\/academy\/registration-policies$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ current: null, items: [] }),
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

    await page.goto("/registrations", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Training Sessions/i }).click();
    await page
      .getByTestId("edit-session-00000000-0000-4000-8000-000000000952")
      .click();
    await page.fill("#session-coach-name", "Coach Double Renewal Edit");
    await page.getByTestId("save-session-btn").click();
    await sessionPatchStartedP;

    // Renewal #1 interrupts the pending Save PATCH
    const releaseRenewal1 = await triggerSameContextRenewal();
    releaseSessionPatch();
    await flushUiAfterSettled(page, sessionPatchSettled);
    await expect(page.getByTestId("admin-revalidating-gate")).toBeVisible();

    // Release Renewal #1 -> interrupted-save recovery GET #1 starts and is held pending
    releaseRenewal1();
    await recoveryGet1StartedP;
    await expect(
      page.getByTestId("session-interrupted-save-notice"),
    ).toContainText("Refreshing latest server state");
    await expect(page.getByTestId("save-session-btn")).toBeDisabled();

    // Renewal #2 interrupts the in-flight recovery GET #1 (keep GET #1 HELD until v4 is visible — CnCF!)
    const releaseRenewal2 = await triggerSameContextRenewal();

    // Release Renewal #2 -> Recovery GET #2 runs automatically and resolves to authoritative v4 (NOT stranded in refreshing!)
    releaseRenewal2();
    await expect(page.getByTestId("session-editor-form")).toBeVisible();
    await expect(page.locator("#session-coach-name")).toHaveValue(
      "Coach Double Renewal Edit",
    );
    await expect(
      page.getByTestId("session-interrupted-save-notice"),
    ).toContainText("v4");
    await expect(
      page.getByTestId("load-interrupted-session-btn"),
    ).toBeVisible();
    await expect(page.getByTestId("save-session-btn")).toBeDisabled();
    expect(recoveryGetCount).toBeGreaterThanOrEqual(2);
    expect(sessionPatchCount).toBe(1);

    // NOW release stale Recovery GET #1 (returning stale v3) AFTER v4 is already visible -> wait for settlement/cancellation -> v4 MUST remain authoritative!
    releaseRecoveryGet1();
    await flushUiAfterSettled(page, recoveryGet1Settled);
    await expect(
      page.getByTestId("session-interrupted-save-notice"),
    ).toContainText("v4");
    await expect(
      page.getByTestId("session-interrupted-save-notice"),
    ).not.toContainText("v3");

    // Explicit staff review loads authoritative v4 (never stale v3) and unlocks Save cleanly
    await page.getByTestId("load-interrupted-session-btn").click();
    await expect(
      page.getByTestId("session-interrupted-save-notice"),
    ).toHaveCount(0);
    await expect(page.locator("#session-coach-name")).toHaveValue(
      "Coach Authoritative V4",
    );
    await expect(page.getByTestId("save-session-btn")).toBeEnabled();
    expect(sessionPatchCount).toBe(1);
  });
});
