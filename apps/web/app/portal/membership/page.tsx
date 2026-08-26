"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { useFamily } from "../../../lib/family-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { apiService } from "../../../lib/api-service";
import type { AthleteMembershipItem } from "../../../lib/types";

export default function MembershipPage() {
  const { t, formatCurrency } = useI18n();
  const { activeChild } = useFamily();
  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activeChild?.id) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiService
      .listAthleteMemberships(activeChild.id)
      .then(setMemberships)
      .catch((err) => console.warn("Failed to load memberships:", err))
      .finally(() => setLoading(false));
  }, [activeChild]);

  return (
    <PortalShell>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
              {t("portal.membership.title")}
            </h1>
            <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
              Active and past academy enrolments for <strong>{activeChild?.displayName || "Selected Athlete"}</strong>.
            </p>
          </div>

          <Link href="/enrol" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="md">
              + New Enrolment
            </Button>
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "40px", color: "#64748B" }}>Loading memberships from server...</div>
        ) : memberships.length === 0 ? (
          <Card style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏅</div>
            <h3>No Memberships Found</h3>
            <p style={{ maxWidth: "400px", margin: "0 auto 16px" }}>
              There are no membership contracts recorded for this athlete.
            </p>
            <Link href="/enrol" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="md">
                Enrol Athlete in Programme →
              </Button>
            </Link>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {memberships.map((membership) => {
              const plan = membership.membershipPlan;
              const off = membership.programmeOffering;
              const isPending = membership.status === "PENDING";
              const isActive = membership.status === "ACTIVE";

              return (
                <Card key={membership.id} style={{ padding: "28px", borderRadius: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <Badge
                          variant={isActive ? "success" : isPending ? "warning" : "neutral"}
                          size="md"
                        >
                          {membership.status}
                        </Badge>
                        <span style={{ fontSize: "0.8125rem", color: "#64748B", fontWeight: 600 }}>
                          Contract ID: {membership.id}
                        </span>
                      </div>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0F172A", margin: "0 0 4px" }}>
                        {off?.name || "Academy Programme"}
                      </h2>
                      <div style={{ fontSize: "0.9375rem", color: "#475569" }}>
                        Venue: {off?.venue?.name || "KHLIM Facility"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>Enrolled Package</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A" }}>
                        {plan?.name || "Standard Plan"}
                      </div>
                    </div>
                  </div>

                  {/* Plan Specs */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                      padding: "16px 20px",
                      backgroundColor: "#F8FAFC",
                      borderRadius: "10px",
                      border: "1px solid #E2E8F0",
                      fontSize: "0.875rem",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <div style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>BILLING FREQUENCY</div>
                      <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {plan?.billingFrequency || "MONTHLY"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>MONTHLY DUE</div>
                      <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {plan
                          ? formatCurrency(plan.recurringAmountMinor / 100)
                          : "MYR 0"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>COMMITMENT</div>
                      <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {plan?.commitmentCycles || 1} Billing Cycle(s)
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>START DATE</div>
                      <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {off?.startsOn || "Scheduled"}
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div style={{ marginBottom: "16px" }}>
                      <span style={{ fontSize: "0.875rem", color: "#B45309", fontWeight: 600 }}>
                        ⏳ Pending payment provider confirmation to activate sessions.
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <Link href="/portal/payments" style={{ textDecoration: "none" }}>
                      <Button variant="outline" size="sm">
                        View Billing Schedule
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
