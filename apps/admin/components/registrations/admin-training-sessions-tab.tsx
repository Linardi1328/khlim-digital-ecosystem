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
  MAX_SESSION_CAPACITY,
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
  formatPublicationStateLabel,
  formatSessionRecurrence,
  getAdminRegistrationSession,
  listAdminRegistrationSessions,
  listAuthoritativeProgrammes,
  listAuthoritativeVenues,
  parseStrictSessionCapacity,
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
  isSuspended?: boolean;
  authTransitionSeq?: number;
  authContextKey: string;
  onSessionsChange: (sessions: AdminRegistrationSessionDto[]) => void;
  onAuthError: (kind: AdminRegistrationErrorKind, message: string) => void;
}

export function AdminTrainingSessionsTab({
  isEligible,
  isSuspended = false,
  authTransitionSeq = 0,
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
  const [staleConflict, setStaleConflict] = useState<{
    status: "loading" | "loaded" | "missing" | "failed";
    staleVersion: number;
    attemptedForm: SessionFormState;
    refreshedSession: AdminRegistrationSessionDto | null;
  } | null>(null);
  const [conflictComparison, setConflictComparison] =
    useState<SessionFormState | null>(null);
  const [interruptedSaveReview, setInterruptedSaveReview] = useState<{
    mode: "create" | "edit";
    sessionId: string | null;
    staleVersion: number | null;
    attemptedForm: SessionFormState;
    status: "refreshing" | "loaded" | "missing" | "failed" | "list_refreshed";
    refreshedSession: AdminRegistrationSessionDto | null;
  } | null>(null);

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
  const editorInstanceIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const prevAuthTransitionSeqRef = useRef(authTransitionSeq);
  const listSeq = useRef(0);
  const conflictLookupSeq = useRef(0);
  const listAbortRef = useRef<AbortController | null>(null);
  const selectorsAbortRef = useRef<AbortController | null>(null);
  const conflictAbortRef = useRef<AbortController | null>(null);
  const selectorsLoadingRef = useRef(false);
  const needsSelectorsRefreshRef = useRef(false);
  const activeSaveMutationRef = useRef<{
    mode: "create" | "edit";
    sessionId: string | null;
    staleVersion: number | null;
    attemptedForm: SessionFormState;
  } | null>(null);
  const interruptedSaveRef = useRef<{
    mode: "create" | "edit";
    sessionId: string | null;
    staleVersion: number | null;
    attemptedForm: SessionFormState;
  } | null>(null);
  const interruptedSaveLoadingRef = useRef<{
    mode: "create" | "edit";
    sessionId: string | null;
    staleVersion: number | null;
    attemptedForm: SessionFormState;
  } | null>(null);
  const staleConflictLoadingRef = useRef<{
    sessionId: string;
    attemptedForm: SessionFormState;
    staleVersion: number;
  } | null>(null);
  const interruptedConflictLookupRef = useRef<{
    sessionId: string;
    attemptedForm: SessionFormState;
    staleVersion: number;
  } | null>(null);
  const publishingTokenRef = useRef<symbol | null>(null);
  const closingTokenRef = useRef<symbol | null>(null);
  const drawerModeRef = useRef<"create" | "edit" | null>(null);
  drawerModeRef.current = drawerMode;
  const editingSessionRef = useRef<AdminRegistrationSessionDto | null>(null);
  editingSessionRef.current = editingSession;

  const isCurrentAuthGen = useCallback(
    (gen: number) => isMountedRef.current && authGenerationRef.current === gen,
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      authGenerationRef.current += 1;
      editorInstanceIdRef.current += 1;
      conflictLookupSeq.current += 1;
      listAbortRef.current?.abort();
      selectorsAbortRef.current?.abort();
      conflictAbortRef.current?.abort();
    };
  }, []);

  useLayoutEffect(() => {
    if (prevAuthTransitionSeqRef.current === authTransitionSeq) {
      return;
    }
    prevAuthTransitionSeqRef.current = authTransitionSeq;
    authGenerationRef.current += 1;
    listSeq.current += 1;
    conflictLookupSeq.current += 1;
    listAbortRef.current?.abort();
    selectorsAbortRef.current?.abort();
    conflictAbortRef.current?.abort();

    setLoading(false);
    if (selectorsLoadingRef.current) {
      selectorsLoadingRef.current = false;
      setSelectorsLoading(false);
      if (drawerModeRef.current) {
        needsSelectorsRefreshRef.current = true;
      }
    }

    if (staleConflictLoadingRef.current) {
      interruptedConflictLookupRef.current = staleConflictLoadingRef.current;
      staleConflictLoadingRef.current = null;
    }

    if (interruptedSaveLoadingRef.current) {
      interruptedSaveRef.current = interruptedSaveLoadingRef.current;
      interruptedSaveLoadingRef.current = null;
    }

    if (activeSaveMutationRef.current) {
      const interrupted = activeSaveMutationRef.current;
      activeSaveMutationRef.current = null;
      interruptedSaveRef.current = interrupted;
      setSaving(false);
      setInterruptedSaveReview({
        mode: interrupted.mode,
        sessionId: interrupted.sessionId,
        staleVersion: interrupted.staleVersion,
        attemptedForm: interrupted.attemptedForm,
        status: "refreshing",
        refreshedSession: null,
      });
    }

    // Clear obsolete publish/close confirmation dialogs and acknowledgements
    setPublishTarget(null);
    setScheduleApproved(false);
    setAgeRuleApproved(false);
    setPublishError(null);
    setCloseTarget(null);

    if (publishingTokenRef.current) {
      publishingTokenRef.current = null;
      setPublishing(false);
      setBanner({
        variant: "warning",
        message:
          "Session revalidation interrupted publishing before confirmation arrived. Its outcome is uncertain — inspect the refreshed sessions list before retrying.",
      });
    }

    if (closingTokenRef.current) {
      closingTokenRef.current = null;
      setClosing(false);
      setBanner({
        variant: "warning",
        message:
          "Session revalidation interrupted closing the session before confirmation arrived. Its outcome is uncertain — inspect the refreshed sessions list before retrying.",
      });
    }
  }, [authTransitionSeq]);

  useLayoutEffect(() => {
    authGenerationRef.current += 1;
    editorInstanceIdRef.current += 1;
    listSeq.current += 1;
    conflictLookupSeq.current += 1;
    listAbortRef.current?.abort();
    selectorsAbortRef.current?.abort();
    conflictAbortRef.current?.abort();
    selectorsLoadingRef.current = false;
    needsSelectorsRefreshRef.current = false;
    activeSaveMutationRef.current = null;
    interruptedSaveRef.current = null;
    interruptedSaveLoadingRef.current = null;
    staleConflictLoadingRef.current = null;
    interruptedConflictLookupRef.current = null;
    publishingTokenRef.current = null;
    closingTokenRef.current = null;
    setSessions([]);
    setProgrammes([]);
    setVenues([]);
    setSelectorsLoading(false);
    setSelectorsError(null);
    setLoadError(null);
    setBanner(null);
    setDrawerMode(null);
    setEditingSession(null);
    setStaleConflict(null);
    setConflictComparison(null);
    setInterruptedSaveReview(null);
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

  const fetchSessions = useCallback(async (): Promise<
    AdminRegistrationSessionDto[] | null
  > => {
    void authContextKey;
    const authGen = authGenerationRef.current;
    if (isSuspended) {
      listSeq.current += 1;
      listAbortRef.current?.abort();
      return null;
    }
    if (!isEligible) {
      setSessions([]);
      setLoading(false);
      return null;
    }

    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;
    const seq = ++listSeq.current;

    setLoading(true);
    setLoadError(null);

    try {
      const response = await listAdminRegistrationSessions(controller.signal);
      if (!isCurrentAuthGen(authGen) || seq !== listSeq.current) return null;
      const items = Array.isArray(response.items) ? response.items : [];
      setSessions(items);
      onSessionsChange(items);
      return items;
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        !isCurrentAuthGen(authGen) ||
        seq !== listSeq.current
      ) {
        return null;
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
        return null;
      }
      setLoadError(classified.message);
      return null;
    } finally {
      if (isCurrentAuthGen(authGen) && seq === listSeq.current) {
        setLoading(false);
      }
    }
  }, [
    isEligible,
    isSuspended,
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

  const loadReferenceSelectors = useCallback(
    async (expectedInstanceId?: number) => {
      const authGen = authGenerationRef.current;
      const instanceId = expectedInstanceId ?? editorInstanceIdRef.current;
      selectorsAbortRef.current?.abort();
      const controller = new AbortController();
      selectorsAbortRef.current = controller;
      selectorsLoadingRef.current = true;
      setSelectorsLoading(true);
      setSelectorsError(null);
      try {
        const [progItems, venueItems] = await Promise.all([
          listAuthoritativeProgrammes(controller.signal),
          listAuthoritativeVenues(controller.signal),
        ]);
        if (
          controller.signal.aborted ||
          !isCurrentAuthGen(authGen) ||
          editorInstanceIdRef.current !== instanceId
        ) {
          return;
        }
        setProgrammes(Array.isArray(progItems) ? progItems : []);
        setVenues(Array.isArray(venueItems) ? venueItems : []);
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          !isCurrentAuthGen(authGen) ||
          editorInstanceIdRef.current !== instanceId
        ) {
          return;
        }
        const classified = classifyAdminRegistrationError(error);
        if (
          classified.kind === "UNAUTHENTICATED" ||
          classified.kind === "FORBIDDEN"
        ) {
          authGenerationRef.current += 1;
          selectorsLoadingRef.current = false;
          onAuthError(classified.kind, classified.message);
          setSelectorsLoading(false);
          return;
        }
        setSelectorsError(
          "Unable to load authoritative programmes and venues. Retry before creating or editing.",
        );
      } finally {
        if (
          !controller.signal.aborted &&
          isCurrentAuthGen(authGen) &&
          editorInstanceIdRef.current === instanceId
        ) {
          selectorsLoadingRef.current = false;
          setSelectorsLoading(false);
        }
      }
    },
    [isCurrentAuthGen, onAuthError],
  );

  const openCreateDrawer = () => {
    if (!isEligible || isSuspended) return;
    const instanceId = ++editorInstanceIdRef.current;
    activeSaveMutationRef.current = null;
    interruptedSaveRef.current = null;
    interruptedSaveLoadingRef.current = null;
    staleConflictLoadingRef.current = null;
    interruptedConflictLookupRef.current = null;
    setBanner(null);
    setEditingSession(null);
    setForm(createEmptySessionForm());
    setFieldErrors({});
    setFormError(null);
    setStaleConflict(null);
    setConflictComparison(null);
    setInterruptedSaveReview(null);
    setSaving(false);
    setDrawerMode("create");
    void loadReferenceSelectors(instanceId);
  };

  const openEditDrawer = (session: AdminRegistrationSessionDto) => {
    if (!isEligible || isSuspended || session.publicationState === "CLOSED") {
      return;
    }
    const instanceId = ++editorInstanceIdRef.current;
    activeSaveMutationRef.current = null;
    interruptedSaveRef.current = null;
    interruptedSaveLoadingRef.current = null;
    staleConflictLoadingRef.current = null;
    interruptedConflictLookupRef.current = null;
    setBanner(null);
    setEditingSession(session);
    setForm(sessionDtoToFormState(session));
    setFieldErrors({});
    setFormError(null);
    setStaleConflict(null);
    setConflictComparison(null);
    setInterruptedSaveReview(null);
    setSaving(false);
    setDrawerMode("edit");
    if (session.publicationState === "DRAFT") {
      void loadReferenceSelectors(instanceId);
    }
  };

  const closeDrawer = () => {
    editorInstanceIdRef.current += 1;
    conflictLookupSeq.current += 1;
    selectorsAbortRef.current?.abort();
    conflictAbortRef.current?.abort();
    selectorsLoadingRef.current = false;
    needsSelectorsRefreshRef.current = false;
    activeSaveMutationRef.current = null;
    interruptedSaveRef.current = null;
    interruptedSaveLoadingRef.current = null;
    staleConflictLoadingRef.current = null;
    interruptedConflictLookupRef.current = null;
    setDrawerMode(null);
    setEditingSession(null);
    setStaleConflict(null);
    setConflictComparison(null);
    setInterruptedSaveReview(null);
    setSaving(false);
    setFieldErrors({});
    setFormError(null);
  };

  const refreshInterruptedEditSession = useCallback(
    async (
      sessionId: string,
      authGen: number,
      instanceId: number,
      attemptedForm: SessionFormState,
      staleVersion: number | null,
    ) => {
      conflictAbortRef.current?.abort();
      const controller = new AbortController();
      conflictAbortRef.current = controller;
      const lookupSeq = ++conflictLookupSeq.current;
      interruptedSaveLoadingRef.current = {
        mode: "edit",
        sessionId,
        staleVersion,
        attemptedForm,
      };
      try {
        const latest = await getAdminRegistrationSession(
          sessionId,
          controller.signal,
        );
        if (
          controller.signal.aborted ||
          !isCurrentAuthGen(authGen) ||
          editorInstanceIdRef.current !== instanceId ||
          lookupSeq !== conflictLookupSeq.current
        ) {
          return;
        }
        interruptedSaveLoadingRef.current = null;
        setSessions((prev) =>
          prev.some((item) => item.id === latest.id)
            ? prev.map((item) => (item.id === latest.id ? latest : item))
            : prev,
        );
        setInterruptedSaveReview({
          mode: "edit",
          sessionId,
          staleVersion,
          attemptedForm,
          status: "loaded",
          refreshedSession: latest,
        });
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          !isCurrentAuthGen(authGen) ||
          editorInstanceIdRef.current !== instanceId ||
          lookupSeq !== conflictLookupSeq.current
        ) {
          return;
        }
        interruptedSaveLoadingRef.current = null;
        const classified = classifyAdminRegistrationError(error);
        if (
          classified.kind === "UNAUTHENTICATED" ||
          classified.kind === "FORBIDDEN"
        ) {
          authGenerationRef.current += 1;
          closeDrawer();
          onAuthError(classified.kind, classified.message);
          return;
        }
        setInterruptedSaveReview({
          mode: "edit",
          sessionId,
          staleVersion,
          attemptedForm,
          status: classified.kind === "NOT_FOUND" ? "missing" : "failed",
          refreshedSession: null,
        });
      }
    },
    [isCurrentAuthGen, onAuthError],
  );

  const handleLoadInterruptedSessionIntoEditor = () => {
    const refreshed = interruptedSaveReview?.refreshedSession;
    if (!refreshed || refreshed.publicationState === "CLOSED") return;
    const instanceId = editorInstanceIdRef.current;
    setConflictComparison(interruptedSaveReview.attemptedForm);
    setEditingSession(refreshed);
    setForm(sessionDtoToFormState(refreshed));
    setInterruptedSaveReview(null);
    setFormError(null);
    setFieldErrors({});
    if (refreshed.publicationState === "DRAFT") {
      void loadReferenceSelectors(instanceId);
    }
  };

  const handleRetryInterruptedSaveRefresh = async () => {
    if (!interruptedSaveReview || !isEligible || isSuspended) return;
    const authGen = authGenerationRef.current;
    const instanceId = editorInstanceIdRef.current;
    if (
      interruptedSaveReview.mode === "edit" &&
      interruptedSaveReview.sessionId
    ) {
      setInterruptedSaveReview((prev) =>
        prev ? { ...prev, status: "refreshing" } : null,
      );
      await refreshInterruptedEditSession(
        interruptedSaveReview.sessionId,
        authGen,
        instanceId,
        interruptedSaveReview.attemptedForm,
        interruptedSaveReview.staleVersion,
      );
      return;
    }
    interruptedSaveLoadingRef.current = {
      mode: "create",
      sessionId: null,
      staleVersion: null,
      attemptedForm: interruptedSaveReview.attemptedForm,
    };
    setInterruptedSaveReview((prev) =>
      prev ? { ...prev, status: "refreshing" } : null,
    );
    const items = await fetchSessions();
    if (
      !isCurrentAuthGen(authGen) ||
      editorInstanceIdRef.current !== instanceId
    ) {
      return;
    }
    interruptedSaveLoadingRef.current = null;
    setInterruptedSaveReview((prev) =>
      prev
        ? {
            ...prev,
            status: items === null ? "failed" : "list_refreshed",
          }
        : null,
    );
  };

  const refreshStaleConflictSession = useCallback(
    async (
      sessionId: string,
      authGen: number,
      instanceId: number,
      attemptedSnapshot?: SessionFormState,
      staleVersion?: number,
    ) => {
      conflictAbortRef.current?.abort();
      const controller = new AbortController();
      conflictAbortRef.current = controller;
      const lookupSeq = ++conflictLookupSeq.current;
      staleConflictLoadingRef.current =
        attemptedSnapshot && staleVersion !== undefined
          ? { sessionId, attemptedForm: attemptedSnapshot, staleVersion }
          : staleConflictLoadingRef.current;

      // Refresh the list in the background without sharing cancellation or the 100-row cap
      // with the authoritative single-session conflict lookup.
      void fetchSessions();

      try {
        const latest = await getAdminRegistrationSession(
          sessionId,
          controller.signal,
        );
        if (
          controller.signal.aborted ||
          !isCurrentAuthGen(authGen) ||
          editorInstanceIdRef.current !== instanceId ||
          lookupSeq !== conflictLookupSeq.current
        ) {
          return;
        }
        staleConflictLoadingRef.current = null;
        setSessions((prev) =>
          prev.some((item) => item.id === latest.id)
            ? prev.map((item) => (item.id === latest.id ? latest : item))
            : prev,
        );
        setStaleConflict((prev) => {
          if (!prev && (!attemptedSnapshot || staleVersion === undefined)) {
            return null;
          }
          return {
            status: "loaded",
            staleVersion: prev?.staleVersion ?? staleVersion ?? latest.version,
            attemptedForm:
              prev?.attemptedForm ??
              attemptedSnapshot ??
              createEmptySessionForm(),
            refreshedSession: latest,
          };
        });
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          !isCurrentAuthGen(authGen) ||
          editorInstanceIdRef.current !== instanceId ||
          lookupSeq !== conflictLookupSeq.current
        ) {
          return;
        }
        staleConflictLoadingRef.current = null;
        const classified = classifyAdminRegistrationError(error);
        if (
          classified.kind === "UNAUTHENTICATED" ||
          classified.kind === "FORBIDDEN"
        ) {
          authGenerationRef.current += 1;
          closeDrawer();
          onAuthError(classified.kind, classified.message);
          return;
        }
        const nextStatus =
          classified.kind === "NOT_FOUND" ? "missing" : "failed";
        setStaleConflict((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                refreshedSession: null,
              }
            : null,
        );
      }
    },
    [fetchSessions, isCurrentAuthGen, onAuthError],
  );

  // Reconcile interrupted selector loads, stale-conflict lookups, or uncertain saves
  // after same-context renewal completes (never auto-replaying mutations).
  useEffect(() => {
    if (!isEligible || isSuspended) return;

    if (needsSelectorsRefreshRef.current && drawerMode) {
      needsSelectorsRefreshRef.current = false;
      void loadReferenceSelectors(editorInstanceIdRef.current);
    }

    const interruptedConflict = interruptedConflictLookupRef.current;
    if (
      interruptedConflict &&
      editingSessionRef.current?.id === interruptedConflict.sessionId
    ) {
      interruptedConflictLookupRef.current = null;
      void refreshStaleConflictSession(
        interruptedConflict.sessionId,
        authGenerationRef.current,
        editorInstanceIdRef.current,
        interruptedConflict.attemptedForm,
        interruptedConflict.staleVersion,
      );
    }

    const interruptedSave = interruptedSaveRef.current;
    if (interruptedSave) {
      interruptedSaveRef.current = null;
      const authGen = authGenerationRef.current;
      const instanceId = editorInstanceIdRef.current;
      if (interruptedSave.mode === "edit" && interruptedSave.sessionId) {
        void refreshInterruptedEditSession(
          interruptedSave.sessionId,
          authGen,
          instanceId,
          interruptedSave.attemptedForm,
          interruptedSave.staleVersion,
        );
      } else {
        interruptedSaveLoadingRef.current = interruptedSave;
        void (async () => {
          const items = await fetchSessions();
          if (
            !isCurrentAuthGen(authGen) ||
            editorInstanceIdRef.current !== instanceId
          ) {
            return;
          }
          interruptedSaveLoadingRef.current = null;
          setInterruptedSaveReview((prev) =>
            prev
              ? {
                  ...prev,
                  status: items === null ? "failed" : "list_refreshed",
                }
              : null,
          );
        })();
      }
    }
  }, [
    isEligible,
    isSuspended,
    authTransitionSeq,
    drawerMode,
    loadReferenceSelectors,
    refreshStaleConflictSession,
    refreshInterruptedEditSession,
    fetchSessions,
    isCurrentAuthGen,
  ]);

  const handleLoadRefreshedSessionIntoEditor = () => {
    const refreshed = staleConflict?.refreshedSession;
    if (!refreshed || refreshed.publicationState === "CLOSED") return;
    const instanceId = editorInstanceIdRef.current;
    setConflictComparison(staleConflict.attemptedForm);
    setEditingSession(refreshed);
    setForm(sessionDtoToFormState(refreshed));
    setStaleConflict(null);
    setFormError(null);
    setFieldErrors({});
    if (refreshed.publicationState === "DRAFT") {
      void loadReferenceSelectors(instanceId);
    }
  };

  const handleRetryStaleConflictRefresh = async () => {
    if (!editingSession || !staleConflict) return;
    const authGen = authGenerationRef.current;
    const instanceId = editorInstanceIdRef.current;
    const targetId = editingSession.id;
    setStaleConflict((prev) => (prev ? { ...prev, status: "loading" } : null));
    await refreshStaleConflictSession(
      targetId,
      authGen,
      instanceId,
      staleConflict.attemptedForm,
      staleConflict.staleVersion,
    );
  };

  const updateFormField = <K extends keyof SessionFormState>(
    key: K,
    value: SessionFormState[K],
  ) => {
    if (saving) return;
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
    if (
      !isEligible ||
      isSuspended ||
      saving ||
      Boolean(staleConflict) ||
      Boolean(interruptedSaveReview)
    ) {
      return;
    }

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
    const cap = parseStrictSessionCapacity(form.capacity);
    if (cap === null) {
      localErrors.capacity = `Capacity must be a whole number between 1 and ${MAX_SESSION_CAPACITY}.`;
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
    const editorInstanceId = editorInstanceIdRef.current;
    const submittedMode = drawerMode;
    const submittedSession = editingSession;
    const attemptedSnapshot: SessionFormState = { ...form };
    const saveMutation =
      submittedMode === "create" || submittedMode === "edit"
        ? {
            mode: submittedMode,
            sessionId: submittedSession?.id ?? null,
            staleVersion: submittedSession?.version ?? null,
            attemptedForm: attemptedSnapshot,
          }
        : null;
    if (saveMutation) {
      activeSaveMutationRef.current = saveMutation;
    }
    setSaving(true);
    try {
      if (submittedMode === "create") {
        const created = await createAdminRegistrationSession(
          buildSessionCreatePayload(attemptedSnapshot),
        );
        if (!isCurrentAuthGen(authGen)) return;
        if (
          editorInstanceIdRef.current === editorInstanceId &&
          activeSaveMutationRef.current === saveMutation
        ) {
          activeSaveMutationRef.current = null;
          setSaving(false);
        }
        if (editorInstanceIdRef.current === editorInstanceId) {
          closeDrawer();
        }
        setBanner({
          variant: "success",
          message: `Draft session "${created.name}" created (v${created.version}).`,
        });
        await fetchSessions();
      } else if (submittedMode === "edit" && submittedSession) {
        const patchPayload = buildSessionUpdatePayload(
          submittedSession,
          attemptedSnapshot,
        );
        if (!patchPayload) {
          if (
            editorInstanceIdRef.current === editorInstanceId &&
            activeSaveMutationRef.current === saveMutation
          ) {
            activeSaveMutationRef.current = null;
            setSaving(false);
          }
          setFormError("No changes detected to save.");
          return;
        }
        const updated = await updateAdminRegistrationSession(
          submittedSession.id,
          patchPayload,
        );
        if (!isCurrentAuthGen(authGen)) return;
        if (
          editorInstanceIdRef.current === editorInstanceId &&
          activeSaveMutationRef.current === saveMutation
        ) {
          activeSaveMutationRef.current = null;
          setSaving(false);
        }
        if (editorInstanceIdRef.current === editorInstanceId) {
          closeDrawer();
        }
        setBanner({
          variant: "success",
          message: `Session "${updated.name}" updated (v${updated.version}).`,
        });
        await fetchSessions();
      }
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      if (
        editorInstanceIdRef.current === editorInstanceId &&
        activeSaveMutationRef.current === saveMutation
      ) {
        activeSaveMutationRef.current = null;
        setSaving(false);
      }
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        closeDrawer();
        onAuthError(classified.kind, classified.message);
        return;
      }

      if (editorInstanceIdRef.current !== editorInstanceId) {
        if (classified.kind === "STALE_VERSION") {
          void fetchSessions();
        }
        return;
      }

      if (classified.fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        for (const fe of classified.fieldErrors) {
          mapped[fe.field] = formatFieldErrorMessage(fe.field, fe.code);
        }
        setFieldErrors(mapped);
      }

      if (
        classified.kind === "STALE_VERSION" &&
        submittedMode === "edit" &&
        submittedSession
      ) {
        // Use neutral conflict wording while the by-ID recovery lookup runs;
        // the conflict panel reports loading, loaded, missing, or failed status.
        setFormError(
          "This training session was modified by another administrator before your changes were saved. Review the latest server version below before retrying.",
        );
        // Immediately disable Save on stale version and load latest row by ID independently
        // of the bounded 100-row list request so unrelated list refreshes cannot abort recovery.
        setStaleConflict({
          status: "loading",
          staleVersion: submittedSession.version,
          attemptedForm: attemptedSnapshot,
          refreshedSession: null,
        });
        await refreshStaleConflictSession(
          submittedSession.id,
          authGen,
          editorInstanceId,
          attemptedSnapshot,
          submittedSession.version,
        );
        return;
      }

      setFormError(classified.message);
    } finally {
      if (
        isCurrentAuthGen(authGen) &&
        editorInstanceIdRef.current === editorInstanceId &&
        activeSaveMutationRef.current === saveMutation
      ) {
        activeSaveMutationRef.current = null;
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
    if (
      !publishTarget ||
      publishing ||
      !scheduleApproved ||
      !ageRuleApproved ||
      !isEligible ||
      isSuspended
    ) {
      return;
    }
    const authGen = authGenerationRef.current;
    const targetId = publishTarget.id;
    const targetVersion = publishTarget.version;
    const publishToken = Symbol("publish");
    publishingTokenRef.current = publishToken;
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
      if (publishingTokenRef.current === publishToken) {
        publishingTokenRef.current = null;
        setPublishing(false);
      }
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
      if (publishingTokenRef.current === publishToken) {
        publishingTokenRef.current = null;
        setPublishing(false);
      }
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        setPublishTarget(null);
        onAuthError(classified.kind, classified.message);
        return;
      }
      if (
        classified.kind === "STALE_VERSION" ||
        classified.kind === "INVALID_TRANSITION"
      ) {
        // Invalidate stale publish confirmation & acknowledgements so staff must review the refreshed draft
        setPublishTarget(null);
        setScheduleApproved(false);
        setAgeRuleApproved(false);
        setPublishError(null);
        setBanner({
          variant: "warning",
          message: `${classified.message} Reopen Publish from the refreshed draft to review and confirm the updated schedule.`,
        });
        await fetchSessions();
        return;
      }
      setPublishError(classified.message);
    } finally {
      if (
        isCurrentAuthGen(authGen) &&
        publishingTokenRef.current === publishToken
      ) {
        publishingTokenRef.current = null;
        setPublishing(false);
      }
    }
  };

  const handleConfirmClose = async () => {
    if (!closeTarget || closing || !isEligible || isSuspended) return;
    const authGen = authGenerationRef.current;
    const targetId = closeTarget.id;
    const targetVersion = closeTarget.version;
    const closeToken = Symbol("close");
    closingTokenRef.current = closeToken;
    setClosing(true);
    setBanner(null);
    try {
      const closed = await closeAdminRegistrationSession(targetId, {
        expectedVersion: targetVersion,
      });
      if (!isCurrentAuthGen(authGen)) return;
      if (closingTokenRef.current === closeToken) {
        closingTokenRef.current = null;
        setClosing(false);
      }
      setCloseTarget(null);
      setBanner({
        variant: "success",
        message: `Session "${closed.name}" is now CLOSED (v${closed.version}). Existing registration records remain preserved.`,
      });
      await fetchSessions();
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      if (closingTokenRef.current === closeToken) {
        closingTokenRef.current = null;
        setClosing(false);
      }
      const classified = classifyAdminRegistrationError(error);
      setCloseTarget(null);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        onAuthError(classified.kind, classified.message);
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
      if (isCurrentAuthGen(authGen) && closingTokenRef.current === closeToken) {
        closingTokenRef.current = null;
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
      render: (session) => {
        const pct =
          session.capacity > 0
            ? Math.min(
                100,
                Math.round(
                  (session.seatCounts.CONFIRMED / session.capacity) * 100,
                ),
              )
            : 0;
        const barColor =
          session.seatsRemaining === 0
            ? "#DC2626"
            : pct >= 80
              ? "#F59E0B"
              : "#10B981";
        return (
          <div style={{ fontSize: "0.82rem", minWidth: 150 }}>
            <div
              style={{
                fontWeight: 700,
                color: "#0F172A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {session.seatCounts.CONFIRMED} / {session.capacity} confirmed
            </div>
            <div
              aria-hidden="true"
              style={{
                height: 6,
                width: "100%",
                maxWidth: 160,
                borderRadius: 999,
                backgroundColor: "#E2E8F0",
                overflow: "hidden",
                margin: "5px 0",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  backgroundColor: barColor,
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ color: "#475569" }}>
              {session.seatsRemaining} remaining
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
              {session.seatCounts.RECEIVED} received ·{" "}
              {session.seatCounts.UNDER_REVIEW} in review
            </div>
          </div>
        );
      },
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

  if (isSuspended) {
    return null;
  }

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
            Public registration cohorts isolated from legacy scheduling &amp;
            attendance. Publication requires a complete schedule, approved age
            rule, and active approved consent policy. All schedules follow
            Asia/Kuala_Lumpur (MYT) and ISO weekdays (1 = Monday, 7 = Sunday).
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
            disabled={!isEligible || isSuspended}
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

          {interruptedSaveReview ? (
            <div
              role="alert"
              data-testid="session-interrupted-save-notice"
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                backgroundColor: "#FFFBEB",
                border: "1px solid #FDE68A",
                color: "#78350F",
                fontSize: "0.82rem",
                lineHeight: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <strong>
                Session revalidation interrupted your save — outcome uncertain
              </strong>
              {interruptedSaveReview.mode === "edit" ? (
                interruptedSaveReview.status === "loaded" &&
                interruptedSaveReview.refreshedSession ? (
                  <>
                    <div>
                      Your prior update may or may not have been applied on the
                      server. Latest server version:{" "}
                      <strong>
                        v{interruptedSaveReview.refreshedSession.version}
                      </strong>{" "}
                      ·{" "}
                      <strong>
                        {formatPublicationStateLabel(
                          interruptedSaveReview.refreshedSession
                            .publicationState,
                        )}
                      </strong>{" "}
                      (Coach:{" "}
                      <strong>
                        {interruptedSaveReview.refreshedSession
                          .coachDisplayName || "Not set"}
                      </strong>
                      , Capacity:{" "}
                      <strong>
                        {interruptedSaveReview.refreshedSession.capacity}
                      </strong>
                      ).
                    </div>
                    {interruptedSaveReview.refreshedSession.publicationState ===
                    "CLOSED" ? (
                      <div style={{ color: "#991B1B", fontWeight: 600 }}>
                        This session is now CLOSED and can no longer be edited.
                      </div>
                    ) : (
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          data-testid="load-interrupted-session-btn"
                          onClick={handleLoadInterruptedSessionIntoEditor}
                        >
                          Load Latest Version (v
                          {interruptedSaveReview.refreshedSession.version}) to
                          Review
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={closeDrawer}
                        >
                          Close Drawer
                        </Button>
                      </div>
                    )}
                  </>
                ) : interruptedSaveReview.status === "missing" ? (
                  <div style={{ color: "#991B1B", fontWeight: 600 }}>
                    This training session is no longer available and cannot be
                    saved from this editor.
                  </div>
                ) : interruptedSaveReview.status === "failed" ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      Could not refresh the latest session state after
                      revalidation. Refresh and review before retrying.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      data-testid="retry-interrupted-session-refresh-btn"
                      onClick={() => void handleRetryInterruptedSaveRefresh()}
                    >
                      Retry Refresh
                    </Button>
                  </div>
                ) : (
                  <div>
                    Refreshing latest server state before allowing any retry...
                  </div>
                )
              ) : interruptedSaveReview.status === "list_refreshed" ? (
                (() => {
                  const attempted = interruptedSaveReview.attemptedForm;
                  const submittedName = attempted.name.trim();
                  const normalizedSubmitted = submittedName.toLowerCase();
                  const attemptedProgrammeName =
                    programmes.find((p) => p.id === attempted.programmeId)
                      ?.name ||
                    attempted.programmeId ||
                    "Not set";
                  const attemptedVenueName =
                    venues.find((v) => v.id === attempted.venueId)?.name ||
                    attempted.venueId ||
                    "Not set";
                  const attemptedWeekdayNum = attempted.weekday
                    ? Number(attempted.weekday)
                    : null;
                  const attemptedScheduleParts = [
                    attemptedWeekdayNum
                      ? formatIsoWeekday(attemptedWeekdayNum)
                      : null,
                    attempted.startTime && attempted.endTime
                      ? `${attempted.startTime}–${attempted.endTime}`
                      : null,
                    attempted.firstSessionDate
                      ? `starts ${attempted.firstSessionDate}`
                      : null,
                    attempted.recurrence
                      ? formatSessionRecurrence(attempted.recurrence)
                      : null,
                  ].filter(Boolean);
                  const attemptedScheduleSummary =
                    attemptedScheduleParts.length > 0
                      ? attemptedScheduleParts.join(" · ")
                      : "Schedule not set";
                  const matchingSessions = normalizedSubmitted
                    ? sessions.filter(
                        (item) =>
                          item.name.trim().toLowerCase() ===
                          normalizedSubmitted,
                      )
                    : [];
                  const previewSessions =
                    matchingSessions.length > 0
                      ? matchingSessions.slice(0, 5)
                      : sessions.slice(0, 5);
                  return (
                    <>
                      <div data-testid="session-interrupted-create-lookup">
                        <div>
                          {matchingSessions.length > 0 ? (
                            <span>
                              Refreshed list lookup (not proof of the prior
                              request&rsquo;s outcome) found{" "}
                              <strong>{matchingSessions.length}</strong>{" "}
                              candidate session
                              {matchingSessions.length === 1
                                ? ""
                                : "s"} named{" "}
                              <strong>&ldquo;{submittedName}&rdquo;</strong>.
                              Compare programme, venue, and schedule below
                              before retrying or closing this drawer.
                            </span>
                          ) : (
                            <span>
                              Refreshed list lookup (not proof of the prior
                              request&rsquo;s outcome) did not find a session
                              named{" "}
                              <strong>
                                &ldquo;{submittedName || "—"}&rdquo;
                              </strong>{" "}
                              among {sessions.length} loaded session
                              {sessions.length === 1 ? "" : "s"}. Compare the
                              attempted details and refreshed sessions below
                              before retrying.
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: "0.78rem",
                            color: "#78350F",
                          }}
                        >
                          <strong>Attempted draft:</strong>{" "}
                          {submittedName || "—"} · Programme:{" "}
                          {attemptedProgrammeName} · Venue: {attemptedVenueName}{" "}
                          · {attemptedScheduleSummary}
                        </div>
                      </div>
                      {previewSessions.length > 0 ? (
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 18,
                            fontSize: "0.78rem",
                            color: "#78350F",
                          }}
                        >
                          {previewSessions.map((item) => {
                            const itemScheduleParts = [
                              item.weekday
                                ? formatIsoWeekday(item.weekday)
                                : null,
                              item.startTime && item.endTime
                                ? `${item.startTime}–${item.endTime}`
                                : null,
                              `starts ${item.firstSessionDate ?? "TBD"}`,
                              item.recurrence
                                ? formatSessionRecurrence(item.recurrence)
                                : null,
                            ].filter(Boolean);
                            return (
                              <li key={item.id}>
                                <strong>{item.name}</strong> —{" "}
                                {formatPublicationStateLabel(
                                  item.publicationState,
                                )}{" "}
                                (v{item.version}) · Programme:{" "}
                                {item.programme.name} · Venue:{" "}
                                {item.venue?.name || "No venue"} ·{" "}
                                {itemScheduleParts.join(" · ")}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          data-testid="acknowledge-interrupted-session-create-btn"
                          onClick={() => setInterruptedSaveReview(null)}
                        >
                          I Reviewed the Refreshed Sessions — Enable Retry
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={closeDrawer}
                        >
                          Close Drawer
                        </Button>
                      </div>
                    </>
                  );
                })()
              ) : interruptedSaveReview.status === "failed" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    Could not refresh the sessions list after revalidation.
                    Retry refresh before submitting again.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    data-testid="retry-interrupted-session-refresh-btn"
                    onClick={() => void handleRetryInterruptedSaveRefresh()}
                  >
                    Retry Refresh
                  </Button>
                </div>
              ) : (
                <div>
                  Refreshing the sessions list to check whether your draft was
                  created...
                </div>
              )}
            </div>
          ) : null}

          {staleConflict ? (
            <div
              role="alert"
              data-testid="session-stale-conflict-panel"
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                backgroundColor: "#FFFBEB",
                border: "1px solid #FDE68A",
                color: "#78350F",
                fontSize: "0.82rem",
                lineHeight: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <strong>
                Editor paused after version conflict (stale v
                {staleConflict.staleVersion})
              </strong>
              {staleConflict.status === "loaded" &&
              staleConflict.refreshedSession ? (
                <>
                  <div>
                    Latest server version:{" "}
                    <strong>v{staleConflict.refreshedSession.version}</strong> ·{" "}
                    <strong>
                      {formatPublicationStateLabel(
                        staleConflict.refreshedSession.publicationState,
                      )}
                    </strong>
                    {editingSession &&
                    staleConflict.refreshedSession.publicationState !==
                      editingSession.publicationState ? (
                      <span>
                        {" "}
                        (publication state changed from{" "}
                        {formatPublicationStateLabel(
                          editingSession.publicationState,
                        )}{" "}
                        to{" "}
                        {formatPublicationStateLabel(
                          staleConflict.refreshedSession.publicationState,
                        )}
                        )
                      </span>
                    ) : null}
                  </div>
                  <div style={{ color: "#92400E" }}>
                    Your attempted edits (Name:{" "}
                    <strong>{staleConflict.attemptedForm.name || "—"}</strong>,
                    Capacity:{" "}
                    <strong>
                      {staleConflict.attemptedForm.capacity || "—"}
                    </strong>
                    , Coach:{" "}
                    <strong>
                      {staleConflict.attemptedForm.coachDisplayName ||
                        "Not set"}
                    </strong>
                    ) are preserved above for comparison.
                  </div>
                  {staleConflict.refreshedSession.publicationState ===
                  "CLOSED" ? (
                    <div style={{ color: "#991B1B", fontWeight: 600 }}>
                      This session is now CLOSED and can no longer be edited.
                    </div>
                  ) : (
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        data-testid="reload-refreshed-session-btn"
                        onClick={handleLoadRefreshedSessionIntoEditor}
                      >
                        Load Latest Version (v
                        {staleConflict.refreshedSession.version}) into Editor
                      </Button>
                    </div>
                  )}
                </>
              ) : staleConflict.status === "missing" ? (
                <div
                  data-testid="session-stale-missing-notice"
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div style={{ color: "#991B1B", fontWeight: 600 }}>
                    This training session is no longer available and cannot be
                    saved from this editor.
                  </div>
                  <div style={{ color: "#92400E" }}>
                    Your attempted edits (Name:{" "}
                    <strong>{staleConflict.attemptedForm.name || "—"}</strong>,
                    Capacity:{" "}
                    <strong>
                      {staleConflict.attemptedForm.capacity || "—"}
                    </strong>
                    , Coach:{" "}
                    <strong>
                      {staleConflict.attemptedForm.coachDisplayName ||
                        "Not set"}
                    </strong>
                    ) remain visible above for reference.
                  </div>
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      data-testid="dismiss-missing-session-btn"
                      onClick={closeDrawer}
                    >
                      Close Drawer
                    </Button>
                  </div>
                </div>
              ) : staleConflict.status === "failed" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    Could not load the latest session version. Retry loading
                    before saving again.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    data-testid="retry-stale-session-refresh-btn"
                    onClick={() => void handleRetryStaleConflictRefresh()}
                  >
                    Retry Refresh
                  </Button>
                </div>
              ) : (
                <div>Loading latest session version for review...</div>
              )}
            </div>
          ) : null}

          {conflictComparison && !staleConflict ? (
            <div
              role="status"
              data-testid="session-conflict-comparison"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                color: "#334155",
                fontSize: "0.8rem",
                lineHeight: 1.45,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <div>
                <strong>
                  Loaded latest version (v{editingSession?.version}).
                </strong>{" "}
                Previous attempted values for comparison — Name:{" "}
                {conflictComparison.name || "—"}, Capacity:{" "}
                {conflictComparison.capacity || "—"}, Coach:{" "}
                {conflictComparison.coachDisplayName || "Not set"}. Review the
                refreshed fields before saving.
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setConflictComparison(null)}
              >
                Dismiss
              </Button>
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
                disabled={saving || selectorsLoading}
                onChange={(e) => updateFormField("programmeId", e.target.value)}
                style={
                  saving || selectorsLoading ? disabledFieldStyle : fieldStyle
                }
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
              <label htmlFor="session-programme-locked" style={labelStyle}>
                Programme (locked after creation)
              </label>
              <input
                id="session-programme-locked"
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
              disabled={saving || isPublishedEdit}
              value={form.name}
              onChange={(e) => updateFormField("name", e.target.value)}
              placeholder="e.g. Ages 10–12 Saturday Cohort"
              style={
                saving || isPublishedEdit ? disabledFieldStyle : fieldStyle
              }
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
                  disabled={saving || selectorsLoading}
                  onChange={(e) => updateFormField("venueId", e.target.value)}
                  style={
                    saving || selectorsLoading ? disabledFieldStyle : fieldStyle
                  }
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
                disabled={saving}
                value={form.capacity}
                onChange={(e) => updateFormField("capacity", e.target.value)}
                placeholder="e.g. 20"
                style={saving ? disabledFieldStyle : fieldStyle}
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
              disabled={saving}
              value={form.coachDisplayName}
              onChange={(e) =>
                updateFormField("coachDisplayName", e.target.value)
              }
              placeholder="Leave blank if unassigned in draft"
              style={saving ? disabledFieldStyle : fieldStyle}
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
                disabled={saving || isPublishedEdit}
                value={form.weekday}
                onChange={(e) => updateFormField("weekday", e.target.value)}
                style={
                  saving || isPublishedEdit ? disabledFieldStyle : fieldStyle
                }
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
                disabled={saving || isPublishedEdit}
                value={form.startTime}
                onChange={(e) => updateFormField("startTime", e.target.value)}
                style={
                  saving || isPublishedEdit ? disabledFieldStyle : fieldStyle
                }
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
                disabled={saving || isPublishedEdit}
                value={form.endTime}
                onChange={(e) => updateFormField("endTime", e.target.value)}
                style={
                  saving || isPublishedEdit ? disabledFieldStyle : fieldStyle
                }
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
                disabled={saving || isPublishedEdit}
                value={form.firstSessionDate}
                onChange={(e) =>
                  updateFormField("firstSessionDate", e.target.value)
                }
                style={
                  saving || isPublishedEdit ? disabledFieldStyle : fieldStyle
                }
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
                disabled={saving || isPublishedEdit}
                value={form.recurrence}
                onChange={(e) => updateFormField("recurrence", e.target.value)}
                style={
                  saving || isPublishedEdit ? disabledFieldStyle : fieldStyle
                }
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
                disabled={saving || isPublishedEdit}
                value={form.ageReferenceRule}
                onChange={(e) =>
                  updateFormField("ageReferenceRule", e.target.value)
                }
                style={
                  saving || isPublishedEdit ? disabledFieldStyle : fieldStyle
                }
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
                  disabled={saving || isPublishedEdit}
                  value={form.ageReferenceDate}
                  onChange={(e) =>
                    updateFormField("ageReferenceDate", e.target.value)
                  }
                  style={
                    saving || isPublishedEdit ? disabledFieldStyle : fieldStyle
                  }
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
                disabled={saving}
                value={form.enrollmentOpensAt}
                onChange={(e) =>
                  updateFormField("enrollmentOpensAt", e.target.value)
                }
                style={saving ? disabledFieldStyle : fieldStyle}
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
                disabled={saving}
                value={form.enrollmentClosesAt}
                onChange={(e) =>
                  updateFormField("enrollmentClosesAt", e.target.value)
                }
                style={saving ? disabledFieldStyle : fieldStyle}
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
              disabled={
                saving ||
                Boolean(staleConflict) ||
                Boolean(interruptedSaveReview)
              }
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
