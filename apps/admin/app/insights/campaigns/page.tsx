"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { AdminShell } from "../../../components/layout/AdminShell";
import { PageHeader } from "../../../components/ui/PageHeader";
import { MetricCard } from "../../../components/ui/MetricCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { LoadingState } from "../../../components/ui/LoadingState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useAdminAuth } from "../../../lib/auth-context";
import {
  getAdminCampaignAnalytics,
  type AdminCampaignAnalyticsResponse,
  type AdminCampaignStatusCounts,
} from "../../../lib/admin-api";

type DatePreset = "event-day" | "october" | "campaign-window" | "custom";

export const MAX_CUSTOM_WINDOW_DAYS = 100;

const PRESETS: Array<{
  id: DatePreset;
  label: string;
  start: string;
  end: string;
}> = [
  {
    id: "event-day",
    label: "24 Oct 2026 (Event Day)",
    start: "2026-10-24",
    end: "2026-10-24",
  },
  {
    id: "october",
    label: "October 2026",
    start: "2026-10-01",
    end: "2026-10-31",
  },
  {
    id: "campaign-window",
    label: "Campaign Window (Aug–Oct)",
    start: "2026-08-01",
    end: "2026-10-31",
  },
];

function formatKHLIMDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

export default function CampaignAnalyticsPage() {
  const { user, hasRole, isAuthenticated, isDemoMode, mfaSatisfied } =
    useAdminAuth();
  const staffUserId = user?.id || null;
  const canView = hasRole(["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"]);
  const isEligible =
    canView && (isDemoMode || (isAuthenticated && mfaSatisfied));

  const [activePreset, setActivePreset] = useState<DatePreset>("event-day");
  const [startDateInput, setStartDateInput] = useState("2026-10-24");
  const [endDateInput, setEndDateInput] = useState("2026-10-24");
  const [appliedStart, setAppliedStart] = useState("2026-10-24");
  const [appliedEnd, setAppliedEnd] = useState("2026-10-24");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [analytics, setAnalytics] =
    useState<AdminCampaignAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestSeq = useRef(0);

  // Invalidate when auth/session changes
  useLayoutEffect(() => {
    requestSeq.current += 1;
    setAnalytics(null);
    setError(null);
  }, [staffUserId, isEligible]);

  const fetchAnalytics = useCallback(async () => {
    if (!isEligible) {
      requestSeq.current += 1;
      setAnalytics(null);
      setError(null);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setAnalytics(null);
    setLoading(true);
    setError(null);

    try {
      const data = await getAdminCampaignAnalytics({
        campaign: "3x3-oct24",
        startDate: appliedStart || undefined,
        endDate: appliedEnd || undefined,
      });

      if (seq === requestSeq.current) {
        setAnalytics(data);
      }
    } catch (err: unknown) {
      if (seq === requestSeq.current) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load campaign analytics.";
        setError(msg);
      }
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
      }
    }
  }, [isEligible, appliedStart, appliedEnd]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const handleSelectPreset = (preset: (typeof PRESETS)[number]) => {
    setAnalytics(null);
    setLoading(true);
    setActivePreset(preset.id);
    setStartDateInput(preset.start);
    setEndDateInput(preset.end);
    setAppliedStart(preset.start);
    setAppliedEnd(preset.end);
    setValidationError(null);
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateInput || !endDateInput) {
      setValidationError("Please select both a start and end date.");
      return;
    }
    if (startDateInput > endDateInput) {
      setValidationError("Start date cannot be after end date.");
      return;
    }
    const startObj = new Date(`${startDateInput}T00:00:00.000+08:00`);
    const endObj = new Date(`${endDateInput}T00:00:00.000+08:00`);
    const diffDays =
      Math.round((endObj.getTime() - startObj.getTime()) / 86400000) + 1;
    if (diffDays > MAX_CUSTOM_WINDOW_DAYS) {
      setValidationError(
        `Selected window of ${diffDays} days exceeds maximum allowed limit of ${MAX_CUSTOM_WINDOW_DAYS} days.`,
      );
      return;
    }
    setValidationError(null);
    setAnalytics(null);
    setLoading(true);
    setActivePreset("custom");
    setAppliedStart(startDateInput);
    setAppliedEnd(endDateInput);
  };

  if (!isEligible) {
    return (
      <AdminShell>
        <div style={{ minWidth: 0 }}>
          <PageHeader
            title="3x3 Campaign Analytics"
            subtitle="Acquisition and conversion metrics for the 24 Oct 2026 3x3 tournament."
            breadcrumbs={[
              { label: "Insights", href: "/insights" },
              { label: "3x3 Campaign" },
            ]}
          />
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px dashed #CBD5E1",
              color: "#64748B",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔒</div>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#0F172A",
                margin: 0,
              }}
            >
              Restricted Access
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                marginTop: "6px",
                maxWidth: "420px",
                margin: "6px auto 0",
              }}
            >
              Access to Campaign Analytics is restricted to Academy Admin,
              Management, and Super Admin staff with verified MFA sessions.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  const leads = analytics?.leads;
  const traffic = analytics?.traffic;
  const period = analytics?.period;

  return (
    <AdminShell>
      <div style={{ minWidth: 0 }}>
        <PageHeader
          title="3x3 Campaign Analytics"
          subtitle="End-to-end attribution, engagement, and conversion tracking for the 24 Oct 2026 3x3 tournament."
          breadcrumbs={[
            { label: "Insights", href: "/insights" },
            { label: "3x3 Campaign" },
          ]}
          badge={
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  background: "#FEF3C7",
                  color: "#92400E",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  border: "1px solid #FDE68A",
                  fontFamily: "monospace",
                }}
              >
                3x3-oct24
              </span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  background: "#F1F5F9",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  border: "1px solid #CBD5E1",
                }}
              >
                MYT (UTC+8)
              </span>
            </div>
          }
          actions={
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Link
                href="/leads?source=3x3-oct24"
                style={{ textDecoration: "none" }}
              >
                <Button variant="secondary" size="sm">
                  Review 3x3 Leads in Inbox →
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "↻ Refresh"}
              </Button>
            </div>
          }
        />

        {isDemoMode && (
          <div
            style={{
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              color: "#1E40AF",
              padding: "10px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "0.875rem",
            }}
          >
            ℹ️ Demo mode: Showing synthetic campaign analytics data.
          </div>
        )}

        {/* Date Filter Bar */}
        <section
          aria-label="Campaign Date Filter"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            padding: "16px 20px",
            marginBottom: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginRight: "4px",
                }}
              >
                Period:
              </span>
              {PRESETS.map((p) => {
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "0.8125rem",
                      fontWeight: isActive ? 700 : 500,
                      border: isActive
                        ? "1px solid #F59E0B"
                        : "1px solid #CBD5E1",
                      backgroundColor: isActive ? "#FEF3C7" : "#FFFFFF",
                      color: isActive ? "#92400E" : "#334155",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      minHeight: "44px",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleApplyCustomDates}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <label
                  htmlFor="campaign-start-date"
                  style={{
                    fontSize: "0.8125rem",
                    color: "#64748B",
                    fontWeight: 500,
                  }}
                >
                  From:
                </label>
                <input
                  id="campaign-start-date"
                  type="date"
                  value={startDateInput}
                  onChange={(e) => {
                    setStartDateInput(e.target.value);
                    setActivePreset("custom");
                  }}
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.8125rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#FFFFFF",
                    color: "#0F172A",
                    minHeight: "44px",
                  }}
                />
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <label
                  htmlFor="campaign-end-date"
                  style={{
                    fontSize: "0.8125rem",
                    color: "#64748B",
                    fontWeight: 500,
                  }}
                >
                  To:
                </label>
                <input
                  id="campaign-end-date"
                  type="date"
                  value={endDateInput}
                  onChange={(e) => {
                    setEndDateInput(e.target.value);
                    setActivePreset("custom");
                  }}
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.8125rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#FFFFFF",
                    color: "#0F172A",
                    minHeight: "44px",
                  }}
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={loading}
              >
                Apply
              </Button>
            </form>
          </div>

          {validationError && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "0.8125rem",
                color: "#DC2626",
                fontWeight: 500,
              }}
            >
              ⚠️ {validationError}
            </div>
          )}
        </section>

        {error && (
          <div style={{ marginBottom: "24px" }}>
            <ErrorState
              title="Failed to Load Campaign Analytics"
              message={error}
              onRetry={fetchAnalytics}
            />
          </div>
        )}

        {loading && !analytics && (
          <div style={{ padding: "48px 0" }}>
            <LoadingState message="Loading 3x3 campaign analytics..." />
          </div>
        )}

        {analytics && (
          <>
            {/* Overview Metric Cards */}
            <section
              aria-label="Campaign Overview Metrics"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <MetricCard
                title="Confirmed Leads"
                value={leads?.totalLeads ?? 0}
                subtitle="Authoritative database leads"
                icon="📋"
                variant="default"
              />
              <MetricCard
                title="Enrolled Athletes"
                value={leads?.enrolledCount ?? 0}
                subtitle="Official academy squad enrolments"
                icon="🏅"
                variant="success"
              />
              <MetricCard
                title="Lead-to-Enrolled Rate"
                value={`${leads?.enrolledRate ?? 0}%`}
                subtitle="Authoritative conversion rate"
                icon="📈"
                variant={(leads?.enrolledRate ?? 0) > 0 ? "success" : "default"}
              />
              <MetricCard
                title="Observable Campaign Sessions"
                value={
                  traffic?.observableLandingSessions !== null &&
                  traffic?.observableLandingSessions !== undefined
                    ? traffic.observableLandingSessions
                    : "—"
                }
                subtitle={
                  traffic?.status === "AVAILABLE"
                    ? "PostHog US Cloud (Consented sessions)"
                    : traffic?.status === "CONFIG_REQUIRED"
                      ? "Server key config required"
                      : "PostHog query unavailable"
                }
                icon="👁️"
                variant={
                  traffic?.status === "AVAILABLE"
                    ? "default"
                    : traffic?.status === "CONFIG_REQUIRED"
                      ? "warning"
                      : "danger"
                }
              />
            </section>

            {/* PostHog Traffic Health & Scope Banner */}
            <section
              aria-label="PostHog Traffic Health & Attribution Notice"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                padding: "18px 20px",
                marginBottom: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <h3
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: "#0F172A",
                      margin: 0,
                    }}
                  >
                    PostHog Analytics Integration
                  </h3>
                  {traffic?.status === "AVAILABLE" && (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "#ECFDF5",
                        color: "#065F46",
                        border: "1px solid #A7F3D0",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      ● AVAILABLE (Project 652783)
                    </span>
                  )}
                  {traffic?.status === "CONFIG_REQUIRED" && (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "#FFFBEB",
                        color: "#92400E",
                        border: "1px solid #FDE68A",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      ▲ CONFIG_REQUIRED
                    </span>
                  )}
                  {traffic?.status === "ERROR" && (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "#FEF2F2",
                        color: "#991B1B",
                        border: "1px solid #FECACA",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      ✕ QUERY_ERROR
                    </span>
                  )}
                </div>

                {traffic?.lastRefreshedAt && (
                  <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                    Last queried: {formatKHLIMDateTime(traffic.lastRefreshedAt)}
                  </span>
                )}
              </div>

              {traffic?.status === "CONFIG_REQUIRED" && (
                <div
                  style={{
                    backgroundColor: "#FFFBEB",
                    border: "1px solid #FDE68A",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginBottom: "12px",
                    fontSize: "0.8125rem",
                    color: "#92400E",
                  }}
                >
                  <strong>Server configuration note:</strong>{" "}
                  {traffic.reason ||
                    "Server-side PostHog query API key is not configured. Traffic aggregation is disabled, but database lead metrics remain fully operational."}
                </div>
              )}

              {traffic?.status === "ERROR" && (
                <div
                  style={{
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginBottom: "12px",
                    fontSize: "0.8125rem",
                    color: "#991B1B",
                  }}
                >
                  <strong>Traffic query error:</strong>{" "}
                  {traffic.reason ||
                    "Could not query PostHog HogQL API. Database lead metrics are unaffected."}
                </div>
              )}

              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#64748B",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {analytics.methodologyNote}
              </p>

              <div
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginTop: "12px",
                  fontSize: "0.8125rem",
                  color: "#475569",
                  lineHeight: 1.5,
                }}
              >
                <strong>Attribution & Measurement Notice:</strong> Physical QR
                code scans at the 24 Oct event differ from observable web
                sessions. Visitors who decline analytics consent or browse
                privately are not tracked in PostHog, but their submitted
                registrations are authoritatively recorded in the database.
                Visitor-to-lead rates are not synthesized across incompatible
                consented and database cohorts.
              </div>
            </section>

            {/* Funnel Stage Breakdown */}
            <section
              aria-label="Conversion Funnel Breakdown"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                padding: "20px",
                marginBottom: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#0F172A",
                      margin: 0,
                    }}
                  >
                    Campaign Conversion Funnel
                  </h2>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "#64748B",
                      marginTop: "4px",
                      marginBottom: 0,
                    }}
                  >
                    Observable web engagement through to enrolled squad
                    athletes.
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748B",
                    backgroundColor: "#F8FAFC",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  Campaign: <strong>3x3-oct24</strong>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* Step 1: Landings */}
                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "130px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: "#64748B",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Step 1 · Traffic
                    </span>
                    <h4
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#0F172A",
                        marginTop: "4px",
                        marginBottom: "8px",
                      }}
                    >
                      Observable Campaign Sessions
                    </h4>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#0F172A",
                      }}
                    >
                      {traffic?.observableLandingSessions ?? "—"}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      Consented sessions across Home/Academy
                    </span>
                  </div>
                </div>

                {/* Step 2: Form Engagement */}
                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "130px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: "#64748B",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Step 2 · Engagement
                    </span>
                    <h4
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#0F172A",
                        marginTop: "4px",
                        marginBottom: "8px",
                      }}
                    >
                      Interest Form Views
                    </h4>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#0F172A",
                      }}
                    >
                      {traffic?.interestFormEngagement ?? "—"}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      {traffic?.observableLandingSessions &&
                      traffic.interestFormEngagement
                        ? `${(
                            (traffic.interestFormEngagement /
                              traffic.observableLandingSessions) *
                            100
                          ).toFixed(1)}% of landings`
                        : "Consented form views"}
                    </span>
                  </div>
                </div>

                {/* Step 3: Confirmed Leads */}
                <div
                  style={{
                    backgroundColor: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "130px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: "#1D4ED8",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Step 3 · Authority
                    </span>
                    <h4
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#1E3A8A",
                        marginTop: "4px",
                        marginBottom: "8px",
                      }}
                    >
                      Confirmed Leads
                    </h4>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#1D4ED8",
                      }}
                    >
                      {leads?.totalLeads ?? 0}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#3B82F6" }}>
                      Authoritative DB records
                    </span>
                  </div>
                </div>

                {/* Step 4: Contacted / Qualified */}
                <div
                  style={{
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "130px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: "#64748B",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Step 4 · Follow-Up
                    </span>
                    <h4
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#0F172A",
                        marginTop: "4px",
                        marginBottom: "8px",
                      }}
                    >
                      Contacted & Qualified
                    </h4>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#0F172A",
                      }}
                    >
                      {(leads?.byStatus.CONTACTED ?? 0) +
                        (leads?.byStatus.QUALIFIED ?? 0)}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      {(leads?.totalLeads ?? 0) > 0
                        ? `${(
                            (((leads?.byStatus.CONTACTED ?? 0) +
                              (leads?.byStatus.QUALIFIED ?? 0)) /
                              (leads?.totalLeads ?? 1)) *
                            100
                          ).toFixed(1)}% of total leads`
                        : "Outreach in progress"}
                    </span>
                  </div>
                </div>

                {/* Step 5: Enrolled */}
                <div
                  style={{
                    backgroundColor: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "130px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: "#065F46",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Step 5 · Conversion
                    </span>
                    <h4
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#064E3B",
                        marginTop: "4px",
                        marginBottom: "8px",
                      }}
                    >
                      Enrolled Athletes (Current Status)
                    </h4>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#059669",
                      }}
                    >
                      {leads?.enrolledCount ?? 0}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#047857" }}>
                      {leads?.enrolledRate ?? 0}% current lead-to-enrolled rate
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Database Pipeline Status Breakdown */}
            <section
              aria-label="Database Lead Status Breakdown"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                padding: "20px",
                marginBottom: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#0F172A",
                      margin: 0,
                    }}
                  >
                    Authoritative Database Pipeline
                  </h2>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "#64748B",
                      marginTop: "4px",
                      marginBottom: 0,
                    }}
                  >
                    Distribution of campaign leads by operational status. Click
                    any card to inspect in the leads inbox.
                  </p>
                </div>
                <Link
                  href="/leads?source=3x3-oct24"
                  style={{
                    fontSize: "0.8125rem",
                    color: "#2563EB",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  View all in Inbox →
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "12px",
                }}
              >
                {(
                  [
                    "NEW",
                    "CONTACTED",
                    "QUALIFIED",
                    "ENROLLED",
                    "CLOSED",
                  ] as Array<keyof AdminCampaignStatusCounts>
                ).map((status) => {
                  const count = leads?.byStatus[status] ?? 0;
                  const total = leads?.totalLeads ?? 0;
                  const pct =
                    total > 0 ? ((count / total) * 100).toFixed(0) : "0";

                  return (
                    <Link
                      key={status}
                      href={`/leads?source=3x3-oct24&status=${status}`}
                      style={{ textDecoration: "none" }}
                    >
                      <div
                        style={{
                          border: "1px solid #E2E8F0",
                          borderRadius: "10px",
                          padding: "14px",
                          backgroundColor: "#FFFFFF",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <StatusBadge status={status} size="sm" />
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748B",
                              fontWeight: 600,
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "1.375rem",
                            fontWeight: 800,
                            color: "#0F172A",
                          }}
                        >
                          {count}
                        </div>
                        <div
                          style={{
                            fontSize: "0.6875rem",
                            color: "#94A3B8",
                            marginTop: "2px",
                          }}
                        >
                          leads
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Scope & Period Details */}
            <section
              aria-label="Scope and Attribution Details"
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                padding: "16px 20px",
                fontSize: "0.8125rem",
                color: "#64748B",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <strong>Selected Window:</strong>{" "}
                  {period?.startDate && period?.endDate
                    ? `${period.startDate} to ${period.endDate} (${period.timezone})`
                    : period?.startDate
                      ? `From ${period.startDate} (${period.timezone})`
                      : period?.endDate
                        ? `Through ${period.endDate} (${period.timezone})`
                        : `All Time (${period?.timezone || "Asia/Kuala_Lumpur"})`}
                </div>
                {period?.fromUtc && period?.toUtc && (
                  <div>
                    <strong>UTC Boundaries:</strong> {period.fromUtc} →{" "}
                    {period.toUtc}
                  </div>
                )}
                <div>
                  <strong>Report Generated:</strong>{" "}
                  {analytics.asOf ? formatKHLIMDateTime(analytics.asOf) : "—"}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
