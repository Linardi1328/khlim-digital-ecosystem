import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, test } from "node:test";

register("./test-ts-loader.mjs", import.meta.url);

describe("RIC-191 Academy Registration V1 frontend helpers & contract rules", () => {
  test("Date-only validation and MYT age eligibility calculation avoid timezone drift", async () => {
    const {
      isValidDateOnly,
      isDateOnlyInFuture,
      computeAgeAtReferenceDate,
      resolveSessionAgeReferenceDate,
      formatSessionTimeRange,
    } = await import("../apps/web/lib/academy-registration-utils.ts");

    assert.equal(isValidDateOnly("2015-03-02"), true);
    assert.equal(isValidDateOnly("2016-02-29"), true);
    assert.equal(isValidDateOnly("2015-02-29"), false);
    assert.equal(isValidDateOnly("2015-13-01"), false);
    assert.equal(isValidDateOnly("02/03/2015"), false);

    assert.equal(isDateOnlyInFuture("2026-12-01", "2026-11-25"), true);
    assert.equal(isDateOnlyInFuture("2026-11-25", "2026-11-25"), false);
    assert.equal(isDateOnlyInFuture("2015-03-02", "2026-11-25"), false);

    // Exact boundary checks (day before vs birthday)
    assert.equal(computeAgeAtReferenceDate("2015-12-31", "2026-12-30"), 10);
    assert.equal(computeAgeAtReferenceDate("2015-12-31", "2026-12-31"), 11);
    assert.equal(computeAgeAtReferenceDate("2015-01-01", "2026-12-31"), 11);

    const baseSession = {
      id: "sess-1",
      name: "Ages 10-12 Saturday",
      programmeName: "KHLIM Academy",
      venue: { name: "Sports Garage", address: "Petaling Jaya" },
      coachDisplayName: "Sengjun",
      weekday: 6,
      startTime: "14:00",
      endTime: "16:00",
      timezone: "Asia/Kuala_Lumpur",
      firstSessionDate: "2026-12-19",
      recurrence: "WEEKLY",
      minAge: 10,
      maxAge: 12,
      ageReference: { rule: "FIXED_DATE", date: "2026-12-31" },
      registrationOpensAt: null,
      registrationClosesAt: null,
    };

    assert.equal(
      resolveSessionAgeReferenceDate(baseSession, "2026-11-25"),
      "2026-12-31",
    );
    assert.equal(
      resolveSessionAgeReferenceDate(
        {
          ...baseSession,
          ageReference: { rule: "SESSION_START_DATE", date: null },
        },
        "2026-11-25",
      ),
      "2026-12-19",
    );
    assert.equal(
      resolveSessionAgeReferenceDate(
        {
          ...baseSession,
          ageReference: { rule: "REGISTRATION_DATE", date: null },
        },
        "2026-11-25",
      ),
      "2026-11-25",
    );

    assert.equal(formatSessionTimeRange("14:00", "16:00"), "2:00 PM – 4:00 PM");
    assert.equal(
      formatSessionTimeRange("09:30", "11:00"),
      "9:30 AM – 11:00 AM",
    );
  });

  test("Malaysian local & E.164 phone validation, idempotency key & receipt guards", async () => {
    const {
      isValidRegistrationPhone,
      generateRegistrationIdempotencyKey,
      fingerprintRegistrationPayload,
      isValidRegistrationReceipt,
    } = await import("../apps/web/lib/academy-registration-utils.ts");

    assert.equal(isValidRegistrationPhone("012-3456789"), true);
    assert.equal(isValidRegistrationPhone("011 1234 5678"), true);
    assert.equal(isValidRegistrationPhone("+60123456789"), true);
    assert.equal(isValidRegistrationPhone("60139876543"), true);
    assert.equal(isValidRegistrationPhone("+6591234567"), true);
    assert.equal(isValidRegistrationPhone("12345"), false);
    assert.equal(isValidRegistrationPhone("abc-def"), false);

    const key = generateRegistrationIdempotencyKey();
    assert.match(key, /^[A-Za-z0-9_-]{22,128}$/);

    const basePayload = {
      sessionId: "00000000-0000-4000-8000-000000000001",
      locale: "en",
      consentVersion: "SYNTHETIC-EXAMPLE",
      player: {
        fullName: "Test Player",
        dateOfBirth: "2015-03-02",
        gender: "MALE",
        jerseySize: "YM",
        phone: null,
      },
      guardian: {
        fullName: "Test Guardian",
        phone: "012-3456789",
        relationship: "MOTHER",
        authorityConfirmed: true,
      },
      emergencyContact: {
        fullName: "Test Contact",
        phone: "013-9876543",
        relationship: "GRANDPARENT",
      },
      consents: {
        registrationPrivacy: true,
        marketing: false,
        photography: false,
      },
    };

    const fp1 = fingerprintRegistrationPayload(basePayload);
    const fp2 = fingerprintRegistrationPayload({ ...basePayload });
    const fp3 = fingerprintRegistrationPayload({
      ...basePayload,
      player: { ...basePayload.player, fullName: "Changed Player" },
    });
    assert.equal(fp1, fp2);
    assert.notEqual(fp1, fp3);

    // Receipt validation enforces reservesPlace:false and status:RECEIVED
    assert.equal(
      isValidRegistrationReceipt({
        id: "reg-1",
        referenceCode: "KAR-7H3QK9XM",
        status: "RECEIVED",
        reservesPlace: false,
        receivedAt: "2026-12-10T04:21:00.000Z",
        messageCode: "REGISTRATION_RECEIVED_PENDING_REVIEW",
        session: { id: "sess-1", name: "Ages 10-12 Saturday" },
      }),
      true,
    );
    assert.equal(
      isValidRegistrationReceipt({
        id: "reg-1",
        referenceCode: "KAR-7H3QK9XM",
        status: "RECEIVED",
        reservesPlace: true,
        receivedAt: "2026-12-10T04:21:00.000Z",
        messageCode: "REGISTRATION_RECEIVED_PENDING_REVIEW",
        session: { id: "sess-1", name: "Ages 10-12 Saturday" },
      }),
      false,
    );
  });

  test("Consent registry blocks unapproved refs and strictly isolates synthetic fixtures to localhost", async () => {
    const { resolveConsentPolicyForLocale } =
      await import("../apps/web/lib/academy-consent-registry.ts");

    const syntheticPolicy = {
      policyVersion: "SYNTHETIC-EXAMPLE",
      approvedAt: "2026-12-01T03:00:00.000Z",
      locales: ["en", "ms", "zh-Hans"],
      items: [
        {
          type: "GUARDIAN_AUTHORITY",
          required: true,
          defaultChecked: false,
          content: {
            en: {
              ref: "synthetic://academy-registration/guardian-authority/v1",
              sha256:
                "1111111111111111111111111111111111111111111111111111111111111111",
            },
            ms: {
              ref: "synthetic://academy-registration/guardian-authority/v1",
              sha256:
                "1111111111111111111111111111111111111111111111111111111111111112",
            },
            "zh-Hans": {
              ref: "synthetic://academy-registration/guardian-authority/v1",
              sha256:
                "1111111111111111111111111111111111111111111111111111111111111113",
            },
          },
        },
      ],
    };

    // Allowed on explicit localhost
    const localEn = resolveConsentPolicyForLocale(syntheticPolicy, "en", {
      hostnameOverride: "127.0.0.1",
    });
    assert.equal(localEn?.allResolved, true);
    assert.equal(localEn?.hasSyntheticFixtures, true);

    const localMs = resolveConsentPolicyForLocale(syntheticPolicy, "ms", {
      hostnameOverride: "localhost",
    });
    assert.equal(localMs?.allResolved, true);
    assert.ok(localMs?.items[0]?.text?.includes("Teks Ujian Sintetik"));

    const localZh = resolveConsentPolicyForLocale(syntheticPolicy, "zh-Hans", {
      hostnameOverride: "127.0.0.1",
    });
    assert.equal(localZh?.allResolved, true);
    assert.ok(localZh?.items[0]?.text?.includes("本地测试文本"));

    // NEVER allowed on non-local production or staging hosts
    const prodBlocked = resolveConsentPolicyForLocale(syntheticPolicy, "en", {
      hostnameOverride: "khlim.com",
    });
    assert.equal(prodBlocked?.allResolved, false);
    assert.equal(prodBlocked?.items[0]?.missingReason, "UNRESOLVED_REF");

    const stagingBlocked = resolveConsentPolicyForLocale(
      syntheticPolicy,
      "en",
      { hostnameOverride: "khlim-web-qa.vercel.app" },
    );
    assert.equal(stagingBlocked?.allResolved, false);

    // Unapproved production ref blocks even on localhost
    const unapprovedProdRef = {
      ...syntheticPolicy,
      policyVersion: "2026-12-v1",
      items: [
        {
          type: "GUARDIAN_AUTHORITY",
          required: true,
          defaultChecked: false,
          content: {
            en: { ref: "legal/2026-12/guardian-authority", sha256: "abc123" },
          },
        },
      ],
    };
    const blockedUnapproved = resolveConsentPolicyForLocale(
      unapprovedProdRef,
      "en",
      { hostnameOverride: "localhost" },
    );
    assert.equal(blockedUnapproved?.allResolved, false);

    // Hash mismatch blocks resolution
    const hashMismatchPolicy = {
      ...syntheticPolicy,
      items: [
        {
          ...syntheticPolicy.items[0],
          content: {
            en: {
              ref: "synthetic://academy-registration/guardian-authority/v1",
              sha256: "wrong-hash",
            },
          },
        },
      ],
    };
    const blockedMismatch = resolveConsentPolicyForLocale(
      hashMismatchPolicy,
      "en",
      { hostnameOverride: "127.0.0.1" },
    );
    assert.equal(blockedMismatch?.allResolved, false);
    assert.equal(blockedMismatch?.items[0]?.missingReason, "HASH_MISMATCH");
  });

  test("Admin registration state machine, Retry-After parsing, and error classification", async () => {
    const {
      getAllowedNextStatuses,
      isReasonCodeRequired,
      isTerminalRegistrationStatus,
      classifyAdminRegistrationError,
    } = await import("../apps/admin/lib/registration-admin-rules.ts");
    const { parseRetryAfterHeader } =
      await import("../packages/api-client/src/academy-registration-v1.ts");

    assert.deepEqual(getAllowedNextStatuses("RECEIVED"), [
      "UNDER_REVIEW",
      "CONFIRMED",
      "REJECTED",
      "CANCELLED",
    ]);
    assert.deepEqual(getAllowedNextStatuses("UNDER_REVIEW"), [
      "CONFIRMED",
      "REJECTED",
      "CANCELLED",
    ]);
    assert.deepEqual(getAllowedNextStatuses("CONFIRMED"), ["CANCELLED"]);
    assert.deepEqual(getAllowedNextStatuses("REJECTED"), []);
    assert.deepEqual(getAllowedNextStatuses("CANCELLED"), []);

    assert.equal(isTerminalRegistrationStatus("REJECTED"), true);
    assert.equal(isTerminalRegistrationStatus("CANCELLED"), true);
    assert.equal(isTerminalRegistrationStatus("CONFIRMED"), false);

    assert.equal(isReasonCodeRequired("REJECTED"), true);
    assert.equal(isReasonCodeRequired("CANCELLED"), true);
    assert.equal(isReasonCodeRequired("CONFIRMED"), false);
    assert.equal(isReasonCodeRequired("UNDER_REVIEW"), false);

    assert.equal(parseRetryAfterHeader("30"), 30);
    assert.equal(parseRetryAfterHeader("invalid"), null);

    // Decision D14: 401 and 403 classified by HTTP status without code
    const err401 = classifyAdminRegistrationError({
      status: 401,
      responseBody: {
        statusCode: 401,
        message: "Unauthorized",
      },
    });
    assert.equal(err401.kind, "UNAUTHENTICATED");

    const err403 = classifyAdminRegistrationError({
      status: 403,
      responseBody: {
        statusCode: 403,
        message: "MFA required",
      },
    });
    assert.equal(err403.kind, "FORBIDDEN");

    const errStale = classifyAdminRegistrationError({
      status: 409,
      responseBody: {
        statusCode: 409,
        code: "STALE_VERSION",
        message: "version mismatch",
      },
    });
    assert.equal(errStale.kind, "STALE_VERSION");

    const errCapacity = classifyAdminRegistrationError({
      status: 409,
      responseBody: {
        statusCode: 409,
        code: "CAPACITY_EXCEEDED",
        message: "full",
      },
    });
    assert.equal(errCapacity.kind, "CAPACITY_EXCEEDED");
  });

  test("Complete 3-language localization parity (en, ms, zh-Hans) for all academyReg keys", async () => {
    const { academyRegistrationWebMessages } =
      await import("../packages/i18n/src/messages/academy-registration-web.ts");

    const enKeys = Object.keys(academyRegistrationWebMessages.en).sort();
    const msKeys = Object.keys(academyRegistrationWebMessages.ms).sort();
    const zhKeys = Object.keys(
      academyRegistrationWebMessages["zh-Hans"],
    ).sort();

    assert.deepEqual(msKeys, enKeys);
    assert.deepEqual(zhKeys, enKeys);

    for (const key of enKeys) {
      assert.ok(
        academyRegistrationWebMessages.en[key].trim().length > 0,
        `Empty EN string for ${key}`,
      );
      assert.ok(
        academyRegistrationWebMessages.ms[key].trim().length > 0,
        `Empty MS string for ${key}`,
      );
      assert.ok(
        academyRegistrationWebMessages["zh-Hans"][key].trim().length > 0,
        `Empty ZH-Hans string for ${key}`,
      );
    }
  });
});
