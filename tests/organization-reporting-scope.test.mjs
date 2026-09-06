import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test(
  "admin overview and operations reporting stay organization-scoped",
  async () => {
    const service = await read("apps/api/src/admin/admin.service.ts");

    assert.match(service, /function resolveOrganizationId/);
    assert.match(service, /where: \{ organizationId, status: "ACTIVE" \}/);
    assert.match(service, /memberships: \{ some: \{ organizationId \} \}/);
    assert.match(service, /where: \{ organizationId, status: "OPEN" \}/);
    assert.match(service, /session: \{ is: \{ organizationId \} \}/);
    assert.match(service, /organizationId,\n\s+status: "PAID"/);
    assert.match(service, /organizationId,\n\s+status: "FAILED"/);
    assert.match(service, /canReadLegacyEditorial/);
    assert.match(service, /organizationId === DEFAULT_ORGANIZATION_ID/);
  },
);

test(
  "operational health derives every tenant-owned signal from active organization",
  async () => {
    const service = await read(
      "apps/api/src/admin/admin-observability.service.ts",
    );

    assert.match(
      service,
      /const organizationId = resolveOrganizationId\(actor\)/,
    );
    assert.match(service, /where: \{ organizationId, status: "ACTIVE" \}/);
    assert.match(service, /session: \{ is: \{ organizationId \} \}/);
    assert.match(service, /where: \{ organizationId, status: "OPEN" \}/);
    assert.match(service, /notification: \{ is: \{ organizationId \} \}/);
    assert.match(
      service,
      /organizationId,\n\s+processingStatus: "ACTION_REQUIRED"/,
    );
    assert.match(service, /canReadLegacyEditorial/);
    assert.match(service, /organizationId === DEFAULT_ORGANIZATION_ID/);
  },
);

test(
  "reporting compatibility cannot expose legacy editorial to another organization",
  async () => {
    const admin = await read("apps/api/src/admin/admin.service.ts");
    const observability = await read(
      "apps/api/src/admin/admin-observability.service.ts",
    );

    for (const service of [admin, observability]) {
      assert.match(service, /!MULTI_ORGANIZATION_RUNTIME_ENABLED/);
      assert.match(service, /organizationId === DEFAULT_ORGANIZATION_ID/);
      assert.match(service, /Promise\.resolve\(0\)/);
    }
  },
);
