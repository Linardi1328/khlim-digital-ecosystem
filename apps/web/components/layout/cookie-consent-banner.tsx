"use client";

import React from "react";
import Link from "next/link";
import { useAnalyticsConsent } from "../../lib/analytics-consent";
import { useI18n } from "../../lib/i18n-context";
import { Button } from "../ui/button";

export function CookieConsentBanner() {
  const { t } = useI18n();
  const { consent, isDecided, grantConsent, setConsent } =
    useAnalyticsConsent();

  // If already decided (granted or denied) or not yet mounted, do not render banner
  if (isDecided || consent !== null) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label={t("compliance.consent.bannerTitle")}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#18181B",
        color: "#F4F4F5",
        padding: "16px 20px",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.25)",
        borderTop: "1px solid #27272A",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.9375rem",
              color: "#FFFFFF",
              marginBottom: 4,
            }}
          >
            {t("compliance.consent.bannerTitle")}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              color: "#D4D4D8",
            }}
          >
            {t("compliance.consent.bannerBody")}{" "}
            <Link
              href="/cookies"
              style={{
                color: "#F59E0B",
                textDecoration: "underline",
                fontWeight: 600,
              }}
            >
              {t("compliance.consent.cookiePolicyLink")}
            </Link>
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => setConsent("denied")}
            style={{
              minHeight: 44,
              minWidth: 88,
              borderColor: "#52525B",
              color: "#F4F4F5",
              backgroundColor: "transparent",
            }}
          >
            {t("compliance.consent.declineButton")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => grantConsent()}
            style={{
              minHeight: 44,
              minWidth: 140,
            }}
          >
            {t("compliance.consent.acceptButton")}
          </Button>
        </div>
      </div>
    </aside>
  );
}
