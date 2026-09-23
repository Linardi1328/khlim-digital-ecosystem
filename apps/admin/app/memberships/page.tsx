"use client";

import React, { useState, useEffect } from "react";
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
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { adminApi } from "../../lib/admin-api";
import type { MembershipItem } from "../../lib/types";

export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Drawer
  const [selectedMembership, setSelectedMembership] =
    useState<MembershipItem | null>(null);
  const [detailTab, setDetailTab] = useState("contract");

  // State Change Confirm
  const [suspendTarget, setSuspendTarget] = useState<MembershipItem | null>(
    null,
  );

  useEffect(() => {
    async function load() {
      try {
        const list = await adminApi.listMemberships();
        setMemberships(list);
      } catch (err) {
        console.warn("Failed to load memberships:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = memberships.filter((m) => {
    const matchesSearch =
      m.athleteName.toLowerCase().includes(search.toLowerCase()) ||
      (m.guardianName &&
        m.guardianName.toLowerCase().includes(search.toLowerCase())) ||
      m.offeringName.toLowerCase().includes(search.toLowerCase()) ||
      m.planName.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleConfirmSuspend = () => {
    if (!suspendTarget) return;
    setMemberships((prev) =>
      prev.map((m) =>
        m.id === suspendTarget.id ? { ...m, status: "SUSPENDED" } : m,
      ),
    );
    setSuspendTarget(null);
  };

  const columns: Column<MembershipItem>[] = [
    {
      key: "athleteName",
      header: "Athlete",
      render: (m) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {m.athleteName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Contract: {m.id}
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
        <span style={{ fontWeight: 600, color: "#0F172A" }}>{m.planName}</span>
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
      header: "Term Dates",
      render: (m) => (
        <div style={{ fontSize: "0.8125rem" }}>
          <div>{m.startsOn}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
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
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMembership(m);
              setDetailTab("contract");
            }}
          >
            Inspect
          </Button>
          {m.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              style={{ borderColor: "#FCA5A5", color: "#DC2626" }}
              onClick={(e) => {
                e.stopPropagation();
                setSuspendTarget(m);
              }}
            >
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ];

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

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={search !== "" || statusFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
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
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "6px 10px",
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

        {/* Data Table */}
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

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          onItemsPerPageChange={setPageSize}
        />

        {/* Suspend Confirmation Dialog */}
        {suspendTarget && (
          <ConfirmDialog
            isOpen={!!suspendTarget}
            onClose={() => setSuspendTarget(null)}
            onConfirm={handleConfirmSuspend}
            title="Suspend Membership Contract"
            description={`Are you sure you want to suspend the membership for ${suspendTarget.athleteName}? Session attendance will be temporarily placed on hold.`}
            confirmLabel="Confirm Suspension"
            variant="danger"
          />
        )}

        {/* Membership Detail Drawer */}
        <Drawer
          isOpen={!!selectedMembership}
          onClose={() => setSelectedMembership(null)}
          title={`Contract: ${selectedMembership?.id}`}
          subtitle={`${selectedMembership?.athleteName} • ${selectedMembership?.offeringName}`}
          width="600px"
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMembership(null)}
            >
              Close
            </Button>
          }
        >
          {selectedMembership && (
            <div>
              <Tabs
                tabs={[
                  { id: "contract", label: "Contract & Billing" },
                  { id: "schedule", label: "Payment Schedule" },
                  { id: "audit", label: "Audit Trail" },
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
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      backgroundColor: "#F8FAFC",
                      padding: "16px",
                      borderRadius: "10px",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
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
                          fontSize: "0.75rem",
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
                          fontSize: "0.75rem",
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
                          fontSize: "0.75rem",
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
                        fontSize: "0.875rem",
                        color: "#334155",
                      }}
                    >
                      <div>
                        • Terms Accepted Version:{" "}
                        <strong>
                          {selectedMembership.termsAcceptedVersion}
                        </strong>
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        • Enrolled Offering:{" "}
                        <strong>{selectedMembership.offeringName}</strong>
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        • Plan Package:{" "}
                        <strong>{selectedMembership.planName}</strong>
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        • Price Rate:{" "}
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
                      padding: "12px",
                      borderRadius: "8px",
                      backgroundColor: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      fontSize: "0.8125rem",
                      color: "#92400E",
                    }}
                  >
                    <strong>Domain Rule:</strong> Membership state and payment
                    state are separate. A failed payment installment does not
                    automatically cancel the underlying legal membership
                    contract without administrative review.
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
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                          Installment #1
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                          Due: {selectedMembership.startsOn}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: "#0F172A" }}>
                          {selectedMembership.currency}{" "}
                          {(
                            selectedMembership.recurringAmountMinor / 100
                          ).toFixed(2)}
                        </div>
                        <StatusBadge status="PAID" size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "audit" && (
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "#64748B",
                    padding: "12px",
                  }}
                >
                  📜 Created on backend with terms version{" "}
                  <code>{selectedMembership.termsAcceptedVersion}</code>.
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}
