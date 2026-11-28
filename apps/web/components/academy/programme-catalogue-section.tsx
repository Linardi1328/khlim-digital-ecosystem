"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiService } from "../../lib/api-service";
import { buildUrlWithSource } from "../../lib/campaign-source";
import { programmeLevelLabel } from "../../lib/display-labels";
import { useI18n } from "../../lib/i18n-context";
import type { PublicOfferingItem } from "../../lib/types";
import { Badge } from "../ui/badge";
import { Button, getButtonStyles } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

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

export function ProgrammeCatalogueSection({
  campaignSource,
}: {
  campaignSource: string | null;
}) {
  const { t, formatDate } = useI18n();
  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [level, setLevel] = useState("ALL");

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

  return (
    <section
      id="programmes"
      aria-labelledby="academy-programmes-title"
      data-testid="programmes-live-catalogue"
      style={{ marginBottom: 52, scrollMarginTop: 96 }}
    >
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Badge variant="brand">{t("programmes.catalogue")}</Badge>
        <h2
          id="academy-programmes-title"
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
            fontWeight: 800,
            color: "#18181B",
            margin: "12px 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          {t("programmes.title")}
        </h2>
        <p
          style={{
            color: "#52525B",
            maxWidth: 680,
            margin: "0 auto",
            fontSize: "0.96rem",
            lineHeight: 1.6,
          }}
        >
          {t("programmes.subtitle")}
        </p>
      </div>

      {levels.length > 1 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 24,
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

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="programmes-live-status"
      >
        {loading ? (
          <Card
            style={{ padding: 32, textAlign: "center" }}
            data-testid="programmes-state-loading"
          >
            <p style={{ margin: 0, color: "#52525B" }}>
              {t("programmes.loadingCurrent")}
            </p>
          </Card>
        ) : !loadError && visible.length === 0 ? (
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
        ) : !loadError && visible.length > 0 ? (
          <span className="sr-only">
            {t("programmes.showingCount", { count: visible.length })}
          </span>
        ) : null}
      </div>

      {!loading && loadError ? (
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
      ) : !loading && visible.length > 0 ? (
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
                  {offering.programme.description ?? offering.programme.name}
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
      ) : null}
    </section>
  );
}
