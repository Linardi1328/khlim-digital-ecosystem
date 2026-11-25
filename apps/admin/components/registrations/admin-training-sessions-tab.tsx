"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { AdminRegistrationSessionDto } from "@khlim/api-client";
import type { ProgrammeItem, VenueItem } from "../../lib/types";
import {
  AGE_REFERENCE_RULE_OPTIONS,
  ISO_WEEKDAY_OPTIONS,
  SESSION_RECURRENCE_OPTIONS,
  buildSessionCreatePayload,
  buildSessionUpdatePayload,
  classifyAdminRegistrationError,
  closeAdminRegistrationSession,
  createAdminRegistrationSession,
  createEmptySessionForm,
  formatAgeReferenceRule,
  formatFieldErrorMessage,
  formatIsoWeekday,
  formatSessionRecurrence,
  listAdminRegistrationSessions,
  listAuthoritativeProgrammes,
  listAuthoritativeVenues,
  publishAdminRegistrationSession,
  sessionDtoToFormState,
  updateAdminRegistrationSession,
  type AdminRegistrationErrorKind,
  type SessionFormState,
} from "../../lib/registration-admin-api";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DataTable, type Column } from "../ui/DataTable";
import { Drawer } from "../ui/Drawer";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import { StatusBadge } from "../ui/StatusBadge";

function formatAgeRange(minAge: number | null, maxAge: number | null): string {
  if (minAge !== null && maxAge !== null) return `Ages ${minAge}–${maxAge}`;
  if (minAge !== null) return `Ages ${minAge}+`;
  if (maxAge !== null) return `Up to age ${maxAge}`;
  return "No age range set";
}

function formatMytDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
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

export interface AdminTrainingSessionsTabProps {
  isEligible: boolean;
  authContextKey: string;
  onSessionsChange: (sessions: AdminRegistrationSessionDto[]) => void;
  onAuthError: (kind: AdminRegistrationErrorKind, message: string) => void;
}

export function AdminTrainingSessionsTab({
  isEligible,
  authContextKey,
  onSessionsChange,
  onAuthError,
}: AdminTrainingSessionsTabProps) {
  const [sessions, setSessions] = useState<AdminRegistrationSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    variant: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  // Authoritative reference selectors (loaded lazily when drawer opens)
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [selectorsLoading, setSelectorsLoading] = useState(false);
  const [selectorsError, setSelectorsError] = useState<string | null>(null);

  // Create / Edit drawer state
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [editingSession, setEditingSession] =
    useState<AdminRegistrationSessionDto | null>(null);
  const [form, setForm] = useState<SessionFormState>(createEmptySessionForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Publish confirmation dialog state
  const [publishTarget, setPublishTarget] =
    useState<AdminRegistrationSessionDto | null>(null);
  const [scheduleApproved, setScheduleApproved] = useState(false);
  const [ageRuleApproved, setAgeRuleApproved] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Close confirmation dialog state
  const [closeTarget, setCloseTarget] =
    useState<AdminRegistrationSessionDto | null>(null);
  const [closing, setClosing] = useState(false);

  const authGenerationRef = useRef(0);
  const isMountedRef = useRef(true);
  const listSeq = useRef(0);
  const listAbortRef = useRef<AbortController | null>(null);
  const selectorsAbortRef = useRef<AbortController | null>(null);

  const isCurrentAuthGen = useCallback(
    (gen: number) => isMountedRef.current && authGenerationRef.current === gen,
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      authGenerationRef.current += 1;
      listAbortRef.current?.abort();
      selectorsAbortRef.current?.abort();
    };
  }, []);

  useLayoutEffect(() => {
    authGenerationRef.current += 1;
    listSeq.current += 1;
    listAbortRef.current?.abort();
    selectorsAbortRef.current?.abort();
    setSessions([]);
    setProgrammes([]);
    setVenues([]);
    setSelectorsLoading(false);
    setSelectorsError(null);
    setLoadError(null);
    setBanner(null);
    setDrawerMode(null);
    setEditingSession(null);
    setPublishTarget(null);
    setCloseTarget(null);
    setScheduleApproved(false);
    setAgeRuleApproved(false);
    setPublishError(null);
    setFormError(null);
    setFieldErrors({});
    setSaving(false);
    setPublishing(false);
    setClosing(false);
  }, [authContextKey]);

  const fetchSessions = useCallback(async () => {
    void authContextKey;
    const authGen = authGenerationRef.current;
    if (!isEligible) {
      setSessions([]);
      setLoading(false);
      return;
    }

    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;
    const seq = ++listSeq.current;

    setLoading(true);
    setLoadError(null);

    try {
      const response = await listAdminRegistrationSessions(controller.signal);
      if (!isCurrentAuthGen(authGen) || seq !== listSeq.current) return;
      const items = Array.isArray(response.items) ? response.items : [];
      setSessions(items);
      onSessionsChange(items);
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        !isCurrentAuthGen(authGen) ||
        seq !== listSeq.current
      ) {
        return;
      }
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        setSessions([]);
        onSessionsChange([]);
        onAuthError(classified.kind, classified.message);
        setLoading(false);
        return;
      }
      setLoadError(classified.message);
    } finally {
      if (isCurrentAuthGen(authGen) && seq === listSeq.current) {
        setLoading(false);
      }
    }
  }, [
    isEligible,
    authContextKey,
    isCurrentAuthGen,
    onSessionsChange,
    onAuthError,
  ]);

  useEffect(() => {
    void fetchSessions();
    return () => {
      listAbortRef.current?.abort();
    };
  }, [fetchSessions]);

  const loadReferenceSelectors = useCallback(async () => {
    const authGen = authGenerationRef.current;
    selectorsAbortRef.current?.abort();
    const controller = new AbortController();
    selectorsAbortRef.current = controller;
    setSelectorsLoading(true);
    setSelectorsError(null);
    try {
      const [progItems, venueItems] = await Promise.all([
        listAuthoritativeProgrammes(controller.signal),
        listAuthoritativeVenues(controller.signal),
      ]);
      if (controller.signal.aborted || !isCurrentAuthGen(authGen)) return;
      setProgrammes(Array.isArray(progItems) ? progItems : []);
      setVenues(Array.isArray(venueItems) ? venueItems : []);
    } catch (error: unknown) {
      if (controller.signal.aborted || !isCurrentAuthGen(authGen)) return;
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        onAuthError(classified.kind, classified.message);
        setSelectorsLoading(false);
        return;
      }
      setSelectorsError(
        "Unable to load authoritative programmes and venues. Retry before creating or editing.",
      );
    } finally {
      if (!controller.signal.aborted && isCurrentAuthGen(authGen)) {
        setSelectorsLoading(false);
      }
    }
  }, [isCurrentAuthGen, onAuthError]);

  const openCreateDrawer = () => {
    setBanner(null);
    setEditingSession(null);
    setForm(createEmptySessionForm());
    setFieldErrors({});
    setFormError(null);
    setDrawerMode("create");
    void loadReferenceSelectors();
  };

  const openEditDrawer = (session: AdminRegistrationSessionDto) => {
    if (session.publicationState === "CLOSED") return;
    setBanner(null);
    setEditingSession(session);
    setForm(sessionDtoToFormState(session));
    setFieldErrors({});
    setFormError(null);
    setDrawerMode("edit");
    if (session.publicationState === "DRAFT") {
      void loadReferenceSelectors();
    }
  };

  const closeDrawer = () => {
    selectorsAbortRef.current?.abort();
    setDrawerMode(null);
    setEditingSession(null);
    setFieldErrors({});
    setFormError(null);
  };

  const updateFormField = <K extends keyof SessionFormState>(
    key: K,
    value: SessionFormState[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "ageReferenceRule" && value !== "FIXED_DATE"
        ? { ageReferenceDate: "" }
        : {}),
    }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSaveSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    setFormError(null);
    setFieldErrors({});

    const localErrors: Record<string, string> = {};
    if (drawerMode === "create" && !form.programmeId.trim()) {
      localErrors.programmeId = "Programme is required.";
    }
    if (
      (drawerMode === "create" ||
        editingSession?.publicationState === "DRAFT") &&
      !form.name.trim()
    ) {
      localErrors.name = "Session name is required.";
    }
    if (
      (drawerMode === "create" ||
        editingSession?.publicationState === "DRAFT") &&
      !form.venueId.trim()
    ) {
      localErrors.venueId = "Venue is required.";
    }
    const cap = Number.parseInt(form.capacity.trim(), 10);
    if (!form.capacity.trim() || !Number.isInteger(cap) || cap < 1) {
      localErrors.capacity = "Capacity must be a positive whole number.";
    }
    if (
      form.ageReferenceRule === "FIXED_DATE" &&
      !form.ageReferenceDate.trim()
    ) {
      localErrors.ageReferenceDate =
        "Age reference date is required when using Fixed Date rule.";
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setFormError("Please fix the highlighted fields.");
      return;
    }

    const authGen = authGenerationRef.current;
    setSaving(true);
    try {
      if (drawerMode === "create") {
        const created = await createAdminRegistrationSession(
          buildSessionCreatePayload(form),
        );
        if (!isCurrentAuthGen(authGen)) return;
        closeDrawer();
        setBanner({
          variant: "success",
          message: `Draft session "${created.name}" created (v${created.version}).`,
        });
        await fetchSessions();
      } else if (drawerMode === "edit" && editingSession) {
        const patchPayload = buildSessionUpdatePayload(editingSession, form);
        if (!patchPayload) {
          setFormError("No changes detected to save.");
          return;
        }
        const updated = await updateAdminRegistrationSession(
          editingSession.id,
          patchPayload,
        );
        if (!isCurrentAuthGen(authGen)) return;
        closeDrawer();
        setBanner({
          variant: "success",
          message: `Session "${updated.name}" updated (v${updated.version}).`,
        });
        await fetchSessions();
      }
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        closeDrawer();
        onAuthError(classified.kind, classified.message);
        setSaving(false);
        return;
      }

      if (classified.fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        for (const fe of classified.fieldErrors) {
          mapped[fe.field] = formatFieldErrorMessage(fe.field, fe.code);
        }
        setFieldErrors(mapped);
      }

      setFormError(classified.message);

      if (classified.kind === "STALE_VERSION") {
        // Refresh authoritative list so staff sees current version; never auto-replay
        await fetchSessions();
      }
    } finally {
      if (isCurrentAuthGen(authGen)) {
        setSaving(false);
      }
    }
  };

  const openPublishDialog = (session: AdminRegistrationSessionDto) => {
    if (session.publicationState !== "DRAFT") return;
    setBanner(null);
    setPublishTarget(session);
    // Both acknowledgements MUST start unchecked every time
    setScheduleApproved(false);
    setAgeRuleApproved(false);
    setPublishError(null);
  };

  const handleConfirmPublish = async () => {
    if (!publishTarget || publishing || !scheduleApproved || !ageRuleApproved) {
      return;
    }
    const authGen = authGenerationRef.current;
    const targetId = publishTarget.id;
    const targetVersion = publishTarget.version;
    setPublishing(true);
    setPublishError(null);
    try {
      const published = await publishAdminRegistrationSession(targetId, {
        expectedVersion: targetVersion,
        approvals: {
          scheduleApproved: true,
          ageRuleApproved: true,
        },
      });
      if (!isCurrentAuthGen(authGen)) return;
      setPublishTarget(null);
      setScheduleApproved(false);
      setAgeRuleApproved(false);
      setBanner({
        variant: "success",
        message: `Session "${published.name}" is now PUBLISHED (v${published.version}).`,
      });
      await fetchSessions();
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        setPublishTarget(null);
        onAuthError(classified.kind, classified.message);
        setPublishing(false);
        return;
      }
      setPublishError(classified.message);
      if (
        classified.kind === "STALE_VERSION" ||
        classified.kind === "INVALID_TRANSITION"
      ) {
        await fetchSessions();
      }
    } finally {
      if (isCurrentAuthGen(authGen)) {
        setPublishing(false);
      }
    }
  };

  const handleConfirmClose = async () => {
    if (!closeTarget || closing) return;
    const authGen = authGenerationRef.current;
    const targetId = closeTarget.id;
    const targetVersion = closeTarget.version;
    setClosing(true);
    setBanner(null);
    try {
      const closed = await closeAdminRegistrationSession(targetId, {
        expectedVersion: targetVersion,
      });
      if (!isCurrentAuthGen(authGen)) return;
      setCloseTarget(null);
      setBanner({
        variant: "success",
        message: `Session "${closed.name}" is now CLOSED (v${closed.version}). Existing registration records remain preserved.`,
      });
      await fetchSessions();
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      const classified = classifyAdminRegistrationError(error);
      setCloseTarget(null);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        onAuthError(classified.kind, classified.message);
        setClosing(false);
        return;
      }
      setBanner({
        variant: classified.kind === "STALE_VERSION" ? "warning" : "error",
        message: classified.message,
      });
      if (
        classified.kind === "STALE_VERSION" ||
        classified.kind === "INVALID_TRANSITION"
      ) {
        await fetchSessions();
      }
    } finally {
      if (isCurrentAuthGen(authGen)) {
        setClosing(false);
      }
    }
  };

  const columns: Column<AdminRegistrationSessionDto>[] = [
    {
      key: "name",
      header: "Session & Programme",
      render: (session) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {session.name}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: 2 }}>
            {session.programme.name} ·{" "}
            {formatAgeRange(
              session.programme.minimumAge,
              session.programme.maximumAge,
            )}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#64748B",
              fontFamily: "monospace",
              marginTop: 2,
            }}
          >
            v{session.version}
          </div>
        </div>
      ),
    },
    {
      key: "venue",
      header: "Venue & Coach",
      render: (session) => (
        <div style={{ fontSize: "0.82rem" }}>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>
            {session.venue?.name || "No venue"}
          </div>
          <div style={{ color: "#475569" }}>
            Coach: {session.coachDisplayName || "Not set"}
          </div>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule (MYT)",
      render: (session) => (
        <div style={{ fontSize: "0.82rem" }}>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>
            {formatIsoWeekday(session.weekday)}
            {session.startTime && session.endTime
              ? ` · ${session.startTime}–${session.endTime}`
              : ""}
          </div>
          <div style={{ color: "#475569" }}>
            First: {session.firstSessionDate || "Not set"} ·{" "}
            {formatSessionRecurrence(session.recurrence)}
          </div>
          <div style={{ color: "#64748B", fontSize: "0.76rem" }}>
            Age rule:{" "}
            {formatAgeReferenceRule(
              session.ageReferenceRule,
              session.ageReferenceDate,
            )}
          </div>
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Seats (Authoritative)",
      render: (session) => (
        <div style={{ fontSize: "0.82rem" }}>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {session.seatCounts.CONFIRMED} / {session.capacity} confirmed
          </div>
          <div style={{ color: "#475569" }}>
            {session.seatsRemaining} remaining
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {session.seatCounts.RECEIVED} received ·{" "}
            {session.seatCounts.UNDER_REVIEW} in review
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "State",
      render: (session) => (
        <div>
          <StatusBadge status={session.publicationState} size="sm" />
          {session.publishedAt ? (
            <div
              style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 4 }}
            >
              Published {formatMytDateTime(session.publishedAt)}
            </div>
          ) : null}
          {session.closedAt ? (
            <div
              style={{ fontSize: "0.72rem", color: "#991B1B", marginTop: 2 }}
            >
              Closed {formatMytDateTime(session.closedAt)}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (session) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {session.publicationState !== "CLOSED" ? (
            <Button
              size="sm"
              variant="secondary"
              data-testid={`edit-session-${session.id}`}
              onClick={() => openEditDrawer(session)}
            >
              Edit
            </Button>
          ) : null}
          {session.publicationState === "DRAFT" ? (
            <Button
              size="sm"
              variant="primary"
              data-testid={`publish-session-${session.id}`}
              onClick={() => openPublishDialog(session)}
            >
              Publish
            </Button>
          ) : null}
          {session.publicationState === "PUBLISHED" ? (
            <Button
              size="sm"
              variant="danger"
              data-testid={`close-session-${session.id}`}
              onClick={() => setCloseTarget(session)}
            >
              Close
            </Button>
          ) : null}
          {session.publicationState === "CLOSED" ? (
            <span
              data-testid={`session-closed-terminal-${session.id}`}
              style={{ fontSize: "0.76rem", color: "#64748B", fontWeight: 600 }}
            >
              Terminal (Closed)
            </span>
          ) : null}
        </div>
      ),
    },
  ];

  const isPublishedEdit =
    drawerMode === "edit" && editingSession?.publicationState === "PUBLISHED";

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 40,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #CBD5E1",
    backgroundColor: "#FFFFFF",
    fontSize: "0.875rem",
    color: "#0F172A",
  };

  const disabledFieldStyle: React.CSSProperties = {
    ...fieldStyle,
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    cursor: "not-allowed",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#334155",
    marginBottom: 4,
  };

  return (
    <div
      role="tabpanel"
      id="panel-sessions"
      data-testid="admin-registration-sessions-panel"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            Academy Registration Sessions
          </h2>
          <p
            style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#475569" }}
          >
            Server-authoritative cohorts isolated from legacy checkout
            memberships. All schedules follow Asia/Kuala_Lumpur (MYT) and ISO
            weekdays (1 = Monday, 7 = Sunday).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void fetchSessions()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            data-testid="create-session-draft-btn"
            onClick={openCreateDrawer}
          >
            + Create Draft Session
          </Button>
        </div>
      </div>

      {banner ? (
        <div
          role="alert"
          data-testid="sessions-action-banner"
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            fontSize: "0.85rem",
            lineHeight: 1.5,
            backgroundColor:
              banner.variant === "success"
                ? "#ECFDF5"
                : banner.variant === "warning"
                  ? "#FFFBEB"
                  : "#FEF2F2",
            border:
              banner.variant === "success"
                ? "1px solid #A7F3D0"
                : banner.variant === "warning"
                  ? "1px solid #FDE68A"
                  : "1px solid #FECACA",
            color:
              banner.variant === "success"
                ? "#065F46"
                : banner.variant === "warning"
                  ? "#92400E"
                  : "#991B1B",
          }}
        >
          {banner.message}
        </div>
      ) : null}

      {loading ? (
        <LoadingState message="Loading registration sessions..." />
      ) : loadError ? (
        <ErrorState
          title="Failed to Load Training Sessions"
          message={loadError}
          onRetry={() => void fetchSessions()}
        />
      ) : sessions.length === 0 ? (
        <div data-testid="sessions-empty-state">
          <EmptyState
            title="No registration sessions configured"
            description="Create a draft training session using an active Academy programme and venue. Drafts stay hidden from parents until explicitly published."
            action={
              <Button variant="primary" size="sm" onClick={openCreateDrawer}>
                + Create Draft Session
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sessions}
          keyExtractor={(item) => item.id}
        />
      )}

      {/* Create / Edit Session Drawer */}
      <Drawer
        isOpen={Boolean(drawerMode)}
        onClose={closeDrawer}
        title={
          drawerMode === "create"
            ? "Create Draft Training Session"
            : `Edit Session: ${editingSession?.name ?? ""}`
        }
        subtitle={
          drawerMode === "create"
            ? "Schedule fields may remain blank while saving an incomplete draft."
            : isPublishedEdit
              ? `Published session (v${editingSession?.version}) — only coach, capacity, and registration window can change.`
              : `Draft session (v${editingSession?.version}) — all fields are editable prior to publication.`
        }
        width="600px"
      >
        <form
          onSubmit={handleSaveSession}
          noValidate
          data-testid="session-editor-form"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {selectorsError ? (
            <div
              role="alert"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>{selectorsError}</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void loadReferenceSelectors()}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {formError ? (
            <div
              role="alert"
              data-testid="session-form-error"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontSize: "0.83rem",
                lineHeight: 1.45,
              }}
            >
              {formError}
            </div>
          ) : null}

          {drawerMode === "create" ? (
            <div>
              <label htmlFor="session-programme-id" style={labelStyle}>
                Programme *
              </label>
              <select
                id="session-programme-id"
                value={form.programmeId}
                disabled={selectorsLoading}
                onChange={(e) => updateFormField("programmeId", e.target.value)}
                style={selectorsLoading ? disabledFieldStyle : fieldStyle}
              >
                <option value="">
                  {selectorsLoading
                    ? "Loading programmes..."
                    : "Select an active programme..."}
                </option>
                {programmes.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name} ({prog.sportName}
                    {prog.minimumAge !== null || prog.maximumAge !== null
                      ? ` · ${formatAgeRange(prog.minimumAge, prog.maximumAge)}`
                      : ""}
                    {!prog.active ? " · INACTIVE" : ""})
                  </option>
                ))}
              </select>
              {fieldErrors.programmeId ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.programmeId}
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <label style={labelStyle}>
                Programme (locked after creation)
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={editingSession?.programme.name ?? ""}
                style={disabledFieldStyle}
              />
            </div>
          )}

          <div>
            <label htmlFor="session-name" style={labelStyle}>
              Session Name *
            </label>
            <input
              id="session-name"
              type="text"
              maxLength={180}
              disabled={isPublishedEdit}
              value={form.name}
              onChange={(e) => updateFormField("name", e.target.value)}
              placeholder="e.g. Ages 10–12 Saturday Cohort"
              style={isPublishedEdit ? disabledFieldStyle : fieldStyle}
            />
            {fieldErrors.name ? (
              <div
                role="alert"
                style={{ color: "#B91C1C", fontSize: "0.78rem", marginTop: 4 }}
              >
                {fieldErrors.name}
              </div>
            ) : null}
          </div>

          <div className="admin-form-grid-venue-capacity">
            <div>
              <label htmlFor="session-venue-id" style={labelStyle}>
                Venue *
              </label>
              {isPublishedEdit ? (
                <input
                  id="session-venue-id"
                  type="text"
                  readOnly
                  disabled
                  value={editingSession?.venue?.name ?? ""}
                  style={disabledFieldStyle}
                />
              ) : (
                <select
                  id="session-venue-id"
                  value={form.venueId}
                  disabled={selectorsLoading}
                  onChange={(e) => updateFormField("venueId", e.target.value)}
                  style={selectorsLoading ? disabledFieldStyle : fieldStyle}
                >
                  <option value="">
                    {selectorsLoading
                      ? "Loading venues..."
                      : "Select an active venue..."}
                  </option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.venueId ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.venueId}
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="session-capacity" style={labelStyle}>
                Capacity *
              </label>
              <input
                id="session-capacity"
                type="number"
                min={editingSession?.seatCounts.CONFIRMED ?? 1}
                max={10000}
                value={form.capacity}
                onChange={(e) => updateFormField("capacity", e.target.value)}
                placeholder="e.g. 20"
                style={fieldStyle}
              />
              {fieldErrors.capacity ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.capacity}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="session-coach-name" style={labelStyle}>
              Coach Display Name (optional while draft)
            </label>
            <input
              id="session-coach-name"
              type="text"
              maxLength={120}
              value={form.coachDisplayName}
              onChange={(e) =>
                updateFormField("coachDisplayName", e.target.value)
              }
              placeholder="Leave blank if unassigned in draft"
              style={fieldStyle}
            />
            {fieldErrors.coachDisplayName ? (
              <div
                role="alert"
                style={{ color: "#B91C1C", fontSize: "0.78rem", marginTop: 4 }}
              >
                {fieldErrors.coachDisplayName}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="session-weekday" style={labelStyle}>
                ISO Weekday (MYT)
              </label>
              <select
                id="session-weekday"
                disabled={isPublishedEdit}
                value={form.weekday}
                onChange={(e) => updateFormField("weekday", e.target.value)}
                style={isPublishedEdit ? disabledFieldStyle : fieldStyle}
              >
                <option value="">Not set</option>
                {ISO_WEEKDAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.weekday ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.weekday}
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="session-start-time" style={labelStyle}>
                Start Time (HH:MM)
              </label>
              <input
                id="session-start-time"
                type="time"
                disabled={isPublishedEdit}
                value={form.startTime}
                onChange={(e) => updateFormField("startTime", e.target.value)}
                style={isPublishedEdit ? disabledFieldStyle : fieldStyle}
              />
              {fieldErrors.startTime ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.startTime}
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="session-end-time" style={labelStyle}>
                End Time (HH:MM)
              </label>
              <input
                id="session-end-time"
                type="time"
                disabled={isPublishedEdit}
                value={form.endTime}
                onChange={(e) => updateFormField("endTime", e.target.value)}
                style={isPublishedEdit ? disabledFieldStyle : fieldStyle}
              />
              {fieldErrors.endTime ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.endTime}
                </div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="session-first-date" style={labelStyle}>
                First Session Date (YYYY-MM-DD)
              </label>
              <input
                id="session-first-date"
                type="date"
                disabled={isPublishedEdit}
                value={form.firstSessionDate}
                onChange={(e) =>
                  updateFormField("firstSessionDate", e.target.value)
                }
                style={isPublishedEdit ? disabledFieldStyle : fieldStyle}
              />
              {fieldErrors.firstSessionDate ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.firstSessionDate}
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="session-recurrence" style={labelStyle}>
                Recurrence
              </label>
              <select
                id="session-recurrence"
                disabled={isPublishedEdit}
                value={form.recurrence}
                onChange={(e) => updateFormField("recurrence", e.target.value)}
                style={isPublishedEdit ? disabledFieldStyle : fieldStyle}
              >
                <option value="">Not set</option>
                {SESSION_RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.recurrence ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.recurrence}
                </div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="session-age-rule" style={labelStyle}>
                Age Reference Rule
              </label>
              <select
                id="session-age-rule"
                disabled={isPublishedEdit}
                value={form.ageReferenceRule}
                onChange={(e) =>
                  updateFormField("ageReferenceRule", e.target.value)
                }
                style={isPublishedEdit ? disabledFieldStyle : fieldStyle}
              >
                <option value="">Not set</option>
                {AGE_REFERENCE_RULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.ageReferenceRule ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.ageReferenceRule}
                </div>
              ) : null}
            </div>

            {form.ageReferenceRule === "FIXED_DATE" ? (
              <div>
                <label htmlFor="session-age-ref-date" style={labelStyle}>
                  Age Reference Date *
                </label>
                <input
                  id="session-age-ref-date"
                  type="date"
                  disabled={isPublishedEdit}
                  value={form.ageReferenceDate}
                  onChange={(e) =>
                    updateFormField("ageReferenceDate", e.target.value)
                  }
                  style={isPublishedEdit ? disabledFieldStyle : fieldStyle}
                />
                {fieldErrors.ageReferenceDate ? (
                  <div
                    role="alert"
                    style={{
                      color: "#B91C1C",
                      fontSize: "0.78rem",
                      marginTop: 4,
                    }}
                  >
                    {fieldErrors.ageReferenceDate}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="session-opens-at" style={labelStyle}>
                Registration Opens (MYT, optional)
              </label>
              <input
                id="session-opens-at"
                type="datetime-local"
                value={form.enrollmentOpensAt}
                onChange={(e) =>
                  updateFormField("enrollmentOpensAt", e.target.value)
                }
                style={fieldStyle}
              />
              {fieldErrors.enrollmentOpensAt ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.enrollmentOpensAt}
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="session-closes-at" style={labelStyle}>
                Registration Closes (MYT, optional)
              </label>
              <input
                id="session-closes-at"
                type="datetime-local"
                value={form.enrollmentClosesAt}
                onChange={(e) =>
                  updateFormField("enrollmentClosesAt", e.target.value)
                }
                style={fieldStyle}
              />
              {fieldErrors.enrollmentClosesAt ? (
                <div
                  role="alert"
                  style={{
                    color: "#B91C1C",
                    fontSize: "0.78rem",
                    marginTop: 4,
                  }}
                >
                  {fieldErrors.enrollmentClosesAt}
                </div>
              ) : null}
            </div>
          </div>

          <div className="admin-drawer-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDrawer}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              data-testid="save-session-btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : drawerMode === "create"
                  ? "Create Draft Session"
                  : "Save Changes"}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Explicit Publish Confirmation Dialog (both checkboxes start unchecked) */}
      <ConfirmDialog
        isOpen={Boolean(publishTarget)}
        onClose={() => {
          if (!publishing) {
            setPublishTarget(null);
            setScheduleApproved(false);
            setAgeRuleApproved(false);
            setPublishError(null);
          }
        }}
        onConfirm={() => void handleConfirmPublish()}
        isLoading={publishing}
        confirmDisabled={!scheduleApproved || !ageRuleApproved}
        variant="primary"
        title={`Publish "${publishTarget?.name ?? ""}"?`}
        confirmLabel="Publish Session"
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, color: "#334155" }}>
              Publishing exposes this session to parents on the public Academy
              page whenever an approved consent policy and HMAC key ring are
              active. Structural schedule fields lock after publication.
            </p>

            {publishError ? (
              <div
                role="alert"
                data-testid="publish-session-error"
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                }}
              >
                {publishError}
              </div>
            ) : null}

            <label
              htmlFor="publish-schedule-approved"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                cursor: "pointer",
                color: "#0F172A",
                fontWeight: 500,
              }}
            >
              <input
                id="publish-schedule-approved"
                type="checkbox"
                checked={scheduleApproved}
                onChange={(e) => setScheduleApproved(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
              />
              <span>
                <strong>Schedule approved:</strong> Recurring venue booking,
                training day/times, coach, and first session date have been
                confirmed by operations.
              </span>
            </label>

            <label
              htmlFor="publish-age-rule-approved"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                cursor: "pointer",
                color: "#0F172A",
                fontWeight: 500,
              }}
            >
              <input
                id="publish-age-rule-approved"
                type="checkbox"
                checked={ageRuleApproved}
                onChange={(e) => setAgeRuleApproved(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
              />
              <span>
                <strong>Age rule approved:</strong> Programme age boundaries and
                eligibility cutoff rule have been confirmed by Academy
                management.
              </span>
            </label>
          </div>
        }
      />

      {/* Explicit Close Confirmation Dialog (Terminal) */}
      <ConfirmDialog
        isOpen={Boolean(closeTarget)}
        onClose={() => {
          if (!closing) setCloseTarget(null);
        }}
        onConfirm={() => void handleConfirmClose()}
        isLoading={closing}
        variant="danger"
        title={`Close "${closeTarget?.name ?? ""}"?`}
        confirmLabel="Close Session"
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, color: "#334155" }}>
              Closing removes this session from public registration immediately
              so no new registrations can be submitted for it.
            </p>
            <p
              style={{
                margin: 0,
                padding: "8px 10px",
                borderRadius: 6,
                backgroundColor: "#FEF2F2",
                color: "#991B1B",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              Closure is terminal (closed sessions cannot be reopened). All
              existing registration records and audit history remain preserved.
            </p>
          </div>
        }
      />
    </div>
  );
}
