"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  AdminRegistrationPolicyDto,
  RegistrationConsentType,
  RegistrationLocale,
  RegistrationPolicyContentMap,
} from "@khlim/api-client";
import {
  CONSENT_CATEGORY_META,
  POLICY_LOCALE_META,
  approveAdminRegistrationPolicy,
  classifyAdminRegistrationError,
  createAdminRegistrationPolicy,
  createEmptyPolicyContentMap,
  formatFieldErrorMessage,
  formatPolicyStatusLabel,
  listAdminRegistrationPolicies,
  retireAdminRegistrationPolicy,
  validatePolicyDraftInput,
  type AdminRegistrationErrorKind,
} from "../../lib/registration-admin-api";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DataTable, type Column } from "../ui/DataTable";
import { Drawer } from "../ui/Drawer";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import { StatusBadge } from "../ui/StatusBadge";

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

function readContentEntry(
  content: Record<string, unknown>,
  category: RegistrationConsentType,
  locale: RegistrationLocale,
): { ref: string; sha256: string } | null {
  const cat = content?.[category];
  if (!cat || typeof cat !== "object") return null;
  const loc = (cat as Record<string, unknown>)[locale];
  if (!loc || typeof loc !== "object") return null;
  const candidate = loc as Record<string, unknown>;
  if (
    typeof candidate.ref !== "string" ||
    typeof candidate.sha256 !== "string"
  ) {
    return null;
  }
  return { ref: candidate.ref, sha256: candidate.sha256 };
}

export type PolicyFetchOutcome = "ok" | "failed" | "superseded";

interface InterruptedCreateSubmission {
  policyVersion: string;
  drawerInstanceId: number;
}

interface InterruptedCreateReviewState {
  submittedVersion: string;
  status: "refreshing" | "ready" | "failed";
}

interface AdminConsentPoliciesTabProps {
  isEligible: boolean;
  isSuspended?: boolean;
  authTransitionSeq?: number;
  canApprovePolicies: boolean;
  authContextKey: string;
  onAuthError: (kind: AdminRegistrationErrorKind, message: string) => void;
}

export function AdminConsentPoliciesTab({
  isEligible,
  isSuspended = false,
  authTransitionSeq = 0,
  canApprovePolicies,
  authContextKey,
  onAuthError,
}: AdminConsentPoliciesTabProps) {
  const [currentPolicy, setCurrentPolicy] =
    useState<AdminRegistrationPolicyDto | null>(null);
  const [historyItems, setHistoryItems] = useState<
    AdminRegistrationPolicyDto[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    variant: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  // Inspect detail drawer
  const [inspectPolicy, setInspectPolicy] =
    useState<AdminRegistrationPolicyDto | null>(null);

  // Create draft drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [draftVersion, setDraftVersion] = useState("");
  const [draftContent, setDraftContent] =
    useState<RegistrationPolicyContentMap>(createEmptyPolicyContentMap());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [interruptedCreateReview, setInterruptedCreateReview] =
    useState<InterruptedCreateReviewState | null>(null);

  // Approve & Retire dialogs (only accessible to SUPER_ADMIN / MANAGEMENT)
  // Snapshot both the target draft and the currently approved predecessor at dialog open
  // so approval is strictly bound to the predecessor confirmed by staff.
  const [approveDialogState, setApproveDialogState] = useState<{
    target: AdminRegistrationPolicyDto;
    predecessor: AdminRegistrationPolicyDto | null;
  } | null>(null);
  const [retireTarget, setRetireTarget] =
    useState<AdminRegistrationPolicyDto | null>(null);
  const [mutating, setMutating] = useState(false);

  const authGenerationRef = useRef(0);
  const createDrawerInstanceIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const prevAuthTransitionSeqRef = useRef(authTransitionSeq);
  const listSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const activeCreateSubmissionRef = useRef<InterruptedCreateSubmission | null>(
    null,
  );
  const interruptedCreateRef = useRef<InterruptedCreateSubmission | null>(null);
  const interruptedCreateLoadingRef =
    useRef<InterruptedCreateSubmission | null>(null);
  const activePolicyMutationRef = useRef<{
    action: "approve" | "retire";
    token: symbol;
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
      createDrawerInstanceIdRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  useLayoutEffect(() => {
    if (prevAuthTransitionSeqRef.current === authTransitionSeq) {
      return;
    }
    prevAuthTransitionSeqRef.current = authTransitionSeq;
    authGenerationRef.current += 1;
    listSeq.current += 1;
    abortRef.current?.abort();

    setLoading(false);
    // Clear obsolete confirmation dialogs so staff must re-confirm against fresh policy state
    setApproveDialogState(null);
    setRetireTarget(null);

    if (interruptedCreateLoadingRef.current) {
      interruptedCreateRef.current = interruptedCreateLoadingRef.current;
      interruptedCreateLoadingRef.current = null;
    }

    if (activeCreateSubmissionRef.current) {
      const interrupted = activeCreateSubmissionRef.current;
      activeCreateSubmissionRef.current = null;
      interruptedCreateRef.current = interrupted;
      setCreating(false);
      setInterruptedCreateReview({
        submittedVersion: interrupted.policyVersion,
        status: "refreshing",
      });
    }

    if (activePolicyMutationRef.current) {
      const { action } = activePolicyMutationRef.current;
      activePolicyMutationRef.current = null;
      setMutating(false);
      setBanner({
        variant: "warning",
        message: `Session revalidation interrupted your policy ${action} before confirmation arrived. Its outcome is uncertain — review the refreshed policy list before retrying.`,
      });
    }
  }, [authTransitionSeq]);

  useLayoutEffect(() => {
    authGenerationRef.current += 1;
    createDrawerInstanceIdRef.current += 1;
    listSeq.current += 1;
    abortRef.current?.abort();
    activeCreateSubmissionRef.current = null;
    interruptedCreateRef.current = null;
    interruptedCreateLoadingRef.current = null;
    activePolicyMutationRef.current = null;
    setCurrentPolicy(null);
    setHistoryItems([]);
    setLoadError(null);
    setBanner(null);
    setInspectPolicy(null);
    setCreateOpen(false);
    setDraftVersion("");
    setDraftContent(createEmptyPolicyContentMap());
    setApproveDialogState(null);
    setRetireTarget(null);
    setFieldErrors({});
    setFormError(null);
    setCreating(false);
    setInterruptedCreateReview(null);
    setMutating(false);
  }, [authContextKey]);

  const fetchPolicies = useCallback(async (): Promise<PolicyFetchOutcome> => {
    void authContextKey;
    const authGen = authGenerationRef.current;
    if (isSuspended) {
      listSeq.current += 1;
      abortRef.current?.abort();
      return "superseded";
    }
    if (!isEligible) {
      setCurrentPolicy(null);
      setHistoryItems([]);
      setLoading(false);
      return "superseded";
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++listSeq.current;

    setLoading(true);
    setLoadError(null);

    try {
      const response = await listAdminRegistrationPolicies(controller.signal);
      if (!isCurrentAuthGen(authGen) || seq !== listSeq.current) {
        return "superseded";
      }
      setCurrentPolicy(response.current ?? null);
      setHistoryItems(Array.isArray(response.items) ? response.items : []);
      return "ok";
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        !isCurrentAuthGen(authGen) ||
        seq !== listSeq.current
      ) {
        return "superseded";
      }
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        setCurrentPolicy(null);
        setHistoryItems([]);
        onAuthError(classified.kind, classified.message);
        setLoading(false);
        return "superseded";
      }
      setLoadError(classified.message);
      return "failed";
    } finally {
      if (isCurrentAuthGen(authGen) && seq === listSeq.current) {
        setLoading(false);
      }
    }
  }, [isEligible, isSuspended, authContextKey, isCurrentAuthGen, onAuthError]);

  useEffect(() => {
    let cancelled = false;
    const authGen = authGenerationRef.current;
    const pendingCreate =
      !isSuspended &&
      isEligible &&
      interruptedCreateRef.current &&
      interruptedCreateRef.current.drawerInstanceId ===
        createDrawerInstanceIdRef.current
        ? interruptedCreateRef.current
        : null;
    if (pendingCreate) {
      interruptedCreateRef.current = null;
      interruptedCreateLoadingRef.current = pendingCreate;
    }

    void (async () => {
      const outcome = await fetchPolicies();
      if (
        cancelled ||
        !pendingCreate ||
        !isCurrentAuthGen(authGen) ||
        createDrawerInstanceIdRef.current !== pendingCreate.drawerInstanceId
      ) {
        return;
      }
      if (outcome === "superseded") {
        return;
      }
      if (interruptedCreateLoadingRef.current === pendingCreate) {
        interruptedCreateLoadingRef.current = null;
      }
      setInterruptedCreateReview({
        submittedVersion: pendingCreate.policyVersion,
        status: outcome === "ok" ? "ready" : "failed",
      });
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [
    fetchPolicies,
    isSuspended,
    isEligible,
    authTransitionSeq,
    isCurrentAuthGen,
  ]);

  const closeCreateDrawer = () => {
    createDrawerInstanceIdRef.current += 1;
    activeCreateSubmissionRef.current = null;
    interruptedCreateRef.current = null;
    interruptedCreateLoadingRef.current = null;
    setCreateOpen(false);
    setInterruptedCreateReview(null);
  };

  const openCreateDrawer = () => {
    createDrawerInstanceIdRef.current += 1;
    activeCreateSubmissionRef.current = null;
    interruptedCreateRef.current = null;
    interruptedCreateLoadingRef.current = null;
    setBanner(null);
    setDraftVersion("");
    setDraftContent(createEmptyPolicyContentMap());
    setFieldErrors({});
    setFormError(null);
    setInterruptedCreateReview(null);
    setCreateOpen(true);
  };

  const handleRetryInterruptedCreateRefresh = async () => {
    if (!interruptedCreateReview || !isEligible || isSuspended) return;
    const authGen = authGenerationRef.current;
    const drawerInstanceId = createDrawerInstanceIdRef.current;
    const submittedVersion = interruptedCreateReview.submittedVersion;
    const target: InterruptedCreateSubmission = {
      policyVersion: submittedVersion,
      drawerInstanceId,
    };
    interruptedCreateRef.current = null;
    interruptedCreateLoadingRef.current = target;
    setInterruptedCreateReview({
      submittedVersion,
      status: "refreshing",
    });
    const outcome = await fetchPolicies();
    if (
      !isCurrentAuthGen(authGen) ||
      createDrawerInstanceIdRef.current !== drawerInstanceId
    ) {
      return;
    }
    if (outcome === "superseded") {
      return;
    }
    if (interruptedCreateLoadingRef.current === target) {
      interruptedCreateLoadingRef.current = null;
    }
    setInterruptedCreateReview({
      submittedVersion,
      status: outcome === "ok" ? "ready" : "failed",
    });
  };

  const updateContentCell = (
    category: RegistrationConsentType,
    locale: RegistrationLocale,
    field: "ref" | "sha256",
    value: string,
  ) => {
    if (creating) return;
    setDraftContent((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [locale]: {
          ...prev[category][locale],
          [field]: value,
        },
      },
    }));
    const key = `content.${category}.${locale}.${field}`;
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleCreateDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      creating ||
      interruptedCreateReview !== null ||
      !isEligible ||
      isSuspended
    ) {
      return;
    }
    setFormError(null);

    const validated = validatePolicyDraftInput(draftVersion, draftContent);
    if (!validated.payload) {
      setFieldErrors(validated.errors);
      setFormError(
        "Complete policy version plus valid references and 64-char lowercase hex SHA-256 hashes for all four categories and three locales.",
      );
      return;
    }

    const authGen = authGenerationRef.current;
    const drawerInstanceId = createDrawerInstanceIdRef.current;
    setFieldErrors({});
    const submission: InterruptedCreateSubmission = {
      policyVersion: validated.payload.policyVersion,
      drawerInstanceId,
    };
    activeCreateSubmissionRef.current = submission;
    setCreating(true);
    try {
      const created = await createAdminRegistrationPolicy(validated.payload);
      if (!isCurrentAuthGen(authGen)) return;
      if (activeCreateSubmissionRef.current === submission) {
        activeCreateSubmissionRef.current = null;
        setCreating(false);
      }
      if (createDrawerInstanceIdRef.current === drawerInstanceId) {
        closeCreateDrawer();
      }
      setBanner({
        variant: "success",
        message: `Draft consent policy "${created.policyVersion}" created (v${created.version}).`,
      });
      await fetchPolicies();
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      if (activeCreateSubmissionRef.current === submission) {
        activeCreateSubmissionRef.current = null;
        setCreating(false);
      }
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        closeCreateDrawer();
        onAuthError(classified.kind, classified.message);
        return;
      }
      if (createDrawerInstanceIdRef.current !== drawerInstanceId) return;
      if (classified.fieldErrors.length > 0) {
        const mapped: Record<string, string> = {};
        for (const fe of classified.fieldErrors) {
          mapped[fe.field] = formatFieldErrorMessage(fe.field, fe.code);
        }
        setFieldErrors(mapped);
      }
      setFormError(classified.message);
    } finally {
      if (
        isCurrentAuthGen(authGen) &&
        activeCreateSubmissionRef.current === submission
      ) {
        activeCreateSubmissionRef.current = null;
        setCreating(false);
      }
    }
  };

  const handleConfirmApprove = async () => {
    if (
      !approveDialogState ||
      !canApprovePolicies ||
      mutating ||
      !isEligible ||
      isSuspended
    ) {
      return;
    }
    const authGen = authGenerationRef.current;
    const targetId = approveDialogState.target.id;
    const targetVersion = approveDialogState.target.version;
    const expectedApprovedPolicyId = approveDialogState.predecessor?.id ?? null;
    const expectedApprovedPolicyVersion =
      approveDialogState.predecessor?.version ?? null;
    const mutationEntry = {
      action: "approve" as const,
      token: Symbol("approve"),
    };
    activePolicyMutationRef.current = mutationEntry;
    setMutating(true);
    setBanner(null);
    try {
      const approved = await approveAdminRegistrationPolicy(targetId, {
        expectedVersion: targetVersion,
        expectedApprovedPolicyId,
        expectedApprovedPolicyVersion,
      });
      if (!isCurrentAuthGen(authGen)) return;
      if (activePolicyMutationRef.current === mutationEntry) {
        activePolicyMutationRef.current = null;
        setMutating(false);
      }
      setApproveDialogState(null);
      setBanner({
        variant: "success",
        message: `Consent policy "${approved.policyVersion}" is now APPROVED (v${approved.version}). Any previously approved policy has been retired.`,
      });
      await fetchPolicies();
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      if (activePolicyMutationRef.current === mutationEntry) {
        activePolicyMutationRef.current = null;
        setMutating(false);
      }
      const classified = classifyAdminRegistrationError(error);
      setApproveDialogState(null);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        onAuthError(classified.kind, classified.message);
        return;
      }
      if (classified.kind === "STALE_VERSION") {
        setBanner({
          variant: "warning",
          message:
            "This consent policy or the currently approved predecessor was modified by another administrator before your approval was applied. Refreshing the latest policies...",
        });
        const refreshOutcome = await fetchPolicies();
        if (!isCurrentAuthGen(authGen) || refreshOutcome === "superseded") {
          return;
        }
        setBanner(
          refreshOutcome === "ok"
            ? {
                variant: "warning",
                message:
                  "This consent policy or the currently approved predecessor was modified by another administrator before your approval was applied. The latest policies are now loaded — review the current policy before retrying.",
              }
            : {
                variant: "error",
                message:
                  "This consent policy or the currently approved predecessor was modified by another administrator, and the latest policies could not be refreshed. Use Retry below to reload before taking action.",
              },
        );
        return;
      }
      setBanner({
        variant: "error",
        message: classified.message,
      });
      await fetchPolicies();
    } finally {
      if (
        isCurrentAuthGen(authGen) &&
        activePolicyMutationRef.current === mutationEntry
      ) {
        activePolicyMutationRef.current = null;
        setMutating(false);
      }
    }
  };

  const handleConfirmRetire = async () => {
    if (
      !retireTarget ||
      !canApprovePolicies ||
      mutating ||
      !isEligible ||
      isSuspended
    ) {
      return;
    }
    const authGen = authGenerationRef.current;
    const targetId = retireTarget.id;
    const targetVersion = retireTarget.version;
    const mutationEntry = {
      action: "retire" as const,
      token: Symbol("retire"),
    };
    activePolicyMutationRef.current = mutationEntry;
    setMutating(true);
    setBanner(null);
    try {
      const retired = await retireAdminRegistrationPolicy(targetId, {
        expectedVersion: targetVersion,
      });
      if (!isCurrentAuthGen(authGen)) return;
      if (activePolicyMutationRef.current === mutationEntry) {
        activePolicyMutationRef.current = null;
        setMutating(false);
      }
      setRetireTarget(null);
      setBanner({
        variant: "success",
        message: `Consent policy "${retired.policyVersion}" is now RETIRED (v${retired.version}).`,
      });
      await fetchPolicies();
    } catch (error: unknown) {
      if (!isCurrentAuthGen(authGen)) return;
      if (activePolicyMutationRef.current === mutationEntry) {
        activePolicyMutationRef.current = null;
        setMutating(false);
      }
      const classified = classifyAdminRegistrationError(error);
      setRetireTarget(null);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        authGenerationRef.current += 1;
        onAuthError(classified.kind, classified.message);
        return;
      }
      if (classified.kind === "STALE_VERSION") {
        setBanner({
          variant: "warning",
          message:
            "This consent policy changed before your retirement was applied. Refreshing the latest policies...",
        });
        const refreshOutcome = await fetchPolicies();
        if (!isCurrentAuthGen(authGen) || refreshOutcome === "superseded") {
          return;
        }
        setBanner(
          refreshOutcome === "ok"
            ? {
                variant: "warning",
                message:
                  "This consent policy changed before your retirement was applied. The latest policies are now loaded — review the current policy before retrying.",
              }
            : {
                variant: "error",
                message:
                  "This consent policy changed, and the latest policies could not be refreshed. Use Retry below to reload before taking action.",
              },
        );
        return;
      }
      setBanner({
        variant: "error",
        message: classified.message,
      });
      await fetchPolicies();
    } finally {
      if (
        isCurrentAuthGen(authGen) &&
        activePolicyMutationRef.current === mutationEntry
      ) {
        activePolicyMutationRef.current = null;
        setMutating(false);
      }
    }
  };

  const columns: Column<AdminRegistrationPolicyDto>[] = [
    {
      key: "policyVersion",
      header: "Policy Version",
      render: (policy) => (
        <div>
          <div
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              color: "#0F172A",
              fontSize: "0.84rem",
            }}
          >
            {policy.policyVersion}
          </div>
          <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
            v{policy.version}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (policy) => <StatusBadge status={policy.status} size="sm" />,
    },
    {
      key: "approvedAt",
      header: "Approved (MYT)",
      render: (policy) => (
        <span style={{ fontSize: "0.8rem", color: "#334155" }}>
          {formatMytDateTime(policy.approvedAt)}
        </span>
      ),
    },
    {
      key: "retiredAt",
      header: "Retired (MYT)",
      render: (policy) => (
        <span style={{ fontSize: "0.8rem", color: "#64748B" }}>
          {formatMytDateTime(policy.retiredAt)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created (MYT)",
      render: (policy) => (
        <span style={{ fontSize: "0.8rem", color: "#64748B" }}>
          {formatMytDateTime(policy.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (policy) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button
            size="sm"
            variant="secondary"
            data-testid={`inspect-policy-${policy.id}`}
            onClick={() => setInspectPolicy(policy)}
          >
            Inspect
          </Button>
          {canApprovePolicies && policy.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="primary"
              data-testid={`approve-policy-${policy.id}`}
              onClick={() =>
                setApproveDialogState({
                  target: policy,
                  predecessor: currentPolicy,
                })
              }
            >
              Approve
            </Button>
          ) : null}
          {canApprovePolicies &&
          (policy.status === "APPROVED" || policy.status === "DRAFT") ? (
            <Button
              size="sm"
              variant="danger"
              data-testid={`retire-policy-${policy.id}`}
              onClick={() => setRetireTarget(policy)}
            >
              Retire
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 38,
    padding: "7px 10px",
    borderRadius: 6,
    border: "1px solid #CBD5E1",
    backgroundColor: "#FFFFFF",
    fontSize: "0.82rem",
    color: "#0F172A",
  };

  if (isSuspended) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id="panel-policies"
      data-testid="admin-consent-policies-panel"
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
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
            Consent Policies (EN · MS · ZH-Hans)
          </h2>
          <p
            style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#475569" }}
          >
            Stores owner-approved consent references and SHA-256 digests only.
            Approval and retirement require AAL2 SUPER_ADMIN or MANAGEMENT.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void fetchPolicies()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            data-testid="create-policy-draft-btn"
            onClick={openCreateDrawer}
          >
            + Create Policy Draft
          </Button>
        </div>
      </div>

      {!canApprovePolicies ? (
        <div
          data-testid="policy-authority-readonly"
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            backgroundColor: "#F8FAFC",
            border: "1px solid #CBD5E1",
            color: "#334155",
            fontSize: "0.83rem",
            lineHeight: 1.5,
          }}
        >
          <strong>Role boundary:</strong> You can inspect consent policies and
          prepare draft versions, but approval and retirement controls are
          restricted to AAL2 <strong>SUPER_ADMIN</strong> and{" "}
          <strong>MANAGEMENT</strong> staff.
        </div>
      ) : null}

      {banner ? (
        <div
          role="alert"
          data-testid="policies-action-banner"
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
        <LoadingState message="Loading consent policies..." />
      ) : loadError ? (
        <ErrorState
          title="Failed to Load Consent Policies"
          message={loadError}
          onRetry={() => void fetchPolicies()}
        />
      ) : (
        <>
          {/* Current Approved Policy Card (separate from bounded 50-item history) */}
          {currentPolicy ? (
            <div
              data-testid="current-approved-policy-card"
              style={{
                backgroundColor: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: 12,
                padding: "18px 20px",
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
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusBadge status="APPROVED" size="md" />
                  <strong
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1rem",
                      color: "#065F46",
                    }}
                  >
                    {currentPolicy.policyVersion}
                  </strong>
                  <span style={{ fontSize: "0.78rem", color: "#047857" }}>
                    (v{currentPolicy.version})
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    data-testid="inspect-current-policy-btn"
                    onClick={() => setInspectPolicy(currentPolicy)}
                  >
                    Inspect References
                  </Button>
                  {canApprovePolicies ? (
                    <Button
                      size="sm"
                      variant="danger"
                      data-testid="retire-current-policy-btn"
                      onClick={() => setRetireTarget(currentPolicy)}
                    >
                      Retire Current Policy
                    </Button>
                  ) : null}
                </div>
              </div>
              <div style={{ fontSize: "0.83rem", color: "#065F46" }}>
                <strong>Active approved consent policy.</strong> Approved{" "}
                {formatMytDateTime(currentPolicy.approvedAt)} (MYT). Always
                reachable here even if older than the 50 newest history entries.
              </div>
            </div>
          ) : (
            <div
              data-testid="no-current-approved-policy-card"
              style={{
                backgroundColor: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 12,
                padding: "18px 20px",
                color: "#78350F",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>
                No Approved Consent Policy — Public Registration Is Closed
              </strong>
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.55 }}>
                Public Academy registration remains closed until an authorized{" "}
                <strong>SUPER_ADMIN</strong> or <strong>MANAGEMENT</strong>{" "}
                account approves a policy referencing owner-approved EN, MS, and
                ZH-Hans legal wording (alongside a configured HMAC key ring).
              </p>
            </div>
          )}

          {/* Bounded Policy History */}
          <div>
            <h3
              style={{
                margin: "4px 0 10px",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              Policy History (Newest 50 Versions)
            </h3>
            {historyItems.length === 0 ? (
              <div data-testid="policies-empty-history">
                <EmptyState
                  title="No consent policy versions yet"
                  description="Create a policy draft with owner-approved references and SHA-256 hashes for EN, MS, and ZH-Hans."
                  action={
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={openCreateDrawer}
                    >
                      + Create Policy Draft
                    </Button>
                  }
                />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={historyItems}
                keyExtractor={(item) => item.id}
              />
            )}
          </div>
        </>
      )}

      {/* Inspect Policy References & SHA-256 Drawer */}
      <Drawer
        isOpen={Boolean(inspectPolicy)}
        onClose={() => setInspectPolicy(null)}
        title={
          inspectPolicy
            ? `Policy ${inspectPolicy.policyVersion}`
            : "Policy Details"
        }
        subtitle={
          inspectPolicy
            ? `${inspectPolicy.status} · v${inspectPolicy.version} · Created ${formatMytDateTime(inspectPolicy.createdAt)} (MYT)`
            : undefined
        }
        width="640px"
      >
        {inspectPolicy ? (
          <div
            data-testid="policy-inspect-content"
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <StatusBadge status={inspectPolicy.status} size="md" />
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                Approved: {formatMytDateTime(inspectPolicy.approvedAt)} ·
                Retired: {formatMytDateTime(inspectPolicy.retiredAt)}
              </span>
            </div>

            {CONSENT_CATEGORY_META.map((cat) => (
              <div
                key={cat.type}
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 14,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.86rem",
                    color: "#0F172A",
                    marginBottom: 8,
                  }}
                >
                  {cat.label} ({cat.required ? "Required" : "Optional"})
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {POLICY_LOCALE_META.map((loc) => {
                    const entry = readContentEntry(
                      inspectPolicy.content,
                      cat.type,
                      loc.locale,
                    );
                    return (
                      <div
                        key={loc.locale}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 6,
                          backgroundColor: "#F8FAFC",
                          fontSize: "0.78rem",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#334155" }}>
                          {loc.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            color: "#0F172A",
                            overflowWrap: "anywhere",
                            marginTop: 2,
                          }}
                        >
                          ref: {entry?.ref ?? "—"}
                        </div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            color: "#64748B",
                            overflowWrap: "anywhere",
                            fontSize: "0.72rem",
                          }}
                        >
                          sha256: {entry?.sha256 ?? "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Drawer>

      {/* Create Policy Draft Drawer */}
      <Drawer
        isOpen={createOpen}
        onClose={() => {
          if (!creating) {
            closeCreateDrawer();
          }
        }}
        title="Create Consent Policy Draft"
        subtitle="Enter exact owner-approved content references and 64-character lowercase hex SHA-256 hashes. Never fabricate legal copy or hashes."
        width="680px"
      >
        <form
          onSubmit={handleCreateDraft}
          noValidate
          data-testid="policy-create-form"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {interruptedCreateReview ? (
            <div
              role="alert"
              data-testid="policy-interrupted-create-notice"
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
                Session revalidation interrupted policy draft creation — outcome
                uncertain
              </strong>
              {interruptedCreateReview.status === "refreshing" ? (
                <div>
                  Refreshing the policy list to check whether submitted policy
                  version{" "}
                  <strong>{interruptedCreateReview.submittedVersion}</strong>{" "}
                  was already created...
                </div>
              ) : interruptedCreateReview.status === "failed" ? (
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
                    Could not refresh the policy list after revalidation for
                    submitted policy version{" "}
                    <strong>{interruptedCreateReview.submittedVersion}</strong>.
                    Retry refresh before creating again.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    data-testid="retry-interrupted-policy-refresh-btn"
                    onClick={() => void handleRetryInterruptedCreateRefresh()}
                  >
                    Retry Refresh
                  </Button>
                </div>
              ) : (
                (() => {
                  const matchedPolicy =
                    historyItems.find(
                      (item) =>
                        item.policyVersion ===
                        interruptedCreateReview.submittedVersion,
                    ) ??
                    (currentPolicy?.policyVersion ===
                    interruptedCreateReview.submittedVersion
                      ? currentPolicy
                      : null);
                  return (
                    <>
                      <div data-testid="policy-interrupted-lookup-result">
                        {matchedPolicy ? (
                          <span>
                            Refreshed policy lookup found submitted version{" "}
                            <strong>{matchedPolicy.policyVersion}</strong> (
                            {formatPolicyStatusLabel(matchedPolicy.status)}, v
                            {matchedPolicy.version}, created{" "}
                            {formatMytDateTime(matchedPolicy.createdAt)}). Close
                            this drawer unless you intend to create a different
                            version.
                          </span>
                        ) : (
                          <span>
                            Refreshed policy lookup did not find submitted
                            version{" "}
                            <strong>
                              {interruptedCreateReview.submittedVersion}
                            </strong>{" "}
                            among {historyItems.length} loaded polic
                            {historyItems.length === 1 ? "y" : "ies"} (current
                            approved:{" "}
                            <strong>
                              {currentPolicy?.policyVersion ?? "None"}
                            </strong>
                            ).
                          </span>
                        )}
                      </div>
                      {historyItems.length > 0 ? (
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 18,
                            fontSize: "0.78rem",
                            color: "#78350F",
                          }}
                        >
                          {historyItems.slice(0, 5).map((item) => (
                            <li key={item.id}>
                              <code>{item.policyVersion}</code> —{" "}
                              {formatPolicyStatusLabel(item.status)} (v
                              {item.version})
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          data-testid="acknowledge-interrupted-policy-create-btn"
                          onClick={() => setInterruptedCreateReview(null)}
                        >
                          I Reviewed the Policy Lookup — Enable Retry
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={closeCreateDrawer}
                        >
                          Close Drawer
                        </Button>
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          ) : null}

          {formError ? (
            <div
              role="alert"
              data-testid="policy-form-error"
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
              {formError}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="policy-version-input"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "#0F172A",
                marginBottom: 4,
              }}
            >
              Policy Version *
            </label>
            <input
              id="policy-version-input"
              type="text"
              maxLength={64}
              value={draftVersion}
              disabled={creating}
              onChange={(e) => {
                if (creating) return;
                setDraftVersion(e.target.value);
                setFieldErrors((prev) => {
                  if (!prev.policyVersion) return prev;
                  const next = { ...prev };
                  delete next.policyVersion;
                  return next;
                });
              }}
              placeholder="e.g. 2026-12-v1"
              style={inputStyle}
            />
            {fieldErrors.policyVersion ? (
              <div
                role="alert"
                style={{ color: "#B91C1C", fontSize: "0.78rem", marginTop: 4 }}
              >
                {fieldErrors.policyVersion}
              </div>
            ) : null}
          </div>

          {CONSENT_CATEGORY_META.map((cat) => (
            <fieldset
              key={cat.type}
              style={{
                border: "1px solid #CBD5E1",
                borderRadius: 10,
                padding: 14,
                margin: 0,
                minWidth: 0,
                backgroundColor: "#F8FAFC",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <legend
                style={{
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  color: "#0F172A",
                  padding: "0 6px",
                }}
              >
                {cat.label} ({cat.required ? "Required" : "Optional"})
              </legend>

              {POLICY_LOCALE_META.map((loc) => {
                const refKey = `content.${cat.type}.${loc.locale}.ref`;
                const shaKey = `content.${cat.type}.${loc.locale}.sha256`;
                const cell = draftContent[cat.type][loc.locale];
                return (
                  <div key={loc.locale} className="admin-policy-ref-grid">
                    <div>
                      <label
                        htmlFor={`policy-ref-${cat.type}-${loc.locale}`}
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#334155",
                          marginBottom: 4,
                        }}
                      >
                        {loc.label} Ref *
                      </label>
                      <input
                        id={`policy-ref-${cat.type}-${loc.locale}`}
                        type="text"
                        maxLength={300}
                        value={cell.ref}
                        disabled={creating}
                        onChange={(e) =>
                          updateContentCell(
                            cat.type,
                            loc.locale,
                            "ref",
                            e.target.value,
                          )
                        }
                        placeholder="Approved legal reference URI/key"
                        style={inputStyle}
                      />
                      {fieldErrors[refKey] ? (
                        <div
                          role="alert"
                          style={{
                            color: "#B91C1C",
                            fontSize: "0.74rem",
                            marginTop: 3,
                          }}
                        >
                          {fieldErrors[refKey]}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={`policy-sha-${cat.type}-${loc.locale}`}
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#334155",
                          marginBottom: 4,
                        }}
                      >
                        {loc.label} SHA-256 (64 hex) *
                      </label>
                      <input
                        id={`policy-sha-${cat.type}-${loc.locale}`}
                        type="text"
                        maxLength={64}
                        value={cell.sha256}
                        disabled={creating}
                        onChange={(e) =>
                          updateContentCell(
                            cat.type,
                            loc.locale,
                            "sha256",
                            e.target.value,
                          )
                        }
                        placeholder="64 lowercase hex characters"
                        style={{ ...inputStyle, fontFamily: "monospace" }}
                      />
                      {fieldErrors[shaKey] ? (
                        <div
                          role="alert"
                          style={{
                            color: "#B91C1C",
                            fontSize: "0.74rem",
                            marginTop: 3,
                          }}
                        >
                          {fieldErrors[shaKey]}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </fieldset>
          ))}

          <div className="admin-drawer-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={closeCreateDrawer}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              data-testid="submit-policy-draft-btn"
              disabled={creating || interruptedCreateReview !== null}
            >
              {creating ? "Creating..." : "Create Draft Policy"}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Approve Policy Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(approveDialogState)}
        onClose={() => {
          if (!mutating) setApproveDialogState(null);
        }}
        onConfirm={() => void handleConfirmApprove()}
        isLoading={mutating}
        variant="primary"
        title={`Approve policy "${approveDialogState?.target.policyVersion ?? ""}"?`}
        confirmLabel="Approve Policy"
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, color: "#334155" }}>
              Approving{" "}
              <strong>{approveDialogState?.target.policyVersion}</strong> (v
              {approveDialogState?.target.version}) makes it the active consent
              policy for public Academy registration.
            </p>
            {approveDialogState?.predecessor ? (
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
                Approving this replacement automatically retires the currently
                approved policy (
                <strong>{approveDialogState.predecessor.policyVersion}</strong>,
                v{approveDialogState.predecessor.version}) and increments its
                version.
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  padding: "8px 10px",
                  borderRadius: 6,
                  backgroundColor: "#F8FAFC",
                  color: "#475569",
                  fontSize: "0.82rem",
                }}
              >
                No currently approved consent policy will be retired.
              </p>
            )}
          </div>
        }
      />

      {/* Retire Policy Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(retireTarget)}
        onClose={() => {
          if (!mutating) setRetireTarget(null);
        }}
        onConfirm={() => void handleConfirmRetire()}
        isLoading={mutating}
        variant="danger"
        title={`Retire policy "${retireTarget?.policyVersion ?? ""}"?`}
        confirmLabel="Retire Policy"
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, color: "#334155" }}>
              Retire consent policy{" "}
              <strong>{retireTarget?.policyVersion}</strong> (v
              {retireTarget?.version}).
            </p>
            {retireTarget?.status === "APPROVED" ? (
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
                Retiring the currently approved policy immediately closes public
                Academy registration unless another approved policy exists.
              </p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
