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
import { adminApi } from "../../lib/admin-api";
import type { AthleteItem } from "../../lib/types";

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<AthleteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Selection
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteItem | null>(null);
  const [detailTab, setDetailTab] = useState("profile");

  useEffect(() => {
    async function load() {
      try {
        const list = await adminApi.listAthletes();
        setAthletes(list);
      } catch (err) {
        console.warn("Failed to load athletes:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = athletes.filter((ath) => {
    const matchesSearch =
      ath.displayName.toLowerCase().includes(search.toLowerCase()) ||
      ath.guardians.some((g) => g.guardianName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || ath.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<AthleteItem>[] = [
    {
      key: "displayName",
      header: "Athlete Name",
      render: (ath) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
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
              fontSize: "0.875rem",
            }}
          >
            {ath.displayName[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#0F172A" }}>{ath.displayName}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>ID: {ath.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "dateOfBirth",
      header: "Date of Birth",
      render: (ath) => (
        <div>
          <div style={{ fontWeight: 600 }}>{ath.dateOfBirth}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{ath.gender || "Youth"}</div>
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
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: "#F1F5F9",
            color: "#334155",
            fontSize: "0.8125rem",
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
          {ath.guardians.map((g) => (
            <div key={g.id} style={{ fontSize: "0.8125rem" }}>
              <strong>{g.guardianName}</strong>{" "}
              <span style={{ color: "#64748B" }}>({g.relationshipType})</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "memberships",
      header: "Active Memberships",
      render: (ath) => (
        <span style={{ fontWeight: 700, color: ath.activeMembershipsCount > 0 ? "#065F46" : "#64748B" }}>
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
      <div>
        <PageHeader
          title="Athletes Directory"
          subtitle="Managed minor athlete profiles linked to authorized family guardians."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Athletes" },
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
            placeholder="Search athletes by name, guardian..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label htmlFor="ath-status" style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
              Status:
            </label>
            <select
              id="ath-status"
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
              <option value="INACTIVE">INACTIVE</option>
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
            setSelectedAthlete(item);
            setDetailTab("profile");
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

        {/* Athlete Detail Drawer */}
        <Drawer
          isOpen={!!selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
          title={selectedAthlete?.displayName}
          subtitle={`Age ${selectedAthlete?.age} • DOB: ${selectedAthlete?.dateOfBirth}`}
          width="560px"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedAthlete(null)}>
              Close
            </Button>
          }
        >
          {selectedAthlete && (
            <div>
              <Tabs
                tabs={[
                  { id: "profile", label: "Profile" },
                  { id: "guardians", label: "Guardians" },
                  { id: "attendance", label: "Attendance" },
                ]}
                activeTab={detailTab}
                onChange={setDetailTab}
              />

              {detailTab === "profile" && (
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
                      <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>DATE OF BIRTH</div>
                      <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {selectedAthlete.dateOfBirth}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>GENDER</div>
                      <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {selectedAthlete.gender || "Youth Athlete"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>ACTIVE ENROLMENTS</div>
                      <div style={{ fontWeight: 700, color: "#065F46", marginTop: "2px" }}>
                        {selectedAthlete.activeMembershipsCount} Active
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>LOCALE</div>
                      <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {selectedAthlete.preferredLocale.toUpperCase()}
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
                    <strong>Domain Architecture:</strong> Athletes are managed profiles linked to adult guardians and do not require direct credentials or Supabase user IDs.
                  </div>
                </div>
              )}

              {detailTab === "guardians" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedAthlete.guardians.map((g) => (
                    <div
                      key={g.id}
                      style={{
                        padding: "14px",
                        backgroundColor: "#F8FAFC",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{g.guardianName}</div>
                      <div style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "2px" }}>
                        Relationship: <strong>{g.relationshipType}</strong>
                      </div>
                      {g.phone && (
                        <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "2px" }}>
                          Phone: {g.phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {detailTab === "attendance" && (
                <div style={{ padding: "24px", textAlign: "center", color: "#64748B", fontSize: "0.875rem" }}>
                  📋 Attendance records are logged by academy coaches during training sessions.
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}
