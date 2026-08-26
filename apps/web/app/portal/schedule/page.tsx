"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "../../../lib/i18n-context";
import { useFamily } from "../../../lib/family-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { apiService } from "../../../lib/api-service";
import type { AthleteMembershipItem } from "../../../lib/types";

export default function SchedulePage() {
  const { t } = useI18n();
  const { activeChild } = useFamily();
  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activeChild?.id) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiService
      .listAthleteMemberships(activeChild.id)
      .then(setMemberships)
      .catch((err) => console.warn("Failed to load schedule:", err))
      .finally(() => setLoading(false));
  }, [activeChild]);

  return (
    <PortalShell>
      <div>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
            {t("portal.schedule.title")}
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
            Training schedule for <strong>{activeChild?.displayName || "Selected Athlete"}</strong>.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", color: "#64748B" }}>Loading training schedule...</div>
        ) : memberships.length === 0 ? (
          <Card style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📅</div>
            <h3>No Scheduled Training Sessions</h3>
            <p style={{ maxWidth: "400px", margin: "0 auto" }}>
              Active training schedules will appear here once your child is enrolled in an open academy offering.
            </p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {memberships.map((m) => {
              const off = m.programmeOffering;
              return (
                <Card key={m.id} style={{ padding: "24px", borderRadius: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "#0F172A" }}>
                          {off?.name || "Academy Offering"}
                        </h3>
                        <Badge variant={m.status === "ACTIVE" ? "success" : "warning"} size="sm">
                          {m.status}
                        </Badge>
                      </div>

                      <div style={{ fontSize: "0.875rem", color: "#334155", marginTop: "6px" }}>
                        🗓️ Term Start: <strong>{off?.startsOn || "Scheduled"}</strong>
                      </div>

                      <div style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "2px" }}>
                        📍 Venue: {off?.venue?.name || "KHLIM Training Facility"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>Status</div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0F172A" }}>
                        {m.status === "ACTIVE" ? "Confirmed" : "Pending Activation"}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
