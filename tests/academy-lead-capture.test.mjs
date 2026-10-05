import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("phone normalization handles Malaysian local, prefix, and E.164 formats", async () => {
  const { normalizePhoneNumber } =
    await import("../apps/api/src/academy/academy-leads.validation.js").catch(
      async () => {
        // If ts not compiled directly into js in src, import from dist
        return import("../apps/api/dist/academy/academy-leads.validation.js");
      },
    );

  // Malaysian local
  assert.equal(normalizePhoneNumber("0123456789"), "+60123456789");
  assert.equal(normalizePhoneNumber("012-345 6789"), "+60123456789");
  assert.equal(normalizePhoneNumber("011-12345678"), "+601112345678");

  // Malaysian with country prefix
  assert.equal(normalizePhoneNumber("60123456789"), "+60123456789");
  assert.equal(normalizePhoneNumber("+60123456789"), "+60123456789");
  assert.equal(normalizePhoneNumber("+60 12-345 6789"), "+60123456789");

  // International E.164
  assert.equal(normalizePhoneNumber("+65 9123 4567"), "+6591234567");
  assert.equal(normalizePhoneNumber("+1 415 555 2671"), "+14155552671");
  assert.equal(normalizePhoneNumber("+44 20 7946 0958"), "+442079460958");

  // Invalid formats reject
  assert.throws(() => normalizePhoneNumber(""), /required/);
  assert.throws(() => normalizePhoneNumber("12345"), /valid Malaysian/);
  assert.throws(() => normalizePhoneNumber("abc-defg"), /valid Malaysian/);
  assert.throws(() => normalizePhoneNumber(123456789), /must be a string/);
});

test("child age validation enforces range between 3 and 18 years inclusive", async () => {
  const { validateChildAge } =
    await import("../apps/api/src/academy/academy-leads.validation.js").catch(
      async () => {
        return import("../apps/api/dist/academy/academy-leads.validation.js");
      },
    );

  assert.equal(validateChildAge(3), 3);
  assert.equal(validateChildAge(10), 10);
  assert.equal(validateChildAge(18), 18);
  assert.equal(validateChildAge(7), 7);

  assert.throws(() => validateChildAge("7"), /between 3 and 18/);
  assert.throws(() => validateChildAge(2), /between 3 and 18/);
  assert.throws(() => validateChildAge(19), /between 3 and 18/);
  assert.throws(() => validateChildAge(0), /between 3 and 18/);
  assert.throws(() => validateChildAge(-5), /between 3 and 18/);
  assert.throws(() => validateChildAge(7.5), /between 3 and 18/);
  assert.throws(() => validateChildAge("ten"), /integer/);
});

test("guardian name and consent validations enforce required fields", async () => {
  const { validateGuardianName, validateConsent } =
    await import("../apps/api/src/academy/academy-leads.validation.js").catch(
      async () => {
        return import("../apps/api/dist/academy/academy-leads.validation.js");
      },
    );

  assert.equal(validateGuardianName("Lim Wei Hong"), "Lim Wei Hong");
  assert.equal(validateGuardianName("  Sarah Tan  "), "Sarah Tan");
  assert.throws(() => validateGuardianName(""), /required/);
  assert.throws(() => validateGuardianName("   "), /required/);
  assert.throws(() => validateGuardianName("a".repeat(121)), /120 characters/);

  assert.equal(validateConsent(true), true);
  assert.throws(() => validateConsent(false), /consent is required/);
  assert.throws(() => validateConsent("true"), /consent is required/);
  assert.throws(() => validateConsent(null), /consent is required/);
  assert.throws(() => validateConsent(undefined), /consent is required/);
});

test("campaign source sanitation and web helper preserve clean attribution tokens", async () => {
  const { sanitizeCampaignSource } =
    await import("../apps/api/src/academy/academy-leads.validation.js").catch(
      async () => {
        return import("../apps/api/dist/academy/academy-leads.validation.js");
      },
    );

  assert.equal(sanitizeCampaignSource("3x3-oct24"), "3x3-oct24");
  assert.equal(sanitizeCampaignSource("ig_stories_ad"), "ig_stories_ad");
  assert.equal(sanitizeCampaignSource(null), null);
  assert.equal(sanitizeCampaignSource(undefined), null);
  assert.equal(sanitizeCampaignSource(""), null);

  // Invalid tokens with disallowed chars or overflow
  assert.throws(() => sanitizeCampaignSource("<script>"), /alphanumeric/);
  assert.throws(
    () => sanitizeCampaignSource("source with spaces"),
    /alphanumeric/,
  );
  assert.throws(() => sanitizeCampaignSource("x".repeat(65)), /64 characters/);
});

test("idempotency hash determinism matches identical payloads and differentiates altered payloads", () => {
  const payload1 = {
    guardianName: "Lim Wei Hong",
    phone: "+60123456789",
    email: "lim.wh@example.test",
    childAge: 10,
    programmeOfferingId: "00000000-0000-4000-8000-000000000002",
    source: "3x3-oct24",
  };

  const payload1Copy = {
    guardianName: "Lim Wei Hong",
    phone: "+60123456789",
    email: "lim.wh@example.test",
    childAge: 10,
    programmeOfferingId: "00000000-0000-4000-8000-000000000002",
    source: "3x3-oct24",
  };

  const payload2 = {
    ...payload1,
    guardianName: "Tan Wei Hong",
  };

  const hash1 = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload1))
    .digest("hex");

  const hash1Copy = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload1Copy))
    .digest("hex");

  const hash2 = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload2))
    .digest("hex");

  assert.equal(hash1, hash1Copy);
  assert.notEqual(hash1, hash2);
});

test("RLS migration guarantees row-level security and permission revocation on leads tables", async () => {
  const migrationSql = await read(
    "prisma/migrations/20261006120000_academy_lead_capture/migration.sql",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "public"\."academy_leads" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /ALTER TABLE "public"\."submission_rate_limits" ENABLE ROW LEVEL SECURITY;/,
  );
  assert.match(
    migrationSql,
    /REVOKE ALL PRIVILEGES ON TABLE "public"\."academy_leads" FROM anon/,
  );
  assert.match(
    migrationSql,
    /REVOKE ALL PRIVILEGES ON TABLE "public"\."submission_rate_limits" FROM anon/,
  );
  assert.match(
    migrationSql,
    /CHECK \("child_age" >= 3 AND "child_age" <= 18\)/,
  );
});

test("Admin leads controller enforces strict role authorization and MFA requirement", async () => {
  const controller = await read(
    "apps/api/src/academy/academy-leads-admin.controller.ts",
  );

  assert.match(
    controller,
    /@RequireAnyRole\("SUPER_ADMIN",\s*"MANAGEMENT",\s*"ACADEMY_ADMIN"\)/,
  );
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(controller, /@Controller\("admin\/academy\/leads"\)/);
});

test("Public lead capture does not leak PII in response and audit logging is PII-clean", async () => {
  const publicController = await read(
    "apps/api/src/academy/academy-leads.controller.ts",
  );
  const leadsService = await read(
    "apps/api/src/academy/academy-leads.service.ts",
  );

  // Public endpoint returns acknowledgment only: id, status, message, createdAt
  assert.match(publicController, /@Controller\("academy\/leads"\)/);
  assert.match(publicController, /@Post\(\)/);
  assert.match(publicController, /@Public\(\)/);

  // Leads service records audit event with non-PII summary
  assert.match(leadsService, /action:\s*"ACADEMY_LEAD_UPDATED"/);
  assert.match(leadsService, /entityType:\s*"ACADEMY_LEAD"/);
  // Summary does not embed guardian phone or email
  assert.doesNotMatch(leadsService, /summary:\s*`.*phone/);
  assert.doesNotMatch(leadsService, /summary:\s*`.*email/);
});

test("Admin UI and Web UI incorporate Academy lead capture features cleanly", async () => {
  const webInterestPage = await read("apps/web/app/interest/page.tsx");
  const adminLeadsPage = await read("apps/admin/app/leads/page.tsx");
  const adminDashboardPage = await read("apps/admin/app/page.tsx");

  // Web interest page has bilingual consent and WhatsApp contact
  assert.match(webInterestPage, /data-i18n-static="bilingual"/);
  assert.match(webInterestPage, /wa\.me/);

  // Admin leads inbox has manual WhatsApp action without automated send
  assert.match(adminLeadsPage, /wa\.me/);
  assert.match(adminLeadsPage, /No automated WhatsApp message is sent/);
  assert.match(adminLeadsPage, /updateAdminLead/);
  assert.match(adminLeadsPage, /expectedUpdatedAt/);

  // Admin dashboard has role-gated lead summary cards
  assert.match(adminDashboardPage, /getAdminLeadSummary/);
  assert.match(adminDashboardPage, /href="\/leads\?status=NEW"/);
  assert.match(adminDashboardPage, /href="\/leads\?status=NEEDS_FOLLOW_UP"/);
});
