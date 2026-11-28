"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
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
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAdminAuth } from "../../lib/auth-context";
import { adminApi, reconcileStaleCheckouts } from "../../lib/admin-api";
import type { PaymentItem } from "../../lib/types";

const VALID_PAYMENT_FILTERS = [
  "ALL",
  "ATTENTION",
  "PAID",
  "PENDING",
  "PROCESSING",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
];

function PaymentsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const rawStatus = (searchParams.get("status") || "").toUpperCase();
  const initialStatus = VALID_PAYMENT_FILTERS.includes(rawStatus)
    ? rawStatus
    : "ALL";

  const { canAccessFinance, role, isDemoMode } = useAdminAuth();
  const canViewFinance = canAccessFinance();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationMessage, setReconciliationMessage] = useState("");

  // Search & Filter
  const [search, setSearch] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Selection
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(
    null,
  );

  const loadPayments = useCallback(async () => {
    if (!canViewFinance) {
      setPayments([]);
      setSelectedPayment(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const list = await adminApi.listPayments();
      setPayments(list);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Payment ledger could not be loaded from the backend.",
      );
    } finally {
      setLoading(false);
    }
  }, [canViewFinance]);

  useEffect(() => {
    let cancelled = false;

    if (!canViewFinance) {
      setPayments([]);
      setSelectedPayment(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setLoadError(null);

    async function load() {
      try {
        const list = await adminApi.listPayments();
        if (!cancelled) setPayments(list);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Payment ledger could not be loaded from the backend.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [canViewFinance]);

  const handleReconcileStaleCheckouts = async () => {
    const confirmed = window.confirm(
      "Expire checkout holds that exceeded the configured hold window? This cancels only stale pre-provider checkout state so the parent can enrol again safely.",
    );
    if (!confirmed) return;

    setReconciling(true);
    setReconciliationMessage("");
    try {
      const result = await reconcileStaleCheckouts();
      const list = await adminApi.listPayments();
      setPayments(list);
      const recoveredLabel =
        result.expired === 0
          ? "No pre-provider checkout holds required recovery."
          : `${result.expired} pre-provider checkout hold${result.expired === 1 ? "" : "s"} recovered.`;
      const reviewLabel =
        result.actionRequired === 0
          ? ""
          : ` ${result.actionRequired} provider-created checkout${result.actionRequired === 1 ? "" : "s"} require payment-provider review and were not cancelled.`;
      setReconciliationMessage(`${recoveredLabel}${reviewLabel}`);
    } catch (error) {
      setReconciliationMessage(
        error instanceof Error
          ? error.message
          : "Checkout recovery could not be completed.",
      );
    } finally {
      setReconciling(false);
    }
  };

  if (!canViewFinance) {
    return (
      <AdminShell>
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ fontSize: "2.25rem", marginBottom: "12px" }}>🔒</div>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#0F172A",
              margin: "0 0 8px",
            }}
          >
            Restricted Financial Ledger
          </h2>
          <p
            style={{
              color: "#64748B",
              maxWidth: "460px",
              margin: "0 auto 20px",
              fontSize: "0.875rem",
              lineHeight: 1.55,
            }}
          >
            Financial transactions and payment provider ledgers are restricted
            to Finance, Management, and Super Admin roles. Current role:{" "}
            <strong>{role || "Not authenticated"}</strong>.
          </p>
        </div>
      </AdminShell>
    );
  }

  const filtered = payments.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      p.paymentId.toLowerCase().includes(q) ||
      p.payerName.toLowerCase().includes(q) ||
      p.athleteName.toLowerCase().includes(q) ||
      Boolean(
        p.providerReference && p.providerReference.toLowerCase().includes(q),
      );
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ATTENTION"
          ? p.status === "FAILED" || p.status === "PROCESSING"
          : p.status === statusFilter;
    const matchesProvider =
      providerFilter === "ALL" || p.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const paidCount = payments.filter((p) => p.status === "PAID").length;
  const attentionCount = payments.filter(
    (p) => p.status === "FAILED" || p.status === "PROCESSING",
  ).length;
  const failedCount = payments.filter((p) => p.status === "FAILED").length;

  const columns: Column<PaymentItem>[] = [
    {
      key: "paymentId",
      header: "Payment ID",
      render: (p) => (
        <div>
          <div
            style={{
              fontWeight: 700,
              color: "#0F172A",
              fontFamily: "monospace",
              fontSize: "0.8125rem",
            }}
          >
            {p.paymentId}
          </div>
          <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
            Ref: {p.providerReference || "Pending Webhook"}
          </div>
        </div>
      ),
    },
    {
      key: "payerName",
      header: "Payer / Guardian",
      render: (p) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>{p.payerName}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Athlete: {p.athleteName}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (p) => (
        <span
          style={{
            fontWeight: 800,
            color: "#0F172A",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
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
            fontSize: "0.74rem",
            fontWeight: 700,
            padding: "2px 7px",
            backgroundColor: "#F1F5F9",
            color: "#334155",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}
        >
          {p.provider}
        </span>
      ),
    },
    {
      key: "attemptNumber",
      header: "Attempt",
      render: (p) => (
        <span style={{ whiteSpace: "nowrap" }}>Attempt #{p.attemptNumber}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Timestamp",
      render: (p) => (
        <div
          style={{
            fontSize: "0.75rem",
            color: "#64748B",
            whiteSpace: "nowrap",
          }}
        >
          <div>{p.createdAt}</div>
          {p.settledAt && (
            <div style={{ color: "#065F46" }}>Settled: {p.settledAt}</div>
          )}
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
          style={{ whiteSpace: "nowrap" }}
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
      <div style={{ minWidth: 0 }}>
        <PageHeader
          title="Payment Operations"
          subtitle="Inspect webhook-settled payment attempts, gateway provider references, and stale checkout recovery."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Payments" },
          ]}
        />

        <div className="admin-summary-strip" aria-label="Payment summary">
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Settled (Paid)</div>
            <div className="admin-summary-tile-value">{paidCount}</div>
            <div className="admin-summary-tile-sub">
              Webhook-verified settlements
            </div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Requires Attention</div>
            <div
              className="admin-summary-tile-value"
              style={{ color: attentionCount > 0 ? "#991B1B" : "#0F172A" }}
            >
              {attentionCount}
            </div>
            <div className="admin-summary-tile-sub">
              {failedCount} failed · {attentionCount - failedCount} processing
            </div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Total Records</div>
            <div className="admin-summary-tile-value">{payments.length}</div>
            <div className="admin-summary-tile-sub">
              Organization-scoped ledger
            </div>
          </div>
        </div>

        {!isDemoMode ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "16px",
              padding: "12px 16px",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ fontSize: "0.8125rem", color: "#475569" }}>
              Recover stale checkout claims only when no external provider bill
              exists. Provider-created checkouts remain untouched for review.
              {reconciliationMessage ? (
                <div
                  role="status"
                  style={{
                    marginTop: "4px",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  {reconciliationMessage}
                </div>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={reconciling}
              onClick={() => void handleReconcileStaleCheckouts()}
            >
              {reconciling ? "Recovering..." : "Recover stale checkouts"}
            </Button>
          </div>
        ) : null}

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={
            search !== "" || statusFilter !== "ALL" || providerFilter !== "ALL"
          }
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
            setProviderFilter("ALL");
            setPage(1);
          }}
        >
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search payments by ID, payer, athlete, provider ref..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="pay-status"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Status:
            </label>
            <select
              id="pay-status"
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
              <option value="ATTENTION">
                Needs Attention (Failed / Processing)
              </option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="pay-provider"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Gateway:
            </label>
            <select
              id="pay-provider"
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
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
              <option value="ALL">All Providers</option>
              <option value="STRIPE">STRIPE</option>
              <option value="CURLEC">CURLEC</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </div>
        </FilterBar>

        {loadError ? (
          <ErrorState
            title="Unable to Load Payment Ledger"
            message={loadError}
            onRetry={() => void loadPayments()}
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              onRowClick={(item) => setSelectedPayment(item)}
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

        {/* Payment Detail Drawer */}
        <Drawer
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          title={`Payment: ${selectedPayment?.paymentId}`}
          subtitle={`${selectedPayment?.currency} ${(selectedPayment ? selectedPayment.amountMinor / 100 : 0).toFixed(2)} • Gateway: ${selectedPayment?.provider}`}
          width="560px"
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPayment(null)}
            >
              Close
            </Button>
          }
        >
          {selectedPayment && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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
                    STATUS
                  </div>
                  <div style={{ marginTop: "4px" }}>
                    <StatusBadge status={selectedPayment.status} size="sm" />
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
                    SETTLED AT
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedPayment.settledAt || "Unsettled"}
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
                    PAYER
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedPayment.payerName}
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
                    {selectedPayment.athleteName}
                  </div>
                </div>
              </div>

              {selectedPayment.failureReason && (
                <div
                  style={{
                    padding: "14px",
                    backgroundColor: "#FEF2F2",
                    borderRadius: "8px",
                    border: "1px solid #FECACA",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#991B1B",
                      fontSize: "0.875rem",
                    }}
                  >
                    Failure Diagnostics
                  </div>
                  <p
                    style={{
                      color: "#991B1B",
                      margin: "4px 0 0",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {selectedPayment.failureReason}
                  </p>
                </div>
              )}

              <div>
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                  }}
                >
                  Provider Webhook Truth
                </h4>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    fontSize: "0.8125rem",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div>
                    Provider: <strong>{selectedPayment.provider}</strong>
                  </div>
                  <div>
                    Gateway Intent ID:{" "}
                    <code>{selectedPayment.providerReference || "None"}</code>
                  </div>
                  <div>
                    Attempt Sequence:{" "}
                    <strong>#{selectedPayment.attemptNumber}</strong>
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
                <strong>Security Invariant:</strong> Raw credit card numbers and
                CVVs are strictly forbidden from entering KHLIM servers. Only
                tokenized provider event IDs are stored.
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <AdminShell>
          <LoadingState message="Loading payment operations..." />
        </AdminShell>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
