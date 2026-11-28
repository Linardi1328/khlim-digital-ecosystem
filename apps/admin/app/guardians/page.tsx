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
import type { GuardianItem, StaffRole } from "../../lib/types";

const PLAYER_OPERATIONS_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
];

function GuardiansContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { hasRole, isAuthenticated, isDemoMode, mfaSatisfied } = useAdminAuth();
  const canView = hasRole(PLAYER_OPERATIONS_ROLES);

  const [guardians, setGuardians] = useState<GuardianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Drawer
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianItem | null>(
    null,
  );
  const [detailTab, setDetailTab] = useState("profile");

  const loadGuardians = useCallback(async () => {
    if (!canView) {
      setGuardians([]);
      setLoading(false);
      return;
    }
    if (!isDemoMode && (!isAuthenticated || !mfaSatisfied)) {
      setGuardians([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await adminApi.listGuardians();
      setGuardians(list);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Guardians directory could not be loaded from the backend.",
      );
    } finally {
      setLoading(false);
    }
  }, [canView, isAuthenticated, isDemoMode, mfaSatisfied]);

  useEffect(() => {
    void loadGuardians();
  }, [loadGuardians]);

  if (!canView) {
    return (
      <AdminShell>
        <div>
          <PageHeader
            title="Guardians Directory"
            subtitle="Family account managers with explicit many-to-many relationships to minor athletes."
            breadcrumbs={[
              { label: "Operations", href: "/" },
              { label: "Guardians" },
            ]}
          />
          <EmptyState
            icon="🔒"
            title="Restricted Guardian Directory"
            description="Access to family guardian contact records is limited to authorized coaches, academy administrators, and management."
          />
        </div>
      </AdminShell>
    );
  }

  const filtered = guardians.filter((g) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      g.displayName.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      Boolean(g.phone && g.phone.toLowerCase().includes(q)) ||
      g.managedAthletes.some((a) => a.displayName.toLowerCase().includes(q));
    const matchesStatus =
      statusFilter === "ALL" || g.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = guardians.filter(
    (g) => g.accountStatus === "ACTIVE",
  ).length;
  const totalLinkedAthletes = guardians.reduce(
    (sum, g) => sum + g.managedAthletes.length,
    0,
  );

  const columns: Column<GuardianItem>[] = [
    {
      key: "displayName",
      header: "Guardian Name",
      render: (g) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {g.displayName}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#64748B",
              fontFamily: "monospace",
            }}
          >
            {g.id}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email & Phone",
      render: (g) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>{g.email}</div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#64748B",
              fontFamily: g.phone ? "monospace" : "inherit",
            }}
          >
            {g.phone || "No phone added"}
          </div>
        </div>
      ),
    },
    {
      key: "managedAthletes",
      header: "Managed Athletes",
      render: (g) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {g.managedAthletes.length === 0 ? (
            <span style={{ color: "#94A3B8", fontSize: "0.8rem" }}>None</span>
          ) : (
            g.managedAthletes.map((a) => (
              <span
                key={a.id}
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  backgroundColor: "#FEF3C7",
                  color: "#92400E",
                  border: "1px solid #FDE68A",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  borderRadius: "5px",
                  whiteSpace: "nowrap",
                }}
              >
                {a.displayName} ({a.relationshipType})
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      key: "accountStatus",
      header: "Account Status",
      render: (g) => <StatusBadge status={g.accountStatus} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (g) => (
        <Button
          variant="outline"
          size="sm"
          style={{ whiteSpace: "nowrap" }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedGuardian(g);
            setDetailTab("profile");
          }}
        >
          View Profile
        </Button>
      ),
    },
  ];

  return (
    <AdminShell>
      <div style={{ minWidth: 0 }}>
        <PageHeader
          title="Guardians Directory"
          subtitle="Family account managers with explicit many-to-many relationships to minor athletes."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Guardians" },
          ]}
        />

        <div className="admin-summary-strip" aria-label="Guardian summary">
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Total Guardians</div>
            <div className="admin-summary-tile-value">{guardians.length}</div>
            <div className="admin-summary-tile-sub">Organization-scoped</div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Active Accounts</div>
            <div className="admin-summary-tile-value">{activeCount}</div>
            <div className="admin-summary-tile-sub">Verified access</div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">
              Explicit Family Links
            </div>
            <div className="admin-summary-tile-value">
              {totalLinkedAthletes}
            </div>
            <div className="admin-summary-tile-sub">Guardian-athlete pairs</div>
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
            placeholder="Search guardians by name, email, phone, child..."
          />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="guardian-status-filter"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Status:
            </label>
            <select
              id="guardian-status-filter"
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
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="DEACTIVATED">DEACTIVATED</option>
            </select>
          </div>
        </FilterBar>

        {loadError ? (
          <ErrorState
            title="Unable to Load Guardians"
            message={loadError}
            onRetry={() => void loadGuardians()}
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              onRowClick={(item) => {
                setSelectedGuardian(item);
                setDetailTab("profile");
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

        {/* Guardian Detail Drawer */}
        <Drawer
          isOpen={!!selectedGuardian}
          onClose={() => setSelectedGuardian(null)}
          title={selectedGuardian?.displayName}
          subtitle={`Verified Account: ${selectedGuardian?.email}`}
          width="560px"
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGuardian(null)}
            >
              Close
            </Button>
          }
        >
          {selectedGuardian && (
            <div>
              <Tabs
                tabs={[
                  { id: "profile", label: "Profile" },
                  {
                    id: "children",
                    label: "Linked Children",
                    count: selectedGuardian.managedAthletes.length,
                  },
                  { id: "emergency", label: "Emergency Contact" },
                ]}
                activeTab={detailTab}
                onChange={setDetailTab}
              />

              {detailTab === "profile" && (
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
                        ACCOUNT ID
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#0F172A",
                          fontSize: "0.8rem",
                          fontFamily: "monospace",
                          marginTop: "2px",
                        }}
                      >
                        {selectedGuardian.id}
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
                        ACCOUNT STATUS
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        <StatusBadge
                          status={selectedGuardian.accountStatus}
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
                        EMAIL
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#0F172A",
                          marginTop: "2px",
                        }}
                      >
                        {selectedGuardian.email}
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
                        PHONE
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#0F172A",
                          fontFamily: selectedGuardian.phone
                            ? "monospace"
                            : "inherit",
                          marginTop: "2px",
                        }}
                      >
                        {selectedGuardian.phone || "—"}
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
                    <strong>Authorization Rule:</strong> Guardian role alone
                    does not grant access to unrelated athletes. Only athletes
                    linked through explicit family relationship records can be
                    accessed.
                  </div>
                </div>
              )}

              {detailTab === "children" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {selectedGuardian.managedAthletes.length === 0 ? (
                    <EmptyState
                      title="No linked athletes"
                      description="This guardian account does not currently have any linked minor athlete profiles."
                    />
                  ) : (
                    selectedGuardian.managedAthletes.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: "14px",
                          backgroundColor: "#F8FAFC",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{ fontWeight: 700, fontSize: "0.9375rem" }}
                          >
                            {a.displayName}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8125rem",
                              color: "#64748B",
                              marginTop: "2px",
                            }}
                          >
                            Relationship: <strong>{a.relationshipType}</strong>{" "}
                            • DOB: {a.dateOfBirth}
                          </div>
                        </div>
                        <Link
                          href={`/athletes?q=${encodeURIComponent(a.displayName)}`}
                        >
                          <Button variant="outline" size="sm">
                            Open Athlete →
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === "emergency" && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#F8FAFC",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                    {selectedGuardian.emergencyContactName ||
                      "No Emergency Contact Listed"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      color: "#64748B",
                      fontFamily: selectedGuardian.emergencyContactPhone
                        ? "monospace"
                        : "inherit",
                      marginTop: "4px",
                    }}
                  >
                    Phone: {selectedGuardian.emergencyContactPhone || "—"}
                  </div>
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}

export default function GuardiansPage() {
  return (
    <Suspense
      fallback={
        <AdminShell>
          <LoadingState message="Loading guardians directory..." />
        </AdminShell>
      }
    >
      <GuardiansContent />
    </Suspense>
  );
}
