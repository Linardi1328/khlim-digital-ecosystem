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
  SUPPORTED_LOCALES,
  resolveLocale,
  translate,
  type MessageKey,
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatTime as baseFormatTime,
} from "@khlim/i18n";

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
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("khlim_locale")
        : null;
    if (saved) {
      setLocaleState(resolveLocale(saved));
    }
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("khlim_locale", newLocale);
      document.documentElement.lang = newLocale;
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
        supportedLocales: SUPPORTED_LOCALES,
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
      supportedLocales: SUPPORTED_LOCALES,
    };
  }
  return ctx;
}

export const useTranslation = useI18n;
