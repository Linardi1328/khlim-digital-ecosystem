import { BadRequestException } from "@nestjs/common";
import {
  ACADEMY_LEAD_STATUSES,
  type AcademyLeadStatus,
} from "./academy-leads.dto";

export const CONSENT_VERSION = "2026-10-v1";

/**
 * Normalizes a Malaysian or international phone number into E.164 format.
 * Accepts:
 *  - Malaysian local: "0123456789", "012-345 6789", "011-12345678" -> "+60123456789"
 *  - Malaysian with country prefix: "60123456789", "+60 12-345 6789" -> "+60123456789"
 *  - International with country code: "+65 9123 4567", "+1 415 555 2671" -> "+6591234567"
 */
export function normalizePhoneNumber(value: unknown): string {
  if (typeof value !== "string") {
    throw new BadRequestException("Phone number must be a string");
  }

  const cleaned = value.trim().replace(/[\s\-\(\)\.]/g, "");

  if (!cleaned) {
    throw new BadRequestException("Phone number is required");
  }

  // Malaysian local format starting with 01
  if (/^01\d{8,9}$/.test(cleaned)) {
    return `+6${cleaned}`;
  }

  // Malaysian format starting with 601
  if (/^601\d{8,9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Malaysian format with explicit +601
  if (/^\+601\d{8,9}$/.test(cleaned)) {
    return cleaned;
  }

  // General international format: starts with +, followed by 8 to 15 digits
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return cleaned;
  }

  throw new BadRequestException(
    "Please provide a valid Malaysian (e.g. 012-3456789 or +60123456789) or international phone number with country code (+<country><number>)",
  );
}

/**
 * Sanitizes campaign source token. Allows alphanumeric characters, hyphens, and underscores up to 64 chars.
 */
export function sanitizeCampaignSource(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BadRequestException("source must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 64) {
    throw new BadRequestException("source token cannot exceed 64 characters");
  }

  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    throw new BadRequestException(
      "source token may only contain alphanumeric characters, hyphens, and underscores",
    );
  }

  return trimmed;
}

/**
 * Validates and normalizes optional email address.
 */
export function validateEmail(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BadRequestException("email must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 254) {
    throw new BadRequestException("email cannot exceed 254 characters");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new BadRequestException("Please provide a valid email address");
  }

  return trimmed.toLowerCase();
}

/**
 * Validates child age as integer between 3 and 18 years inclusive.
 */
export function validateChildAge(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 3 ||
    value > 18
  ) {
    throw new BadRequestException(
      "Child's age must be an integer between 3 and 18 years",
    );
  }

  return value;
}

/**
 * Validates guardian name: non-empty string up to 120 chars.
 */
export function validateGuardianName(value: unknown): string {
  if (typeof value !== "string") {
    throw new BadRequestException("Guardian name must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new BadRequestException("Guardian name is required");
  }

  if (trimmed.length > 120) {
    throw new BadRequestException("Guardian name cannot exceed 120 characters");
  }

  return trimmed;
}

/**
 * Validates explicit unchecked consent. Must be literal true.
 */
export function validateConsent(value: unknown): boolean {
  if (value !== true) {
    throw new BadRequestException(
      "Explicit privacy and follow-up consent is required",
    );
  }
  return true;
}

/**
 * Validates optional idempotency key.
 */
export function sanitizeIdempotencyKey(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BadRequestException("idempotencyKey must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 128) {
    throw new BadRequestException(
      "idempotencyKey cannot exceed 128 characters",
    );
  }

  return trimmed;
}

/**
 * Validates optional operational notes up to 2000 chars.
 */
export function validateNotes(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BadRequestException("notes must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 2000) {
    throw new BadRequestException("notes cannot exceed 2000 characters");
  }

  return trimmed;
}

/**
 * Validates lead status enum.
 */
export function validateLeadStatus(value: unknown): AcademyLeadStatus {
  if (
    typeof value !== "string" ||
    !ACADEMY_LEAD_STATUSES.includes(value as AcademyLeadStatus)
  ) {
    throw new BadRequestException(
      `status must be one of: ${ACADEMY_LEAD_STATUSES.join(", ")}`,
    );
  }
  return value as AcademyLeadStatus;
}
