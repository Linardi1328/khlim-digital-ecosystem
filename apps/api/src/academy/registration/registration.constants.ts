export const REGISTRATION_OPERATION = "ACADEMY_REGISTRATION_CREATE";

export const REGISTRATION_STATUSES = [
  "RECEIVED",
  "UNDER_REVIEW",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const REGISTRATION_TRANSITIONS: Record<
  RegistrationStatus,
  readonly RegistrationStatus[]
> = {
  RECEIVED: ["UNDER_REVIEW", "CONFIRMED", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  REJECTED: [],
  CANCELLED: [],
};

export const STATUS_REASON_CODES = [
  "DUPLICATE",
  "INELIGIBLE",
  "CAPACITY",
  "GUARDIAN_REQUEST",
  "INCOMPLETE_INFORMATION",
  "SESSION_CHANGED",
  "OTHER",
] as const;

export const REGISTRATION_LOCALES = ["en", "ms", "zh-Hans"] as const;
export type RegistrationLocale = (typeof REGISTRATION_LOCALES)[number];

export const CONSENT_TYPES = [
  "GUARDIAN_AUTHORITY",
  "REGISTRATION_PRIVACY",
  "MARKETING",
  "PHOTOGRAPHY",
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];
export const REQUIRED_CONSENT_TYPES: readonly ConsentType[] = [
  "GUARDIAN_AUTHORITY",
  "REGISTRATION_PRIVACY",
];

/** Placeholder option lists pending owner confirmation; clients render from the config endpoint. */
export const REGISTRATION_OPTIONS = {
  gender: ["MALE", "FEMALE"],
  jerseySize: ["YS", "YM", "YL", "AS", "AM", "AL", "AXL"],
  guardianRelationship: [
    "MOTHER",
    "FATHER",
    "LEGAL_GUARDIAN",
    "GRANDPARENT",
    "OTHER_RELATIVE",
  ],
  emergencyContactRelationship: [
    "MOTHER",
    "FATHER",
    "LEGAL_GUARDIAN",
    "GRANDPARENT",
    "OTHER_RELATIVE",
    "FRIEND",
    "OTHER",
  ],
} as const;

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
export const RECEIPT_MESSAGE_CODE = "REGISTRATION_RECEIVED_PENDING_REVIEW";
export const ACADEMY_TIMEZONE = "Asia/Kuala_Lumpur";
export const PUBLIC_SESSION_LIMIT = 50;
export const MAX_PAGE_SIZE = 100;
