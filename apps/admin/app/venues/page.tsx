"use client";

import React, { useEffect, useState } from "react";
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
import { ADMIN_DEMO_MODE } from "../../lib/demo-mode";
import type { VenueItem } from "../../lib/types";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedVenue, setSelectedVenue] = useState<VenueItem | null>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [showCourtForm, setShowCourtForm] = useState(false);
  const [courtName, setCourtName] = useState("");
  const [courtCapacity, setCourtCapacity] = useState("25");
  const [courtError, setCourtError] = useState<string | null>(null);
  const [isSavingCourt, setIsSavingCourt] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueError, setVenueError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function refreshVenues() {
    const list = await adminApi.listVenues();
    setVenues(list);
    setSelectedVenue((current) =>
      current ? list.find((venue) => venue.id === current.id) || null : null,
    );
    return list;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setPageError(null);
      try {
        await refreshVenues();
      } catch (error) {
        setPageError(
          errorMessage(error, "Venues could not be loaded from the backend."),
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filtered = venues.filter((venue) => {
    const query = search.trim().toLowerCase();
    return (
      query === "" ||
      venue.name.toLowerCase().includes(query) ||
      venue.address?.toLowerCase().includes(query)
    );
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleCreateVenue(event: React.FormEvent) {
    event.preventDefault();
    setVenueError(null);
    setStatusMessage(null);
    if (!venueName.trim()) {
      setVenueError("Venue name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await adminApi.createVenue({
        name: venueName.trim(),
        address: venueAddress.trim() || undefined,
      });
      if (!ADMIN_DEMO_MODE) {
        await refreshVenues();
      }
      setIsCreateOpen(false);
      setVenueName("");
      setVenueAddress("");
      setStatusMessage(
        ADMIN_DEMO_MODE
          ? "Demo venue write simulated. Changes are not persisted."
          : "Venue persisted successfully and reloaded from the backend.",
      );
    } catch (error) {
      setVenueError(
        errorMessage(
          error,
          "Venue was not saved. No local fallback record was created.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCourt(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedVenue) return;
    setCourtError(null);
    setStatusMessage(null);

    const capacity = Number(courtCapacity);
    if (!courtName.trim()) {
      setCourtError("Court name is required.");
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setCourtError("Court capacity must be a positive whole number.");
      return;
    }

    setIsSavingCourt(true);
    try {
      await adminApi.createCourt(selectedVenue.id, {
        name: courtName.trim(),
        capacity,
      });
      if (!ADMIN_DEMO_MODE) {
        await refreshVenues();
      }
      setCourtName("");
      setCourtCapacity("25");
      setShowCourtForm(false);
      setStatusMessage(
        ADMIN_DEMO_MODE
          ? "Demo court write simulated. Changes are not persisted."
          : "Court persisted successfully and reloaded from the backend.",
      );
    } catch (error) {
      setCourtError(
        errorMessage(
          error,
          "Court was not saved. No local fallback record was created.",
        ),
      );
    } finally {
      setIsSavingCourt(false);
    }
  }

  const columns: Column<VenueItem>[] = [
    {
      key: "name",
      header: "Venue Facility",
      render: (venue) => (
        <div>
          <div style={{ fontWeight: 700 }}>{venue.name}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            ID: {venue.id}
          </div>
        </div>
      ),
    },
    {
      key: "address",
      header: "Address",
      render: (venue) => venue.address || "Not provided",
    },
    {
      key: "courts",
      header: "Dedicated Courts",
      render: (venue) => `${venue.courts.length} Court(s)`,
    },
    {
      key: "activeOfferingsCount",
      header: "Active Cohorts",
      render: (venue) => `${venue.activeOfferingsCount} Offering(s)`,
    },
    {
      key: "upcomingSessionsCount",
      header: "Upcoming Sessions",
      render: (venue) => `${venue.upcomingSessionsCount} Scheduled`,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (venue) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedVenue(venue);
            setDetailTab("overview");
            setShowCourtForm(false);
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
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setVenueError(null);
                setIsCreateOpen(true);
              }}
            >
              + Add Venue Facility
            </Button>
          }
        />

        {pageError && (
          <div role="alert" style={{ marginBottom: 16, color: "#991B1B" }}>
            {pageError}
          </div>
        )}
        {statusMessage && (
          <div role="status" style={{ marginBottom: 16, color: "#065F46" }}>
            {statusMessage}
          </div>
        )}

        <FilterBar
          hasActiveFilters={search !== ""}
          onReset={() => {
            setSearch("");
            setPage(1);
          }}
        >
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search venues by name, address..."
          />
        </FilterBar>

        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRowClick={(venue) => {
            setSelectedVenue(venue);
            setDetailTab("overview");
            setShowCourtForm(false);
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

        <Drawer
          isOpen={!!selectedVenue}
          onClose={() => {
            setSelectedVenue(null);
            setShowCourtForm(false);
            setCourtError(null);
          }}
          title={selectedVenue?.name}
          subtitle={
            selectedVenue
              ? `Courts: ${selectedVenue.courts.length} • Active Cohorts: ${selectedVenue.activeOfferingsCount}`
              : undefined
          }
          width="560px"
        >
          {selectedVenue && (
            <div>
              <Tabs
                tabs={[
                  { id: "overview", label: "Courts & Info" },
                  {
                    id: "closures",
                    label: "Closure Periods",
                    count: selectedVenue.closurePeriods.length,
                  },
                ]}
                activeTab={detailTab}
                onChange={setDetailTab}
              />

              {detailTab === "overview" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div>
                    <strong>Physical address:</strong>{" "}
                    {selectedVenue.address || "Not provided"}
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <h4 style={{ margin: 0 }}>Configured Courts</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCourtError(null);
                          setShowCourtForm((current) => !current);
                        }}
                      >
                        + Add Court
                      </Button>
                    </div>

                    {selectedVenue.courts.length === 0 ? (
                      <div style={{ color: "#64748B" }}>
                        No persisted courts are configured for this venue.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {selectedVenue.courts.map((court) => (
                          <div
                            key={court.id}
                            style={{
                              padding: 12,
                              border: "1px solid #E2E8F0",
                              borderRadius: 8,
                            }}
                          >
                            <strong>{court.name}</strong>
                            <div
                              style={{ fontSize: "0.75rem", color: "#64748B" }}
                            >
                              Capacity: {court.capacity}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {showCourtForm && (
                    <form onSubmit={handleCreateCourt}>
                      <FormSection
                        title="Add Court"
                        description="The court is created under this persisted organization-owned venue."
                      >
                        <Input
                          label="Court Name"
                          required
                          value={courtName}
                          onChange={(event) => setCourtName(event.target.value)}
                          placeholder="e.g. Court 1"
                        />
                        <Input
                          label="Court Capacity"
                          type="number"
                          min={1}
                          required
                          value={courtCapacity}
                          onChange={(event) =>
                            setCourtCapacity(event.target.value)
                          }
                        />
                      </FormSection>
                      {courtError && (
                        <div
                          role="alert"
                          style={{ marginTop: 12, color: "#991B1B" }}
                        >
                          <strong>Court not saved.</strong> {courtError}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          disabled={isSavingCourt}
                          onClick={() => setShowCourtForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          type="submit"
                          isLoading={isSavingCourt}
                        >
                          Save Court to Backend
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {detailTab === "closures" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {selectedVenue.closurePeriods.length === 0 ? (
                    <div style={{ color: "#64748B" }}>
                      No active closure periods for this facility.
                    </div>
                  ) : (
                    selectedVenue.closurePeriods.map((closure) => (
                      <div
                        key={closure.id}
                        style={{
                          padding: 12,
                          border: "1px solid #FDE68A",
                          borderRadius: 8,
                        }}
                      >
                        <strong>{closure.reason}</strong>
                        <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                          {closure.startsOn} to {closure.endsOn}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </Drawer>

        <Drawer
          isOpen={isCreateOpen}
          onClose={() => {
            if (!isSaving) {
              setVenueError(null);
              setIsCreateOpen(false);
            }
          }}
          title="Add Venue Facility"
          subtitle="Register a new sports training centre."
          width="540px"
        >
          <form onSubmit={handleCreateVenue}>
            <FormSection
              title="Facility Details"
              description="Name and address are persisted before courts can be added."
            >
              <Input
                label="Venue Name"
                required
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
                placeholder="e.g. KHLIM Arena Serdang"
              />
              <Input
                label="Address"
                value={venueAddress}
                onChange={(event) => setVenueAddress(event.target.value)}
                placeholder="Street address, city, postcode..."
              />
            </FormSection>

            {venueError && (
              <div role="alert" style={{ marginTop: 16, color: "#991B1B" }}>
                <strong>Venue not saved.</strong> {venueError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Button
                variant="outline"
                size="md"
                type="button"
                disabled={isSaving}
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSaving}
              >
                Save Venue to Backend
              </Button>
            </div>
          </form>
        </Drawer>
      </div>
    </AdminShell>
  );
}
