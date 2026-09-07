"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { adminApi, listAdminSports } from "../../lib/admin-api";
import type {
  OfferingItem,
  ProgrammeItem,
  SportItem,
} from "../../lib/types";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [sports, setSports] = useState<SportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedProgramme, setSelectedProgramme] =
    useState<ProgrammeItem | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSportId, setNewSportId] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMinAge, setNewMinAge] = useState("6");
  const [newMaxAge, setNewMaxAge] = useState("9");
  const [newLevel, setNewLevel] = useState("Grassroots Development");
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  async function refreshProgrammes() {
    const list = await adminApi.listProgrammes();
    setProgrammes(list);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [programmeList, offeringList, sportList] = await Promise.all([
          adminApi.listProgrammes(),
          adminApi.listOfferings(),
          listAdminSports(),
        ]);
        setProgrammes(programmeList);
        setOfferings(offeringList);
        setSports(sportList);
        setNewSportId((current) => current || sportList[0]?.id || "");
      } catch (error) {
        setLoadError(
          errorMessage(
            error,
            "Programme configuration could not be loaded from the backend.",
          ),
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const levels = useMemo(
    () => Array.from(new Set(programmes.map((programme) => programme.level))),
    [programmes],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return programmes.filter((programme) => {
      const matchesSearch =
        query === "" ||
        programme.name.toLowerCase().includes(query) ||
        programme.code.toLowerCase().includes(query) ||
        programme.level.toLowerCase().includes(query);
      const matchesLevel =
        levelFilter === "ALL" || programme.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [levelFilter, programmes, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const selectedOfferings = offerings.filter(
    (offering) => offering.programmeId === selectedProgramme?.id,
  );

  const handleCreateProgramme = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);

    if (!newSportId) {
      setCreateError("Select an active organization sport before saving.");
      return;
    }

    if (!newName.trim() || !newCode.trim()) {
      setCreateError("Programme code and name are required.");
      return;
    }

    const minimumAge = Number(newMinAge);
    const maximumAge = Number(newMaxAge);
    if (
      !Number.isInteger(minimumAge) ||
      !Number.isInteger(maximumAge) ||
      minimumAge < 0 ||
      maximumAge < minimumAge
    ) {
      setCreateError("Enter a valid age range before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await adminApi.createProgramme({
        sportId: newSportId,
        code: newCode.trim(),
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        minimumAge,
        maximumAge,
        level: newLevel.trim() || undefined,
      });

      await refreshProgrammes();
      setIsCreateOpen(false);
      setNewCode("");
      setNewName("");
      setNewDescription("");
      setCreateSuccess(true);
    } catch (error) {
      setCreateError(
        errorMessage(
          error,
          "Programme was not saved. No local fallback record was created.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<ProgrammeItem>[] = [
    {
      key: "name",
      header: "Programme",
      render: (programme) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {programme.name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Code: {programme.code}
          </div>
        </div>
      ),
    },
    {
      key: "sportName",
      header: "Sport",
      render: (programme) => <span>{programme.sportName}</span>,
    },
    {
      key: "level",
      header: "Level",
      render: (programme) => <span>{programme.level}</span>,
    },
    {
      key: "ageRange",
      header: "Age Range",
      render: (programme) => (
        <span style={{ fontWeight: 600 }}>
          {programme.minimumAge ?? "—"} – {programme.maximumAge ?? "—"} yrs
        </span>
      ),
    },
    {
      key: "offeringsCount",
      header: "Offerings",
      render: (programme) => (
        <span style={{ fontWeight: 700 }}>{programme.offeringsCount}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (programme) => (
        <StatusBadge
          status={programme.active ? "ACTIVE" : "INACTIVE"}
          size="sm"
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (programme) => (
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedProgramme(programme);
            }}
          >
            View
          </Button>
          <Link href={`/offerings?programmeId=${programme.id}`}>
            <Button
              variant="primary"
              size="sm"
              onClick={(event) => event.stopPropagation()}
            >
              + Offering
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Academy Programmes"
          subtitle="Configure organization-owned curricula using persisted backend state."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Programmes" },
          ]}
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
              disabled={sports.length === 0}
            >
              + Create Programme
            </Button>
          }
        />

        {loadError && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              border: "1px solid #FCA5A5",
              borderRadius: "8px",
              backgroundColor: "#FEF2F2",
              color: "#991B1B",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            {loadError}
          </div>
        )}

        {!loading && !loadError && sports.length === 0 && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              border: "1px solid #FDE68A",
              borderRadius: "8px",
              backgroundColor: "#FFFBEB",
              color: "#92400E",
              fontSize: "0.875rem",
            }}
          >
            No active organization sport is available. Programme creation is
            disabled until an organization sport is activated.
          </div>
        )}

        {createSuccess && (
          <div
            role="status"
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              border: "1px solid #A7F3D0",
              borderRadius: "8px",
              backgroundColor: "#ECFDF5",
              color: "#065F46",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Programme persisted successfully and reloaded from the backend.
          </div>
        )}

        <FilterBar
          hasActiveFilters={search !== "" || levelFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setLevelFilter("ALL");
            setPage(1);
          }}
        >
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search programmes by name, code..."
          />
          <Select
            aria-label="Filter by level"
            value={levelFilter}
            onChange={(event) => {
              setLevelFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { label: "All levels", value: "ALL" },
              ...levels.map((level) => ({ label: level, value: level })),
            ]}
          />
        </FilterBar>

        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(programme) => programme.id}
          isLoading={loading}
          onRowClick={(programme) => setSelectedProgramme(programme)}
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
          isOpen={!!selectedProgramme}
          onClose={() => setSelectedProgramme(null)}
          title={selectedProgramme?.name}
          subtitle={selectedProgramme ? `Code: ${selectedProgramme.code}` : undefined}
          width="600px"
        >
          {selectedProgramme && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  padding: 16,
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  backgroundColor: "#F8FAFC",
                }}
              >
                <div style={{ fontWeight: 700 }}>{selectedProgramme.sportName}</div>
                <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.6 }}>
                  {selectedProgramme.description || "No description provided."}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 10,
                }}
              >
                <div style={{ padding: 12, border: "1px solid #E2E8F0", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Level</div>
                  <strong>{selectedProgramme.level}</strong>
                </div>
                <div style={{ padding: 12, border: "1px solid #E2E8F0", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Age range</div>
                  <strong>
                    {selectedProgramme.minimumAge ?? "—"}–{selectedProgramme.maximumAge ?? "—"}
                  </strong>
                </div>
                <div style={{ padding: 12, border: "1px solid #E2E8F0", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Offerings</div>
                  <strong>{selectedOfferings.length}</strong>
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  color: "#92400E",
                  fontSize: "0.8125rem",
                }}
              >
                <strong>Domain Rule:</strong> Programme and Programme Offering are separate entities. A Programme defines the curriculum; an Offering defines venue, dates, capacity, and operating status.
              </div>
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
          title="Create Programme"
          subtitle="This writes directly to the active organization after server authorization."
          width="560px"
        >
          <form onSubmit={handleCreateProgramme}>
            <FormSection
              title="Programme Identity"
              description="Choose an active organization sport, then define the curriculum identity."
            >
              <Select
                label="Sport"
                required
                value={newSportId}
                onChange={(event) => setNewSportId(event.target.value)}
                options={sports.map((sport) => ({
                  label: `${sport.name} (${sport.code})`,
                  value: sport.id,
                }))}
                helperText="Only sports activated for the current organization are available."
              />
              <Input
                label="Programme Code"
                required
                value={newCode}
                onChange={(event) => setNewCode(event.target.value)}
                placeholder="e.g. U12-DEV"
              />
              <Input
                label="Programme Name"
                required
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. U12 Development"
              />
              <Input
                label="Description"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Curriculum purpose and progression..."
              />
            </FormSection>

            <FormSection
              title="Eligibility"
              description="Age and level boundaries remain backend-authoritative after persistence."
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input
                  label="Minimum Age"
                  type="number"
                  min={0}
                  required
                  value={newMinAge}
                  onChange={(event) => setNewMinAge(event.target.value)}
                />
                <Input
                  label="Maximum Age"
                  type="number"
                  min={0}
                  required
                  value={newMaxAge}
                  onChange={(event) => setNewMaxAge(event.target.value)}
                />
              </div>
              <Input
                label="Level"
                value={newLevel}
                onChange={(event) => setNewLevel(event.target.value)}
                placeholder="e.g. Grassroots Development"
              />
            </FormSection>

            {createError && (
              <div
                role="alert"
                style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  border: "1px solid #FCA5A5",
                  borderRadius: 8,
                  backgroundColor: "#FEF2F2",
                  color: "#991B1B",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                }}
              >
                <strong>Programme not saved.</strong> {createError}
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
                onClick={() => {
                  setCreateError(null);
                  setIsCreateOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSaving}
                disabled={sports.length === 0}
              >
                Save Programme
              </Button>
            </div>
          </form>
        </Drawer>
      </div>
    </AdminShell>
  );
}
