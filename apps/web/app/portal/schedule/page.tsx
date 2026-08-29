"use client";

import React, { useEffect, useState } from "react";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import { apiService } from "../../../lib/api-service";
import {
  attendanceStatusLabel,
  sessionStatusLabel,
} from "../../../lib/display-labels";
import { useI18n } from "../../../lib/i18n-context";
import type { ScheduleSessionItem } from "../../../lib/types";

export default function SchedulePage() {
  const { t, formatDate, formatTime } = useI18n();
  const [sessions, setSessions] = useState<ScheduleSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiService
      .listMySchedule()
      .then(setSessions)
      .catch(() => setError(t("portal.schedule.error")))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <PortalShell>
      <div>
        <h1>{t("portal.schedule.titleAlt")}</h1>
        <p style={{ color: "#64748b" }}>
          {t("portal.schedule.description")}
        </p>
        {loading ? (
          <p>{t("portal.schedule.loading")}</p>
        ) : error ? (
          <Card style={{ padding: 24 }}>{error}</Card>
        ) : sessions.length === 0 ? (
          <Card style={{ padding: 24 }}>{t("portal.schedule.empty")}</Card>
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
                      {formatDate(session.startsAt)} · {formatTime(session.startsAt)}
                    </strong>
                    <p>
                      {session.venueName}
                      {session.courtName ? ` · ${session.courtName}` : ""}
                      {session.coachName
                        ? ` · ${t("portal.schedule.coach", { name: session.coachName })}`
                        : ""}
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
                    {sessionStatusLabel(session.status, t)}
                  </Badge>
                </div>
                {session.cancellationReason && (
                  <p>
                    <strong>{t("portal.schedule.cancellation")}:</strong>{" "}
                    {session.cancellationReason}
                  </p>
                )}
                {session.notes && <p>{session.notes}</p>}
                {session.attendances.length > 0 && (
                  <small>
                    {t("portal.schedule.attendance")}: {" "}
                    {session.attendances
                      .map(
                        (item) =>
                          `${item.athleteName} — ${attendanceStatusLabel(item.status, t)}`,
                      )
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
