export const SUPPORTED_LOCALES = [
  "en",
  "ms",
  "zh-Hans",
  "zh-Hant",
  "hi",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

const supportedLocaleSet = new Set<string>(SUPPORTED_LOCALES);

const localeAliases: Readonly<Record<string, SupportedLocale>> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  ms: "ms",
  "ms-my": "ms",
  hi: "hi",
  "hi-in": "hi",
  zh: "zh-Hans",
  "zh-cn": "zh-Hans",
  "zh-sg": "zh-Hans",
  "zh-hans": "zh-Hans",
  "zh-tw": "zh-Hant",
  "zh-hk": "zh-Hant",
  "zh-mo": "zh-Hant",
  "zh-hant": "zh-Hant",
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocaleSet.has(value);
}

export function resolveLocale(
  requestedLocale: string | null | undefined,
  fallback: SupportedLocale = DEFAULT_LOCALE,
): SupportedLocale {
  if (!requestedLocale) {
    return fallback;
  }

  const normalized = requestedLocale.trim().replaceAll("_", "-");

  if (isSupportedLocale(normalized)) {
    return normalized;
  }

  return localeAliases[normalized.toLowerCase()] ?? fallback;
}

export function resolvePreferredLocale(
  requestedLocales: readonly string[],
  fallback: SupportedLocale = DEFAULT_LOCALE,
): SupportedLocale {
  for (const locale of requestedLocales) {
    const resolved = resolveLocale(locale, fallback);

    if (resolved !== fallback || locale.toLowerCase().startsWith(fallback)) {
      return resolved;
    }
  }

  return fallback;
}

export * from "./formatting";
export * from "./translator";
export type { MessageKey } from "./messages/en";
