import { BadRequestException } from "@nestjs/common";

// This runtime allow-list mirrors packages/i18n and is protected by a regression
// invariant until the API can consume the shared package without widening its
// current build boundary.
export const KHLIM_SUPPORTED_LOCALES = [
  "en",
  "ms",
  "zh-Hans",
  "zh-Hant",
  "hi",
] as const;

export type KhlimSupportedLocale = (typeof KHLIM_SUPPORTED_LOCALES)[number];

const supportedLocaleSet = new Set<string>(KHLIM_SUPPORTED_LOCALES);

export function requireSupportedLocale(
  value: unknown,
  field = "preferredLocale",
): KhlimSupportedLocale {
  if (typeof value !== "string" || !supportedLocaleSet.has(value)) {
    throw new BadRequestException(`${field} is not a supported locale`);
  }

  return value as KhlimSupportedLocale;
}
