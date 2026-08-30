"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { MetricCard } from "../../components/ui/MetricCard";
import { Button } from "../../components/ui/Button";
import { useAdminAuth } from "../../lib/auth-context";
import { getAdminOperationsReport } from "../../lib/admin-api";
import type { AdminOperationsReport } from "../../lib/admin-operations-types";
import type { StaffRole } from "../../lib/types";

const REPORTING_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "FINANCE",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
];

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultDateRange() {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  return { from: toDateOnly(fromDate), to: toDateOnly(toDate) };
}

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export default function ReportsPage() {
  const { hasRole } = useAdminAuth();
  const initialRange = defaultDateRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [report, setReport] = useState<AdminOperationsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allowed = hasRole(REPORTING_ROLES);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError("");
    try {
      setReport(await getAdminOperationsReport({ from, to }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The operations report could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [allowed, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function exportCsv() {
    if (!report) return;

    const rows: Array<[string, string | number]> = [
      ["Report from", report.period.from],
      ["Report to", report.period.to],
      ["Report days", report.period.days],
      ["Active memberships", report.memberships.byStatus.ACTIVE],
      ["Pending memberships", report.memberships.byStatus.PENDING],
      ["Suspended memberships", report.memberships.byStatus.SUSPENDED],
      ["Cancelled memberships", report.memberships.byStatus.CANCELLED],
      ["Memberships created in period", report.memberships.createdInPeriod],
      ["Memberships activated in period", report.memberships.activatedInPeriod],
      ["Memberships cancelled in period", report.memberships.cancelledInPeriod],
      ["Sessions scheduled", report.sessions.scheduled],
      ["Sessions completed", report.sessions.completed],
      ["Sessions cancelled", report.sessions.cancelled],
      ["Attendance present", report.attendance.present],
      ["Attendance late", report.attendance.late],
      ["Attendance absent", report.attendance.absent],
      ["Attendance excused", report.attendance.excused],
      ["Attendance rate percent", report.attendance.attendanceRate],
      ["Open offerings", report.capacity.openOfferings],
      ["Total capacity", report.capacity.totalCapacity],
      ["Occupied places", report.capacity.occupiedPlaces],
      ["Available places", report.capacity.availablePlaces],
      ["Capacity utilisation percent", report.capacity.utilisationRate],
      ["Editorial ready for review", report.editorial.readyForReview],
      [
        "Editorial blocked on verification",
        report.editorial.verificationBlocked,
      ],
      ["Editorial published", report.editorial.published],
    ];

    if (report.finance) {
      rows.push(["Paid payments", report.finance.paidPayments]);
      rows.push(["Failed payments", report.finance.failedPayments]);
      for (const currency of report.finance.currencyBreakdown) {
        rows.push([
          `Paid amount ${currency.currency} (minor units)`,
          currency.paidAmountMinor,
        ]);
      }
    }

    const csv = [
      "Metric,Value",
      ...rows.map(
        ([label, value]) =>
          `"${String(label).replaceAll('"', '""')}","${String(value).replaceAll('"', '""')}"`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `khlim-operations-report-${report.period.from}-to-${report.period.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!allowed) {
    return (
      <AdminShell>
        <PageHeader
          title="Reports"
          subtitle="Operational reporting is limited to approved leadership and reporting roles."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Reports" },
          ]}
        />
        <div className="restricted-card">
          <h2>Reporting access restricted</h2>
          <p>
            Your current staff role does not include academy reporting access.
            Ask Management if you need this information for your duties.
          </p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Operations Reports"
          subtitle="Review bounded, persisted academy activity without synthetic trends or estimated financial results."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Reports" },
          ]}
        />

        <section className="report-controls" aria-label="Report date range">
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <Button onClick={() => void load()} isLoading={loading}>
            Refresh report
          </Button>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!report || loading}
          >
            Export CSV
          </Button>
        </section>

        {error && (
          <div className="error-card" role="alert">
            <strong>Report unavailable.</strong> {error}
          </div>
        )}

        {report && (
          <>
            <div className="report-meta" role="status">
              <strong>
                {report.period.from} to {report.period.to}
              </strong>
              <span>
                {report.period.days} days · generated from persisted records at{" "}
                {new Date(report.generatedAt).toLocaleString()}
              </span>
            </div>

            <section className="metric-grid" aria-label="Report highlights">
              <MetricCard
                title="Active Memberships"
                value={report.memberships.byStatus.ACTIVE}
                subtitle={`${report.memberships.activatedInPeriod} activated in selected period`}
              />
              <MetricCard
                title="Attendance Rate"
                value={`${report.attendance.attendanceRate}%`}
                subtitle="Present + late, excluding excused records from the denominator"
                variant="success"
              />
              <MetricCard
                title="Capacity Utilisation"
                value={`${report.capacity.utilisationRate}%`}
                subtitle={`${report.capacity.availablePlaces} places currently available across open offerings`}
              />
              <MetricCard
                title="Completed Sessions"
                value={report.sessions.completed}
                subtitle={`${report.sessions.cancelled} cancelled in selected period`}
              />
              <MetricCard
                title="New Memberships"
                value={report.memberships.createdInPeriod}
                subtitle={`${report.memberships.cancelledInPeriod} cancelled in selected period`}
              />
              <MetricCard
                title="Editorial Review Queue"
                value={report.editorial.readyForReview}
                subtitle={`${report.editorial.verificationBlocked} blocked on verification`}
                variant={
                  report.editorial.readyForReview > 0 ? "warning" : "default"
                }
              />
            </section>

            <div className="report-grid">
              <section className="report-card">
                <h2>Membership snapshot</h2>
                <dl>
                  {Object.entries(report.memberships.byStatus).map(
                    ([status, count]) => (
                      <div key={status}>
                        <dt>{status.replaceAll("_", " ")}</dt>
                        <dd>{count}</dd>
                      </div>
                    ),
                  )}
                </dl>
              </section>

              <section className="report-card">
                <h2>Sessions & attendance</h2>
                <dl>
                  <div>
                    <dt>Scheduled sessions</dt>
                    <dd>{report.sessions.scheduled}</dd>
                  </div>
                  <div>
                    <dt>Completed sessions</dt>
                    <dd>{report.sessions.completed}</dd>
                  </div>
                  <div>
                    <dt>Cancelled sessions</dt>
                    <dd>{report.sessions.cancelled}</dd>
                  </div>
                  <div>
                    <dt>Present</dt>
                    <dd>{report.attendance.present}</dd>
                  </div>
                  <div>
                    <dt>Late</dt>
                    <dd>{report.attendance.late}</dd>
                  </div>
                  <div>
                    <dt>Absent</dt>
                    <dd>{report.attendance.absent}</dd>
                  </div>
                  <div>
                    <dt>Excused</dt>
                    <dd>{report.attendance.excused}</dd>
                  </div>
                </dl>
              </section>

              <section className="report-card">
                <h2>Capacity snapshot</h2>
                <dl>
                  <div>
                    <dt>Open offerings</dt>
                    <dd>{report.capacity.openOfferings}</dd>
                  </div>
                  <div>
                    <dt>Total capacity</dt>
                    <dd>{report.capacity.totalCapacity}</dd>
                  </div>
                  <div>
                    <dt>Occupied places</dt>
                    <dd>{report.capacity.occupiedPlaces}</dd>
                  </div>
                  <div>
                    <dt>Available places</dt>
                    <dd>{report.capacity.availablePlaces}</dd>
                  </div>
                </dl>
              </section>

              <section className="report-card">
                <h2>Editorial oversight</h2>
                <dl>
                  <div>
                    <dt>Ready for management review</dt>
                    <dd>{report.editorial.readyForReview}</dd>
                  </div>
                  <div>
                    <dt>Verification blocked</dt>
                    <dd>{report.editorial.verificationBlocked}</dd>
                  </div>
                  <div>
                    <dt>Published</dt>
                    <dd>{report.editorial.published}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="report-card finance-card">
              <h2>Finance visibility</h2>
              {report.finance ? (
                <>
                  <p>
                    Settled and failed payment activity for the selected period.
                    This report never exposes raw card numbers or CVVs.
                  </p>
                  <div className="finance-summary">
                    <MetricCard
                      title="Paid Payments"
                      value={report.finance.paidPayments}
                    />
                    <MetricCard
                      title="Failed Payments"
                      value={report.finance.failedPayments}
                      variant={
                        report.finance.failedPayments > 0
                          ? "warning"
                          : "default"
                      }
                    />
                  </div>
                  {report.finance.currencyBreakdown.length === 0 ? (
                    <p>No settled payments were recorded in this period.</p>
                  ) : (
                    <dl>
                      {report.finance.currencyBreakdown.map((currency) => (
                        <div key={currency.currency}>
                          <dt>
                            {currency.currency} settled ({currency.paidPayments}{" "}
                            payments)
                          </dt>
                          <dd>
                            {formatMoney(
                              currency.paidAmountMinor,
                              currency.currency,
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              ) : (
                <p>
                  Financial totals are hidden for this role. Operational metrics
                  remain available without exposing payment aggregates.
                </p>
              )}
            </section>
          </>
        )}

        <style jsx>{`
          .report-controls,
          .report-card,
          .report-meta,
          .restricted-card,
          .error-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .report-controls {
            padding: 16px;
            display: grid;
            grid-template-columns: minmax(160px, 1fr) minmax(
                160px,
                1fr
              ) auto auto;
            gap: 12px;
            align-items: end;
            margin-bottom: 20px;
          }
          label {
            display: grid;
            gap: 6px;
            font-size: 0.8125rem;
            font-weight: 700;
            color: #334155;
          }
          input {
            min-height: 44px;
            box-sizing: border-box;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 10px;
            font: inherit;
          }
          .report-meta,
          .error-card,
          .restricted-card {
            padding: 16px;
            margin-bottom: 20px;
          }
          .report-meta {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: #475569;
            font-size: 0.8125rem;
          }
          .report-meta strong {
            color: #0f172a;
          }
          .error-card {
            border-color: #fecaca;
            background: #fef2f2;
            color: #991b1b;
          }
          .metric-grid,
          .finance-summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 20px;
          }
          .report-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 16px;
          }
          .report-card {
            padding: 18px;
          }
          .report-card h2,
          .restricted-card h2 {
            margin: 0 0 12px;
            font-size: 1rem;
            color: #0f172a;
          }
          .report-card p,
          .restricted-card p {
            color: #475569;
            line-height: 1.55;
          }
          dl {
            margin: 0;
          }
          dl > div {
            min-height: 42px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 1px solid #f1f5f9;
          }
          dl > div:last-child {
            border-bottom: 0;
          }
          dt {
            color: #475569;
            font-size: 0.8125rem;
          }
          dd {
            margin: 0;
            color: #0f172a;
            font-weight: 800;
          }
          .finance-card {
            margin-bottom: 20px;
          }
          .finance-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          @media (max-width: 900px) {
            .report-controls,
            .metric-grid,
            .report-grid,
            .finance-summary {
              grid-template-columns: 1fr;
            }
            .report-meta {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
