"use client";

import React, { useEffect, useState } from "react";
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
import { updateOfferingStatus } from "../../lib/admin-academy-write-api";
import { adminApi } from "../../lib/admin-api";
import { ADMIN_DEMO_MODE } from "../../lib/demo-mode";
import type {
  OfferingItem,
  OfferingStatus,
  ProgrammeItem,
  VenueItem,
} from "../../lib/types";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export default function OfferingsPage() {
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [programmeFilter, setProgrammeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedOffering, setSelectedOffering] = useState<OfferingItem | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formProgId, setFormProgId] = useState("");
  const [formVenueId, setFormVenueId] = useState("");
  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("20");
  const [formStartsOn, setFormStartsOn] = useState("");
  const [formEndsOn, setFormEndsOn] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [stateChangeOffering, setStateChangeOffering] = useState<{
    offering: OfferingItem;
    targetStatus: OfferingStatus;
  } | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  async function refreshOfferings() {
    const list = await adminApi.listOfferings();
    setOfferings(list);
    setSelectedOffering((current) =>
      current ? list.find((item) => item.id === current.id) || null : null,
    );
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setPageError(null);
      try {
        const [offeringList, programmeList, venueList] = await Promise.all([
          adminApi.listOfferings(),
          adminApi.listProgrammes(),
          adminApi.listVenues(),
        ]);
        setOfferings(offeringList);
        setProgrammes(programmeList);
        setVenues(venueList);
        setFormProgId(programmeList[0]?.id || "");
      } catch (error) {
        setPageError(
          getErrorMessage(
            error,
            "Offering configuration could not be loaded from the backend.",
          ),
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filtered = offerings.filter((offering) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      offering.name.toLowerCase().includes(query) ||
      offering.programmeName.toLowerCase().includes(query) ||
      offering.venueName?.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "ALL" || offering.status === statusFilter;
    const matchesProgramme =
      programmeFilter === "ALL" || offering.programmeId === programmeFilter;
    return matchesSearch && matchesStatus && matchesProgramme;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleCreateOffering(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setStatusMessage(null);

    const capacity = Number(formCapacity);
    if (!formProgId || !formName.trim()) {
      setCreateError("Parent programme and offering name are required.");
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setCreateError("Capacity must be a positive whole number.");
      return;
    }
    if (formStartsOn && formEndsOn && formStartsOn > formEndsOn) {
      setCreateError("Start date cannot be after end date.");
      return;
    }

    setIsSaving(true);
    try {
      await adminApi.createOffering({
        programmeId: formProgId,
        venueId: formVenueId || undefined,
        name: formName.trim(),
        capacity,
        startsOn: formStartsOn,
        endsOn: formEndsOn || undefined,
      });

      if (!ADMIN_DEMO_MODE) {
        await refreshOfferings();
      }
      setIsCreateOpen(false);
      setFormName("");
      setStatusMessage(
        ADMIN_DEMO_MODE
          ? "Demo write simulated. Changes are not persisted."
          : "Offering persisted successfully and reloaded from the backend.",
      );
    } catch (error) {
      setCreateError(
        getErrorMessage(
          error,
          "Offering was not saved. No local fallback record was created.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmStateChange() {
    if (!stateChangeOffering) return;
    const { offering, targetStatus } = stateChangeOffering;
    setIsChangingStatus(true);
    setPageError(null);
    setStatusMessage(null);

    try {
      const outcome = await updateOfferingStatus(offering.id, targetStatus);
      if (outcome.demo) {
        setOfferings((current) =>
          current.map((item) =>
            item.id === offering.id ? { ...item, status: targetStatus } : item,
          ),
        );
        setSelectedOffering((current) =>
          current?.id === offering.id
            ? { ...current, status: targetStatus }
            : current,
        );
        setStatusMessage(
          "Demo status change simulated. Changes are not persisted.",
        );
      } else {
        await refreshOfferings();
        setStatusMessage(
          `Offering status persisted as ${targetStatus} and reloaded from the backend.`,
        );
      }
      setStateChangeOffering(null);
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          "Offering status was not changed. Backend state remains authoritative.",
        ),
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  const columns: Column<OfferingItem>[] = [
    {
      key: "name",
      header: "Offering Name",
      render: (offering) => (
        <div>
          <div style={{ fontWeight: 700 }}>{offering.name}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Curriculum: {offering.programmeName}
          </div>
        </div>
      ),
    },
    {
      key: "venueName",
      header: "Venue",
      render: (offering) => offering.venueName || "Unassigned",
    },
    {
      key: "capacity",
      header: "Capacity",
      render: (offering) => (
        <span>
          {offering.enrolledCount} / {offering.capacity} ({offering.availablePlaces}{" "}
          left)
        </span>
      ),
    },
    {
      key: "termDates",
      header: "Term Schedule",
      render: (offering) => (
        <span>
          {offering.startsOn || "Not set"} → {offering.endsOn || "Ongoing"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (offering) => <StatusBadge status={offering.status} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (offering) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedOffering(offering);
            }}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setStateChangeOffering({
                offering,
                targetStatus: offering.status === "OPEN" ? "CLOSED" : "OPEN",
              });
            }}
          >
            {offering.status === "OPEN" ? "Close" : "Open"}
          </Button>
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
            <Button
              variant="primary"
              size="md"
              disabled={programmes.length === 0}
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
            >
              + Create Offering
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
        {!loading && programmes.length === 0 && (
          <div role="alert" style={{ marginBottom: 16, color: "#92400E" }}>
            Create an active programme before creating an offering.
          </div>
        )}

        <FilterBar
          hasActiveFilters={
            search !== "" || statusFilter !== "ALL" || programmeFilter !== "ALL"
          }
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
            setProgrammeFilter("ALL");
            setPage(1);
          }}
        >
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search offerings by name, venue, programme..."
          />
          <Select
            aria-label="Filter by offering status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { label: "All statuses", value: "ALL" },
              { label: "DRAFT", value: "DRAFT" },
              { label: "OPEN", value: "OPEN" },
              { label: "CLOSED", value: "CLOSED" },
              { label: "INACTIVE", value: "INACTIVE" },
            ]}
          />
          <Select
            aria-label="Filter by programme"
            value={programmeFilter}
            onChange={(event) => {
              setProgrammeFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { label: "All programmes", value: "ALL" },
              ...programmes.map((programme) => ({
                label: programme.name,
                value: programme.id,
              })),
            ]}
          />
        </FilterBar>

        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRowClick={setSelectedOffering}
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

        {stateChangeOffering && (
          <ConfirmDialog
            isOpen
            onClose={() => {
              if (!isChangingStatus) setStateChangeOffering(null);
            }}
            onConfirm={handleConfirmStateChange}
            title={`Change offering status to ${stateChangeOffering.targetStatus}`}
            description={`This changes the persisted enrolment state for “${stateChangeOffering.offering.name}”.`}
            confirmLabel={
              isChangingStatus
                ? "Saving..."
                : `Confirm ${stateChangeOffering.targetStatus}`
            }
            variant={
              stateChangeOffering.targetStatus === "OPEN" ? "primary" : "warning"
            }
          />
        )}

        <Drawer
          isOpen={!!selectedOffering}
          onClose={() => setSelectedOffering(null)}
          title={selectedOffering?.name}
          subtitle={
            selectedOffering
              ? `${selectedOffering.programmeName} • ${selectedOffering.status}`
              : undefined
          }
          width="540px"
        >
          {selectedOffering && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <strong>Venue:</strong> {selectedOffering.venueName || "Unassigned"}
              </div>
              <div>
                <strong>Dates:</strong> {selectedOffering.startsOn || "Not set"} →{" "}
                {selectedOffering.endsOn || "Ongoing"}
              </div>
              <div>
                <strong>Capacity:</strong> {selectedOffering.enrolledCount} /{" "}
                {selectedOffering.capacity}
              </div>
              {selectedOffering.status !== "INACTIVE" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setStateChangeOffering({
                      offering: selectedOffering,
                      targetStatus: "INACTIVE",
                    })
                  }
                >
                  Deactivate Offering
                </Button>
              )}
            </div>
          )}
        </Drawer>

        <Drawer
          isOpen={isCreateOpen}
          onClose={() => {
            if (!isSaving) {
              setCreateError(null);
              setIsCreateOpen(false);
            }
          }}
          title="Create Programme Offering"
          subtitle="Schedule a new cohort with venue and capacity constraints."
          width="540px"
        >
          <form onSubmit={handleCreateOffering}>
            <FormSection
              title="Offering Configuration"
              description="The new offering is persisted as backend-authoritative Academy configuration."
            >
              <Select
                label="Parent Programme"
                required
                value={formProgId}
                onChange={(event) => setFormProgId(event.target.value)}
                options={programmes.map((programme) => ({
                  label: programme.name,
                  value: programme.id,
                }))}
              />
              <Input
                label="Offering Cohort Name"
                required
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder="e.g. U12 Saturday Morning Term 3"
              />
              <Select
                label="Training Venue"
                value={formVenueId}
                onChange={(event) => setFormVenueId(event.target.value)}
                options={[
                  { label: "No venue assigned", value: "" },
                  ...venues.map((venue) => ({
                    label: venue.name,
                    value: venue.id,
                  })),
                ]}
              />
              <Input
                label="Court Capacity (Max Enrolments)"
                type="number"
                min={1}
                required
                value={formCapacity}
                onChange={(event) => setFormCapacity(event.target.value)}
              />
              <Input
                label="Start Date"
                type="date"
                value={formStartsOn}
                onChange={(event) => setFormStartsOn(event.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={formEndsOn}
                onChange={(event) => setFormEndsOn(event.target.value)}
              />
            </FormSection>

            {createError && (
              <div role="alert" style={{ marginTop: 16, color: "#991B1B" }}>
                <strong>Offering not saved.</strong> {createError}
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
                Save Offering to Backend
              </Button>
            </div>
          </form>
        </Drawer>
      </div>
    </AdminShell>
  );
}
