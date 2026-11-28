import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import { test } from "node:test";

register("./test-ts-loader.mjs", import.meta.url);

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("shared selects use a controlled inward chevron", async () => {
  const select = await read("apps/web/components/ui/select.tsx");
  const locale = await read("apps/web/components/layout/locale-switcher.tsx");

  assert.match(select, /backgroundPosition: "right 16px center"/);
  assert.match(select, /appearance: "none"/);
  assert.match(locale, /backgroundPosition: "right 12px center"/);
  assert.match(locale, /appearance: "none"/);
});

test("auth surfaces preserve production recovery while exposing language choice", async () => {
  const login = await read("apps/web/app/auth/login/page.tsx");
  const forgot = await read("apps/web/app/auth/forgot-password/page.tsx");
  const reset = await read("apps/web/app/auth/reset-password/page.tsx");
  const auth = await read("apps/web/lib/auth-context.tsx");

  assert.match(login, /<LocaleSwitcher \/>/);
  assert.match(forgot, /<LocaleSwitcher \/>/);
  assert.match(reset, /<LocaleSwitcher \/>/);
  assert.match(auth, /supabaseRecoverPassword\(email\)/);
  assert.match(reset, /supabaseUpdatePassword\(password\)/);
  assert.doesNotMatch(auth, /LAB_RESET_SECRET|OPENAI_API_KEY/);
});

test("password visibility is reusable across sign-in, registration, and reset", async () => {
  const component = await read("apps/web/components/ui/password-input.tsx");
  const login = await read("apps/web/app/auth/login/page.tsx");
  const register = await read("apps/web/app/auth/register/page.tsx");
  const reset = await read("apps/web/app/auth/reset-password/page.tsx");

  assert.match(component, /type=\{visible \? "text" : "password"\}/);
  assert.match(component, /aria-label=\{visible \? hideLabel : showLabel\}/);
  assert.match(login, /<PasswordInput/);
  assert.match(register, /<PasswordInput/);
  assert.equal((reset.match(/<PasswordInput/g) ?? []).length, 2);
});

test("preferred language changes registration UI immediately without translating user content", async () => {
  const register = await read("apps/web/app/auth/register/page.tsx");
  const i18n = await read("apps/web/lib/i18n-context.tsx");
  const locales = await read("packages/i18n/src/index.ts");

  assert.match(register, /setLocale\(nextLocale\)/);
  assert.match(i18n, /localStorage\.setItem\("khlim_locale", newLocale\)/);
  assert.match(i18n, /SameSite=Lax/);
  assert.match(locales, /"en"/);
  assert.match(locales, /"ms"/);
  assert.match(locales, /"zh-Hans"/);
});

test("guardian registration survives confirmation and failed API handoff safely", async () => {
  const supabaseAuth = await read("apps/web/lib/supabase-auth.ts");
  const login = await read("apps/web/app/auth/login/page.tsx");
  const register = await read("apps/web/app/auth/register/page.tsx");
  const messages = await read("packages/i18n/src/messages/auth-web.ts");

  assert.match(supabaseAuth, /data:\s*\{/);
  assert.match(supabaseAuth, /khlim_registration_intent/);
  assert.match(supabaseAuth, /khlim_guardian_display_name/);
  assert.match(supabaseAuth, /khlim_preferred_locale/);
  assert.match(login, /result\.guardianOnboardingRequired/);
  assert.match(register, /emailConfirmationOrSignInRequired/);
  assert.match(
    messages,
    /If this registration created a new account for \{email\}/,
  );
  assert.doesNotMatch(
    messages,
    /Supabase requires email confirmation for \{email\}/,
  );

  // Behavioral verification: failed current login clears its own session epoch and account,
  // while a superseded login failure does NOT clear a newer account's session.
  const { WebAuthSessionController } =
    await import("../apps/web/lib/web-auth-session-controller.ts");

  const sessionA = {
    access_token: "synthetic-ux-tok-a",
    refresh_token: "synthetic-ux-ref-a",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: { id: "ux-user-a", email: "a@example.test" },
  };
  const sessionB = {
    access_token: "synthetic-ux-tok-b",
    refresh_token: "synthetic-ux-ref-b",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: { id: "ux-user-b", email: "b@example.test" },
  };
  const accountB = {
    id: "ux-user-b",
    email: "b@example.test",
    displayName: "Guardian B",
    preferredLocale: "en",
    status: "ACTIVE",
    roles: ["GUARDIAN"],
    guardianProfile: {
      id: "gp-b",
      displayName: "Guardian B",
      phone: "+60120000002",
      preferredLocale: "en",
    },
  };

  let epoch = 0;
  const clearedEpochs = [];
  let signInImpl = async () => sessionA;
  let getMeImpl = async () => {
    throw new Error("API handoff failed");
  };

  const controller = new WebAuthSessionController(
    {
      storageKey: "khlim_supabase_session",
      restoreSession: async () => null,
      getMe: () => getMeImpl(),
      updatePreferences: async () => undefined,
      upsertGuardianProfile: async () => undefined,
      signIn: (email, password, expectedEpoch) =>
        signInImpl(email, password, expectedEpoch),
      signUp: async () => ({
        session: null,
        user: null,
        emailConfirmationOrSignInRequired: true,
      }),
      signOut: async () => undefined,
      invalidateSessionOperations: () => ++epoch,
      clearStoredSessionIfEpoch: (expectedEpoch) => {
        clearedEpochs.push(expectedEpoch);
      },
    },
    () => undefined,
  );

  // 1) Current login establishes Supabase session, then fails on /v1/me -> clears its own epoch & account
  const expectedEpochForFailedCurrent = epoch + 1;
  await assert.rejects(
    () =>
      controller.login(
        "a@example.test",
        "pass-a", // betterleaks:allow -- mocked sign-in fixture only
      ),
    /API handoff failed/,
  );
  assert.deepEqual(clearedEpochs, [expectedEpochForFailedCurrent]);
  assert.equal(controller.getState().isAuthenticated, false);
  assert.equal(controller.getState().account, null);
  assert.equal(controller.getState().isLoading, false);

  // 2) Control: superseded login failing on /v1/me after login(B) succeeds MUST NOT clear B's session
  clearedEpochs.length = 0;
  let rejectStaleGetMe;
  const staleGetMePromise = new Promise((_, reject) => {
    rejectStaleGetMe = reject;
  });
  let startedStaleGetMe;
  const startedStaleGetMeP = new Promise((resolve) => {
    startedStaleGetMe = resolve;
  });
  let callIndex = 0;
  signInImpl = async (email) =>
    email === "a@example.test" ? sessionA : sessionB;
  getMeImpl = () => {
    callIndex += 1;
    if (callIndex === 1) {
      startedStaleGetMe();
      return staleGetMePromise;
    }
    return Promise.resolve(accountB);
  };

  const staleLoginP = controller
    .login(
      "a@example.test",
      "pass-a", // betterleaks:allow -- mocked sign-in fixture only
    )
    .catch((err) => ({ caught: err }));
  await startedStaleGetMeP;
  await controller.login(
    "b@example.test",
    "pass-b", // betterleaks:allow -- mocked sign-in fixture only
  );
  assert.equal(controller.getState().account?.id, "ux-user-b");

  rejectStaleGetMe(new Error("Stale API failure"));
  const staleOutcome = await staleLoginP;
  assert.ok(staleOutcome && "caught" in staleOutcome);
  assert.deepEqual(clearedEpochs, []);
  assert.equal(controller.getState().isAuthenticated, true);
  assert.equal(controller.getState().account?.id, "ux-user-b");
  assert.equal(controller.getState().isLoading, false);

  controller.dispose();
});
