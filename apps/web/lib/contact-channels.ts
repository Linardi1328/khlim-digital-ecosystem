/**
 * Official customer communication channel utilities for KHLIM `/contact`.
 *
 * Security & honesty invariants:
 * - Official WhatsApp MUST come exclusively from `NEXT_PUBLIC_KHLIM_WHATSAPP_NUMBER`.
 *   Never invent a number and never assume `NEXT_PUBLIC_BUSINESS_PHONE` supports WhatsApp.
 * - Validate and normalize WhatsApp numbers strictly before constructing `wa.me` links.
 * - Require explicit privacy acknowledgement before generating personalized enquiry URLs.
 * - Apply strict input length limits and plain-text sanitization before URL encoding.
 */

export const CONTACT_ENQUIRY_CATEGORIES = [
  "academy_registration",
  "training_programmes_schedules",
  "membership_fees",
  "tournaments_events",
  "partnerships_sponsorships",
  "general_enquiries",
] as const;

export type ContactEnquiryCategory =
  (typeof CONTACT_ENQUIRY_CATEGORIES)[number];

export const CONTACT_NAME_MAX_LENGTH = 100;
export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const CONTACT_MESSAGE_MAX_LENGTH = 1000;

const ALLOWED_RAW_PHONE_CHARS = /^[0-9+\s().-]+$/;
const STRICT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Reads the dedicated official WhatsApp configuration without falling back to
 * the ordinary company telephone number.
 */
export function getConfiguredOfficialWhatsAppRaw(): string {
  return process.env.NEXT_PUBLIC_KHLIM_WHATSAPP_NUMBER?.trim() ?? "";
}

/**
 * Validates and normalizes an official WhatsApp number into E.164 digits
 * (no leading `+`) suitable for `https://wa.me/<digits>`.
 *
 * Accepts:
 * - International E.164 format (`+60123456789`, `60123456789`, `0060123456789`)
 * - Malaysian local mobile numbers (`01x-xxxx xxxx`, 10–11 digits -> `601x...`)
 *
 * Rejects:
 * - Empty values, letters/symbols, non-mobile Malaysian local landlines (`03-...`),
 *   placeholder strings, or numbers outside ITU-T E.164 length bounds (8–15 digits).
 */
export function normalizeOfficialWhatsAppNumber(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (!ALLOWED_RAW_PHONE_CHARS.test(trimmed)) return null;

  // Reject misplaced `+` anywhere other than index 0.
  const plusIndex = trimmed.indexOf("+");
  if (plusIndex > 0 || trimmed.lastIndexOf("+") > 0) {
    return null;
  }

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (trimmed.startsWith("+")) {
    // International E.164 after `+`: must not start with 0.
    if (digits.startsWith("0")) return null;
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
    if (!digits || digits.startsWith("0")) return null;
  } else if (digits.startsWith("0")) {
    // Only normalize Malaysian local mobile numbers (`01x`, 10–11 digits).
    // Local landlines (`03`, `04`, etc.) are rejected because they are not assumed to be WhatsApp.
    if (!/^01\d{8,9}$/.test(digits)) {
      return null;
    }
    digits = `60${digits.slice(1)}`;
  }

  // Country-specific sanity check for Malaysia (+60): 10–12 digits total (60 + 8–10 digits).
  if (digits.startsWith("60")) {
    if (!/^60(1\d{8,9}|[3-9]\d{7,8})$/.test(digits)) {
      return null;
    }
    return digits;
  }

  // General ITU-T E.164 international format: 8–15 digits, non-zero country code.
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    return null;
  }

  return digits;
}

/**
 * Formats normalized E.164 WhatsApp digits for clean human-readable display.
 */
export function formatWhatsAppDisplayNumber(normalizedDigits: string): string {
  if (/^6011\d{8}$/.test(normalizedDigits)) {
    return `+60 ${normalizedDigits.slice(2, 4)}-${normalizedDigits.slice(4, 8)} ${normalizedDigits.slice(8)}`;
  }
  if (/^601\d{8}$/.test(normalizedDigits)) {
    return `+60 ${normalizedDigits.slice(2, 4)}-${normalizedDigits.slice(4, 7)} ${normalizedDigits.slice(7)}`;
  }
  return `+${normalizedDigits}`;
}

/**
 * Validates that a configured business email address is syntactically safe for `mailto:`.
 */
export function isValidContactEmail(raw: string | null | undefined): boolean {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed.length > CONTACT_EMAIL_MAX_LENGTH) return false;
  if (/[\r\n]/.test(trimmed)) return false;
  return STRICT_EMAIL_REGEX.test(trimmed);
}

/**
 * Strips control characters, collapses line breaks, trims, and bounds single-line text.
 */
export function sanitizeSingleLineContactText(
  value: string,
  maxLength: number,
): string {
  const cleaned = value
    .replace(/[\r\n\t]+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Normalizes line breaks, strips non-newline control characters, trims, and bounds multi-line text.
 */
export function sanitizeMultilineContactText(
  value: string,
  maxLength: number,
): string {
  const cleaned = value
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.slice(0, maxLength);
}

export function buildWhatsAppDirectUrl(
  rawPhone: string | null | undefined,
): string | null {
  const normalized = normalizeOfficialWhatsAppNumber(rawPhone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}`;
}

export interface WhatsAppEnquiryParams {
  rawPhone: string | null | undefined;
  privacyAcknowledged: boolean;
  messageText: string;
}

/**
 * Builds an encoded `https://wa.me/<digits>?text=...` URL only when the official
 * WhatsApp number is valid, privacy is acknowledged, and message content is non-empty.
 */
export function buildWhatsAppEnquiryUrl({
  rawPhone,
  privacyAcknowledged,
  messageText,
}: WhatsAppEnquiryParams): string | null {
  if (!privacyAcknowledged) return null;
  const normalized = normalizeOfficialWhatsAppNumber(rawPhone);
  if (!normalized) return null;
  const cleanText = sanitizeMultilineContactText(
    messageText,
    CONTACT_MESSAGE_MAX_LENGTH + 300,
  );
  if (!cleanText) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(cleanText)}`;
}

export interface EmailEnquiryParams {
  recipientEmail: string | null | undefined;
  privacyAcknowledged: boolean;
  subject: string;
  body: string;
}

/**
 * Builds a safely encoded `mailto:` URL only when the verified company email is valid,
 * privacy is acknowledged, and subject/body are non-empty.
 */
export function buildEmailEnquiryUrl({
  recipientEmail,
  privacyAcknowledged,
  subject,
  body,
}: EmailEnquiryParams): string | null {
  if (!privacyAcknowledged) return null;
  const email = recipientEmail?.trim() ?? "";
  if (!isValidContactEmail(email)) return null;
  const cleanSubject = sanitizeSingleLineContactText(subject, 200);
  const cleanBody = sanitizeMultilineContactText(
    body,
    CONTACT_MESSAGE_MAX_LENGTH + 400,
  );
  if (!cleanSubject || !cleanBody) return null;
  return `mailto:${email}?subject=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(cleanBody)}`;
}
