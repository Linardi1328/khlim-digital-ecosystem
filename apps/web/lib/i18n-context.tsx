"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  type SupportedLocale,
  DEFAULT_LOCALE,
  resolveLocale,
  translate,
  type MessageKey,
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatTime as baseFormatTime,
} from "@khlim/i18n";

export const PUBLIC_LOCALES: readonly SupportedLocale[] = [
  "en",
  "ms",
  "zh-Hans",
];

export function isPublicLocale(
  loc: string,
): loc is (typeof PUBLIC_LOCALES)[number] {
  return (PUBLIC_LOCALES as readonly string[]).includes(loc);
}

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (
    key: MessageKey | string,
    params?: Record<string, string | number>,
  ) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatTime: (
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  supportedLocales: readonly SupportedLocale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const initial = isPublicLocale(initialLocale)
    ? initialLocale
    : DEFAULT_LOCALE;
  const [locale, setLocaleState] = useState<SupportedLocale>(initial);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("khlim_locale")
        : null;
    if (saved) {
      const resolved = resolveLocale(saved);
      const effective = isPublicLocale(resolved) ? resolved : DEFAULT_LOCALE;
      setLocaleState(effective);
      document.documentElement.lang = effective;
      if (effective !== saved) {
        localStorage.setItem("khlim_locale", effective);
        document.cookie = `khlim_locale=${encodeURIComponent(effective)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }
    }
  }, []);

  const setLocale = (requestedLocale: SupportedLocale) => {
    const newLocale = isPublicLocale(requestedLocale)
      ? requestedLocale
      : DEFAULT_LOCALE;
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("khlim_locale", newLocale);
      document.documentElement.lang = newLocale;
      document.cookie = `khlim_locale=${encodeURIComponent(newLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  };

  const t = (
    key: MessageKey | string,
    params?: Record<string, string | number>,
  ) => {
    return translate(key, locale, params);
  };

  const formatCurrency = (amount: number, currency = "MYR") => {
    return baseFormatCurrency(amount, currency, locale);
  };

  const formatDate = (
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => {
    return baseFormatDate(date, locale, options);
  };

  const formatTime = (
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => {
    return baseFormatTime(date, locale, options);
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        formatCurrency,
        formatDate,
        formatTime,
        supportedLocales: PUBLIC_LOCALES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key, params) => translate(key, DEFAULT_LOCALE, params),
      formatCurrency: (amount, currency = "MYR") =>
        baseFormatCurrency(amount, currency, DEFAULT_LOCALE),
      formatDate: (d, opt) => baseFormatDate(d, DEFAULT_LOCALE, opt),
      formatTime: (d, opt) => baseFormatTime(d, DEFAULT_LOCALE, opt),
      supportedLocales: PUBLIC_LOCALES,
    };
  }
  return ctx;
}

export const useTranslation = useI18n;
