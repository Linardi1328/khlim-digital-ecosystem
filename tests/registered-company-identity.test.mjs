import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  formatRegisteredBusinessName,
  getMissingCommerceBusinessFields,
  getPublicBusinessDetails,
} from "../apps/web/lib/business-details.ts";

test("KHLIM legal identity is exact", () => {
  const business = getPublicBusinessDetails();
  const expected = "KHLIM Basketball Sdn. Bhd. (1277329-U)";
  assert.equal(business.legalName, "KHLIM Basketball Sdn. Bhd.");
  assert.equal(business.registrationNumber, "1277329-U");
  assert.equal(formatRegisteredBusinessName(business), expected);
  const missing = getMissingCommerceBusinessFields(business);
  assert.ok(!missing.includes("company registration number"));
});

test("public pages use the shared legal identity", async () => {
  const paths = [
    "apps/web/components/layout/public-footer.tsx",
    "apps/web/app/contact/page.tsx",
    "apps/web/app/privacy/page.tsx",
    "apps/web/app/terms/page.tsx",
  ];
  for (const path of paths) {
    const url = new URL(`../${path}`, import.meta.url);
    const source = await readFile(url, "utf8");
    assert.match(source, /formatRegisteredBusinessName\(business\)/);
    assert.doesNotMatch(source, /business\.registrationNumber\.match\(/);
  }
});
