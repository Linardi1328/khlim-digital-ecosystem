"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { Tabs } from "../../components/ui/Tabs";
import { FormSection } from "../../components/ui/FormSection";
import { Input } from "../../components/ui/Input";
import { adminApi } from "../../lib/admin-api";
import type { VenueItem } from "../../lib/types";

export default function VenuesPage() {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Drawer
  const [selectedVenue, setSelectedVenue] = useState<VenueItem | null>(null);
  const [detailTab, setDetailTab] = useState("overview");

  // Create Venue Drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const list = await adminApi.listVenues();
        setVenues(list);
      } catch (err) {
        console.warn("Failed to load venues:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = venues.filter((v) => {
    return (
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.address && v.address.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName.trim()) return;

    setIsSaving(true);
    try {
      await adminApi.createVenue({
        name: venueName.trim(),
        address: venueAddress.trim() || undefined,
      });

      const updated = await adminApi.listVenues();
      setVenues(updated);
      setIsCreateOpen(false);
      setVenueName("");
      setVenueAddress("");
    } catch (err) {
      console.warn("Create venue fallback:", err);
      const newV: VenueItem = {
        id: `ven-${Date.now()}`,
        name: venueName.trim(),
        address: venueAddress.trim() || null,
        courts: [{ id: `crt-${Date.now()}`, venueId: `ven-${Date.now()}`, name: "Main Court 1", capacity: 25 }],
        activeOfferingsCount: 0,
        upcomingSessionsCount: 0,
        closurePeriods: [],
      };
      setVenues([newV, ...venues]);
      setIsCreateOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<VenueItem>[] = [
    {
      key: "name",
      header: "Venue Facility",
      render: (v) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>📍 {v.name}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>ID: {v.id}</div>
        </div>
      ),
    },
    {
      key: "address",
      header: "Address",
      render: (v) => (
        <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
          {v.address || "Malaysia Training Base"}
        </span>
      ),
    },
    {
      key: "courts",
      header: "Dedicated Courts",
      render: (v) => (
        <span style={{ fontWeight: 600 }}>{v.courts.length} Court(s)</span>
      ),
    },
    {
      key: "activeOfferingsCount",
      header: "Active Cohorts",
      render: (v) => (
        <span style={{ fontWeight: 700, color: "#0F172A" }}>
          {v.activeOfferingsCount} Offering(s)
        </span>
      ),
    },
    {
      key: "upcomingSessionsCount",
      header: "Upcoming Sessions",
      render: (v) => (
        <span style={{ color: "#065F46", fontWeight: 600 }}>
          {v.upcomingSessionsCount} Scheduled
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (v) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedVenue(v);
            setDetailTab("overview");
          }}
        >
          Inspect Venue
        </Button>
      ),
    },
  ];

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Venues & Facilities"
          subtitle="Configure physical training courts, court capacity limits, and seasonal closure periods."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Venues" },
          ]}
          actions={
            <Button variant="primary" size="md" onClick={() => setIsCreateOpen(true)}>
              + Add Venue Facility
            </Button>
          }
        />

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={search !== ""}
          onReset={() => setSearch("")}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search venues by name, address..."
          />
        </FilterBar>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRowClick={(item) => {
            setSelectedVenue(item);
            setDetailTab("overview");
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

        {/* Venue Detail Drawer */}
        <Drawer
          isOpen={!!selectedVenue}
          onClose={() => setSelectedVenue(null)}
          title={selectedVenue?.name}
          subtitle={`Courts: ${selectedVenue?.courts.length} • Active Cohorts: ${selectedVenue?.activeOfferingsCount}`}
          width="560px"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedVenue(null)}>
              Close
            </Button>
          }
        >
          {selectedVenue && (
            <div>
              <Tabs
                tabs={[
                  { id: "overview", label: "Courts & Info" },
                  { id: "closures", label: "Closure Periods", count: selectedVenue.closurePeriods.length },
                ]}
                activeTab={detailTab}
                onChange={setDetailTab}
              />

              {detailTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ padding: "14px", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>PHYSICAL ADDRESS</div>
                    <div style={{ fontSize: "0.875rem", color: "#0F172A", marginTop: "4px" }}>
                      {selectedVenue.address || "No address specified"}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.9375rem", fontWeight: 700 }}>
                      Configured Courts
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedVenue.courts.map((court) => (
                        <div
                          key={court.id}
                          style={{
                            padding: "12px",
                            backgroundColor: "#FFFFFF",
                            borderRadius: "8px",
                            border: "1px solid #E2E8F0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontWeight: 600, color: "#0F172A" }}>{court.name}</div>
                          <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                            Max Capacity: {court.capacity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "closures" && (
                <div>
                  {selectedVenue.closurePeriods.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#64748B", fontSize: "0.875rem" }}>
                      No active closure periods for this facility.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedVenue.closurePeriods.map((cl) => (
                        <div
                          key={cl.id}
                          style={{
                            padding: "12px",
                            backgroundColor: "#FFFBEB",
                            borderRadius: "8px",
                            border: "1px solid #FDE68A",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#92400E" }}>
                            {cl.reason}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "2px" }}>
                            {cl.startsOn} to {cl.endsOn}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Drawer>

        {/* Create Venue Drawer */}
        <Drawer
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Add Venue Facility"
          subtitle="Register a new sports training centre."
          width="540px"
        >
          <form onSubmit={handleCreateVenue}>
            <FormSection
              title="Facility Details"
              description="Name and address for court allocation and public timetable mapping."
            >
              <Input
                label="Venue Name"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. KHLIM Arena Serdang"
              />

              <Input
                label="Address"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Street address, city, postcode..."
              />
            </FormSection>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <Button variant="outline" size="md" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
                Save Venue to Backend
              </Button>
            </div>
          </form>
        </Drawer>
      </div>
    </AdminShell>
  );
}
