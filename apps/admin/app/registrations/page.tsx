"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import type {
  AdminRegistrationSessionDto,
  RegistrationDetailDto,
  RegistrationReasonCode,
  RegistrationStatus,
  RegistrationSummaryDto,
  RegistrationTargetStatus,
} from "@khlim/api-client";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { LoadingState } from "../../components/ui/LoadingState";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { AdminTrainingSessionsTab } from "../../components/registrations/admin-training-sessions-tab";
import { AdminConsentPoliciesTab } from "../../components/registrations/admin-consent-policies-tab";
import { useAdminAuth } from "../../lib/auth-context";
import {
  buildAdminAuthContextKey,
  changeAdminRegistrationStatus,
  classifyAdminRegistrationError,
  formatAgeAtReference,
  formatConsentTypeLabel,
  formatDobWithAge,
  formatJerseySize,
  formatLocaleLabel,
  formatPlayerGender,
  formatPublicationStateLabel,
  formatRegistrationReasonCode,
  formatRegistrationStatusLabel,
  formatRelationshipLabel,
  getAdminRegistrationDetail,
  getAllowedNextStatuses,
  isReasonCodeRequired,
  isTerminalRegistrationStatus,
  listAdminRegistrationSessions,
  listAdminRegistrations,
  REGISTRATION_REASON_CODES,
  REGISTRATION_STATUS_OPTIONS,
  searchAdminRegistrations,
  type AdminRegistrationErrorKind,
} from "../../lib/registration-admin-api";

function formatMytDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
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
  } catch {
    return isoString;
  }
}

function cleanPhoneDigits(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) {
    return `60${digits.slice(1)}`;
  }
  return digits;
}

function readDetailString(
  record: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readDetailBool(
  record: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  return record?.[key] === true;
}

function AcademyRegistrationsContent() {
  const {
    user,
    role,
    hasRole,
    isAuthenticated,
    isLoading: isAuthLoading,
    isRevalidating,
    authTransitionSeq,
    workspaceEpoch,
    isDemoMode,
    mfaSatisfied,
    logout,
    refreshSession,
  } = useAdminAuth();
  const canView = hasRole(["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"]);
  const canApprovePolicies = hasRole(["SUPER_ADMIN", "MANAGEMENT"]);
  const isEligible =
    canView &&
    !isDemoMode &&
    !isAuthLoading &&
    !isRevalidating &&
    isAuthenticated &&
    mfaSatisfied;
  const settledAuthContextKey = isRevalidating
    ? null
    : buildAdminAuthContextKey({
        userId: user?.id ?? null,
        organizationId: user?.organizationId ?? null,
        role,
        isAuthenticated,
        mfaSatisfied,
        isDemoMode,
        isEligible,
      });
  const committedAuthContextKeyRef = useRef<string>(
    `epoch-${workspaceEpoch}:${settledAuthContextKey ?? "pending"}`,
  );
  const authContextKey = isRevalidating
    ? committedAuthContextKeyRef.current
    : `epoch-${workspaceEpoch}:${settledAuthContextKey}`;
  if (!isRevalidating) {
    committedAuthContextKeyRef.current = authContextKey;
  }

  const [demoHydrated, setDemoHydrated] = useState(false);
  useEffect(() => {
    if (isDemoMode) {
      setDemoHydrated(true);
    }
  }, [isDemoMode]);

  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialStatusParam = searchParams.get("status");
  const resolvedInitialTab =
    initialTabParam === "sessions" || initialTabParam === "policies"
      ? initialTabParam
      : "registrations";
  const resolvedInitialStatus =
    initialStatusParam &&
    REGISTRATION_STATUS_OPTIONS.includes(
      initialStatusParam as RegistrationStatus,
    )
      ? initialStatusParam
      : "ALL";

  const [activeTab, setActiveTab] = useState<string>(resolvedInitialTab);
  const [listRefreshNonce, setListRefreshNonce] = useState(0);

  // Authoritative session filter state (loaded from GET /v1/admin/academy/registration-sessions)
  const [authoritativeSessions, setAuthoritativeSessions] = useState<
    AdminRegistrationSessionDto[]
  >([]);
  const [sessionsFilterLoading, setSessionsFilterLoading] = useState(true);
  const [sessionsFilterError, setSessionsFilterError] = useState<string | null>(
    null,
  );

  // List state
  const [registrations, setRegistrations] = useState<RegistrationSummaryDto[]>(
    [],
  );
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listErrorKind, setListErrorKind] =
    useState<AdminRegistrationErrorKind | null>(null);
  const [authErrorKind, setAuthErrorKind] =
    useState<AdminRegistrationErrorKind | null>(null);
  const [authInvalidationCount, setAuthInvalidationCount] = useState(0);
  const [isRecoveringAuth, setIsRecoveringAuth] = useState(false);

  // Filters & bounded pagination
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    resolvedInitialStatus,
  );
  const [sessionFilter, setSessionFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Detail & status transition state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<RegistrationDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRefreshFailed, setDetailRefreshFailed] = useState(false);

  const [targetStatus, setTargetStatus] = useState<
    RegistrationTargetStatus | ""
  >("");
  const [reasonCode, setReasonCode] = useState<RegistrationReasonCode | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    variant: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const authGenerationRef = useRef(0);
  const authInvalidatedRef = useRef(false);
  const isMountedRef = useRef(true);
  const prevAuthTransitionSeqRef = useRef(authTransitionSeq);
  const searchTimerRef = useRef<number | null>(null);
  const listRequestSeq = useRef(0);
  const detailRequestSeq = useRef(0);
  const statusMutationSeq = useRef(0);
  const sessionFilterSeq = useRef(0);
  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const sessionFilterAbortRef = useRef<AbortController | null>(null);
  const detailLoadingRef = useRef(false);
  const updatingStatusRef = useRef(false);
  const interruptedDetailReadRef = useRef<string | null>(null);
  const interruptedStatusMutationRef = useRef<{
    detailId: string;
    requestedStatus: RegistrationTargetStatus;
  } | null>(null);
  const reconcilingStatusMutationRef = useRef<{
    detailId: string;
    requestedStatus: RegistrationTargetStatus;
  } | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const activeStatusMutationRef = useRef<{
    detailId: string;
    requestedStatus: RegistrationTargetStatus;
  } | null>(null);

  const isCurrentAuthGen = useCallback(
    (gen: number) => isMountedRef.current && authGenerationRef.current === gen,
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      authGenerationRef.current += 1;
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      listAbortRef.current?.abort();
      detailAbortRef.current?.abort();
      sessionFilterAbortRef.current?.abort();
      detailLoadingRef.current = false;
      updatingStatusRef.current = false;
      activeStatusMutationRef.current = null;
      interruptedDetailReadRef.current = null;
      interruptedStatusMutationRef.current = null;
      reconcilingStatusMutationRef.current = null;
    };
  }, []);

  // Debounce POST search input so we never hammer the search endpoint.
  // Restart the debounce when same-context revalidation finishes so pending
  // edits to searchInput stay synchronized with debouncedSearch.
  useEffect(() => {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    if (!isEligible || isRevalidating || authInvalidatedRef.current) {
      return;
    }
    const trimmed = searchInput.trim();
    if (trimmed === debouncedSearch) {
      return;
    }
    const authGen = authGenerationRef.current;
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      if (
        !isCurrentAuthGen(authGen) ||
        authInvalidatedRef.current ||
        !isEligible ||
        isRevalidating
      ) {
        return;
      }
      setDebouncedSearch(trimmed);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [
    searchInput,
    debouncedSearch,
    isEligible,
    isRevalidating,
    authTransitionSeq,
    isCurrentAuthGen,
  ]);

  // Immediately abort and invalidate all in-flight reads/mutations whenever
  // an authentication transition or token revalidation begins, reconciling
  // pending flags so same-context renewal never leaves controls permanently locked
  // and interrupted mutations require fresh authoritative review before any retry.
  useLayoutEffect(() => {
    if (prevAuthTransitionSeqRef.current === authTransitionSeq) {
      return;
    }
    prevAuthTransitionSeqRef.current = authTransitionSeq;
    authGenerationRef.current += 1;
    listRequestSeq.current += 1;
    detailRequestSeq.current += 1;
    statusMutationSeq.current += 1;
    sessionFilterSeq.current += 1;
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    listAbortRef.current?.abort();
    detailAbortRef.current?.abort();
    sessionFilterAbortRef.current?.abort();

    setLoading(false);
    setSessionsFilterLoading(false);
    setIsRecoveringAuth(false);
    setConfirmOpen(false);

    if (reconcilingStatusMutationRef.current) {
      interruptedStatusMutationRef.current =
        reconcilingStatusMutationRef.current;
      reconcilingStatusMutationRef.current = null;
      detailLoadingRef.current = false;
      setDetailLoading(false);
    } else if (detailLoadingRef.current) {
      detailLoadingRef.current = false;
      setDetailLoading(false);
      if (selectedIdRef.current) {
        interruptedDetailReadRef.current = selectedIdRef.current;
      }
    }

    if (updatingStatusRef.current) {
      const pendingMutation = activeStatusMutationRef.current;
      updatingStatusRef.current = false;
      activeStatusMutationRef.current = null;
      setIsUpdatingStatus(false);
      setTargetStatus("");
      setReasonCode("");
      setDetailRefreshFailed(true);
      if (pendingMutation) {
        interruptedStatusMutationRef.current = pendingMutation;
      }
      setStatusFeedback({
        variant: "warning",
        message:
          "Session revalidation interrupted your status update before confirmation arrived. Its outcome is uncertain — refreshing the latest registration record before any retry.",
      });
    }
  }, [authTransitionSeq]);

  // Clear ALL sensitive PII, search/filter inputs, and cached org data immediately
  // whenever verified authentication context (workspaceEpoch, user, org, role, MFA, or eligibility) changes.
  useLayoutEffect(() => {
    authGenerationRef.current += 1;
    authInvalidatedRef.current = false;
    listRequestSeq.current += 1;
    detailRequestSeq.current += 1;
    statusMutationSeq.current += 1;
    sessionFilterSeq.current += 1;
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    listAbortRef.current?.abort();
    detailAbortRef.current?.abort();
    sessionFilterAbortRef.current?.abort();
    detailLoadingRef.current = false;
    updatingStatusRef.current = false;
    activeStatusMutationRef.current = null;
    interruptedDetailReadRef.current = null;
    interruptedStatusMutationRef.current = null;
    reconcilingStatusMutationRef.current = null;
    setRegistrations([]);
    setTotalItems(0);
    setTotalPages(1);
    setAuthoritativeSessions([]);
    setSessionsFilterError(null);
    setSelectedId(null);
    setSelectedDetail(null);
    setDetailLoading(false);
    setDetailRefreshFailed(false);
    setSearchResetKey((prev) => prev + 1);
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setSessionFilter("ALL");
    setPage(1);
    setTargetStatus("");
    setReasonCode("");
    setListError(null);
    setListErrorKind(null);
    setDetailError(null);
    setStatusFeedback(null);
    setAuthErrorKind(null);
    setConfirmOpen(false);
    setIsUpdatingStatus(false);
    setIsRecoveringAuth(false);
  }, [authContextKey]);

  const handleGlobalAuthError = useCallback(
    (
      kind: AdminRegistrationErrorKind,
      message: string,
      expectedGen?: number,
    ) => {
      if (expectedGen !== undefined && !isCurrentAuthGen(expectedGen)) {
        return;
      }
      authGenerationRef.current += 1;
      authInvalidatedRef.current = true;
      listRequestSeq.current += 1;
      detailRequestSeq.current += 1;
      statusMutationSeq.current += 1;
      sessionFilterSeq.current += 1;
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      listAbortRef.current?.abort();
      detailAbortRef.current?.abort();
      sessionFilterAbortRef.current?.abort();
      detailLoadingRef.current = false;
      updatingStatusRef.current = false;
      activeStatusMutationRef.current = null;
      interruptedDetailReadRef.current = null;
      interruptedStatusMutationRef.current = null;
      reconcilingStatusMutationRef.current = null;
      setRegistrations([]);
      setTotalItems(0);
      setTotalPages(1);
      setAuthoritativeSessions([]);
      setSessionsFilterError(null);
      setSelectedId(null);
      setSelectedDetail(null);
      setSearchResetKey((prev) => prev + 1);
      setSearchInput("");
      setDebouncedSearch("");
      setStatusFilter("ALL");
      setSessionFilter("ALL");
      setPage(1);
      setTargetStatus("");
      setReasonCode("");
      setConfirmOpen(false);
      setIsUpdatingStatus(false);
      setStatusFeedback(null);
      setDetailError(null);
      setDetailRefreshFailed(false);
      setLoading(false);
      setSessionsFilterLoading(false);
      setDetailLoading(false);
      setAuthErrorKind(kind);
      setListError(message);
      setIsRecoveringAuth(false);
      // Propagate global 401/403 invalidation synchronously to every mounted child tab
      setAuthInvalidationCount((prev) => prev + 1);
    },
    [isCurrentAuthGen],
  );

  const handleSessionsChange = useCallback(
    (nextSessions: AdminRegistrationSessionDto[]) => {
      if (!isMountedRef.current || authInvalidatedRef.current) return;
      setAuthoritativeSessions(nextSessions);
      setSessionsFilterError(null);
      setSessionsFilterLoading(false);
    },
    [],
  );

  // Authoritative session list for the Registrations filter dropdown
  const fetchAuthoritativeSessionFilter = useCallback(async () => {
    void authContextKey;
    const authGen = authGenerationRef.current;
    if (isRevalidating) {
      sessionFilterSeq.current += 1;
      sessionFilterAbortRef.current?.abort();
      return;
    }
    if (!isEligible || authInvalidatedRef.current) {
      sessionFilterSeq.current += 1;
      sessionFilterAbortRef.current?.abort();
      setAuthoritativeSessions([]);
      setSessionsFilterLoading(false);
      return;
    }

    sessionFilterAbortRef.current?.abort();
    const controller = new AbortController();
    sessionFilterAbortRef.current = controller;
    const seq = ++sessionFilterSeq.current;

    setSessionsFilterLoading(true);
    setSessionsFilterError(null);

    try {
      const response = await listAdminRegistrationSessions(controller.signal);
      if (!isCurrentAuthGen(authGen) || seq !== sessionFilterSeq.current) {
        return;
      }
      const items = Array.isArray(response.items) ? response.items : [];
      setAuthoritativeSessions(items);
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        !isCurrentAuthGen(authGen) ||
        seq !== sessionFilterSeq.current
      ) {
        return;
      }
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        handleGlobalAuthError(classified.kind, classified.message, authGen);
        return;
      }
      setSessionsFilterError(classified.message);
    } finally {
      if (isCurrentAuthGen(authGen) && seq === sessionFilterSeq.current) {
        setSessionsFilterLoading(false);
      }
    }
  }, [
    isEligible,
    isRevalidating,
    authContextKey,
    isCurrentAuthGen,
    handleGlobalAuthError,
  ]);

  useEffect(() => {
    void fetchAuthoritativeSessionFilter();
    return () => {
      sessionFilterAbortRef.current?.abort();
    };
  }, [fetchAuthoritativeSessionFilter]);

  const fetchRegistrations = useCallback(async () => {
    void authContextKey;
    const authGen = authGenerationRef.current;
    if (isRevalidating) {
      listRequestSeq.current += 1;
      listAbortRef.current?.abort();
      return;
    }
    if (!isEligible || authInvalidatedRef.current) {
      listRequestSeq.current += 1;
      listAbortRef.current?.abort();
      setRegistrations([]);
      setSelectedDetail(null);
      setLoading(false);
      return;
    }

    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;
    const seq = ++listRequestSeq.current;

    setLoading(true);
    setListError(null);
    setListErrorKind(null);

    try {
      const normalizedStatus =
        statusFilter === "ALL"
          ? undefined
          : (statusFilter as RegistrationStatus);
      const normalizedSession =
        sessionFilter === "ALL" ? undefined : sessionFilter;

      // Use POST /search (HTTP 200) when a search term of >= 2 chars is active; never put search terms in URLs
      const res =
        debouncedSearch.length >= 2
          ? await searchAdminRegistrations(
              {
                q: debouncedSearch,
                status: normalizedStatus,
                sessionId: normalizedSession,
                page,
                limit: pageSize,
              },
              controller.signal,
            )
          : await listAdminRegistrations({
              status: normalizedStatus,
              sessionId: normalizedSession,
              page,
              limit: pageSize,
              signal: controller.signal,
            });

      if (!isCurrentAuthGen(authGen) || seq !== listRequestSeq.current) return;

      const nextTotalPages = Math.max(1, res.totalPages);
      setTotalItems(res.total);
      setTotalPages(nextTotalPages);
      if (res.items.length === 0 && page > nextTotalPages) {
        setPage(nextTotalPages);
        return;
      }
      setRegistrations(res.items);
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        !isCurrentAuthGen(authGen) ||
        seq !== listRequestSeq.current
      ) {
        return;
      }
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        handleGlobalAuthError(classified.kind, classified.message, authGen);
      } else {
        setListErrorKind(classified.kind);
        setListError(classified.message);
      }
    } finally {
      if (isCurrentAuthGen(authGen) && seq === listRequestSeq.current) {
        setLoading(false);
      }
    }
  }, [
    isEligible,
    isRevalidating,
    authContextKey,
    debouncedSearch,
    statusFilter,
    sessionFilter,
    page,
    pageSize,
    isCurrentAuthGen,
    handleGlobalAuthError,
  ]);

  useEffect(() => {
    void listRefreshNonce;
    if (activeTab === "registrations") {
      void fetchRegistrations();
    }
    return () => {
      listAbortRef.current?.abort();
    };
  }, [activeTab, fetchRegistrations, listRefreshNonce]);

  const loadRegistrationDetail = useCallback(
    async (id: string) => {
      if (!isEligible || authInvalidatedRef.current) return;
      const authGen = authGenerationRef.current;
      detailAbortRef.current?.abort();
      const controller = new AbortController();
      detailAbortRef.current = controller;
      const seq = ++detailRequestSeq.current;
      statusMutationSeq.current += 1;

      setSelectedId(id);
      setSelectedDetail(null);
      detailLoadingRef.current = true;
      setDetailLoading(true);
      setDetailError(null);
      setDetailRefreshFailed(false);
      setStatusFeedback(null);
      setTargetStatus("");
      setReasonCode("");
      setConfirmOpen(false);
      updatingStatusRef.current = false;
      activeStatusMutationRef.current = null;
      interruptedDetailReadRef.current = null;
      interruptedStatusMutationRef.current = null;
      reconcilingStatusMutationRef.current = null;
      setIsUpdatingStatus(false);

      try {
        const detail = await getAdminRegistrationDetail(id, controller.signal);
        if (!isCurrentAuthGen(authGen) || seq !== detailRequestSeq.current) {
          return;
        }
        setSelectedDetail(detail);
        setDetailRefreshFailed(false);
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          !isCurrentAuthGen(authGen) ||
          seq !== detailRequestSeq.current
        ) {
          return;
        }
        const classified = classifyAdminRegistrationError(error);
        if (
          classified.kind === "UNAUTHENTICATED" ||
          classified.kind === "FORBIDDEN"
        ) {
          handleGlobalAuthError(classified.kind, classified.message, authGen);
        } else {
          setDetailError(classified.message);
        }
      } finally {
        if (isCurrentAuthGen(authGen) && seq === detailRequestSeq.current) {
          detailLoadingRef.current = false;
          setDetailLoading(false);
        }
      }
    },
    [isEligible, isCurrentAuthGen, handleGlobalAuthError],
  );

  // Reconcile interrupted registration detail read or uncertain status mutation
  // automatically after same-context revalidation succeeds (never auto-replaying mutations).
  useEffect(() => {
    if (!isEligible || isRevalidating || authInvalidatedRef.current) return;

    const interruptedMutation = interruptedStatusMutationRef.current;
    if (interruptedMutation && selectedId === interruptedMutation.detailId) {
      interruptedStatusMutationRef.current = null;
      interruptedDetailReadRef.current = null;
      reconcilingStatusMutationRef.current = interruptedMutation;
      const authGen = authGenerationRef.current;
      detailAbortRef.current?.abort();
      const controller = new AbortController();
      detailAbortRef.current = controller;
      const seq = ++detailRequestSeq.current;
      detailLoadingRef.current = true;
      setDetailLoading(true);
      void (async () => {
        try {
          const fresh = await getAdminRegistrationDetail(
            interruptedMutation.detailId,
            controller.signal,
          );
          if (
            controller.signal.aborted ||
            !isCurrentAuthGen(authGen) ||
            seq !== detailRequestSeq.current
          ) {
            return;
          }
          reconcilingStatusMutationRef.current = null;
          setSelectedDetail(fresh);
          setDetailRefreshFailed(false);
          setStatusFeedback({
            variant: "warning",
            message: `Session revalidation interrupted your prior status update to ${formatRegistrationStatusLabel(interruptedMutation.requestedStatus)}. Loaded the latest server record (v${fresh.version}, ${formatRegistrationStatusLabel(fresh.status)}) — review before submitting any new change.`,
          });
          setListRefreshNonce((prev) => prev + 1);
          void fetchAuthoritativeSessionFilter();
        } catch (error: unknown) {
          if (
            controller.signal.aborted ||
            !isCurrentAuthGen(authGen) ||
            seq !== detailRequestSeq.current
          ) {
            return;
          }
          reconcilingStatusMutationRef.current = null;
          const classified = classifyAdminRegistrationError(error);
          if (
            classified.kind === "UNAUTHENTICATED" ||
            classified.kind === "FORBIDDEN"
          ) {
            handleGlobalAuthError(classified.kind, classified.message, authGen);
            return;
          }
          setDetailRefreshFailed(true);
          setStatusFeedback({
            variant: "error",
            message: `Session revalidation interrupted your prior status update, and the latest record could not be refreshed (${classified.message}). Click Refresh Record to review the current status before retrying.`,
          });
        } finally {
          if (isCurrentAuthGen(authGen) && seq === detailRequestSeq.current) {
            detailLoadingRef.current = false;
            setDetailLoading(false);
          }
        }
      })();
      return;
    }

    const interruptedDetailId = interruptedDetailReadRef.current;
    if (interruptedDetailId && selectedId === interruptedDetailId) {
      interruptedDetailReadRef.current = null;
      void loadRegistrationDetail(interruptedDetailId);
    }
  }, [
    isEligible,
    isRevalidating,
    authTransitionSeq,
    selectedId,
    isCurrentAuthGen,
    handleGlobalAuthError,
    loadRegistrationDetail,
    fetchAuthoritativeSessionFilter,
  ]);

  const handleCloseDrawer = () => {
    detailRequestSeq.current += 1;
    statusMutationSeq.current += 1;
    detailAbortRef.current?.abort();
    detailLoadingRef.current = false;
    updatingStatusRef.current = false;
    activeStatusMutationRef.current = null;
    interruptedDetailReadRef.current = null;
    interruptedStatusMutationRef.current = null;
    reconcilingStatusMutationRef.current = null;
    setSelectedId(null);
    setSelectedDetail(null);
    setDetailLoading(false);
    setDetailError(null);
    setDetailRefreshFailed(false);
    setStatusFeedback(null);
    setTargetStatus("");
    setReasonCode("");
    setConfirmOpen(false);
    setIsUpdatingStatus(false);
  };

  const allowedTransitions = useMemo(() => {
    if (!selectedDetail) return [];
    return getAllowedNextStatuses(selectedDetail.status);
  }, [selectedDetail]);

  const reasonRequired =
    Boolean(targetStatus) &&
    isReasonCodeRequired(targetStatus as RegistrationTargetStatus);

  const canOpenConfirm =
    Boolean(selectedDetail) &&
    Boolean(targetStatus) &&
    (!reasonRequired || Boolean(reasonCode)) &&
    !isUpdatingStatus &&
    !detailRefreshFailed;

  const handleConfirmStatusUpdate = async () => {
    if (
      !isEligible ||
      authInvalidatedRef.current ||
      !selectedDetail ||
      !targetStatus ||
      isUpdatingStatus ||
      detailRefreshFailed
    ) {
      return;
    }
    if (reasonRequired && !reasonCode) return;

    const authGen = authGenerationRef.current;
    const detailSeq = detailRequestSeq.current;
    const mutationSeq = ++statusMutationSeq.current;
    const detailId = selectedDetail.id;
    const expectedVersion = selectedDetail.version;
    const requestedStatus = targetStatus;
    const requestedReason = reasonRequired && reasonCode ? reasonCode : null;

    updatingStatusRef.current = true;
    activeStatusMutationRef.current = { detailId, requestedStatus };
    setIsUpdatingStatus(true);
    setStatusFeedback(null);

    try {
      const updated = await changeAdminRegistrationStatus(detailId, {
        status: requestedStatus,
        ...(requestedReason ? { reasonCode: requestedReason } : {}),
        expectedVersion,
      });

      if (!isCurrentAuthGen(authGen)) return;

      if (statusMutationSeq.current === mutationSeq) {
        updatingStatusRef.current = false;
        activeStatusMutationRef.current = null;
        setIsUpdatingStatus(false);
      }

      if (detailRequestSeq.current === detailSeq) {
        setConfirmOpen(false);
        setSelectedDetail(updated);
        setTargetStatus("");
        setReasonCode("");
        setStatusFeedback({
          variant: "success",
          message: `Registration status updated to ${formatRegistrationStatusLabel(updated.status)} (${updated.status}, version ${updated.version}).`,
        });
      }

      // Invalidate any in-flight list reads predating this confirmed status change
      // before merging the updated row and triggering the authoritative list reload.
      listRequestSeq.current += 1;
      listAbortRef.current?.abort();
      setRegistrations((prev) =>
        prev.map((row) =>
          row.id === updated.id && updated.version >= row.version
            ? {
                ...row,
                status: updated.status,
                version: updated.version,
                updatedAt: updated.updatedAt,
              }
            : row,
        ),
      );
      setListRefreshNonce((prev) => prev + 1);
      void fetchAuthoritativeSessionFilter();
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      if (statusMutationSeq.current === mutationSeq) {
        updatingStatusRef.current = false;
        activeStatusMutationRef.current = null;
        setIsUpdatingStatus(false);
      }
      const classified = classifyAdminRegistrationError(error);

      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        handleGlobalAuthError(classified.kind, classified.message, authGen);
        return;
      }

      if (detailRequestSeq.current !== detailSeq) {
        if (
          classified.kind === "STALE_VERSION" ||
          classified.kind === "INVALID_TRANSITION" ||
          classified.kind === "SESSION_NOT_AVAILABLE"
        ) {
          void fetchAuthoritativeSessionFilter();
        }
        return;
      }

      setConfirmOpen(false);

      // On STALE_VERSION, INVALID_TRANSITION, or SESSION_NOT_AVAILABLE, refresh the authoritative record
      // and session filter under the same auth-generation guard (never auto-replay stale updates).
      if (
        classified.kind === "STALE_VERSION" ||
        classified.kind === "INVALID_TRANSITION" ||
        classified.kind === "SESSION_NOT_AVAILABLE"
      ) {
        const conflictLead =
          classified.kind === "STALE_VERSION"
            ? "This registration was updated by another staff member."
            : classified.message;
        setStatusFeedback({
          variant: "warning",
          message: `${conflictLead} Refreshing the latest registration record...`,
        });
        setTargetStatus("");
        setReasonCode("");
        setDetailRefreshFailed(true);
        void fetchAuthoritativeSessionFilter();

        detailAbortRef.current?.abort();
        const followUpController = new AbortController();
        detailAbortRef.current = followUpController;
        const followUpSeq = ++detailRequestSeq.current;
        detailLoadingRef.current = true;
        setDetailLoading(true);
        try {
          const fresh = await getAdminRegistrationDetail(
            detailId,
            followUpController.signal,
          );
          if (
            followUpController.signal.aborted ||
            !isCurrentAuthGen(authGen) ||
            followUpSeq !== detailRequestSeq.current
          ) {
            return;
          }
          setSelectedDetail(fresh);
          setDetailRefreshFailed(false);
          setStatusFeedback({
            variant: "warning",
            message: `${conflictLead} Loaded the latest record (v${fresh.version}, ${formatRegistrationStatusLabel(fresh.status)}) — review before retrying.`,
          });
          setListRefreshNonce((prev) => prev + 1);
        } catch (refreshError: unknown) {
          if (
            followUpController.signal.aborted ||
            !isCurrentAuthGen(authGen) ||
            followUpSeq !== detailRequestSeq.current
          ) {
            return;
          }
          const refreshClassified =
            classifyAdminRegistrationError(refreshError);
          if (
            refreshClassified.kind === "UNAUTHENTICATED" ||
            refreshClassified.kind === "FORBIDDEN"
          ) {
            handleGlobalAuthError(
              refreshClassified.kind,
              refreshClassified.message,
              authGen,
            );
            return;
          }
          setDetailRefreshFailed(true);
          setStatusFeedback({
            variant: "error",
            message: `${conflictLead} Could not refresh the latest registration record (${refreshClassified.message}). Click Refresh Record to reload before applying another status change.`,
          });
        } finally {
          if (
            isCurrentAuthGen(authGen) &&
            followUpSeq === detailRequestSeq.current
          ) {
            detailLoadingRef.current = false;
            setDetailLoading(false);
          }
        }
        return;
      }

      if (classified.kind === "UNAVAILABLE") {
        setStatusFeedback({
          variant: "warning",
          message: classified.message,
        });
        return;
      }

      setStatusFeedback({
        variant: "error",
        message: classified.message,
      });
    } finally {
      if (
        isCurrentAuthGen(authGen) &&
        statusMutationSeq.current === mutationSeq
      ) {
        updatingStatusRef.current = false;
        activeStatusMutationRef.current = null;
        setIsUpdatingStatus(false);
      }
    }
  };

  // Minimal-PII list columns (no phone numbers, DOB, or emergency contacts in table view)
  const columns: Column<RegistrationSummaryDto>[] = [
    {
      key: "referenceCode",
      header: "Reference",
      render: (item) => (
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "0.82rem",
            color: "#0F172A",
            whiteSpace: "nowrap",
          }}
        >
          {item.referenceCode}
        </span>
      ),
    },
    {
      key: "playerFullName",
      header: "Player Name",
      render: (item) => (
        <span style={{ fontWeight: 600, color: "#0F172A" }}>
          {item.playerFullName}
        </span>
      ),
    },
    {
      key: "ageAtReference",
      header: "Age (Ref)",
      render: (item) => (
        <span style={{ fontWeight: 500, color: "#334155" }}>
          {formatAgeAtReference(item.ageAtReference)}
        </span>
      ),
    },
    {
      key: "sessionName",
      header: "Session",
      render: (item) => (
        <span style={{ color: "#1E293B", fontWeight: 500 }}>
          {item.sessionName}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: "createdAt",
      header: "Received (MYT)",
      render: (item) => (
        <span style={{ fontSize: "0.8125rem", color: "#64748B" }}>
          {formatMytDateTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (item) => (
        <Button
          size="sm"
          variant="secondary"
          data-testid={`review-registration-${item.id}`}
          onClick={(e) => {
            e.stopPropagation();
            void loadRegistrationDetail(item.id);
          }}
        >
          Review
        </Button>
      ),
    },
  ];

  if (isDemoMode) {
    return (
      <AdminShell>
        <div style={{ minWidth: 0 }}>
          <PageHeader
            title="Academy Registrations"
            subtitle="Review submitted Academy registrations, manage training sessions, and govern localized consent policies."
            breadcrumbs={[
              { label: "Academy", href: "/offerings" },
              { label: "Academy Registrations" },
            ]}
          />
          <div
            data-testid="registrations-demo-unavailable"
            data-admin-demo-hydrated={demoHydrated ? "true" : "false"}
            role="status"
            style={{
              backgroundColor: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: 12,
              padding: "20px 24px",
              color: "#78350F",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>
              Unavailable in Admin Demo Mode
            </strong>
            Live Academy registration records, training sessions, and consent
            policies are strictly isolated from Admin Demo Mode and never issue
            live API requests or read stored staff credentials. Sign in through
            an authenticated AAL2 staff console to manage Academy registrations.
          </div>
        </div>
      </AdminShell>
    );
  }

  if (!isRevalidating && isAuthLoading) {
    return (
      <AdminShell>
        <LoadingState message="Verifying staff access…" />
      </AdminShell>
    );
  }

  if (!isRevalidating && !canView) {
    return (
      <AdminShell>
        <div style={{ minWidth: 0 }}>
          <PageHeader
            title="Academy Registrations"
            subtitle="Review submitted Academy registrations, manage training sessions, and govern localized consent policies."
            breadcrumbs={[
              { label: "Academy", href: "/offerings" },
              { label: "Academy Registrations" },
            ]}
          />
          <div
            data-testid="registrations-restricted-access"
            style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px dashed #CBD5E1",
              color: "#64748B",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔒</div>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#0F172A",
                margin: 0,
              }}
            >
              Restricted Access
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                margin: "6px auto 0",
                maxWidth: "460px",
                lineHeight: 1.5,
              }}
            >
              Academy Registration management is restricted to authorized
              Academy Admin, Management, and Super Admin staff with verified
              AAL2 MFA sessions.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    sessionFilter !== "ALL" ||
    Boolean(searchInput.trim());

  const tabs = [
    {
      id: "registrations",
      label: "Registrations",
      count: totalItems,
      icon: "📋",
    },
    {
      id: "sessions",
      label: "Training Sessions",
      count: authoritativeSessions.length,
      icon: "🏀",
    },
    { id: "policies", label: "Consent Policies", icon: "📜" },
  ];

  const isAuthInvalidated =
    authErrorKind === "UNAUTHENTICATED" || authErrorKind === "FORBIDDEN";
  const childAuthContextKey = `${authContextKey}:inv-${authInvalidationCount}`;
  const childIsEligible = isEligible && !isAuthInvalidated;

  const handleExplicitAuthRecovery = async () => {
    if (isRecoveringAuth) return;
    if (authErrorKind === "UNAUTHENTICATED") {
      setIsRecoveringAuth(true);
      try {
        await logout();
      } finally {
        if (isMountedRef.current) {
          setIsRecoveringAuth(false);
        }
      }
      return;
    }

    if (authErrorKind === "FORBIDDEN") {
      setIsRecoveringAuth(true);
      try {
        if (!isDemoMode) {
          await refreshSession();
        }
        if (!isMountedRef.current) return;
        authInvalidatedRef.current = false;
        setAuthErrorKind(null);
        setListError(null);
        setAuthInvalidationCount((prev) => prev + 1);
      } catch (error: unknown) {
        if (!isMountedRef.current) return;
        const classified = classifyAdminRegistrationError(error);
        setListError(classified.message);
      } finally {
        if (isMountedRef.current) {
          setIsRecoveringAuth(false);
        }
      }
    }
  };

  const renderGlobalAuthError = () => (
    <div data-testid="registrations-error-state" style={{ marginBottom: 16 }}>
      <ErrorState
        title={
          authErrorKind === "UNAUTHENTICATED"
            ? "Session Expired"
            : "Access Restricted"
        }
        message={
          listError ||
          (authErrorKind === "UNAUTHENTICATED"
            ? "Your staff session has expired or is no longer authenticated. Please sign in again to continue."
            : "Access denied. This action requires an authorized staff role with verified AAL2 MFA.")
        }
        action={
          <Button
            type="button"
            variant="danger"
            size="sm"
            data-testid="auth-recovery-btn"
            disabled={isRecoveringAuth}
            onClick={() => void handleExplicitAuthRecovery()}
          >
            {isRecoveringAuth
              ? "Verifying..."
              : authErrorKind === "UNAUTHENTICATED"
                ? "Sign In Again"
                : "Re-verify Access"}
          </Button>
        }
      />
    </div>
  );

  return (
    <AdminShell>
      <div
        className="ph-no-capture"
        data-ph-no-capture="true"
        style={{ minWidth: 0 }}
      >
        {!isRevalidating ? (
          <>
            <PageHeader
              title="Academy Registrations"
              subtitle="Academy V1 intake queue — distinct from Academy Interest Leads and Main Team roster operations. Permanent Player IDs are not assigned at registration."
              breadcrumbs={[
                { label: "Academy", href: "/offerings" },
                { label: "Academy Registrations" },
              ]}
            />

            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId)}
            />

            {isAuthInvalidated ? renderGlobalAuthError() : null}
          </>
        ) : null}

        {activeTab === "sessions" && (
          <AdminTrainingSessionsTab
            isEligible={childIsEligible}
            isSuspended={isRevalidating}
            authTransitionSeq={authTransitionSeq}
            authContextKey={childAuthContextKey}
            onSessionsChange={handleSessionsChange}
            onAuthError={handleGlobalAuthError}
          />
        )}

        {activeTab === "policies" && (
          <AdminConsentPoliciesTab
            isEligible={childIsEligible}
            isSuspended={isRevalidating}
            authTransitionSeq={authTransitionSeq}
            canApprovePolicies={canApprovePolicies}
            authContextKey={childAuthContextKey}
            onAuthError={handleGlobalAuthError}
          />
        )}

        {!isRevalidating &&
          activeTab === "registrations" &&
          !isAuthInvalidated && (
            <div role="tabpanel" id="panel-registrations">
              {authoritativeSessions.length > 0 ? (
                <div
                  className="admin-summary-strip"
                  aria-label="Registration queue and capacity summary"
                >
                  {(() => {
                    const published = authoritativeSessions.filter(
                      (s) => s.publicationState === "PUBLISHED",
                    );
                    const receivedCount = authoritativeSessions.reduce(
                      (sum, s) => sum + (s.seatCounts.RECEIVED ?? 0),
                      0,
                    );
                    const underReviewCount = authoritativeSessions.reduce(
                      (sum, s) => sum + (s.seatCounts.UNDER_REVIEW ?? 0),
                      0,
                    );
                    const confirmedCount = published.reduce(
                      (sum, s) => sum + (s.seatCounts.CONFIRMED ?? 0),
                      0,
                    );
                    const totalCapacity = published.reduce(
                      (sum, s) => sum + s.capacity,
                      0,
                    );
                    const remainingPlaces = published.reduce(
                      (sum, s) => sum + s.seatsRemaining,
                      0,
                    );
                    return (
                      <>
                        <div className="admin-summary-tile">
                          <div className="admin-summary-tile-label">
                            New Received
                          </div>
                          <div className="admin-summary-tile-value">
                            {receivedCount}
                          </div>
                          <div className="admin-summary-tile-sub">
                            {underReviewCount} currently under review
                          </div>
                        </div>
                        <div className="admin-summary-tile">
                          <div className="admin-summary-tile-label">
                            Confirmed Capacity
                          </div>
                          <div className="admin-summary-tile-value">
                            {confirmedCount} / {totalCapacity}
                          </div>
                          <div className="admin-summary-tile-sub">
                            {remainingPlaces} remaining across published
                            sessions
                          </div>
                        </div>
                        <div className="admin-summary-tile">
                          <div className="admin-summary-tile-label">
                            Published Sessions
                          </div>
                          <div className="admin-summary-tile-value">
                            {published.length}
                          </div>
                          <div className="admin-summary-tile-sub">
                            {authoritativeSessions.length} total configured
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}

              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 14px",
                  borderRadius: 8,
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  color: "#78350F",
                  fontSize: "0.8rem",
                  lineHeight: 1.45,
                }}
              >
                <strong>Submission snapshot boundary:</strong> A received
                registration is a submission snapshot only — it does not reserve
                a training place, create a verified athlete or guardian account,
                or activate a membership.
              </div>

              <FilterBar
                hasActiveFilters={hasActiveFilters}
                onReset={() => {
                  if (authInvalidatedRef.current) return;
                  setSearchInput("");
                  setDebouncedSearch("");
                  setStatusFilter("ALL");
                  setSessionFilter("ALL");
                  setPage(1);
                }}
              >
                <SearchInput
                  key={searchResetKey}
                  value={searchInput}
                  debounceMs={0}
                  onChange={(val) => {
                    if (authInvalidatedRef.current) return;
                    setSearchInput(val);
                  }}
                  placeholder="Search player, guardian, phone, or KAR ref (min 2 chars)..."
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.875rem",
                  }}
                >
                  <label
                    htmlFor="registration-status-filter"
                    style={{ fontWeight: 500, color: "#475569" }}
                  >
                    Status:
                  </label>
                  <select
                    id="registration-status-filter"
                    value={statusFilter}
                    onChange={(e) => {
                      if (authInvalidatedRef.current) return;
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      backgroundColor: "#FFFFFF",
                      fontSize: "0.875rem",
                      color: "#1E293B",
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    {REGISTRATION_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatRegistrationStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.875rem",
                  }}
                >
                  <label
                    htmlFor="registration-session-filter"
                    style={{ fontWeight: 500, color: "#475569" }}
                  >
                    Session:
                  </label>
                  <select
                    id="registration-session-filter"
                    data-testid="registration-session-filter"
                    value={sessionFilter}
                    disabled={sessionsFilterLoading}
                    onChange={(e) => {
                      if (authInvalidatedRef.current) return;
                      setSessionFilter(e.target.value);
                      setPage(1);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      backgroundColor: sessionsFilterLoading
                        ? "#F1F5F9"
                        : "#FFFFFF",
                      fontSize: "0.875rem",
                      color: "#1E293B",
                      maxWidth: "260px",
                    }}
                  >
                    <option value="ALL">
                      {sessionsFilterLoading
                        ? "Loading sessions..."
                        : sessionsFilterError
                          ? "All Sessions (list unavailable)"
                          : authoritativeSessions.length === 0
                            ? "All Sessions (none configured)"
                            : "All Sessions"}
                    </option>
                    {authoritativeSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name} (
                        {formatPublicationStateLabel(session.publicationState)})
                      </option>
                    ))}
                  </select>
                  {sessionsFilterError ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      data-testid="retry-session-filter-btn"
                      onClick={() => void fetchAuthoritativeSessionFilter()}
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>
              </FilterBar>

              {searchInput.trim().length === 1 ? (
                <div
                  role="status"
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748B",
                    marginBottom: 12,
                  }}
                >
                  Enter at least 2 characters to run server-side POST search.
                </div>
              ) : null}

              {loading ? (
                <LoadingState message="Loading Academy registrations..." />
              ) : listError ? (
                <div data-testid="registrations-error-state">
                  <ErrorState
                    title={
                      listErrorKind === "FEATURE_NOT_AVAILABLE"
                        ? "Feature Not Available"
                        : "Failed to Load Registrations"
                    }
                    message={listError}
                    onRetry={
                      listErrorKind === "FEATURE_NOT_AVAILABLE"
                        ? undefined
                        : () => void fetchRegistrations()
                    }
                  />
                </div>
              ) : registrations.length === 0 ? (
                <EmptyState
                  title="No registrations found"
                  description={
                    hasActiveFilters
                      ? "No Academy registrations match your active search or filter criteria."
                      : "No Academy registrations have been received yet."
                  }
                />
              ) : (
                <>
                  <DataTable
                    columns={columns}
                    data={registrations}
                    keyExtractor={(item) => item.id}
                    onRowClick={(item) => void loadRegistrationDetail(item.id)}
                  />
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={pageSize}
                    onPageChange={setPage}
                    onItemsPerPageChange={(size) => {
                      setPageSize(Math.min(size, 100));
                      setPage(1);
                    }}
                  />
                </>
              )}
            </div>
          )}

        {/* Audited Registration Detail & Status Review Drawer */}
        <Drawer
          isOpen={!isRevalidating && Boolean(selectedId)}
          onClose={handleCloseDrawer}
          title={
            selectedDetail
              ? `Registration ${selectedDetail.referenceCode}`
              : "Registration Details"
          }
          subtitle={
            selectedDetail
              ? `${selectedDetail.playerFullName} · Received ${formatMytDateTime(selectedDetail.createdAt)} (MYT)`
              : undefined
          }
          width="620px"
        >
          {detailLoading ? (
            <LoadingState message="Loading audited registration record..." />
          ) : detailError ? (
            <ErrorState
              title="Unable to Load Registration Detail"
              message={detailError}
              onRetry={() => {
                if (selectedId) void loadRegistrationDetail(selectedId);
              }}
            />
          ) : selectedDetail ? (
            <div
              data-testid="registration-detail-content"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
                padding: "4px 0 24px",
              }}
            >
              {/* Status & Metadata Header */}
              <div
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <StatusBadge status={selectedDetail.status} size="md" />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      color: "#64748B",
                    }}
                  >
                    v{selectedDetail.version} · {selectedDetail.referenceCode}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                    fontSize: "0.8125rem",
                  }}
                >
                  <div>
                    <div style={{ color: "#64748B" }}>Session</div>
                    <div style={{ fontWeight: 600, color: "#0F172A" }}>
                      {selectedDetail.sessionName}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Campaign Source</div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#0F172A",
                        fontFamily: selectedDetail.source
                          ? "monospace"
                          : "inherit",
                      }}
                    >
                      {selectedDetail.source || "Direct / Unattributed"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Received (MYT)</div>
                    <div style={{ color: "#0F172A" }}>
                      {formatMytDateTime(selectedDetail.createdAt)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Last Status Change</div>
                    <div style={{ color: "#0F172A" }}>
                      {formatMytDateTime(selectedDetail.statusChangedAt)}
                    </div>
                  </div>
                  {selectedDetail.statusReasonCode ? (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ color: "#64748B" }}>Status Reason</div>
                      <div style={{ fontWeight: 600, color: "#991B1B" }}>
                        {formatRegistrationReasonCode(
                          selectedDetail.statusReasonCode,
                        )}{" "}
                        ({selectedDetail.statusReasonCode})
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Player Details */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ fontSize: "0.875rem", color: "#0F172A" }}>
                    Player Details
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                    Player ID assigned later upon athlete conversion
                  </span>
                </div>
                <div className="admin-detail-grid">
                  <div>
                    <div style={{ color: "#64748B" }}>Full Name</div>
                    <div style={{ fontWeight: 600, color: "#0F172A" }}>
                      {readDetailString(selectedDetail.player, "fullName") ||
                        selectedDetail.playerFullName}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Date of Birth</div>
                    <div style={{ fontWeight: 600, color: "#0F172A" }}>
                      {formatDobWithAge(
                        readDetailString(selectedDetail.player, "dateOfBirth"),
                        selectedDetail.ageAtReference,
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Gender</div>
                    <div style={{ fontWeight: 500, color: "#0F172A" }}>
                      {formatPlayerGender(
                        readDetailString(selectedDetail.player, "gender"),
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Jersey Size</div>
                    <div style={{ fontWeight: 500, color: "#0F172A" }}>
                      {formatJerseySize(
                        readDetailString(selectedDetail.player, "jerseySize"),
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Player Phone</div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        color: "#0F172A",
                      }}
                    >
                      {readDetailString(selectedDetail.player, "phone") ||
                        "Not provided"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Guardian & Emergency Contact */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      color: "#0F172A",
                      marginBottom: 10,
                    }}
                  >
                    Guardian Details
                  </strong>
                  <div className="admin-detail-grid">
                    <div>
                      <div style={{ color: "#64748B" }}>Full Name</div>
                      <div style={{ fontWeight: 600, color: "#0F172A" }}>
                        {readDetailString(
                          selectedDetail.guardian,
                          "fullName",
                        ) || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#64748B" }}>Phone</div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#0F172A",
                          fontFamily: "monospace",
                        }}
                      >
                        {readDetailString(selectedDetail.guardian, "phone") ||
                          "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#64748B" }}>Relationship</div>
                      <div style={{ color: "#0F172A" }}>
                        {formatRelationshipLabel(
                          readDetailString(
                            selectedDetail.guardian,
                            "relationship",
                          ),
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#64748B" }}>
                        Authority Confirmed
                      </div>
                      <div style={{ fontWeight: 600, color: "#065F46" }}>
                        {readDetailBool(
                          selectedDetail.guardian,
                          "authorityConfirmed",
                        )
                          ? "Yes"
                          : "No"}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const guardianPhone = readDetailString(
                      selectedDetail.guardian,
                      "phone",
                    );
                    if (!guardianPhone) return null;
                    return (
                      <div style={{ marginTop: 12 }}>
                        <a
                          href={`https://wa.me/${cleanPhoneDigits(guardianPhone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            backgroundColor: "#16A34A",
                            color: "#FFFFFF",
                            padding: "8px 14px",
                            borderRadius: 8,
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          <span>Manual WhatsApp Contact</span>
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    );
                  })()}
                </div>

                <div
                  style={{
                    borderTop: "1px solid #F1F5F9",
                    paddingTop: 14,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      color: "#0F172A",
                      marginBottom: 10,
                    }}
                  >
                    Emergency Contact
                  </strong>
                  <div className="admin-detail-grid">
                    <div>
                      <div style={{ color: "#64748B" }}>Full Name</div>
                      <div style={{ fontWeight: 600, color: "#0F172A" }}>
                        {readDetailString(
                          selectedDetail.emergencyContact,
                          "fullName",
                        ) || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#64748B" }}>Phone</div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#0F172A",
                          fontFamily: "monospace",
                        }}
                      >
                        {readDetailString(
                          selectedDetail.emergencyContact,
                          "phone",
                        ) || "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#64748B" }}>Relationship</div>
                      <div style={{ color: "#0F172A" }}>
                        {formatRelationshipLabel(
                          readDetailString(
                            selectedDetail.emergencyContact,
                            "relationship",
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consent Records */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    color: "#0F172A",
                    marginBottom: 10,
                  }}
                >
                  Consent Records
                </strong>
                {selectedDetail.consents.length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8125rem",
                      color: "#64748B",
                    }}
                  >
                    No consent records returned.
                  </p>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {selectedDetail.consents.map((record, index) => {
                      const consentType = readDetailString(record, "type");
                      const consentGranted = readDetailBool(record, "granted");
                      const consentPolicyVersion = readDetailString(
                        record,
                        "policyVersion",
                      );
                      const consentLocale = readDetailString(record, "locale");
                      const consentAcceptedAt = readDetailString(
                        record,
                        "acceptedAt",
                      );
                      const consentSha256 = readDetailString(
                        record,
                        "contentSha256",
                      );
                      return (
                        <div
                          key={`${consentType ?? "consent"}-${index}`}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 8,
                            backgroundColor: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            fontSize: "0.8rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong style={{ color: "#0F172A" }}>
                              {formatConsentTypeLabel(consentType)}
                            </strong>
                            <span
                              style={{
                                fontWeight: 700,
                                color: consentGranted ? "#065F46" : "#64748B",
                              }}
                            >
                              {consentGranted ? "Granted" : "Not granted"}
                            </span>
                          </div>
                          <div style={{ color: "#475569" }}>
                            Policy: <code>{consentPolicyVersion || "—"}</code> ·
                            Locale: {formatLocaleLabel(consentLocale)} ·
                            Accepted: {formatMytDateTime(consentAcceptedAt)}
                          </div>
                          {consentSha256 ? (
                            <div
                              style={{
                                color: "#64748B",
                                fontFamily: "monospace",
                                fontSize: "0.72rem",
                                overflowWrap: "anywhere",
                              }}
                            >
                              SHA-256: {consentSha256}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Review Controls */}
              <div
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #CBD5E1",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <strong style={{ fontSize: "0.9rem", color: "#0F172A" }}>
                  Review &amp; Status Transition
                </strong>

                {statusFeedback ? (
                  <div
                    role="alert"
                    data-testid="status-update-feedback"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: "0.83rem",
                      lineHeight: 1.45,
                      backgroundColor:
                        statusFeedback.variant === "success"
                          ? "#ECFDF5"
                          : statusFeedback.variant === "warning"
                            ? "#FFFBEB"
                            : "#FEF2F2",
                      border:
                        statusFeedback.variant === "success"
                          ? "1px solid #A7F3D0"
                          : statusFeedback.variant === "warning"
                            ? "1px solid #FDE68A"
                            : "1px solid #FECACA",
                      color:
                        statusFeedback.variant === "success"
                          ? "#065F46"
                          : statusFeedback.variant === "warning"
                            ? "#92400E"
                            : "#991B1B",
                    }}
                  >
                    {statusFeedback.message}
                  </div>
                ) : null}

                {isTerminalRegistrationStatus(selectedDetail.status) ? (
                  <p
                    data-testid="terminal-status-notice"
                    style={{
                      margin: 0,
                      fontSize: "0.84rem",
                      color: "#475569",
                      lineHeight: 1.5,
                    }}
                  >
                    This registration is in a terminal state (
                    <strong>
                      {formatRegistrationStatusLabel(selectedDetail.status)}
                    </strong>
                    ). No further status transitions are allowed.
                  </p>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="registration-next-status"
                        style={{
                          display: "block",
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: "#334155",
                          marginBottom: 6,
                        }}
                      >
                        Next Status
                      </label>
                      <select
                        id="registration-next-status"
                        value={targetStatus}
                        onChange={(e) => {
                          const next = e.target.value as
                            RegistrationTargetStatus | "";
                          setTargetStatus(next);
                          if (
                            !next ||
                            !isReasonCodeRequired(
                              next as RegistrationTargetStatus,
                            )
                          ) {
                            setReasonCode("");
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: 6,
                          border: "1px solid #CBD5E1",
                          backgroundColor: "#FFFFFF",
                          fontSize: "0.875rem",
                          color: "#0F172A",
                        }}
                      >
                        <option value="">Select status transition...</option>
                        {allowedTransitions.map((status) => (
                          <option key={status} value={status}>
                            {formatRegistrationStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {reasonRequired ? (
                      <div>
                        <label
                          htmlFor="registration-reason-code"
                          style={{
                            display: "block",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "#334155",
                            marginBottom: 6,
                          }}
                        >
                          Reason Code (required for{" "}
                          {formatRegistrationStatusLabel(targetStatus)})
                        </label>
                        <select
                          id="registration-reason-code"
                          value={reasonCode}
                          onChange={(e) =>
                            setReasonCode(
                              e.target.value as RegistrationReasonCode | "",
                            )
                          }
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: "1px solid #CBD5E1",
                            backgroundColor: "#FFFFFF",
                            fontSize: "0.875rem",
                            color: "#0F172A",
                          }}
                        >
                          <option value="">Select reason code...</option>
                          {REGISTRATION_REASON_CODES.map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.label} ({item.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {targetStatus === "CONFIRMED" ? (
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          backgroundColor: "#FFFBEB",
                          border: "1px solid #FDE68A",
                          color: "#92400E",
                          fontSize: "0.8rem",
                          lineHeight: 1.45,
                        }}
                      >
                        <strong>Note:</strong> Confirming allocates a seat in
                        backend session capacity. It does not indicate that
                        payment has been collected or verified, and it does not
                        automatically create or link an athlete profile,
                        guardian account, or membership contract.
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                      }}
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        data-testid="refresh-registration-detail-btn"
                        onClick={() =>
                          void loadRegistrationDetail(selectedDetail.id)
                        }
                        disabled={isUpdatingStatus}
                      >
                        Refresh Record
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        data-testid="open-status-confirm-btn"
                        disabled={!canOpenConfirm}
                        onClick={() => setConfirmOpen(true)}
                      >
                        Apply Status Change
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </Drawer>

        {/* Explicit Confirmation Dialog for Status Changes */}
        <ConfirmDialog
          isOpen={!isRevalidating && confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void handleConfirmStatusUpdate()}
          isLoading={isUpdatingStatus}
          variant={
            targetStatus === "REJECTED" || targetStatus === "CANCELLED"
              ? "danger"
              : "primary"
          }
          title={`Change status to ${targetStatus ? targetStatus.replaceAll("_", " ") : ""}?`}
          confirmLabel="Confirm Status Change"
          description={
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0 }}>
                Update registration{" "}
                <strong>{selectedDetail?.referenceCode}</strong> (
                {selectedDetail?.playerFullName}) from{" "}
                <strong>{selectedDetail?.status}</strong> to{" "}
                <strong>{targetStatus}</strong>.
              </p>
              {reasonRequired && reasonCode ? (
                <p style={{ margin: 0 }}>
                  Reason:{" "}
                  <strong>{formatRegistrationReasonCode(reasonCode)}</strong> (
                  <code>{reasonCode}</code>)
                </p>
              ) : null}
              {targetStatus === "CONFIRMED" ? (
                <p
                  style={{
                    margin: 0,
                    padding: "8px 10px",
                    borderRadius: 6,
                    backgroundColor: "#FFFBEB",
                    color: "#92400E",
                    fontSize: "0.82rem",
                  }}
                >
                  Confirming allocates backend capacity for this session. It
                  does not confirm payment collection.
                </p>
              ) : null}
              {targetStatus === "REJECTED" || targetStatus === "CANCELLED" ? (
                <p
                  style={{
                    margin: 0,
                    color: "#991B1B",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  This status is terminal and cannot be reversed later.
                </p>
              ) : null}
            </div>
          }
        />
      </div>
    </AdminShell>
  );
}

export default function AdminRegistrationsPage() {
  return (
    <Suspense
      fallback={
        <AdminShell>
          <LoadingState message="Loading Academy registrations..." />
        </AdminShell>
      }
    >
      <AcademyRegistrationsContent />
    </Suspense>
  );
}
