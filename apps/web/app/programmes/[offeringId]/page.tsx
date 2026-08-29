"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../../../lib/api-service";
import { useI18n } from "../../../lib/i18n-context";
import {
  getPlanChargeMinor,
  type PublicOfferingItem,
} from "../../../lib/types";
import { PublicFooter } from "../../../components/layout/public-footer";
import { PublicHeader } from "../../../components/layout/public-header";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

export default function OfferingDetailPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const { offeringId } = use(params);
  const { t, formatCurrency, formatDate } = useI18n();
  const [offering, setOffering] = useState<PublicOfferingItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getPublicOfferings()
      .then((items) =>
        setOffering(items.find((item) => item.id === offeringId) ?? null),
      )
      .catch(() => setOffering(null))
      .finally(() => setLoading(false));
  }, [offeringId]);

  if (loading)
    return (
      <div>
        <PublicHeader />
        <main style={{ padding: 48, textAlign: "center" }}>
          {t("programmes.loadingOffering")}
        </main>
        <PublicFooter />
      </div>
    );
  if (!offering)
    return (
      <div>
        <PublicHeader />
        <main style={{ padding: 48, textAlign: "center" }}>
          <h1>{t("programmes.unavailable")}</h1>
          <Link href="/programmes">{t("programmes.returnToProgrammes")}</Link>
        </main>
        <PublicFooter />
      </div>
    );

  const plans = offering.planEligibilities.map(({ plan }) => plan);
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
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
        <p>
          <Link href="/programmes">{t("programmes.allProgrammes")}</Link>
        </p>
        <Card>
          <Badge variant="brand">
            {offering.programme.level ?? t("programmes.academyProgramme")}
          </Badge>
          <h1>{offering.name}</h1>
          <p>{offering.programme.description ?? offering.programme.name}</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
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
                    <Link
                      href={`/enrol?offeringId=${encodeURIComponent(offering.id)}&planId=${encodeURIComponent(plan.id)}`}
                    >
                      <Button variant="primary">
                        {t("programmes.selectPlan")}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
