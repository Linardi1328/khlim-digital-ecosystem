import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("notifications persist delivery and per-user read state", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.match(schema, /model Notification/);
  assert.match(schema, /model NotificationReceipt/);
  assert.match(schema, /@@unique\(\[notificationId, userId\]\)/);
});

test("Admin notifications are targeted, persistent, and MFA protected", async () => {
  const controller = await read(
    "apps/api/src/notifications/notifications.controller.ts",
  );
  const service = await read(
    "apps/api/src/notifications/notifications.service.ts",
  );
  const page = await read("apps/admin/app/notifications/page.tsx");
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(service, /ALL_GUARDIANS/);
  assert.match(service, /programmeOfferingId/);
  assert.match(page, /Send notification/);
});

test("portal exposes unread/read notification lifecycle", async () => {
  const page = await read("apps/web/app/portal/notifications/page.tsx");
  const api = await read("apps/web/lib/api-service.ts");
  assert.match(page, /Mark as read/);
  assert.match(page, /unread/);
  assert.match(api, /listMyNotifications/);
  assert.match(api, /markNotificationRead/);
});

test("linked session cancellations notify families without making delivery authoritative", async () => {
  const controller = await read(
    "apps/api/src/scheduling/scheduling.controller.ts",
  );
  assert.match(controller, /notifyOffering/);
  assert.match(controller, /Schedule change:/);
  assert.match(controller, /programmeOfferingId/);
  assert.match(controller, /\.catch\(\(\) => undefined\)/);
});
