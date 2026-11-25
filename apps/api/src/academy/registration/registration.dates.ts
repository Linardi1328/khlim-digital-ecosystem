import { ACADEMY_TIMEZONE } from "./registration.constants";

/** `YYYY-MM-DD` in Asia/Kuala_Lumpur. */
export function todayInAcademyZone(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(value: string): number {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Completed years between two ISO dates (birthday-aware, no calendar-year shortcut). */
export function completedYears(dateOfBirth: string, reference: string): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [ry, rm, rd] = reference.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  let years = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) years -= 1;
  return years;
}

export type AgeReferenceRule =
  "FIXED_DATE" | "SESSION_START_DATE" | "REGISTRATION_DATE";

export function resolveAgeReferenceDate(
  rule: AgeReferenceRule,
  fixedDate: string | null,
  firstSessionDate: string | null,
  now = new Date(),
): string | null {
  switch (rule) {
    case "FIXED_DATE":
      return fixedDate;
    case "SESSION_START_DATE":
      return firstSessionDate;
    case "REGISTRATION_DATE":
      return todayInAcademyZone(now);
    default:
      return null;
  }
}
