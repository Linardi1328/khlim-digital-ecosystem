"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { useAdminAuth } from "../../lib/auth-context";
import {
  listGovernanceAudit,
  type GovernanceAuditItem,
  type GovernanceAuditResponse,
} from "../../lib/admin-governance";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultFrom(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 29);
  return toDateOnly(date);
}

function prettyMetadata(value: unknown): string {
  if (value === null || value === undefined) return "No structured metadata";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Metadata could not be displayed";
  }
}

export default function AuditLogPage() {
  const { hasRole, isDemoMode } = useAdminAuth();
  const canView = hasRole(["SUPER_ADMIN", "MANAGEMENT"]);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(toDateOnly(new Date()));
  const [data, setData] = useState<GovernanceAuditResponse | null>(null);
  const [selected, setSelected] = useState<GovernanceAuditItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError("");
    try {
      setData(
        await listGovernanceAudit({
          q: query,
          entityType,
          action,
          from,
          to,
          take: 100,
        }),
      );
    } catch (reason) {
      setData(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "The audit trail could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [action, canView, entityType, from, query, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const resultSummary = useMemo(() => {
    if (!data) return "";
    return `Showing ${data.items.length} of ${data.total} matching event(s) for ${data.period.from} to ${data.period.to}.`;
  }, [data]);

  return (
    <AdminShell>
      <div style={{ minWidth: 0 }}>
        <PageHeader
          title="Operational Audit Trail"
          subtitle="Append-only record of privileged KHLIM administrative changes. History is filtered on the server and cannot be edited or deleted through the application."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Audit Log" },
          ]}
        />

        {!canView ? (
          <section className="panel restricted">
            <h2>Management access required</h2>
            <p>
              Audit history is restricted to Management and Super Admin staff
              with MFA-verified sessions.
            </p>
          </section>
        ) : (
          <>
            {isDemoMode && (
              <div className="notice demo" role="status">
                Demo mode shows synthetic audit examples only. No persisted
                audit records are read or changed.
              </div>
            )}

            <form
              className="filters"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(queryInput.trim());
              }}
            >
              <label className="search-field">
                Search audit history
                <input
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Actor, action, entity, ID, summary…"
                />
              </label>
              <label>
                Entity type
                <select
                  value={entityType}
                  onChange={(event) => setEntityType(event.target.value)}
                >
                  <option value="">All entities</option>
                  {data?.filters.entityTypes.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Action
                <select
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                >
                  <option value="">All actions</option>
                  {data?.filters.actions.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                From
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
              <div className="filter-actions">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? "Loading…" : "Apply filters"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => {
                    setQueryInput("");
                    setQuery("");
                    setEntityType("");
                    setAction("");
                    setFrom(defaultFrom());
                    setTo(toDateOnly(new Date()));
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>

            <div className="notice immutable">
              <strong>Append-only invariant:</strong> database-level protection
              rejects UPDATE and DELETE operations on audit events. This screen
              provides read-only inspection only.
            </div>

            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}

            <section className="panel" aria-busy={loading}>
              <div className="section-head">
                <div>
                  <h2>Privileged activity</h2>
                  <p>{loading ? "Loading audit history…" : resultSummary}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void load()}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>

              <div className="audit-list">
                {!loading && data?.items.length === 0 && (
                  <p>No privileged events match these filters.</p>
                )}
                {data?.items.map((event) => (
                  <article key={event.id} className="audit-card">
                    <div className="audit-time">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                    <div className="audit-content">
                      <div className="audit-title">
                        <strong>{event.action.replaceAll("_", " ")}</strong>
                        <span>{event.entityType.replaceAll("_", " ")}</span>
                      </div>
                      <div className="audit-actor">
                        {event.actorName} ·{" "}
                        {event.actorRole.replaceAll("_", " ")}
                      </div>
                      <p>{event.summary}</p>
                      <code>{event.entityId}</code>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(event)}
                    >
                      Inspect
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        <Drawer
          isOpen={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={
            selected ? selected.action.replaceAll("_", " ") : "Audit event"
          }
          subtitle={
            selected ? `${selected.entityType} · ${selected.entityId}` : ""
          }
          width="560px"
          footer={
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelected(null)}
            >
              Close
            </Button>
          }
        >
          {selected && (
            <div className="drawer-content">
              <dl>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{new Date(selected.timestamp).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Actor</dt>
                  <dd>{selected.actorName}</dd>
                </div>
                <div>
                  <dt>Actor roles</dt>
                  <dd>{selected.actorRole.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>
                    {selected.entityType} · {selected.entityId}
                  </dd>
                </div>
              </dl>
              <section>
                <h3>Summary</h3>
                <p>{selected.summary}</p>
              </section>
              <section>
                <h3>Structured metadata</h3>
                <pre>{prettyMetadata(selected.metadata)}</pre>
              </section>
              <div className="notice immutable">
                Audit records are permanent application evidence. This drawer
                has no edit or delete controls.
              </div>
            </div>
          )}
        </Drawer>

        <style jsx>{`
          .panel,
          .filters {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .panel {
            padding: 18px;
          }
          .restricted {
            max-width: 680px;
          }
          .filters {
            display: grid;
            grid-template-columns: minmax(230px, 2fr) repeat(
                4,
                minmax(145px, 1fr)
              );
            gap: 12px;
            align-items: end;
            padding: 16px;
            margin-bottom: 14px;
          }
          .filter-actions {
            display: flex;
            gap: 8px;
            grid-column: 1 / -1;
            justify-content: flex-end;
          }
          label {
            font-size: 0.78rem;
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
            background: #ffffff;
            font: inherit;
          }
          .notice {
            padding: 11px 13px;
            margin-bottom: 14px;
            border-radius: 9px;
            font-size: 0.83rem;
            line-height: 1.5;
          }
          .demo,
          .immutable {
            background: #fffbeb;
            border: 1px solid #fde68a;
            color: #92400e;
          }
          .error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
          }
          .section-head,
          .audit-card,
          .audit-title {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .section-head {
            justify-content: space-between;
            margin-bottom: 14px;
          }
          .section-head h2,
          .drawer-content h3 {
            margin: 0;
          }
          .section-head p {
            margin: 4px 0 0;
            color: #64748b;
            font-size: 0.8rem;
          }
          .audit-list {
            display: grid;
            gap: 10px;
          }
          .audit-card {
            min-height: 78px;
            align-items: flex-start;
            padding: 13px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #f8fafc;
          }
          .audit-time {
            width: 150px;
            flex: 0 0 auto;
            font: 0.75rem/1.4 monospace;
            color: #64748b;
          }
          .audit-content {
            min-width: 0;
            flex: 1;
          }
          .audit-title {
            flex-wrap: wrap;
          }
          .audit-title span {
            padding: 2px 7px;
            border-radius: 999px;
            background: #e2e8f0;
            color: #475569;
            font-size: 0.7rem;
            font-weight: 700;
          }
          .audit-actor {
            margin-top: 3px;
            color: #64748b;
            font-size: 0.76rem;
            overflow-wrap: anywhere;
          }
          .audit-content p {
            margin: 7px 0;
            color: #334155;
            font-size: 0.85rem;
          }
          .audit-content code {
            overflow-wrap: anywhere;
            font-size: 0.72rem;
          }
          .drawer-content {
            display: grid;
            gap: 16px;
          }
          dl {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 0;
          }
          dl div,
          .drawer-content section {
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 9px;
          }
          dt {
            color: #64748b;
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
          }
          dd {
            margin: 3px 0 0;
            color: #0f172a;
            overflow-wrap: anywhere;
          }
          pre {
            max-width: 100%;
            overflow-x: auto;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            font-size: 0.76rem;
          }
          @media (max-width: 1000px) {
            .filters {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .search-field {
              grid-column: 1 / -1;
            }
          }
          @media (max-width: 640px) {
            .filters,
            dl {
              grid-template-columns: 1fr;
            }
            .filter-actions,
            .audit-card {
              flex-direction: column;
              align-items: stretch;
            }
            .audit-time {
              width: auto;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
