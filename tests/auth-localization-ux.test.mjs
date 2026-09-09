import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

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
