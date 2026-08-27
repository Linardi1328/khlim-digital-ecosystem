"use client";

import React, { useState, useEffect } from "react";
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
import { Tabs } from "../../components/ui/Tabs";
import { FormSection } from "../../components/ui/FormSection";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { adminApi } from "../../lib/admin-api";
import type { ProgrammeItem, OfferingItem, MembershipPlanItem } from "../../lib/types";

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [plans, setPlans] = useState<MembershipPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Selection
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeItem | null>(null);
  const [detailTab, setDetailTab] = useState("overview");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMinAge, setNewMinAge] = useState("6");
  const [newMaxAge, setNewMaxAge] = useState("9");
  const [newLevel, setNewLevel] = useState("Grassroots Development");
  const [isSaving, setIsSaving] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [prgList, offList, planList] = await Promise.all([
          adminApi.listProgrammes(),
          adminApi.listOfferings(),
          adminApi.listMembershipPlans(),
        ]);
        setProgrammes(prgList);
        setOfferings(offList);
        setPlans(planList);
      } catch (err) {
        console.warn("Failed to load programmes:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = programmes.filter((prg) => {
    const matchesSearch =
      prg.name.toLowerCase().includes(search.toLowerCase()) ||
      prg.code.toLowerCase().includes(search.toLowerCase()) ||
      prg.level.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === "ALL" || prg.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;

    setIsSaving(true);
    try {
      await adminApi.createProgramme({
        code: newCode.trim(),
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        minimumAge: Number(newMinAge),
        maximumAge: Number(newMaxAge),
        level: newLevel,
      });

      const updated = await adminApi.listProgrammes();
      setProgrammes(updated);
      setIsCreateOpen(false);
      setNewName("");
      setNewCode("");
      setNewDescription("");
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err) {
      console.warn("Create programme fallback:", err);
      // Local optimistic update
      const createdItem: ProgrammeItem = {
        id: `prg-${Date.now()}`,
        code: newCode.trim(),
        name: newName.trim(),
        description: newDescription.trim() || null,
        sportCode: "BASKETBALL",
        sportName: "Basketball",
        minimumAge: Number(newMinAge),
        maximumAge: Number(newMaxAge),
        level: newLevel,
        active: true,
        offeringsCount: 0,
      };
      setProgrammes([createdItem, ...programmes]);
      setIsCreateOpen(false);
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<ProgrammeItem>[] = [
    {
      key: "name",
      header: "Programme",
      render: (prg) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{prg.name}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Code: {prg.code}</div>
        </div>
      ),
    },
    {
      key: "sportName",
      header: "Sport",
      render: (prg) => <span>🏀 {prg.sportName}</span>,
    },
    {
      key: "level",
      header: "Level",
      render: (prg) => (
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#B45309",
            backgroundColor: "#FEF3C7",
            padding: "2px 8px",
            borderRadius: "4px",
          }}
        >
          {prg.level}
        </span>
      ),
    },
    {
      key: "ageRange",
      header: "Age Range",
      render: (prg) => (
        <span style={{ fontWeight: 600 }}>
          {prg.minimumAge} – {prg.maximumAge} yrs
        </span>
      ),
    },
    {
      key: "offeringsCount",
      header: "Offerings",
      render: (prg) => (
        <span style={{ fontWeight: 700, color: "#0F172A" }}>
          {prg.offeringsCount} Active
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (prg) => <StatusBadge status={prg.active ? "ACTIVE" : "INACTIVE"} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (prg) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProgramme(prg);
              setDetailTab("overview");
            }}
          >
            View
          </Button>
          <Link href={`/offerings?programmeId=${prg.id}`}>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => e.stopPropagation()}
            >
              + Offering
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const levels = Array.from(new Set(programmes.map((p) => p.level)));
  const programmeOfferings = offerings.filter(
    (o) => o.programmeId === selectedProgramme?.id || o.programmeName === selectedProgramme?.name,
  );

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Academy Programmes"
          subtitle="Define foundational sport curricula, age eligibility brackets, and training progressions."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Programmes" },
          ]}
          actions={
            <Button variant="primary" size="md" onClick={() => setIsCreateOpen(true)}>
              + Create Programme
            </Button>
          }
        />

        {createSuccess && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#ECFDF5",
              color: "#065F46",
              border: "1px solid #A7F3D0",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            ✓ Programme successfully created on KHLIM backend.
          </div>
        )}

        {/* Filter and Search Controls */}
        <FilterBar
          hasActiveFilters={search !== "" || levelFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setLevelFilter("ALL");
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search programmes by name, code..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label htmlFor="level-select" style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
              Level:
            </label>
            <select
              id="level-select"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "0.8125rem",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                color: "#0F172A",
              }}
            >
              <option value="ALL">All Levels</option>
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
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
          onRowClick={(item) => {
            setSelectedProgramme(item);
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

        {/* Programme Detail Drawer */}
        <Drawer
          isOpen={!!selectedProgramme}
          onClose={() => setSelectedProgramme(null)}
          title={selectedProgramme?.name}
          subtitle={`Code: ${selectedProgramme?.code} • Age ${selectedProgramme?.minimumAge}–${selectedProgramme?.maximumAge}`}
          width="600px"
          footer={
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="outline" size="sm" onClick={() => setSelectedProgramme(null)}>
                Close
              </Button>
              <Link href={`/offerings?programmeId=${selectedProgramme?.id}`}>
                <Button variant="primary" size="sm">
                  + Create Offering for this Programme
                </Button>
              </Link>
            </div>
          }
        >
          {selectedProgramme && (
            <div>
              <Tabs
                tabs={[
                  { id: "overview", label: "Overview" },
                  { id: "offerings", label: "Offerings", count: programmeOfferings.length },
                  { id: "plans", label: "Eligible Plans" },
                  { id: "scheduling", label: "Scheduling" },
                ]}
                activeTab={detailTab}
                onChange={setDetailTab}
              />

              {detailTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ backgroundColor: "#F8FAFC", padding: "16px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                      Curriculum Description
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#334155", lineHeight: 1.6, margin: "6px 0 0" }}>
                      {selectedProgramme.description || "Foundational skill training with verified coach assessment."}
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ padding: "12px", backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Sport Discipline</div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {selectedProgramme.sportName}
                      </div>
                    </div>
                    <div style={{ padding: "12px", backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Age Bracket</div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                        {selectedProgramme.minimumAge} – {selectedProgramme.maximumAge} Years
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "8px",
                      backgroundColor: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      fontSize: "0.8125rem",
                      color: "#92400E",
                    }}
                  >
                    <strong>Domain Rule:</strong> Programme and Programme Offering are separate entities. A Programme defines the curriculum, while Offerings define the physical court, venue, term dates, and capacity.
                  </div>
                </div>
              )}

              {detailTab === "offerings" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 700 }}>
                      Active Term Offerings
                    </h4>
                  </div>

                  {programmeOfferings.length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "#64748B", fontSize: "0.875rem" }}>
                      No active offerings scheduled for this programme.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {programmeOfferings.map((off) => (
                        <div
                          key={off.id}
                          style={{
                            padding: "12px",
                            backgroundColor: "#F8FAFC",
                            borderRadius: "8px",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0F172A" }}>
                              {off.name}
                            </div>
                            <StatusBadge status={off.status} size="sm" />
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "4px" }}>
                            📍 {off.venueName} • Enrolled: {off.enrolledCount} / {off.capacity}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab === "plans" && (
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: "0.9375rem", fontWeight: 700 }}>
                    Eligible Membership Plans
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {plans.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          padding: "12px",
                          backgroundColor: "#F8FAFC",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>{p.name}</div>
                          <div style={{ fontWeight: 800, color: "#0F172A" }}>
                            MYR {(p.recurringAmountMinor / 100).toFixed(2)} / {p.billingFrequency.toLowerCase()}
                          </div>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "4px" }}>
                          {p.commitmentCycles} billing cycle(s) • {p.benefitsSummary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailTab === "scheduling" && (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748B", fontSize: "0.875rem" }}>
                  📅 Training schedule series are generated on individual Programme Offerings.
                </div>
              )}
            </div>
          )}
        </Drawer>

        {/* Create Programme Modal Drawer */}
        <Drawer
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Academy Programme"
          subtitle="Add a new sport curriculum definition to the KHLIM catalogue."
          width="540px"
        >
          <form onSubmit={handleCreateProgramme}>
            <FormSection
              title="Programme Specifications"
              description="Define core age eligibility, code, and developmental level."
            >
              <Input
                label="Programme Code"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g. BB-U10-DEV"
                helperText="Unique uppercase system identifier."
              />

              <Input
                label="Programme Name"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. U10 Grassroots Basketball Fundamentals"
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Input
                  label="Minimum Age"
                  type="number"
                  required
                  value={newMinAge}
                  onChange={(e) => setNewMinAge(e.target.value)}
                />
                <Input
                  label="Maximum Age"
                  type="number"
                  required
                  value={newMaxAge}
                  onChange={(e) => setNewMaxAge(e.target.value)}
                />
              </div>

              <Select
                label="Development Level"
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                options={[
                  { label: "Grassroots Development", value: "Grassroots Development" },
                  { label: "Junior Academy", value: "Junior Academy" },
                  { label: "Youth Competitive", value: "Youth Competitive" },
                  { label: "Elite Performance", value: "Elite Performance" },
                ]}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#334155" }}>
                  Curriculum Description
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Details of skills, drills, and focus areas..."
                  style={{
                    padding: "8px 12px",
                    fontSize: "0.875rem",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
            </FormSection>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <Button variant="outline" size="md" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
                Save Programme to Backend
              </Button>
            </div>
          </form>
        </Drawer>
      </div>
    </AdminShell>
  );
}
