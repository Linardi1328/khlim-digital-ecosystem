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

    // PR #129 deferred feature gate (HTTP 403 + FEATURE_NOT_AVAILABLE) stays distinct from ordinary 403 auth failures
    const { isFeatureNotAvailableError } =
      await import("../packages/api-client/src/academy-registration-v1.ts");
    const deferredFeatureErr = {
      status: 403,
      responseBody: {
        statusCode: 403,
        code: "FEATURE_NOT_AVAILABLE",
        feature: "V1_ENROLMENT",
        message: "This feature is not available yet",
      },
    };
    const ordinary403Err = {
      status: 403,
      responseBody: {
        statusCode: 403,
        message: "MFA AAL2 required",
      },
    };
    assert.equal(isFeatureNotAvailableError(deferredFeatureErr), true);
    assert.equal(isFeatureNotAvailableError(ordinary403Err), false);
    assert.equal(
      classifyAdminRegistrationError(deferredFeatureErr).kind,
      "FEATURE_NOT_AVAILABLE",
    );
    assert.equal(
      classifyAdminRegistrationError(ordinary403Err).kind,
      "FORBIDDEN",
    );

    // Behavioral regression coverage for PR #129 deferred enrolment & checkout handling:
    // mock FEATURE_NOT_AVAILABLE responses and assert deferred UI outcome, zero recovery
    // lookups, and zero confirmation redirects, alongside ordinary recoverable failure controls.
    const { executeEnrolmentCheckout } =
      await import("../apps/web/lib/enrol-submission.ts");
    const deferredApiError = Object.assign(new Error("Feature deferred"), {
      status: 403,
      responseBody: {
        statusCode: 403,
        code: "FEATURE_NOT_AVAILABLE",
        feature: "V1_ENROLMENT",
        message: "This feature is not available yet",
      },
    });
    const sampleOffering = { id: "offering-1" };
    const samplePlan = { id: "plan-1" };
    const pendingMembership = {
      id: "mem-pending-1",
      programmeOfferingId: "offering-1",
      membershipPlanId: "plan-1",
      status: "PENDING",
    };

    // 1) Deferred createPendingMembership -> returns deferred without calling listAthleteMemberships or prepareCheckout
    let listCalls1 = 0;
    let checkoutCalls1 = 0;
    const outcomeDeferredCreate = await executeEnrolmentCheckout(
      {
        async createPendingMembership() {
          throw deferredApiError;
        },
        async listAthleteMemberships() {
          listCalls1 += 1;
          return [pendingMembership];
        },
        async prepareCheckout() {
          checkoutCalls1 += 1;
          return { checkoutUrl: "https://checkout.example.invalid" };
        },
      },
      "athlete-1",
      sampleOffering,
      samplePlan,
    );
    assert.deepEqual(outcomeDeferredCreate, { kind: "deferred" });
    assert.equal(listCalls1, 0);
    assert.equal(checkoutCalls1, 0);

    // 2) Deferred prepareCheckout -> returns deferred without redirecting to /enrol/confirmation
    const outcomeDeferredCheckout = await executeEnrolmentCheckout(
      {
        async createPendingMembership() {
          return pendingMembership;
        },
        async listAthleteMemberships() {
          return [];
        },
        async prepareCheckout() {
          throw deferredApiError;
        },
      },
      "athlete-1",
      sampleOffering,
      samplePlan,
    );
    assert.deepEqual(outcomeDeferredCheckout, { kind: "deferred" });

    // 3) Control A: Ordinary recoverable failure on createPendingMembership -> runs listAthleteMemberships recovery lookup
    let listCallsControl = 0;
    const outcomeRecovered = await executeEnrolmentCheckout(
      {
        async createPendingMembership() {
          throw new Error("Temporary conflict");
        },
        async listAthleteMemberships() {
          listCallsControl += 1;
          return [pendingMembership];
        },
        async prepareCheckout() {
          return { checkoutUrl: "https://checkout.example.invalid/session-1" };
        },
      },
      "athlete-1",
      sampleOffering,
      samplePlan,
    );
    assert.equal(listCallsControl, 1);
    assert.deepEqual(outcomeRecovered, {
      kind: "checkout",
      checkoutUrl: "https://checkout.example.invalid/session-1",
    });

    // 4) Control B: Ordinary payment-provider unavailability on prepareCheckout -> falls back to confirmation route
    const outcomeConfirmationFallback = await executeEnrolmentCheckout(
      {
        async createPendingMembership() {
          return pendingMembership;
        },
        async listAthleteMemberships() {
          return [];
        },
        async prepareCheckout() {
          throw new Error("Payment provider disabled in preview");
        },
      },
      "athlete-1",
      sampleOffering,
      samplePlan,
    );
    assert.deepEqual(outcomeConfirmationFallback, {
      kind: "confirmation",
      confirmationUrl:
        "/enrol/confirmation?athleteId=athlete-1&membershipId=mem-pending-1",
    });

    // 5) Ordinary create failure + deferred listAthleteMemberships -> returns deferred
    const outcomeDeferredRecoveryLookup = await executeEnrolmentCheckout(
      {
        async createPendingMembership() {
          throw new Error("Temporary conflict");
        },
        async listAthleteMemberships() {
          throw deferredApiError;
        },
        async prepareCheckout() {
          throw new Error("Should not be called");
        },
      },
      "athlete-1",
      sampleOffering,
      samplePlan,
    );
    assert.deepEqual(outcomeDeferredRecoveryLookup, { kind: "deferred" });

    // IR-05: Restore regression coverage across all deferred portal & enrolment consumers
    const fs = await import("node:fs");
    const path = await import("node:path");
    const deferredConsumerPaths = [
      "apps/web/lib/family-context.tsx",
      "apps/web/lib/family-session-isolation.ts",
      "apps/web/components/portal/portal-shell.tsx",
      "apps/web/app/enrol/page.tsx",
      "apps/web/app/enrol/confirmation/page.tsx",
      "apps/web/app/portal/dashboard/page.tsx",
      "apps/web/app/portal/membership/page.tsx",
      "apps/web/app/portal/payments/page.tsx",
      "apps/web/app/portal/schedule/page.tsx",
      "apps/web/app/portal/notifications/page.tsx",
      "apps/web/app/portal/players/page.tsx",
      "apps/web/app/portal/players/[athleteId]/page.tsx",
    ];
    for (const rel of deferredConsumerPaths) {
      const src = fs.readFileSync(path.resolve(rel), "utf8");
      assert.ok(
        src.includes("isFeatureNotAvailableError") ||
          src.includes("isPortalFeatureDeferred"),
        `Expected deferred FEATURE_NOT_AVAILABLE handling in ${rel}`,
      );
    }
    const enrolSrc = fs.readFileSync(
      path.resolve("apps/web/app/enrol/page.tsx"),
      "utf8",
    );
    assert.ok(
      enrolSrc.includes("executeEnrolmentCheckout") &&
        enrolSrc.includes('checkout.kind === "deferred"'),
      "enrol/page.tsx must delegate checkout flow to executeEnrolmentCheckout and handle deferred outcome",
    );
  });

  test("IR-04 FamilySessionController isolates delayed refreshFamily and addChild outcomes across auth transitions", async () => {
    const {
      FamilySessionController,
      StaleAuthContextError,
      isStaleAuthContextError,
      buildWebAuthContextKey,
    } = await import("../apps/web/lib/family-session-isolation.ts");

    assert.equal(buildWebAuthContextKey(false, "acc-a"), "anonymous");
    assert.equal(buildWebAuthContextKey(true, "acc-a"), "acc-a");
    assert.notEqual(
      buildWebAuthContextKey(true, "acc-a"),
      buildWebAuthContextKey(true, "acc-b"),
    );

    const athleteA = {
      id: "ath-a1",
      displayName: "Account A Player",
      dateOfBirth: "2015-03-02",
    };
    const athleteB = {
      id: "ath-b1",
      displayName: "Account B Player",
      dateOfBirth: "2014-06-10",
    };
    const linkA = { id: "link-a1", athlete: athleteA };
    const linkB = { id: "link-b1", athlete: athleteB };

    // 1) Delayed refreshFamily success from Account A must NOT overwrite Account B
    let resolveListA;
    let listCall = 0;
    const snapshots = [];
    const ctrl = new FamilySessionController(
      {
        async listManagedAthletes() {
          listCall += 1;
          if (listCall === 1) {
            return new Promise((resolve) => {
              resolveListA = resolve;
            });
          }
          return [linkB];
        },
        async createManagedAthlete() {
          throw new Error("unused");
        },
      },
      (s) => snapshots.push(s),
    );

    ctrl.setAuthContext("acc-a");
    const refreshA = ctrl.refreshFamily({
      isAuthenticated: true,
      familyFeatureEnabled: true,
    });
    // Logout -> login Account B while Account A's refresh is still in flight
    ctrl.setAuthContext("anonymous");
    ctrl.setAuthContext("acc-b");
    await ctrl.refreshFamily({
      isAuthenticated: true,
      familyFeatureEnabled: true,
    });
    assert.equal(ctrl.getState().activeChild?.id, "ath-b1");

    // Release delayed Account A response -> Account B state remains untouched
    resolveListA([linkA]);
    await refreshA;
    assert.deepEqual(
      ctrl.getState().athleteLinks.map((l) => l.athlete.id),
      ["ath-b1"],
    );
    assert.equal(ctrl.getState().activeChild?.id, "ath-b1");
    assert.equal(ctrl.getState().isPortalFeatureDeferred, false);

    // 2) Delayed refreshFamily failure & FEATURE_NOT_AVAILABLE from Account A must NOT corrupt Account B
    for (const delayedErr of [
      new Error("Account A transient failure"),
      Object.assign(new Error("Feature deferred"), {
        status: 403,
        responseBody: {
          statusCode: 403,
          code: "FEATURE_NOT_AVAILABLE",
          feature: "V1_PORTAL",
        },
      }),
    ]) {
      let rejectListA;
      let calls = 0;
      const errCtrl = new FamilySessionController(
        {
          async listManagedAthletes() {
            calls += 1;
            if (calls === 1) {
              return new Promise((_, reject) => {
                rejectListA = reject;
              });
            }
            return [linkB];
          },
          async createManagedAthlete() {
            throw new Error("unused");
          },
        },
        () => {},
      );
      errCtrl.setAuthContext("acc-a");
      const pA = errCtrl.refreshFamily({
        isAuthenticated: true,
        familyFeatureEnabled: true,
      });
      errCtrl.setAuthContext("acc-b");
      await errCtrl.refreshFamily({
        isAuthenticated: true,
        familyFeatureEnabled: true,
      });
      rejectListA(delayedErr);
      await pA;
      assert.equal(errCtrl.getState().activeChild?.id, "ath-b1");
      assert.equal(errCtrl.getState().isPortalFeatureDeferred, false);
    }

    // 3) Delayed addChild success from Account A after switch to Account B rejects with StaleAuthContextError
    let resolveCreateA;
    const addCtrl = new FamilySessionController(
      {
        async listManagedAthletes() {
          return [linkB];
        },
        async createManagedAthlete() {
          return new Promise((resolve) => {
            resolveCreateA = resolve;
          });
        },
      },
      () => {},
    );
    addCtrl.setAuthContext("acc-a");
    const addPromiseA = addCtrl.addChild(
      { displayName: "Stale Child A", dateOfBirth: "2015-01-01" },
      { isAuthenticated: true, familyFeatureEnabled: true },
    );
    addCtrl.setAuthContext("anonymous");
    addCtrl.setAuthContext("acc-b");
    await addCtrl.refreshFamily({
      isAuthenticated: true,
      familyFeatureEnabled: true,
    });
    resolveCreateA({ athlete: athleteA });
    await assert.rejects(addPromiseA, (err) => {
      assert.ok(err instanceof StaleAuthContextError);
      assert.equal(isStaleAuthContextError(err), true);
      return true;
    });
    assert.equal(addCtrl.getState().activeChild?.id, "ath-b1");
    assert.deepEqual(
      addCtrl.getState().athleteLinks.map((l) => l.athlete.id),
      ["ath-b1"],
    );

    // 4) Delayed addChild FEATURE_NOT_AVAILABLE from Account A after switch rejects with StaleAuthContextError & does NOT defer Account B
    let rejectCreateDeferred;
    const addDefCtrl = new FamilySessionController(
      {
        async listManagedAthletes() {
          return [linkB];
        },
        async createManagedAthlete() {
          return new Promise((_, reject) => {
            rejectCreateDeferred = reject;
          });
        },
      },
      () => {},
    );
    addDefCtrl.setAuthContext("acc-a");
    const addDefPromise = addDefCtrl.addChild(
      { displayName: "Deferred Child A", dateOfBirth: "2015-01-01" },
      { isAuthenticated: true, familyFeatureEnabled: true },
    );
    addDefCtrl.setAuthContext("acc-b");
    await addDefCtrl.refreshFamily({
      isAuthenticated: true,
      familyFeatureEnabled: true,
    });
    rejectCreateDeferred(
      Object.assign(new Error("Feature deferred"), {
        status: 403,
        responseBody: {
          statusCode: 403,
          code: "FEATURE_NOT_AVAILABLE",
          feature: "V1_PORTAL",
        },
      }),
    );
    await assert.rejects(addDefPromise, (err) => isStaleAuthContextError(err));
    assert.equal(addDefCtrl.getState().isPortalFeatureDeferred, false);
    assert.equal(addDefCtrl.getState().activeChild?.id, "ath-b1");
  });

  test("Strict capacity parsing, minute-precision enrollment timestamp preservation, and local DB host guard", async () => {
    const {
      parseStrictSessionCapacity,
      buildSessionCreatePayload,
      buildSessionUpdatePayload,
      createEmptySessionForm,
      sessionDtoToFormState,
    } = await import("../apps/admin/lib/registration-admin-rules.ts");

    assert.equal(parseStrictSessionCapacity("20"), 20);
    assert.equal(parseStrictSessionCapacity(" 1 "), 1);
    assert.equal(parseStrictSessionCapacity("10000"), 10000);
    assert.equal(parseStrictSessionCapacity("1e3"), null);
    assert.equal(parseStrictSessionCapacity("12.5"), null);
    assert.equal(parseStrictSessionCapacity("20abc"), null);
    assert.equal(parseStrictSessionCapacity("0"), null);
    assert.equal(parseStrictSessionCapacity("-5"), null);
    assert.equal(parseStrictSessionCapacity("10001"), null);
    assert.equal(parseStrictSessionCapacity(""), null);

    assert.throws(() =>
      buildSessionCreatePayload({
        ...createEmptySessionForm(),
        programmeId: "prog-1",
        name: "Bad Cap Session",
        venueId: "venue-1",
        capacity: "1e3",
      }),
    );

    const sessionWithSeconds = {
      id: "sess-sec-1",
      programmeOfferingId: "off-sec-1",
      name: "Second Precision Cohort",
      publicationState: "PUBLISHED",
      version: 4,
      programme: {
        id: "prog-1",
        name: "KHLIM Academy",
        minimumAge: 10,
        maximumAge: 12,
      },
      venue: { id: "venue-1", name: "Sports Garage", address: "PJ" },
      capacity: 20,
      seatsRemaining: 15,
      seatCounts: {
        RECEIVED: 0,
        UNDER_REVIEW: 0,
        CONFIRMED: 5,
        REJECTED: 0,
        CANCELLED: 0,
      },
      enrollmentOpensAt: "2026-12-03T01:00:30.000Z",
      enrollmentClosesAt: "2026-12-10T15:59:45.000Z",
      coachDisplayName: "Coach Old",
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

    // Coach-only edit must NOT rewrite enrollmentOpensAt/enrollmentClosesAt when displayed MYT minutes are unchanged
    const coachOnlyPatch = buildSessionUpdatePayload(sessionWithSeconds, {
      ...sessionDtoToFormState(sessionWithSeconds),
      coachDisplayName: "Coach New",
    });
    assert.deepEqual(coachOnlyPatch, {
      expectedVersion: 4,
      coachDisplayName: "Coach New",
    });

    // Editing displayed minute DOES send updated timestamp
    const windowChangedPatch = buildSessionUpdatePayload(sessionWithSeconds, {
      ...sessionDtoToFormState(sessionWithSeconds),
      enrollmentOpensAt: "2026-12-03T09:15",
    });
    assert.deepEqual(windowChangedPatch, {
      expectedVersion: 4,
      enrollmentOpensAt: "2026-12-03T01:15:00.000Z",
    });

    // IR-02: Local integration harness DB guard validates effective host, database name, query overrides, and env fallbacks
    const {
      assertSafeDisposableLocalDatabase,
      assertLoopbackPortAvailable,
      verifyListenerOwnership,
      waitForHttpReady,
      stopOwnedChild,
    } = await import("./integration/ric-191-integrated-acceptance.mjs");
    assert.doesNotThrow(() =>
      assertSafeDisposableLocalDatabase({
        KHLIM_TEST_DATABASE: "1",
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:5432/ric191_test", // betterleaks:allow -- synthetic DB parser fixture only; never connected
      }),
    );
    for (const [label, envObj, pattern] of [
      [
        "query ?host override",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/ric191_test?host=db.example.invalid", // betterleaks:allow -- synthetic DB parser fixture only; never connected
        },
        /db\.example\.invalid/,
      ],
      [
        "multi ?host override",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@localhost:5432/ric191_test?host=127.0.0.1&host=remote.example.invalid", // betterleaks:allow -- synthetic DB parser fixture only; never connected
        },
        /remote\.example\.invalid/,
      ],
      [
        "query ?hostaddr override",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/ric191_test?hostaddr=203.0.113.10", // betterleaks:allow -- synthetic DB parser fixture only; never connected
        },
        /203\.0\.113\.10/,
      ],
      [
        "query ?database override",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/ric191_test?database=production", // betterleaks:allow -- synthetic DB parser fixture only; never connected
        },
        /production/,
      ],
      [
        "query ?dbname override",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/ric191_test?dbname=staging", // betterleaks:allow -- synthetic DB parser fixture only; never connected
        },
        /staging/,
      ],
      [
        "missing database name in URL",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/", // betterleaks:allow -- synthetic DB parser fixture only; never connected
        },
        /include "test"/,
      ],
      [
        "non-test database name in URL",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/postgres", // betterleaks:allow -- synthetic DB parser fixture only; never connected
        },
        /include "test"/,
      ],
      [
        "empty host with credentials in URL",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL: "postgresql://postgres:postgres@/ric191_test",
        },
        /not a valid URL|non-local/,
      ],
      [
        "socket-style empty host URL",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL: "postgresql:///ric191_test",
        },
        /non-local/,
      ],
      [
        "non-local PGHOST fallback",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/ric191_test", // betterleaks:allow -- synthetic DB parser fixture only; never connected
          PGHOST: "hosted.supabase.example.invalid",
        },
        /PGHOST/,
      ],
      [
        "non-local PGHOSTADDR fallback",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/ric191_test", // betterleaks:allow -- synthetic DB parser fixture only; never connected
          PGHOSTADDR: "198.51.100.7",
        },
        /PGHOSTADDR/,
      ],
      [
        "non-test PGDATABASE fallback",
        {
          KHLIM_TEST_DATABASE: "1",
          DATABASE_URL:
            "postgresql://postgres:postgres@127.0.0.1:5432/ric191_test", // betterleaks:allow -- synthetic DB parser fixture only; never connected
          PGDATABASE: "postgres",
        },
        /PGDATABASE/,
      ],
    ]) {
      assert.throws(
        () => assertSafeDisposableLocalDatabase(envObj),
        pattern,
        `Expected DB guard to reject ${label}`,
      );
    }

    // IR-01: Fail-closed loopback port availability, listener ownership verification, premature exit, and owned-only cleanup
    const net = await import("node:net");
    const occupier = net.createServer();
    await new Promise((resolve) => occupier.listen(0, "127.0.0.1", resolve));
    const occupiedPort = occupier.address().port;
    try {
      await assert.rejects(
        assertLoopbackPortAvailable(occupiedPort, "TestServer"),
        /already occupied/,
      );
    } finally {
      await new Promise((resolve) => occupier.close(resolve));
    }
    await assert.doesNotReject(
      assertLoopbackPortAvailable(occupiedPort, "TestServer"),
    );

    // Unavailable ownership verification (null or empty list) MUST fail closed
    assert.throws(
      () =>
        verifyListenerOwnership({
          port: 3199,
          rootPid: 12345,
          label: "TestServer",
          getListeningPids: () => null,
          collectTreePids: () => new Set([12345]),
        }),
      /Fail-closed: unable to verify listener ownership/,
    );
    assert.throws(
      () =>
        verifyListenerOwnership({
          port: 3199,
          rootPid: 12345,
          label: "TestServer",
          getListeningPids: () => [],
          collectTreePids: () => new Set([12345]),
        }),
      /Fail-closed: unable to verify listener ownership/,
    );
    // Foreign PID listening on port MUST fail closed
    assert.throws(
      () =>
        verifyListenerOwnership({
          port: 3199,
          rootPid: 12345,
          label: "TestServer",
          getListeningPids: () => [99999],
          collectTreePids: () => new Set([12345, 12346]),
        }),
      /not exclusively by spawned TestServer/,
    );
    // Descendant PID in process tree passes
    assert.deepEqual(
      verifyListenerOwnership({
        port: 3199,
        rootPid: 12345,
        label: "TestServer",
        getListeningPids: () => [12346],
        collectTreePids: () => new Set([12345, 12346]),
      }),
      [12346],
    );

    // Premature child exit fails readiness immediately
    await assert.rejects(
      waitForHttpReady(
        "http://127.0.0.1:3199/health",
        {
          child: { pid: 12345, exitCode: 1, signalCode: null },
          spawnError: null,
          getLogs: () => "boom",
        },
        3199,
        "TestServer",
        { timeoutMs: 2000, pollIntervalMs: 20 },
      ),
      /exited prematurely/,
    );

    // Unavailable ownership inside waitForHttpReady fails closed (does NOT accept readiness)
    let observedSignal = null;
    await assert.rejects(
      waitForHttpReady(
        "http://127.0.0.1:3199/health",
        {
          child: { pid: 12345, exitCode: null, signalCode: null },
          spawnError: null,
          getLogs: () => "",
        },
        3199,
        "TestServer",
        {
          timeoutMs: 2000,
          requestTimeoutMs: 500,
          pollIntervalMs: 20,
          fetchImpl: async (_url, init) => {
            observedSignal = init?.signal ?? null;
            return { ok: true };
          },
          getListeningPids: () => null,
        },
      ),
      /Fail-closed: unable to verify listener ownership/,
    );
    assert.ok(
      observedSignal instanceof AbortSignal,
      "waitForHttpReady must pass a bounded AbortSignal timeout to fetch",
    );

    // Owned-only cleanup refuses to kill handles not registered by the current run
    let unownedKilled = false;
    const unownedHandle = {
      child: {
        killed: false,
        exitCode: null,
        kill() {
          unownedKilled = true;
        },
        once() {},
      },
    };
    const stoppedUnowned = await stopOwnedChild(unownedHandle, new Set());
    assert.equal(stoppedUnowned, false);
    assert.equal(unownedKilled, false);
  });

  test("FINAL-01 AdminAuthSessionController fails closed during revalidation, isolates superseded failures, and invalidates pending loads on logout", async () => {
    const { AdminAuthSessionController } =
      await import("../apps/admin/lib/admin-auth-session-controller.ts");

    const makeSession = (orgId, userId = "staff-1") => ({
      id: userId,
      organizationId: orgId,
      email: "staff@example.test",
      displayName: "Synthetic Staff",
      preferredLocale: "en",
      roles: ["SUPER_ADMIN", "ACADEMY_ADMIN"],
      authenticatorAssuranceLevel: "aal2",
      mfaSatisfied: true,
    });

    const gates = [];
    let sessionCall = 0;
    let invalidateCalls = 0;
    let signOutCalls = 0;
    let hasStoredSession = true;

    const controller = new AdminAuthSessionController(
      {
        storageKey: "khlim_admin_supabase_session",
        async restoreSession() {
          return hasStoredSession ? { access_token: "synthetic-token" } : null;
        },
        async getAdminSession() {
          sessionCall += 1;
          const idx = sessionCall;
          return new Promise((resolve, reject) => {
            gates[idx] = { resolve, reject };
          });
        },
        async signIn() {
          hasStoredSession = true;
        },
        async signOut() {
          signOutCalls += 1;
          hasStoredSession = false;
        },
        invalidateSessionOperations() {
          invalidateCalls += 1;
        },
      },
      () => {},
    );

    // 1) Initial bootstrap loads Org A
    const bootPromise = controller.bootstrap();
    assert.equal(controller.getState().isLoading, true);
    assert.equal(controller.getState().user, null);
    await Promise.resolve();
    gates[1].resolve(makeSession("org-a"));
    await bootPromise;
    assert.equal(controller.getState().user?.organizationId, "org-a");
    assert.equal(controller.getState().isLoading, false);

    // Irrelevant localStorage key change must NOT invalidate current session or trigger reload
    const ignored = controller.handleStorageChange({
      key: "unrelated_key",
      newValue: "1",
    });
    assert.equal(ignored, null);
    assert.equal(controller.getState().user?.organizationId, "org-a");
    assert.equal(sessionCall, 1);

    // 2) Cross-tab credential transition -> synchronously fails closed BEFORE /admin/session resolves
    const revalB = controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"tok-b"}',
    });
    assert.ok(revalB);
    assert.equal(invalidateCalls, 1);
    assert.equal(controller.getState().user, null);
    assert.equal(controller.getState().role, null);
    assert.equal(controller.getState().isLoading, true);
    await Promise.resolve();
    assert.ok(gates[2], "revalB /admin/session should be in flight");

    // 3) Newer revalidation (Org C) supersedes pending Org B and succeeds first
    const revalC = controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"tok-c"}',
    });
    assert.equal(controller.getState().user, null);
    assert.equal(controller.getState().isLoading, true);
    await Promise.resolve();
    assert.ok(gates[3], "revalC /admin/session should be in flight");

    gates[3].resolve(makeSession("org-c"));
    await revalC;
    assert.equal(controller.getState().user?.organizationId, "org-c");
    assert.equal(controller.getState().isLoading, false);
    assert.equal(controller.getState().authError, null);

    // 4) Superseded Org B request FAILS after Org C succeeded -> MUST NOT clear or overwrite Org C!
    gates[2].reject(new Error("Superseded session failure"));
    await revalB;
    assert.equal(controller.getState().user?.organizationId, "org-c");
    assert.equal(controller.getState().isLoading, false);
    assert.equal(controller.getState().authError, null);

    // 5) Logout during pending session restoration immediately clears state & invalidates in-flight load
    const revalPending = controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"tok-d"}',
    });
    assert.equal(controller.getState().isLoading, true);
    assert.equal(controller.getState().user, null);
    await Promise.resolve();
    assert.ok(gates[4], "revalPending /admin/session should be in flight");

    const logoutPromise = controller.logout();
    // Synchronously cleared before awaiting signOut
    assert.equal(controller.getState().user, null);
    assert.equal(controller.getState().role, null);
    assert.equal(controller.getState().isLoading, false);
    await logoutPromise;
    assert.equal(signOutCalls, 1);

    // Stale restoration resolving with valid Org D after logout MUST be discarded
    gates[4].resolve(makeSession("org-d"));
    await revalPending;
    assert.equal(controller.getState().user, null);
    assert.equal(controller.getState().role, null);
    assert.equal(controller.getState().isLoading, false);

    // 6) Subsequent valid revalidation loads Org B cleanly
    hasStoredSession = true;
    const revalFinal = controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"tok-b-final"}',
    });
    await Promise.resolve();
    gates[5].resolve(makeSession("org-b"));
    await revalFinal;
    assert.equal(controller.getState().user?.organizationId, "org-b");
    assert.equal(controller.getState().isLoading, false);
    assert.equal(controller.getState().authError, null);
  });

  test("FINAL-01 supabase-auth token refresh prevents stale credential writes across logout and account replacement while preserving same-session refresh", async () => {
    const prevWindow = globalThis.window;
    const prevFetch = globalThis.fetch;
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const storage = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => {
          storage.set(k, String(v));
        },
        removeItem: (k) => {
          storage.delete(k);
        },
      },
    };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-local-anon-key";

    const makeStored = (userId, accessToken, refreshToken, expiresAt) =>
      JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        expires_at: expiresAt,
        token_type: "bearer",
        user: { id: userId, email: `${userId}@example.test` },
      });

    try {
      const supabaseAuth = await import("../apps/admin/lib/supabase-auth.ts");
      const storageKey = supabaseAuth.ADMIN_SUPABASE_SESSION_STORAGE_KEY;
      const expiredAt = Math.floor(Date.now() / 1000) - 10;
      const futureAt = Math.floor(Date.now() / 1000) + 3600;

      // 1) Ordinary same-session refresh: concurrent calls deduplicate & persist refreshed token
      let refreshFetchCount = 0;
      let releaseRefresh1;
      const refreshGate1 = new Promise((r) => {
        releaseRefresh1 = r;
      });
      globalThis.fetch = async () => {
        refreshFetchCount += 1;
        await refreshGate1;
        return new Response(
          makeStored("user-a", "at-a-refreshed", "rt-a-2", futureAt),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      };

      storage.set(
        storageKey,
        makeStored("user-a", "at-a-1", "rt-a-1", expiredAt),
      );
      const p1 = supabaseAuth.refreshAdminSupabaseSession();
      const p2 = supabaseAuth.refreshAdminSupabaseSession();
      releaseRefresh1();
      const [r1, r2] = await Promise.all([p1, p2]);
      assert.equal(refreshFetchCount, 1);
      assert.equal(r1?.access_token, "at-a-refreshed");
      assert.equal(r2?.access_token, "at-a-refreshed");
      assert.equal(
        JSON.parse(storage.get(storageKey)).access_token,
        "at-a-refreshed",
      );

      // 2) Logout during pending token refresh -> stale refresh cannot resurrect credentials
      let releaseStaleRefresh;
      const staleRefreshGate = new Promise((r) => {
        releaseStaleRefresh = r;
      });
      let releaseLogout;
      const logoutGate = new Promise((r) => {
        releaseLogout = r;
      });
      globalThis.fetch = async (url) => {
        if (String(url).includes("/logout")) {
          await logoutGate;
          return new Response(null, { status: 204 });
        }
        await staleRefreshGate;
        return new Response(
          makeStored("user-a", "at-a-resurrected", "rt-a-3", futureAt),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      };

      storage.set(
        storageKey,
        makeStored("user-a", "at-a-old", "rt-a-old", expiredAt),
      );
      const staleRefreshPromise = supabaseAuth.refreshAdminSupabaseSession();
      const signOutPromise = supabaseAuth.adminSupabaseSignOut();
      // Stored session must already be cleared synchronously before /logout resolves
      assert.equal(storage.has(storageKey), false);

      releaseStaleRefresh();
      const staleResult = await staleRefreshPromise;
      assert.equal(staleResult, null);
      assert.equal(storage.has(storageKey), false);
      releaseLogout();
      await signOutPromise;
      assert.equal(storage.has(storageKey), false);

      // 3) Cross-tab account replacement during pending refresh (both stale success and stale failure)
      for (const staleOutcome of ["success", "failure"]) {
        let releaseReplacedRefresh;
        const replacedGate = new Promise((r) => {
          releaseReplacedRefresh = r;
        });
        globalThis.fetch = async () => {
          await replacedGate;
          if (staleOutcome === "failure") {
            return new Response(
              JSON.stringify({ msg: "Invalid refresh token" }),
              {
                status: 400,
                headers: { "content-type": "application/json" },
              },
            );
          }
          return new Response(
            makeStored("user-a", "at-a-overwrite", "rt-a-9", futureAt),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        };

        storage.set(
          storageKey,
          makeStored("user-a", "at-a-0", "rt-a-0", expiredAt),
        );
        const pendingOldRefresh = supabaseAuth.refreshAdminSupabaseSession();

        // Account B replaces credentials in localStorage and invalidates in-flight ops
        storage.set(
          storageKey,
          makeStored("user-b", "at-b-valid", "rt-b-1", futureAt),
        );
        supabaseAuth.invalidateAdminSessionOperations();

        releaseReplacedRefresh();
        const res = await pendingOldRefresh;
        assert.equal(res, null);
        const persisted = JSON.parse(storage.get(storageKey));
        assert.equal(persisted.user.id, "user-b");
        assert.equal(persisted.access_token, "at-b-valid");
      }
    } finally {
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
      globalThis.fetch = prevFetch;
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      if (prevAnon === undefined)
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevAnon;
    }
  });

  test("Admin display label formatters map raw API enums cleanly and handle missing ages safely", async () => {
    const {
      formatAgeAtReference,
      formatConsentTypeLabel,
      formatDobWithAge,
      formatJerseySize,
      formatLocaleLabel,
      formatPlayerGender,
      formatPolicyStatusLabel,
      formatPublicationStateLabel,
      formatRegistrationStatusLabel,
      formatRelationshipLabel,
    } = await import("../apps/admin/lib/registration-admin-rules.ts");

    assert.equal(formatPlayerGender("MALE"), "Male");
    assert.equal(formatPlayerGender("FEMALE"), "Female");
    assert.equal(formatPlayerGender(null), "—");

    assert.equal(formatJerseySize("YM"), "Youth Medium (YM)");
    assert.equal(formatJerseySize("AXL"), "Adult Extra Large (AXL)");
    assert.equal(formatJerseySize(undefined), "—");

    assert.equal(formatRelationshipLabel("MOTHER"), "Mother");
    assert.equal(formatRelationshipLabel("LEGAL_GUARDIAN"), "Legal Guardian");
    assert.equal(formatRelationshipLabel("GRANDPARENT"), "Grandparent");
    assert.equal(formatRelationshipLabel("OTHER_RELATIVE"), "Other Relative");
    assert.equal(formatRelationshipLabel("FRIEND"), "Family Friend");
    assert.equal(formatRelationshipLabel(null), "—");

    assert.equal(
      formatConsentTypeLabel("GUARDIAN_AUTHORITY"),
      "Guardian Authority Acknowledgment",
    );
    assert.equal(
      formatConsentTypeLabel("REGISTRATION_PRIVACY"),
      "Registration Privacy Consent",
    );
    assert.equal(
      formatConsentTypeLabel("MARKETING"),
      "Academy Updates & Marketing",
    );
    assert.equal(
      formatConsentTypeLabel("PHOTOGRAPHY"),
      "Training Photography & Media",
    );

    assert.equal(formatLocaleLabel("en"), "English (en)");
    assert.equal(formatLocaleLabel("ms"), "Bahasa Melayu (ms)");
    assert.equal(formatLocaleLabel("zh-Hans"), "Simplified Chinese (zh-Hans)");

    assert.equal(formatRegistrationStatusLabel("UNDER_REVIEW"), "Under Review");
    assert.equal(formatPublicationStateLabel("PUBLISHED"), "Published");
    assert.equal(formatPolicyStatusLabel("APPROVED"), "Approved");

    // Safe age & DOB formatting (never outputs dangling " yrs" or "(Age  at ref)")
    assert.equal(formatAgeAtReference(11), "11 yrs");
    assert.equal(formatAgeAtReference(0), "0 yrs");
    assert.equal(formatAgeAtReference(null), "—");
    assert.equal(formatAgeAtReference(undefined), "—");
    assert.equal(formatAgeAtReference(Number.NaN), "—");
    assert.equal(formatAgeAtReference(-1), "—");

    assert.equal(
      formatDobWithAge("2015-03-02", 11),
      "2015-03-02 (Age 11 at ref)",
    );
    assert.equal(formatDobWithAge("2015-03-02", null), "2015-03-02");
    assert.equal(formatDobWithAge("2015-03-02", undefined), "2015-03-02");
    assert.equal(formatDobWithAge(null, null), "—");
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

  test("Round 2 (7oK): AdminAuthSessionController preserves workspaceEpoch ONLY on verified identical authorization context and destroys workspace on org/role/permission/MFA change, failure, or logout", async () => {
    const { AdminAuthSessionController } =
      await import("../apps/admin/lib/admin-auth-session-controller.ts");

    const makeDeferred = () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    const baseSession = {
      id: "staff-1",
      organizationId: "org-a",
      email: "staff@example.test",
      displayName: "Staff One",
      roles: ["SUPER_ADMIN", "MANAGEMENT"],
      mfaSatisfied: true,
      preferredLocale: "en",
      authenticatorAssuranceLevel: "aal2",
    };

    let nextSessionDeferred = null;
    let currentSessionResponse = baseSession;
    let invalidateCount = 0;
    const states = [];

    const controller = new AdminAuthSessionController(
      {
        storageKey: "khlim_admin_supabase_session",
        restoreSession: async () => ({ access_token: "synthetic-tok" }),
        getAdminSession: async () => {
          if (nextSessionDeferred) {
            const d = nextSessionDeferred;
            nextSessionDeferred = null;
            return d.promise;
          }
          return currentSessionResponse;
        },
        signIn: async () => undefined,
        signOut: async () => undefined,
        invalidateSessionOperations: () => {
          invalidateCount += 1;
        },
      },
      (state) => states.push(state),
    );

    await controller.bootstrap();
    const initialEpoch = controller.getState().workspaceEpoch;
    assert.equal(controller.getState().user?.id, "staff-1");
    assert.equal(controller.getState().isRevalidating, false);

    // 1) Same-context token renewal: immediately hides/fails-closed during pending /admin/session, then resumes same workspaceEpoch
    const sameRenewal = makeDeferred();
    nextSessionDeferred = sameRenewal;
    const renewalPromise = controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"rotated-same"}',
      isSameStorageArea: true,
    });
    assert.ok(renewalPromise);
    assert.equal(controller.getState().isRevalidating, true);
    assert.equal(controller.getState().isLoading, true);
    assert.equal(controller.getState().user, null);
    assert.equal(controller.getState().role, null);
    assert.equal(controller.getState().workspaceEpoch, initialEpoch);
    assert.ok(invalidateCount >= 1);

    sameRenewal.resolve({ ...baseSession });
    await renewalPromise;
    assert.equal(controller.getState().isRevalidating, false);
    assert.equal(controller.getState().user?.id, "staff-1");
    assert.equal(
      controller.getState().workspaceEpoch,
      initialEpoch,
      "Exact same verified auth context preserves workspaceEpoch",
    );

    // 2) Changed organization destroys workspaceEpoch
    currentSessionResponse = { ...baseSession, organizationId: "org-b" };
    await controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"rotated-org-b"}',
      isSameStorageArea: true,
    });
    const epochAfterOrgChange = controller.getState().workspaceEpoch;
    assert.ok(epochAfterOrgChange > initialEpoch);
    assert.equal(controller.getState().user?.organizationId, "org-b");

    // 3) Changed effective permissions (roles array) destroys workspaceEpoch
    currentSessionResponse = {
      ...baseSession,
      organizationId: "org-b",
      roles: ["MANAGEMENT"],
    };
    await controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"rotated-roles"}',
      isSameStorageArea: true,
    });
    const epochAfterRoleChange = controller.getState().workspaceEpoch;
    assert.ok(epochAfterRoleChange > epochAfterOrgChange);

    // 4) Downgraded MFA destroys workspaceEpoch
    currentSessionResponse = {
      ...baseSession,
      organizationId: "org-b",
      roles: ["MANAGEMENT"],
      mfaSatisfied: false,
      authenticatorAssuranceLevel: "aal1",
    };
    await controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"rotated-aal1"}',
      isSameStorageArea: true,
    });
    const epochAfterMfaDowngrade = controller.getState().workspaceEpoch;
    assert.ok(epochAfterMfaDowngrade > epochAfterRoleChange);

    // Restore verified MFA session before testing failure & logout
    currentSessionResponse = baseSession;
    await controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"restored-mfa"}',
      isSameStorageArea: true,
    });
    const epochBeforeFail = controller.getState().workspaceEpoch;

    // 5) Failed verification destroys workspaceEpoch
    const failDeferred = makeDeferred();
    nextSessionDeferred = failDeferred;
    const failPromise = controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"bad"}',
      isSameStorageArea: true,
    });
    failDeferred.reject(new Error("401 Unauthorized"));
    await failPromise;
    assert.ok(controller.getState().workspaceEpoch > epochBeforeFail);
    assert.equal(controller.getState().user, null);
    assert.equal(controller.getState().isRevalidating, false);

    // 6) Logout destroys workspaceEpoch
    await controller.handleStorageChange({
      key: "khlim_admin_supabase_session",
      newValue: '{"access_token":"restored-2"}',
      isSameStorageArea: true,
    });
    const epochBeforeLogout = controller.getState().workspaceEpoch;
    await controller.logout();
    assert.ok(controller.getState().workspaceEpoch > epochBeforeLogout);
    assert.equal(controller.getState().user, null);
    controller.dispose();
  });

  test("Round 2 (7oQ & 7oV): verifyAdminTotpFactor rejects same-user replaced session and adminSupabaseSignOut uses scope=local with synchronous local clear", async () => {
    const prevWindow = globalThis.window;
    const prevFetch = globalThis.fetch;
    const prevEnvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevEnvKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const store = new Map();
    const mockLocalStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
    globalThis.window = { localStorage: mockLocalStorage };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-anon-key";

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const initialSession = {
      access_token: "synthetic-token-session-1",
      refresh_token: "synthetic-refresh-session-1",
      expires_in: 3600,
      expires_at: futureExp,
      token_type: "bearer",
      user: { id: "same-staff-user", email: "staff@example.test" },
    };

    try {
      const {
        ADMIN_SUPABASE_SESSION_STORAGE_KEY,
        adminSupabaseSignOut,
        verifyAdminTotpFactor,
      } = await import("../apps/admin/lib/supabase-auth.ts");

      // 7oQ: Replace stored session with a NEW session for the SAME user while MFA verify is in flight
      mockLocalStorage.setItem(
        ADMIN_SUPABASE_SESSION_STORAGE_KEY,
        JSON.stringify(initialSession),
      );
      const newerSameUserSession = {
        ...initialSession,
        access_token: "synthetic-token-session-2-same-user",
        refresh_token: "synthetic-refresh-session-2-same-user",
      };
      globalThis.fetch = async () => {
        // Simulate cross-tab rotation of the same user's session while verify is in flight
        mockLocalStorage.setItem(
          ADMIN_SUPABASE_SESSION_STORAGE_KEY,
          JSON.stringify(newerSameUserSession),
        );
        return new Response(
          JSON.stringify({
            access_token: "synthetic-stale-mfa-token",
            refresh_token: "synthetic-stale-mfa-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: "same-staff-user", email: "staff@example.test" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      };

      await assert.rejects(
        () => verifyAdminTotpFactor("factor-1", "challenge-1", "123456"),
        /superseded by a session change/i,
      );
      const storedAfterMfaRace = JSON.parse(
        mockLocalStorage.getItem(ADMIN_SUPABASE_SESSION_STORAGE_KEY),
      );
      assert.equal(
        storedAfterMfaRace.access_token,
        "synthetic-token-session-2-same-user",
        "Superseded MFA verify must not overwrite newer same-user session",
      );

      // 7oV: adminSupabaseSignOut clears localStorage synchronously and calls /logout?scope=local
      const logoutCalls = [];
      let storageDuringLogoutFetch = "NOT_CHECKED";
      globalThis.fetch = async (url, init) => {
        logoutCalls.push({ url: String(url), init });
        storageDuringLogoutFetch = mockLocalStorage.getItem(
          ADMIN_SUPABASE_SESSION_STORAGE_KEY,
        );
        return new Response(null, { status: 204 });
      };

      await adminSupabaseSignOut();
      assert.equal(
        storageDuringLogoutFetch,
        null,
        "Local session must be cleared synchronously before /logout settles",
      );
      assert.equal(logoutCalls.length, 1);
      assert.match(logoutCalls[0].url, /\/auth\/v1\/logout\?scope=local$/);
      assert.equal(
        new Headers(logoutCalls[0].init?.headers).get("authorization"),
        "Bearer synthetic-token-session-2-same-user",
      );
    } finally {
      globalThis.window = prevWindow;
      globalThis.fetch = prevFetch;
      if (prevEnvUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevEnvUrl;
      if (prevEnvKey === undefined)
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevEnvKey;
    }
  });

  test("R2-FINAL-02: WebAuthSessionController enforces generation ownership across bootstrap, storage events, login, register, logout, and stale failures", async () => {
    const { WebAuthSessionController } =
      await import("../apps/web/lib/web-auth-session-controller.ts");

    const makeDeferred = () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    const accountA = {
      id: "acc-a",
      email: "parent.a@example.test",
      displayName: "Parent A",
      preferredLocale: "en",
      status: "ACTIVE",
      roles: ["GUARDIAN"],
      guardianProfile: {
        id: "guard-a",
        displayName: "Parent A",
        phone: "+60120000001",
        preferredLocale: "en",
      },
    };
    const accountB = {
      id: "acc-b",
      email: "parent.b@example.test",
      displayName: "Parent B",
      preferredLocale: "ms",
      status: "ACTIVE",
      roles: ["GUARDIAN"],
      guardianProfile: {
        id: "guard-b",
        displayName: "Parent B",
        phone: "+60120000002",
        preferredLocale: "ms",
      },
    };
    const sessionA = {
      access_token: "synthetic-web-tok-a",
      refresh_token: "synthetic-web-ref-a",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: {
        id: "acc-a",
        email: "parent.a@example.test",
        user_metadata: {
          khlim_registration_intent: "guardian",
          khlim_guardian_display_name: "Parent A",
          khlim_preferred_locale: "en",
        },
      },
    };
    const sessionB = {
      access_token: "synthetic-web-tok-b",
      refresh_token: "synthetic-web-ref-b",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: "acc-b", email: "parent.b@example.test" },
    };

    let epoch = 0;
    const clearedEpochs = [];
    const onboardingCalls = [];
    let restoreImpl = async () => null;
    let getMeImpl = async () => accountA;
    let signInImpl = async () => sessionA;
    let signUpImpl = async () => ({
      session: sessionA,
      user: sessionA.user,
      emailConfirmationOrSignInRequired: false,
    });
    let signOutImpl = async () => undefined;

    const controller = new WebAuthSessionController(
      {
        storageKey: "khlim_supabase_session",
        restoreSession: () => restoreImpl(),
        getMe: () => getMeImpl(),
        updatePreferences: async (dto) => {
          onboardingCalls.push({ op: "prefs", dto });
        },
        upsertGuardianProfile: async (profile) => {
          onboardingCalls.push({ op: "profile", profile });
        },
        signIn: (email, password, expectedEpoch) =>
          signInImpl(email, password, expectedEpoch),
        signUp: (email, password, metadata, expectedEpoch) =>
          signUpImpl(email, password, metadata, expectedEpoch),
        signOut: () => signOutImpl(),
        invalidateSessionOperations: () => ++epoch,
        clearStoredSessionIfEpoch: (expectedEpoch) => {
          clearedEpochs.push(expectedEpoch);
        },
      },
      () => undefined,
    );

    // 1) Delayed bootstrap restoration during logout MUST NOT restore Account A
    const delayedBootstrapMe = makeDeferred();
    restoreImpl = async () => sessionA;
    getMeImpl = () => delayedBootstrapMe.promise;
    const bootstrapPromise = controller.bootstrap();
    await Promise.resolve();
    const logoutPromise = controller.logout();
    await logoutPromise;
    assert.equal(controller.getState().isAuthenticated, false);
    assert.equal(controller.getState().account, null);
    assert.equal(controller.getState().isLoading, false);

    delayedBootstrapMe.resolve(accountA);
    await bootstrapPromise;
    assert.equal(controller.getState().isAuthenticated, false);
    assert.equal(controller.getState().account, null);

    // 2) Superseded login(A) completing OR failing after login(B) succeeds MUST NOT clobber Account B or clear B's storage
    const loginASignIn = makeDeferred();
    const loginBSignIn = makeDeferred();
    signInImpl = (email) => {
      if (email === "parent.a@example.test") return loginASignIn.promise;
      return loginBSignIn.promise;
    };
    getMeImpl = async () => accountB;

    const loginAPromise = controller
      .login("parent.a@example.test", "synthetic-pass-a") // betterleaks:allow -- mocked sign-in fixture only
      .catch((err) => ({ caught: err }));
    const loginBPromise = controller.login(
      "parent.b@example.test",
      "synthetic-pass-b",
    );
    loginBSignIn.resolve(sessionB);
    await loginBPromise;
    assert.equal(controller.getState().isAuthenticated, true);
    assert.equal(controller.getState().account?.id, "acc-b");
    assert.equal(controller.getState().isLoading, false);

    // Now stale login(A) resolves -> rejected as superseded, zero clobber, zero storage clear!
    loginASignIn.resolve(sessionA);
    const loginAResult = await loginAPromise;
    assert.ok(loginAResult && "caught" in loginAResult);
    assert.equal(controller.getState().account?.id, "acc-b");
    assert.equal(controller.getState().isAuthenticated, true);
    assert.deepEqual(clearedEpochs, []);
    assert.deepEqual(onboardingCalls, []);

    // 2b) CnB_: login(A) actually enters getMe(A), login(B) completes, then stale getMe(A) resolves with Account A -> Account B stays active & storage untouched
    const staleGetMeADeferred = makeDeferred();
    const staleGetMeAEntered = makeDeferred();
    let activeGetMeAttempt = 0;
    signInImpl = async (email) =>
      email === "parent.a@example.test" ? sessionA : sessionB;
    getMeImpl = () => {
      activeGetMeAttempt += 1;
      if (activeGetMeAttempt === 1) {
        staleGetMeAEntered.resolve();
        return staleGetMeADeferred.promise;
      }
      return Promise.resolve(accountB);
    };
    const loginAPausedInGetMe = controller
      .login("parent.a@example.test", "synthetic-pass-a") // betterleaks:allow -- mocked sign-in fixture only
      .catch((err) => ({ caught: err }));
    await staleGetMeAEntered.promise;
    await controller.login(
      "parent.b@example.test",
      "synthetic-pass-b", // betterleaks:allow -- mocked sign-in fixture only
    );
    assert.equal(controller.getState().account?.id, "acc-b");
    staleGetMeADeferred.resolve(accountA);
    const staleGetMeAOutcome = await loginAPausedInGetMe;
    assert.ok(staleGetMeAOutcome && "caught" in staleGetMeAOutcome);
    assert.equal(controller.getState().isAuthenticated, true);
    assert.equal(controller.getState().account?.id, "acc-b");
    assert.equal(controller.getState().isLoading, false);
    assert.deepEqual(clearedEpochs, []);
    assert.deepEqual(onboardingCalls, []);

    // 3) Stale login(A) FAILURE after login(B) succeeds MUST NOT clear Account B or storage
    const failingLoginA = makeDeferred();
    signInImpl = (email) => {
      if (email === "fail.a@example.test") return failingLoginA.promise;
      return Promise.resolve(sessionB);
    };
    getMeImpl = async () => accountB;
    const staleFailLogin = controller
      .login("fail.a@example.test", "bad")
      .catch((err) => ({ caught: err }));
    await controller.login("parent.b@example.test", "good"); // betterleaks:allow -- mocked sign-in fixture only
    assert.equal(controller.getState().account?.id, "acc-b");
    failingLoginA.reject(new Error("Invalid credentials"));
    const staleFailResult = await staleFailLogin;
    assert.ok(staleFailResult && "caught" in staleFailResult);
    assert.equal(controller.getState().account?.id, "acc-b");
    assert.equal(controller.getState().isAuthenticated, true);
    assert.equal(controller.getState().isLoading, false);
    assert.deepEqual(clearedEpochs, []);

    // 4) Superseded register(A) after account replacement MUST NOT run onboarding writes or clobber Account B
    const slowSignUpA = makeDeferred();
    signUpImpl = () => slowSignUpA.promise;
    const supersededReg = controller
      .register("new.a@example.test", "pass-a", "New Parent A", "en")
      .catch((err) => ({ caught: err }));
    signInImpl = async () => sessionB;
    getMeImpl = async () => accountB;
    await controller.login("parent.b@example.test", "good"); // betterleaks:allow -- mocked sign-in fixture only
    slowSignUpA.resolve({
      session: sessionA,
      user: sessionA.user,
      emailConfirmationOrSignInRequired: false,
    });
    const regOutcome = await supersededReg;
    assert.ok(regOutcome && "caught" in regOutcome);
    assert.equal(controller.getState().account?.id, "acc-b");
    assert.deepEqual(onboardingCalls, []);

    // 5) Delayed logout completing AFTER a newer login(B) started MUST NOT clear login(B)'s state
    const slowSignOut = makeDeferred();
    signOutImpl = () => slowSignOut.promise;
    const pendingLogout = controller.logout();
    signInImpl = async () => sessionB;
    getMeImpl = async () => accountB;
    await controller.login("parent.b@example.test", "good"); // betterleaks:allow -- mocked sign-in fixture only
    assert.equal(controller.getState().account?.id, "acc-b");
    slowSignOut.resolve();
    await pendingLogout;
    assert.equal(controller.getState().isAuthenticated, true);
    assert.equal(controller.getState().account?.id, "acc-b");
    assert.equal(controller.getState().isLoading, false);

    // 6) Normal login with pending guardian onboarding metadata still completes cleanly
    signInImpl = async () => sessionA;
    let meStep = 0;
    getMeImpl = async () => {
      meStep += 1;
      return meStep === 1 ? { ...accountA, guardianProfile: null } : accountA;
    };
    const onboardResult = await controller.login(
      "parent.a@example.test",
      "good",
    );
    assert.equal(onboardResult.guardianOnboardingRequired, true);
    assert.equal(controller.getState().account?.id, "acc-a");
    assert.equal(onboardingCalls.length, 2);

    controller.dispose();
  });

  test("R2-FINAL-02: web supabase-auth guards token-storage writes across refresh, signIn, signUp, and scope=local signOut", async () => {
    const prevWindow = globalThis.window;
    const prevFetch = globalThis.fetch;
    const prevEnvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevEnvKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const store = new Map();
    const mockLocalStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
    globalThis.window = { localStorage: mockLocalStorage };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic-anon-key";

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const sessionA = {
      access_token: "synthetic-web-tok-a",
      refresh_token: "synthetic-web-ref-a",
      expires_in: 3600,
      expires_at: futureExp,
      token_type: "bearer",
      user: { id: "user-a", email: "a@example.test" },
    };
    const sessionB = {
      access_token: "synthetic-web-tok-b",
      refresh_token: "synthetic-web-ref-b",
      expires_in: 3600,
      expires_at: futureExp,
      token_type: "bearer",
      user: { id: "user-b", email: "b@example.test" },
    };

    try {
      const {
        SUPABASE_SESSION_STORAGE_KEY,
        invalidateWebSessionOperations,
        refreshSupabaseSession,
        supabaseSignIn,
        supabaseSignOut,
        isSupersededWebAuthOperationError,
      } = await import("../apps/web/lib/supabase-auth.ts");

      // 1) Refresh resolving after account replacement MUST NOT overwrite User B's token
      mockLocalStorage.setItem(
        SUPABASE_SESSION_STORAGE_KEY,
        JSON.stringify(sessionA),
      );
      let releaseRefresh;
      const refreshGate = new Promise((r) => {
        releaseRefresh = r;
      });
      globalThis.fetch = async (url) => {
        if (String(url).includes("grant_type=refresh_token")) {
          await refreshGate;
          return new Response(
            JSON.stringify({
              ...sessionA,
              access_token: "synthetic-stale-refreshed-a",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify(sessionB), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };

      const refreshP = refreshSupabaseSession();
      await supabaseSignIn("b@example.test", "pass-b");
      releaseRefresh();
      const refreshRes = await refreshP;
      assert.equal(refreshRes, null);
      assert.equal(
        JSON.parse(mockLocalStorage.getItem(SUPABASE_SESSION_STORAGE_KEY))
          .access_token,
        "synthetic-web-tok-b",
      );

      // 2) Superseded supabaseSignIn resolving after logout/invalidation MUST reject & leave storage clean
      let releaseSlowSignIn;
      const slowSignInGate = new Promise((r) => {
        releaseSlowSignIn = r;
      });
      const logoutUrls = [];
      let storageDuringLogout = "UNSET";
      globalThis.fetch = async (url) => {
        if (String(url).includes("grant_type=password")) {
          await slowSignInGate;
          return new Response(JSON.stringify(sessionA), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (String(url).includes("/logout")) {
          logoutUrls.push(String(url));
          storageDuringLogout = mockLocalStorage.getItem(
            SUPABASE_SESSION_STORAGE_KEY,
          );
          return new Response(null, { status: 204 });
        }
        return new Response(null, { status: 200 });
      };

      const epochForSlowSignIn = invalidateWebSessionOperations();
      const slowSignInP = supabaseSignIn(
        "a@example.test",
        "pass-a",
        epochForSlowSignIn,
      );
      await supabaseSignOut();
      assert.equal(
        storageDuringLogout,
        null,
        "Web signOut must clear localStorage synchronously before /logout settles",
      );
      assert.match(logoutUrls[0], /\/auth\/v1\/logout\?scope=local$/);
      releaseSlowSignIn();
      await assert.rejects(
        () => slowSignInP,
        (err) => isSupersededWebAuthOperationError(err),
      );
      assert.equal(
        mockLocalStorage.getItem(SUPABASE_SESSION_STORAGE_KEY),
        null,
      );

      // 3) CnB8: Malformed stored session shape (missing user.id) is rejected and removed without throwing
      const { restoreSupabaseSession } =
        await import("../apps/web/lib/supabase-auth.ts");
      mockLocalStorage.setItem(
        SUPABASE_SESSION_STORAGE_KEY,
        JSON.stringify({
          refresh_token: "synthetic-corrupt-refresh",
          expires_at: 0,
        }),
      );
      const restoredMalformed = await restoreSupabaseSession();
      assert.equal(restoredMalformed, null);
      assert.equal(
        mockLocalStorage.getItem(SUPABASE_SESSION_STORAGE_KEY),
        null,
        "Malformed stored session must be purged from localStorage",
      );

      mockLocalStorage.setItem(
        SUPABASE_SESSION_STORAGE_KEY,
        JSON.stringify({
          access_token: "synthetic-bad-tok",
          refresh_token: "synthetic-bad-ref",
          expires_in: 3600,
          expires_at: 0,
          token_type: "bearer",
          user: { email: "missing-id@example.test" },
        }),
      );
      const refreshedMalformed = await refreshSupabaseSession();
      assert.equal(refreshedMalformed, null);
      assert.equal(
        mockLocalStorage.getItem(SUPABASE_SESSION_STORAGE_KEY),
        null,
        "Malformed stored session without user.id must be purged before refresh",
      );

      // C3A5: Stored session missing persisted expires_at must NOT regenerate a fresh future expiry on read
      mockLocalStorage.setItem(
        SUPABASE_SESSION_STORAGE_KEY,
        JSON.stringify({
          access_token: "synthetic-no-exp-tok",
          refresh_token: "synthetic-no-exp-ref",
          expires_in: 3600,
          token_type: "bearer",
          user: { id: "user-no-exp", email: "noexp@example.test" },
        }),
      );
      const restoredMissingExpiry = await restoreSupabaseSession();
      assert.equal(restoredMissingExpiry, null);
      assert.equal(
        mockLocalStorage.getItem(SUPABASE_SESSION_STORAGE_KEY),
        null,
      );
    } finally {
      globalThis.window = prevWindow;
      globalThis.fetch = prevFetch;
      if (prevEnvUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevEnvUrl;
      if (prevEnvKey === undefined)
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevEnvKey;
    }
  });

  test("R2-FINAL-02 edge case: refreshAccount() never supersedes an active auth transition or strands isLoading=true", async () => {
    const { WebAuthSessionController } =
      await import("../apps/web/lib/web-auth-session-controller.ts");

    const makeDeferred = () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    const accountA = {
      id: "acc-refresh-a",
      email: "refresh.a@example.test",
      displayName: "Parent Refresh A",
      preferredLocale: "en",
      status: "ACTIVE",
      roles: ["GUARDIAN"],
      guardianProfile: {
        id: "guard-refresh-a",
        displayName: "Parent Refresh A",
        phone: "+60120000011",
        preferredLocale: "en",
      },
    };
    const accountAUpdated = {
      ...accountA,
      displayName: "Parent Refresh A Updated",
    };
    const sessionA = {
      access_token: "synthetic-web-tok-refresh-a",
      refresh_token: "synthetic-web-ref-refresh-a",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: "acc-refresh-a", email: "refresh.a@example.test" },
    };

    let epoch = 0;
    let getMeCallCount = 0;
    let restoreImpl = async () => null;
    let getMeImpl = async () => {
      getMeCallCount += 1;
      return accountA;
    };

    const controller = new WebAuthSessionController(
      {
        storageKey: "khlim_supabase_session",
        restoreSession: () => restoreImpl(),
        getMe: () => getMeImpl(),
        updatePreferences: async () => undefined,
        upsertGuardianProfile: async () => undefined,
        signIn: async () => sessionA,
        signUp: async () => ({
          session: sessionA,
          user: sessionA.user,
          emailConfirmationOrSignInRequired: false,
        }),
        signOut: async () => undefined,
        invalidateSessionOperations: () => ++epoch,
        clearStoredSessionIfEpoch: () => undefined,
      },
      () => undefined,
    );

    // 1) Exact reproduction: bootstrap() has pending restoreSession -> invoke refreshAccount() -> resolve bootstrap()
    const pendingRestore1 = makeDeferred();
    restoreImpl = () => pendingRestore1.promise;
    const bootstrap1 = controller.bootstrap();
    assert.equal(controller.getState().isLoading, true);
    assert.equal(controller.getState().isAuthenticated, false);

    // Calling refreshAccount() during active bootstrap must NOT call getMe() or supersede bootstrap()
    const ignoredRefresh = await controller.refreshAccount();
    assert.equal(ignoredRefresh, null);
    assert.equal(getMeCallCount, 0);
    assert.equal(controller.getState().isAuthenticated, false);
    assert.equal(controller.getState().isLoading, true);

    // Resolve bootstrap with valid session -> settles cleanly with isLoading=false and isAuthenticated=true
    pendingRestore1.resolve(sessionA);
    await bootstrap1;
    assert.equal(getMeCallCount, 1);
    assert.equal(controller.getState().isAuthenticated, true);
    assert.equal(controller.getState().account?.id, "acc-refresh-a");
    assert.equal(controller.getState().isLoading, false);

    // 2) Fail-closed reproduction: storage revalidation pending -> refreshAccount() ignored -> restoreSession returns null -> unauthenticated & isLoading=false
    const pendingRestore2 = makeDeferred();
    restoreImpl = () => pendingRestore2.promise;
    const storageTransition = controller.handleStorageChange({
      key: "khlim_supabase_session",
      isSameStorageArea: true,
    });
    assert.ok(storageTransition);
    assert.equal(controller.getState().isAuthenticated, false);
    assert.equal(controller.getState().isLoading, true);

    const ignoredDuringStorage = await controller.refreshAccount();
    assert.equal(ignoredDuringStorage, null);
    assert.equal(getMeCallCount, 1);

    pendingRestore2.resolve(null);
    await storageTransition;
    assert.equal(controller.getState().isAuthenticated, false);
    assert.equal(controller.getState().account, null);
    assert.equal(controller.getState().isLoading, false);

    // 3) Ordinary refreshAccount() works cleanly when no auth transition is active
    getMeImpl = async () => {
      getMeCallCount += 1;
      return accountAUpdated;
    };
    const refreshed = await controller.refreshAccount();
    assert.equal(refreshed?.displayName, "Parent Refresh A Updated");
    assert.equal(controller.getState().isAuthenticated, true);
    assert.equal(controller.getState().isLoading, false);

    // 4) Stale idle refreshAccount() superseded by logout() cannot restore account or alter isLoading
    const delayedRefreshMe = makeDeferred();
    getMeImpl = () => delayedRefreshMe.promise;
    const staleRefreshPromise = controller.refreshAccount();
    await controller.logout();
    assert.equal(controller.getState().isAuthenticated, false);
    assert.equal(controller.getState().account, null);
    assert.equal(controller.getState().isLoading, false);

    delayedRefreshMe.resolve(accountA);
    assert.equal(await staleRefreshPromise, null);
    assert.equal(controller.getState().isAuthenticated, false);
    assert.equal(controller.getState().account, null);
    assert.equal(controller.getState().isLoading, false);

    controller.dispose();
  });
});
