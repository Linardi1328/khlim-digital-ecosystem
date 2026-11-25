import type {
  RegistrationReasonCode,
  RegistrationStatus,
} from "@khlim/api-client";

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

export function getAllowedNextStatuses(
  current: RegistrationStatus,
): RegistrationStatus[] {
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

export function isReasonCodeRequired(target: RegistrationStatus): boolean {
  return target === "REJECTED" || target === "CANCELLED";
}

export function formatRegistrationReasonCode(
  code: string | null | undefined,
): string {
  if (!code) return "—";
  const match = REGISTRATION_REASON_CODES.find((item) => item.code === code);
  return match ? match.label : code;
}

export type AdminRegistrationErrorKind =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "STALE_VERSION"
  | "CAPACITY_EXCEEDED"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "GENERIC";

export interface ClassifiedAdminRegistrationError {
  kind: AdminRegistrationErrorKind;
  code: string | null;
  message: string;
}

function readErrorShape(error: unknown): {
  status: number | null;
  code: string | null;
} {
  if (!error || typeof error !== "object") {
    return { status: null, code: null };
  }
  const candidate = error as {
    status?: unknown;
    responseBody?: unknown;
  };
  const status = typeof candidate.status === "number" ? candidate.status : null;
  let code: string | null = null;
  if (
    candidate.responseBody &&
    typeof candidate.responseBody === "object" &&
    typeof (candidate.responseBody as { code?: unknown }).code === "string"
  ) {
    code = (candidate.responseBody as { code: string }).code;
  }
  return { status, code };
}

/**
 * Maps backend HTTP status codes (401/403 per Decision D14) and stable error codes
 * into honest staff messages without exposing raw stack traces or developer strings.
 */
export function classifyAdminRegistrationError(
  error: unknown,
): ClassifiedAdminRegistrationError {
  const { status, code } = readErrorShape(error);

  if (status === 401) {
    return {
      kind: "UNAUTHENTICATED",
      code: null,
      message:
        "Your staff session has expired or is no longer authenticated. Please sign in again to continue.",
    };
  }
  if (status === 403) {
    return {
      kind: "FORBIDDEN",
      code: null,
      message:
        "Access denied. This action requires an authorized Academy Admin, Management, or Super Admin account with verified AAL2 MFA.",
    };
  }

  switch (code) {
    case "STALE_VERSION":
      return {
        kind: "STALE_VERSION",
        code,
        message:
          "This registration was modified by another administrator since you opened it. The latest record has been loaded—please review before submitting again.",
      };
    case "CAPACITY_EXCEEDED":
      return {
        kind: "CAPACITY_EXCEEDED",
        code,
        message:
          "Unable to confirm registration because the selected session has reached its configured seat capacity.",
      };
    case "INVALID_TRANSITION":
      return {
        kind: "INVALID_TRANSITION",
        code,
        message:
          "That status transition is not permitted for the registration's current state. Refresh the record to see valid actions.",
      };
    case "REGISTRATION_NOT_FOUND":
      return {
        kind: "NOT_FOUND",
        code,
        message:
          "The requested registration record could not be found in your active organization.",
      };
    case "VALIDATION_FAILED":
      return {
        kind: "VALIDATION",
        code,
        message:
          "Please check the required fields (including reason code for Rejected or Cancelled status) and try again.",
      };
    case "RATE_LIMITED":
      return {
        kind: "RATE_LIMITED",
        code,
        message: "Too many requests. Please wait a moment before retrying.",
      };
    case "SERVICE_TEMPORARILY_UNAVAILABLE":
      return {
        kind: "UNAVAILABLE",
        code,
        message:
          "Academy registration service is temporarily unavailable. Please try again shortly.",
      };
    default:
      if (status !== null) {
        return {
          kind: "GENERIC",
          code,
          message:
            "The registration request could not be completed. Please retry or check service status.",
        };
      }
      return {
        kind: "GENERIC",
        code: null,
        message:
          "Unable to reach the Academy registration service. Check your connection and retry.",
      };
  }
}
