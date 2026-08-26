import type { SupportedLocale } from "./index";
import { en, type MessageKey } from "./messages/en";
import { ms } from "./messages/ms";
import { zhHans } from "./messages/zh-Hans";
import { zhHant } from "./messages/zh-Hant";
import { hi } from "./messages/hi";

export const messages: Record<SupportedLocale, Record<MessageKey, string>> = {
  en,
  ms,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  hi,
};

export function translate(
  key: MessageKey | string,
  locale: SupportedLocale = "en",
  params?: Record<string, string | number>,
): string {
  const catalogue = messages[locale] ?? messages.en;
  let text = catalogue[key as MessageKey] ?? messages.en[key as MessageKey] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(paramValue));
    }
  }

  return text;
}

export const t = translate;
