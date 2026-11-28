"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FilterBar } from "../../components/ui/FilterBar";
import { SearchInput } from "../../components/ui/SearchInput";
import { Drawer } from "../../components/ui/Drawer";
import { FormSection } from "../../components/ui/FormSection";
import { Input } from "../../components/ui/Input";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAdminAuth } from "../../lib/auth-context";
import { adminApi, adminApiClient } from "../../lib/admin-api";
import type { StaffRole } from "../../lib/types";

const SESSION_OPERATIONS_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
  "EVENT_STAFF",
];

type SchedulingSession = {
  id: string;
  programmeOfferingId: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  courtName: string | null;
  coachName: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  cancellationReason: string | null;
  _count?: { attendances: number };
};

type AttendanceRecord = {
  id: string;
  athleteId: string;
  athleteName: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE";
  notes: string | null;
};

const DEMO_ATTENDANCE_BY_SESSION: Record<string, AttendanceRecord[]> = {
  "sess-101": [
    {
      id: "att-demo-1",
      athleteId: "ath-lucas-lim",
      athleteName: "Lucas Lim",
      status: "PRESENT",
      notes: null,
    },
    {
      id: "att-demo-2",
      athleteId: "ath-maya-lim",
      athleteName: "Maya Lim",
      status: "LATE",
      notes: "Arrived 10 minutes after warm-up",
    },
  ],
  "sess-102": [
    {
      id: "att-demo-3",
      athleteId: "ath-ryan-wong",
      athleteName: "Ryan Wong",
      status: "PRESENT",
      notes: null,
    },
  ],
};

const emptyForm = {
  programmeOfferingId: "",
  title: "",
  startsAt: "",
  endsAt: "",
  venueName: "",
  courtName: "",
  coachName: "",
  notes: "",
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function SchedulingPage() {
  const { hasRole, isAuthenticated, isDemoMode, mfaSatisfied } = useAdminAuth();
  const canView = hasRole(SESSION_OPERATIONS_ROLES);
  const canManageRegistrations = hasRole([
    "SUPER_ADMIN",
    "MANAGEMENT",
    "ACADEMY_ADMIN",
  ]);

  const [sessions, setSessions] = useState<SchedulingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Attendance drawer
  const [selectedSession, setSelectedSession] =
    useState<SchedulingSession | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeStatus, setAttendeeStatus] =
    useState<AttendanceRecord["status"]>("PRESENT");
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Cancel confirmation dialog
  const [cancelTarget, setCancelTarget] = useState<SchedulingSession | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Complete confirmation
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!canView) {
      setSessions([]);
      setLoading(false);
      return;
    }
    if (!isDemoMode && (!isAuthenticated || !mfaSatisfied)) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      if (isDemoMode) {
        const demoItems = await adminApi.listSessions();
        const mapped: SchedulingSession[] = demoItems.map((item) => ({
          id: item.id,
          programmeOfferingId: item.offeringId,
          title: item.offeringName,
          startsAt: `${item.sessionDate}T${item.startTime}:00+08:00`,
          endsAt: `${item.sessionDate}T${item.endTime}:00+08:00`,
          venueName: item.venueName,
          courtName: item.courtName,
          coachName: item.coachName,
          notes: item.programmeName,
          status:
            item.status === "CANCELLED"
              ? "CANCELLED"
              : item.status === "COMPLETED"
                ? "COMPLETED"
                : "SCHEDULED",
          cancellationReason: null,
          _count: {
            attendances: DEMO_ATTENDANCE_BY_SESSION[item.id]?.length ?? 0,
          },
        }));
        setSessions(mapped);
      } else {
        const result = await adminApiClient.get<SchedulingSession[]>(
          "/admin/scheduling/sessions",
          { cache: "no-store" },
        );
        setSessions(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Training sessions could not be loaded from the backend.",
      );
    } finally {
      setLoading(false);
    }
  }, [canView, isAuthenticated, isDemoMode, mfaSatisfied]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const loadAttendance = useCallback(
    async (session: SchedulingSession) => {
      setSelectedSession(session);
      setAttendanceError(null);
      setAttendanceLoading(true);
      try {
        if (isDemoMode) {
          setAttendance(
            (DEMO_ATTENDANCE_BY_SESSION[session.id] ?? []).map((item) => ({
              ...item,
            })),
          );
        } else {
          const rows = await adminApiClient.get<AttendanceRecord[]>(
            `/admin/scheduling/sessions/${encodeURIComponent(session.id)}/attendance`,
            { cache: "no-store" },
          );
          setAttendance(Array.isArray(rows) ? rows : []);
        }
      } catch (error) {
        setAttendance([]);
        setAttendanceError(
          error instanceof Error
            ? error.message
            : "Attendance records could not be loaded.",
        );
      } finally {
        setAttendanceLoading(false);
      }
    },
    [isDemoMode],
  );

  async function handleCreateSession(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setStatusMessage(null);

    if (
      !form.title.trim() ||
      !form.startsAt ||
      !form.endsAt ||
      !form.venueName.trim()
    ) {
      setCreateError("Title, start time, end time, and venue are required.");
      return;
    }

    const startDate = new Date(form.startsAt);
    const endDate = new Date(form.endsAt);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      setCreateError("End time must be after start time.");
      return;
    }

    setIsCreating(true);
    try {
      if (isDemoMode) {
        const previewSession: SchedulingSession = {
          id: `demo-session-${Date.now()}`,
          programmeOfferingId: form.programmeOfferingId.trim() || null,
          title: form.title.trim(),
          startsAt: startDate.toISOString(),
          endsAt: endDate.toISOString(),
          venueName: form.venueName.trim(),
          courtName: form.courtName.trim() || null,
          coachName: form.coachName.trim() || null,
          notes: form.notes.trim() || null,
          status: "SCHEDULED",
          cancellationReason: null,
          _count: { attendances: 0 },
        };
        setSessions((prev) => [previewSession, ...prev]);
        setForm(emptyForm);
        setIsCreateOpen(false);
        setStatusMessage(
          "Demo training session added locally. Changes are not persisted.",
        );
        return;
      }

      await adminApiClient.post("/admin/scheduling/sessions", {
        ...form,
        title: form.title.trim(),
        venueName: form.venueName.trim(),
        courtName: form.courtName.trim() || null,
        coachName: form.coachName.trim() || null,
        notes: form.notes.trim() || null,
        programmeOfferingId: form.programmeOfferingId.trim() || null,
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
      });
      setForm(emptyForm);
      setIsCreateOpen(false);
      setStatusMessage("Training session created and persisted.");
      await loadSessions();
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Could not create session. Staff MFA is required.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    setStatusMessage(null);
    try {
      if (isDemoMode) {
        setSessions((prev) =>
          prev.map((item) =>
            item.id === cancelTarget.id
              ? {
                  ...item,
                  status: "CANCELLED",
                  cancellationReason: cancelReason.trim(),
                }
              : item,
          ),
        );
        setStatusMessage(
          "Demo cancellation applied locally. Changes are not persisted.",
        );
      } else {
        await adminApiClient.post(
          `/admin/scheduling/sessions/${encodeURIComponent(cancelTarget.id)}/cancel`,
          { reason: cancelReason.trim() },
        );
        setStatusMessage(`Session "${cancelTarget.title}" marked cancelled.`);
        await loadSessions();
      }
      setCancelTarget(null);
      setCancelReason("");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not cancel session.",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function handleCompleteSession(session: SchedulingSession) {
    setCompletingId(session.id);
    setStatusMessage(null);
    try {
      if (isDemoMode) {
        setSessions((prev) =>
          prev.map((item) =>
            item.id === session.id ? { ...item, status: "COMPLETED" } : item,
          ),
        );
        setStatusMessage(
          "Demo completion applied locally. Changes are not persisted.",
        );
      } else {
        await adminApiClient.post(
          `/admin/scheduling/sessions/${encodeURIComponent(session.id)}/complete`,
        );
        setStatusMessage(`Session "${session.title}" marked completed.`);
        await loadSessions();
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Could not complete session.",
      );
    } finally {
      setCompletingId(null);
    }
  }

  async function handleAddAttendance(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSession || !attendeeName.trim()) return;
    setSavingAttendance(true);
    setAttendanceError(null);
    try {
      if (isDemoMode) {
        const nextRecord: AttendanceRecord = {
          id: `att-demo-${Date.now()}`,
          athleteId: `demo-ath-${Date.now()}`,
          athleteName: attendeeName.trim(),
          status: attendeeStatus,
          notes: null,
        };
        setAttendance((prev) => [...prev, nextRecord]);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === selectedSession.id
              ? {
                  ...s,
                  _count: { attendances: (s._count?.attendances ?? 0) + 1 },
                }
              : s,
          ),
        );
        setAttendeeName("");
        return;
      }

      await adminApiClient.put(
        `/admin/scheduling/sessions/${encodeURIComponent(selectedSession.id)}/attendance`,
        {
          athleteName: attendeeName.trim(),
          status: attendeeStatus,
        },
      );
      setAttendeeName("");
      await loadAttendance(selectedSession);
      await loadSessions();
    } catch (error) {
      setAttendanceError(
        error instanceof Error ? error.message : "Could not record attendance.",
      );
    } finally {
      setSavingAttendance(false);
    }
  }

  async function handleUpdateAttendanceStatus(
    record: AttendanceRecord,
    nextStatus: AttendanceRecord["status"],
  ) {
    if (!selectedSession) return;
    setAttendanceError(null);
    try {
      if (isDemoMode) {
        setAttendance((prev) =>
          prev.map((item) =>
            item.id === record.id ? { ...item, status: nextStatus } : item,
          ),
        );
        return;
      }

      await adminApiClient.put(
        `/admin/scheduling/sessions/${encodeURIComponent(selectedSession.id)}/attendance`,
        {
          athleteId: record.athleteId,
          athleteName: record.athleteName,
          status: nextStatus,
          notes: record.notes,
        },
      );
      await loadAttendance(selectedSession);
    } catch (error) {
      setAttendanceError(
        error instanceof Error ? error.message : "Could not update attendance.",
      );
    }
  }

  if (!canView) {
    return (
      <AdminShell>
        <div>
          <PageHeader
            title="Scheduling & Attendance"
            subtitle="Manage individual training sessions, cancellations, and coach attendance logs."
            breadcrumbs={[
              { label: "Operations", href: "/" },
              { label: "Scheduling" },
            ]}
          />
          <EmptyState
            icon="🔒"
            title="Restricted Session Operations"
            description="Scheduling and attendance access is limited to coaches, event staff, academy administrators, and management."
          />
        </div>
      </AdminShell>
    );
  }

  const filtered = sessions.filter((session) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      session.title.toLowerCase().includes(q) ||
      session.venueName.toLowerCase().includes(q) ||
      Boolean(session.coachName?.toLowerCase().includes(q)) ||
      Boolean(session.courtName?.toLowerCase().includes(q));
    const matchesStatus =
      statusFilter === "ALL" || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const scheduledCount = sessions.filter(
    (s) => s.status === "SCHEDULED",
  ).length;
  const completedCount = sessions.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const cancelledCount = sessions.filter(
    (s) => s.status === "CANCELLED",
  ).length;

  const columns: Column<SchedulingSession>[] = [
    {
      key: "title",
      header: "Session",
      render: (session) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {session.title}
          </div>
          {session.cancellationReason && (
            <div
              style={{ fontSize: "0.75rem", color: "#991B1B", marginTop: 2 }}
            >
              Reason: {session.cancellationReason}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Date & Time (MYT)",
      render: (session) => (
        <div style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>
            {formatDateTime(session.startsAt)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Ends {formatTime(session.endsAt)}
          </div>
        </div>
      ),
    },
    {
      key: "venue",
      header: "Venue & Coach",
      render: (session) => (
        <div style={{ fontSize: "0.8125rem" }}>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>
            {session.venueName}
            {session.courtName ? ` · ${session.courtName}` : ""}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {session.coachName ? `Coach: ${session.coachName}` : "Coach TBD"}
          </div>
        </div>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      render: (session) => (
        <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {session._count?.attendances ?? 0} logged
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (session) => <StatusBadge status={session.status} size="sm" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (session) => (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              void loadAttendance(session);
            }}
          >
            Attendance ({session._count?.attendances ?? 0})
          </Button>
          {session.status === "SCHEDULED" && (
            <>
              <Button
                variant="outline"
                size="sm"
                isLoading={completingId === session.id}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleCompleteSession(session);
                }}
              >
                Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                style={{ borderColor: "#FCA5A5", color: "#991B1B" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCancelReason("");
                  setCancelTarget(session);
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <div style={{ minWidth: 0 }}>
        <PageHeader
          title="Scheduling & Attendance"
          subtitle="Manage individual training events, completion states, cancellations, and coach attendance sheets."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Scheduling" },
          ]}
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
            >
              + Create session
            </Button>
          }
        />

        {/* Clear distinction between Legacy Scheduling and Registration Sessions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: "#FFFBEB",
            border: "1px solid #FDE68A",
            color: "#78350F",
            fontSize: "0.82rem",
            marginBottom: 16,
          }}
        >
          <div>
            <strong>Legacy session &amp; attendance log:</strong> This page
            manages individual training events and coach attendance records.
            Public Academy intake cohorts and seat capacities are managed
            separately under Registration Sessions.
          </div>
          {canManageRegistrations && (
            <Link href="/registrations?tab=sessions">
              <Button variant="outline" size="sm">
                Open Registration Sessions →
              </Button>
            </Link>
          )}
        </div>

        <div className="admin-summary-strip" aria-label="Session counts">
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Scheduled</div>
            <div className="admin-summary-tile-value">{scheduledCount}</div>
            <div className="admin-summary-tile-sub">Upcoming or active</div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Completed</div>
            <div className="admin-summary-tile-value">{completedCount}</div>
            <div className="admin-summary-tile-sub">Marked finished</div>
          </div>
          <div className="admin-summary-tile">
            <div className="admin-summary-tile-label">Cancelled</div>
            <div className="admin-summary-tile-value">{cancelledCount}</div>
            <div className="admin-summary-tile-sub">With recorded reason</div>
          </div>
        </div>

        {statusMessage && (
          <div
            role="status"
            style={{
              padding: "12px 16px",
              marginBottom: 16,
              borderRadius: 8,
              backgroundColor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            {statusMessage}
          </div>
        )}

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
            placeholder="Search session, venue, court, coach..."
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label
              htmlFor="scheduling-status-filter"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Status:
            </label>
            <select
              id="scheduling-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </FilterBar>

        {loading ? (
          <LoadingState message="Loading scheduled training sessions..." />
        ) : loadError ? (
          <ErrorState
            title="Unable to Load Training Sessions"
            message={loadError}
            onRetry={() => void loadSessions()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No training sessions found"
            description={
              search || statusFilter !== "ALL"
                ? "Try clearing your search or status filter."
                : "Create an individual training session to track venue, coach assignment, and attendance."
            }
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCreateError(null);
                  setIsCreateOpen(true);
                }}
              >
                + Create Session
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => void loadAttendance(item)}
          />
        )}

        {/* Create Session Drawer */}
        <Drawer
          isOpen={isCreateOpen}
          onClose={() => {
            if (!isCreating) {
              setCreateError(null);
              setIsCreateOpen(false);
            }
          }}
          title="Create Training Session"
          subtitle="Schedule a single training event. Recurring series generation is not enabled in this release."
          width="540px"
        >
          <form onSubmit={handleCreateSession}>
            <FormSection
              title="Session Details"
              description="All dates and times are saved with explicit timezone conversion."
            >
              <Input
                label="Session Title"
                required
                placeholder="e.g. U12 Saturday Morning Skills Training"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <div className="admin-detail-grid">
                <Input
                  label="Start Date & Time"
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
                <Input
                  label="End Date & Time"
                  type="datetime-local"
                  required
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
              <div className="admin-detail-grid">
                <Input
                  label="Venue"
                  required
                  placeholder="e.g. KHLIM Arena Serdang"
                  value={form.venueName}
                  onChange={(e) =>
                    setForm({ ...form, venueName: e.target.value })
                  }
                />
                <Input
                  label="Court (Optional)"
                  placeholder="e.g. Court 1"
                  value={form.courtName}
                  onChange={(e) =>
                    setForm({ ...form, courtName: e.target.value })
                  }
                />
              </div>
              <Input
                label="Assigned Coach (Optional)"
                placeholder="e.g. Coach Marcus Wong"
                value={form.coachName}
                onChange={(e) =>
                  setForm({ ...form, coachName: e.target.value })
                }
              />
              <Input
                label="Programme Offering UUID (Optional)"
                placeholder="Link to an existing offering ID"
                value={form.programmeOfferingId}
                onChange={(e) =>
                  setForm({ ...form, programmeOfferingId: e.target.value })
                }
              />
              <Input
                label="Operational Notes (Optional)"
                placeholder="Focus drills, equipment, or court instructions"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormSection>

            {createError && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                  fontSize: "0.84rem",
                  marginBottom: 16,
                }}
              >
                {createError}
              </div>
            )}

            <div className="admin-drawer-actions">
              <Button
                type="button"
                variant="outline"
                disabled={isCreating}
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isCreating}>
                Save Session
              </Button>
            </div>
          </form>
        </Drawer>

        {/* Attendance Sheet Drawer */}
        <Drawer
          isOpen={Boolean(selectedSession)}
          onClose={() => {
            setSelectedSession(null);
            setAttendance([]);
            setAttendanceError(null);
          }}
          title={
            selectedSession
              ? `Attendance: ${selectedSession.title}`
              : "Attendance"
          }
          subtitle={
            selectedSession
              ? `${formatDateTime(selectedSession.startsAt)} · ${selectedSession.venueName}`
              : undefined
          }
          width="560px"
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
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                    Session Status
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <StatusBadge status={selectedSession.status} size="sm" />
                  </div>
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#475569" }}>
                  Coach:{" "}
                  <strong>{selectedSession.coachName || "Unassigned"}</strong>
                </div>
              </div>

              <form
                onSubmit={handleAddAttendance}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  backgroundColor: "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <strong style={{ fontSize: "0.875rem", color: "#0F172A" }}>
                  Record Athlete Attendance
                </strong>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <input
                    aria-label="Attendee name"
                    required
                    placeholder="Enter athlete full name"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    style={{
                      flex: "1 1 200px",
                      minHeight: 44,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: "0.875rem",
                    }}
                  />
                  <select
                    aria-label="Attendance status"
                    value={attendeeStatus}
                    onChange={(e) =>
                      setAttendeeStatus(
                        e.target.value as AttendanceRecord["status"],
                      )
                    }
                    style={{
                      minHeight: 44,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      backgroundColor: "#FFFFFF",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="PRESENT">Present</option>
                    <option value="LATE">Late</option>
                    <option value="ABSENT">Absent</option>
                    <option value="EXCUSED">Excused</option>
                  </select>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={savingAttendance}
                  >
                    Record
                  </Button>
                </div>
              </form>

              {attendanceError && (
                <div
                  role="alert"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    color: "#991B1B",
                    fontSize: "0.82rem",
                  }}
                >
                  {attendanceError}
                </div>
              )}

              {attendanceLoading ? (
                <LoadingState
                  message="Loading attendance records..."
                  height="160px"
                />
              ) : attendance.length === 0 ? (
                <EmptyState
                  title="No attendance logged yet"
                  description="Record athletes above as they check in for this training session."
                />
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {attendance.map((record) => (
                    <div
                      key={record.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        borderRadius: 8,
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0F172A" }}>
                          {record.athleteName}
                        </div>
                        {record.notes && (
                          <div
                            style={{ fontSize: "0.75rem", color: "#64748B" }}
                          >
                            {record.notes}
                          </div>
                        )}
                      </div>
                      <select
                        aria-label={`Attendance status for ${record.athleteName}`}
                        value={record.status}
                        onChange={(e) =>
                          void handleUpdateAttendanceStatus(
                            record,
                            e.target.value as AttendanceRecord["status"],
                          )
                        }
                        style={{
                          minHeight: 40,
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #CBD5E1",
                          backgroundColor: "#FFFFFF",
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                        }}
                      >
                        <option value="PRESENT">PRESENT</option>
                        <option value="LATE">LATE</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="EXCUSED">EXCUSED</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Drawer>

        {/* Cancel Session Confirmation Dialog */}
        <ConfirmDialog
          isOpen={Boolean(cancelTarget)}
          onClose={() => {
            if (!cancelling) {
              setCancelTarget(null);
              setCancelReason("");
            }
          }}
          onConfirm={() => void handleConfirmCancel()}
          isLoading={cancelling}
          confirmDisabled={!cancelReason.trim()}
          title="Cancel Training Session"
          confirmLabel="Confirm Cancellation"
          variant="danger"
          description={
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0 }}>
                Provide a clear operational reason for cancelling{" "}
                <strong>{cancelTarget?.title}</strong>.
              </p>
              <Input
                label="Cancellation reason"
                required
                placeholder="e.g. Court maintenance or severe weather"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          }
        />
      </div>
    </AdminShell>
  );
}
