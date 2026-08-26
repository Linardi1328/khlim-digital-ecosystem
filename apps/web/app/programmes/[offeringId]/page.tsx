"use client";

import React, { use } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { PublicHeader } from "../../../components/layout/public-header";
import { PublicFooter } from "../../../components/layout/public-footer";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { INITIAL_OFFERINGS, INITIAL_PROGRAMMES, INITIAL_MEMBERSHIP_PLANS } from "../../../lib/api-service";

export default function OfferingDetailPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const { offeringId } = use(params);
  const { t, formatCurrency } = useI18n();

  const offering =
    INITIAL_OFFERINGS.find((o) => o.id === offeringId) || INITIAL_OFFERINGS[0]!;
  const programme =
    INITIAL_PROGRAMMES.find((p) => p.id === offering.programmeId) || INITIAL_PROGRAMMES[0]!;

  const spotsLeft = offering.capacity - offering.enrolledCount;

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
                  Age {programme.minAge}–{programme.maxAge}
                </Badge>
                <Badge variant={spotsLeft > 3 ? "success" : "warning"} size="md">
                  {spotsLeft} Spots Available
                </Badge>
              </div>
              <h1 style={{ fontSize: "2.25rem", fontWeight: 900, color: "#18181B", margin: "0 0 8px" }}>
                {offering.programmeName}
              </h1>
              <p style={{ fontSize: "1rem", color: "#71717A", margin: 0, maxWidth: "600px" }}>
                {programme.description}
              </p>
            </div>

            <Link href={`/enrol?offeringId=${offering.id}`} style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                {t("programmes.enrolNow")} →
              </Button>
            </Link>
          </div>

          {/* Offering Operational Metadata */}
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
                Schedule & Time
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#18181B", marginTop: "4px" }}>
                Every {offering.dayOfWeek}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#52525B" }}>
                {offering.startTime} - {offering.endTime}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#71717A", textTransform: "uppercase" }}>
                Venue & Court
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#18181B", marginTop: "4px" }}>
                {offering.venueName}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#52525B" }}>
                {offering.court}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#71717A", textTransform: "uppercase" }}>
                Enrolment Capacity
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#18181B", marginTop: "4px" }}>
                {offering.enrolledCount} / {offering.capacity} Enrolled
              </div>
              <div style={{ width: "100%", height: "6px", backgroundColor: "#E4E4E7", borderRadius: "3px", marginTop: "6px" }}>
                <div
                  style={{
                    width: `${(offering.enrolledCount / offering.capacity) * 100}%`,
                    height: "100%",
                    backgroundColor: "#10B981",
                    borderRadius: "3px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Membership Plans Available */}
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#18181B", marginBottom: "8px" }}>
            Available Membership Plans
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "#71717A", marginBottom: "24px" }}>
            All packages include training jersey, coach evaluations, and full parent portal access. Prices calculated authoritatively by KHLIM backend.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {INITIAL_MEMBERSHIP_PLANS.map((plan) => (
              <Card key={plan.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <CardHeader>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#71717A" }}>
                        {plan.commitmentCycles} Months Commitment
                      </span>
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div style={{ margin: "16px 0" }}>
                      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#18181B" }}>
                        {formatCurrency(plan.monthlyAmount)}
                        <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: "#71717A" }}> / month</span>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "#71717A", marginTop: "2px" }}>
                        Total for term: {formatCurrency(plan.upfrontAmount)}
                      </div>
                    </div>

                    <div style={{ fontSize: "0.8125rem", color: "#52525B", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {plan.benefitsSummary.map((b, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{ color: "#10B981", fontWeight: 700 }}>✓</span>
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
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
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
