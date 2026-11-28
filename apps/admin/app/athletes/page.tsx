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
import type { AthleteItem, StaffRole } from "../../lib/types";

const PLAYER_OPERATIONS_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
];

function AthletesContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { hasRole, isAuthenticated, isDemoMode, mfaSatisfied } = useAdminAuth();
  const canView = hasRole(PLAYER_OPERATIONS_ROLES);

  const [athletes, setAthletes] = useState<AthleteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Selection
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteItem | null>(
    null,
  );
  const [detailTab, setDetailTab] = useState("profile");

  const loadAthletes = useCallback(async () => {
    if (!canView) {
      setAthletes([]);
      setLoading(false);
      return;
    }
    if (!isDemoMode && (!isAuthenticated || !mfaSatisfied)) {
      setAthletes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await adminApi.listAthletes();
      setAthletes(list);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Athlete directory could not be loaded from the backend.",
      );
    } finally {
      setLoading(false);
    }
  }, [canView, isAuthenticated, isDemoMode, mfaSatisfied]);

  useEffect(() => {
    void loadAthletes();
  }, [loadAthletes]);

  if (!canView) {
    return (
      <AdminShell>
        <div>
          <PageHeader
            title="Athletes Directory"
            subtitle="Managed minor athlete profiles linked to authorized family guardians."
            breadcrumbs={[
              { label: "Operations", href: "/" },
              { label: "Athletes" },
            ]}
          />
          <EmptyState
            icon="🔒"
            title="Restricted Athlete Records"
            description="Access to minor athlete records is limited to authorized coaches, academy administrators, and management."
          />
        </div>
      </AdminShell>
    );
  }

  const filtered = athletes.filter((ath) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      ath.displayName.toLowerCase().includes(q) ||
      ath.id.toLowerCase().includes(q) ||
      ath.guardians.some((g) => g.guardianName.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "ALL" || ath.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = athletes.filter((a) => a.status === "ACTIVE").length;
  const withActiveMembership = athletes.filter(
    (a) => a.activeMembershipsCount > 0,
  ).length;

  const columns: Column<AthleteItem>[] = [
    {
      key: "displayName",
      header: "Athlete Name",
      render: (ath) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            aria-hidden="true"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#FEF3C7",
              color: "#92400E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.84rem",
              flexShrink: 0,
            }}
          >
            {ath.displayName[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#0F172A" }}>
              {ath.displayName}
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#64748B",
                fontFamily: "monospace",
              }}
            >
              {ath.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "dateOfBirth",
      header: "Date of Birth",
      render: (ath) => (
        <div>
          <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            {ath.dateOfBirth}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {ath.gender || "Youth"}
          </div>
        </div>
      ),
    },
    {
      key: "age",
      header: "Age",
      render: (ath) => (
        <span
          style={{
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "5px",
            backgroundColor: "#F1F5F9",
            color: "#334155",
            fontSize: "0.8rem",
            whiteSpace: "nowrap",
          }}
        >
          {ath.age} yrs
        </span>
      ),
    },
    {
      key: "guardians",
      header: "Guardian Relationships",
      render: (ath) => (
        <div>
          {ath.guardians.length === 0 ? (
            <span style={{ color: "#94A3B8", fontSize: "0.8rem" }}>
              No linked guardian
            </span>
          ) : (
            ath.guardians.map((g) => (
              <div key={g.id} style={{ fontSize: "0.8125rem" }}>
                <strong>{g.guardianName}</strong>{" "}
                <span style={{ color: "#64748B" }}>({g.relationshipType})</span>
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      key: "memberships",
      header: "Memberships",
      render: (ath) => (
        <span
          style={{
            fontWeight: 700,
            color: ath.activeMembershipsCount > 0 ? "#065F46" : "#64748B",
            whiteSpace: "nowrap",
          }}
        >
          {ath.activeMembershipsCount} Active ({ath.membershipsCount} Total)
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (ath) => <StatusBadge status={ath.status} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (ath) => (
        <Button
          variant="outline"
          size="sm"
          style={{ whiteSpace: "nowrap" }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAthlete(ath);
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
          title="Athletes Directory"
          subtitle="Managed minor athlete profiles linked to authorized family guardians."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Athletes" },
          ]}
        />

        <div className="admin-summary-strip" aria-label="Athlete summary">
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Total Athletes</div>
            <div className="admin-summary-tile-value">{athletes.length}</div>
            <div className="admin-summary-tile-sub">Organization-scoped</div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Active Profiles</div>
            <div className="admin-summary-tile-value">{activeCount}</div>
            <div className="admin-summary-tile-sub">Eligible for squads</div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">
              With Active Membership
            </div>
            <div className="admin-summary-tile-value">
              {withActiveMembership}
            </div>
            <div className="admin-summary-tile-sub">Current contracts</div>
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
            placeholder="Search athletes by name, guardian..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="ath-status"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Status:
            </label>
            <select
              id="ath-status"
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
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </FilterBar>

        {loadError ? (
          <ErrorState
            title="Unable to Load Athletes"
            message={loadError}
            onRetry={() => void loadAthletes()}
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              onRowClick={(item) => {
                setSelectedAthlete(item);
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

        {/* Athlete Detail Drawer */}
        <Drawer
          isOpen={!!selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
          title={selectedAthlete?.displayName}
          subtitle={`Age ${selectedAthlete?.age} • DOB: ${selectedAthlete?.dateOfBirth}`}
          width="560px"
          footer={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selectedAthlete && (
                <Link
                  href={`/memberships?q=${encodeURIComponent(selectedAthlete.displayName)}`}
                >
                  <Button variant="secondary" size="sm">
                    View Memberships →
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAthlete(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          {selectedAthlete && (
            <div>
              <Tabs
                tabs={[
                  { id: "profile", label: "Profile" },
                  {
                    id: "guardians",
                    label: "Guardians",
                    count: selectedAthlete.guardians.length,
                  },
                  { id: "attendance", label: "Attendance" },
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
                        DATE OF BIRTH
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#0F172A",
                          marginTop: "2px",
                        }}
                      >
                        {selectedAthlete.dateOfBirth}
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
                        GENDER
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#0F172A",
                          marginTop: "2px",
                        }}
                      >
                        {selectedAthlete.gender || "Youth Athlete"}
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
                        ACTIVE ENROLMENTS
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#065F46",
                          marginTop: "2px",
                        }}
                      >
                        {selectedAthlete.activeMembershipsCount} Active (
                        {selectedAthlete.membershipsCount} Total)
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
                        LOCALE
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#0F172A",
                          marginTop: "2px",
                        }}
                      >
                        {selectedAthlete.preferredLocale.toUpperCase()}
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
                    <strong>Domain Architecture:</strong> Athletes are managed
                    profiles linked to adult guardians and do not require direct
                    credentials or Supabase user IDs.
                  </div>
                </div>
              )}

              {detailTab === "guardians" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {selectedAthlete.guardians.length === 0 ? (
                    <EmptyState
                      title="No linked guardians"
                      description="No verified guardian relationships are attached to this athlete profile."
                    />
                  ) : (
                    selectedAthlete.guardians.map((g) => (
                      <div
                        key={g.id}
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
                            {g.guardianName}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8125rem",
                              color: "#64748B",
                              marginTop: "2px",
                            }}
                          >
                            Relationship: <strong>{g.relationshipType}</strong>
                          </div>
                          {g.phone && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#64748B",
                                fontFamily: "monospace",
                                marginTop: "2px",
                              }}
                            >
                              {g.phone}
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/guardians?q=${encodeURIComponent(g.guardianName)}`}
                        >
                          <Button variant="outline" size="sm">
                            Open Guardian →
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === "attendance" && (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#475569",
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    border: "1px solid #E2E8F0",
                    fontSize: "0.84rem",
                    lineHeight: 1.55,
                  }}
                >
                  <p style={{ margin: "0 0 12px" }}>
                    Attendance records are logged by academy coaches per
                    training session under Scheduling &amp; Attendance.
                  </p>
                  <Link href="/scheduling">
                    <Button variant="outline" size="sm">
                      Open Scheduling &amp; Attendance →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}

export default function AthletesPage() {
  return (
    <Suspense
      fallback={
        <AdminShell>
          <LoadingState message="Loading athletes directory..." />
        </AdminShell>
      }
    >
      <AthletesContent />
    </Suspense>
  );
}
