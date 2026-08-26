"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "../../../lib/i18n-context";
import { PublicHeader } from "../../../components/layout/public-header";
import { PublicFooter } from "../../../components/layout/public-footer";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { apiService } from "../../../lib/api-service";
import type { MembershipBillingResponse, AthleteMembershipItem } from "../../../lib/types";

function EnrolmentConfirmationContent() {
  const { t, formatCurrency } = useI18n();
  const searchParams = useSearchParams();

  const athleteId = searchParams.get("athleteId");
  const membershipId = searchParams.get("membershipId");

  const [billing, setBilling] = useState<MembershipBillingResponse | null>(null);
  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAuthoritativeState() {
      if (!athleteId) {
        setLoading(false);
        return;
      }

      try {
        if (membershipId) {
          const billingData = await apiService.getMembershipBilling(
            athleteId,
            membershipId,
          );
          setBilling(billingData);
        }
        const membershipList = await apiService.listAthleteMemberships(athleteId);
        setMemberships(membershipList);
      } catch (err) {
        console.warn("Unable to load backend billing status:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAuthoritativeState();
  }, [athleteId, membershipId]);

  const currentMembership = memberships.find((m) => m.id === membershipId) || memberships[0];
  const isAuthoritativelyActive =
    billing?.status === "ACTIVE" || currentMembership?.status === "ACTIVE";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "700px", margin: "40px auto", padding: "0 20px" }}>
        <Card style={{ textAlign: "center", padding: "48px 32px", borderRadius: "20px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.06)" }}>
          {loading ? (
            <div style={{ padding: "40px", color: "#71717A" }}>
              Verifying authoritative membership state from KHLIM backend...
            </div>
          ) : (
            <>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  backgroundColor: isAuthoritativelyActive ? "#ECFDF5" : "#FFFBEB",
                  color: isAuthoritativelyActive ? "#10B981" : "#F59E0B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                  margin: "0 auto 20px",
                }}
              >
                {isAuthoritativelyActive ? "✓" : "⏳"}
              </div>

              <Badge variant={isAuthoritativelyActive ? "success" : "warning"} size="md">
                {isAuthoritativelyActive
                  ? "Membership Active & Confirmed"
                  : "Membership Created (Pending Payment)"}
              </Badge>

              <h1 style={{ fontSize: "2.25rem", fontWeight: 900, color: "#18181B", margin: "16px 0 8px" }}>
                {isAuthoritativelyActive
                  ? t("enrol.confirmation.title")
                  : "Enrolment Application Received"}
              </h1>
              <p style={{ fontSize: "1rem", color: "#71717A", maxWidth: "520px", margin: "0 auto 32px", lineHeight: 1.5 }}>
                {isAuthoritativelyActive
                  ? "Your membership has been verified and activated by our billing authority."
                  : "Your membership contract is recorded on the KHLIM backend in PENDING status. Once payment provider events are verified, your membership will become ACTIVE."}
              </p>

              {/* Authoritative State Details Box */}
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
                  <span style={{ color: "#71717A" }}>Contract Reference</span>
                  <strong style={{ color: "#18181B" }}>
                    {membershipId || currentMembership?.id || "Pending"}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#71717A" }}>Authoritative Status</span>
                  <Badge variant={isAuthoritativelyActive ? "success" : "warning"} size="sm">
                    {billing?.status || currentMembership?.status || "PENDING"}
                  </Badge>
                </div>

                {currentMembership?.programmeOffering?.name && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#71717A" }}>Offering</span>
                    <strong style={{ color: "#18181B" }}>
                      {currentMembership.programmeOffering.name}
                    </strong>
                  </div>
                )}

                {currentMembership?.membershipPlan && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#71717A" }}>Plan</span>
                    <strong style={{ color: "#18181B" }}>
                      {currentMembership.membershipPlan.name}
                    </strong>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
                <Link href="/portal/dashboard" style={{ textDecoration: "none" }}>
                  <Button variant="primary" size="lg">
                    {t("enrol.confirmation.viewDashboard")} →
                  </Button>
                </Link>
                <Link href="/portal/membership" style={{ textDecoration: "none" }}>
                  <Button variant="outline" size="lg">
                    View Membership Details
                  </Button>
                </Link>
              </div>
            </>
          )}
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
