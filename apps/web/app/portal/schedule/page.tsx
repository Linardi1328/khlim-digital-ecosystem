"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "../../../lib/i18n-context";
import { useFamily } from "../../../lib/family-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Tabs } from "../../../components/ui/tabs";
import { apiService } from "../../../lib/api-service";
import type { TrainingSession } from "../../../lib/types";

export default function SchedulePage() {
  const { t, formatDate } = useI18n();
  const { activeChild } = useFamily();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [viewMode, setViewMode] = useState<string>("list");

  useEffect(() => {
    apiService.getTrainingSessions(activeChild?.id).then(setSessions);
  }, [activeChild]);

  return (
    <PortalShell>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
              {t("portal.schedule.title")}
            </h1>
            <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
              {t("portal.schedule.subtitle")}
            </p>
          </div>

          <div style={{ width: "240px" }}>
            <Tabs
              activeTab={viewMode}
              onChange={setViewMode}
              tabs={[
                { id: "list", label: "List View" },
                { id: "calendar", label: "Calendar View" },
              ]}
            />
          </div>
        </div>

        {/* Sessions List View */}
        {viewMode === "list" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {sessions.map((session) => (
              <Card key={session.id} style={{ padding: "24px", borderRadius: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div
                      style={{
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        borderRadius: "10px",
                        padding: "12px 16px",
                        textAlign: "center",
                        minWidth: "70px",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                        {formatDate(session.sessionDate, { month: "short" })}
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>
                        {formatDate(session.sessionDate, { day: "numeric" })}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "#0F172A" }}>
                          {session.programmeName}
                        </h3>
                        <Badge variant="brand" size="sm">
                          {session.status}
                        </Badge>
                      </div>

                      <div style={{ fontSize: "0.875rem", color: "#334155", marginTop: "4px", fontWeight: 600 }}>
                        ⏰ {session.startTime} - {session.endTime}
                      </div>

                      <div style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "2px" }}>
                        📍 {session.venueName} • <strong>{session.court}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>Assigned Coach</div>
                    <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0F172A" }}>
                      {session.coachName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#10B981", marginTop: "4px" }}>
                      ● Coach Confirmed Attendance
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Calendar Grid View */
          <Card style={{ padding: "28px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 16px" }}>
              August – September 2026 Term Calendar
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "8px",
                textAlign: "center",
              }}
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#64748B", padding: "8px 0" }}>
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }).map((_, idx) => {
                const dayNum = idx + 1;
                const isTrainingDay = dayNum === 29 || dayNum === 5 || dayNum === 12;
                return (
                  <div
                    key={idx}
                    style={{
                      height: "80px",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      backgroundColor: isTrainingDay ? "#FFFDF5" : "#FFFFFF",
                      textAlign: "left",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span style={{ fontWeight: isTrainingDay ? 800 : 500, color: isTrainingDay ? "#F59E0B" : "#64748B" }}>
                      {dayNum <= 31 ? dayNum : dayNum - 31}
                    </span>
                    {isTrainingDay && (
                      <div
                        style={{
                          marginTop: "6px",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                      >
                        🏀 Academy Training @ 10:30 AM
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
