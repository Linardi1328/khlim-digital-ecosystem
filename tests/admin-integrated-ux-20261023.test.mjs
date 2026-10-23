import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Admin sidebar exposes page links inside role-filtered expandable sections", async () => {
  const sidebar = await read("apps/admin/components/layout/AdminSidebar.tsx");
  const sections = await read("apps/admin/components/layout/admin-sections.ts");

  assert.match(sidebar, /aria-expanded=\{expanded\}/);
  assert.match(sidebar, /aria-controls=/);
  assert.match(sidebar, /setExpandedSection/);
  assert.match(sidebar, /pages = section\.pages\.filter/);
  assert.match(sidebar, /canViewAdminPage\(page, role\)/);
  assert.match(sidebar, /admin-nav-subpage-current/);
  assert.match(sections, /getAdminSectionForPath/);
  assert.match(sections, /const SESSIONS/);
});

test("Admin scheduling and notifications use explicit associated input labels", async () => {
  const scheduling = await read("apps/admin/app/scheduling/page.tsx");
  const notifications = await read("apps/admin/app/notifications/page.tsx");
  for (const field of [
    "training-offering",
    "training-title",
    "training-start",
    "training-end",
    "training-venue",
    "training-court",
    "training-coach",
    "training-notes",
  ]) {
    assert.ok(scheduling.includes(`htmlFor="${field}"`), field);
    assert.ok(scheduling.includes(`id="${field}"`), field);
  }
  assert.match(scheduling, /adminApi\.listOfferings\(\)/);
  assert.doesNotMatch(scheduling, /Programme offering UUID \(optional\)/);
  for (const field of [
    "notice-type",
    "notice-audience",
    "notice-target",
    "notice-title",
    "notice-message",
  ]) {
    assert.ok(notifications.includes(`htmlFor="${field}"`), field);
    assert.ok(notifications.includes(`id="${field}"`), field);
  }
  assert.match(notifications, /selected audience/);
});

test("Admin roster and attendance remain isolated to verified staff privileges", async () => {
  const controller = await read(
    "apps/api/src/scheduling/scheduling.controller.ts",
  );
  const offering = await read("apps/admin/app/offerings/page.tsx");
  assert.match(
    controller,
    /@Get\("admin\/scheduling\/sessions\/:id\/roster"\)/,
  );
  assert.match(
    controller,
    /@RequireAnyRole\("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"\)/,
  );
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(offering, /getOfferingRoster/);
  assert.match(offering, /Registered players/);
});

test("roster compatibility reads memberships only on missing endpoint, never unauthorized", async () => {
  const client = await read("apps/admin/lib/admin-academy-roster-api.ts");
  assert.match(client, /error instanceof ApiError/);
  assert.match(client, /error\.status !== 404/);
  assert.match(client, /adminApi\.listMemberships\(\)/);
  assert.match(client, /membership\.programmeOfferingId === offeringId/);
  assert.match(client, /source: "membership-read-only"/);
  assert.doesNotMatch(client, /guardianEmail|dateOfBirth|paymentIndicator/);
});
