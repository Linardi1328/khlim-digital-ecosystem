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

export function requireInteger(
  value: unknown,
  field: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new BadRequestException(
      `${field} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return value;
}

export function optionalInteger(
  value: unknown,
  field: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireInteger(value, field, minimum, maximum);
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

export function optionalFutureOrPresentIsoDate(
  value: unknown,
  field: string,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
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
  return parsed;
}
