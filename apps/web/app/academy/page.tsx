"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../../lib/campaign-source";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Badge } from "../../components/ui/badge";
import { getButtonStyles } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useI18n } from "../../lib/i18n-context";

function AcademyContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const [storedCampaign, setStoredCampaign] = useState<string | null>(null);

  useEffect(() => {
    setStoredCampaign(resolveCampaignSource(searchParams));
  }, [searchParams]);

  const campaignSource = queryCampaign ?? storedCampaign;

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader campaignSource={campaignSource} />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "48px 20px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* Above-the-fold Hero / Introduction */}
        <section style={{ textAlign: "center", marginBottom: 52 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <Badge variant="brand">{t("academy.badge")}</Badge>
            <Badge variant="neutral">{t("academy.pathway.badge")}</Badge>
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              margin: "0 0 16px",
              letterSpacing: "-0.03em",
            }}
          >
            {t("academy.title")}
          </h1>
          <p
            style={{
              color: "#71717a",
              maxWidth: 680,
              margin: "0 auto 28px",
              fontSize: "1.05rem",
              lineHeight: 1.6,
            }}
          >
            {t("academy.intro")}
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={buildUrlWithSource("/interest", campaignSource)}
              style={getButtonStyles("primary", "lg")}
            >
              {t("nav.registerInterest")}
            </Link>
            <Link
              href={buildUrlWithSource("/programmes", campaignSource)}
              style={getButtonStyles("outline", "lg")}
            >
              {t("academy.programmesCta")}
            </Link>
          </div>
        </section>

        {/* U9 / U12 / U15 Development Pathway */}
        <section style={{ marginBottom: 52 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span
              style={{
                color: "#d97706",
                fontSize: "0.8rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {t("academy.pathway.badge")}
            </span>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
                margin: "8px 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              {t("academy.pathway.title")}
            </h2>
            <p
              style={{
                color: "#71717a",
                maxWidth: 640,
                margin: "0 auto",
                fontSize: "0.95rem",
              }}
            >
              {t("academy.pathway.subtitle")}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            <Card style={{ padding: 24 }}>
              <Badge variant="brand" size="sm" style={{ marginBottom: 12 }}>
                {t("academy.pathway.u9.badge")}
              </Badge>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>
                {t("academy.pathway.u9.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.pathway.u9.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <Badge variant="brand" size="sm" style={{ marginBottom: 12 }}>
                {t("academy.pathway.u12.badge")}
              </Badge>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>
                {t("academy.pathway.u12.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.pathway.u12.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <Badge variant="brand" size="sm" style={{ marginBottom: 12 }}>
                {t("academy.pathway.u15.badge")}
              </Badge>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>
                {t("academy.pathway.u15.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.pathway.u15.body")}
              </p>
            </Card>
          </div>
        </section>

        {/* Existing Truthful Trust Signals */}
        <section style={{ marginBottom: 52 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
                {t("academy.playerDevelopment.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.playerDevelopment.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
                {t("academy.teamStandards.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.teamStandards.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
                {t("academy.familyVisibility.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.familyVisibility.body")}
              </p>
            </Card>
          </div>

          <Card style={{ marginTop: 24, padding: 28 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
              {t("academy.coaching.title")}
            </h3>
            <p
              style={{
                color: "#71717a",
                margin: "0 0 20px",
                fontSize: "0.92rem",
                lineHeight: 1.6,
              }}
            >
              {t("academy.coaching.body")}
            </p>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
              {t("academy.venues.title")}
            </h3>
            <p
              style={{
                color: "#71717a",
                margin: "0 0 20px",
                fontSize: "0.92rem",
                lineHeight: 1.6,
              }}
            >
              {t("academy.venues.body")}
            </p>
            <Link
              href={buildUrlWithSource("/programmes", campaignSource)}
              style={getButtonStyles("outline", "md")}
            >
              {t("academy.programmesCta")}
            </Link>
          </Card>
        </section>

        {/* What happens next */}
        <section style={{ marginBottom: 52 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
                margin: "0 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              {t("academy.nextSteps.title")}
            </h2>
            <p
              style={{
                color: "#71717a",
                maxWidth: 640,
                margin: "0 auto",
                fontSize: "0.95rem",
              }}
            >
              {t("academy.nextSteps.subtitle")}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            <Card style={{ padding: 24 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#fffbeb",
                  color: "#b45309",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  marginBottom: 12,
                }}
              >
                1
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>
                {t("academy.nextSteps.step1.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.nextSteps.step1.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#fffbeb",
                  color: "#b45309",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  marginBottom: 12,
                }}
              >
                2
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>
                {t("academy.nextSteps.step2.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.nextSteps.step2.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#fffbeb",
                  color: "#b45309",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  marginBottom: 12,
                }}
              >
                3
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>
                {t("academy.nextSteps.step3.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.nextSteps.step3.body")}
              </p>
            </Card>
          </div>
        </section>

        {/* Final Register Interest CTA */}
        <section
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: "#f4f4f5",
            borderRadius: 20,
            border: "1px solid #e4e4e7",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            {t("academy.finalCta.title")}
          </h2>
          <p
            style={{
              color: "#71717a",
              maxWidth: 560,
              margin: "0 auto 24px",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
          >
            {t("academy.finalCta.body")}
          </p>
          <Link
            href={buildUrlWithSource("/interest", campaignSource)}
            style={getButtonStyles("primary", "lg")}
          >
            {t("nav.registerInterest")}
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function AcademyPage() {
  return (
    <Suspense
      fallback={<div aria-busy="true" style={{ minHeight: "100vh" }} />}
    >
      <AcademyContent />
    </Suspense>
  );
}
