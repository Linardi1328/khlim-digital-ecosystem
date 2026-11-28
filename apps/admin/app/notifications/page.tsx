"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { FormSection } from "../../components/ui/FormSection";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAdminAuth } from "../../lib/auth-context";
import { adminApiClient } from "../../lib/admin-api";
import type { StaffRole } from "../../lib/types";

const NOTIFICATION_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
];

type SentNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  programmeOfferingId: string | null;
  createdAt: string;
  _count?: { receipts: number };
};

const DEMO_NOTIFICATIONS: SentNotification[] = [
  {
    id: "demo-notif-1",
    type: "SCHEDULE_CHANGE",
    title: "Saturday Court Allocation Reminder (Demo)",
    body: "U12 Saturday Development Squad will warm up on Court 2 starting at 10:45 MYT. Please arrive 15 minutes early.",
    programmeOfferingId: "off-u12-serdang-sat",
    createdAt: "2026-10-20T02:30:00.000Z",
    _count: { receipts: 24 },
  },
  {
    id: "demo-notif-2",
    type: "ANNOUNCEMENT",
    title: "Term 3 Training Checklist (Demo)",
    body: "Remember to bring indoor basketball shoes, water bottle, and training jersey for all weekly academy sessions.",
    programmeOfferingId: null,
    createdAt: "2026-10-12T04:00:00.000Z",
    _count: { receipts: 68 },
  },
];

export default function NotificationsAdminPage() {
  const { hasRole, isAuthenticated, isDemoMode, mfaSatisfied } = useAdminAuth();
  const canManage = hasRole(NOTIFICATION_ROLES);

  const [items, setItems] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [type, setType] = useState("ANNOUNCEMENT");
  const [audience, setAudience] = useState("ALL_GUARDIANS");
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!canManage) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!isDemoMode && (!isAuthenticated || !mfaSatisfied)) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      if (isDemoMode) {
        setItems(DEMO_NOTIFICATIONS.map((item) => ({ ...item })));
      } else {
        const result = await adminApiClient.get<SentNotification[]>(
          "/admin/notifications",
          { cache: "no-store" },
        );
        setItems(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Notification history could not be loaded from the backend.",
      );
    } finally {
      setLoading(false);
    }
  }, [canManage, isAuthenticated, isDemoMode, mfaSatisfied]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    setStatusMessage(null);
    setSendError(null);

    if (!title.trim() || !body.trim()) {
      setSendError("Notification title and message body are required.");
      return;
    }
    if (audience !== "ALL_GUARDIANS" && !target.trim()) {
      setSendError("Specify a target UUID for the selected audience.");
      return;
    }

    setSending(true);
    try {
      if (isDemoMode) {
        const preview: SentNotification = {
          id: `demo-notif-${Date.now()}`,
          type,
          title: title.trim(),
          body: body.trim(),
          programmeOfferingId: audience === "OFFERING" ? target.trim() : null,
          createdAt: new Date().toISOString(),
          _count: { receipts: audience === "USER" ? 1 : 24 },
        };
        setItems((prev) => [preview, ...prev]);
        setTitle("");
        setBody("");
        setTarget("");
        setStatusMessage(
          "Demo notification preview added locally. No real messages were sent or persisted.",
        );
        return;
      }

      const payload: Record<string, unknown> = {
        type,
        audience,
        title: title.trim(),
        body: body.trim(),
      };
      if (audience === "OFFERING") payload.programmeOfferingId = target.trim();
      if (audience === "USER") payload.userId = target.trim();

      const created = await adminApiClient.post<SentNotification>(
        "/admin/notifications",
        payload,
      );
      setTitle("");
      setBody("");
      setTarget("");
      setStatusMessage(
        `Notification dispatched to ${created._count?.receipts ?? 0} recipient(s).`,
      );
      await loadNotifications();
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "Could not send notification. Staff MFA and a valid recipient audience are required.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!canManage) {
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
          <EmptyState
            icon="🔒"
            title="Restricted Communications"
            description="Family notification dispatch is restricted to Academy Admin, Management, and Super Admin roles with verified MFA."
          />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div style={{ minWidth: 0 }}>
        <PageHeader
          title="Notifications"
          subtitle="Send announcements and operational notices to guardians or targeted programme families."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Notifications" },
          ]}
        />

        {statusMessage && (
          <div
            role="status"
            style={{
              padding: "12px 16px",
              marginBottom: 16,
              borderRadius: 8,
              backgroundColor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            {statusMessage}
          </div>
        )}

        {sendError && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              marginBottom: 16,
              borderRadius: 8,
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            {sendError}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          <form onSubmit={handleSend}>
            <FormSection
              title="Compose Family Notice"
              description="Dispatched notices are persistent, audited, and MFA-protected."
              actions={
                <Button type="submit" variant="primary" isLoading={sending}>
                  Send notification
                </Button>
              }
            >
              <div className="admin-detail-grid">
                <Select
                  label="Notice Category"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  options={[
                    { label: "Announcement", value: "ANNOUNCEMENT" },
                    { label: "Schedule Change", value: "SCHEDULE_CHANGE" },
                    { label: "Billing Notice", value: "BILLING" },
                    { label: "Editorial Update", value: "EDITORIAL" },
                    { label: "System Notice", value: "SYSTEM" },
                  ]}
                />
                <Select
                  label="Recipient Audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  options={[
                    { label: "All guardians", value: "ALL_GUARDIANS" },
                    { label: "Programme offering", value: "OFFERING" },
                    { label: "Direct user", value: "USER" },
                  ]}
                />
              </div>

              {audience !== "ALL_GUARDIANS" && (
                <Input
                  label={
                    audience === "OFFERING"
                      ? "Programme Offering UUID"
                      : "Recipient User UUID"
                  }
                  required
                  placeholder={
                    audience === "OFFERING"
                      ? "Enter programme offering UUID"
                      : "Enter target user UUID"
                  }
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              )}

              <Input
                label="Notification Title"
                required
                placeholder="e.g. Saturday Court Update"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="notification-body"
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Message Body <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <textarea
                  id="notification-body"
                  required
                  rows={5}
                  placeholder="Write a clear, concise message for KHLIM families..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: "0.875rem",
                    color: "#0F172A",
                    lineHeight: 1.5,
                    resize: "vertical",
                  }}
                />
              </div>
            </FormSection>
          </form>

          <section
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  color: "#0F172A",
                }}
              >
                Recent Sends
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadNotifications()}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            {loading ? (
              <LoadingState
                message="Loading notification history..."
                height="180px"
              />
            ) : loadError ? (
              <ErrorState
                title="Unable to Load History"
                message={loadError}
                onRetry={() => void loadNotifications()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title="No notifications sent yet"
                description="Sent announcements and operational notices will appear here with recipient counts."
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((item) => (
                  <article
                    key={item.id}
                    style={{
                      padding: 14,
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ color: "#0F172A", fontSize: "0.9rem" }}>
                        {item.title}
                      </strong>
                      <StatusBadge status={item.type} size="sm" />
                    </div>
                    <p
                      style={{
                        margin: "8px 0",
                        fontSize: "0.84rem",
                        color: "#334155",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.body}
                    </p>
                    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      {item._count?.receipts ?? 0} recipient(s) ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
