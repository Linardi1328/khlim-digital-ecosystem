import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Admin has matching vector chevrons and no font-dependent dropdown glyph", async () => {
  const sidebar = await read("apps/admin/components/layout/AdminSidebar.tsx");
  const select = await read("apps/admin/components/ui/Select.tsx");
  const css = await read("apps/admin/app/globals.css");
  assert.match(sidebar, /aria-expanded=\{expanded\}/);
  assert.match(sidebar, /<svg[\s\S]*?<path d="m6 9 6 6 6-6" \/>/);
  assert.doesNotMatch(sidebar, />\s*▾\s*</);
  assert.match(select, /backgroundImage: selectChevron/);
  assert.match(select, /appearance: "none"/);
  assert.match(css, /\.admin-page-main select\s*\{/);
  assert.match(css, /background-repeat: no-repeat/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /appearance: auto !important/);
  assert.match(css, /background-image: none !important/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.admin-nav-section-button:focus-visible/);
});

test("Admin inputs keep label and keyboard focus affordances", async () => {
  const css = await read("apps/admin/app/globals.css");
  const notifications = await read("apps/admin/app/notifications/page.tsx");
  assert.match(
    css,
    /\.admin-page-main :is\(input, select, textarea\):focus-visible/,
  );
  assert.match(notifications, /htmlFor="notice-audience"/);
  assert.match(notifications, /htmlFor="notice-target"/);
  assert.match(notifications, /id="notice-target"/);
});

test("Staff sign-in and MFA have centered, bounded, responsive card layouts", async () => {
  const css = await read("apps/admin/app/globals.css");
  const shell = await read("apps/admin/components/layout/AdminShell.tsx");
  assert.match(shell, /className="admin-access-gate"/);
  assert.match(shell, /className="admin-access-card"/);
  assert.match(css, /\.admin-access-gate\s*\{[^}]*justify-content: center;/s);
  assert.match(css, /\.admin-access-card\s*\{[^}]*max-width: 480px;/s);
  assert.match(css, /@media \(max-width: 480px\)\s*\{/);
  assert.match(css, /\.admin-access-card \[role="alert"\]/);
});

test("KHS branding appears on Admin, staff login, and MFA with a shared footer", async () => {
  const shell = await read("apps/admin/components/layout/AdminShell.tsx");
  const footer = await read("apps/admin/components/layout/AdminFooter.tsx");
  const css = await read("apps/admin/app/globals.css");

  assert.equal(
    (shell.match(/className="admin-access-brand"/g) ?? []).length,
    2,
  );
  assert.equal((shell.match(/<AdminFooter compact \/>/g) ?? []).length, 2);
  assert.match(shell, /<AdminFooter \/>/);
  assert.match(shell, /KHS ACADEMY/);
  assert.match(footer, /<footer[\s\S]*?aria-label="KHLIM Admin footer"/);
  assert.match(footer, /\/brand\/khs-academy-wordmark\.png/);
  assert.match(footer, /KHLIM Basketball Sdn\. Bhd\./);
  assert.match(css, /\.admin-access-brand img\s*\{/);
  assert.match(css, /\.admin-footer--access\s*\{/);
  assert.match(css, /\.admin-footer-inner\s*\{/);
});
