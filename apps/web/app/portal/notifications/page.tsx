"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "../../../lib/i18n-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { apiService } from "../../../lib/api-service";
import type { NotificationItem } from "../../../lib/types";

export default function NotificationsPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    apiService.getNotifications().then(setNotifications);
  }, []);

  const handleMarkRead = async (id: string) => {
    await apiService.markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const filtered =
    filter === "ALL"
      ? notifications
      : notifications.filter((n) => n.category === filter);

  return (
    <PortalShell>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
              {t("portal.notifications.title")}
            </h1>
            <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
              System notifications, billing updates, and schedule announcements.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant={filter === "ALL" ? "primary" : "outline"} size="sm" onClick={() => setFilter("ALL")}>
              All
            </Button>
            <Button variant={filter === "BILLING" ? "primary" : "outline"} size="sm" onClick={() => setFilter("BILLING")}>
              Billing
            </Button>
            <Button variant={filter === "SCHEDULE" ? "primary" : "outline"} size="sm" onClick={() => setFilter("SCHEDULE")}>
              Schedule
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((item) => (
            <Card key={item.id} style={{ padding: "20px", backgroundColor: item.isRead ? "#FFFFFF" : "#FFFDF5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "1.5rem" }}>
                    {item.category === "BILLING" ? "💳" : item.category === "SCHEDULE" ? "📅" : "📢"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#0F172A" }}>
                        {item.title}
                      </h3>
                      {!item.isRead && (
                        <Badge variant="warning" size="sm">New</Badge>
                      )}
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#475569", margin: "4px 0 0", lineHeight: 1.5 }}>
                      {item.message}
                    </p>
                    <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "6px" }}>
                      Received {item.createdAt}
                    </div>
                  </div>
                </div>

                {!item.isRead && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkRead(item.id)}>
                    Mark Read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
