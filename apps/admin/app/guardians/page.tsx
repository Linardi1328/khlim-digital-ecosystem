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
import type { GuardianItem } from "../../lib/types";

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<GuardianItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Drawer
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianItem | null>(
    null,
  );
  const [detailTab, setDetailTab] = useState("profile");

  useEffect(() => {
    async function load() {
      try {
        const list = await adminApi.listGuardians();
        setGuardians(list);
      } catch (err) {
        console.warn("Failed to load guardians:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = guardians.filter((g) => {
    return (
      g.displayName.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase()) ||
      (g.phone && g.phone.toLowerCase().includes(search.toLowerCase())) ||
      g.managedAthletes.some((a) =>
        a.displayName.toLowerCase().includes(search.toLowerCase()),
      )
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<GuardianItem>[] = [
    {
      key: "displayName",
      header: "Guardian Name",
      render: (g) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {g.displayName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            ID: {g.id}
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
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {g.phone || "No phone added"}
          </div>
        </div>
      ),
    },
    {
      key: "managedAthletes",
      header: "Managed Athletes",
      render: (g) => (
        <div>
          {g.managedAthletes.map((a) => (
            <span
              key={a.id}
              style={{
                display: "inline-block",
                padding: "2px 8px",
                backgroundColor: "#FEF3C7",
                color: "#92400E",
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRadius: "4px",
                marginRight: "6px",
                marginBottom: "4px",
              }}
            >
              👦 {a.displayName} ({a.relationshipType})
            </span>
          ))}
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
      <div>
        <PageHeader
          title="Guardians Directory"
          subtitle="Family account managers with explicit many-to-many relationships to minor athletes."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Guardians" },
          ]}
        />

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={search !== ""}
          onReset={() => setSearch("")}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search guardians by name, email, phone, child..."
          />
        </FilterBar>

        {/* Data Table */}
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

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          onItemsPerPageChange={setPageSize}
        />

        {/* Guardian Detail Drawer */}
        <Drawer
          isOpen={!!selectedGuardian}
          onClose={() => setSelectedGuardian(null)}
          title={selectedGuardian?.displayName}
          subtitle={`Verified Supabase Account: ${selectedGuardian?.email}`}
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
                        ACCOUNT ID
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#0F172A",
                          fontSize: "0.8125rem",
                          marginTop: "2px",
                        }}
                      >
                        {selectedGuardian.id}
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
                          fontSize: "0.75rem",
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
                          fontSize: "0.75rem",
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
                          marginTop: "2px",
                        }}
                      >
                        {selectedGuardian.phone || "—"}
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
                  {selectedGuardian.managedAthletes.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "14px",
                        backgroundColor: "#F8FAFC",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                        {a.displayName}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          color: "#64748B",
                          marginTop: "2px",
                        }}
                      >
                        Relationship: <strong>{a.relationshipType}</strong> •
                        DOB: {a.dateOfBirth}
                      </div>
                    </div>
                  ))}
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
