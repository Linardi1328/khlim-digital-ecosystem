import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Phase 2 programme creation uses organization-scoped persisted backend state", async () => {
  const page = await read("apps/admin/app/programmes/page.tsx");
  const api = await read("apps/admin/lib/admin-api.ts");
  const controller = await read(
    "apps/api/src/academy/academy-admin.controller.ts",
  );

  assert.match(page, /listAdminSports\(\)/);
  assert.match(page, /sportId:\s*newSportId/);
  assert.match(page, /await adminApi\.createProgramme/);
  assert.match(page, /await refreshProgrammes\(\)/);
  assert.match(page, /Programme not saved\./);
  assert.match(page, /No local fallback record was created/);

  assert.doesNotMatch(page, /prg-\$\{Date\.now\(\)\}/);
  assert.doesNotMatch(page, /Local optimistic update/);
  assert.doesNotMatch(page, /Create programme fallback/);
  assert.doesNotMatch(page, /sportCode:\s*"BASKETBALL"/);

  assert.match(api, /\/admin\/operations-data\/sports/);
  assert.match(api, /\/admin\/academy\/programmes/);
  assert.match(api, /Select an active organization sport/);

  assert.match(controller, /@Controller\("admin\/academy"\)/);
  assert.match(
    controller,
    /@RequireAnyRole\("SUPER_ADMIN",\s*"MANAGEMENT",\s*"ACADEMY_ADMIN"\)/,
  );
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(controller, /user\.organization\?\.id/);
  assert.match(
    controller,
    /this\.academy\.createProgramme\(organizationId\(user\), body\)/,
  );
});

test("Phase 2 preserves explicit demo isolation instead of silently treating demo writes as persisted", async () => {
  const api = await read("apps/admin/lib/admin-api.ts");
  const demoMode = await read("apps/admin/lib/demo-mode.ts");

  assert.match(
    api,
    /ADMIN_DEMO_MODE\s*\?\s*demoAdminApi\s*:\s*realAdminApi/,
  );
  assert.match(api, /persisted:\s*false/);
  assert.match(api, /DEMO_WRITE_METHODS/);
  assert.match(demoMode, /Changes are not persisted/);
});
