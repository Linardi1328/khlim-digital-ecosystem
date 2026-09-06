"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { useAdminAuth } from "../../lib/auth-context";
import {
  listAdminAccounts,
  replaceAdminStaffRoles,
  updateAdminAccountStatus,
} from "../../lib/admin-api";
import type {
  AccountStatus,
  AdminAccountItem,
  StaffRole,
} from "../../lib/types";

const STAFF_ROLE_OPTIONS: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
  "EVENT_STAFF",
];

const FILTER_ROLE_OPTIONS = ["", ...STAFF_ROLE_OPTIONS] as const;

export default function AccountsAccessPage() {
  const { hasRole, isDemoMode, user } = useAdminAuth();
  const canManage = hasRole(["SUPER_ADMIN", "MANAGEMENT"]);
  const [items, setItems] = useState<AdminAccountItem[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "">("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selected, setSelected] = useState<AdminAccountItem | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<StaffRole[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<AccountStatus>("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!canManage || isDemoMode) return;
    setLoading(true);
    setError("");
    try {
      const result = await listAdminAccounts({
        q: search,
        status: statusFilter,
        role: roleFilter,
        take: 50,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Organization members could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [canManage, isDemoMode, roleFilter, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEditor(item: AdminAccountItem) {
    setSelected(item);
    setSelectedRoles(
      item.roles.filter((role): role is StaffRole =>
        STAFF_ROLE_OPTIONS.includes(role as StaffRole),
      ),
    );
    setSelectedStatus(item.status);
    setMessage("");
    setError("");
  }

  function toggleRole(role: StaffRole) {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((entry) => entry !== role)
        : [...current, role],
    );
  }

  async function saveRoles() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await replaceAdminStaffRoles(selected.id, selectedRoles);
      setMessage(
        "Organization staff roles updated. Global identity and family relationships were not changed.",
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Organization staff roles were not updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveStatus() {
    if (!selected) return;
    if (
      selectedStatus !== "ACTIVE" &&
      !window.confirm(
        `Change ${selected.displayName}'s organization access status to ${selectedStatus}? This can immediately block access to this organization, but does not suspend the global user account.`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateAdminAccountStatus(selected.id, selectedStatus);
      setMessage(`Organization access changed to ${selectedStatus}.`);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Organization access status was not updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  const editingSelf = selected?.id === user?.id;

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Accounts & Access"
          subtitle="Manage organization membership status and staff authority without changing global identity or family relationships."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Accounts & Access" },
          ]}
        />

        {!canManage ? (
          <section className="panel restricted">
            <h2>Management access required</h2>
            <p>
              Organization membership status and staff-role administration is
              limited to Management and Super Admin roles.
            </p>
          </section>
        ) : isDemoMode ? (
          <section className="panel">
            <h2>Real organization access administration is disabled in demo mode</h2>
            <p>
              Demo mode previews role-aware navigation only. It never reads or
              modifies persisted organization memberships.
            </p>
          </section>
        ) : (
          <>
            <form
              className="filters"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <label>
                Search name or email
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="e.g. coach@example.com"
                />
              </label>
              <label>
                Organization access status
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as AccountStatus | "")
                  }
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </label>
              <label>
                Staff role
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  {FILTER_ROLE_OPTIONS.map((role) => (
                    <option key={role || "all"} value={role}>
                      {role ? role.replaceAll("_", " ") : "All staff roles"}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="primary">
                Search members
              </Button>
            </form>

            {message && (
              <p role="status" className="message">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}

            <div className="layout">
              <section className="panel">
                <div className="section-head">
                  <div>
                    <h2>Organization member directory</h2>
                    <p>
                      {loading ? "Loading…" : `${total} matching member(s)`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void load()}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </div>

                <div className="account-list">
                  {!loading && items.length === 0 && (
                    <p>No organization members match these filters.</p>
                  )}
                  {items.map((item) => (
                    <article key={item.id} className="account-card">
                      <div className="account-main">
                        <strong>{item.displayName}</strong>
                        <span>{item.email ?? "No email"}</span>
                        <small>
                          {item.status} · {item.preferredLocale} ·{" "}
                          {item.roles.length > 0
                            ? item.roles.join(", ").replaceAll("_", " ")
                            : "No staff roles"}
                        </small>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditor(item)}
                      >
                        Manage access
                      </Button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel editor" aria-live="polite">
                {!selected ? (
                  <>
                    <h2>Select an organization member</h2>
                    <p>
                      Choose “Manage access” to review organization staff roles
                      and membership status. Global account status and family
                      relationships are outside this organization-level control.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>{selected.displayName}</h2>
                    <p>{selected.email ?? "No email address"}</p>
                    {editingSelf && (
                      <p className="warning">
                        Your own organization roles and membership status cannot
                        be changed from this console.
                      </p>
                    )}

                    <fieldset disabled={saving || editingSelf}>
                      <legend>Organization staff roles</legend>
                      <p className="help">
                        Choose only the work roles this person needs in the
                        active organization. Super Admin assignment is restricted
                        to existing Super Admins.
                      </p>
                      <div className="role-grid">
                        {STAFF_ROLE_OPTIONS.map((role) => (
                          <label className="role-option" key={role}>
                            <input
                              type="checkbox"
                              checked={selectedRoles.includes(role)}
                              onChange={() => toggleRole(role)}
                            />
                            <span>{role.replaceAll("_", " ")}</span>
                          </label>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => void saveRoles()}
                        disabled={saving || editingSelf}
                      >
                        Save organization staff roles
                      </Button>
                    </fieldset>

                    <div className="identity-note">
                      <strong>Global identity remains unchanged</strong>
                      <div>
                        This control does not modify guardian/athlete relationships
                        or suspend the person&apos;s platform account.
                      </div>
                    </div>

                    <label>
                      Organization access status
                      <select
                        value={selectedStatus}
                        disabled={saving || editingSelf}
                        onChange={(event) =>
                          setSelectedStatus(event.target.value as AccountStatus)
                        }
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="DEACTIVATED">Deactivated</option>
                      </select>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void saveStatus()}
                      disabled={saving || editingSelf}
                    >
                      Update organization access
                    </Button>
                  </>
                )}
              </section>
            </div>
          </>
        )}

        <style jsx>{`
          .filters,
          .panel {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .filters {
            display: grid;
            grid-template-columns:
              minmax(220px, 2fr) minmax(150px, 1fr) minmax(160px, 1fr)
              auto;
            align-items: end;
            gap: 12px;
            padding: 16px;
            margin-bottom: 18px;
          }
          .layout {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
            gap: 18px;
          }
          .panel {
            padding: 18px;
          }
          .restricted {
            max-width: 680px;
          }
          .section-head,
          .account-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }
          .section-head h2,
          .editor h2 {
            margin: 0;
          }
          .section-head p {
            margin: 4px 0 0;
            color: #64748b;
          }
          .account-list {
            display: grid;
            gap: 10px;
            margin-top: 14px;
          }
          .account-card {
            min-height: 72px;
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 9px;
            background: #f8fafc;
          }
          .account-main {
            display: grid;
            gap: 3px;
            min-width: 0;
          }
          .account-main span,
          .account-main small {
            overflow-wrap: anywhere;
            color: #64748b;
          }
          label,
          legend {
            font-size: 0.85rem;
            font-weight: 700;
            color: #334155;
          }
          input,
          select {
            width: 100%;
            min-height: 44px;
            box-sizing: border-box;
            margin-top: 6px;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: white;
            font: inherit;
          }
          fieldset {
            border: 0;
            padding: 0;
            margin: 18px 0;
          }
          .role-grid {
            display: grid;
            gap: 6px;
            margin: 10px 0 14px;
          }
          .role-option {
            min-height: 44px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 8px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .role-option input {
            width: 20px;
            min-height: 20px;
            margin: 0;
          }
          .help,
          .identity-note {
            color: #64748b;
            font-size: 0.82rem;
          }
          .identity-note {
            padding: 10px;
            background: #f8fafc;
            border-radius: 8px;
            margin-bottom: 14px;
          }
          .warning,
          .message,
          .error {
            padding: 10px 12px;
            border-radius: 8px;
          }
          .warning,
          .message {
            background: #fffbeb;
            border: 1px solid #fde68a;
            color: #92400e;
          }
          .error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
          }
          @media (max-width: 1000px) {
            .filters,
            .layout {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 600px) {
            .account-card {
              align-items: stretch;
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
