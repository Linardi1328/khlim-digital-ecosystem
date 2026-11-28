"use client";

import React, { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiService } from "../../../lib/api-service";
import {
  buildUrlWithSource,
  resolveCampaignSource,
} from "../../../lib/campaign-source";
import { useI18n } from "../../../lib/i18n-context";
import { programmeLevelLabel } from "../../../lib/display-labels";
import { isFeatureAvailable } from "../../../lib/feature-availability";
import {
  getPlanChargeMinor,
  type PublicOfferingItem,
} from "../../../lib/types";
import { PublicFooter } from "../../../components/layout/public-footer";
import { PublicHeader } from "../../../components/layout/public-header";
import { Badge } from "../../../components/ui/badge";
import { Button, getButtonStyles } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

type OfferingDetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "not-found" }
  | { status: "available"; offering: PublicOfferingItem };

function OfferingDetailContent({ offeringId }: { offeringId: string }) {
  const { t, formatCurrency, formatDate } = useI18n();
  const searchParams = useSearchParams();
  const [campaignSource, setCampaignSource] = useState<string | null>(null);

  const [state, setState] = useState<OfferingDetailState>({
    status: "loading",
  });
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    setCampaignSource(resolveCampaignSource(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    apiService
      .getPublicOfferings()
      .then((items) => {
        if (cancelled) return;
        if (items.length === 0) {
          setState({ status: "empty" });
          return;
        }
        const matched = items.find((item) => item.id === offeringId);
        if (!matched) {
          setState({ status: "not-found" });
          return;
        }
        setState({ status: "available", offering: matched });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [offeringId, retryAttempt]);

  const programmesHref = buildUrlWithSource(
    "/academy#programmes",
    campaignSource,
  );
  const generalInterestHref = buildUrlWithSource("/interest", campaignSource);

  if (state.status === "loading")
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <PublicHeader campaignSource={campaignSource} />
        <main
          aria-busy="true"
          style={{ flex: 1, padding: "48px 20px", textAlign: "center" }}
        >
          {t("programmes.loadingOffering")}
        </main>
        <PublicFooter campaignSource={campaignSource} />
      </div>
    );

  if (state.status === "error")
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <PublicHeader campaignSource={campaignSource} />
        <main
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
            padding: "48px 20px",
            boxSizing: "border-box",
          }}
        >
          <Card style={{ padding: 32, textAlign: "center" }}>
            <h1 style={{ margin: "0 0 12px" }}>
              {t("programmes.unavailable")}
            </h1>
            <p role="alert" style={{ margin: "0 0 20px", color: "#52525b" }}>
              {t("programmes.detailLoadError")}
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
                href={generalInterestHref}
                style={{
                  ...getButtonStyles("primary", "sm"),
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                {t("programmes.registerInterest")}
              </Link>
              <Link
                href={programmesHref}
                style={{
                  ...getButtonStyles("outline", "sm"),
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                {t("programmes.returnToProgrammes")}
              </Link>
            </div>
          </Card>
        </main>
        <PublicFooter campaignSource={campaignSource} />
      </div>
    );

  if (state.status === "empty" || state.status === "not-found") {
    const isEmpty = state.status === "empty";
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <PublicHeader campaignSource={campaignSource} />
        <main
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
            padding: "48px 20px",
            boxSizing: "border-box",
          }}
        >
          <Card
            data-testid={
              isEmpty ? "offering-detail-empty" : "offering-detail-not-found"
            }
            style={{ padding: 32, textAlign: "center" }}
          >
            <h1 style={{ margin: "0 0 12px" }}>
              {isEmpty
                ? t("programmes.detailEmptyTitle")
                : t("programmes.detailNotFoundTitle")}
            </h1>
            <p style={{ margin: "0 0 20px", color: "#52525b" }}>
              {isEmpty
                ? t("programmes.detailEmptyBody")
                : t("programmes.detailNotFoundBody")}
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
              <Link
                href={generalInterestHref}
                style={{
                  ...getButtonStyles("primary", "sm"),
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                {t("programmes.registerInterest")}
              </Link>
              <Link
                href={programmesHref}
                style={{
                  ...getButtonStyles("outline", "sm"),
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                {t("programmes.returnToProgrammes")}
              </Link>
            </div>
          </Card>
        </main>
        <PublicFooter campaignSource={campaignSource} />
      </div>
    );
  }

  const { offering } = state;

  const plans = offering.planEligibilities.map(({ plan }) => plan);
  const registerInterestUrl = buildUrlWithSource("/interest", campaignSource, {
    offeringId: offering.id,
  });

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader campaignSource={campaignSource} />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
          padding: "40px 20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Link href={programmesHref}>← {t("programmes.allProgrammes")}</Link>
          <Link href={registerInterestUrl} style={{ textDecoration: "none" }}>
            <Button variant="primary" size="sm">
              {t("programmes.registerInterest")}
            </Button>
          </Link>
        </div>

        <Card>
          <Badge variant="brand">
            {offering.programme.level
              ? programmeLevelLabel(offering.programme.level, t)
              : t("programmes.academyProgramme")}
          </Badge>
          <h1>{offering.name}</h1>
          <p>{offering.programme.description ?? offering.programme.name}</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <small>{t("programmes.venueLabel")}</small>
              <p>
                <strong>
                  {offering.venue?.name ?? t("common.toBeConfirmed")}
                </strong>
              </p>
            </div>
            <div>
              <small>{t("programmes.termLabel")}</small>
              <p>
                <strong>
                  {offering.startsOn
                    ? formatDate(offering.startsOn)
                    : t("programmes.startToBeConfirmed")}
                </strong>
              </p>
            </div>
            <div>
              <small>{t("programmes.capacity")}</small>
              <p>
                <strong>{offering.capacity}</strong>
              </p>
            </div>
          </div>
          <div>
            <Link href={registerInterestUrl} style={{ textDecoration: "none" }}>
              <Button variant="outline" size="md">
                {t("programmes.registerInterest")}
              </Button>
            </Link>
          </div>
        </Card>

        <h2 style={{ marginTop: 32 }}>{t("programmes.eligiblePlans")}</h2>
        {plans.length === 0 ? (
          <Card>{t("programmes.noActivePlans")}</Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            {plans.map((plan) => {
              const charge = getPlanChargeMinor(plan);
              const billingLabel =
                plan.billingFrequency === "UPFRONT"
                  ? t("programmes.oneTimeUpfront")
                  : t("programmes.monthlyInstallments", {
                      count: plan.commitmentCycles ?? plan.durationMonths ?? 1,
                    });
              return (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      <strong>
                        {charge === null
                          ? t("programmes.pricingUnavailable")
                          : formatCurrency(charge / 100, plan.currency)}
                      </strong>{" "}
                      • {billingLabel}
                    </p>
                    {plan.benefitsSummary ? (
                      <p>{plan.benefitsSummary}</p>
                    ) : null}
                    {isFeatureAvailable("academyEnrolmentCheckout") ? (
                      <Link
                        href={buildUrlWithSource("/enrol", campaignSource, {
                          offeringId: offering.id,
                          planId: plan.id,
                        })}
                      >
                        <Button variant="primary">
                          {t("programmes.selectPlan")}
                        </Button>
                      </Link>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div>
                          <Badge variant="warning" size="sm">
                            {t("feature.status.comingSoon")}
                          </Badge>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            color: "#52525b",
                          }}
                        >
                          {t("feature.programmes.checkoutComingSoon")}
                        </p>
                        <Link
                          href={registerInterestUrl}
                          style={{ textDecoration: "none" }}
                        >
                          <Button variant="primary">
                            {t("programmes.registerInterest")}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <PublicFooter campaignSource={campaignSource} />
    </div>
  );
}

export default function OfferingDetailPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const { offeringId } = use(params);

  return (
    <Suspense
      fallback={<div aria-busy="true" style={{ minHeight: "100vh" }} />}
    >
      <OfferingDetailContent offeringId={offeringId} />
    </Suspense>
  );
}
