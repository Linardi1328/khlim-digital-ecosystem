"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminShell } from "../components/layout/AdminShell";
import { PageHeader } from "../components/ui/PageHeader";
import { MetricCard } from "../components/ui/MetricCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { useAdminAuth } from "../lib/auth-context";
import { adminApi } from "../lib/admin-api";
import type {
  DashboardMetrics,
  OfferingItem,
  MembershipItem,
  PaymentItem,
  AuditLogItem,
} from "../lib/types";

export default function AdminDashboardPage() {
  const { canAccessFinance } = useAdminAuth();
  const canViewFinance = canAccessFinance();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!canViewFinance) {
      setPayments([]);
    }

    setLoading(true);

    async function loadData() {
      try {
        const paymentRequest: Promise<PaymentItem[]> = canViewFinance
          ? adminApi.listPayments()
          : Promise.resolve([]);
        const [m, off, mem, pay, aud] = await Promise.all([
          adminApi.getDashboardMetrics(),
          adminApi.listOfferings(),
          adminApi.listMemberships(),
          paymentRequest,
          adminApi.listAuditLogs(),
        ]);

        if (cancelled) return;

        setMetrics(m);
        setOfferings(off);
        setMemberships(mem);
        setPayments(canViewFinance ? pay : []);
        setAuditLogs(aud);
      } catch (err) {
        if (!cancelled) console.warn("Failed to load dashboard data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [canViewFinance]);

  const attentionPayments = canViewFinance
    ? payments.filter(
        (p) => p.status === "FAILED" || p.status === "PROCESSING",
      )
    : [];

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="KHLIM Operations Command Centre"
          subtitle="Real-time academy performance, capacity utilisation, and active member contracts."
          badge={
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                backgroundColor: "#ECFDF5",
                color: "#065F46",
                border: "1px solid #A7F3D0",
                padding: "3px 8px",
                borderRadius: "9999px",
              }}
            >
              ● LIVE OPS FEED
            </span>
          }
          actions={
            <div style={{ display: "flex", gap: "10px" }}>
              <Link href="/offerings">
                <Button variant="outline" size="sm">
                  + Create Offering
                </Button>
              </Link>
              <Link href="/programmes">
                <Button variant="primary" size="sm">
                  Manage Programmes
                </Button>
              </Link>
            </div>
          }
        />

        {/* 6 Key Operational Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <MetricCard
            title="Active Members"
            value={metrics?.activeMembers ?? "—"}
            subtitle="Verified paying players"
            trend={{ value: "+8.4%", isPositive: true }}
            variant="success"
            icon="🏅"
          />
          <MetricCard
            title="Pending Memberships"
            value={metrics?.pendingMemberships ?? "—"}
            subtitle="Awaiting payment event"
            variant="warning"
            icon="⏳"
          />
          <MetricCard
            title="Total Athletes"
            value={metrics?.totalAthletes ?? "—"}
            subtitle="Linked managed profiles"
            icon="👦"
          />
          <MetricCard
            title="Open Offerings"
            value={metrics?.openOfferings ?? "—"}
            subtitle="Active academy terms"
            icon="🏟️"
          />
          <MetricCard
            title="Capacity Utilisation"
            value={`${metrics?.capacityUtilisationRate ?? 0}%`}
            subtitle="Court slot occupancy"
            trend={{ value: "+3.2%", isPositive: true }}
            variant="success"
            icon="📈"
          />
          {canViewFinance ? (
            <MetricCard
              title="Payments Requiring Action"
              value={metrics?.paymentsAttentionCount ?? "—"}
              subtitle="Declined / Processing"
              variant={
                metrics && metrics.paymentsAttentionCount > 0
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

        {/* Grid Layout: Capacity & Memberships */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Capacity Utilisation by Offering */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.125rem",
                    fontWeight: 800,
                    color: "#0F172A",
                  }}
                >
                  Programme Offering Capacity
                </h3>
                <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                  Enrolled headcount vs max court quota
                </div>
              </div>
              <Link
                href="/offerings"
                style={{
                  fontSize: "0.8125rem",
                  color: "#D97706",
                  fontWeight: 600,
                }}
              >
                View All →
              </Link>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {offerings.slice(0, 4).map((off) => {
                const percent = Math.min(
                  100,
                  Math.round((off.enrolledCount / off.capacity) * 100),
                );
                const isFull = off.enrolledCount >= off.capacity;

                return (
                  <div key={off.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8125rem",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#0F172A" }}>
                        {off.name}
                      </span>
                      <span style={{ color: "#64748B" }}>
                        <strong>{off.enrolledCount}</strong> / {off.capacity} (
                        {percent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        backgroundColor: "#F1F5F9",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${percent}%`,
                          backgroundColor: isFull
                            ? "#EF4444"
                            : percent > 80
                              ? "#F59E0B"
                              : "#10B981",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Membership Status Overview */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.125rem",
                    fontWeight: 800,
                    color: "#0F172A",
                  }}
                >
                  Recent Membership Enrolments
                </h3>
                <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                  Server-authoritative membership contracts
                </div>
              </div>
              <Link
                href="/memberships"
                style={{
                  fontSize: "0.8125rem",
                  color: "#D97706",
                  fontWeight: 600,
                }}
              >
                View All →
              </Link>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {memberships.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    backgroundColor: "#F8FAFC",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "#0F172A",
                      }}
                    >
                      {m.athleteName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      {m.programmeName} • {m.planName}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "4px",
                    }}
                  >
                    <StatusBadge status={m.status} size="sm" />
                    <span style={{ fontSize: "0.6875rem", color: "#64748B" }}>
                      Pay: {m.paymentIndicator}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lower Grid: Payment Attention Queue & Recent Audit Activity */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Payment Attention Queue */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.125rem",
                    fontWeight: 800,
                    color: "#0F172A",
                  }}
                >
                  Payment Attention Queue
                </h3>
                <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                  {canViewFinance
                    ? "Declined mandates & unconfirmed charges"
                    : "Finance roles only"}
                </div>
              </div>
              {canViewFinance && (
                <Link
                  href="/payments"
                  style={{
                    fontSize: "0.8125rem",
                    color: "#D97706",
                    fontWeight: 600,
                  }}
                >
                  Manage Payments →
                </Link>
              )}
            </div>

            {!canViewFinance ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#64748B",
                  fontSize: "0.875rem",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                }}
              >
                🔒 Payment operations are hidden for the current staff role.
              </div>
            ) : attentionPayments.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#64748B",
                  fontSize: "0.875rem",
                }}
              >
                ✓ No payment issues currently require attention.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {attentionPayments.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border:
                        p.status === "FAILED"
                          ? "1px solid #FECACA"
                          : "1px solid #FDE68A",
                      backgroundColor:
                        p.status === "FAILED" ? "#FEF2F2" : "#FFFBEB",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            color: "#0F172A",
                          }}
                        >
                          {p.payerName} ({p.athleteName})
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                          {p.paymentId} • Provider: {p.provider}
                        </div>
                      </div>
                      <StatusBadge status={p.status} size="sm" />
                    </div>
                    {p.failureReason && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#991B1B",
                          marginTop: "6px",
                          fontWeight: 500,
                        }}
                      >
                        ⚠️ Reason: {p.failureReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Operational Audit Activity */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.125rem",
                    fontWeight: 800,
                    color: "#0F172A",
                  }}
                >
                  Recent Audit Activity
                </h3>
                <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                  Immutable operational trail
                </div>
              </div>
              <Link
                href="/audit"
                style={{
                  fontSize: "0.8125rem",
                  color: "#D97706",
                  fontWeight: 600,
                }}
              >
                Full Audit Log →
              </Link>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {auditLogs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    gap: "12px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid #F1F5F9",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span style={{ fontSize: "1rem" }} aria-hidden="true">
                    📜
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#0F172A", fontWeight: 600 }}>
                      {log.summary}
                    </div>
                    <div
                      style={{
                        color: "#64748B",
                        fontSize: "0.75rem",
                        marginTop: "2px",
                      }}
                    >
                      By <strong>{log.actorName}</strong> • {log.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
