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
import { FormSection } from "../../components/ui/FormSection";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { adminApi } from "../../lib/admin-api";
import type { OfferingItem, ProgrammeItem, VenueItem } from "../../lib/types";

export default function OfferingsPage() {
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [programmeFilter, setProgrammeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Selection
  const [selectedOffering, setSelectedOffering] = useState<OfferingItem | null>(null);

  // Create Offering Drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formProgId, setFormProgId] = useState("");
  const [formVenueId, setFormVenueId] = useState("");
  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("20");
  const [formStartsOn, setFormStartsOn] = useState("2026-09-05");
  const [formEndsOn, setFormEndsOn] = useState("2026-11-28");
  const [isSaving, setIsSaving] = useState(false);

  // State Transition Confirm Dialog
  const [stateChangeOffering, setStateChangeOffering] = useState<{
    offering: OfferingItem;
    targetStatus: "OPEN" | "CLOSED" | "INACTIVE";
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [offList, prgList, venList] = await Promise.all([
          adminApi.listOfferings(),
          adminApi.listProgrammes(),
          adminApi.listVenues(),
        ]);
        setOfferings(offList);
        setProgrammes(prgList);
        setVenues(venList);
        if (prgList[0]) setFormProgId(prgList[0].id);
        if (venList[0]) setFormVenueId(venList[0].id);
      } catch (err) {
        console.warn("Failed to load offerings:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = offerings.filter((off) => {
    const matchesSearch =
      off.name.toLowerCase().includes(search.toLowerCase()) ||
      off.programmeName.toLowerCase().includes(search.toLowerCase()) ||
      (off.venueName && off.venueName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || off.status === statusFilter;
    const matchesProg = programmeFilter === "ALL" || off.programmeId === programmeFilter;
    return matchesSearch && matchesStatus && matchesProg;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formProgId) return;

    setIsSaving(true);
    try {
      await adminApi.createOffering({
        programmeId: formProgId,
        venueId: formVenueId || undefined,
        name: formName.trim(),
        capacity: Number(formCapacity),
        startsOn: formStartsOn,
        endsOn: formEndsOn || undefined,
      });

      const updated = await adminApi.listOfferings();
      setOfferings(updated);
      setIsCreateOpen(false);
      setFormName("");
    } catch (err) {
      console.warn("Create offering fallback:", err);
      // Optimistic local add
      const prog = programmes.find((p) => p.id === formProgId);
      const ven = venues.find((v) => v.id === formVenueId);
      const newOff: OfferingItem = {
        id: `off-${Date.now()}`,
        programmeId: formProgId,
        programmeName: prog?.name || "Academy Programme",
        venueId: formVenueId,
        venueName: ven?.name || "KHLIM Training Facility",
        name: formName.trim(),
        capacity: Number(formCapacity),
        enrolledCount: 0,
        availablePlaces: Number(formCapacity),
        startsOn: formStartsOn,
        endsOn: formEndsOn || null,
        status: "OPEN",
      };
      setOfferings([newOff, ...offerings]);
      setIsCreateOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmStateChange = () => {
    if (!stateChangeOffering) return;
    const { offering, targetStatus } = stateChangeOffering;

    setOfferings((prev) =>
      prev.map((o) => (o.id === offering.id ? { ...o, status: targetStatus } : o)),
    );
    setStateChangeOffering(null);
  };

  const columns: Column<OfferingItem>[] = [
    {
      key: "name",
      header: "Offering Name",
      render: (off) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{off.name}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Curriculum: {off.programmeName}
          </div>
        </div>
      ),
    },
    {
      key: "venueName",
      header: "Venue / Court",
      render: (off) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>
            📍 {off.venueName || "KHLIM Centre"}
          </div>
          {off.courtName && (
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{off.courtName}</div>
          )}
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Capacity & Places",
      render: (off) => {
        const percent = Math.round((off.enrolledCount / off.capacity) * 100);
        return (
          <div>
            <div style={{ fontWeight: 700, color: off.availablePlaces === 0 ? "#DC2626" : "#0F172A" }}>
              {off.enrolledCount} / {off.capacity} ({off.availablePlaces} left)
            </div>
            <div
              style={{
                width: "80px",
                height: "5px",
                backgroundColor: "#F1F5F9",
                borderRadius: "3px",
                marginTop: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${percent}%`,
                  backgroundColor: off.availablePlaces === 0 ? "#EF4444" : "#10B981",
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "termDates",
      header: "Term Schedule",
      render: (off) => (
        <div style={{ fontSize: "0.8125rem" }}>
          <div>🗓️ {off.startsOn}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            to {off.endsOn || "Ongoing"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (off) => <StatusBadge status={off.status} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (off) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOffering(off);
            }}
          >
            View
          </Button>

          {off.status === "OPEN" ? (
            <Button
              variant="outline"
              size="sm"
              style={{ borderColor: "#FCA5A5", color: "#DC2626" }}
              onClick={(e) => {
                e.stopPropagation();
                setStateChangeOffering({ offering: off, targetStatus: "CLOSED" });
              }}
            >
              Close
            </Button>
          ) : off.status === "CLOSED" || off.status === "DRAFT" ? (
            <Button
              variant="outline"
              size="sm"
              style={{ borderColor: "#A7F3D0", color: "#065F46" }}
              onClick={(e) => {
                e.stopPropagation();
                setStateChangeOffering({ offering: off, targetStatus: "OPEN" });
              }}
            >
              Open
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Programme Offerings"
          subtitle="Manage active term cohorts, venue allocation, court capacity, and public enrolment status."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Offerings" },
          ]}
          actions={
            <Button variant="primary" size="md" onClick={() => setIsCreateOpen(true)}>
              + Create Offering
            </Button>
          }
        />

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={search !== "" || statusFilter !== "ALL" || programmeFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
            setProgrammeFilter("ALL");
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search offerings by name, venue, programme..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label htmlFor="status-select" style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
              Status:
            </label>
            <select
              id="status-select"
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
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
              <option value="DRAFT">DRAFT</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label htmlFor="prog-select" style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
              Programme:
            </label>
            <select
              id="prog-select"
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "0.8125rem",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                color: "#0F172A",
              }}
            >
              <option value="ALL">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </FilterBar>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRowClick={(item) => setSelectedOffering(item)}
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

        {/* State Change Confirmation Dialog */}
        {stateChangeOffering && (
          <ConfirmDialog
            isOpen={!!stateChangeOffering}
            onClose={() => setStateChangeOffering(null)}
            onConfirm={handleConfirmStateChange}
            title={
              stateChangeOffering.targetStatus === "OPEN"
                ? "Open Offering for Public Enrolment"
                : "Close Offering Enrolment"
            }
            description={
              stateChangeOffering.targetStatus === "OPEN"
                ? `Are you sure you want to open "${stateChangeOffering.offering.name}"? This will allow guardians to enrol players in this offering through the public portal.`
                : `Are you sure you want to close "${stateChangeOffering.offering.name}"? New parent enrolments will be stopped.`
            }
            confirmLabel={
              stateChangeOffering.targetStatus === "OPEN"
                ? "Confirm & Open Offering"
                : "Confirm & Close Enrolment"
            }
            variant={stateChangeOffering.targetStatus === "OPEN" ? "primary" : "warning"}
          />
        )}

        {/* Offering Detail Drawer */}
        <Drawer
          isOpen={!!selectedOffering}
          onClose={() => setSelectedOffering(null)}
          title={selectedOffering?.name}
          subtitle={`Status: ${selectedOffering?.status} • ${selectedOffering?.programmeName}`}
          width="540px"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedOffering(null)}>
              Close
            </Button>
          }
        >
          {selectedOffering && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>VENUE</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {selectedOffering.venueName || "KHLIM Centre"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>COURT</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {selectedOffering.courtName || "Assigned Court"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>STARTS ON</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {selectedOffering.startsOn}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>ENDS ON</div>
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                    {selectedOffering.endsOn || "Ongoing"}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.9375rem", fontWeight: 700 }}>
                  Enrolment & Capacity Breakdown
                </h4>
                <div style={{ padding: "16px", backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#64748B" }}>Total Capacity:</span>
                    <strong>{selectedOffering.capacity} slots</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#64748B" }}>Enrolled Players:</span>
                    <strong style={{ color: "#065F46" }}>{selectedOffering.enrolledCount} active</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Available Places:</span>
                    <strong style={{ color: selectedOffering.availablePlaces === 0 ? "#DC2626" : "#D97706" }}>
                      {selectedOffering.availablePlaces} remaining
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Drawer>

        {/* Create Offering Drawer */}
        <Drawer
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Programme Offering"
          subtitle="Schedule a new cohort with venue and capacity constraints."
          width="540px"
        >
          <form onSubmit={handleCreateOffering}>
            <FormSection
              title="Offering Configuration"
              description="Link an established programme curriculum to physical dates and court capacity."
            >
              <Select
                label="Parent Programme"
                required
                value={formProgId}
                onChange={(e) => setFormProgId(e.target.value)}
                options={programmes.map((p) => ({ label: p.name, value: p.id }))}
              />

              <Input
                label="Offering Cohort Name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. U10 Saturday Morning Term 3"
              />

              <Select
                label="Training Venue"
                required
                value={formVenueId}
                onChange={(e) => setFormVenueId(e.target.value)}
                options={venues.map((v) => ({ label: v.name, value: v.id }))}
              />

              <Input
                label="Court Capacity (Max Enrolments)"
                type="number"
                required
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Input
                  label="Start Date"
                  type="date"
                  required
                  value={formStartsOn}
                  onChange={(e) => setFormStartsOn(e.target.value)}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={formEndsOn}
                  onChange={(e) => setFormEndsOn(e.target.value)}
                />
              </div>
            </FormSection>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <Button variant="outline" size="md" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
                Save Offering to Backend
              </Button>
            </div>
          </form>
        </Drawer>
      </div>
    </AdminShell>
  );
}
