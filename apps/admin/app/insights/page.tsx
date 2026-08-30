"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "../../components/layout/AdminShell";
import { Button } from "../../components/ui/Button";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import type { AdminOperationalHealth } from "../../lib/admin-observability-types";
import { useAdminAuth } from "../../lib/auth-context";
import { getAdminOperationalHealth } from "../../lib/observability-api";
import type { StaffRole } from "../../lib/types";

const REPORTING_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "FINANCE",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
];

interface HealthSignalProps {
  title: string;
  value: number;
  explanation: string;
  href: string;
  action: string;
}

function HealthSignal({
  title,
  value,
  explanation,
  href,
  action,
}: HealthSignalProps) {
  const needsAttention = value > 0;

  return (
    <article className={needsAttention ? "signal attention" : "signal clear"}>
      <div className="signal-copy">
        <div className="signal-title-row">
          <h3>{title}</h3>
          <span className="signal-count">{value}</span>
        </div>
        <p>{explanation}</p>
        <strong>
          {needsAttention ? "Needs review" : "No current backlog"}
        </strong>
      </div>
      <Link className="review-link" href={href}>
        {action}
      </Link>
    </article>
  );
}

function formatMovement(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export default function AdminInsightsPage() {
  const { canAccessFinance, hasRole, isDemoMode } = useAdminAuth();
  const allowed = hasRole(REPORTING_ROLES);
  const canViewFinance = canAccessFinance();
  const [health, setHealth] = useState<AdminOperationalHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError("");
    try {
      setHealth(await getAdminOperationalHealth());
    } catch (loadError) {
      setHealth(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Operational health data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  const financeSignals = useMemo(() => {
    if (!health?.finance) return [];
    return [
      {
        title: "Failed payments in window",
        value: health.finance.failedPaymentsInWindow,
        explanation: `Failed payment attempts recorded during the ${health.window.days}-day KPI window.`,
      },
      {
        title: "Payments processing too long",
        value: health.finance.staleProcessingPayments,
        explanation: `Payments still PROCESSING after ${health.thresholds.staleProcessingPaymentMinutes} minutes.`,
      },
      {
        title: "Provider events needing action",
        value: health.finance.providerEventsActionRequired,
        explanation:
          "Provider webhook events explicitly marked ACTION_REQUIRED.",
      },
      {
        title: "Provider event failures",
        value: health.finance.providerEventsFailed,
        explanation:
          "Provider webhook events whose processing status is FAILED.",
      },
      {
        title: "Provider events waiting too long",
        value: health.finance.providerEventsStuckReceived,
        explanation: `Provider events still RECEIVED after ${health.thresholds.stuckProviderEventMinutes} minutes.`,
      },
    ];
  }, [health]);

  if (!allowed) {
    return (
      <AdminShell>
        <PageHeader
          title="KPI & Operational Health"
          subtitle="Operational performance and reliability signals are limited to authorised reporting roles."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "KPI & Health" },
          ]}
        />
        <div className="restricted-card">
          <h2>Reporting access required</h2>
          <p>
            This page is available to Management, Finance Admin, Academy Admin,
            Head Coach, and Super Admin roles with MFA.
          </p>
          <Link className="review-link" href="/">
            Return to Dashboard
          </Link>
        </div>
        <style jsx>{sharedStyles}</style>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="KPI & Operational Health"
          subtitle="A current management view of persisted academy performance, workflow backlogs, and reliability signals."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "KPI & Health" },
          ]}
          badge={
            <span className={error ? "status-badge error" : "status-badge"}>
              {isDemoMode
                ? "● DEMO SNAPSHOT"
                : error
                  ? "● DATA ATTENTION"
                  : loading
                    ? "● REFRESHING"
                    : "● PERSISTED SNAPSHOT"}
            </span>
          }
          actions={
            <Button
              variant="outline"
              onClick={() => void load()}
              isLoading={loading}
              style={{ minHeight: 44 }}
            >
              Refresh health data
            </Button>
          }
        />

        <div className="method-note">
          <strong>What this page means:</strong> KPI values use the latest 30
          days of persisted records unless labelled as a current backlog. There
          are no predicted, estimated, or synthetic trends in live mode.
        </div>

        {error && (
          <div className="error-card" role="alert">
            <strong>Operational health data is unavailable.</strong> {error}
          </div>
        )}

        <section aria-labelledby="kpi-heading">
          <div className="section-heading">
            <div>
              <h2 id="kpi-heading">30-day academy KPIs</h2>
              <p>
                Performance signals calculated directly from memberships,
                sessions, attendance, capacity, and notification receipts.
              </p>
            </div>
            <Link className="review-link" href="/reports">
              Open detailed reports
            </Link>
          </div>

          <div className="metric-grid">
            <MetricCard
              title="Active Memberships"
              value={loading ? "…" : (health?.kpis.activeMemberships ?? "—")}
              subtitle="Current active membership contracts"
              variant="success"
            />
            <MetricCard
              title="Net Membership Movement"
              value={
                loading
                  ? "…"
                  : health
                    ? formatMovement(health.kpis.netMembershipMovement)
                    : "—"
              }
              subtitle={
                health
                  ? `${health.kpis.membershipActivations} activated − ${health.kpis.membershipCancellations} cancelled`
                  : "Activations minus cancellations"
              }
              variant={
                health && health.kpis.netMembershipMovement < 0
                  ? "warning"
                  : "default"
              }
            />
            <MetricCard
              title="Attendance Rate"
              value={
                loading ? "…" : health ? `${health.kpis.attendanceRate}%` : "—"
              }
              subtitle="Present + late, excluding excused records"
              variant={
                health && health.kpis.attendanceRate < 80
                  ? "warning"
                  : "success"
              }
            />
            <MetricCard
              title="Session Completion"
              value={
                loading
                  ? "…"
                  : health
                    ? `${health.kpis.sessionCompletionRate}%`
                    : "—"
              }
              subtitle="Completed share of completed + cancelled sessions"
              variant={
                health && health.kpis.sessionCompletionRate < 85
                  ? "warning"
                  : "success"
              }
            />
            <MetricCard
              title="Capacity Utilisation"
              value={
                loading
                  ? "…"
                  : health
                    ? `${health.kpis.capacityUtilisationRate}%`
                    : "—"
              }
              subtitle="Places held across currently open offerings"
            />
            <MetricCard
              title="Notification Read Rate"
              value={
                loading
                  ? "…"
                  : health
                    ? `${health.kpis.notificationReadRate}%`
                    : "—"
              }
              subtitle={
                health
                  ? `${health.kpis.notificationsCreated} notifications created in the window`
                  : "Read receipts across recent notifications"
              }
            />
          </div>
        </section>

        <section className="section-card" aria-labelledby="backlog-heading">
          <div className="section-heading compact">
            <div>
              <h2 id="backlog-heading">Operational backlog</h2>
              <p>
                Counts above zero identify records that should be reviewed by
                staff. They are not automated incident declarations.
              </p>
            </div>
          </div>

          <div className="signal-grid">
            <HealthSignal
              title="Pending memberships older than threshold"
              value={health?.workload.stalePendingMemberships ?? 0}
              explanation={`Pending memberships older than ${health?.thresholds.stalePendingMembershipHours ?? 24} hours.`}
              href="/memberships"
              action="Review memberships"
            />
            <HealthSignal
              title="Past sessions still marked scheduled"
              value={health?.workload.overdueScheduledSessions ?? 0}
              explanation="Sessions whose end time has passed but still remain SCHEDULED."
              href="/scheduling"
              action="Review scheduling"
            />
            <HealthSignal
              title="Editorial drafts blocked on verification"
              value={health?.workload.editorialBlocked ?? 0}
              explanation="Draft content still requires fact and photo-rights verification."
              href="/editorial"
              action="Open Editorial Studio"
            />
            <HealthSignal
              title="Unread notification receipts"
              value={health?.workload.unreadNotificationReceipts ?? 0}
              explanation="Notification receipts created in the KPI window that have not been marked read."
              href="/notifications"
              action="Review notifications"
            />
          </div>
        </section>

        <section
          className="section-card"
          aria-labelledby="finance-health-heading"
        >
          <div className="section-heading compact">
            <div>
              <h2 id="finance-health-heading">Payment processing health</h2>
              <p>
                Finance-specific reliability signals stay hidden from roles that
                are not authorised for payment operations.
              </p>
            </div>
            {canViewFinance && (
              <Link className="review-link" href="/payments">
                Open payment operations
              </Link>
            )}
          </div>

          {canViewFinance && health?.finance ? (
            <div className="finance-grid">
              {financeSignals.map((signal) => (
                <article
                  className={
                    signal.value > 0
                      ? "finance-signal attention"
                      : "finance-signal clear"
                  }
                  key={signal.title}
                >
                  <span>{signal.title}</span>
                  <strong>{signal.value}</strong>
                  <p>{signal.explanation}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="restricted-inline">
              <strong>Financial processing signals are restricted.</strong>
              <span>
                Finance Admin and Management roles can view this section.
              </span>
            </div>
          )}
        </section>

        <footer className="snapshot-footer">
          <div>
            <strong>Snapshot generated</strong>
            <span>
              {health?.generatedAt
                ? new Date(health.generatedAt).toLocaleString()
                : loading
                  ? "Refreshing…"
                  : "Not available"}
            </span>
          </div>
          <div>
            <strong>Fixed reliability thresholds</strong>
            <span>
              Membership pending{" "}
              {health?.thresholds.stalePendingMembershipHours ?? 24}h · Payment
              processing{" "}
              {health?.thresholds.staleProcessingPaymentMinutes ?? 30}m ·
              Provider event waiting{" "}
              {health?.thresholds.stuckProviderEventMinutes ?? 15}m
            </span>
          </div>
        </footer>

        <style jsx>{sharedStyles}</style>
      </div>
    </AdminShell>
  );
}

const sharedStyles = `
  .status-badge {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 4px 9px;
    border-radius: 999px;
    border: 1px solid #a7f3d0;
    background: #ecfdf5;
    color: #065f46;
    font-size: 0.75rem;
    font-weight: 800;
  }
  .status-badge.error {
    border-color: #fecaca;
    background: #fef2f2;
    color: #991b1b;
  }
  .method-note,
  .error-card,
  .restricted-card,
  .section-card,
  .snapshot-footer {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }
  .method-note {
    margin-bottom: 20px;
    padding: 14px 16px;
    background: #f8fafc;
    color: #334155;
    line-height: 1.55;
    font-size: 0.875rem;
  }
  .error-card {
    margin-bottom: 20px;
    padding: 14px 16px;
    border-color: #fecaca;
    background: #fef2f2;
    color: #991b1b;
  }
  .restricted-card {
    padding: 20px;
  }
  .restricted-card h2 {
    margin-top: 0;
  }
  .restricted-card p {
    color: #475569;
    line-height: 1.55;
  }
  .section-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin: 0 0 14px;
  }
  .section-heading.compact {
    align-items: flex-start;
  }
  .section-heading h2 {
    margin: 0;
    color: #0f172a;
    font-size: 1.125rem;
  }
  .section-heading p {
    margin: 5px 0 0;
    color: #64748b;
    line-height: 1.5;
    font-size: 0.8125rem;
  }
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    margin-bottom: 24px;
  }
  .section-card {
    padding: 18px;
    margin-bottom: 18px;
  }
  .signal-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .signal {
    min-width: 0;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
  }
  .signal.attention,
  .finance-signal.attention {
    border-color: #fcd34d;
    background: #fffbeb;
  }
  .signal.clear,
  .finance-signal.clear {
    border-color: #bbf7d0;
    background: #f0fdf4;
  }
  .signal-copy {
    min-width: 0;
  }
  .signal-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .signal h3 {
    margin: 0;
    color: #0f172a;
    font-size: 0.875rem;
  }
  .signal p,
  .finance-signal p {
    margin: 6px 0;
    color: #475569;
    line-height: 1.45;
    font-size: 0.75rem;
  }
  .signal-copy > strong {
    color: #334155;
    font-size: 0.75rem;
  }
  .signal-count {
    flex-shrink: 0;
    min-width: 32px;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ffffff;
    color: #0f172a;
    font-weight: 900;
  }
  .review-link {
    min-height: 44px;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #0f172a;
    padding: 8px 12px;
    font-size: 0.8125rem;
    font-weight: 750;
    text-decoration: none;
    text-align: center;
  }
  .finance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }
  .finance-signal {
    min-width: 0;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
  }
  .finance-signal > span {
    display: block;
    color: #475569;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .finance-signal > strong {
    display: block;
    margin-top: 6px;
    color: #0f172a;
    font-size: 1.5rem;
  }
  .restricted-inline {
    min-height: 58px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    padding: 12px 14px;
    border-radius: 9px;
    background: #f8fafc;
    color: #475569;
    font-size: 0.8125rem;
  }
  .restricted-inline strong {
    color: #0f172a;
  }
  .snapshot-footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    padding: 14px 16px;
    color: #475569;
    font-size: 0.75rem;
  }
  .snapshot-footer > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .snapshot-footer strong {
    color: #0f172a;
  }
  @media (max-width: 720px) {
    .section-heading,
    .signal,
    .snapshot-footer {
      grid-template-columns: 1fr;
      flex-direction: column;
      align-items: stretch;
    }
    .signal-grid {
      grid-template-columns: 1fr;
    }
    .snapshot-footer {
      display: grid;
    }
    .review-link {
      width: 100%;
    }
  }
  @media (max-width: 420px) {
    .section-card,
    .restricted-card {
      padding: 14px;
    }
    .metric-grid {
      grid-template-columns: 1fr;
    }
  }
`;
