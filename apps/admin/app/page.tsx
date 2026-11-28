"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminRegistrationSessionDto } from "@khlim/api-client";
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
import { listAdminRegistrationSessions } from "../lib/registration-admin-api";
import type { DashboardMetrics, SessionItem } from "../lib/types";

interface QuickAction {
  href: string;
  title: string;
  description: string;
  group: string;
  roles?: Parameters<ReturnType<typeof useAdminAuth>["hasRole"]>[0];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/registrations",
    title: "Academy registrations",
    description:
      "Review new registration snapshots, confirm places, and manage published training sessions.",
    group: "Academy Operations",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/leads",
    title: "Academy leads",
    description: "Manage interest registrations and follow up on WhatsApp.",
    group: "Academy Operations",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/offerings",
    title: "Programme offerings",
    description: "Open or close academy intakes and manage capacity.",
    group: "Academy Operations",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/scheduling",
    title: "Scheduling & attendance",
    description:
      "Manage legacy training events, handle cancellations, and record attendance.",
    group: "Academy Operations",
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
    href: "/payments",
    title: "Payment operations",
    description: "Review payment records requiring staff attention.",
    group: "Finance",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "FINANCE_ADMIN"],
  },
  {
    href: "/editorial",
    title: "Editorial Studio",
    description: "Prepare verified achievements and Player Spotlight content.",
    group: "Content",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/notifications",
    title: "Family notifications",
    description: "Send persistent announcements and operational notices.",
    group: "Communications",
    roles: ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"],
  },
  {
    href: "/users",
    title: "Accounts & access",
    description: "Search accounts, review roles, and manage account status.",
    group: "Administration",
    roles: ["SUPER_ADMIN", "MANAGEMENT"],
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
  const canViewAcademy = hasRole([
    "SUPER_ADMIN",
    "MANAGEMENT",
    "ACADEMY_ADMIN",
  ]);
  const canViewSessions = hasRole([
    "SUPER_ADMIN",
    "MANAGEMENT",
    "ACADEMY_ADMIN",
    "HEAD_COACH",
    "COACH",
    "EVENT_STAFF",
  ]);
  const canViewPlayers = hasRole([
    "SUPER_ADMIN",
    "MANAGEMENT",
    "ACADEMY_ADMIN",
    "HEAD_COACH",
    "COACH",
  ]);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leadSummary, setLeadSummary] =
    useState<AdminLeadSummaryResponse | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [regSessions, setRegSessions] = useState<
    AdminRegistrationSessionDto[] | null
  >(null);
  const [regSessionsLoading, setRegSessionsLoading] = useState(false);
  const [regSessionsError, setRegSessionsError] = useState<string | null>(null);

  const [upcomingSessionsCount, setUpcomingSessionsCount] = useState<
    number | null
  >(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // 1. Overview metrics (server-authoritative /admin/overview or isolated demo metrics)
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

  // 2. Lead summary (Academy roles only)
  useEffect(() => {
    if (!canViewAcademy) {
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
  }, [canViewAcademy, isDemoMode, isAuthenticated, mfaSatisfied]);

  // 3. Registration sessions & review queue (Live authenticated AAL2 only — strictly isolated in demo mode)
  useEffect(() => {
    if (!canViewAcademy || isDemoMode || !isAuthenticated || !mfaSatisfied) {
      setRegSessions(null);
      setRegSessionsError(null);
      setRegSessionsLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setRegSessionsLoading(true);
    setRegSessionsError(null);

    void listAdminRegistrationSessions(controller.signal)
      .then((res) => {
        if (!cancelled) {
          setRegSessions(Array.isArray(res.items) ? res.items : []);
        }
      })
      .catch((reason) => {
        if (!cancelled && !controller.signal.aborted) {
          setRegSessions(null);
          setRegSessionsError(
            reason instanceof Error
              ? reason.message
              : "Registration summary unavailable.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRegSessionsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canViewAcademy, isDemoMode, isAuthenticated, mfaSatisfied]);

  // 4. Upcoming legacy scheduled sessions count (Session operations roles)
  useEffect(() => {
    if (!canViewSessions) {
      setUpcomingSessionsCount(null);
      return;
    }
    if (!isDemoMode && (!isAuthenticated || !mfaSatisfied)) {
      setUpcomingSessionsCount(null);
      return;
    }

    let cancelled = false;
    setSessionsLoading(true);

    void adminApi
      .listSessions()
      .then((list: SessionItem[]) => {
        if (!cancelled) {
          const scheduled = list.filter((s) => s.status === "SCHEDULED").length;
          setUpcomingSessionsCount(scheduled);
        }
      })
      .catch(() => {
        if (!cancelled) setUpcomingSessionsCount(null);
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewSessions, isDemoMode, isAuthenticated, mfaSatisfied]);

  const availableActions = QUICK_ACTIONS.filter(
    (action) => !action.roles || hasRole(action.roles),
  );

  // Derived authoritative registration queue & capacity metrics (live mode only)
  const regMetrics = React.useMemo(() => {
    if (!regSessions) return null;
    const published = regSessions.filter(
      (s) => s.publicationState === "PUBLISHED",
    );
    const awaitingReview = regSessions.reduce(
      (sum, s) =>
        sum + (s.seatCounts.RECEIVED ?? 0) + (s.seatCounts.UNDER_REVIEW ?? 0),
      0,
    );
    const receivedOnly = regSessions.reduce(
      (sum, s) => sum + (s.seatCounts.RECEIVED ?? 0),
      0,
    );
    const confirmedSeats = published.reduce(
      (sum, s) => sum + (s.seatCounts.CONFIRMED ?? 0),
      0,
    );
    const totalCapacity = published.reduce((sum, s) => sum + s.capacity, 0);
    const remainingSeats = published.reduce(
      (sum, s) => sum + s.seatsRemaining,
      0,
    );
    return {
      publishedCount: published.length,
      awaitingReview,
      receivedOnly,
      confirmedSeats,
      totalCapacity,
      remainingSeats,
    };
  }, [regSessions]);

  const statusBadgeStyle = isDemoMode
    ? {
        backgroundColor: "#FEF3C7",
        color: "#92400E",
        border: "1px solid #FDE68A",
      }
    : error
      ? {
          backgroundColor: "#FEF2F2",
          color: "#991B1B",
          border: "1px solid #FECACA",
        }
      : {
          backgroundColor: "#ECFDF5",
          color: "#065F46",
          border: "1px solid #A7F3D0",
        };

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="KHLIM Operations Command Centre"
          subtitle="Actionable operational queues, confirmed capacity, and membership status from authoritative KHLIM records."
          badge={
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: "9999px",
                letterSpacing: "0.04em",
                ...statusBadgeStyle,
              }}
            >
              {isDemoMode
                ? "● DEMO DATA (SYNTHETIC)"
                : error
                  ? "● API ATTENTION"
                  : loading
                    ? "● CONNECTING"
                    : "● LIVE API SNAPSHOT"}
            </span>
          }
          actions={
            canViewAcademy ? (
              <>
                <Link href="/registrations">
                  <Button variant="primary" size="sm">
                    Review Registrations
                  </Button>
                </Link>
                <Link href="/offerings">
                  <Button variant="outline" size="sm">
                    Manage Offerings
                  </Button>
                </Link>
              </>
            ) : undefined
          }
        />

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 20,
              padding: "14px 16px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 10,
              color: "#991B1B",
              fontSize: "0.875rem",
            }}
          >
            <strong>Operations data is temporarily unavailable.</strong>
            <div style={{ marginTop: 4 }}>{error}</div>
          </div>
        )}

        {/* Section 1: Actionable Priority Queues */}
        <section
          aria-labelledby="priority-queues-heading"
          style={{ marginBottom: 26 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 12,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2
              id="priority-queues-heading"
              style={{
                margin: 0,
                fontSize: "0.8125rem",
                fontWeight: 800,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Needs Attention &amp; Intake Queues
            </h2>
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
              Select any card to open its filtered operational view
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
              gap: "14px",
            }}
          >
            {canViewAcademy && (
              <>
                <Link
                  href="/registrations?status=RECEIVED"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <MetricCard
                    title="Registrations Awaiting Review"
                    value={
                      isDemoMode
                        ? "Isolated"
                        : regSessionsLoading
                          ? "…"
                          : regMetrics
                            ? regMetrics.awaitingReview
                            : regSessionsError
                              ? "Unavailable"
                              : "—"
                    }
                    subtitle={
                      isDemoMode
                        ? "Requires authenticated AAL2 console"
                        : regMetrics
                          ? `${regMetrics.receivedOnly} newly received snapshots`
                          : "Submission snapshots pending review"
                    }
                    variant={
                      regMetrics && regMetrics.awaitingReview > 0
                        ? "warning"
                        : "default"
                    }
                    actionHint="Review"
                    interactive
                  />
                </Link>

                <Link
                  href="/registrations?tab=sessions"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <MetricCard
                    title="Confirmed Intake Capacity"
                    value={
                      isDemoMode
                        ? "Isolated"
                        : regSessionsLoading
                          ? "…"
                          : regMetrics
                            ? `${regMetrics.confirmedSeats} / ${regMetrics.totalCapacity}`
                            : regSessionsError
                              ? "Unavailable"
                              : "—"
                    }
                    subtitle={
                      isDemoMode
                        ? "Live registration sessions isolated"
                        : regMetrics
                          ? `${regMetrics.remainingSeats} places remaining · ${regMetrics.publishedCount} published`
                          : "Published training session seats"
                    }
                    variant={
                      regMetrics &&
                      regMetrics.totalCapacity > 0 &&
                      regMetrics.remainingSeats === 0
                        ? "danger"
                        : "success"
                    }
                    actionHint="Sessions"
                    interactive
                  />
                </Link>

                <Link
                  href="/leads?status=NEW"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <MetricCard
                    title="New Leads"
                    value={
                      leadsLoading
                        ? "…"
                        : leadSummary
                          ? leadSummary.newLeads
                          : leadsError
                            ? "Unavailable"
                            : "—"
                    }
                    subtitle="Awaiting initial contact"
                    variant={
                      leadSummary && leadSummary.newLeads > 0
                        ? "warning"
                        : "default"
                    }
                    actionHint="Open"
                    interactive
                  />
                </Link>

                <Link
                  href="/leads?status=NEEDS_FOLLOW_UP"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <MetricCard
                    title="Needs Follow-up"
                    value={
                      leadsLoading
                        ? "…"
                        : leadSummary
                          ? leadSummary.needsFollowUp
                          : leadsError
                            ? "Unavailable"
                            : "—"
                    }
                    subtitle="New, contacted, or qualified"
                    variant={
                      leadSummary && leadSummary.needsFollowUp > 0
                        ? "warning"
                        : "default"
                    }
                    actionHint="Follow up"
                    interactive
                  />
                </Link>
              </>
            )}

            {canViewFinance ? (
              <Link
                href="/payments?status=ATTENTION"
                style={{ display: "block", textDecoration: "none" }}
              >
                <MetricCard
                  title="Payments Requiring Action"
                  value={
                    loading ? "…" : (metrics?.paymentsAttentionCount ?? "—")
                  }
                  subtitle="Failed or processing payments"
                  variant={
                    metrics && (metrics.paymentsAttentionCount ?? 0) > 0
                      ? "danger"
                      : "default"
                  }
                  actionHint="Inspect"
                  interactive
                />
              </Link>
            ) : (
              <MetricCard
                title="Payments Requiring Action"
                value="Restricted"
                subtitle="Finance roles only"
              />
            )}
          </div>
        </section>

        {/* Section 2: Core Academy Operations Metrics */}
        <section
          aria-labelledby="operations-snapshot-heading"
          style={{ marginBottom: 28 }}
        >
          <h2
            id="operations-snapshot-heading"
            style={{
              margin: "0 0 12px",
              fontSize: "0.8125rem",
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Academy Membership &amp; Schedule Snapshot
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
              gap: "14px",
            }}
          >
            {canViewPlayers ? (
              <Link
                href="/memberships?status=ACTIVE"
                style={{ display: "block", textDecoration: "none" }}
              >
                <MetricCard
                  title="Active Members"
                  value={loading ? "…" : (metrics?.activeMembers ?? "—")}
                  subtitle="Active membership contracts"
                  variant="success"
                  actionHint="View"
                  interactive
                />
              </Link>
            ) : (
              <MetricCard
                title="Active Members"
                value={loading ? "…" : (metrics?.activeMembers ?? "—")}
                subtitle="Active membership contracts"
                variant="success"
              />
            )}

            {canViewPlayers ? (
              <Link
                href="/memberships?status=PENDING"
                style={{ display: "block", textDecoration: "none" }}
              >
                <MetricCard
                  title="Pending Memberships"
                  value={loading ? "…" : (metrics?.pendingMemberships ?? "—")}
                  subtitle="Awaiting activation or payment"
                  variant="warning"
                  actionHint="Review"
                  interactive
                />
              </Link>
            ) : (
              <MetricCard
                title="Pending Memberships"
                value={loading ? "…" : (metrics?.pendingMemberships ?? "—")}
                subtitle="Awaiting activation or payment"
                variant="warning"
              />
            )}

            {canViewPlayers ? (
              <Link
                href="/athletes"
                style={{ display: "block", textDecoration: "none" }}
              >
                <MetricCard
                  title="Total Athletes"
                  value={loading ? "…" : (metrics?.totalAthletes ?? "—")}
                  subtitle="Managed athlete profiles"
                  actionHint="Directory"
                  interactive
                />
              </Link>
            ) : (
              <MetricCard
                title="Total Athletes"
                value={loading ? "…" : (metrics?.totalAthletes ?? "—")}
                subtitle="Managed athlete profiles"
              />
            )}

            {canViewAcademy ? (
              <Link
                href="/offerings?status=OPEN"
                style={{ display: "block", textDecoration: "none" }}
              >
                <MetricCard
                  title="Open Offerings"
                  value={loading ? "…" : (metrics?.openOfferings ?? "—")}
                  subtitle="Offerings accepting members"
                  actionHint="View"
                  interactive
                />
              </Link>
            ) : (
              <MetricCard
                title="Open Offerings"
                value={loading ? "…" : (metrics?.openOfferings ?? "—")}
                subtitle="Offerings accepting members"
              />
            )}

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
            />

            {canViewSessions && (
              <Link
                href="/scheduling"
                style={{ display: "block", textDecoration: "none" }}
              >
                <MetricCard
                  title="Scheduled Sessions"
                  value={
                    sessionsLoading
                      ? "…"
                      : upcomingSessionsCount !== null
                        ? upcomingSessionsCount
                        : "Unavailable"
                  }
                  subtitle="Legacy training sessions scheduled"
                  actionHint="Schedule"
                  interactive
                />
              </Link>
            )}
          </div>
        </section>

        {/* Section 3: Quick Operations & Session Security */}
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
            <h2
              style={{
                margin: 0,
                fontSize: "1.025rem",
                fontWeight: 800,
                color: "#0F172A",
              }}
            >
              Quick operations
            </h2>
            <p
              style={{
                color: "#64748B",
                fontSize: "0.84rem",
                margin: "6px 0 14px",
              }}
            >
              Only tools permitted for your current staff roles are shown.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {availableActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="admin-quick-action"
                  style={{
                    minHeight: 58,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 14px",
                    boxSizing: "border-box",
                    textDecoration: "none",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 9,
                    color: "#0F172A",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: "0.9rem" }}>
                        {action.title}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          color: "#64748B",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {action.group}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "#64748B",
                        fontSize: "0.78rem",
                        marginTop: 3,
                        lineHeight: 1.4,
                      }}
                    >
                      {action.description}
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    style={{
                      color: "#B45309",
                      fontWeight: 800,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    →
                  </span>
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
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.025rem",
                  fontWeight: 800,
                  color: "#0F172A",
                }}
              >
                Session security
              </h2>
              <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                <div
                  style={{
                    paddingBottom: 12,
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
                    Signed in as
                  </div>
                  <strong style={{ color: "#0F172A" }}>
                    {user?.displayName ?? "KHLIM Staff"}
                  </strong>
                  {user?.email && (
                    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      {user.email}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    paddingBottom: 12,
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
                    Access model
                  </div>
                  <strong style={{ color: "#0F172A" }}>
                    {isDemoMode
                      ? "Demo permission preview (non-persisted)"
                      : "Backend RBAC + AAL2 MFA"}
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
                    Snapshot generated
                  </div>
                  <strong style={{ color: "#0F172A" }}>
                    {metrics?.generatedAt
                      ? new Date(metrics.generatedAt).toLocaleString()
                      : isDemoMode
                        ? "Synthetic demo data"
                        : "Waiting for backend"}
                  </strong>
                </div>
              </div>
            </div>

            {isDemoMode && (
              <div
                style={{
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: 10,
                  padding: 14,
                  color: "#78350F",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                }}
              >
                <strong>Demo-only operational previews</strong>
                <p style={{ margin: "6px 0 0" }}>
                  Synthetic figures above demonstrate layout and role-aware
                  navigation only. Live Academy Registrations, training
                  sessions, and consent policies remain isolated until signed in
                  through an authenticated AAL2 session.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
