"use client";

import React from "react";
import { useAnalyticsConsent } from "../../lib/analytics-consent";
import { useI18n } from "../../lib/i18n-context";
import { Button } from "../ui/button";

export function AnalyticsPreferencesControl() {
  const { t } = useI18n();
  const {
    consent,
    hasConsent,
    isDecided,
    grantConsent,
    withdrawConsent,
    setConsent,
  } = useAnalyticsConsent();

  const getStatusText = () => {
    if (hasConsent) return t("compliance.consent.grantedStatus");
    if (consent === "denied") return t("compliance.consent.withdrawnStatus");
    return t("compliance.consent.pendingStatus");
  };

  const getBadgeStyle = (): React.CSSProperties => {
    if (hasConsent) {
      return {
        backgroundColor: "#ECFDF5",
        color: "#065F46",
        border: "1px solid #A7F3D0",
      };
    }
    return {
      backgroundColor: "#FEF2F2",
      color: "#991B1B",
      border: "1px solid #FECACA",
    };
  };

  return (
    <div
      style={{
        border: "1px solid #E4E4E7",
        borderRadius: "8px",
        padding: "16px",
        margin: "16px 0",
        backgroundColor: "#FAFAFA",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <strong
            style={{ display: "block", marginBottom: 4, color: "#18181B" }}
          >
            {t("compliance.consent.statusTitle")}
          </strong>
          <span
            style={{
              display: "inline-block",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              ...getBadgeStyle(),
            }}
          >
            {getStatusText()}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {hasConsent ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => withdrawConsent()}
              style={{ minHeight: 44 }}
            >
              {t("compliance.consent.withdrawButton")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => grantConsent()}
                style={{ minHeight: 44 }}
              >
                {t("compliance.consent.grantButton")}
              </Button>
              {!isDecided && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConsent("denied")}
                  style={{ minHeight: 44 }}
                >
                  {t("compliance.consent.declineButton")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
