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

export function LocaleSwitcher() {
  const { locale, setLocale, supportedLocales } = useI18n();

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span style={{ fontSize: "0.875rem", color: "#71717A" }}>🌐</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as SupportedLocale)}
        aria-label="Select Language"
        style={{
          padding: "6px 10px",
          fontSize: "0.8125rem",
          fontWeight: 600,
          borderRadius: "6px",
          border: "1px solid #E4E4E7",
          backgroundColor: "#FFFFFF",
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
