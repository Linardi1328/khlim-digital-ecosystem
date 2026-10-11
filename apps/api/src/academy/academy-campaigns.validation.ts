import { BadRequestException } from "@nestjs/common";

export function parseMytDateRange(
  startDate?: string,
  endDate?: string,
): {
  fromUtc: Date | null;
  toUtc: Date | null;
  startDate: string | null;
  endDate: string | null;
} {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (startDate && !dateRegex.test(startDate)) {
    throw new BadRequestException(
      "Invalid startDate format. Expected YYYY-MM-DD",
    );
  }
  if (endDate && !dateRegex.test(endDate)) {
    throw new BadRequestException(
      "Invalid endDate format. Expected YYYY-MM-DD",
    );
  }

  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestException("startDate cannot be after endDate");
  }

  // Malaysia Standard Time is UTC+8 year-round
  const fromUtc = startDate
    ? new Date(`${startDate}T00:00:00.000+08:00`)
    : null;
  const toUtc = endDate ? new Date(`${endDate}T23:59:59.999+08:00`) : null;

  if (fromUtc && Number.isNaN(fromUtc.getTime())) {
    throw new BadRequestException("Invalid startDate calendar date");
  }
  if (toUtc && Number.isNaN(toUtc.getTime())) {
    throw new BadRequestException("Invalid endDate calendar date");
  }

  return {
    fromUtc,
    toUtc,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  };
}
