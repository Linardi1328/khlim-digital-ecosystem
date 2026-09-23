"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { useAdminAuth } from "../../lib/auth-context";
import {
  listEditorialModerationQueue,
  publishEditorialEntry,
  unpublishEditorialEntry,
} from "../../lib/admin-api";
import type {
  EditorialModerationItem,
  EditorialModerationState,
} from "../../lib/admin-operations-types";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "MANAGEMENT"] as const;
type Filter = "ALL" | EditorialModerationState;

function stateLabel(state: EditorialModerationState): string {
  if (state === "READY") return "Ready for review";
  if (state === "BLOCKED") return "Needs verification";
  return "Published";
}

export default function ModerationPage() {
  const { hasRole, isDemoMode } = useAdminAuth();
  const [items, setItems] = useState<EditorialModerationItem[]>([]);
  const [filter, setFilter] = useState<Filter>("READY");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const allowed = hasRole([...MANAGEMENT_ROLES]);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError("");
    try {
      setItems(await listEditorialModerationQueue());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The editorial moderation queue could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      ALL: items.length,
      READY: items.filter((item) => item.moderationState === "READY").length,
      BLOCKED: items.filter((item) => item.moderationState === "BLOCKED")
        .length,
      LIVE: items.filter((item) => item.moderationState === "LIVE").length,
    }),
    [items],
  );

  const visibleItems = useMemo(
    () =>
      filter === "ALL"
        ? items
        : items.filter((item) => item.moderationState === filter),
    [filter, items],
  );

  async function transition(
    item: EditorialModerationItem,
    action: "publish" | "unpublish",
  ) {
    const confirmed = window.confirm(
      action === "publish"
        ? `Publish “${item.title}” to the public KHLIM website? This is a management approval action.`
        : `Remove “${item.title}” from the public KHLIM website and return it to draft review?`,
    );
    if (!confirmed) return;

    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      const updated =
        action === "publish"
          ? await publishEditorialEntry(item.id)
          : await unpublishEditorialEntry(item.id);

      if (isDemoMode) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? { ...candidate, ...updated } : candidate,
          ),
        );
      } else {
        await load();
      }
      setMessage(
        action === "publish"
          ? "Content approved and published."
          : "Content unpublished and returned to draft review.",
      );
    } catch (transitionError) {
      setError(
        transitionError instanceof Error
          ? transitionError.message
          : "The moderation action could not be completed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <AdminShell>
        <PageHeader
          title="Editorial Moderation"
          subtitle="Final publication decisions are limited to Management and Super Admin roles."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Moderation" },
          ]}
        />
        <div className="restricted-card">
          <h2>Management approval required</h2>
          <p>
            You can continue preparing verified drafts in Editorial Studio, but
            publishing and unpublishing public content requires a Management or
            Super Admin account with MFA.
          </p>
          <Link className="editorial-link" href="/editorial">
            Open Editorial Studio
          </Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Editorial Moderation"
          subtitle="Review verified KHLIM content before it becomes public. Draft editing and final publication are intentionally separated."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Moderation" },
          ]}
        />

        <div className="moderation-notice">
          <strong>Publication safety rule:</strong> only complete, fact-verified
          drafts can be published. Published content must be unpublished before
          any staff member can edit it.
        </div>

        <div className="toolbar">
          <div className="filters" role="group" aria-label="Moderation filters">
            {(["READY", "BLOCKED", "LIVE", "ALL"] as Filter[]).map((state) => (
              <button
                key={state}
                type="button"
                className={filter === state ? "filter active" : "filter"}
                aria-pressed={filter === state}
                onClick={() => setFilter(state)}
              >
                {state === "ALL" ? "All" : stateLabel(state)} ({counts[state]})
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <Button
              variant="outline"
              onClick={() => void load()}
              isLoading={loading}
            >
              Refresh queue
            </Button>
            <Link className="editorial-link" href="/editorial">
              Open Editorial Studio
            </Link>
          </div>
        </div>

        {message && (
          <div className="message-card" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="error-card" role="alert">
            <strong>Moderation action unavailable.</strong> {error}
          </div>
        )}

        {!loading && visibleItems.length === 0 && (
          <div className="empty-card">
            <h2>No content in this view</h2>
            <p>
              There are currently no editorial items matching this moderation
              state.
            </p>
          </div>
        )}

        <section
          className="moderation-list"
          aria-label="Editorial moderation queue"
        >
          {visibleItems.map((item) => (
            <article className="moderation-card" key={item.id}>
              <div className="card-head">
                <div>
                  <div className="eyebrow">
                    {item.type === "PLAYER_SPOTLIGHT"
                      ? "Player Spotlight"
                      : "Club Achievement"}
                  </div>
                  <h2>{item.title}</h2>
                  <p className="event-name">{item.eventName}</p>
                </div>
                <span
                  className={`state state-${item.moderationState.toLowerCase()}`}
                >
                  {stateLabel(item.moderationState)}
                </span>
              </div>

              <p className="summary">{item.summary}</p>

              <dl className="content-facts">
                <div>
                  <dt>Facts & photo rights</dt>
                  <dd>{item.factsVerified ? "Verified" : "Not verified"}</dd>
                </div>
                <div>
                  <dt>Draft method</dt>
                  <dd>
                    {item.aiAssisted
                      ? "AI-assisted + staff reviewed"
                      : "Staff authored"}
                  </dd>
                </div>
                {item.playerName && (
                  <div>
                    <dt>Player</dt>
                    <dd>{item.playerName}</dd>
                  </div>
                )}
                {item.achievement && (
                  <div>
                    <dt>Achievement</dt>
                    <dd>{item.achievement}</dd>
                  </div>
                )}
              </dl>

              {item.moderationBlockers.length > 0 && (
                <div className="blockers">
                  <strong>Resolve before publication:</strong>
                  <ul>
                    {item.moderationBlockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card-actions">
                {item.moderationState === "READY" && (
                  <Button
                    onClick={() => void transition(item, "publish")}
                    isLoading={busyId === item.id}
                    style={{ minHeight: 44 }}
                  >
                    Approve & publish
                  </Button>
                )}
                {item.moderationState === "LIVE" && (
                  <Button
                    variant="outline"
                    onClick={() => void transition(item, "unpublish")}
                    isLoading={busyId === item.id}
                    style={{ minHeight: 44 }}
                  >
                    Unpublish & return to draft
                  </Button>
                )}
                {item.moderationState === "BLOCKED" && (
                  <Link className="editorial-link" href="/editorial">
                    Fix in Editorial Studio
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>

        <style jsx>{`
          .moderation-notice,
          .toolbar,
          .moderation-card,
          .restricted-card,
          .empty-card,
          .message-card,
          .error-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .moderation-notice {
            padding: 14px 16px;
            margin-bottom: 16px;
            background: #fffbeb;
            border-color: #fde68a;
            color: #92400e;
            line-height: 1.5;
            font-size: 0.875rem;
          }
          .toolbar {
            padding: 12px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            margin-bottom: 16px;
          }
          .filters,
          .toolbar-actions,
          .card-actions {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
          }
          .filter {
            min-height: 44px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #ffffff;
            color: #334155;
            padding: 8px 12px;
            font: inherit;
            font-size: 0.8125rem;
            font-weight: 700;
            cursor: pointer;
          }
          .filter.active {
            background: #18181b;
            border-color: #18181b;
            color: #ffffff;
          }
          .moderation-list {
            display: grid;
            gap: 14px;
          }
          .moderation-card {
            padding: 18px;
          }
          .card-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
          }
          .eyebrow {
            color: #b45309;
            font-size: 0.6875rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          h2 {
            margin: 4px 0 2px;
            color: #0f172a;
            font-size: 1.0625rem;
          }
          .event-name,
          .summary,
          .restricted-card p,
          .empty-card p {
            color: #475569;
            line-height: 1.55;
          }
          .event-name {
            margin: 0;
            font-size: 0.8125rem;
          }
          .summary {
            margin: 14px 0;
          }
          .state {
            flex-shrink: 0;
            border-radius: 999px;
            padding: 6px 9px;
            font-size: 0.6875rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .state-ready {
            color: #92400e;
            background: #fef3c7;
          }
          .state-blocked {
            color: #991b1b;
            background: #fee2e2;
          }
          .state-live {
            color: #065f46;
            background: #d1fae5;
          }
          .content-facts {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px 16px;
            margin: 0 0 14px;
          }
          .content-facts > div {
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
          }
          dt {
            color: #64748b;
            font-size: 0.6875rem;
            font-weight: 700;
            text-transform: uppercase;
          }
          dd {
            margin: 3px 0 0;
            color: #0f172a;
            font-size: 0.8125rem;
            font-weight: 650;
          }
          .blockers {
            padding: 12px 14px;
            border-radius: 8px;
            background: #fef2f2;
            color: #991b1b;
            font-size: 0.8125rem;
            margin-bottom: 14px;
          }
          .blockers ul {
            margin: 6px 0 0;
            padding-left: 18px;
          }
          .restricted-card,
          .empty-card,
          .message-card,
          .error-card {
            padding: 18px;
          }
          .restricted-card h2,
          .empty-card h2 {
            margin-top: 0;
          }
          .message-card {
            margin-bottom: 16px;
            border-color: #bbf7d0;
            background: #f0fdf4;
            color: #166534;
          }
          .error-card {
            margin-bottom: 16px;
            border-color: #fecaca;
            background: #fef2f2;
            color: #991b1b;
          }
          .editorial-link,
          .public-link {
            min-height: 44px;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 0.8125rem;
            font-weight: 700;
            text-decoration: none;
          }
          .editorial-link {
            color: #0f172a;
            background: #ffffff;
            border: 1px solid #cbd5e1;
          }
          .public-link {
            color: #075985;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
          }
          @media (max-width: 760px) {
            .toolbar,
            .card-head {
              flex-direction: column;
              align-items: stretch;
            }
            .content-facts {
              grid-template-columns: 1fr;
            }
            .filters,
            .toolbar-actions,
            .card-actions {
              align-items: stretch;
            }
            .filter,
            .editorial-link,
            .public-link {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
