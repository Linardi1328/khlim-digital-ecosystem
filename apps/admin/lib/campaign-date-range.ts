// Keep demo-only validation aligned with the live API's parseMytDateRange.
// The NestJS validator must not be imported into a client-side bundle.
const DAY_MS = 86_400_000;
const MAX_REPORTING_WINDOW_DAYS = 100;

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [
    31,
    leap ? 29 : 28,
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
  return day <= daysInMonth[month - 1]!;
}

export function parseDemoMytDateRange(startDate?: string, endDate?: string) {
  let start = startDate?.trim();
  let end = endDate?.trim();

  if (!start && !end) {
    start = "2026-08-01";
    end = "2026-10-31";
  } else if (start && !end) {
    if (!isValidCalendarDate(start)) {
      throw new Error(`Invalid startDate calendar date: ${start}`);
    }
    end = new Date(
      new Date(`${start}T00:00:00.000Z`).getTime() + 90 * DAY_MS,
    )
      .toISOString()
      .slice(0, 10);
  } else if (!start && end) {
    if (!isValidCalendarDate(end)) {
      throw new Error(`Invalid endDate calendar date: ${end}`);
    }
    start = new Date(
      new Date(`${end}T00:00:00.000Z`).getTime() - 90 * DAY_MS,
    )
      .toISOString()
      .slice(0, 10);
  }

  if (!isValidCalendarDate(start!)) {
    throw new Error(`Invalid startDate calendar date: ${start}`);
  }
  if (!isValidCalendarDate(end!)) {
    throw new Error(`Invalid endDate calendar date: ${end}`);
  }
  if (start! > end!) {
    throw new Error("startDate cannot be after endDate");
  }

  const fromUtc = new Date(`${start}T00:00:00.000+08:00`);
  const toUtc = new Date(
    new Date(`${end}T00:00:00.000+08:00`).getTime() + DAY_MS,
  );
  const days = Math.round((toUtc.getTime() - fromUtc.getTime()) / DAY_MS);
  if (days > MAX_REPORTING_WINDOW_DAYS) {
    throw new Error(
      `Reporting window of ${days} days exceeds maximum limit of ${MAX_REPORTING_WINDOW_DAYS} days.`,
    );
  }
  return { startDate: start!, endDate: end!, fromUtc, toUtc };
}
