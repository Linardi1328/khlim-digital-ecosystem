import {
  CONSENT_TYPES,
  REGISTRATION_LOCALES,
  type ConsentType,
  type RegistrationLocale,
} from "./registration.constants";
import { Validator } from "./registration.validation";

type Rec = Record<string, unknown>;

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
export const RECURRENCES = ["NONE", "WEEKLY"] as const;
export const AGE_RULES = [
  "FIXED_DATE",
  "SESSION_START_DATE",
  "REGISTRATION_DATE",
] as const;

export interface SessionFieldChanges {
  name?: string;
  capacity?: number;
  venueId?: string;
  enrollmentOpensAt?: Date | null;
  enrollmentClosesAt?: Date | null;
  coachDisplayName?: string | null;
  weekday?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  firstSessionDate?: string | null;
  recurrence?: (typeof RECURRENCES)[number] | null;
  ageReferenceRule?: (typeof AGE_RULES)[number] | null;
  ageReferenceDate?: string | null;
}

export const SESSION_FIELD_KEYS = [
  "name",
  "capacity",
  "venueId",
  "enrollmentOpensAt",
  "enrollmentClosesAt",
  "coachDisplayName",
  "weekday",
  "startTime",
  "endTime",
  "firstSessionDate",
  "recurrence",
  "ageReferenceRule",
  "ageReferenceDate",
] as const;

function nullable<T>(
  v: Validator,
  rec: Rec | null,
  key: string,
  read: () => T | undefined,
): T | null | undefined {
  if (!rec || !(key in rec)) return undefined;
  if (rec[key] === null) return null;
  return read();
}

function parseSessionFields(
  v: Validator,
  rec: Rec | null,
): SessionFieldChanges {
  const out: SessionFieldChanges = {};
  if (rec && "name" in rec) {
    out.name = v.text(rec, "name", "", { max: 180 });
  }
  if (rec && "capacity" in rec) {
    out.capacity = v.integer(rec, "capacity", "", 1, 10000);
  }
  if (rec && "venueId" in rec) out.venueId = v.uuid(rec, "venueId", "");
  if (rec && "enrollmentOpensAt" in rec) {
    out.enrollmentOpensAt = v.isoDateTime(rec, "enrollmentOpensAt", "");
  }
  if (rec && "enrollmentClosesAt" in rec) {
    out.enrollmentClosesAt = v.isoDateTime(rec, "enrollmentClosesAt", "");
  }
  const coach = nullable(v, rec, "coachDisplayName", () =>
    v.text(rec, "coachDisplayName", "", { max: 120 }),
  );
  if (coach !== undefined) out.coachDisplayName = coach;
  const weekday = nullable(v, rec, "weekday", () =>
    v.integer(rec, "weekday", "", 1, 7),
  );
  if (weekday !== undefined) out.weekday = weekday;
  for (const key of ["startTime", "endTime"] as const) {
    const value = nullable(v, rec, key, () => {
      const raw = rec?.[key];
      if (typeof raw !== "string") {
        v.add(key, "INVALID_TYPE");
        return undefined;
      }
      if (!TIME_PATTERN.test(raw)) {
        v.add(key, "INVALID_FORMAT");
        return undefined;
      }
      return raw;
    });
    if (value !== undefined) out[key] = value;
  }
  const first = nullable(v, rec, "firstSessionDate", () =>
    v.isoDate(rec, "firstSessionDate", ""),
  );
  if (first !== undefined) out.firstSessionDate = first;
  const recurrence = nullable(v, rec, "recurrence", () =>
    v.oneOf(rec, "recurrence", "", RECURRENCES),
  );
  if (recurrence !== undefined) out.recurrence = recurrence;
  const rule = nullable(v, rec, "ageReferenceRule", () =>
    v.oneOf(rec, "ageReferenceRule", "", AGE_RULES),
  );
  if (rule !== undefined) out.ageReferenceRule = rule;
  const refDate = nullable(v, rec, "ageReferenceDate", () =>
    v.isoDate(rec, "ageReferenceDate", ""),
  );
  if (refDate !== undefined) out.ageReferenceDate = refDate;
  return out;
}

export interface CreateSessionInput extends SessionFieldChanges {
  programmeId: string;
  name: string;
  venueId: string;
  capacity: number;
}

export function parseCreateSession(body: unknown): CreateSessionInput {
  const v = new Validator();
  const root = v.object(body, "", ["programmeId", ...SESSION_FIELD_KEYS]);
  const programmeId = v.uuid(root, "programmeId", "");
  const fields = parseSessionFields(v, root);
  if (fields.name === undefined && !v.errors.some((e) => e.field === "name")) {
    v.add("name", "REQUIRED");
  }
  if (
    fields.venueId === undefined &&
    !v.errors.some((e) => e.field === "venueId")
  ) {
    v.add("venueId", "REQUIRED");
  }
  if (
    fields.capacity === undefined &&
    !v.errors.some((e) => e.field === "capacity")
  ) {
    v.add("capacity", "REQUIRED");
  }
  v.done();
  return {
    ...fields,
    programmeId: programmeId!,
    name: fields.name!,
    venueId: fields.venueId!,
    capacity: fields.capacity!,
  };
}

export function parsePatchSession(body: unknown): {
  expectedVersion: number;
  changes: SessionFieldChanges;
} {
  const v = new Validator();
  const root = v.object(body, "", ["expectedVersion", ...SESSION_FIELD_KEYS]);
  const expectedVersion = v.integer(
    root,
    "expectedVersion",
    "",
    1,
    2_000_000_000,
  );
  const changes = parseSessionFields(v, root);
  v.done();
  if (!Object.keys(changes).length) {
    v.add("body", "REQUIRED");
    v.done();
  }
  return { expectedVersion: expectedVersion!, changes };
}

export function parsePublishSession(body: unknown): {
  expectedVersion: number;
} {
  const v = new Validator();
  const root = v.object(body, "", ["expectedVersion", "approvals"]);
  const expectedVersion = v.integer(
    root,
    "expectedVersion",
    "",
    1,
    2_000_000_000,
  );
  const approvals = v.object(root?.approvals, "approvals", [
    "scheduleApproved",
    "ageRuleApproved",
  ]);
  for (const key of ["scheduleApproved", "ageRuleApproved"]) {
    const value = v.boolean(approvals, key, "approvals");
    if (value === false) v.add(`approvals.${key}`, "MUST_BE_TRUE");
  }
  v.done();
  return { expectedVersion: expectedVersion! };
}

export function parseVersionOnly(body: unknown): { expectedVersion: number } {
  const v = new Validator();
  const root = v.object(body, "", ["expectedVersion"]);
  const expectedVersion = v.integer(
    root,
    "expectedVersion",
    "",
    1,
    2_000_000_000,
  );
  v.done();
  return { expectedVersion: expectedVersion! };
}

export type PolicyContent = Record<
  ConsentType,
  Record<RegistrationLocale, { ref: string; sha256: string }>
>;

export function parseCreatePolicy(body: unknown): {
  policyVersion: string;
  content: PolicyContent;
} {
  const v = new Validator();
  const root = v.object(body, "", ["policyVersion", "content"]);
  const policyVersion = v.text(root, "policyVersion", "", { max: 64 });
  if (
    policyVersion &&
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(policyVersion)
  ) {
    v.add("policyVersion", "INVALID_FORMAT");
  }
  const contentRec = v.object(root?.content, "content", CONSENT_TYPES);
  const content = {} as PolicyContent;
  for (const type of CONSENT_TYPES) {
    const typeRec = v.object(
      contentRec?.[type],
      `content.${type}`,
      REGISTRATION_LOCALES,
    );
    const byLocale = {} as Record<
      RegistrationLocale,
      { ref: string; sha256: string }
    >;
    for (const locale of REGISTRATION_LOCALES) {
      const path = `content.${type}.${locale}`;
      const entry = v.object(typeRec?.[locale], path, ["ref", "sha256"]);
      const ref = v.text(entry, "ref", path, { max: 300 });
      const sha = entry?.sha256;
      if (entry && typeof sha === "string" && !/^[0-9a-f]{64}$/.test(sha)) {
        v.add(`${path}.sha256`, "INVALID_FORMAT");
      } else if (entry && sha === undefined) {
        v.add(`${path}.sha256`, "REQUIRED");
      } else if (entry && typeof sha !== "string") {
        v.add(`${path}.sha256`, "INVALID_TYPE");
      }
      if (ref && typeof sha === "string")
        byLocale[locale] = { ref, sha256: sha };
    }
    content[type] = byLocale;
  }
  v.done();
  return { policyVersion: policyVersion!, content };
}
