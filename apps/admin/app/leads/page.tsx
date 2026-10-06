"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { LoadingState } from "../../components/ui/LoadingState";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { useAdminAuth } from "../../lib/auth-context";
import {
  getAdminLeadDetail,
  listAdminLeads,
  updateAdminLead,
  type AdminLeadItem,
  type AdminLeadStatus,
} from "../../lib/admin-api";

function formatKHLIMDateTime(isoString: string): string {
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

function cleanDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function LeadsInboxContent() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status") || "ALL";

  const { user, hasRole, isAuthenticated, isDemoMode, mfaSatisfied } =
    useAdminAuth();
  const staffUserId = user?.id || null;
  const canView = hasRole(["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"]);

  const [leads, setLeads] = useState<AdminLeadItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusParam);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const requestSeq = useRef(0);
  const drawerRequestSeq = useRef(0);

  // Drawer / Selection State
  const [selectedLead, setSelectedLead] = useState<AdminLeadItem | null>(null);
  const [drawerStatus, setDrawerStatus] = useState<AdminLeadStatus>("NEW");
  const [drawerNotes, setDrawerNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false);

  const isEligible =
    canView && (isDemoMode || (isAuthenticated && mfaSatisfied));

  // Invalidate responses before painting a changed staff session or eligibility.
  useLayoutEffect(() => {
    requestSeq.current += 1;
    drawerRequestSeq.current += 1;
    setLeads([]);
    setSelectedLead(null);
    setError(null);
    setSaveSuccess(null);
    setSaveError(null);
    setIsConflict(false);
    setIsSaving(false);
    setIsRefreshingDetail(false);
  }, [staffUserId, isEligible]);

  // Fetch leads list
  const fetchLeads = useCallback(async () => {
    if (!isEligible) {
      requestSeq.current += 1;
      setLeads([]);
      setSelectedLead(null);
      setError(null);
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const queryStatus =
        statusFilter === "ALL"
          ? undefined
          : (statusFilter as AdminLeadStatus | "NEEDS_FOLLOW_UP");

      const res = await listAdminLeads({
        page,
        limit: pageSize,
        q: search.trim() || undefined,
        status: queryStatus,
        source: sourceFilter.trim() || undefined,
      });

      if (seq !== requestSeq.current) return;

      setLeads(res.items);
      setTotalItems(res.total);
      setTotalPages(Math.max(1, res.totalPages));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      const msg =
        err instanceof Error ? err.message : "Failed to load Academy leads";
      setError(msg);
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
      }
    }
  }, [
    isEligible,
    staffUserId,
    page,
    pageSize,
    search,
    statusFilter,
    sourceFilter,
  ]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  // Sync drawer fields when a lead is selected
  const handleSelectLead = (lead: AdminLeadItem) => {
    drawerRequestSeq.current += 1;
    setIsSaving(false);
    setIsRefreshingDetail(false);
    setSelectedLead(lead);
    setDrawerStatus(lead.status);
    setDrawerNotes(lead.notes || "");
    setSaveSuccess(null);
    setSaveError(null);
    setIsConflict(false);
  };

  const handleCloseDrawer = () => {
    drawerRequestSeq.current += 1;
    setIsSaving(false);
    setIsRefreshingDetail(false);
    setSelectedLead(null);
    setSaveSuccess(null);
    setSaveError(null);
    setIsConflict(false);
  };

  // Refresh single lead in drawer (especially useful after 409 conflict)
  const handleRefreshSelectedLead = async () => {
    if (!selectedLead || !isEligible) return;
    const seq = ++drawerRequestSeq.current;
    setIsRefreshingDetail(true);
    setSaveError(null);
    setIsConflict(false);
    try {
      const fresh = await getAdminLeadDetail(selectedLead.id);
      if (seq !== drawerRequestSeq.current) return;
      setSelectedLead(fresh);
      setDrawerStatus(fresh.status);
      setDrawerNotes(fresh.notes || "");
      // Also update in list
      setLeads((prev) =>
        prev.map((item) => (item.id === fresh.id ? fresh : item)),
      );
    } catch {
      if (seq !== drawerRequestSeq.current) return;
      setSaveError("Failed to refresh latest lead data.");
    } finally {
      if (seq === drawerRequestSeq.current) {
        setIsRefreshingDetail(false);
      }
    }
  };

  // Handle save from drawer
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !isEligible) return;
    const seq = ++drawerRequestSeq.current;

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    setIsConflict(false);

    try {
      const updated = await updateAdminLead(selectedLead.id, {
        status: drawerStatus,
        notes: drawerNotes.trim() || null,
        expectedUpdatedAt: selectedLead.updatedAt,
      });

      if (seq !== drawerRequestSeq.current) return;

      setSelectedLead(updated);
      setDrawerStatus(updated.status);
      setDrawerNotes(updated.notes || "");
      setSaveSuccess("Lead updated successfully.");

      // Update in table list and refresh to respect active filters
      setLeads((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      void fetchLeads();
    } catch (err: unknown) {
      if (seq !== drawerRequestSeq.current) return;

      const errorObj = err as { status?: number; message?: string };
      if (
        errorObj.status === 409 ||
        (typeof errorObj.message === "string" &&
          (errorObj.message.includes("409") ||
            errorObj.message.toLowerCase().includes("conflict") ||
            errorObj.message.toLowerCase().includes("modified by another")))
      ) {
        setIsConflict(true);
        setSaveError(
          "This lead was updated by another administrator. Please refresh before saving changes.",
        );
      } else {
        setSaveError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while saving.",
        );
      }
    } finally {
      if (seq === drawerRequestSeq.current) {
        setIsSaving(false);
      }
    }
  };

  const columns: Column<AdminLeadItem>[] = [
    {
      key: "guardianName",
      header: "Guardian Name",
      render: (lead) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>
            {lead.guardianName}
          </div>
          {lead.email && (
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
              {lead.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (lead) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>
          {lead.phone}
        </span>
      ),
    },
    {
      key: "childAge",
      header: "Age",
      render: (lead) => (
        <span style={{ fontWeight: 500 }}>{lead.childAge} yrs</span>
      ),
    },
    {
      key: "offering",
      header: "Programme / Offering",
      render: (lead) => (
        <div style={{ maxWidth: "200px" }}>
          <div style={{ fontWeight: 500, color: "#1E293B" }}>
            {lead.programmeName || "General Academy Interest"}
          </div>
          {lead.offeringName && (
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
              {lead.offeringName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (lead) => (
        <span
          style={{
            fontSize: "0.75rem",
            color: lead.source ? "#0284C7" : "#94A3B8",
            backgroundColor: lead.source ? "#F0F9FF" : "transparent",
            padding: lead.source ? "2px 6px" : "0",
            borderRadius: "4px",
            fontFamily: lead.source ? "monospace" : "inherit",
          }}
        >
          {lead.source || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (lead) => <StatusBadge status={lead.status} size="sm" />,
    },
    {
      key: "createdAt",
      header: "Received (MYT)",
      render: (lead) => (
        <span style={{ fontSize: "0.8125rem", color: "#64748B" }}>
          {formatKHLIMDateTime(lead.createdAt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (lead) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectLead(lead);
          }}
        >
          View & Manage
        </Button>
      ),
    },
  ];

  if (!canView) {
    return (
      <AdminShell>
        <div style={{ minWidth: 0 }}>
          <PageHeader
            title="Academy Leads"
            subtitle="Follow up on prospective athlete registrations and interest submissions."
            breadcrumbs={[
              { label: "Academy", href: "/offerings" },
              { label: "Leads" },
            ]}
          />
          <div
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
                marginTop: "6px",
                maxWidth: "420px",
                margin: "6px auto 0",
              }}
            >
              Academy lead inbox access is restricted to Academy Admin,
              Management, and Super Admin staff with verified MFA sessions.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    Boolean(search.trim()) ||
    Boolean(sourceFilter.trim());

  return (
    <AdminShell>
      <div style={{ minWidth: 0 }}>
        <PageHeader
          title="Academy Leads"
          subtitle="Follow up on prospective athlete registrations and interest submissions."
          breadcrumbs={[
            { label: "Academy", href: "/offerings" },
            { label: "Leads" },
          ]}
        />

        {isDemoMode && (
          <div
            style={{
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              color: "#1E40AF",
              padding: "10px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "0.875rem",
            }}
          >
            ℹ️ Demo mode: Showing synthetic Academy lead data.
          </div>
        )}

        <FilterBar
          hasActiveFilters={hasActiveFilters}
          onReset={() => {
            setSearch("");
            setStatusFilter("ALL");
            setSourceFilter("");
            setPage(1);
          }}
        >
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search name, phone, email..."
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
              htmlFor="lead-source-filter"
              style={{ fontWeight: 500, color: "#475569" }}
            >
              Source:
            </label>
            <input
              id="lead-source-filter"
              type="text"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by source..."
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                backgroundColor: "#FFFFFF",
                fontSize: "0.875rem",
                color: "#1E293B",
                width: "160px",
              }}
            />
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
              htmlFor="lead-status-filter"
              style={{ fontWeight: 500, color: "#475569" }}
            >
              Status:
            </label>
            <select
              id="lead-status-filter"
              value={statusFilter}
              onChange={(e) => {
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
              <option value="NEEDS_FOLLOW_UP">
                Needs Follow-up (New, Contacted, Qualified)
              </option>
              <option value="NEW">NEW</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="ENROLLED">ENROLLED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </FilterBar>

        {loading ? (
          <LoadingState message="Loading Academy leads..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Leads"
            message={error}
            onRetry={() => void fetchLeads()}
          />
        ) : leads.length === 0 ? (
          <EmptyState
            title="No leads found"
            description={
              hasActiveFilters
                ? "No Academy leads match the active search or filter criteria."
                : "No prospective athlete interest registrations recorded yet."
            }
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={leads}
              keyExtractor={(lead) => lead.id}
              onRowClick={handleSelectLead}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}

        {/* Lead Detail & Management Drawer */}
        <Drawer
          isOpen={Boolean(selectedLead)}
          onClose={handleCloseDrawer}
          title={
            selectedLead ? `Lead: ${selectedLead.guardianName}` : "Lead Details"
          }
          subtitle={
            selectedLead
              ? `Registered: ${formatKHLIMDateTime(selectedLead.createdAt)}`
              : undefined
          }
          width="580px"
        >
          {selectedLead && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                padding: "8px 0",
              }}
            >
              {/* WhatsApp Action Card */}
              <div
                style={{
                  backgroundColor: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#166534" }}>
                    Manual WhatsApp Follow-up
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      backgroundColor: "#DCFCE7",
                      color: "#15803D",
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontWeight: 600,
                    }}
                  >
                    Staff Action
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "#166534",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  Clicking below opens a direct chat with the guardian in a new
                  browser tab. No automated WhatsApp message is sent and lead
                  status will not change automatically.
                </p>
                <div>
                  <a
                    href={`https://wa.me/${cleanDigits(selectedLead.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor: "#25D366",
                      color: "#FFFFFF",
                      padding: "10px 18px",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      textDecoration: "none",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    <span>💬</span>
                    <span>Chat on WhatsApp ({selectedLead.phone})</span>
                    <span aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                      ↗
                    </span>
                  </a>
                </div>
              </div>

              {/* Lead Details Summary */}
              <div
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#0F172A",
                    marginBottom: "12px",
                    fontSize: "0.875rem",
                  }}
                >
                  Registration Details
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    fontSize: "0.8125rem",
                  }}
                >
                  <div>
                    <div style={{ color: "#64748B" }}>Guardian Name</div>
                    <div style={{ fontWeight: 600, color: "#1E293B" }}>
                      {selectedLead.guardianName}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Phone Number</div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#1E293B",
                        fontFamily: "monospace",
                      }}
                    >
                      {selectedLead.phone}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Email Address</div>
                    <div style={{ fontWeight: 500, color: "#1E293B" }}>
                      {selectedLead.email || "None provided"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Child Age</div>
                    <div style={{ fontWeight: 600, color: "#1E293B" }}>
                      {selectedLead.childAge} years old
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ color: "#64748B" }}>Programme / Offering</div>
                    <div style={{ fontWeight: 600, color: "#1E293B" }}>
                      {selectedLead.programmeName || "General Academy Interest"}
                      {selectedLead.offeringName &&
                        ` (${selectedLead.offeringName})`}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Campaign Source</div>
                    <div style={{ fontWeight: 500, color: "#1E293B" }}>
                      {selectedLead.source || "Direct / Organic"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Consent Version</div>
                    <div style={{ fontWeight: 500, color: "#1E293B" }}>
                      {selectedLead.consentVersion} (agreed{" "}
                      {formatKHLIMDateTime(selectedLead.consentAt)})
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Submitted At (MYT)</div>
                    <div style={{ color: "#1E293B" }}>
                      {formatKHLIMDateTime(selectedLead.createdAt)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B" }}>Last Updated (MYT)</div>
                    <div style={{ color: "#1E293B" }}>
                      {formatKHLIMDateTime(selectedLead.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update & Operational Notes Form */}
              <form
                onSubmit={handleSaveLead}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  borderTop: "1px solid #E2E8F0",
                  paddingTop: "16px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#0F172A",
                    fontSize: "0.875rem",
                  }}
                >
                  Manage Status & Operational Notes
                </div>

                {isConflict && (
                  <div
                    style={{
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#991B1B",
                      padding: "12px",
                      borderRadius: "8px",
                      fontSize: "0.8125rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div>
                      ⚠️ <strong>Update Conflict Detected:</strong> This lead
                      was modified by another administrator since you opened it.
                    </div>
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleRefreshSelectedLead}
                        disabled={isRefreshingDetail}
                      >
                        {isRefreshingDetail
                          ? "Refreshing..."
                          : "Refresh Lead to Latest"}
                      </Button>
                    </div>
                  </div>
                )}

                {saveSuccess && (
                  <div
                    style={{
                      backgroundColor: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      color: "#065F46",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "0.8125rem",
                    }}
                  >
                    ✓ {saveSuccess}
                  </div>
                )}

                {saveError && !isConflict && (
                  <div
                    style={{
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#991B1B",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "0.8125rem",
                    }}
                  >
                    ✕ {saveError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="lead-drawer-status"
                    style={{
                      display: "block",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Lead Status
                  </label>
                  <select
                    id="lead-drawer-status"
                    value={drawerStatus}
                    onChange={(e) =>
                      setDrawerStatus(e.target.value as AdminLeadStatus)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #CBD5E1",
                      backgroundColor: "#FFFFFF",
                      fontSize: "0.875rem",
                      color: "#0F172A",
                    }}
                  >
                    <option value="NEW">NEW - Newly registered</option>
                    <option value="CONTACTED">
                      CONTACTED - Followed up via WhatsApp / phone
                    </option>
                    <option value="QUALIFIED">
                      QUALIFIED - Suitable programme identified
                    </option>
                    <option value="ENROLLED">
                      ENROLLED - Successfully joined academy
                    </option>
                    <option value="CLOSED">CLOSED - Inactive / declined</option>
                  </select>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <label
                      htmlFor="lead-drawer-notes"
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      Operational Notes
                    </label>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color:
                          drawerNotes.length > 1900 ? "#EF4444" : "#94A3B8",
                      }}
                    >
                      {drawerNotes.length} / 2000
                    </span>
                  </div>
                  <textarea
                    id="lead-drawer-notes"
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Log contact attempts, guardian preferences, trial date commitments, or next steps..."
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #CBD5E1",
                      backgroundColor: "#FFFFFF",
                      fontSize: "0.875rem",
                      color: "#0F172A",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "8px",
                  }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseDrawer}
                  >
                    Close
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <AdminShell>
          <LoadingState message="Loading Academy leads..." />
        </AdminShell>
      }
    >
      <LeadsInboxContent />
    </Suspense>
  );
}
