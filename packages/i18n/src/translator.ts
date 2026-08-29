import type { SupportedLocale } from "./index";
import { en, type MessageKey } from "./messages/en";
import { ms } from "./messages/ms";
import { zhHans } from "./messages/zh-Hans";
import { zhHant } from "./messages/zh-Hant";
import { hi } from "./messages/hi";
import { webMessages } from "./messages/web";
import { authWebMessages } from "./messages/auth-web";
import { publicPageMessages } from "./messages/public-pages";
import { enrolWebMessages } from "./messages/enrol-web";
import { portalWebMessages } from "./messages/portal-web";
import { academyWebMessages } from "./messages/academy-web";
import { legalWebMessages } from "./messages/legal-web";
import { spotlightWebMessages } from "./messages/spotlight-web";

export const messages: Record<SupportedLocale, Record<string, string>> = {
  en: {
    ...en,
    ...webMessages.en,
    ...authWebMessages.en,
    ...publicPageMessages.en,
    ...enrolWebMessages.en,
    ...portalWebMessages.en,
    ...academyWebMessages.en,
    ...legalWebMessages.en,
    ...spotlightWebMessages.en,
  },
  ms: {
    ...ms,
    ...webMessages.ms,
    ...authWebMessages.ms,
    ...publicPageMessages.ms,
    ...enrolWebMessages.ms,
    ...portalWebMessages.ms,
    ...academyWebMessages.ms,
    ...legalWebMessages.ms,
    ...spotlightWebMessages.ms,
  },
  "zh-Hans": {
    ...zhHans,
    ...webMessages["zh-Hans"],
    ...authWebMessages["zh-Hans"],
    ...publicPageMessages["zh-Hans"],
    ...enrolWebMessages["zh-Hans"],
    ...portalWebMessages["zh-Hans"],
    ...academyWebMessages["zh-Hans"],
    ...legalWebMessages["zh-Hans"],
    ...spotlightWebMessages["zh-Hans"],
  },
  "zh-Hant": {
    ...zhHant,
    ...webMessages["zh-Hant"],
    ...authWebMessages["zh-Hant"],
    ...publicPageMessages["zh-Hant"],
    ...enrolWebMessages["zh-Hant"],
    ...portalWebMessages["zh-Hant"],
    ...academyWebMessages["zh-Hant"],
    ...legalWebMessages["zh-Hant"],
    ...spotlightWebMessages["zh-Hant"],
  },
  hi: {
    ...hi,
    ...webMessages.hi,
    ...authWebMessages.hi,
    ...publicPageMessages.hi,
    ...enrolWebMessages.hi,
    ...portalWebMessages.hi,
    ...academyWebMessages.hi,
    ...legalWebMessages.hi,
    ...spotlightWebMessages.hi,
  },
};

export function translate(
  key: MessageKey | string,
  locale: SupportedLocale = "en",
  params?: Record<string, string | number>,
): string {
  const catalogue = messages[locale] ?? messages.en;
  let text = catalogue[key] ?? messages.en[key] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(paramValue));
    }
  }

  return text;
}

export const t = translate;
