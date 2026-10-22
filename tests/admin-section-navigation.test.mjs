import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(
  path.join(root, "apps/admin/components/layout/admin-sections.ts"),
  "utf8",
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
}).outputText;
const module = { exports: {} };
const execute = vm.runInNewContext(
  "(function(module, exports) { " + transpiled + "\n})",
  {},
);
execute(module, module.exports);
const {
  ADMIN_SECTIONS,
  getAdminSectionForPath,
  canViewAdminPage,
  canViewAdminSection,
} = module.exports;

test("KHLIM sidebar has nine workspaces while preserving all 21 original page URLs", () => {
  assert.equal(ADMIN_SECTIONS.length, 9);
  const names = ADMIN_SECTIONS.map((section) => section.label);
  assert.deepEqual([...names], [
    "Overview",
    "Growth & Leads",
    "Academy Setup",
    "Members & Families",
    "Training Operations",
    "Finance",
    "Content Management",
    "Communications",
    "Team & Administration",
  ]);
  const urls = ADMIN_SECTIONS.flatMap((section) =>
    section.pages.map((page) => page.href),
  );
  assert.equal(urls.length, 21);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    assert.ok(getAdminSectionForPath(url), "Missing navigation for " + url);
  }
});

test("campaign deep links remain under Growth instead of overlapping Overview", () => {
  const campaign = getAdminSectionForPath("/insights/campaigns");
  assert.equal(campaign.section.label, "Growth & Leads");
  assert.equal(campaign.page.label, "3x3 Campaign");
  assert.equal(getAdminSectionForPath("/insights").section.label, "Overview");
  assert.equal(getAdminSectionForPath("/insights/campaigns/audit").section.label, "Growth & Leads");
  assert.equal(getAdminSectionForPath("/dashboard").section.label, "Overview");
  assert.equal(getAdminSectionForPath("/unknown"), null);
});

test("section tabs preserve existing work-view restrictions", () => {
  const coachSections = ADMIN_SECTIONS
    .filter((section) => canViewAdminSection(section, "COACH"))
    .map((section) => section.label);
  assert.deepEqual([...coachSections], [
    "Overview",
    "Members & Families",
    "Training Operations",
  ]);
  const finance = getAdminSectionForPath("/payments");
  assert.equal(canViewAdminPage(finance.page, "COACH"), false);
  assert.equal(canViewAdminPage(finance.page, "FINANCE_ADMIN"), true);

  const growth = getAdminSectionForPath("/leads");
  assert.equal(canViewAdminPage(growth.page, "EVENT_STAFF"), false);
  assert.equal(canViewAdminPage(growth.page, "ACADEMY_ADMIN"), true);

  const moderation = getAdminSectionForPath("/moderation");
  assert.equal(canViewAdminPage(moderation.page, "ACADEMY_ADMIN"), false);
  assert.equal(canViewAdminPage(moderation.page, "MANAGEMENT"), true);

  assert.equal(ADMIN_SECTIONS.filter((section) =>
    canViewAdminSection(section, "SUPER_ADMIN")).length, 9);
});

test("every Admin page includes purpose, workflow and safeguarding instructions", () => {
  for (const section of ADMIN_SECTIONS) {
    assert.ok(section.description.trim().length > 20);
    assert.equal(section.href, section.pages[0].href);
    for (const page of section.pages) {
      assert.ok(page.purpose.trim().length > 20, page.href);
      assert.ok(page.steps.trim().length > 30, page.href);
      assert.ok(page.caution.trim().length > 20, page.href);
    }
  }
});
