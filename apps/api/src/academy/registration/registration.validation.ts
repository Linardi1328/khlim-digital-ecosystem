import { BadRequestException } from "@nestjs/common";
import { normalizePhoneNumber } from "../academy-leads.validation";
import {
  CONSENT_TYPES,
  IDEMPOTENCY_KEY_PATTERN,
  MAX_PAGE_SIZE,
  REGISTRATION_LOCALES,
  REGISTRATION_OPTIONS,
  REGISTRATION_STATUSES,
  STATUS_REASON_CODES,
  type ConsentType,
  type RegistrationLocale,
  type RegistrationStatus,
} from "./registration.constants";
import { isValidIsoDate, todayInAcademyZone } from "./registration.dates";
import {
  RegistrationApiException,
  type RegistrationFieldError,
  validationFailed,
} from "./registration.errors";

type Rec = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Collects field errors; `done()` throws one VALIDATION_FAILED for the lot. */
export class Validator {
  readonly errors: RegistrationFieldError[] = [];

  add(field: string, code: string): void {
    this.errors.push({ field, code });
  }

  done(): void {
    if (this.errors.length) throw validationFailed(this.errors);
  }

  /** Returns the object only if it is a plain object; rejects every unknown key. */
  object(
    value: unknown,
    path: string,
    allowed: readonly string[],
    required = true,
  ): Rec | null {
    if (value === undefined || value === null) {
      if (required) this.add(path || "body", "REQUIRED");
      return null;
    }
    if (typeof value !== "object" || Array.isArray(value)) {
      this.add(path || "body", "INVALID_TYPE");
      return null;
    }
    // Unknown member names are client-controlled and may carry personal data,
    // so they are never echoed: report one UNKNOWN_FIELD at the known parent.
    if (Object.keys(value).some((key) => !allowed.includes(key))) {
      this.add(path || "body", "UNKNOWN_FIELD");
    }
    return value as Rec;
  }

  text(
    record: Rec | null,
    key: string,
    path: string,
    options: { min?: number; max: number; required?: boolean },
  ): string | undefined {
    const field = path ? `${path}.${key}` : key;
    const value = record?.[key];
    if (value === undefined || value === null) {
      if (options.required !== false && record) this.add(field, "REQUIRED");
      return undefined;
    }
    if (typeof value !== "string") {
      this.add(field, "INVALID_TYPE");
      return undefined;
    }
    const normalized = value.normalize("NFC").replace(/\s+/g, " ").trim();
    if (CONTROL_CHARS.test(value.replace(/[\t\n\r]/g, " "))) {
      this.add(field, "INVALID_FORMAT");
      return undefined;
    }
    if (!normalized) {
      this.add(field, "REQUIRED");
      return undefined;
    }
    if (normalized.length < (options.min ?? 1)) {
      this.add(field, "TOO_SHORT");
      return undefined;
    }
    if (normalized.length > options.max) {
      this.add(field, "TOO_LONG");
      return undefined;
    }
    return normalized;
  }

  oneOf<T extends string>(
    record: Rec | null,
    key: string,
    path: string,
    allowed: readonly T[],
    required = true,
  ): T | undefined {
    const field = path ? `${path}.${key}` : key;
    const value = record?.[key];
    if (value === undefined || value === null) {
      if (required && record) this.add(field, "REQUIRED");
      return undefined;
    }
    if (typeof value !== "string") {
      this.add(field, "INVALID_TYPE");
      return undefined;
    }
    if (!(allowed as readonly string[]).includes(value)) {
      this.add(field, "INVALID_VALUE");
      return undefined;
    }
    return value as T;
  }

  uuid(
    record: Rec | null,
    key: string,
    path: string,
    required = true,
  ): string | undefined {
    const field = path ? `${path}.${key}` : key;
    const value = record?.[key];
    if (value === undefined || value === null) {
      if (required && record) this.add(field, "REQUIRED");
      return undefined;
    }
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
      this.add(
        field,
        typeof value === "string" ? "INVALID_FORMAT" : "INVALID_TYPE",
      );
      return undefined;
    }
    return value.toLowerCase();
  }

  phone(
    record: Rec | null,
    key: string,
    path: string,
    required = true,
  ): string | undefined {
    const field = path ? `${path}.${key}` : key;
    const value = record?.[key];
    if (value === undefined || value === null) {
      if (required && record) this.add(field, "REQUIRED");
      return undefined;
    }
    if (typeof value !== "string" || value.length > 40) {
      this.add(field, typeof value === "string" ? "TOO_LONG" : "INVALID_TYPE");
      return undefined;
    }
    try {
      return normalizePhoneNumber(value);
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.add(field, "INVALID_PHONE");
        return undefined;
      }
      throw error;
    }
  }

  isoDate(
    record: Rec | null,
    key: string,
    path: string,
    required = true,
  ): string | undefined {
    const field = path ? `${path}.${key}` : key;
    const value = record?.[key];
    if (value === undefined || value === null) {
      if (required && record) this.add(field, "REQUIRED");
      return undefined;
    }
    if (typeof value !== "string" || !isValidIsoDate(value)) {
      this.add(field, "INVALID_DATE");
      return undefined;
    }
    return value;
  }

  isoDateTime(
    record: Rec | null,
    key: string,
    path: string,
  ): Date | null | undefined {
    const field = path ? `${path}.${key}` : key;
    const value = record?.[key];
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(
        value,
      )
    ) {
      this.add(field, "INVALID_DATE");
      return undefined;
    }
    // Reject impossible calendar days before Date can normalize them
    // (2026-02-30T10:00:00Z would otherwise become 2026-03-02).
    if (!isValidIsoDate(value.slice(0, 10))) {
      this.add(field, "INVALID_DATE");
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      this.add(field, "INVALID_DATE");
      return undefined;
    }
    return parsed;
  }

  integer(
    record: Rec | null,
    key: string,
    path: string,
    min: number,
    max: number,
    required = true,
  ): number | undefined {
    const field = path ? `${path}.${key}` : key;
    const value = record?.[key];
    if (value === undefined || value === null) {
      if (required && record) this.add(field, "REQUIRED");
      return undefined;
    }
    if (typeof value !== "number" || !Number.isInteger(value)) {
      this.add(field, "INVALID_TYPE");
      return undefined;
    }
    if (value < min || value > max) {
      this.add(field, "OUT_OF_RANGE");
      return undefined;
    }
    return value;
  }

  boolean(
    record: Rec | null,
    key: string,
    path: string,
    required = true,
  ): boolean | undefined {
    const field = path ? `${path}.${key}` : key;
    const value = record?.[key];
    if (value === undefined || value === null) {
      if (required && record) this.add(field, "REQUIRED");
      return undefined;
    }
    if (typeof value !== "boolean") {
      this.add(field, "INVALID_TYPE");
      return undefined;
    }
    return value;
  }
}

export function validateIdempotencyKeyHeader(value: unknown): string {
  const raw = Array.isArray(value) ? undefined : value;
  if (raw === undefined || raw === null || raw === "") {
    throw new RegistrationApiException(
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Idempotency-Key header is required",
    );
  }
  if (typeof raw !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(raw)) {
    throw new RegistrationApiException(
      400,
      "IDEMPOTENCY_KEY_INVALID",
      "Idempotency-Key must be 22-128 URL-safe characters",
    );
  }
  return raw;
}

/**
 * Optional campaign attribution. Anything malformed, phone-like or personal-
 * looking is dropped (stored as unattributed) rather than failing the form.
 */
export function sanitizeRegistrationSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) return null;
  if (trimmed.toLowerCase() === "unattributed") return null;
  const digits = trimmed.replace(/[\s_-]/g, "");
  if (/^\d+$/.test(digits) && digits.length >= 8) return null;
  if (/\d{8,}/.test(digits)) return null;
  return trimmed;
}

export interface ParsedRegistration {
  sessionId: string;
  locale: RegistrationLocale;
  consentVersion: string;
  source: string | null;
  player: {
    fullName: string;
    dateOfBirth: string;
    gender: string;
    jerseySize: string;
    phone: string | null;
  };
  guardian: {
    fullName: string;
    phone: string;
    relationship: string;
    authorityConfirmed: true;
  };
  emergencyContact: { fullName: string; phone: string; relationship: string };
  consents: {
    registrationPrivacy: true;
    marketing: boolean;
    photography: boolean;
  };
}

export function parseCreateRegistration(body: unknown): ParsedRegistration {
  const v = new Validator();
  const root = v.object(body, "", [
    "sessionId",
    "locale",
    "consentVersion",
    "source",
    "player",
    "guardian",
    "emergencyContact",
    "consents",
  ]);
  const sessionId = v.uuid(root, "sessionId", "");
  const locale = v.oneOf(root, "locale", "", REGISTRATION_LOCALES);
  const consentVersion = v.text(root, "consentVersion", "", { max: 64 });

  const playerRec = v.object(root?.player, "player", [
    "fullName",
    "dateOfBirth",
    "gender",
    "jerseySize",
    "phone",
  ]);
  const playerName = v.text(playerRec, "fullName", "player", {
    min: 2,
    max: 120,
  });
  const dob = v.isoDate(playerRec, "dateOfBirth", "player");
  if (dob && dob > todayInAcademyZone())
    v.add("player.dateOfBirth", "DATE_IN_FUTURE");
  if (dob && dob < "1990-01-01") v.add("player.dateOfBirth", "OUT_OF_RANGE");
  const gender = v.oneOf(
    playerRec,
    "gender",
    "player",
    REGISTRATION_OPTIONS.gender,
  );
  const jerseySize = v.oneOf(
    playerRec,
    "jerseySize",
    "player",
    REGISTRATION_OPTIONS.jerseySize,
  );
  const playerPhone = v.phone(playerRec, "phone", "player", false);

  const guardianRec = v.object(root?.guardian, "guardian", [
    "fullName",
    "phone",
    "relationship",
    "authorityConfirmed",
  ]);
  const guardianName = v.text(guardianRec, "fullName", "guardian", {
    min: 2,
    max: 120,
  });
  const guardianPhone = v.phone(guardianRec, "phone", "guardian");
  const guardianRelationship = v.oneOf(
    guardianRec,
    "relationship",
    "guardian",
    REGISTRATION_OPTIONS.guardianRelationship,
  );
  const authority = v.boolean(guardianRec, "authorityConfirmed", "guardian");
  if (authority === false) v.add("guardian.authorityConfirmed", "MUST_BE_TRUE");

  const emergencyRec = v.object(root?.emergencyContact, "emergencyContact", [
    "fullName",
    "phone",
    "relationship",
  ]);
  const emergencyName = v.text(emergencyRec, "fullName", "emergencyContact", {
    min: 2,
    max: 120,
  });
  const emergencyPhone = v.phone(emergencyRec, "phone", "emergencyContact");
  const emergencyRelationship = v.oneOf(
    emergencyRec,
    "relationship",
    "emergencyContact",
    REGISTRATION_OPTIONS.emergencyContactRelationship,
  );

  const consentRec = v.object(root?.consents, "consents", [
    "registrationPrivacy",
    "marketing",
    "photography",
  ]);
  const privacy = v.boolean(consentRec, "registrationPrivacy", "consents");
  if (privacy === false) v.add("consents.registrationPrivacy", "MUST_BE_TRUE");
  const marketing = v.boolean(consentRec, "marketing", "consents");
  const photography = v.boolean(consentRec, "photography", "consents");

  v.done();
  return {
    sessionId: sessionId!,
    locale: locale!,
    consentVersion: consentVersion!,
    source: sanitizeRegistrationSource(root?.source),
    player: {
      fullName: playerName!,
      dateOfBirth: dob!,
      gender: gender!,
      jerseySize: jerseySize!,
      phone: playerPhone ?? null,
    },
    guardian: {
      fullName: guardianName!,
      phone: guardianPhone!,
      relationship: guardianRelationship!,
      authorityConfirmed: true,
    },
    emergencyContact: {
      fullName: emergencyName!,
      phone: emergencyPhone!,
      relationship: emergencyRelationship!,
    },
    consents: {
      registrationPrivacy: true,
      marketing: marketing!,
      photography: photography!,
    },
  };
}

export interface ParsedStatusChange {
  status: RegistrationStatus;
  reasonCode: string | null;
  expectedVersion: number;
}

export function parseStatusChange(body: unknown): ParsedStatusChange {
  const v = new Validator();
  const root = v.object(body, "", ["status", "reasonCode", "expectedVersion"]);
  const status = v.oneOf(root, "status", "", REGISTRATION_STATUSES);
  const reasonCode =
    root?.reasonCode === null
      ? undefined
      : v.oneOf(root, "reasonCode", "", STATUS_REASON_CODES, false);
  const expectedVersion = v.integer(
    root,
    "expectedVersion",
    "",
    1,
    2_000_000_000,
  );
  if (status === "REJECTED" || status === "CANCELLED") {
    if (!reasonCode) v.add("reasonCode", "REASON_CODE_REQUIRED");
  } else if (status && reasonCode) {
    v.add("reasonCode", "INVALID_VALUE");
  }
  if (status === "RECEIVED") v.add("status", "INVALID_VALUE");
  v.done();
  return {
    status: status!,
    reasonCode: reasonCode ?? null,
    expectedVersion: expectedVersion!,
  };
}

export interface PageQuery {
  status?: RegistrationStatus;
  sessionId?: string;
  page: number;
  limit: number;
}

function parsePaging(
  v: Validator,
  rec: Rec | null,
): { page: number; limit: number } {
  const page = v.integer(rec, "page", "", 1, 10000, false) ?? 1;
  const limit = v.integer(rec, "limit", "", 1, MAX_PAGE_SIZE, false) ?? 20;
  return { page, limit };
}

/** GET list query: string values from Express. PII search terms are rejected here. */
export function parseListQuery(query: unknown): PageQuery {
  if (query && typeof query === "object" && "q" in (query as Rec)) {
    throw new RegistrationApiException(
      400,
      "SEARCH_NOT_ALLOWED_IN_QUERY",
      "Use POST /admin/academy/registrations/search for text search",
    );
  }
  const allowed = ["status", "sessionId", "page", "limit"];
  const record = (query ?? {}) as Rec;
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      throw new RegistrationApiException(
        400,
        "UNKNOWN_QUERY_PARAMETER",
        "Unknown query parameter",
      );
    }
  }
  const coerced: Rec = { ...record };
  for (const key of ["page", "limit"]) {
    const raw = record[key];
    if (typeof raw === "string") {
      coerced[key] = /^\d{1,6}$/.test(raw) ? Number(raw) : raw;
    }
  }
  const v = new Validator();
  const status = v.oneOf(coerced, "status", "", REGISTRATION_STATUSES, false);
  const sessionId = v.uuid(coerced, "sessionId", "", false);
  const paging = parsePaging(v, coerced);
  v.done();
  return { status, sessionId, ...paging };
}

export interface ParsedSearch extends PageQuery {
  q: string;
}

export function parseSearchBody(body: unknown): ParsedSearch {
  const v = new Validator();
  const root = v.object(body, "", [
    "q",
    "status",
    "sessionId",
    "page",
    "limit",
  ]);
  const q = v.text(root, "q", "", { min: 2, max: 100 });
  const status = v.oneOf(root, "status", "", REGISTRATION_STATUSES, false);
  const sessionId = v.uuid(root, "sessionId", "", false);
  const paging = parsePaging(v, root);
  v.done();
  return { q: q!, status, sessionId, ...paging };
}

export function parseUuidParam(value: unknown, code: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new RegistrationApiException(404, code, "Not found");
  }
  return value.toLowerCase();
}

export type { ConsentType };
export { CONSENT_TYPES };
