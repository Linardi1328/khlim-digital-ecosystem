import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  formatRegisteredBusinessName,
  getMissingCommerceBusinessFields,
  getPublicBusinessDetails,
} from "../apps/web/lib/business-details.ts";

test("the public website uses KHLIM's exact registered company identity", () => {
  const business = getPublicBusinessDetails();
  assert.equal(business.legalName, "KHLIM Basketball Sdn. Bhd.");
  assert.equal(business.registrationNumber, "1277329-U");
  assert.equal(
    formatRegisteredBusinessName(business),
    "KHLIM Basketball Sdn. Bhd. (1277329-U)",
  );
  assert.equal(
    getMissingCommerceBusinessFields(business).includes(
      "company registration number",
    ),
    false,
  );
});

test(
  "company disclosures use the shared formatter instead of duplicate or partial names",
  async () => {
    const paths = [
      "apps/web/components/layout/public-footer.tsx",
      "apps/web/app/contact/page.tsx",
      "apps/web/app/privacy/page.tsx",
      "apps/web/app/terms/page.tsx",
    ];
    for (const path of paths) {
      const source = await readFile(
      new URL(`../${path}`, import.meta.url),
      "utf8",
    );
      assert.match(
        source,
        /formatRegisteredBusinessName\(business\)/,
        `${path} should display the shared registered identity`,
      );
      assert.doesNotMatch(
        source,
        /business\.registrationNumber\.match\(/,
        `${path} must not parse registration parentheses by hand`,
      );
    }
  },
);
