import { BadRequestException } from "@nestjs/common";

export function requireTrimmedString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new BadRequestException(`${field} must be a string`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`${field} is required`);
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException(`${field} is too long`);
  }

  return normalized;
}

export function optionalTrimmedString(
  value: unknown,
  field: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return requireTrimmedString(value, field, maxLength);
}

export function requireIsoDate(value: unknown, field: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${field} must use YYYY-MM-DD`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${field} is not a valid calendar date`);
  }

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  if (parsed.getTime() > todayUtc) {
    throw new BadRequestException(`${field} cannot be in the future`);
  }

  return parsed;
}
