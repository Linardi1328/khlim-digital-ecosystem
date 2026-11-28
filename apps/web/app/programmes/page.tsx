"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiService } from "../../lib/api-service";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../../lib/campaign-source";
import { useI18n } from "../../lib/i18n-context";
import { programmeLevelLabel } from "../../lib/display-labels";
import type { PublicOfferingItem } from "../../lib/types";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button, getButtonStyles } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

function ageLabel(
  offering: PublicOfferingItem,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const minimum = offering.programme.minimumAge;
  const maximum = offering.programme.maximumAge;
  if (minimum !== null && maximum !== null) {
    return t("programmes.ageRange", { minimum, maximum });
  }
  if (minimum !== null) return t("programmes.minimumAge", { minimum });
  if (maximum !== null) return t("programmes.maximumAge", { maximum });
  return t("programmes.ageEligibilityVaries");
}

function ProgrammesContent() {
  const { t, formatDate } = useI18n();
  const searchParams = useSearchParams();
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const [storedCampaign, setStoredCampaign] = useState<string | null>(null);

  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [level, setLevel] = useState("ALL");

  useEffect(() => {
    setStoredCampaign(resolveCampaignSource(searchParams));
  }, [searchParams]);

  const campaignSource = queryCampaign ?? storedCampaign;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    apiService
      .getPublicOfferings()
      .then((items) => {
        if (!cancelled) {
          setOfferings(items);
          setLevel((current) =>
            current === "ALL" ||
            items.some((item) => item.programme.level === current)
              ? current
              : "ALL",
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setOfferings([]);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryAttempt]);

  const levels = useMemo(
    () =>
      Array.from(
        new Set(
          offerings
            .map((item) => item.programme.level)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [offerings],
  );
  const visible =
    level === "ALL"
      ? offerings
      : offerings.filter((item) => item.programme.level === level);

  const registerInterestGeneralUrl = buildUrlWithSource(
    "/interest",
    campaignSource,
  );
  const academyUrl = buildUrlWithSource("/academy", campaignSource);
  const contactUrl = buildUrlWithSource("/contact", campaignSource);

  const pathwayStages = useMemo(
    () => [
      {
        id: "u9",
        badge: t("academy.pathway.u9.badge"),
        title: t("academy.pathway.u9.title"),
        body: t("academy.pathway.u9.body"),
      },
      {
        id: "u12",
        badge: t("academy.pathway.u12.badge"),
        title: t("academy.pathway.u12.title"),
        body: t("academy.pathway.u12.body"),
      },
      {
        id: "u15",
        badge: t("academy.pathway.u15.badge"),
        title: t("academy.pathway.u15.title"),
        body: t("academy.pathway.u15.body"),
      },
    ],
    [t],
  );

  const academyPillars = useMemo(
    () => [
      {
        id: "development",
        title: t("academy.playerDevelopment.title"),
        body: t("academy.playerDevelopment.body"),
      },
      {
        id: "standards",
        title: t("academy.teamStandards.title"),
        body: t("academy.teamStandards.body"),
      },
      {
        id: "visibility",
        title: t("academy.familyVisibility.title"),
        body: t("academy.familyVisibility.body"),
      },
    ],
    [t],
  );

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader campaignSource={campaignSource} />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Badge variant="brand">{t("programmes.catalogue")}</Badge>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 2.85rem)",
              fontWeight: 900,
              color: "#18181B",
              margin: "12px 0 10px",
              letterSpacing: "-0.03em",
            }}
          >
            {t("programmes.title")}
          </h1>
          <p
            style={{
              color: "#71717a",
              maxWidth: 680,
              margin: "0 auto",
              fontSize: "1.02rem",
              lineHeight: 1.6,
            }}
          >
            {t("programmes.subtitle")}
          </p>
          <div style={{ marginTop: 18 }}>
            <Link
              href={registerInterestGeneralUrl}
              style={{
                ...getButtonStyles("primary", "md"),
                minHeight: 44,
              }}
            >
              {t("programmes.registerInterest")}
            </Link>
          </div>
        </div>

        {/* Live Authoritative API Programme Catalogue */}
        <section
          aria-label={t("programmes.catalogue")}
          data-testid="programmes-live-catalogue"
        >
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            data-testid="programmes-live-status"
          >
            {loading
              ? t("programmes.loadingCurrent")
              : loadError
                ? t("programmes.catalogueLoadError")
                : visible.length === 0
                  ? t("programmes.noMatching")
                  : ""}
          </div>
          {levels.length > 1 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 28,
              }}
            >
              <Button
                variant={level === "ALL" ? "primary" : "outline"}
                size="sm"
                onClick={() => setLevel("ALL")}
                style={{ minHeight: 40 }}
              >
                {t("programmes.allLevels")}
              </Button>
              {levels.map((item) => (
                <Button
                  key={item}
                  variant={level === item ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setLevel(item)}
                  style={{ minHeight: 40 }}
                >
                  {programmeLevelLabel(item, t)}
                </Button>
              ))}
            </div>
          ) : null}

          {loading ? (
            <Card
              style={{ padding: 32, textAlign: "center" }}
              data-testid="programmes-state-loading"
            >
              <p role="status" style={{ margin: 0, color: "#52525B" }}>
                {t("programmes.loadingCurrent")}
              </p>
            </Card>
          ) : loadError ? (
            <Card
              style={{ padding: 32, textAlign: "center" }}
              data-testid="programmes-state-unavailable"
            >
              <p
                role="alert"
                style={{
                  margin: "0 0 10px",
                  fontWeight: 700,
                  color: "#18181B",
                }}
              >
                {t("programmes.catalogueLoadError")}
              </p>
              <p
                style={{
                  margin: "0 auto 20px",
                  maxWidth: 620,
                  color: "#52525B",
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("programmes.outageHelperNote")}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetryAttempt((attempt) => attempt + 1)}
                  style={{ minHeight: 44, minWidth: 44 }}
                >
                  {t("common.retry")}
                </Button>
                <Link
                  href={registerInterestGeneralUrl}
                  data-testid="programmes-outage-interest-cta"
                  style={{
                    ...getButtonStyles("primary", "sm"),
                    minHeight: 44,
                    minWidth: 44,
                  }}
                >
                  {t("programmes.registerInterest")}
                </Link>
              </div>
            </Card>
          ) : visible.length === 0 ? (
            <Card
              style={{ padding: 32, textAlign: "center" }}
              data-testid="programmes-state-empty"
            >
              <p
                style={{
                  margin: "0 0 10px",
                  fontWeight: 600,
                  color: "#18181B",
                }}
              >
                {t("programmes.noMatching")}
              </p>
              <p
                style={{
                  margin: "0 auto 20px",
                  maxWidth: 560,
                  color: "#52525B",
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("programmes.emptyHelperNote")}
              </p>
              <Link
                href={registerInterestGeneralUrl}
                style={{
                  ...getButtonStyles("primary", "sm"),
                  minHeight: 44,
                }}
              >
                {t("programmes.registerInterest")}
              </Link>
            </Card>
          ) : (
            <div
              className="khlim-programmes-catalogue"
              data-testid="programmes-state-available"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {visible.map((offering) => (
                <Card key={offering.id} className="khlim-offering-card">
                  <CardHeader>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                        marginBottom: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <Badge variant="brand" size="sm">
                        {ageLabel(offering, t)}
                      </Badge>
                      {offering.programme.level ? (
                        <Badge variant="neutral" size="sm">
                          {programmeLevelLabel(offering.programme.level, t)}
                        </Badge>
                      ) : null}
                    </div>
                    <CardTitle>{offering.name}</CardTitle>
                    <CardDescription>
                      {offering.programme.description ??
                        offering.programme.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      {t("programmes.levelLabel")}:{" "}
                      {programmeLevelLabel(offering.programme.level, t)}
                    </p>
                    <p>
                      {t("programmes.venueLabel")}:{" "}
                      {offering.venue?.name ?? t("common.toBeConfirmed")}
                    </p>
                    <p>
                      {t("programmes.termStartLabel")}:{" "}
                      {offering.startsOn
                        ? formatDate(offering.startsOn)
                        : t("common.toBeConfirmed")}
                    </p>
                    <Badge variant="neutral" size="sm">
                      {t("programmes.capacity")} {offering.capacity}
                    </Badge>
                  </CardContent>
                  <CardFooter
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <Link
                      href={buildUrlWithSource(
                        `/programmes/${offering.id}`,
                        campaignSource,
                      )}
                      style={{
                        ...getButtonStyles("outline", "md"),
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {t("programmes.viewDetails")}
                    </Link>
                    <Link
                      href={buildUrlWithSource("/interest", campaignSource, {
                        offeringId: offering.id,
                      })}
                      style={{
                        ...getButtonStyles("primary", "md"),
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {t("programmes.registerInterest")}
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Separate Informational Academy Development Pathway (Approved Existing Academy Copy Only) */}
        <section
          id="development-pathway"
          className="programmes-pathway-section"
          data-testid="programmes-pathway-overview"
          aria-labelledby="programmes-pathway-title"
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <Badge variant="neutral" size="sm">
                {t("programmes.pathway.eyebrow")}
              </Badge>
              <Badge variant="brand" size="sm">
                {t("academy.pathway.badge")}
              </Badge>
            </div>
            <h2
              id="programmes-pathway-title"
              style={{
                fontSize: "clamp(1.65rem, 3vw, 2.3rem)",
                fontWeight: 800,
                color: "#18181B",
                margin: "0 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              {t("academy.pathway.title")}
            </h2>
            <p
              style={{
                color: "#52525B",
                maxWidth: 660,
                margin: "0 auto",
                fontSize: "0.96rem",
                lineHeight: 1.6,
              }}
            >
              {t("academy.pathway.subtitle")}
            </p>
          </div>

          <div style={{ maxWidth: 860, margin: "0 auto 24px" }}>
            <Alert variant="info">{t("programmes.pathway.disclaimer")}</Alert>
          </div>

          <div className="programmes-pathway-grid">
            {pathwayStages.map((stage) => (
              <Card key={stage.id} style={{ padding: 24 }}>
                <Badge variant="brand" size="sm" style={{ marginBottom: 12 }}>
                  {stage.badge}
                </Badge>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: "#18181B",
                  }}
                >
                  {stage.title}
                </h3>
                <p
                  style={{
                    color: "#52525B",
                    margin: 0,
                    fontSize: "0.92rem",
                    lineHeight: 1.6,
                  }}
                >
                  {stage.body}
                </p>
              </Card>
            ))}
          </div>

          <div className="programmes-pathway-grid" style={{ marginTop: 20 }}>
            {academyPillars.map((pillar) => (
              <Card
                key={pillar.id}
                style={{ padding: 22, backgroundColor: "#FAFAFA" }}
              >
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: "#18181B",
                  }}
                >
                  {pillar.title}
                </h3>
                <p
                  style={{
                    color: "#52525B",
                    margin: 0,
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                  }}
                >
                  {pillar.body}
                </p>
              </Card>
            ))}
          </div>

          <div className="programmes-pathway-actions">
            <Link
              href={registerInterestGeneralUrl}
              style={{
                ...getButtonStyles("primary", "md"),
                minHeight: 44,
              }}
            >
              {t("programmes.registerInterest")}
            </Link>
            <Link
              href={academyUrl}
              style={{
                ...getButtonStyles("outline", "md"),
                minHeight: 44,
              }}
            >
              {t("programmes.pathway.learnMoreAcademy")}
            </Link>
            <Link
              href={contactUrl}
              style={{
                ...getButtonStyles("outline", "md"),
                minHeight: 44,
              }}
            >
              {t("programmes.pathway.contactUs")}
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter campaignSource={campaignSource} />
    </div>
  );
}

export default function ProgrammesPage() {
  return (
    <Suspense
      fallback={<div aria-busy="true" style={{ minHeight: "100vh" }} />}
    >
      <ProgrammesContent />
    </Suspense>
  );
}
