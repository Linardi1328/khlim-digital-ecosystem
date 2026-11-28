"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { Tabs } from "../../components/ui/Tabs";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAdminAuth } from "../../lib/auth-context";
import { adminApi } from "../../lib/admin-api";
import type { MembershipItem, StaffRole } from "../../lib/types";

const PLAYER_OPERATIONS_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
];

const VALID_STATUSES = [
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "CANCELLED",
  "COMPLETED",
  "EXPIRED",
];

function MembershipsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const rawStatus = (searchParams.get("status") || "").toUpperCase();
  const initialStatus = VALID_STATUSES.includes(rawStatus) ? rawStatus : "ALL";

  const {
    hasRole,
    canAccessFinance,
    isAuthenticated,
    isDemoMode,
    mfaSatisfied,
  } = useAdminAuth();
  const canView = hasRole(PLAYER_OPERATIONS_ROLES);
  const canViewFinance = canAccessFinance();

  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Drawer
  const [selectedMembership, setSelectedMembership] =
    useState<MembershipItem | null>(null);
  const [detailTab, setDetailTab] = useState("contract");

  const loadMemberships = useCallback(async () => {
    if (!canView) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    if (!isDemoMode && (!isAuthenticated || !mfaSatisfied)) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await adminApi.listMemberships();
      setMemberships(list);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Memberships could not be loaded from the backend.",
      );
    } finally {
      setLoading(false);
    }
  }, [canView, isAuthenticated, isDemoMode, mfaSatisfied]);

  useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  if (!canView) {
    return (
      <AdminShell>
        <div>
          <PageHeader
            title="Active Memberships"
            subtitle="Inspect enrolled player contracts, terms snapshots, recurring billing states, and status history."
            breadcrumbs={[
              { label: "Operations", href: "/" },
              { label: "Memberships" },
            ]}
          />
          <EmptyState
            icon="🔒"
            title="Restricted Membership Records"
            description="Membership contract records are limited to authorized coaches, academy administrators, and management."
          />
        </div>
      </AdminShell>
    );
  }

  const filtered = memberships.filter((m) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      m.athleteName.toLowerCase().includes(q) ||
      Boolean(m.guardianName && m.guardianName.toLowerCase().includes(q)) ||
      m.offeringName.toLowerCase().includes(q) ||
      m.planName.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const activeCount = memberships.filter((m) => m.status === "ACTIVE").length;
  const pendingCount = memberships.filter((m) => m.status === "PENDING").length;
  const paymentAttentionCount = memberships.filter(
    (m) => m.paymentIndicator === "OVERDUE" || m.paymentIndicator === "FAILED",
  ).length;

  const columns: Column<MembershipItem>[] = [
    {
      key: "athleteName",
      header: "Athlete",
      render: (m) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {m.athleteName}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#64748B",
              fontFamily: "monospace",
            }}
          >
            {m.id}
          </div>
        </div>
      ),
    },
    {
      key: "offeringName",
      header: "Programme Offering",
      render: (m) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>
            {m.offeringName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {m.programmeName}
          </div>
        </div>
      ),
    },
    {
      key: "planName",
      header: "Membership Plan",
      render: (m) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>{m.planName}</div>
          <div
            style={{
              fontSize: "0.74rem",
              color: "#64748B",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {m.currency} {(m.recurringAmountMinor / 100).toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      key: "guardianName",
      header: "Guardian / Purchaser",
      render: (m) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>
            {m.guardianName || "—"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {m.guardianEmail || ""}
          </div>
        </div>
      ),
    },
    {
      key: "term",
      header: "Validity",
      render: (m) => (
        <div style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 600 }}>{m.startsOn}</div>
          <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
            to {m.endsOn || "Ongoing"}
          </div>
        </div>
      ),
    },
    {
      key: "paymentIndicator",
      header: "Payment Status",
      render: (m) => <StatusBadge status={m.paymentIndicator} size="sm" />,
    },
    {
      key: "status",
      header: "Contract Status",
      render: (m) => <StatusBadge status={m.status} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (m) => (
        <Button
          variant="outline"
          size="sm"
          style={{ whiteSpace: "nowrap" }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMembership(m);
            setDetailTab("contract");
          }}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <AdminShell>
      <div style={{ minWidth: 0 }}>
        <PageHeader
          title="Active Memberships"
          subtitle="Inspect enrolled player contracts, validity dates, terms snapshots, and payment indicators."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Memberships" },
          ]}
        />

        <div className="admin-summary-strip" aria-label="Membership summary">
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Active Contracts</div>
            <div className="admin-summary-tile-value">{activeCount}</div>
            <div className="admin-summary-tile-sub">
              of {memberships.length} total
            </div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Pending Activation</div>
            <div className="admin-summary-tile-value">{pendingCount}</div>
            <div className="admin-summary-tile-sub">
              Awaiting confirmation or payment
            </div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">
              Overdue / Failed Billing
            </div>
            <div
              className="admin-summary-tile-value"
              style={{
                color: paymentAttentionCount > 0 ? "#991B1B" : "#0F172A",
              }}
            >
              {paymentAttentionCount}
            </div>
            <div className="admin-summary-tile-sub">
              Separate from contract state
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={search !== "" || statusFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
            setPage(1);
          }}
        >
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search memberships by athlete, guardian, offering, contract ID..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="mem-status-select"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Status:
            </label>
            <select
              id="mem-status-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "7px 10px",
                fontSize: "0.8125rem",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                color: "#0F172A",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
        </FilterBar>

        {loadError ? (
          <ErrorState
            title="Unable to Load Memberships"
            message={loadError}
            onRetry={() => void loadMemberships()}
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              onRowClick={(item) => {
                setSelectedMembership(item);
                setDetailTab("contract");
              }}
            />

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}

        {/* Membership Detail Drawer */}
        <Drawer
          isOpen={!!selectedMembership}
          onClose={() => setSelectedMembership(null)}
          title={`Contract: ${selectedMembership?.id}`}
          subtitle={`${selectedMembership?.athleteName} • ${selectedMembership?.offeringName}`}
          width="600px"
          footer={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selectedMembership && (
                <Link
                  href={`/athletes?q=${encodeURIComponent(selectedMembership.athleteName)}`}
                >
                  <Button variant="secondary" size="sm">
                    Open Athlete →
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMembership(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          {selectedMembership && (
            <div>
              <Tabs
                tabs={[
                  { id: "contract", label: "Contract & Billing" },
                  { id: "schedule", label: "Billing Summary" },
                  { id: "audit", label: "Terms Snapshot" },
                ]}
                activeTab={detailTab}
                onChange={setDetailTab}
              />

              {detailTab === "contract" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div
                    className="admin-detail-grid"
                    style={{
                      backgroundColor: "#F8FAFC",
                      padding: "16px",
                      borderRadius: "10px",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748B",
                          fontWeight: 700,
                        }}
                      >
                        CONTRACT STATUS
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        <StatusBadge
                          status={selectedMembership.status}
                          size="sm"
                        />
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748B",
                          fontWeight: 700,
                        }}
                      >
                        PAYMENT STATUS
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        <StatusBadge
                          status={selectedMembership.paymentIndicator}
                          size="sm"
                        />
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748B",
                          fontWeight: 700,
                        }}
                      >
                        ATHLETE
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#0F172A",
                          marginTop: "2px",
                        }}
                      >
                        {selectedMembership.athleteName}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#64748B",
                          fontWeight: 700,
                        }}
                      >
                        GUARDIAN / PAYER
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#0F172A",
                          marginTop: "2px",
                        }}
                      >
                        {selectedMembership.guardianName || "Direct Guardian"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4
                      style={{
                        margin: "0 0 8px",
                        fontSize: "0.9375rem",
                        fontWeight: 700,
                      }}
                    >
                      Enrolment Agreement Snapshot
                    </h4>
                    <div
                      style={{
                        padding: "14px",
                        backgroundColor: "#FFFFFF",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                        fontSize: "0.84rem",
                        color: "#334155",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div>
                        Terms Accepted Version:{" "}
                        <strong>
                          {selectedMembership.termsAcceptedVersion}
                        </strong>
                      </div>
                      <div>
                        Enrolled Offering:{" "}
                        <strong>{selectedMembership.offeringName}</strong>
                      </div>
                      <div>
                        Plan Package:{" "}
                        <strong>{selectedMembership.planName}</strong>
                      </div>
                      <div>
                        Validity Window:{" "}
                        <strong>
                          {selectedMembership.startsOn} to{" "}
                          {selectedMembership.endsOn || "Ongoing"}
                        </strong>
                      </div>
                      <div>
                        Price Rate:{" "}
                        <strong>
                          {selectedMembership.currency}{" "}
                          {(
                            selectedMembership.recurringAmountMinor / 100
                          ).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      fontSize: "0.8125rem",
                      color: "#92400E",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Domain Rule:</strong> Membership state and payment
                    state are separate. A failed payment installment does not
                    automatically cancel the underlying legal membership
                    contract without administrative review.
                  </div>

                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      fontSize: "0.78rem",
                      color: "#475569",
                      lineHeight: 1.45,
                    }}
                  >
                    Read-only inspection: direct contract suspension or
                    cancellation actions are not enabled in this release until
                    the corresponding audited backend mutation endpoint is
                    available.
                  </div>
                </div>
              )}

              {detailTab === "schedule" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      padding: "14px",
                      backgroundColor: "#F8FAFC",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                          Latest Payment Indicator
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                          Plan rate: {selectedMembership.currency}{" "}
                          {(
                            selectedMembership.recurringAmountMinor / 100
                          ).toFixed(2)}{" "}
                          · Term start {selectedMembership.startsOn}
                        </div>
                      </div>
                      <StatusBadge
                        status={selectedMembership.paymentIndicator}
                        size="sm"
                      />
                    </div>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8125rem",
                      color: "#64748B",
                      lineHeight: 1.5,
                    }}
                  >
                    Individual installment ledgers and webhook settlement logs
                    are managed under Payment Operations for authorized finance
                    staff.
                  </p>
                  {canViewFinance && (
                    <div>
                      <Link
                        href={`/payments?q=${encodeURIComponent(selectedMembership.athleteName)}`}
                      >
                        <Button variant="outline" size="sm">
                          Inspect Payments for {selectedMembership.athleteName}{" "}
                          →
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "audit" && (
                <div
                  style={{
                    fontSize: "0.84rem",
                    color: "#475569",
                    padding: "14px",
                    backgroundColor: "#F8FAFC",
                    borderRadius: 8,
                    border: "1px solid #E2E8F0",
                    lineHeight: 1.55,
                  }}
                >
                  Contract recorded with terms snapshot version{" "}
                  <code>{selectedMembership.termsAcceptedVersion}</code>.
                  Privileged administrative mutations are logged in the
                  append-only Audit Trail.
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}

export default function MembershipsPage() {
  return (
    <Suspense
      fallback={
        <AdminShell>
          <LoadingState message="Loading memberships..." />
        </AdminShell>
      }
    >
      <MembershipsContent />
    </Suspense>
  );
}
