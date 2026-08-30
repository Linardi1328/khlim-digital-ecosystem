import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("admin navigation exposes role-gated reports and management moderation", async () => {
  const sidebar = await read("apps/admin/components/layout/AdminSidebar.tsx");

  assert.match(sidebar, /href:\s*"\/reports"/);
  assert.match(sidebar, /label:\s*"Reports"/);
  assert.match(sidebar, /roles:\s*REPORTING/);
  assert.match(sidebar, /href:\s*"\/moderation"/);
  assert.match(sidebar, /label:\s*"Moderation"/);
  assert.match(sidebar, /roles:\s*MANAGEMENT/);
  assert.match(sidebar, /const REPORTING: StaffRole\[\]/);
  assert.match(sidebar, /"HEAD_COACH"/);
});

test("operations reports are bounded, persisted, MFA gated, and finance aware", async () => {
  const controller = await read(
    "apps/api/src/admin/admin-access.controller.ts",
  );
  const service = await read("apps/api/src/admin/admin.service.ts");
  const page = await read("apps/admin/app/reports/page.tsx");
  const api = await read("apps/admin/lib/admin-api.ts");

  assert.match(controller, /@Get\("reports\/operations"\)/);
  assert.match(controller, /@RequireAnyRole\(\.\.\.REPORT_ROLES\)/);
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(
    controller,
    /@ApiQuery\(\{\s*name:\s*"from",\s*required:\s*false/,
  );
  assert.match(
    controller,
    /@ApiQuery\(\{\s*name:\s*"to",\s*required:\s*false/,
  );

  assert.match(service, /REPORT_MAX_DAYS = 366/);
  assert.match(service, /getOperationsReport\(/);
  assert.match(service, /membership\.count/);
  assert.match(service, /trainingSession\.count/);
  assert.match(service, /attendanceRecord\.count/);
  assert.match(service, /editorialEntry\.count/);
  assert.match(service, /settledAt:\s*\{\s*gte:\s*range\.from/);
  assert.match(service, /FINANCE_ROLES\.has/);
  assert.match(service, /finance = \{/);

  assert.match(api, /\/admin\/reports\/operations/);
  assert.match(page, /Operations Reports/);
  assert.match(page, /Export CSV/);
  assert.match(page, /persisted academy activity/);
  assert.match(page, /Financial totals are hidden for this role/);
  assert.match(page, /min-height:\s*44px/);
  assert.doesNotMatch(page, /trend=\{/);
  assert.doesNotMatch(page, /\+8\.4%|\+3\.2%|estimated revenue/i);
});

test("editorial moderation separates draft preparation from final publication", async () => {
  const controller = await read(
    "apps/api/src/editorial/editorial.controller.ts",
  );
  const service = await read("apps/api/src/editorial/editorial.service.ts");
  const moderation = await read("apps/admin/app/moderation/page.tsx");
  const editorial = await read("apps/admin/app/editorial/page.tsx");

  assert.match(controller, /@Get\("admin\/editorial\/moderation"\)/);
  assert.match(controller, /listModeration\(\)/);
  assert.match(
    controller,
    /@Post\("admin\/editorial\/:id\/publish"\)[\s\S]*?@RequireAnyRole\("SUPER_ADMIN",\s*"MANAGEMENT"\)[\s\S]*?@RequireMfa\(\)/,
  );
  assert.match(
    controller,
    /@Post\("admin\/editorial\/:id\/unpublish"\)[\s\S]*?@RequireAnyRole\("SUPER_ADMIN",\s*"MANAGEMENT"\)[\s\S]*?@RequireMfa\(\)/,
  );

  assert.match(service, /async listModeration\(\)/);
  assert.match(service, /moderationState:/);
  assert.match(service, /moderationBlockers:/);
  assert.match(
    service,
    /Published content must be unpublished by management before editing/,
  );
  assert.match(service, /Facts must be verified before publication/);
  assert.match(service, /Only draft content can be published/);
  assert.match(service, /Only published content can be unpublished/);

  assert.match(moderation, /Editorial Moderation/);
  assert.match(moderation, /Approve & publish/);
  assert.match(moderation, /Unpublish & return to draft/);
  assert.match(moderation, /window\.confirm/);
  assert.match(moderation, /Facts & photo rights/);
  assert.match(moderation, /min-height:\s*44px/);

  assert.match(editorial, /Drafting and publishing are separate/);
  assert.match(editorial, /Open Moderation Queue/);
  assert.match(editorial, /ready for Management moderation/);
  assert.doesNotMatch(editorial, /function transition\(/);
  assert.doesNotMatch(editorial, />Publish<\/Button>/);
  assert.doesNotMatch(editorial, />Unpublish<\/Button>/);
});
