"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { adminApi, getAdminAccessToken } from "../../lib/admin-api";
import type { GuardianItem, OfferingItem } from "../../lib/types";
import { useAdminAuth } from "../../lib/auth-context";

const API = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1"
).replace(/\/+$/, "");
type SentNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  programmeOfferingId: string | null;
  createdAt: string;
  _count?: { receipts: number };
};
const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAdminAccessToken() || ""}`,
});

export default function NotificationsAdminPage() {
  const { isAuthenticated, mfaSatisfied, isDemoMode } = useAdminAuth();
  const [items, setItems] = useState<SentNotification[]>([]);
  const [type, setType] = useState("ANNOUNCEMENT");
  const [audience, setAudience] = useState("ALL_GUARDIANS");
  const [target, setTarget] = useState("");
  const [guardianQuery, setGuardianQuery] = useState("");
  const [guardians, setGuardians] = useState<GuardianItem[]>([]);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianError, setGuardianError] = useState("");
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState("");
  const [offeringSearch, setOfferingSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const sendInFlight = useRef(false);
  const historyRequestId = useRef(0);
  const load = useCallback(async () => {
    const requestId = ++historyRequestId.current;
    // Never fetch private staff data before an authorized MFA session is ready.
    // Demo mode is intentionally isolated from live notification endpoints.
    if (isDemoMode || !isAuthenticated || !mfaSatisfied) {
      setItems([]);
      setHistoryError("");
      return;
    }
    try {
      const response = await fetch(`${API}/admin/notifications`, {
        headers: headers(),
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          "Notification history could not be loaded (" + response.status + ").",
        );
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Notification history returned an unexpected format.");
      }
      if (requestId !== historyRequestId.current) return;
      setItems(data as SentNotification[]);
      setHistoryError("");
    } catch (error) {
      if (requestId !== historyRequestId.current) return;
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Notification history could not be loaded.",
      );
    }
  }, [isDemoMode, isAuthenticated, mfaSatisfied]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    let active = true;
    if (
      audience !== "USER" ||
      isDemoMode ||
      !isAuthenticated ||
      !mfaSatisfied
    ) {
      setGuardians([]);
      return () => {
        active = false;
      };
    }
    setGuardianLoading(true);
    setGuardianError("");
    void adminApi
      .listGuardians()
      .then((rows) => {
        if (active)
          setGuardians(rows.filter((item) => item.accountStatus === "ACTIVE"));
      })
      .catch(() => {
        if (active)
          setGuardianError(
            "Guardian lookup is unavailable. No recipient has been selected.",
          );
      })
      .finally(() => {
        if (active) setGuardianLoading(false);
      });
    return () => {
      active = false;
    };
  }, [audience, isDemoMode, isAuthenticated, mfaSatisfied]);

  // Load offerings only for this audience and only after a real MFA session.
  // Hide drafts/closed offerings; the server still validates organization
  // ownership and derives the actual notification recipients at send time.
  useEffect(() => {
    let active = true;
    if (
      audience !== "OFFERING" ||
      isDemoMode ||
      !isAuthenticated ||
      !mfaSatisfied
    ) {
      setOfferings([]);
      setOfferingsLoading(false);
      setOfferingsError("");
      return () => {
        active = false;
      };
    }
    setOfferingsLoading(true);
    setOfferingsError("");
    setOfferings([]);
    void adminApi
      .listOfferings()
      .then((rows) => {
        if (active) {
          setOfferings(
            rows
              .filter((item) => item.status === "OPEN")
              .sort((a, b) =>
                `${a.programmeName} ${a.name}`.localeCompare(
                  `${b.programmeName} ${b.name}`,
                ),
              ),
          );
        }
      })
      .catch(() => {
        if (active) {
          setOfferingsError(
            "Published offerings could not be loaded. Please try again after checking staff access.",
          );
        }
      })
      .finally(() => {
        if (active) setOfferingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [audience, isDemoMode, isAuthenticated, mfaSatisfied]);

  const selectedOffering = offerings.find(
    (offering) => offering.id === target && offering.status === "OPEN",
  );
  const offeringSearchTerm = offeringSearch.trim().toLocaleLowerCase();
  const visibleOfferings = offeringSearchTerm
    ? offerings.filter((offering) =>
        [offering.name, offering.programmeName, offering.venueName ?? ""].some(
          (value) => value.toLocaleLowerCase().includes(offeringSearchTerm),
        ),
      )
    : offerings;

  const selectedGuardian = guardians.find((guardian) => guardian.id === target);
  const searchText = guardianQuery.trim().toLocaleLowerCase();
  const guardianMatches =
    searchText.length >= 2 && !selectedGuardian
      ? guardians
          .filter((guardian) =>
            guardian.displayName.toLocaleLowerCase().includes(searchText),
          )
          .slice(0, 8)
      : [];
  function maskedEmail(value: string) {
    const at = value.indexOf("@");
    if (at <= 0) return "Email not provided";
    const [name, domain] = [value.slice(0, at), value.slice(at + 1)];
    return `${name[0]}***@${domain}`;
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sendInFlight.current) return;
    setMessage("");
    if (isDemoMode) {
      setMessage("Demo mode does not send real notifications.");
      return;
    }
    if (!isAuthenticated || !mfaSatisfied) {
      setMessage("Sign in and complete MFA before sending notifications.");
      return;
    }

    if (audience === "USER" && !selectedGuardian) {
      setMessage("Select a verified guardian from the search results first.");
      return;
    }
    if (audience === "OFFERING" && !selectedOffering) {
      setMessage("Select a published programme offering before sending.");
      return;
    }
    if (audience === "OFFERING") {
      const approved = window.confirm(
        `Send this in-app notification to family accounts linked to "${selectedOffering?.name}"? This action cannot be undone.`,
      );
      if (!approved) return;
    }
    const payload: Record<string, unknown> = { type, audience, title, body };
    if (audience === "OFFERING") payload.programmeOfferingId = target;
    if (audience === "USER") payload.userId = target;

    sendInFlight.current = true;
    setIsSending(true);
    try {
      const response = await fetch(`${API}/admin/notifications`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload: unknown = await response.json().catch(() => null);
        const serverMessage =
          errorPayload &&
          typeof errorPayload === "object" &&
          "message" in errorPayload &&
          typeof errorPayload.message === "string"
            ? errorPayload.message
            : null;
        setMessage(serverMessage || `Could not send notification (${response.status}).`);
        return;
      }
      const created = await response.json();
      setTitle("");
      setBody("");
      setTarget("");
      setGuardianQuery("");
      setOfferingSearch("");
      setMessage(
        "Notification sent to " +
          (created._count?.receipts ?? 0) +
          " recipient(s).",
      );
      await load();
    } catch {
      setMessage(
        "Unable to reach the notification service. Verify whether the send persisted before retrying.",
      );
    } finally {
      sendInFlight.current = false;
      setIsSending(false);
    }
  }

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Notifications"
          subtitle="Send announcements and operational notices to guardians or targeted programme families."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Notifications" },
          ]}
        />
        {message && (
          <p
            role="status"
            style={{ padding: 12, background: "#FEF3C7", borderRadius: 8 }}
          >
            {message}
          </p>
        )}
        <form
          onSubmit={send}
          className="admin-form-panel"
          style={{ maxWidth: 850 }}
        >
          <div className="admin-form-panel-header">
            <h2>Compose a family notification</h2>
            <p>
              Choose the message category and recipient audience carefully.
              Sending creates an in-app notification for the selected audience.
              Email delivery is not currently enabled, and there is no draft
              preview.
            </p>
          </div>
          <div className="admin-form-grid">
            <div className="admin-form-field">
              <label htmlFor="notice-type">Notification category *</label>
              <select
                id="notice-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="ANNOUNCEMENT">General announcement</option>
                <option value="SCHEDULE_CHANGE">
                  Training schedule change
                </option>
                <option value="BILLING">Billing notice</option>
                <option value="EDITORIAL">Academy news / editorial</option>
                <option value="SYSTEM">System notification</option>
              </select>
            </div>
            <div className="admin-form-field">
              <label htmlFor="notice-audience">Send to *</label>
              <select
                id="notice-audience"
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value);
                  setTarget("");
                  setGuardianQuery("");
                  setOfferingSearch("");
                }}
              >
                <option value="ALL_GUARDIANS">All registered guardians</option>
                <option value="OFFERING">Guardians in one offering</option>
                <option value="USER">One specific guardian</option>
              </select>
              <span className="admin-form-hint">
                Confirm the audience before sending to avoid contacting
                unrelated families.
              </span>
            </div>
            {audience === "OFFERING" && (
              <div className="admin-form-field admin-form-field-wide">
                <label htmlFor="notice-offering-search">
                  Find a published offering
                </label>
                <input
                  id="notice-offering-search"
                  type="search"
                  placeholder="Search by offering, programme or venue"
                  autoComplete="off"
                  value={offeringSearch}
                  onChange={(event) => {
                    setOfferingSearch(event.target.value);
                    setTarget("");
                  }}
                  aria-describedby="notice-offering-help"
                />
                <label htmlFor="notice-target">
                  Select programme offering *
                </label>
                <select
                  id="notice-target"
                  required
                  value={selectedOffering?.id ?? ""}
                  disabled={
                    offeringsLoading ||
                    Boolean(offeringsError) ||
                    offerings.length === 0
                  }
                  onChange={(event) => setTarget(event.target.value)}
                  aria-describedby="notice-offering-help"
                >
                  <option value="">
                    {offeringsLoading
                      ? "Loading published offerings…"
                      : "Choose a published offering"}
                  </option>
                  {visibleOfferings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.programmeName} — {offering.name}
                      {offering.venueName ? ` · ${offering.venueName}` : ""}
                      {offering.startsOn ? ` · ${offering.startsOn}` : ""}
                    </option>
                  ))}
                </select>
                <span id="notice-offering-help" className="admin-form-hint">
                  Choose an OPEN (published) offering. Its ID is selected
                  automatically. The server resolves linked guardians and
                  membership purchasers from active or pending memberships, then
                  removes duplicate recipients.
                </span>
                {offeringsLoading && (
                  <span role="status">
                    Loading published programme offerings…
                  </span>
                )}
                {offeringsError && (
                  <p role="alert" className="admin-status-message">
                    {offeringsError}
                  </p>
                )}
                {!offeringsLoading &&
                  !offeringsError &&
                  offerings.length === 0 && (
                    <p role="status" className="admin-status-message">
                      No published offerings found. Publish an offering in
                      Academy Setup first.
                    </p>
                  )}
                {!offeringsLoading &&
                  !offeringsError &&
                  offerings.length > 0 &&
                  visibleOfferings.length === 0 && (
                    <span role="status" className="admin-form-hint">
                      No offerings match this search. Clear the search to view
                      all published offerings.
                    </span>
                  )}
                {selectedOffering && (
                  <div className="guardian-selection" role="status">
                    <div>
                      <strong>Selected: {selectedOffering.name}</strong>
                      <small>
                        {selectedOffering.programmeName}
                        {selectedOffering.venueName
                          ? ` · ${selectedOffering.venueName}`
                          : ""}
                        {" · "}
                        {selectedOffering.enrolledCount} enrolled player(s)
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTarget("");
                        setOfferingSearch("");
                      }}
                    >
                      Change
                    </button>
                  </div>
                )}
                <span className="admin-form-hint">
                  Recipient count is determined at send time. Enrolled players
                  are not the same as unique recipients. This sends an in-app
                  notice, not email.
                </span>
              </div>
            )}
            {audience === "USER" && (
              <div className="admin-form-field admin-form-field-wide">
                <label htmlFor="notice-guardian-name">
                  Find a guardian by name *
                </label>
                <input
                  id="notice-guardian-name"
                  type="search"
                  value={guardianQuery}
                  autoComplete="off"
                  placeholder="Type at least 2 letters of the guardian's name"
                  onChange={(event) => {
                    setGuardianQuery(event.target.value);
                    setTarget("");
                  }}
                  required={!target}
                  aria-describedby="notice-guardian-help"
                />
                <span id="notice-guardian-help" className="admin-form-hint">
                  Select an existing active KHLIM guardian. The system uses
                  their verified account ID to address the notification.
                </span>
                {guardianLoading && (
                  <span role="status">Loading eligible guardians…</span>
                )}
                {guardianError && (
                  <p className="admin-status-message" role="alert">
                    {guardianError}
                  </p>
                )}
                {selectedGuardian && (
                  <div className="guardian-selection" role="status">
                    <div>
                      <strong>Selected: {selectedGuardian.displayName}</strong>
                      <small>
                        {maskedEmail(selectedGuardian.email)} ·{" "}
                        {selectedGuardian.managedAthletes.length} linked
                        athlete(s)
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTarget("");
                        setGuardianQuery("");
                      }}
                    >
                      Change
                    </button>
                  </div>
                )}
                {!selectedGuardian &&
                  searchText.length >= 2 &&
                  !guardianLoading &&
                  !guardianError && (
                    <div
                      className="guardian-search-results"
                      aria-label="Guardian search results"
                    >
                      {guardianMatches.length > 0 ? (
                        <ul>
                          {guardianMatches.map((guardian) => (
                            <li key={guardian.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setTarget(guardian.id);
                                  setGuardianQuery(guardian.displayName);
                                }}
                              >
                                <span>
                                  <strong>{guardian.displayName}</strong>
                                  <small>
                                    {maskedEmail(guardian.email)} ·{" "}
                                    {guardian.managedAthletes.length} linked
                                    athlete(s)
                                  </small>
                                </span>
                                <span className="guardian-search-select">
                                  Select
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p role="status">
                          No matching active guardians found. Try a different
                          name.
                        </p>
                      )}
                    </div>
                  )}
                <p className="admin-form-hint">
                  This sends an in-app notification only. Outbound email is not
                  yet enabled.
                </p>
              </div>
            )}
            <div className="admin-form-field admin-form-field-wide">
              <label htmlFor="notice-title">Notification title *</label>
              <input
                id="notice-title"
                required
                maxLength={180}
                placeholder="e.g. Saturday training venue update"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="admin-form-field admin-form-field-wide">
              <label htmlFor="notice-message">Message to families *</label>
              <textarea
                id="notice-message"
                required
                rows={5}
                placeholder="Write a clear notice with the relevant date, location and next steps."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <span className="admin-form-hint">
                Avoid unnecessary minor, guardian or medical details in
                announcements.
              </span>
            </div>
            <div className="admin-form-actions admin-form-field-wide">
              <Button type="submit" variant="primary" isLoading={isSending}>
                Send in-app notification
              </Button>
            </div>
          </div>
          <small style={{ display: "block", marginTop: 13, color: "#64748b" }}>
            Notifications are persistent, not emails, and require a verified
            staff account with MFA. Use test recipients only in isolated
            non-production environments.
          </small>
        </form>
        <section style={{ marginTop: 24 }}>
          <h2>Recent sends</h2>
          {historyError && (
            <p role="alert" className="admin-status-message">
              {historyError}
            </p>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((item) => (
              <article
                key={item.id}
                style={{
                  padding: 14,
                  background: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                }}
              >
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <small>
                  {item.type} · {item._count?.receipts ?? 0} recipient(s) ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
