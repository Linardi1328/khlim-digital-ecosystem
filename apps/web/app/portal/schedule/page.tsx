"use client";

import React, { useEffect, useState } from "react";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import { apiService } from "../../../lib/api-service";
import type { ScheduleSessionItem } from "../../../lib/types";

export default function SchedulePage() {
  const [sessions, setSessions] = useState<ScheduleSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiService
      .listMySchedule()
      .then(setSessions)
      .catch(() => setError("Could not load the family schedule right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell>
      <div>
        <h1>Training schedule</h1>
        <p style={{ color: "#64748b" }}>
          Upcoming and recent sessions tied to your family memberships. Session,
          court and coach details come from KHLIM operations rather than being
          inferred from the programme term.
        </p>
        {loading ? (
          <p>Loading sessions…</p>
        ) : error ? (
          <Card style={{ padding: 24 }}>{error}</Card>
        ) : sessions.length === 0 ? (
          <Card style={{ padding: 24 }}>
            No individual sessions have been scheduled for your active
            memberships yet.
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {sessions.map((session) => (
              <Card key={session.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ marginBottom: 4 }}>{session.title}</h2>
                    <strong>
                      {new Date(session.startsAt).toLocaleString()}
                    </strong>
                    <p>
                      {session.venueName}
                      {session.courtName ? ` · ${session.courtName}` : ""}
                      {session.coachName ? ` · Coach ${session.coachName}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      session.status === "CANCELLED"
                        ? "warning"
                        : session.status === "COMPLETED"
                          ? "neutral"
                          : "success"
                    }
                  >
                    {session.status}
                  </Badge>
                </div>
                {session.cancellationReason && (
                  <p>
                    <strong>Cancellation:</strong> {session.cancellationReason}
                  </p>
                )}
                {session.notes && <p>{session.notes}</p>}
                {session.attendances.length > 0 && (
                  <small>
                    Attendance:{" "}
                    {session.attendances
                      .map((item) => `${item.athleteName} — ${item.status}`)
                      .join(", ")}
                  </small>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
