import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Editorial Studio fields are fully labeled and do not rely on inline legacy labels", async () => {
  const page = await read("apps/admin/app/editorial/page.tsx");
  const styles = await read("apps/admin/app/globals.css");
  assert.match(page, /className="editorial-draft-form"/);
  assert.match(page, /htmlFor=\{`editorial-\$\{key\}`\}/);
  assert.match(page, /className="editorial-draft-field editorial-draft-field-wide"/);
  for (const label of [
    "Content type", "Development note", "Summary", "Article paragraphs",
    "Facts and photo rights verified by KHLIM staff",
  ]) {
    assert.ok(page.includes(label), label);
  }
  assert.match(styles, /\.editorial-draft-field\s*>\s*label\s*\{/);
  assert.match(styles, /\.editorial-draft-form\s*\{/);
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /max-width: 640px/);
});

test("Named guardian selection maps an existing active guardian to USER audience userId", async () => {
  const page = await read("apps/admin/app/notifications/page.tsx");
  const backend = await read("apps/api/src/notifications/notifications.service.ts");
  assert.match(page, /adminApi\s*\.listGuardians\(\)/);
  assert.match(page, /guardian\.accountStatus === "ACTIVE"/);
  assert.match(page, /guardian\.displayName\.toLocaleLowerCase\(\)/);
  assert.match(page, /setTarget\(guardian\.id\)/);
  assert.match(page, /if \(audience === "USER"\) payload\.userId = target/);
  assert.match(page, /if \(audience === "USER" && !selectedGuardian\)/);
  assert.match(page, /in-app notification only/);
  assert.match(backend, /requireOrganizationRecipient\(organizationId, userId\)/);
  assert.match(backend, /receipts: \{ create: recipients\.map/);
});
