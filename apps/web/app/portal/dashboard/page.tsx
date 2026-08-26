"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { useFamily } from "../../../lib/family-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { apiService } from "../../../lib/api-service";
import type { AthleteMembershipItem, MembershipBillingResponse } from "../../../lib/types";

export default function DashboardPage() {
  const { t, formatCurrency } = useI18n();
  const { guardianProfile } = useAuth();
  const { activeChild, athletes } = useFamily();

  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [billing, setBilling] = useState<MembershipBillingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeChild?.id) {
        setMemberships([]);
        setBilling(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const memList = await apiService.listAthleteMemberships(activeChild.id);
        setMemberships(memList);
        if (memList[0]?.id) {
          try {
            const billData = await apiService.getMembershipBilling(
              activeChild.id,
              memList[0].id,
            );
            setBilling(billData);
          } catch {
            // Non-blocking billing load
          }
        }
      } catch (err) {
        console.warn("Failed to load memberships:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [activeChild]);

  const activeMembership = memberships[0];
  const nextInstallment = billing?.paymentSchedule?.installments?.find(
    (i) => i.status === "PENDING" || i.status === "SCHEDULED",
  );

  return (
    <PortalShell>
      <div>
        {/* Welcome Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
            {t("portal.dashboard.welcome", { name: guardianProfile?.displayName || "Guardian" })}
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
            Active Athlete: <strong>{activeChild?.displayName || "None selected"}</strong> • {athletes.length} Managed Athlete(s)
          </p>
        </div>

        {/* Primary Status Overview Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          {/* Card 1: Active Membership */}
          <Card>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  {t("portal.dashboard.membershipStatus")}
                </span>
                <Badge
                  variant={activeMembership?.status === "ACTIVE" ? "success" : "warning"}
                  size="sm"
                >
                  {activeMembership?.status || "NO ACTIVE MEMBERSHIP"}
                </Badge>
              </div>
              <CardTitle style={{ marginTop: "6px" }}>
                {activeMembership?.programmeOffering?.name || "No Enrolled Programme"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeMembership ? (
                <>
                  <div style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "8px" }}>
                    Plan: <strong>{activeMembership.membershipPlan?.name || "Standard Plan"}</strong>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748B", marginBottom: "16px" }}>
                    Status: {activeMembership.status}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "0.875rem", color: "#64748B", marginBottom: "16px" }}>
                  Enrol your child to begin structured academy training.
                </div>
              )}
              <Link href="/portal/membership" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="sm" style={{ width: "100%" }}>
                  Manage Memberships →
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card 2: Training Sessions */}
          <Card>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  {t("portal.dashboard.nextTraining")}
                </span>
                <Badge variant="neutral" size="sm">
                  Schedule
                </Badge>
              </div>
              <CardTitle style={{ marginTop: "6px" }}>
                {activeMembership?.programmeOffering?.startsOn
                  ? `Term Starts: ${activeMembership.programmeOffering.startsOn}`
                  : "No Scheduled Sessions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ fontSize: "0.875rem", color: "#64748B", marginBottom: "16px" }}>
                {activeMembership?.programmeOffering?.venue?.name
                  ? `📍 Venue: ${activeMembership.programmeOffering.venue.name}`
                  : "Session times will appear here once scheduled by the academy."}
              </div>
              <Link href="/portal/schedule" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="sm" style={{ width: "100%" }}>
                  View Academy Schedule →
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card 3: Next Payment */}
          <Card>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  {t("portal.dashboard.nextPayment")}
                </span>
                <Badge variant={nextInstallment ? "warning" : "neutral"} size="sm">
                  {nextInstallment ? "Scheduled" : "Up to date"}
                </Badge>
              </div>
              <CardTitle style={{ marginTop: "6px" }}>
                {nextInstallment
                  ? formatCurrency(nextInstallment.amountMinor / 100)
                  : activeMembership?.membershipPlan
                    ? formatCurrency(activeMembership.membershipPlan.recurringAmountMinor / 100)
                    : "MYR 0"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "16px" }}>
                {nextInstallment
                  ? `Due on ${nextInstallment.dueOn}`
                  : "All payments up to date."}
              </div>
              <Link href="/portal/payments" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="sm" style={{ width: "100%" }}>
                  Billing & Installments →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.125rem" }}>Family Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link href="/enrol" style={{ textDecoration: "none" }}>
                  <Button variant="primary" size="md">
                    + Enrol Player in Programme
                  </Button>
                </Link>
                <Link href="/portal/players" style={{ textDecoration: "none" }}>
                  <Button variant="outline" size="md">
                    Manage Player Profiles
                  </Button>
                </Link>
                <Link href="/portal/account" style={{ textDecoration: "none" }}>
                  <Button variant="ghost" size="md">
                    Account & Preferences
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
