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

    const errIncomplete = classifyAdminRegistrationError({
      status: 409,
      responseBody: {
        statusCode: 409,
        code: "SESSION_INCOMPLETE",
        message: "Session incomplete",
        fieldErrors: [
          { field: "programme.sport", code: "INVALID_VALUE" },
          { field: "consentPolicy", code: "REQUIRED" },
        ],
      },
    });
    assert.equal(errIncomplete.kind, "SESSION_INCOMPLETE");
    assert.equal(errIncomplete.fieldErrors.length, 2);
    assert.ok(errIncomplete.message.includes("Programme sport"));
    assert.ok(errIncomplete.message.includes("Approved consent policy"));

    const errBelowConfirmed = classifyAdminRegistrationError({
      status: 409,
      responseBody: {
        statusCode: 409,
        code: "CAPACITY_BELOW_CONFIRMED",
        message: "below confirmed",
        details: { confirmed: 8 },
      },
    });
    assert.equal(errBelowConfirmed.kind, "CAPACITY_BELOW_CONFIRMED");
    assert.ok(errBelowConfirmed.message.includes("8"));

    const errPolicyExists = classifyAdminRegistrationError({
      status: 409,
      responseBody: {
        statusCode: 409,
        code: "POLICY_VERSION_EXISTS",
        message: "duplicate",
      },
    });
    assert.equal(errPolicyExists.kind, "POLICY_VERSION_EXISTS");

    const errNotApprovable = classifyAdminRegistrationError({
      status: 409,
      responseBody: {
        statusCode: 409,
        code: "POLICY_NOT_APPROVABLE",
        message: "synthetic disallowed",
      },
    });
    assert.equal(errNotApprovable.kind, "POLICY_NOT_APPROVABLE");
  });

  test("Admin session payload builders preserve nulls & published-only boundaries, and policy validation enforces contract", async () => {
    const {
      createEmptySessionForm,
      buildSessionCreatePayload,
      buildSessionUpdatePayload,
      sessionDtoToFormState,
      isoToMytDateTimeLocal,
      mytDateTimeLocalToIso,
      createEmptyPolicyContentMap,
      validatePolicyDraftInput,
    } = await import("../apps/admin/lib/registration-admin-rules.ts");

    // MYT datetime conversion round-trip (+08:00)
    const iso = mytDateTimeLocalToIso("2026-12-15T14:30");
    assert.equal(iso, "2026-12-15T06:30:00.000Z");
    assert.equal(isoToMytDateTimeLocal(iso), "2026-12-15T14:30");
    assert.equal(mytDateTimeLocalToIso(""), null);

    // Incomplete draft preserves nullable schedule fields cleanly
    const incompleteForm = {
      ...createEmptySessionForm(),
      programmeId: "00000000-0000-4000-8000-000000000010",
      name: "Incomplete Draft Cohort",
      venueId: "00000000-0000-4000-8000-000000000020",
      capacity: "16",
    };
    const createPayload = buildSessionCreatePayload(incompleteForm);
    assert.equal(createPayload.name, "Incomplete Draft Cohort");
    assert.equal(createPayload.capacity, 16);
    assert.equal(createPayload.weekday, null);
    assert.equal(createPayload.startTime, null);
    assert.equal(createPayload.recurrence, null);
    assert.equal(createPayload.ageReferenceRule, null);
    assert.equal(createPayload.ageReferenceDate, null);

    // Published session update only sends PUBLISHED_EDITABLE fields
    const publishedSession = {
      id: "sess-pub-1",
      programmeOfferingId: "off-pub-1",
      name: "Published Cohort",
      publicationState: "PUBLISHED",
      version: 3,
      programme: {
        id: "prog-1",
        name: "KHLIM Academy",
        minimumAge: 10,
        maximumAge: 12,
      },
      venue: { id: "venue-1", name: "Sports Garage", address: "PJ" },
      capacity: 16,
      seatsRemaining: 14,
      seatCounts: {
        RECEIVED: 1,
        UNDER_REVIEW: 0,
        CONFIRMED: 2,
        REJECTED: 0,
        CANCELLED: 0,
      },
      enrollmentOpensAt: null,
      enrollmentClosesAt: null,
      coachDisplayName: "Coach Sengjun",
      weekday: 6,
      startTime: "14:00",
      endTime: "16:00",
      timezone: "Asia/Kuala_Lumpur",
      firstSessionDate: "2026-12-19",
      recurrence: "WEEKLY",
      ageReferenceRule: "FIXED_DATE",
      ageReferenceDate: "2026-12-31",
      publishedAt: "2026-12-01T00:00:00.000Z",
      closedAt: null,
      createdAt: "2026-12-01T00:00:00.000Z",
      updatedAt: "2026-12-01T00:00:00.000Z",
    };
    const editedForm = {
      ...sessionDtoToFormState(publishedSession),
      name: "Attempted Rename On Published",
      capacity: "20",
      coachDisplayName: "Coach Jia Xuan",
    };
    const patchPayload = buildSessionUpdatePayload(
      publishedSession,
      editedForm,
    );
    assert.deepEqual(patchPayload, {
      expectedVersion: 3,
      capacity: 20,
      coachDisplayName: "Coach Jia Xuan",
    });

    // Policy draft validation enforces all 4 categories x 3 locales and 64 lowercase hex sha256
    const emptyContent = createEmptyPolicyContentMap();
    const invalidRes = validatePolicyDraftInput("bad version!", emptyContent);
    assert.equal(invalidRes.payload, null);
    assert.ok(invalidRes.errors.policyVersion);
    assert.ok(invalidRes.errors["content.GUARDIAN_AUTHORITY.en.ref"]);
    assert.ok(invalidRes.errors["content.PHOTOGRAPHY.zh-Hans.sha256"]);

    const validContent = createEmptyPolicyContentMap();
    const validSha = "a".repeat(64);
    for (const cat of [
      "GUARDIAN_AUTHORITY",
      "REGISTRATION_PRIVACY",
      "MARKETING",
      "PHOTOGRAPHY",
    ]) {
      for (const loc of ["en", "ms", "zh-Hans"]) {
        validContent[cat][loc] = {
          ref: `synthetic://academy-registration/${cat.toLowerCase()}/v1`,
          sha256: validSha,
        };
      }
    }
    const validRes = validatePolicyDraftInput(
      "SYNTHETIC-TEST-2026",
      validContent,
    );
    assert.deepEqual(validRes.errors, {});
    assert.equal(validRes.payload?.policyVersion, "SYNTHETIC-TEST-2026");

    // 34ad433 contract additions: retryable 503 REGISTRATION_PERSISTENCE_FAILED (with Retry-After) & 409 SESSION_NOT_AVAILABLE
    const { buildAdminAuthContextKey, classifyAdminRegistrationError } =
      await import("../apps/admin/lib/registration-admin-rules.ts");

    // Auth-context fingerprint must rotate on user, org, role, auth, MFA, or eligibility change
    const baseCtx = {
      userId: "user-a",
      organizationId: "org-a",
      role: "SUPER_ADMIN",
      isAuthenticated: true,
      mfaSatisfied: true,
      isDemoMode: false,
      isEligible: true,
    };
    const baseKey = buildAdminAuthContextKey(baseCtx);
    assert.notEqual(
      buildAdminAuthContextKey({ ...baseCtx, userId: "user-b" }),
      baseKey,
    );
    assert.notEqual(
      buildAdminAuthContextKey({ ...baseCtx, organizationId: "org-b" }),
      baseKey,
    );
    assert.notEqual(
      buildAdminAuthContextKey({ ...baseCtx, role: "ACADEMY_ADMIN" }),
      baseKey,
    );
    assert.notEqual(
      buildAdminAuthContextKey({ ...baseCtx, isAuthenticated: false }),
      baseKey,
    );
    assert.notEqual(
      buildAdminAuthContextKey({ ...baseCtx, mfaSatisfied: false }),
      baseKey,
    );
    assert.notEqual(
      buildAdminAuthContextKey({ ...baseCtx, isEligible: false }),
      baseKey,
    );

    const deadlock503 = classifyAdminRegistrationError({
      status: 503,
      retryAfterSeconds: 30,
      responseBody: {
        statusCode: 503,
        code: "REGISTRATION_PERSISTENCE_FAILED",
        message: "deadlock retries exhausted",
      },
    });
    assert.equal(deadlock503.kind, "UNAVAILABLE");
    assert.equal(deadlock503.code, "REGISTRATION_PERSISTENCE_FAILED");
    assert.equal(deadlock503.retryAfterSeconds, 30);
    assert.match(deadlock503.message, /30 seconds/);

    const closed409 = classifyAdminRegistrationError({
      status: 409,
      responseBody: {
        statusCode: 409,
        code: "SESSION_NOT_AVAILABLE",
        message: "session closed",
      },
    });
    assert.equal(closed409.kind, "SESSION_NOT_AVAILABLE");
    assert.match(closed409.message, /closed/i);
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
