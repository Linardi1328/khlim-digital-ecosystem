"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import { apiService } from "../../../lib/api-service";
import type { PortalNotificationItem } from "../../../lib/types";

export default function NotificationsPage() {
  const [items, setItems] = useState<PortalNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setItems(await apiService.listMyNotifications());
    } catch {
      setError("Could not load notifications right now.");
    } finally {
      setLoading(false);
    }
  }, []);
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
          <h1>Notifications</h1>
          <p style={{ color: "#64748B" }}>
            Official announcements, schedule changes, billing notices and other
            KHLIM updates.{" "}
            {unread > 0 ? `${unread} unread.` : "You are all caught up."}
          </p>
        </div>
        {loading ? (
          <p>Loading notifications…</p>
        ) : error ? (
          <Card style={{ padding: 24 }}>{error}</Card>
        ) : items.length === 0 ? (
          <Card style={{ padding: 40, textAlign: "center" }}>
            No notifications yet.
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
                      {item.type.replaceAll("_", " ")}
                    </Badge>
                    <h2 style={{ marginBottom: 6 }}>{item.title}</h2>
                  </div>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
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
                    Mark as read
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
