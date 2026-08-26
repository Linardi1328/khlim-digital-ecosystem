"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { PublicHeader } from "../../../components/layout/public-header";
import { PublicFooter } from "../../../components/layout/public-footer";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { apiService } from "../../../lib/api-service";
import type { PublicOfferingItem } from "../../../lib/types";

export default function OfferingDetailPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const { offeringId } = use(params);
  const { t, formatCurrency } = useI18n();

  const [offering, setOffering] = useState<PublicOfferingItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiService
      .getPublicOfferings()
      .then((offerings) => {
        const match = offerings.find((o) => o.id === offeringId) || offerings[0] || null;
        setOffering(match);
      })
      .catch((err) => console.warn("Failed to load offering details:", err))
      .finally(() => setLoading(false));
  }, [offeringId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicHeader />
        <main style={{ flex: 1, maxWidth: "1000px", margin: "0 auto", padding: "60px 20px", textAlign: "center", color: "#71717A" }}>
          Loading offering details from server...
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!offering) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicHeader />
        <main style={{ flex: 1, maxWidth: "1000px", margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
          <h2>Offering Not Found</h2>
          <p style={{ color: "#71717A", marginBottom: "24px" }}>
            The requested programme offering is not currently open or active.
          </p>
          <Link href="/programmes" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="md">
              ← Return to Programmes Catalogue
            </Button>
          </Link>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const prg = offering.programme;
  const plans = offering.planEligibilities?.map((pe) => pe.plan) || [];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
        {/* Back Link */}
        <div style={{ marginBottom: "20px" }}>
          <Link href="/programmes" style={{ color: "#71717A", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
            ← Back to All Programmes
          </Link>
        </div>

        {/* Hero Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            border: "1px solid #E4E4E7",
            padding: "32px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "40px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                <Badge variant="brand" size="md">
                  Age {prg?.minimumAge}–{prg?.maximumAge}
                </Badge>
                <Badge variant="success" size="md">
                  Capacity: {offering.capacity} Students
                </Badge>
              </div>
              <h1 style={{ fontSize: "2.25rem", fontWeight: 900, color: "#18181B", margin: "0 0 8px" }}>
                {offering.name}
              </h1>
              <p style={{ fontSize: "1rem", color: "#71717A", margin: 0, maxWidth: "600px" }}>
                {prg?.description || prg?.name}
              </p>
            </div>

            <Link href={`/enrol?offeringId=${offering.id}`} style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                {t("programmes.enrolNow")} →
              </Button>
            </Link>
          </div>

          {/* Operational Metadata */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginTop: "28px",
              paddingTop: "24px",
              borderTop: "1px solid #F4F4F5",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#71717A", textTransform: "uppercase" }}>
                Term Start Date
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#18181B", marginTop: "4px" }}>
                {offering.startsOn}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#52525B" }}>
                {offering.endsOn ? `Ends: ${offering.endsOn}` : "Ongoing Term"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#71717A", textTransform: "uppercase" }}>
                Training Venue
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#18181B", marginTop: "4px" }}>
                {offering.venue?.name || "KHLIM Training Facility"}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#52525B" }}>
                {offering.venue?.address || "Malaysia"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#71717A", textTransform: "uppercase" }}>
                Level Category
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#18181B", marginTop: "4px" }}>
                {prg?.level || "Development"}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#52525B" }}>
                Sport: {prg?.sport?.defaultName || "Basketball"}
              </div>
            </div>
          </div>
        </div>

        {/* Eligible Membership Plans */}
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#18181B", marginBottom: "8px" }}>
            Available Membership Plans
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "#71717A", marginBottom: "24px" }}>
            Prices are calculated authoritatively by KHLIM backend contracts.
          </p>

          {plans.length === 0 ? (
            <Card style={{ padding: "24px", color: "#71717A", textAlign: "center" }}>
              No plans linked to this offering.
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              {plans.map((plan) => {
                const monthlyPrice = plan.recurringAmountMinor / 100;
                const upfrontPrice = plan.upfrontAmountMinor / 100;

                return (
                  <Card key={plan.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <CardHeader>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#71717A" }}>
                            {plan.commitmentCycles} Cycle(s) Commitment
                          </span>
                        </div>
                        <CardTitle>{plan.name}</CardTitle>
                      </CardHeader>

                      <CardContent>
                        <div style={{ margin: "16px 0" }}>
                          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#18181B" }}>
                            {formatCurrency(monthlyPrice)}
                            <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: "#71717A" }}>
                              {" "}
                              / {plan.billingFrequency.toLowerCase()}
                            </span>
                          </div>
                          {upfrontPrice > 0 && upfrontPrice !== monthlyPrice && (
                            <div style={{ fontSize: "0.8125rem", color: "#71717A", marginTop: "2px" }}>
                              Total for term: {formatCurrency(upfrontPrice)}
                            </div>
                          )}
                        </div>

                        {plan.benefitsSummary && (
                          <div style={{ fontSize: "0.8125rem", color: "#52525B" }}>
                            {plan.benefitsSummary}
                          </div>
                        )}
                      </CardContent>
                    </div>

                    <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #F4F4F5" }}>
                      <Link href={`/enrol?offeringId=${offering.id}&planId=${plan.id}`} style={{ width: "100%", textDecoration: "none" }}>
                        <Button variant="primary" size="md" style={{ width: "100%" }}>
                          Select & Enrol Child →
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
