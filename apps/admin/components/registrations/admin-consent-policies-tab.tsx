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

export interface AdminConsentPoliciesTabProps {
  isEligible: boolean;
  canApprovePolicies: boolean;
  staffKey: string;
  onAuthError: (kind: AdminRegistrationErrorKind, message: string) => void;
}

export function AdminConsentPoliciesTab({
  isEligible,
  canApprovePolicies,
  staffKey,
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

  // Approve & Retire dialogs (only accessible to SUPER_ADMIN / MANAGEMENT)
  const [approveTarget, setApproveTarget] =
    useState<AdminRegistrationPolicyDto | null>(null);
  const [retireTarget, setRetireTarget] =
    useState<AdminRegistrationPolicyDto | null>(null);
  const [mutating, setMutating] = useState(false);

  const listSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    listSeq.current += 1;
    abortRef.current?.abort();
    setCurrentPolicy(null);
    setHistoryItems([]);
    setLoadError(null);
    setBanner(null);
    setInspectPolicy(null);
    setCreateOpen(false);
    setApproveTarget(null);
    setRetireTarget(null);
    setFieldErrors({});
    setFormError(null);
  }, [staffKey, isEligible]);

  const fetchPolicies = useCallback(async () => {
    void staffKey;
    if (!isEligible) {
      setCurrentPolicy(null);
      setHistoryItems([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++listSeq.current;

    setLoading(true);
    setLoadError(null);

    try {
      const response = await listAdminRegistrationPolicies(controller.signal);
      if (seq !== listSeq.current) return;
      setCurrentPolicy(response.current ?? null);
      setHistoryItems(Array.isArray(response.items) ? response.items : []);
    } catch (error: unknown) {
      if (controller.signal.aborted || seq !== listSeq.current) return;
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        setCurrentPolicy(null);
        setHistoryItems([]);
        onAuthError(classified.kind, classified.message);
      }
      setLoadError(classified.message);
    } finally {
      if (seq === listSeq.current) {
        setLoading(false);
      }
    }
  }, [isEligible, staffKey, onAuthError]);

  useEffect(() => {
    void fetchPolicies();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchPolicies]);

  const openCreateDrawer = () => {
    setBanner(null);
    setDraftVersion("");
    setDraftContent(createEmptyPolicyContentMap());
    setFieldErrors({});
    setFormError(null);
    setCreateOpen(true);
  };

  const updateContentCell = (
    category: RegistrationConsentType,
    locale: RegistrationLocale,
    field: "ref" | "sha256",
    value: string,
  ) => {
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
    if (creating) return;
    setFormError(null);

    const validated = validatePolicyDraftInput(draftVersion, draftContent);
    if (!validated.payload) {
      setFieldErrors(validated.errors);
      setFormError(
        "Complete policy version plus valid references and 64-char lowercase hex SHA-256 hashes for all four categories and three locales.",
      );
      return;
    }

    setFieldErrors({});
    setCreating(true);
    try {
      const created = await createAdminRegistrationPolicy(validated.payload);
      setCreateOpen(false);
      setBanner({
        variant: "success",
        message: `Draft consent policy "${created.policyVersion}" created (v${created.version}).`,
      });
      await fetchPolicies();
    } catch (error: unknown) {
      const classified = classifyAdminRegistrationError(error);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        setCreateOpen(false);
        onAuthError(classified.kind, classified.message);
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
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!approveTarget || !canApprovePolicies || mutating) return;
    setMutating(true);
    setBanner(null);
    try {
      const approved = await approveAdminRegistrationPolicy(approveTarget.id, {
        expectedVersion: approveTarget.version,
      });
      setApproveTarget(null);
      setBanner({
        variant: "success",
        message: `Consent policy "${approved.policyVersion}" is now APPROVED (v${approved.version}). Any previously approved policy has been retired.`,
      });
      await fetchPolicies();
    } catch (error: unknown) {
      const classified = classifyAdminRegistrationError(error);
      setApproveTarget(null);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        onAuthError(classified.kind, classified.message);
        return;
      }
      setBanner({
        variant: classified.kind === "STALE_VERSION" ? "warning" : "error",
        message: classified.message,
      });
      await fetchPolicies();
    } finally {
      setMutating(false);
    }
  };

  const handleConfirmRetire = async () => {
    if (!retireTarget || !canApprovePolicies || mutating) return;
    setMutating(true);
    setBanner(null);
    try {
      const retired = await retireAdminRegistrationPolicy(retireTarget.id, {
        expectedVersion: retireTarget.version,
      });
      setRetireTarget(null);
      setBanner({
        variant: "success",
        message: `Consent policy "${retired.policyVersion}" is now RETIRED (v${retired.version}).`,
      });
      await fetchPolicies();
    } catch (error: unknown) {
      const classified = classifyAdminRegistrationError(error);
      setRetireTarget(null);
      if (
        classified.kind === "UNAUTHENTICATED" ||
        classified.kind === "FORBIDDEN"
      ) {
        onAuthError(classified.kind, classified.message);
        return;
      }
      setBanner({
        variant: classified.kind === "STALE_VERSION" ? "warning" : "error",
        message: classified.message,
      });
      await fetchPolicies();
    } finally {
      setMutating(false);
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
              onClick={() => setApproveTarget(policy)}
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
          if (!creating) setCreateOpen(false);
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
              onChange={(e) => {
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
                  <div
                    key={loc.locale}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                    }}
                  >
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

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: 12,
              borderTop: "1px solid #E2E8F0",
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              data-testid="submit-policy-draft-btn"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Draft Policy"}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Approve Policy Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(approveTarget)}
        onClose={() => {
          if (!mutating) setApproveTarget(null);
        }}
        onConfirm={() => void handleConfirmApprove()}
        isLoading={mutating}
        variant="primary"
        title={`Approve policy "${approveTarget?.policyVersion ?? ""}"?`}
        confirmLabel="Approve Policy"
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, color: "#334155" }}>
              Approving <strong>{approveTarget?.policyVersion}</strong> (v
              {approveTarget?.version}) makes it the active consent policy for
              public Academy registration.
            </p>
            {currentPolicy ? (
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
                approved policy (<strong>{currentPolicy.policyVersion}</strong>)
                and increments its version.
              </p>
            ) : null}
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
