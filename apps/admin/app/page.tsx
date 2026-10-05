"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "../components/layout/AdminShell";
import { PageHeader } from "../components/ui/PageHeader";
import { MetricCard } from "../components/ui/MetricCard";
import { Button } from "../components/ui/Button";
import { useAdminAuth } from "../lib/auth-context";
import {
  adminApi,
  getAdminOverview,
  getAdminLeadSummary,
  type AdminLeadSummaryResponse,
} from "../lib/admin-api";
import type { DashboardMetrics } from "../lib/types";

interface QuickAction {
  href: string;
  title: string;
  description: string;
  roles?: Parameters<ReturnType<typeof useAdminAuth>["hasRole"]>[0];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/leads",
    title: "Academy leads",
    description: "Manage interest registrations and follow up on WhatsApp.",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/offerings",
    title: "Programme offerings",
    description: "Open or close academy intakes and manage capacity.",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/scheduling",
    title: "Scheduling & attendance",
    description:
      "Create sessions, handle cancellations, and record attendance.",
    roles: [
      "SUPER_ADMIN",
      "MANAGEMENT",
      "ACADEMY_ADMIN",
      "HEAD_COACH",
      "COACH",
      "EVENT_STAFF",
    ],
  },
  {
    href: "/notifications",
    title: "Family notifications",
    description: "Send persistent announcements and operational notices.",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/users",
    title: "Accounts & access",
    description: "Search accounts, review roles, and manage account status.",
    roles: ["SUPER_ADMIN", "MANAGEMENT"],
  },
  {
    href: "/editorial",
    title: "Editorial Studio",
    description: "Prepare verified achievements and Player Spotlight content.",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/payments",
    title: "Payment operations",
    description: "Review payment records requiring staff attention.",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "FINANCE_ADMIN"],
  },
];

export default function AdminDashboardPage() {
  const {
    canAccessFinance,
    hasRole,
    isAuthenticated,
    isDemoMode,
    mfaSatisfied,
    user,
  } = useAdminAuth();
  const canViewFinance = canAccessFinance();
  const canViewLeads = hasRole(["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leadSummary, setLeadSummary] =
    useState<AdminLeadSummaryResponse | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  useEffect(() => {
    if (!canViewLeads) {
      setLeadSummary(null);
      setLeadsError(null);
      return;
    }
    if (!isDemoMode && (!isAuthenticated || !mfaSatisfied)) {
      setLeadSummary(null);
      setLeadsError(null);
      return;
    }

    let cancelled = false;
    setLeadsLoading(true);
    setLeadsError(null);

    void getAdminLeadSummary()
      .then((res) => {
        if (!cancelled) setLeadSummary(res);
      })
      .catch((reason) => {
        if (!cancelled) {
          setLeadsError(
            reason instanceof Error
              ? reason.message
              : "Lead summary could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLeadsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewLeads, isDemoMode, isAuthenticated, mfaSatisfied]);

  useEffect(() => {
    if (!isDemoMode && (!isAuthenticated || !mfaSatisfied)) {
      setMetrics(null);
      setError(null);
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const request = isDemoMode
      ? adminApi.getDashboardMetrics()
      : getAdminOverview();

    void request
      .then((result) => {
        if (!cancelled) setMetrics(result);
      })
      .catch((reason) => {
        if (!cancelled) {
          setMetrics(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "The operations snapshot could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, isAuthenticated, mfaSatisfied]);

  const availableActions = QUICK_ACTIONS.filter(
    (action) => !action.roles || hasRole(action.roles),
  );

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="KHLIM Operations Command Centre"
          subtitle="Current academy membership, capacity, and operational status from the KHLIM backend."
          badge={
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                backgroundColor: error ? "#FEF2F2" : "#ECFDF5",
                color: error ? "#991B1B" : "#065F46",
                border: `1px solid ${error ? "#FECACA" : "#A7F3D0"}`,
                padding: "4px 9px",
                borderRadius: "9999px",
              }}
            >
              {isDemoMode
                ? "● DEMO DATA"
                : error
                  ? "● API ATTENTION"
                  : loading
                    ? "● CONNECTING"
                    : "● LIVE API SNAPSHOT"}
            </span>
          }
          actions={
            hasRole(["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"]) ? (
              <Link href="/offerings">
                <Button variant="primary" size="sm">
                  Manage Offerings
                </Button>
              </Link>
            ) : undefined
          }
        />

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 20,
              padding: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 10,
              color: "#991B1B",
            }}
          >
            <strong>Operations data is temporarily unavailable.</strong>
            <div style={{ marginTop: 4 }}>{error}</div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <MetricCard
            title="Active Members"
            value={loading ? "…" : (metrics?.activeMembers ?? "—")}
            subtitle="Active membership contracts"
            variant="success"
            icon="🏅"
          />
          <MetricCard
            title="Pending Memberships"
            value={loading ? "…" : (metrics?.pendingMemberships ?? "—")}
            subtitle="Awaiting activation or payment"
            variant="warning"
            icon="⏳"
          />
          <MetricCard
            title="Total Athletes"
            value={loading ? "…" : (metrics?.totalAthletes ?? "—")}
            subtitle="Managed athlete profiles"
            icon="👦"
          />
          <MetricCard
            title="Open Offerings"
            value={loading ? "…" : (metrics?.openOfferings ?? "—")}
            subtitle="Offerings accepting members"
            icon="🏟️"
          />
          <MetricCard
            title="Capacity Utilisation"
            value={
              loading
                ? "…"
                : metrics
                  ? `${metrics.capacityUtilisationRate}%`
                  : "—"
            }
            subtitle="Seats held across open offerings"
            variant="success"
            icon="📈"
          />
          {canViewLeads && (
            <>
              <Link
                href="/leads?status=NEW"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <MetricCard
                  title="New Leads"
                  value={
                    leadsLoading
                      ? "…"
                      : leadSummary
                        ? leadSummary.newLeads
                        : leadsError
                          ? "!"
                          : "—"
                  }
                  subtitle="Awaiting initial contact"
                  variant={
                    leadSummary && leadSummary.newLeads > 0
                      ? "warning"
                      : "default"
                  }
                  icon="★"
                />
              </Link>
              <Link
                href="/leads?status=NEEDS_FOLLOW_UP"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <MetricCard
                  title="Needs Follow-up"
                  value={
                    leadsLoading
                      ? "…"
                      : leadSummary
                        ? leadSummary.needsFollowUp
                        : leadsError
                          ? "!"
                          : "—"
                  }
                  subtitle="New, contacted, or qualified"
                  variant={
                    leadSummary && leadSummary.needsFollowUp > 0
                      ? "warning"
                      : "default"
                  }
                  icon="📋"
                />
              </Link>
            </>
          )}
          {canViewFinance ? (
            <MetricCard
              title="Payments Requiring Action"
              value={loading ? "…" : (metrics?.paymentsAttentionCount ?? "—")}
              subtitle="Failed or processing payments"
              variant={
                metrics && (metrics.paymentsAttentionCount ?? 0) > 0
                  ? "danger"
                  : "default"
              }
              icon="⚠️"
            />
          ) : (
            <MetricCard
              title="Payments Requiring Action"
              value="Restricted"
              subtitle="Finance roles only"
              icon="🔒"
            />
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Quick operations</h2>
            <p style={{ color: "#64748B", fontSize: "0.875rem" }}>
              Only tools permitted for your current staff roles are shown.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {availableActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  style={{
                    minHeight: 58,
                    display: "block",
                    padding: 12,
                    boxSizing: "border-box",
                    textDecoration: "none",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 9,
                    color: "#0F172A",
                  }}
                >
                  <strong>{action.title}</strong>
                  <div
                    style={{
                      color: "#64748B",
                      fontSize: "0.78rem",
                      marginTop: 3,
                    }}
                  >
                    {action.description}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Session security</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                  Signed in as
                </div>
                <strong>{user?.displayName ?? "KHLIM Staff"}</strong>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                  Access model
                </div>
                <strong>
                  {isDemoMode
                    ? "Demo permission preview"
                    : "Backend RBAC + MFA"}
                </strong>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                  Snapshot generated
                </div>
                <strong>
                  {metrics?.generatedAt
                    ? new Date(metrics.generatedAt).toLocaleString()
                    : isDemoMode
                      ? "Synthetic demo data"
                      : "Waiting for backend"}
                </strong>
              </div>
            </div>
          </section>
        </div>

        {isDemoMode && (
          <section
            style={{
              marginTop: 20,
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: 12,
              padding: 18,
              color: "#78350F",
            }}
          >
            <strong>Demo-only operational previews</strong>
            <p style={{ marginBottom: 0 }}>
              Programme Offering Capacity, Recent Membership Enrolments, Payment
              Attention Queue, and Recent Audit Activity remain available on the
              dedicated demo pages. They are not presented as live data until
              each persisted feed is connected.
            </p>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
