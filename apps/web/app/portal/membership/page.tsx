"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { useFamily } from "../../../lib/family-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { apiService } from "../../../lib/api-service";
import type { Membership } from "../../../lib/types";

export default function MembershipPage() {
  const { t, formatCurrency } = useI18n();
  const { activeChild } = useFamily();
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    apiService.getMemberships(activeChild?.id).then(setMemberships);
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
              Active and past academy enrolments for <strong>{activeChild?.displayName ?? "Athlete"}</strong>.
            </p>
          </div>

          <Link href="/enrol" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="md">
              + New Enrolment
            </Button>
          </Link>
        </div>

        {/* Memberships List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {memberships.map((membership) => (
            <Card key={membership.id} style={{ padding: "28px", borderRadius: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <Badge variant={membership.status === "ACTIVE" ? "success" : "warning"} size="md">
                      {membership.status}
                    </Badge>
                    <span style={{ fontSize: "0.8125rem", color: "#64748B", fontWeight: 600 }}>
                      Contract #{membership.id.toUpperCase()}
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0F172A", margin: "0 0 4px" }}>
                    {membership.programmeName}
                  </h2>
                  <div style={{ fontSize: "0.9375rem", color: "#475569" }}>
                    Athlete: <strong>{membership.athleteName}</strong> • Venue: {membership.venueName}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>Enrolled Package</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A" }}>
                    {membership.planName}
                  </div>
                </div>
              </div>

              {/* Term & Dates Breakdown */}
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
                  <div style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>START DATE</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>{membership.startsAt}</div>
                </div>
                <div>
                  <div style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>RENEWAL / EXPIRY</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>{membership.endsAt}</div>
                </div>
                <div>
                  <div style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>BILLING FREQUENCY</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {membership.billingFrequency === "MONTHLY" ? "Monthly Recurring" : "Upfront Term"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>NEXT INSTALLMENT</div>
                  <div style={{ fontWeight: 700, color: "#065F46", marginTop: "2px" }}>
                    {membership.nextPaymentAmount ? `${formatCurrency(membership.nextPaymentAmount)} on ${membership.nextPaymentDate}` : "Paid in Full"}
                  </div>
                </div>
              </div>

              {/* Actions & Policy */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                  Need to change your training venue or pause membership? Contact academy support.
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <Link href="/portal/payments" style={{ textDecoration: "none" }}>
                    <Button variant="outline" size="sm">
                      View Payment Schedule
                    </Button>
                  </Link>
                  <Link href="/contact" style={{ textDecoration: "none" }}>
                    <Button variant="ghost" size="sm">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
