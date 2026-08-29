"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import { apiService } from "../../../lib/api-service";
import { notificationTypeLabel } from "../../../lib/display-labels";
import { useI18n } from "../../../lib/i18n-context";
import type { PortalNotificationItem } from "../../../lib/types";

export default function NotificationsPage() {
  const { t, formatDate, formatTime } = useI18n();
  const [items, setItems] = useState<PortalNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      setItems(await apiService.listMyNotifications());
    } catch {
      setError(t("portal.notifications.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);
  async function markRead(item: PortalNotificationItem) {
    if (item.readAt) return;
    await apiService.markNotificationRead(item.id);
    await load();
  }
  const unread = items.filter((item) => !item.readAt).length;

  return (
    <PortalShell>
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1>{t("portal.notifications.title")}</h1>
          <p style={{ color: "#64748B" }}>
            {t("portal.notifications.description")}{" "}
            {unread > 0
              ? t("portal.notifications.unread", { count: unread })
              : t("portal.notifications.caughtUp")}
          </p>
        </div>
        {loading ? (
          <p>{t("portal.notifications.loading")}</p>
        ) : error ? (
          <Card style={{ padding: 24 }}>{error}</Card>
        ) : items.length === 0 ? (
          <Card style={{ padding: 40, textAlign: "center" }}>
            {t("portal.notifications.emptyAlt")}
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <Card
                key={item.id}
                style={{
                  borderLeft: item.readAt ? undefined : "4px solid #F59E0B",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <Badge variant={item.readAt ? "neutral" : "brand"}>
                      {notificationTypeLabel(item.type, t)}
                    </Badge>
                    <h2 style={{ marginBottom: 6 }}>{item.title}</h2>
                  </div>
                  <small>
                    {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
                  </small>
                </div>
                <p>{item.body}</p>
                {!item.readAt && (
                  <button
                    type="button"
                    onClick={() => void markRead(item)}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#B45309",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t("portal.notifications.markRead")}
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
