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
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { adminApi } from "../../lib/admin-api";
import type { SessionItem } from "../../lib/types";

export default function SchedulingPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View switch: table vs calendar
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Session / Drawer
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(
    null,
  );

  // Cancel Session Confirm Dialog
  const [cancelTarget, setCancelTarget] = useState<SessionItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await adminApi.listSessions();
        setSessions(list);
      } catch (err) {
        console.warn("Failed to load sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = sessions.filter((s) => {
    const matchesSearch =
      s.offeringName.toLowerCase().includes(search.toLowerCase()) ||
      s.programmeName.toLowerCase().includes(search.toLowerCase()) ||
      s.coachName.toLowerCase().includes(search.toLowerCase()) ||
      s.venueName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === cancelTarget.id ? { ...s, status: "CANCELLED" } : s,
      ),
    );
    setCancelTarget(null);
  };

  const columns: Column<SessionItem>[] = [
    {
      key: "sessionDate",
      header: "Date & Time",
      render: (s) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            🗓️ {s.sessionDate}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            ⏰ {s.startTime} – {s.endTime}
          </div>
        </div>
      ),
    },
    {
      key: "offeringName",
      header: "Cohort / Programme",
      render: (s) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>
            {s.offeringName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {s.programmeName}
          </div>
        </div>
      ),
    },
    {
      key: "venueName",
      header: "Court Location",
      render: (s) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>
            📍 {s.venueName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {s.courtName}
          </div>
        </div>
      ),
    },
    {
      key: "coachName",
      header: "Assigned Coach",
      render: (s) => (
        <span style={{ fontWeight: 600, color: "#0F172A" }}>
          👨‍🏫 {s.coachName}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge status={s.status} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (s) => (
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSession(s);
            }}
          >
            Details
          </Button>
          {s.status === "SCHEDULED" && (
            <Button
              variant="outline"
              size="sm"
              style={{ borderColor: "#FCA5A5", color: "#DC2626" }}
              onClick={(e) => {
                e.stopPropagation();
                setCancelTarget(s);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Scheduling & Training Sessions"
          subtitle="Generate recurring term session series, manage weather cancellations, and allocate replacement sessions."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Scheduling" },
          ]}
          actions={
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant={viewMode === "table" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                📋 Table View
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                📅 Calendar View
              </Button>
            </div>
          }
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
            placeholder="Search sessions by offering, coach, venue..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="sess-status"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Status:
            </label>
            <select
              id="sess-status"
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
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="RESCHEDULED">RESCHEDULED</option>
            </select>
          </div>
        </FilterBar>

        {viewMode === "table" ? (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              onRowClick={(item) => setSelectedSession(item)}
            />

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={setPageSize}
            />
          </>
        ) : (
          /* Calendar View Grid */
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>
                September 2026 Training Timetable
              </h3>
              <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                Active sessions across all academy venues
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {filtered.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid #E2E8F0",
                    backgroundColor: "#F8FAFC",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        color: "#0F172A",
                        fontSize: "0.875rem",
                      }}
                    >
                      🗓️ {s.sessionDate}
                    </span>
                    <StatusBadge status={s.status} size="sm" />
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      color: "#0F172A",
                      margin: "4px 0",
                    }}
                  >
                    {s.offeringName}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                    ⏰ {s.startTime} – {s.endTime} • 📍 {s.courtName}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#334155",
                      marginTop: "4px",
                    }}
                  >
                    Coach: <strong>{s.coachName}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancellation Confirmation Dialog */}
        {cancelTarget && (
          <ConfirmDialog
            isOpen={!!cancelTarget}
            onClose={() => setCancelTarget(null)}
            onConfirm={handleConfirmCancel}
            title="Cancel Training Session"
            description={`Are you sure you want to cancel the session on ${cancelTarget.sessionDate} (${cancelTarget.offeringName})? Guardians will be notified of the cancellation.`}
            confirmLabel="Confirm Session Cancellation"
            variant="danger"
          />
        )}

        {/* Session Detail Drawer */}
        <Drawer
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          title={`Session: ${selectedSession?.sessionDate}`}
          subtitle={`${selectedSession?.offeringName} (${selectedSession?.startTime}–${selectedSession?.endTime})`}
          width="540px"
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSession(null)}
            >
              Close
            </Button>
          }
        >
          {selectedSession && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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
                    STATUS
                  </div>
                  <div style={{ marginTop: "4px" }}>
                    <StatusBadge status={selectedSession.status} size="sm" />
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
                    ASSIGNED COACH
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedSession.coachName}
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
                    FACILITY
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedSession.venueName}
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
                    COURT
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedSession.courtName}
                  </div>
                </div>
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                  }}
                >
                  Attendance Roll
                </h4>
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    textAlign: "center",
                    color: "#64748B",
                    fontSize: "0.875rem",
                  }}
                >
                  📋 Player attendance check-in is logged by coaches on mobile
                  court devices.
                </div>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}
