"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { getAdminAccessToken } from "../../lib/admin-api";

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
  const [items, setItems] = useState<SentNotification[]>([]);
  const [type, setType] = useState("ANNOUNCEMENT");
  const [audience, setAudience] = useState("ALL_GUARDIANS");
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`${API}/admin/notifications`, {
      headers: headers(),
      cache: "no-store",
    });
    if (response.ok) setItems(await response.json());
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload: Record<string, unknown> = { type, audience, title, body };
    if (audience === "OFFERING") payload.programmeOfferingId = target;
    if (audience === "USER") payload.userId = target;
    const response = await fetch(`${API}/admin/notifications`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setMessage(
        `Could not send notification (${response.status}). Staff MFA and a real recipient audience are required.`,
      );
      return;
    }
    const created = await response.json();
    setTitle("");
    setBody("");
    setTarget("");
    setMessage(
      `Notification sent to ${created._count?.receipts ?? 0} recipient(s).`,
    );
    await load();
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
          style={{
            display: "grid",
            gap: 10,
            maxWidth: 760,
            padding: 18,
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option>ANNOUNCEMENT</option>
              <option>SCHEDULE_CHANGE</option>
              <option>BILLING</option>
              <option>EDITORIAL</option>
              <option>SYSTEM</option>
            </select>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <option value="ALL_GUARDIANS">All guardians</option>
              <option value="OFFERING">Programme offering</option>
              <option value="USER">Direct user</option>
            </select>
          </div>
          {audience !== "ALL_GUARDIANS" && (
            <input
              required
              placeholder={
                audience === "OFFERING"
                  ? "Programme offering UUID"
                  : "User UUID"
              }
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          )}
          <input
            required
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            required
            rows={5}
            placeholder="Message to families"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button type="submit" variant="primary">
            Send notification
          </Button>
          <small>
            Sending is persistent and MFA-protected. Use fake copy only in
            non-production environments.
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
