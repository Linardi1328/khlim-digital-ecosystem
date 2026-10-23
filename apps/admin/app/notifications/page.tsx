"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { getAdminAccessToken } from "../../lib/admin-api";
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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    // Never fetch private staff data before an authorized MFA session is ready.
    // Demo mode is intentionally isolated from live notification endpoints.
    if (isDemoMode || !isAuthenticated || !mfaSatisfied) {
      setItems([]);
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
      setItems(data as SentNotification[]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Notification history could not be loaded.",
      );
    }
  }, [isDemoMode, isAuthenticated, mfaSatisfied]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (isDemoMode) {
      setMessage("Demo mode does not send real notifications.");
      return;
    }
    if (!isAuthenticated || !mfaSatisfied) {
      setMessage("Sign in and complete MFA before sending notifications.");
      return;
    }

    const payload: Record<string, unknown> = { type, audience, title, body };
    if (audience === "OFFERING") payload.programmeOfferingId = target;
    if (audience === "USER") payload.userId = target;

    try {
      const response = await fetch(`${API}/admin/notifications`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setMessage(
          "Could not send notification (" +
            response.status +
            "). Staff MFA and a real recipient audience are required.",
        );
        return;
      }
      const created = await response.json();
      setTitle("");
      setBody("");
      setTarget("");
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
              Sending writes a real notification; there is no draft preview in
              this form.
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
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="ALL_GUARDIANS">All registered guardians</option>
                <option value="OFFERING">Guardians in one offering</option>
                <option value="USER">One individual user</option>
              </select>
              <span className="admin-form-hint">
                Confirm the audience before sending to avoid contacting
                unrelated families.
              </span>
            </div>
            {audience !== "ALL_GUARDIANS" && (
              <div className="admin-form-field admin-form-field-wide">
                <label htmlFor="notice-target">
                  {audience === "OFFERING"
                    ? "Programme offering ID"
                    : "Recipient user ID"}{" "}
                  *
                </label>
                <input
                  id="notice-target"
                  required
                  placeholder={
                    audience === "OFFERING"
                      ? "Paste the approved offering identifier"
                      : "Paste the verified user identifier"
                  }
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
                <span className="admin-form-hint">
                  Use the identifier from the appropriate Academy record. Never
                  enter a player's name or a free-text email instead.
                </span>
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
              <Button type="submit" variant="primary">
                Send notification to selected audience
              </Button>
            </div>
          </div>
          <small style={{ display: "block", marginTop: 13, color: "#64748b" }}>
            Sends are persistent and require a verified staff account with MFA.
            Use test recipients only in isolated non-production environments.
          </small>
        </form>
        <section style={{ marginTop: 24 }}>
          <h2>Recent sends</h2>
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
