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
  const { formatCurrency } = useI18n();
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
          Loading offering…
        </main>
        <PublicFooter />
      </div>
    );
  if (!offering)
    return (
      <div>
        <PublicHeader />
        <main style={{ padding: 48, textAlign: "center" }}>
          <h1>Offering unavailable</h1>
          <Link href="/programmes">Return to programmes</Link>
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
          <Link href="/programmes">← All programmes</Link>
        </p>
        <Card>
          <Badge variant="brand">
            {offering.programme.level ?? "Academy programme"}
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
              <small>Venue</small>
              <p>
                <strong>{offering.venue?.name ?? "To be confirmed"}</strong>
              </p>
            </div>
            <div>
              <small>Term</small>
              <p>
                <strong>{offering.startsOn ?? "Start to be confirmed"}</strong>
              </p>
            </div>
            <div>
              <small>Capacity</small>
              <p>
                <strong>{offering.capacity}</strong>
              </p>
            </div>
          </div>
        </Card>
        <h2 style={{ marginTop: 32 }}>Eligible membership plans</h2>
        {plans.length === 0 ? (
          <Card>No active plans are linked to this offering.</Card>
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
              return (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      <strong>
                        {charge === null
                          ? "Pricing unavailable"
                          : formatCurrency(charge / 100, plan.currency)}
                      </strong>{" "}
                      •{" "}
                      {plan.billingFrequency === "UPFRONT"
                        ? "one-time upfront"
                        : `${plan.commitmentCycles ?? plan.durationMonths ?? 1} monthly installment(s)`}
                    </p>
                    {plan.benefitsSummary ? (
                      <p>{plan.benefitsSummary}</p>
                    ) : null}
                    <Link
                      href={`/enrol?offeringId=${encodeURIComponent(offering.id)}&planId=${encodeURIComponent(plan.id)}`}
                    >
                      <Button variant="primary">Select plan</Button>
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
