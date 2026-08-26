"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "../../../lib/i18n-context";
import { useFamily } from "../../../lib/family-context";
import { PublicHeader } from "../../../components/layout/public-header";
import { PublicFooter } from "../../../components/layout/public-footer";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { INITIAL_OFFERINGS, INITIAL_MEMBERSHIP_PLANS } from "../../../lib/api-service";

function EnrolmentConfirmationContent() {
  const { t, formatCurrency } = useI18n();
  const searchParams = useSearchParams();
  const { athletes } = useFamily();

  const athleteId = searchParams.get("athleteId");
  const planId = searchParams.get("planId");
  const offeringId = searchParams.get("offeringId");

  const athlete = athletes.find((a) => a.id === athleteId) ?? athletes[0]!;
  const plan = INITIAL_MEMBERSHIP_PLANS.find((p) => p.id === planId) ?? INITIAL_MEMBERSHIP_PLANS[1]!;
  const offering = INITIAL_OFFERINGS.find((o) => o.id === offeringId) ?? INITIAL_OFFERINGS[0]!;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "700px", margin: "40px auto", padding: "0 20px" }}>
        <Card style={{ textAlign: "center", padding: "48px 32px", borderRadius: "20px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.06)" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: "#ECFDF5",
              color: "#10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.5rem",
              margin: "0 auto 20px",
            }}
          >
            ✓
          </div>

          <Badge variant="success" size="md">
            Payment & Membership Confirmed
          </Badge>

          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, color: "#18181B", margin: "16px 0 8px" }}>
            {t("enrol.confirmation.title")}
          </h1>
          <p style={{ fontSize: "1rem", color: "#71717A", maxWidth: "520px", margin: "0 auto 32px", lineHeight: 1.5 }}>
            {t("enrol.confirmation.subtitle")} A confirmation receipt and training guide have been sent to your email.
          </p>

          {/* Details Box */}
          <div
            style={{
              backgroundColor: "#FAFAFA",
              borderRadius: "12px",
              border: "1px solid #E4E4E7",
              padding: "24px",
              textAlign: "left",
              marginBottom: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              fontSize: "0.9375rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#71717A" }}>Enrolled Athlete</span>
              <strong style={{ color: "#18181B" }}>{athlete?.displayName ?? "Lucas Lim"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#71717A" }}>Programme</span>
              <strong style={{ color: "#18181B" }}>{offering.programmeName}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#71717A" }}>First Training Session</span>
              <strong style={{ color: "#F59E0B" }}>Saturday, 29 August @ {offering.startTime}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#71717A" }}>Venue & Court</span>
              <span style={{ color: "#18181B" }}>{offering.venueName} • {offering.court}</span>
            </div>

            <div style={{ borderTop: "1px solid #E4E4E7", margin: "4px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#71717A" }}>Amount Paid (Installment 1)</span>
              <strong style={{ fontSize: "1.125rem", color: "#065F46" }}>
                {formatCurrency(plan.monthlyAmount)} (Paid)
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/portal/dashboard" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                {t("enrol.confirmation.viewDashboard")} →
              </Button>
            </Link>
            <Link href="/portal/schedule" style={{ textDecoration: "none" }}>
              <Button variant="outline" size="lg">
                View Training Schedule
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function EnrolmentConfirmationPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading confirmation...</div>}>
      <EnrolmentConfirmationContent />
    </Suspense>
  );
}
