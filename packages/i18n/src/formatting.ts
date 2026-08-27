import type { SupportedLocale } from "./index";

const localeFormatMap: Record<SupportedLocale, string> = {
  en: "en-MY",
  ms: "ms-MY",
  "zh-Hans": "zh-Hans-MY",
  "zh-Hant": "zh-Hant-HK",
  hi: "hi-IN",
};

export function formatCurrency(
  amountInUnits: number,
  currency: string = "MYR",
  locale: SupportedLocale = "en",
): string {
  const targetLocale = localeFormatMap[locale] ?? "en-MY";
  return new Intl.NumberFormat(targetLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountInUnits);
}

export function formatDate(
  date: Date | string | number,
  locale: SupportedLocale = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  const targetLocale = localeFormatMap[locale] ?? "en-MY";
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
    ...options,
  };
  return new Intl.DateTimeFormat(targetLocale, defaultOptions).format(d);
}

export function formatTime(
  date: Date | string | number,
  locale: SupportedLocale = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  const targetLocale = localeFormatMap[locale] ?? "en-MY";
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kuala_Lumpur",
    ...options,
  };
  return new Intl.DateTimeFormat(targetLocale, defaultOptions).format(d);
}
