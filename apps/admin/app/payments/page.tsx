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
import { useAdminAuth } from "../../lib/auth-context";
import { adminApi } from "../../lib/admin-api";
import type { PaymentItem, PaymentStatus } from "../../lib/types";

export default function PaymentsPage() {
  const { canAccessFinance, role } = useAdminAuth();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Selection
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await adminApi.listPayments();
        setPayments(list);
      } catch (err) {
        console.warn("Failed to load payments:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!canAccessFinance()) {
    return (
      <AdminShell>
        <div style={{ padding: "48px 24px", textAlign: "center", backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔒</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>
            Restricted Financial Ledger
          </h2>
          <p style={{ color: "#64748B", maxWidth: "460px", margin: "0 auto 20px", fontSize: "0.875rem" }}>
            Financial transactions and payment provider ledgers are restricted to Finance, Management, and Super Admin roles. Current role: <strong>{role}</strong>.
          </p>
        </div>
      </AdminShell>
    );
  }

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.paymentId.toLowerCase().includes(search.toLowerCase()) ||
      p.payerName.toLowerCase().includes(search.toLowerCase()) ||
      p.athleteName.toLowerCase().includes(search.toLowerCase()) ||
      (p.providerReference && p.providerReference.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesProvider = providerFilter === "ALL" || p.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<PaymentItem>[] = [
    {
      key: "paymentId",
      header: "Payment ID",
      render: (p) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{p.paymentId}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Ref: {p.providerReference || "Pending Webhook"}</div>
        </div>
      ),
    },
    {
      key: "payerName",
      header: "Payer / Guardian",
      render: (p) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>{p.payerName}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Athlete: {p.athleteName}</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (p) => (
        <span style={{ fontWeight: 800, color: "#0F172A" }}>
          {p.currency} {(p.amountMinor / 100).toFixed(2)}
        </span>
      ),
    },
    {
      key: "provider",
      header: "Gateway",
      render: (p) => (
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "2px 6px",
            backgroundColor: "#F1F5F9",
            color: "#334155",
            borderRadius: "4px",
          }}
        >
          {p.provider}
        </span>
      ),
    },
    {
      key: "attemptNumber",
      header: "Attempt",
      render: (p) => <span>Attempt #{p.attemptNumber}</span>,
    },
    {
      key: "createdAt",
      header: "Timestamp",
      render: (p) => (
        <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
          <div>{p.createdAt}</div>
          {p.settledAt && <div style={{ color: "#065F46" }}>Settled: {p.settledAt}</div>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusBadge status={p.status} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (p) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPayment(p);
          }}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Payment Operations"
          subtitle="Inspect webhook-settled payment attempts, gateway provider references, and audit logs."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Payments" },
          ]}
        />

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={search !== "" || statusFilter !== "ALL" || providerFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
            setProviderFilter("ALL");
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search payments by ID, payer, athlete, provider ref..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label htmlFor="pay-status" style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
              Status:
            </label>
            <select
              id="pay-status"
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
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label htmlFor="pay-provider" style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
              Gateway:
            </label>
            <select
              id="pay-provider"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "0.8125rem",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                color: "#0F172A",
              }}
            >
              <option value="ALL">All Providers</option>
              <option value="STRIPE">STRIPE</option>
              <option value="CURLEC">CURLEC</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </div>
        </FilterBar>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRowClick={(item) => setSelectedPayment(item)}
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

        {/* Payment Detail Drawer */}
        <Drawer
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          title={`Payment: ${selectedPayment?.paymentId}`}
          subtitle={`${selectedPayment?.currency} ${(selectedPayment ? selectedPayment.amountMinor / 100 : 0).toFixed(2)} • Gateway: ${selectedPayment?.provider}`}
          width="560px"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedPayment(null)}>
              Close
            </Button>
          }
        >
          {selectedPayment && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>STATUS</div>
                  <div style={{ marginTop: "4px" }}>
                    <StatusBadge status={selectedPayment.status} size="sm" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>SETTLED AT</div>
                  <div style={{ fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                    {selectedPayment.settledAt || "Unsettled"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>PAYER</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {selectedPayment.payerName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>ATHLETE</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {selectedPayment.athleteName}
                  </div>
                </div>
              </div>

              {selectedPayment.failureReason && (
                <div style={{ padding: "14px", backgroundColor: "#FEF2F2", borderRadius: "8px", border: "1px solid #FECACA" }}>
                  <div style={{ fontWeight: 700, color: "#991B1B", fontSize: "0.875rem" }}>
                    ⚠️ Failure Diagnostics
                  </div>
                  <p style={{ color: "#991B1B", margin: "4px 0 0", fontSize: "0.8125rem" }}>
                    {selectedPayment.failureReason}
                  </p>
                </div>
              )}

              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.9375rem", fontWeight: 700 }}>
                  Provider Webhook Truth
                </h4>
                <div style={{ padding: "12px", backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.8125rem" }}>
                  <div>• Provider: <strong>{selectedPayment.provider}</strong></div>
                  <div style={{ marginTop: "4px" }}>• Gateway Intent ID: <code>{selectedPayment.providerReference || "None"}</code></div>
                  <div style={{ marginTop: "4px" }}>• Attempt Sequence: <strong>#{selectedPayment.attemptNumber}</strong></div>
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
                <strong>Security Invariant:</strong> Raw credit card numbers and CVVs are strictly forbidden from entering KHLIM servers. Only tokenized provider event IDs are stored.
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}
