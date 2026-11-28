import { expect, test } from "@playwright/test";

const ADMIN_SUPABASE_SESSION_STORAGE_KEY = "khlim_admin_supabase_session";

test.describe("CR-03 Admin Demo-Mode Isolation", () => {
  test("Demo build with stored real staff credentials renders demo-unavailable state and issues zero live registration API requests", async ({
    page,
  }) => {
    const liveRegistrationRequests = [];
    const requestsWithAuthHeader = [];

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    await page.addInitScript(
      ({ storageKey, expiresAt }) => {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzeW50aGV0aWMtcmVhbC1zdGFmZiIsImFhbCI6ImFhbDIifQ.synthetic-sig", // betterleaks:allow -- synthetic JWT with dummy signature; not a credential
            refresh_token: "synthetic-real-refresh-token",
            expires_in: 3600,
            expires_at: expiresAt,
            token_type: "bearer",
            user: {
              id: "synthetic-real-staff-id",
              email: "real.staff@example.test",
            },
          }),
        );
      },
      { storageKey: ADMIN_SUPABASE_SESSION_STORAGE_KEY, expiresAt: futureExp },
    );

    page.on("request", (req) => {
      const url = req.url();
      const authHeader = req.headers()["authorization"];
      if (
        /\/v1\/admin\/(academy|operations-data|session)\b/.test(url) ||
        url.includes("/registration-sessions") ||
        url.includes("/registration-policies") ||
        url.includes("/registrations")
      ) {
        // Ignore Next.js document/RSC/static requests to the local admin origin itself
        const parsed = new URL(url);
        if (parsed.pathname.startsWith("/v1/")) {
          liveRegistrationRequests.push({ method: req.method(), url });
        }
      }
      if (authHeader) {
        requestsWithAuthHeader.push({
          method: req.method(),
          url,
          authorization: authHeader,
        });
      }
    });

    await page.goto("/registrations", { waitUntil: "networkidle" });

    const unavailableNotice = page.getByTestId(
      "registrations-demo-unavailable",
    );
    await expect(unavailableNotice).toBeVisible();
    await expect(unavailableNotice).toContainText(
      "Unavailable in Admin Demo Mode",
    );
    await expect(unavailableNotice).toContainText(
      "strictly isolated from Admin Demo Mode",
    );

    // Ensure no live tabs, registration table, or deferred fetch effects run
    await expect(page.getByRole("tab", { name: /Registrations/i })).toHaveCount(
      0,
    );
    await expect(page.getByTestId("registration-session-filter")).toHaveCount(
      0,
    );

    // Give any post-mount effects time to fire if a regression existed
    await page.waitForTimeout(300);

    expect(
      liveRegistrationRequests,
      "Demo build must issue zero live /v1/admin/* registration requests",
    ).toEqual([]);
    expect(
      requestsWithAuthHeader,
      "Demo build must never attach stored real Authorization headers",
    ).toEqual([]);

    // Reloading with the stored real session still present must also issue zero live requests
    await page.reload({ waitUntil: "networkidle" });
    await expect(unavailableNotice).toBeVisible();
    await page.waitForTimeout(200);

    expect(liveRegistrationRequests).toEqual([]);
    expect(requestsWithAuthHeader).toEqual([]);
  });
});
