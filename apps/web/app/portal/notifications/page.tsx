"use client";

import React from "react";
import { useI18n } from "../../../lib/i18n-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Card } from "../../../components/ui/card";

export default function NotificationsPage() {
  const { t } = useI18n();

  return (
    <PortalShell>
      <div>
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "#0F172A",
              margin: "0 0 6px",
            }}
          >
            {t("portal.notifications.title")}
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
            Official announcements, schedule change notifications, and billing
            notices.
          </p>
        </div>

        <Card
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "#64748B",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔔</div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              margin: "0 0 8px",
              color: "#18181B",
            }}
          >
            No New Notifications
          </h3>
          <p
            style={{
              maxWidth: "400px",
              margin: "0 auto",
              fontSize: "0.875rem",
            }}
          >
            You are all caught up! System notifications from academy coaches and
            automated billing notices will appear here.
          </p>
        </Card>
      </div>
    </PortalShell>
  );
}
