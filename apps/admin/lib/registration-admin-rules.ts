import type {
  AdminRegistrationSessionDto,
  CreateRegistrationPolicyRequestDto,
  CreateRegistrationSessionRequestDto,
  RegistrationAgeReferenceRule,
  RegistrationConsentType,
  RegistrationErrorFieldDto,
  RegistrationLocale,
  RegistrationPolicyContentMap,
  RegistrationReasonCode,
  RegistrationSessionRecurrence,
  RegistrationStatus,
  RegistrationTargetStatus,
  UpdateRegistrationSessionRequestDto,
} from "@khlim/api-client";

export interface AdminAuthContextFingerprint {
  userId: string | null;
  organizationId?: string | null;
  role: string | null;
  isAuthenticated: boolean;
  mfaSatisfied: boolean;
  isDemoMode: boolean;
  isEligible: boolean;
}

/**
 * Deterministic fingerprint representing the active Admin authentication and
 * authorization boundary. Any change (logout, user switch, organization switch,
 * role switch, MFA downgrade, or eligibility change) rotates the key and
 * invalidates all in-flight async reads, mutations, and follow-up reads.
 */
export function buildAdminAuthContextKey(
  ctx: AdminAuthContextFingerprint,
): string {
  return [
    ctx.userId ?? "anon",
    ctx.organizationId ?? "default-org",
    ctx.role ?? "none",
    ctx.isAuthenticated ? "auth" : "unauth",
    ctx.mfaSatisfied ? "aal2" : "no-mfa",
    ctx.isDemoMode ? "demo" : "live",
    ctx.isEligible ? "eligible" : "ineligible",
  ].join(":");
}

export const REGISTRATION_STATUS_OPTIONS: readonly RegistrationStatus[] = [
  "RECEIVED",
  "UNDER_REVIEW",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
];

export const REGISTRATION_REASON_CODES: ReadonlyArray<{
  code: RegistrationReasonCode;
  label: string;
}> = [
  { code: "DUPLICATE", label: "Duplicate registration" },
  { code: "INELIGIBLE", label: "Player ineligible for session" },
  { code: "CAPACITY", label: "Session capacity reached" },
  { code: "GUARDIAN_REQUEST", label: "Guardian requested withdrawal" },
  {
    code: "INCOMPLETE_INFORMATION",
    label: "Incomplete or unverifiable details",
  },
  { code: "SESSION_CHANGED", label: "Session schedule or cohort changed" },
  { code: "OTHER", label: "Other operational reason" },
];

export const ISO_WEEKDAY_OPTIONS: ReadonlyArray<{
  value: number;
  label: string;
}> = [
  { value: 1, label: "Monday (1)" },
  { value: 2, label: "Tuesday (2)" },
  { value: 3, label: "Wednesday (3)" },
  { value: 4, label: "Thursday (4)" },
  { value: 5, label: "Friday (5)" },
  { value: 6, label: "Saturday (6)" },
  { value: 7, label: "Sunday (7)" },
];

export const SESSION_RECURRENCE_OPTIONS: ReadonlyArray<{
  value: RegistrationSessionRecurrence;
  label: string;
}> = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "NONE", label: "Single session (No recurrence)" },
];

export const AGE_REFERENCE_RULE_OPTIONS: ReadonlyArray<{
  value: RegistrationAgeReferenceRule;
  label: string;
}> = [
  { value: "FIXED_DATE", label: "Fixed reference date" },
  { value: "SESSION_START_DATE", label: "First session date" },
  { value: "REGISTRATION_DATE", label: "Registration submission date" },
];

export const CONSENT_CATEGORY_META: ReadonlyArray<{
  type: RegistrationConsentType;
  label: string;
  required: boolean;
}> = [
  {
    type: "GUARDIAN_AUTHORITY",
    label: "Guardian Authority Acknowledgment",
    required: true,
  },
  {
    type: "REGISTRATION_PRIVACY",
    label: "Registration Privacy Consent",
    required: true,
  },
  {
    type: "MARKETING",
    label: "Academy Updates & Marketing",
    required: false,
  },
  {
    type: "PHOTOGRAPHY",
    label: "Training Photography & Media",
    required: false,
  },
];

export const POLICY_LOCALE_META: ReadonlyArray<{
  locale: RegistrationLocale;
  label: string;
}> = [
  { locale: "en", label: "English (en)" },
  { locale: "ms", label: "Bahasa Melayu (ms)" },
  { locale: "zh-Hans", label: "Simplified Chinese (zh-Hans)" },
];

export const POLICY_VERSION_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;
export const TIME_24H_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function getAllowedNextStatuses(
  current: RegistrationStatus,
): RegistrationTargetStatus[] {
  switch (current) {
    case "RECEIVED":
      return ["UNDER_REVIEW", "CONFIRMED", "REJECTED", "CANCELLED"];
    case "UNDER_REVIEW":
      return ["CONFIRMED", "REJECTED", "CANCELLED"];
    case "CONFIRMED":
      return ["CANCELLED"];
    case "REJECTED":
    case "CANCELLED":
    default:
      return [];
  }
}

export function isTerminalRegistrationStatus(
  status: RegistrationStatus,
): boolean {
  return status === "REJECTED" || status === "CANCELLED";
}

export function isReasonCodeRequired(
  target: RegistrationTargetStatus,
): boolean {
  return target === "REJECTED" || target === "CANCELLED";
}

export function formatRegistrationReasonCode(
  code: string | null | undefined,
): string {
  if (!code) return "—";
  const match = REGISTRATION_REASON_CODES.find((item) => item.code === code);
  return match ? match.label : code;
}

export function formatIsoWeekday(weekday: number | null | undefined): string {
  if (!weekday) return "Not set";
  const found = ISO_WEEKDAY_OPTIONS.find((item) => item.value === weekday);
  return found ? found.label.replace(/\s*\(\d\)$/, "") : `Day ${weekday}`;
}

export function formatSessionRecurrence(
  recurrence: string | null | undefined,
): string {
  if (recurrence === "WEEKLY") return "Weekly";
  if (recurrence === "NONE") return "Single session";
  return "Not set";
}

export function formatAgeReferenceRule(
  rule: string | null | undefined,
  date: string | null | undefined,
): string {
  if (rule === "FIXED_DATE") {
    return date ? `Fixed date (${date})` : "Fixed date (missing date)";
  }
  if (rule === "SESSION_START_DATE") return "First session date";
  if (rule === "REGISTRATION_DATE") return "Registration date";
  return "Not set";
}

/**
 * Formats an ISO UTC timestamp into an HTML datetime-local value in Asia/Kuala_Lumpur (MYT, UTC+08:00).
 */
export function isoToMytDateTimeLocal(
  isoString: string | null | undefined,
): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * Converts a datetime-local string (interpreted as Asia/Kuala_Lumpur, +08:00) to an ISO-8601 UTC string.
 * Empty input returns null to preserve nullable backend fields cleanly.
 */
export function mytDateTimeLocalToIso(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return trimmed;
  const date = new Date(`${trimmed}:00+08:00`);
  if (Number.isNaN(date.getTime())) return trimmed;
  return date.toISOString();
}

export interface SessionFormState {
  programmeId: string;
  name: string;
  venueId: string;
  capacity: string;
  coachDisplayName: string;
  weekday: string;
  startTime: string;
  endTime: string;
  firstSessionDate: string;
  recurrence: string;
  ageReferenceRule: string;
  ageReferenceDate: string;
  enrollmentOpensAt: string;
  enrollmentClosesAt: string;
}

export function createEmptySessionForm(): SessionFormState {
  return {
    programmeId: "",
    name: "",
    venueId: "",
    capacity: "",
    coachDisplayName: "",
    weekday: "",
    startTime: "",
    endTime: "",
    firstSessionDate: "",
    recurrence: "",
    ageReferenceRule: "",
    ageReferenceDate: "",
    enrollmentOpensAt: "",
    enrollmentClosesAt: "",
  };
}

export function sessionDtoToFormState(
  session: AdminRegistrationSessionDto,
): SessionFormState {
  return {
    programmeId: session.programme.id,
    name: session.name,
    venueId: session.venue?.id ?? "",
    capacity: String(session.capacity),
    coachDisplayName: session.coachDisplayName ?? "",
    weekday: session.weekday !== null ? String(session.weekday) : "",
    startTime: session.startTime ?? "",
    endTime: session.endTime ?? "",
    firstSessionDate: session.firstSessionDate ?? "",
    recurrence: session.recurrence ?? "",
    ageReferenceRule: session.ageReferenceRule ?? "",
    ageReferenceDate: session.ageReferenceDate ?? "",
    enrollmentOpensAt: isoToMytDateTimeLocal(session.enrollmentOpensAt),
    enrollmentClosesAt: isoToMytDateTimeLocal(session.enrollmentClosesAt),
  };
}

export function buildSessionCreatePayload(
  form: SessionFormState,
): CreateRegistrationSessionRequestDto {
  const ageRule = form.ageReferenceRule
    ? (form.ageReferenceRule as RegistrationAgeReferenceRule)
    : null;

  return {
    programmeId: form.programmeId.trim(),
    name: form.name.trim(),
    venueId: form.venueId.trim(),
    capacity: Number.parseInt(form.capacity.trim(), 10),
    coachDisplayName: form.coachDisplayName.trim() || null,
    weekday: form.weekday ? Number.parseInt(form.weekday, 10) : null,
    startTime: form.startTime.trim() || null,
    endTime: form.endTime.trim() || null,
    firstSessionDate: form.firstSessionDate.trim() || null,
    recurrence: form.recurrence
      ? (form.recurrence as RegistrationSessionRecurrence)
      : null,
    ageReferenceRule: ageRule,
    ageReferenceDate:
      ageRule === "FIXED_DATE" ? form.ageReferenceDate.trim() || null : null,
    enrollmentOpensAt: mytDateTimeLocalToIso(form.enrollmentOpensAt),
    enrollmentClosesAt: mytDateTimeLocalToIso(form.enrollmentClosesAt),
  };
}

/**
 * Builds a minimal PATCH payload for updating a DRAFT or PUBLISHED session.
 * Respects backend PUBLISHED_EDITABLE boundaries (only coachDisplayName, capacity,
 * enrollmentOpensAt, enrollmentClosesAt are sent when PUBLISHED) and preserves nulls.
 */
export function buildSessionUpdatePayload(
  original: AdminRegistrationSessionDto,
  form: SessionFormState,
): UpdateRegistrationSessionRequestDto | null {
  const payload: UpdateRegistrationSessionRequestDto = {
    expectedVersion: original.version,
  };
  let hasChange = false;

  const isDraft = original.publicationState === "DRAFT";
  const nextCapacity = Number.parseInt(form.capacity.trim(), 10);
  if (Number.isFinite(nextCapacity) && nextCapacity !== original.capacity) {
    payload.capacity = nextCapacity;
    hasChange = true;
  }

  const nextCoach = form.coachDisplayName.trim() || null;
  if (nextCoach !== original.coachDisplayName) {
    payload.coachDisplayName = nextCoach;
    hasChange = true;
  }

  const nextOpens = mytDateTimeLocalToIso(form.enrollmentOpensAt);
  if (nextOpens !== original.enrollmentOpensAt) {
    payload.enrollmentOpensAt = nextOpens;
    hasChange = true;
  }

  const nextCloses = mytDateTimeLocalToIso(form.enrollmentClosesAt);
  if (nextCloses !== original.enrollmentClosesAt) {
    payload.enrollmentClosesAt = nextCloses;
    hasChange = true;
  }

  if (isDraft) {
    const nextName = form.name.trim();
    if (nextName !== original.name) {
      payload.name = nextName;
      hasChange = true;
    }

    const nextVenueId = form.venueId.trim();
    if (nextVenueId && nextVenueId !== (original.venue?.id ?? "")) {
      payload.venueId = nextVenueId;
      hasChange = true;
    }

    const nextWeekday = form.weekday ? Number.parseInt(form.weekday, 10) : null;
    if (nextWeekday !== original.weekday) {
      payload.weekday = nextWeekday;
      hasChange = true;
    }

    const nextStart = form.startTime.trim() || null;
    if (nextStart !== original.startTime) {
      payload.startTime = nextStart;
      hasChange = true;
    }

    const nextEnd = form.endTime.trim() || null;
    if (nextEnd !== original.endTime) {
      payload.endTime = nextEnd;
      hasChange = true;
    }

    const nextFirstDate = form.firstSessionDate.trim() || null;
    if (nextFirstDate !== original.firstSessionDate) {
      payload.firstSessionDate = nextFirstDate;
      hasChange = true;
    }

    const nextRecurrence = form.recurrence
      ? (form.recurrence as RegistrationSessionRecurrence)
      : null;
    if (nextRecurrence !== original.recurrence) {
      payload.recurrence = nextRecurrence;
      hasChange = true;
    }

    const nextAgeRule = form.ageReferenceRule
      ? (form.ageReferenceRule as RegistrationAgeReferenceRule)
      : null;
    if (nextAgeRule !== (original.ageReferenceRule ?? null)) {
      payload.ageReferenceRule = nextAgeRule;
      hasChange = true;
    }

    const nextAgeDate =
      nextAgeRule === "FIXED_DATE"
        ? form.ageReferenceDate.trim() || null
        : null;
    if (nextAgeDate !== original.ageReferenceDate) {
      payload.ageReferenceDate = nextAgeDate;
      hasChange = true;
    }
  }

  return hasChange ? payload : null;
}

export function createEmptyPolicyContentMap(): RegistrationPolicyContentMap {
  return {
    GUARDIAN_AUTHORITY: {
      en: { ref: "", sha256: "" },
      ms: { ref: "", sha256: "" },
      "zh-Hans": { ref: "", sha256: "" },
    },
    REGISTRATION_PRIVACY: {
      en: { ref: "", sha256: "" },
      ms: { ref: "", sha256: "" },
      "zh-Hans": { ref: "", sha256: "" },
    },
    MARKETING: {
      en: { ref: "", sha256: "" },
      ms: { ref: "", sha256: "" },
      "zh-Hans": { ref: "", sha256: "" },
    },
    PHOTOGRAPHY: {
      en: { ref: "", sha256: "" },
      ms: { ref: "", sha256: "" },
      "zh-Hans": { ref: "", sha256: "" },
    },
  };
}

export function validatePolicyDraftInput(
  policyVersion: string,
  content: RegistrationPolicyContentMap,
): {
  errors: Record<string, string>;
  payload: CreateRegistrationPolicyRequestDto | null;
} {
  const errors: Record<string, string> = {};
  const trimmedVersion = policyVersion.trim();

  if (!trimmedVersion) {
    errors.policyVersion = "Policy version is required.";
  } else if (!POLICY_VERSION_REGEX.test(trimmedVersion)) {
    errors.policyVersion =
      "Use 1–64 characters starting with a letter or digit (letters, digits, ., _, -).";
  }

  const cleanedContent = createEmptyPolicyContentMap();
  for (const category of CONSENT_CATEGORY_META) {
    for (const loc of POLICY_LOCALE_META) {
      const entry = content[category.type][loc.locale];
      const ref = entry.ref.trim();
      const sha256 = entry.sha256.trim().toLowerCase();
      const basePath = `content.${category.type}.${loc.locale}`;

      if (!ref) {
        errors[`${basePath}.ref`] = "Content reference is required.";
      } else if (ref.length > 300) {
        errors[`${basePath}.ref`] =
          "Reference must be 300 characters or fewer.";
      }

      if (!sha256) {
        errors[`${basePath}.sha256`] = "SHA-256 hash is required.";
      } else if (!SHA256_HEX_REGEX.test(sha256)) {
        errors[`${basePath}.sha256`] =
          "SHA-256 must be exactly 64 lowercase hexadecimal characters.";
      }

      cleanedContent[category.type][loc.locale] = { ref, sha256 };
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, payload: null };
  }

  return {
    errors: {},
    payload: {
      policyVersion: trimmedVersion,
      content: cleanedContent,
    },
  };
}

export function formatFieldErrorMessage(field: string, code: string): string {
  const fieldLabels: Record<string, string> = {
    name: "Session name",
    programmeId: "Programme",
    programme: "Programme (must be active)",
    "programme.sport": "Programme sport (must be active)",
    "programme.minimumAge": "Programme age range",
    venueId: "Venue",
    capacity: "Capacity",
    coachDisplayName: "Coach display name",
    weekday: "Training weekday",
    startTime: "Start time",
    endTime: "End time",
    firstSessionDate: "First session date",
    recurrence: "Recurrence",
    ageReferenceRule: "Age reference rule",
    ageReferenceDate: "Age reference date",
    enrollmentOpensAt: "Registration opens at",
    enrollmentClosesAt: "Registration closes at",
    consentPolicy: "Approved consent policy",
    policyVersion: "Policy version",
    "approvals.scheduleApproved": "Schedule approval acknowledgement",
    "approvals.ageRuleApproved": "Age rule approval acknowledgement",
    body: "Request body",
  };

  const label = fieldLabels[field] ?? field;

  switch (code) {
    case "REQUIRED":
      return `${label} is required.`;
    case "INVALID_FORMAT":
      return `${label} has an invalid format.`;
    case "INVALID_DATE":
      return `${label} is not a valid calendar date or timestamp.`;
    case "OUT_OF_RANGE":
      return `${label} is out of the permitted range.`;
    case "INVALID_VALUE":
      return `${label} is invalid or inactive.`;
    case "NOT_EDITABLE":
      return `${label} cannot be changed once a session is published.`;
    case "MUST_BE_TRUE":
      return `${label} must be explicitly confirmed.`;
    case "UNKNOWN_FIELD":
      return `Unexpected field rejected under ${label}.`;
    case "TOO_LONG":
      return `${label} exceeds the maximum length.`;
    default:
      return `${label}: ${code.replaceAll("_", " ").toLowerCase()}.`;
  }
}

export type AdminRegistrationErrorKind =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "STALE_VERSION"
  | "CAPACITY_EXCEEDED"
  | "CAPACITY_BELOW_CONFIRMED"
  | "INVALID_TRANSITION"
  | "SESSION_INCOMPLETE"
  | "SESSION_NOT_EDITABLE"
  | "SESSION_NOT_AVAILABLE"
  | "POLICY_VERSION_EXISTS"
  | "POLICY_NOT_APPROVABLE"
  | "POLICY_INVALID_STATE"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "GENERIC";

export interface ClassifiedAdminRegistrationError {
  kind: AdminRegistrationErrorKind;
  code: string | null;
  message: string;
  fieldErrors: RegistrationErrorFieldDto[];
  retryAfterSeconds: number | null;
}

function readErrorShape(error: unknown): {
  status: number | null;
  code: string | null;
  fieldErrors: RegistrationErrorFieldDto[];
  details: Record<string, unknown> | null;
  retryAfterSeconds: number | null;
} {
  if (!error || typeof error !== "object") {
    return {
      status: null,
      code: null,
      fieldErrors: [],
      details: null,
      retryAfterSeconds: null,
    };
  }
  const candidate = error as {
    status?: unknown;
    responseBody?: unknown;
    retryAfterSeconds?: unknown;
  };
  const status = typeof candidate.status === "number" ? candidate.status : null;
  const retryAfterSeconds =
    typeof candidate.retryAfterSeconds === "number" &&
    Number.isFinite(candidate.retryAfterSeconds) &&
    candidate.retryAfterSeconds > 0
      ? Math.ceil(candidate.retryAfterSeconds)
      : null;
  let code: string | null = null;
  let fieldErrors: RegistrationErrorFieldDto[] = [];
  let details: Record<string, unknown> | null = null;

  if (candidate.responseBody && typeof candidate.responseBody === "object") {
    const body = candidate.responseBody as Record<string, unknown>;
    if (typeof body.code === "string") {
      code = body.code;
    }
    if (Array.isArray(body.fieldErrors)) {
      fieldErrors = body.fieldErrors
        .filter(
          (entry): entry is RegistrationErrorFieldDto =>
            Boolean(entry) &&
            typeof entry === "object" &&
            typeof (entry as Record<string, unknown>).field === "string" &&
            typeof (entry as Record<string, unknown>).code === "string",
        )
        .map((entry) => ({ field: entry.field, code: entry.code }));
    }
    if (body.details && typeof body.details === "object") {
      details = body.details as Record<string, unknown>;
    }
  }
  return { status, code, fieldErrors, details, retryAfterSeconds };
}

/**
 * Maps backend HTTP status codes (401/403 per Decision D14) and stable error codes
 * into honest staff messages without exposing raw stack traces or developer strings.
 */
export function classifyAdminRegistrationError(
  error: unknown,
): ClassifiedAdminRegistrationError {
  const { status, code, fieldErrors, details, retryAfterSeconds } =
    readErrorShape(error);

  if (status === 401) {
    return {
      kind: "UNAUTHENTICATED",
      code: null,
      fieldErrors: [],
      retryAfterSeconds: null,
      message:
        "Your staff session has expired or is no longer authenticated. Please sign in again to continue.",
    };
  }
  if (status === 403) {
    return {
      kind: "FORBIDDEN",
      code: null,
      fieldErrors: [],
      retryAfterSeconds: null,
      message:
        "Access denied. This action requires an authorized staff role with verified AAL2 MFA.",
    };
  }

  switch (code) {
    case "STALE_VERSION":
      return {
        kind: "STALE_VERSION",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          "This record was modified by another administrator since you opened it. The latest version has been loaded—please review before submitting again.",
      };
    case "CAPACITY_EXCEEDED":
      return {
        kind: "CAPACITY_EXCEEDED",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          "Unable to confirm registration because the selected session has reached its configured seat capacity.",
      };
    case "CAPACITY_BELOW_CONFIRMED": {
      const confirmed =
        typeof details?.confirmed === "number" ? details.confirmed : null;
      return {
        kind: "CAPACITY_BELOW_CONFIRMED",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          confirmed !== null
            ? `Capacity cannot be lower than the ${confirmed} already confirmed registration(s).`
            : "Capacity cannot be lower than the number of already confirmed registrations.",
      };
    }
    case "INVALID_TRANSITION":
      return {
        kind: "INVALID_TRANSITION",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          "That lifecycle transition is not permitted for the record's current state. Refresh to inspect the latest state.",
      };
    case "SESSION_NOT_AVAILABLE":
      return {
        kind: "SESSION_NOT_AVAILABLE",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          "This training session is no longer open or has already been closed. Refresh to view its current state before retrying.",
      };
    case "SESSION_INCOMPLETE": {
      const summary = fieldErrors
        .map((fe) => formatFieldErrorMessage(fe.field, fe.code))
        .join(" ");
      return {
        kind: "SESSION_INCOMPLETE",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message: summary
          ? `Session cannot be published yet: ${summary}`
          : "Session is incomplete or its programme/sport is inactive and cannot be published yet.",
      };
    }
    case "SESSION_NOT_EDITABLE":
      return {
        kind: "SESSION_NOT_EDITABLE",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          "One or more fields cannot be edited in this session's current state.",
      };
    case "POLICY_VERSION_EXISTS":
      return {
        kind: "POLICY_VERSION_EXISTS",
        code,
        fieldErrors: [{ field: "policyVersion", code: "INVALID_VALUE" }],
        retryAfterSeconds: null,
        message:
          "A consent policy with that version identifier already exists in this organization. Choose a new unique version.",
      };
    case "POLICY_NOT_APPROVABLE":
      return {
        kind: "POLICY_NOT_APPROVABLE",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          "This consent policy cannot be approved (for example, synthetic policy versions cannot be approved in hosted staging or production).",
      };
    case "POLICY_INVALID_STATE":
      return {
        kind: "POLICY_INVALID_STATE",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          "This consent policy is not in a valid state for that action. Refresh to view the latest policy status.",
      };
    case "REGISTRATION_NOT_FOUND":
    case "SESSION_NOT_FOUND":
    case "POLICY_NOT_FOUND":
    case "PROGRAMME_NOT_FOUND":
    case "VENUE_NOT_FOUND":
      return {
        kind: "NOT_FOUND",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          "The requested record could not be found or is inactive in your active organization.",
      };
    case "VALIDATION_FAILED":
      return {
        kind: "VALIDATION",
        code,
        fieldErrors,
        retryAfterSeconds: null,
        message:
          fieldErrors.length > 0
            ? fieldErrors
                .map((fe) => formatFieldErrorMessage(fe.field, fe.code))
                .join(" ")
            : "Please check the required fields and formatting, then try again.",
      };
    case "RATE_LIMITED":
      return {
        kind: "RATE_LIMITED",
        code,
        fieldErrors,
        retryAfterSeconds,
        message: retryAfterSeconds
          ? `Too many requests. Please wait about ${retryAfterSeconds} seconds before retrying.`
          : "Too many requests. Please wait a moment before retrying.",
      };
    case "REGISTRATION_PERSISTENCE_FAILED":
      return {
        kind: "UNAVAILABLE",
        code,
        fieldErrors,
        retryAfterSeconds,
        message: retryAfterSeconds
          ? `The database was temporarily busy and could not complete this update. No partial change was saved—please wait about ${retryAfterSeconds} seconds and retry.`
          : "The database was temporarily busy and could not complete this update. No partial change was saved—please wait a moment and retry.",
      };
    case "SERVICE_TEMPORARILY_UNAVAILABLE":
      return {
        kind: "UNAVAILABLE",
        code,
        fieldErrors,
        retryAfterSeconds,
        message: retryAfterSeconds
          ? `Academy registration service is temporarily unavailable. Please wait about ${retryAfterSeconds} seconds and try again.`
          : "Academy registration service is temporarily unavailable. Please try again shortly.",
      };
    default:
      if (status === 503) {
        return {
          kind: "UNAVAILABLE",
          code,
          fieldErrors,
          retryAfterSeconds,
          message: retryAfterSeconds
            ? `Service is temporarily busy. Please wait about ${retryAfterSeconds} seconds and retry.`
            : "Service is temporarily unavailable. Please wait a moment and retry.",
        };
      }
      if (status !== null) {
        return {
          kind: "GENERIC",
          code,
          fieldErrors,
          retryAfterSeconds,
          message:
            "The registration request could not be completed. Please retry or check service status.",
        };
      }
      return {
        kind: "GENERIC",
        code: null,
        fieldErrors: [],
        retryAfterSeconds: null,
        message:
          "Unable to reach the Academy registration service. Check your connection and retry.",
      };
  }
}
