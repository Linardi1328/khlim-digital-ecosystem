"use client";

import React from "react";
import { useI18n } from "../../lib/i18n-context";
import type { SupportedLocale } from "@khlim/i18n";

const localeLabels: Record<SupportedLocale, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  hi: "हिन्दी",
};

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2352525B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function LocaleSwitcher() {
  const { locale, setLocale, supportedLocales, t } = useI18n();

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span style={{ fontSize: "0.875rem", color: "#71717A" }}>🌐</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as SupportedLocale)}
        aria-label={t("layout.selectLanguage")}
        style={{
          minHeight: "44px",
          padding: "6px 38px 6px 10px",
          fontSize: "0.8125rem",
          fontWeight: 600,
          borderRadius: "6px",
          border: "1px solid #E4E4E7",
          backgroundColor: "#FFFFFF",
          backgroundImage: chevron,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          backgroundSize: "14px 14px",
          WebkitAppearance: "none",
          appearance: "none",
          color: "#18181B",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {supportedLocales.map((loc) => (
          <option key={loc} value={loc}>
            {localeLabels[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
