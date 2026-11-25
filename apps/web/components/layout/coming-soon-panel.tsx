"use client";

import React from "react";
import Link from "next/link";
import { buildUrlWithSource } from "../../lib/campaign-source";
import { useI18n } from "../../lib/i18n-context";
import { Badge } from "../ui/badge";
import { getButtonStyles } from "../ui/button";
import { Card } from "../ui/card";

export function ComingSoonPanel({
  feature,
  campaignSource = null,
}: {
  feature: "academyEnrolmentCheckout" | "parentPortal";
  campaignSource?: string | null;
}) {
  const { t } = useI18n();
  const titleKey =
    feature === "academyEnrolmentCheckout"
      ? "feature.comingSoon.enrolTitle"
      : "feature.comingSoon.portalTitle";
  const bodyKey =
    feature === "academyEnrolmentCheckout"
      ? "feature.comingSoon.enrolBody"
      : "feature.comingSoon.portalBody";

  return (
    <main
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        padding: "56px 20px 80px",
        boxSizing: "border-box",
      }}
    >
      <Card
        role="region"
        aria-labelledby="coming-soon-heading"
        style={{
          padding: "40px 28px",
          borderRadius: 20,
          border: "1px solid #e4e4e7",
          background: "#ffffff",
          textAlign: "center",
          boxShadow: "0 12px 32px rgba(24, 24, 27, 0.06)",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Badge variant="warning" size="md">
            {t("feature.status.comingSoon")}
          </Badge>
        </div>
        <h1
          id="coming-soon-heading"
          style={{
            fontSize: "clamp(1.75rem, 3.5vw, 2.4rem)",
            margin: "0 0 14px",
            letterSpacing: "-0.02em",
            color: "#18181b",
          }}
        >
          {t(titleKey)}
        </h1>
        <p
          style={{
            color: "#52525b",
            fontSize: "1rem",
            lineHeight: 1.65,
            maxWidth: 560,
            margin: "0 auto 28px",
          }}
        >
          {t(bodyKey)}
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={buildUrlWithSource("/interest", campaignSource)}
            style={{ ...getButtonStyles("primary", "lg"), minHeight: 44 }}
          >
            {t("nav.registerInterest")}
          </Link>
          <Link
            href={buildUrlWithSource(
              "/academy#training-sessions",
              campaignSource,
            )}
            style={{ ...getButtonStyles("outline", "lg"), minHeight: 44 }}
          >
            {t("academy.trainingSessionsCta")}
          </Link>
          <Link
            href={buildUrlWithSource("/", campaignSource)}
            style={{ ...getButtonStyles("outline", "lg"), minHeight: 44 }}
          >
            {t("nav.home")}
          </Link>
        </div>
      </Card>
    </main>
  );
}
