"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "../../../../lib/i18n-context";
import { useFamily } from "../../../../lib/family-context";
import { PortalShell } from "../../../../components/portal/portal-shell";
import { Button } from "../../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { apiService } from "../../../../lib/api-service";
import type { Membership, TrainingSession } from "../../../../lib/types";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = use(params);
  const { t, formatDate } = useI18n();
  const { athletes } = useFamily();

  const athlete = athletes.find((a) => a.id === athleteId) ?? athletes[0]!;

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  useEffect(() => {
    if (athlete?.id) {
      apiService.getMemberships(athlete.id).then(setMemberships);
      apiService.getTrainingSessions(athlete.id).then(setSessions);
    }
  }, [athlete]);

  return (
    <PortalShell>
      <div>
        <div style={{ marginBottom: "20px" }}>
          <Link href="/portal/players" style={{ color: "#64748B", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
            ← Back to Players Directory
          </Link>
        </div>

        {/* Child Header Card */}
        <Card style={{ marginBottom: "32px", padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  backgroundColor: "#FEF3C7",
                  color: "#92400E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "1.75rem",
                }}
              >
                {athlete?.displayName?.[0] ?? "P"}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "#0F172A" }}>
                    {athlete?.displayName}
                  </h1>
                  <Badge variant="success" size="md">
                    {athlete?.linkStatus ?? "ACTIVE"}
                  </Badge>
                </div>
                <div style={{ fontSize: "0.875rem", color: "#64748B", marginTop: "4px" }}>
                  Date of Birth: <strong>{athlete?.dateOfBirth}</strong> • {athlete?.gender ?? "Youth"}
                </div>
              </div>
            </div>

            <Link href={`/enrol?athleteId=${athlete?.id}`} style={{ textDecoration: "none" }}>
              <Button variant="primary" size="md">
                + Enrol in New Programme
              </Button>
            </Link>
          </div>
        </Card>

        {/* Content Tabs / Grids */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Active Memberships */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.125rem" }}>Active Memberships</CardTitle>
            </CardHeader>
            <CardContent>
              {memberships.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {memberships.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0F172A" }}>
                          {m.programmeName}
                        </div>
                        <Badge variant="success" size="sm">{m.status}</Badge>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "4px" }}>
                        Package: {m.planName}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "2px" }}>
                        Venue: {m.venueName} • Valid till {m.endsAt}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.875rem", color: "#64748B" }}>
                  No active memberships found for this player.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Schedule for this child */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.125rem" }}>Upcoming Training Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0F172A" }}>
                          {formatDate(s.sessionDate)} • {s.startTime}
                        </div>
                        <Badge variant="brand" size="sm">{s.status}</Badge>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "4px" }}>
                        📍 {s.venueName} ({s.court})
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "2px" }}>
                        Coach: {s.coachName}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.875rem", color: "#64748B" }}>
                  No upcoming sessions currently scheduled.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
