import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("scheduling and attendance persist as first-class records", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.match(schema, /model TrainingSession/);
  assert.match(schema, /model AttendanceRecord/);
  assert.match(schema, /@@unique\(\[sessionId, athleteId\]\)/);
});

test("session mutations are privileged while attendance supports event operations", async () => {
  const controller = await read(
    "apps/api/src/scheduling/scheduling.controller.ts",
  );
  assert.match(controller, /admin\/scheduling\/sessions/);
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(controller, /EVENT_STAFF/);
  assert.match(controller, /attendance/);
});

test("guardian portal schedule is relationship and membership scoped", async () => {
  const service = await read("apps/api/src/scheduling/scheduling.service.ts");
  const portal = await read("apps/web/app/portal/schedule/page.tsx");
  assert.match(service, /guardianAthleteLinks/);
  assert.match(service, /programmeOfferingId/);
  assert.match(portal, /listMySchedule/);
  assert.doesNotMatch(portal, /later platform capability/);
});

test("Admin Scheduling supports fake events and manual attendance testing", async () => {
  const page = await read("apps/admin/app/scheduling/page.tsx");
  assert.match(page, /Create session/);
  assert.match(page, /Fake or real attendee name/);
  assert.match(page, /Cancellation reason/);
  assert.match(page, /Attendance/);
});
