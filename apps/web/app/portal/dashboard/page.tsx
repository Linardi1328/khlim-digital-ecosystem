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
import { Alert } from "../../../components/ui/alert";
import {
  apiService,
} from "../../../lib/api-service";
import type { Membership, TrainingSession, NotificationItem } from "../../../lib/types";

export default function DashboardPage() {
  const { t, formatCurrency, formatDate } = useI18n();
  const { guardianProfile } = useAuth();
  const { activeChild, athletes } = useFamily();

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [memList, sessList, notifList] = await Promise.all([
          apiService.getMemberships(activeChild?.id),
          apiService.getTrainingSessions(activeChild?.id),
          apiService.getNotifications(),
        ]);
        setMemberships(memList);
        setSessions(sessList);
        setNotifications(notifList);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeChild]);

  const activeMembership = memberships[0];
  const nextSession = sessions[0];

  return (
    <PortalShell>
      <div>
        {/* Welcome Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
            {t("portal.dashboard.welcome", { name: guardianProfile?.displayName ?? "Parent" })}
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
            Supervising <strong>{activeChild?.displayName ?? "Athlete"}</strong> • {athletes.length} Managed Child(ren)
          </p>
        </div>

        {/* Action Alert if active */}
        <div style={{ marginBottom: "24px" }}>
          <Alert
            variant="info"
            title="🏀 Season 2026 Training Term Active"
          >
            Coach Marcus has published the updated September court assignments. Please review your session times below.
          </Alert>
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
                <Badge variant={activeMembership?.status === "ACTIVE" ? "success" : "warning"} size="sm">
                  {activeMembership?.status ?? "PENDING"}
                </Badge>
              </div>
              <CardTitle style={{ marginTop: "6px" }}>
                {activeMembership?.programmeName ?? "Academy Programme"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "12px" }}>
                Package: <strong>{activeMembership?.planName ?? "3-Month Term"}</strong>
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#64748B", marginBottom: "16px" }}>
                Valid: {activeMembership?.startsAt} → {activeMembership?.endsAt}
              </div>
              <Link href="/portal/membership" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="sm" style={{ width: "100%" }}>
                  Manage Membership →
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card 2: Next Training Session */}
          <Card>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  {t("portal.dashboard.nextTraining")}
                </span>
                <Badge variant="brand" size="sm">
                  {nextSession ? "Confirmed" : "None"}
                </Badge>
              </div>
              <CardTitle style={{ marginTop: "6px" }}>
                {nextSession ? `${formatDate(nextSession.sessionDate)}` : "No upcoming sessions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextSession ? (
                <>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
                    ⏰ {nextSession.startTime} - {nextSession.endTime}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#475569", marginBottom: "4px" }}>
                    📍 {nextSession.venueName} ({nextSession.court})
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B", marginBottom: "16px" }}>
                    Lead Coach: {nextSession.coachName}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "0.875rem", color: "#64748B", marginBottom: "16px" }}>
                  Check the full schedule for future session dates.
                </div>
              )}
              <Link href="/portal/schedule" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="sm" style={{ width: "100%" }}>
                  View Full Schedule →
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Card 3: Next Payment Due */}
          <Card>
            <CardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  {t("portal.dashboard.nextPayment")}
                </span>
                <Badge variant="neutral" size="sm">
                  Scheduled
                </Badge>
              </div>
              <CardTitle style={{ marginTop: "6px" }}>
                {activeMembership?.nextPaymentAmount ? formatCurrency(activeMembership.nextPaymentAmount) : formatCurrency(195)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "4px" }}>
                Due Date: <strong>{activeMembership?.nextPaymentDate ?? "2026-09-01"}</strong>
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#64748B", marginBottom: "16px" }}>
                Auto-charge via Visa •••• 4242
              </div>
              <Link href="/portal/payments" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="sm" style={{ width: "100%" }}>
                  Billing & Receipts →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Action Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
          {/* Activity / Notifications Feed */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.125rem" }}>
                {t("portal.dashboard.recentActivity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      backgroundColor: n.isRead ? "#FFFFFF" : "#FFFDF5",
                      border: n.isRead ? "1px solid #E2E8F0" : "1px solid #FDE68A",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ fontSize: "1.25rem" }}>
                      {n.category === "BILLING" ? "💳" : n.category === "SCHEDULE" ? "📅" : "📢"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0F172A" }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "2px" }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "#94A3B8", marginTop: "4px" }}>
                        {n.createdAt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Enrol / Family Actions */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.125rem" }}>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Link href="/enrol" style={{ textDecoration: "none" }}>
                  <Button variant="primary" size="md" style={{ width: "100%" }}>
                    + Enrol Another Child
                  </Button>
                </Link>
                <Link href="/portal/players" style={{ textDecoration: "none" }}>
                  <Button variant="outline" size="md" style={{ width: "100%" }}>
                    Manage Player Profiles
                  </Button>
                </Link>
                <Link href="/portal/account" style={{ textDecoration: "none" }}>
                  <Button variant="ghost" size="md" style={{ width: "100%" }}>
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
