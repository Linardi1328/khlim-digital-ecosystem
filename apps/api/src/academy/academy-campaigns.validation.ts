import { BadRequestException } from "@nestjs/common";

const DEFAULT_CAMPAIGN_START = "2026-08-01";
const DEFAULT_CAMPAIGN_END = "2026-10-31";
export const MAX_REPORTING_WINDOW_DAYS = 100;

export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split("-");
  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];
  if (!yearStr || !monthStr || !dayStr) return false;

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const maxDays = daysInMonth[month - 1];
  if (maxDays === undefined) return false;
  return day <= maxDays;
}

export function parseMytDateRange(
  startDate?: string,
  endDate?: string,
): {
  fromUtc: Date;
  toUtc: Date;
  startDate: string;
  endDate: string;
} {
  // 1. Resolve defaults if omitted (bound the previously unbounded range)
  let resolvedStart = startDate?.trim();
  let resolvedEnd = endDate?.trim();

  if (!resolvedStart && !resolvedEnd) {
    resolvedStart = DEFAULT_CAMPAIGN_START;
    resolvedEnd = DEFAULT_CAMPAIGN_END;
  } else if (resolvedStart && !resolvedEnd) {
    if (!isValidCalendarDate(resolvedStart)) {
      throw new BadRequestException(
        `Invalid startDate calendar date: ${resolvedStart}`,
      );
    }
    const startObj = new Date(`${resolvedStart}T00:00:00.000+08:00`);
    const endObj = new Date(startObj.getTime() + 90 * 86400000);
    resolvedEnd = endObj.toISOString().slice(0, 10);
  } else if (!resolvedStart && resolvedEnd) {
    if (!isValidCalendarDate(resolvedEnd)) {
      throw new BadRequestException(
        `Invalid endDate calendar date: ${resolvedEnd}`,
      );
    }
    const endObj = new Date(`${resolvedEnd}T00:00:00.000+08:00`);
    const startObj = new Date(endObj.getTime() - 90 * 86400000);
    resolvedStart = startObj.toISOString().slice(0, 10);
  }

  // 2. Validate calendar date validity
  if (!isValidCalendarDate(resolvedStart!)) {
    throw new BadRequestException(
      `Invalid startDate calendar date: ${resolvedStart}`,
    );
  }
  if (!isValidCalendarDate(resolvedEnd!)) {
    throw new BadRequestException(
      `Invalid endDate calendar date: ${resolvedEnd}`,
    );
  }

  // 3. Order validation
  if (resolvedStart! > resolvedEnd!) {
    throw new BadRequestException("startDate cannot be after endDate");
  }

  // 4. Malaysia Standard Time (UTC+8) conversion:
  // Start is inclusive: YYYY-MM-DDT00:00:00.000+08:00
  // End is exclusive: (YYYY-MM-DD + 1 day)T00:00:00.000+08:00
  const fromUtc = new Date(`${resolvedStart}T00:00:00.000+08:00`);
  const endBase = new Date(`${resolvedEnd}T00:00:00.000+08:00`);
  const toUtc = new Date(endBase.getTime() + 86400000); // Start of next day in MYT

  // 5. Maximum window limit
  const windowDays = Math.round(
    (toUtc.getTime() - fromUtc.getTime()) / 86400000,
  );
  if (windowDays > MAX_REPORTING_WINDOW_DAYS) {
    throw new BadRequestException(
      `Reporting window of ${windowDays} days exceeds maximum limit of ${MAX_REPORTING_WINDOW_DAYS} days.`,
    );
  }

  return {
    fromUtc,
    toUtc,
    startDate: resolvedStart!,
    endDate: resolvedEnd!,
  };
}
