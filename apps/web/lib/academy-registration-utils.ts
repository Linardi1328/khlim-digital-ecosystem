import type {
  CreateRegistrationRequestDto,
  PublicRegistrationSessionDto,
  RegistrationLocale,
  RegistrationReceiptDto,
} from "@khlim/api-client";

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const KUALA_LUMPUR_TZ = "Asia/Kuala_Lumpur";

export function toRegistrationLocale(locale: string): RegistrationLocale {
  if (locale === "ms" || locale === "zh-Hans") {
    return locale;
  }
  return "en";
}

/**
 * Validates a calendar date in YYYY-MM-DD without constructing a local-timezone Date.
 */
export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY_REGEX.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * Returns today's calendar date (YYYY-MM-DD) in Asia/Kuala_Lumpur.
 */
export function getMalaysiaTodayDateOnly(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KUALA_LUMPUR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function isDateOnlyInFuture(
  dateOnly: string,
  todayMyt: string = getMalaysiaTodayDateOnly(),
): boolean {
  if (!isValidDateOnly(dateOnly)) return false;
  return dateOnly > todayMyt;
}

/**
 * Computes completed years between two YYYY-MM-DD calendar dates with zero timezone drift.
 * Guidance only; the server remains authoritative for eligibility.
 */
export function computeAgeAtReferenceDate(
  dobDateOnly: string,
  referenceDateOnly: string,
): number | null {
  if (!isValidDateOnly(dobDateOnly) || !isValidDateOnly(referenceDateOnly)) {
    return null;
  }
  const [by, bm, bd] = dobDateOnly.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [ry, rm, rd] = referenceDateOnly.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) {
    age -= 1;
  }
  return age;
}

export function resolveSessionAgeReferenceDate(
  session: PublicRegistrationSessionDto,
  todayMyt: string = getMalaysiaTodayDateOnly(),
): string | null {
  const rule = session.ageReference?.rule;
  if (rule === "FIXED_DATE") {
    return session.ageReference.date &&
      isValidDateOnly(session.ageReference.date)
      ? session.ageReference.date
      : null;
  }
  if (rule === "SESSION_START_DATE") {
    return session.firstSessionDate && isValidDateOnly(session.firstSessionDate)
      ? session.firstSessionDate
      : null;
  }
  if (rule === "REGISTRATION_DATE") {
    return todayMyt;
  }
  return null;
}

export function formatDateOnlyForLocale(
  dateOnly: string | null | undefined,
  locale: string,
): string {
  if (!dateOnly || !isValidDateOnly(dateOnly)) return "";
  const [year, month, day] = dateOnly.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const intlLocale =
    locale === "ms" ? "ms-MY" : locale === "zh-Hans" ? "zh-Hans-MY" : "en-MY";
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(utcNoon);
}

export function formatMytTimestampForLocale(
  isoString: string,
  locale: string,
): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const intlLocale =
    locale === "ms" ? "ms-MY" : locale === "zh-Hans" ? "zh-Hans-MY" : "en-MY";
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: KUALA_LUMPUR_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function format24HourTime(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return hhmm;
  const hour24 = Number(match[1]);
  const minute = match[2];
  if (hour24 < 0 || hour24 > 23) return hhmm;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period}`;
}

export function formatSessionTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): string {
  if (!startTime && !endTime) return "";
  if (startTime && endTime) {
    return `${format24HourTime(startTime)} – ${format24HourTime(endTime)}`;
  }
  return format24HourTime(startTime ?? endTime ?? "");
}

/**
 * Accepts Malaysian local mobile/landline formats (01x / 03-09 / 601x / +60...)
 * and international E.164 numbers (+[1-9]...). The server remains authoritative.
 */
export function isValidRegistrationPhone(phone: string): boolean {
  const cleaned = phone.trim().replace(/[\s\-().]/g, "");
  if (!cleaned) return false;
  return (
    /^01\d{8,9}$/.test(cleaned) ||
    /^0[3-9]\d{7,8}$/.test(cleaned) ||
    /^601\d{8,9}$/.test(cleaned) ||
    /^\+601\d{8,9}$/.test(cleaned) ||
    /^\+[1-9]\d{7,14}$/.test(cleaned)
  );
}

/**
 * Generates a high-entropy Idempotency-Key matching ^[A-Za-z0-9_-]{22,128}$.
 */
export function generateRegistrationIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Secure browser cryptography is required for registration");
}

export function fingerprintRegistrationPayload(
  payload: CreateRegistrationRequestDto,
): string {
  return JSON.stringify({
    sessionId: payload.sessionId,
    locale: payload.locale,
    consentVersion: payload.consentVersion,
    source: payload.source ?? null,
    player: {
      fullName: payload.player.fullName,
      dateOfBirth: payload.player.dateOfBirth,
      gender: payload.player.gender,
      jerseySize: payload.player.jerseySize,
      phone: payload.player.phone ?? null,
    },
    guardian: {
      fullName: payload.guardian.fullName,
      phone: payload.guardian.phone,
      relationship: payload.guardian.relationship,
      authorityConfirmed: payload.guardian.authorityConfirmed,
    },
    emergencyContact: {
      fullName: payload.emergencyContact.fullName,
      phone: payload.emergencyContact.phone,
      relationship: payload.emergencyContact.relationship,
    },
    consents: {
      registrationPrivacy: payload.consents.registrationPrivacy,
      marketing: payload.consents.marketing,
      photography: payload.consents.photography,
    },
  });
}

export function isValidRegistrationReceipt(
  data: unknown,
): data is RegistrationReceiptDto {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Record<string, unknown>;
  const session = candidate.session as Record<string, unknown> | undefined;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.referenceCode === "string" &&
    candidate.referenceCode.length > 0 &&
    candidate.status === "RECEIVED" &&
    candidate.reservesPlace === false &&
    typeof candidate.receivedAt === "string" &&
    candidate.receivedAt.length > 0 &&
    Boolean(session) &&
    typeof session?.id === "string" &&
    typeof session?.name === "string"
  );
}
