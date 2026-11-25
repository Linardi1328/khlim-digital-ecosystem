"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { getAdminAccessToken } from "../../lib/admin-api";
import { useAdminAuth } from "../../lib/auth-context";
import {
  getSessionRoster,
  recordSessionAttendance,
  type SessionRoster,
  type AttendanceMark,
} from "../../lib/admin-academy-roster-api";

const API = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1"
).replace(/\/+$/, "");
type Session = {
  id: string;
  programmeOfferingId: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  courtName: string | null;
  coachName: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  cancellationReason: string | null;
  _count?: { attendances: number };
};
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAdminAccessToken() || ""}`,
});
const emptyForm = {
  programmeOfferingId: "",
  title: "",
  startsAt: "",
  endsAt: "",
  venueName: "",
  courtName: "",
  coachName: "",
  notes: "",
};

export default function SchedulingPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Session | null>(null);
  const { isAuthenticated, mfaSatisfied, isDemoMode } = useAdminAuth();
  const [roster, setRoster] = useState<SessionRoster | null>(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [savingAthlete, setSavingAthlete] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`${API}/admin/scheduling/sessions`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Scheduling API ${response.status}`);
    setSessions(await response.json());
  }, []);
  const loadRoster = useCallback(async (session: Session) => {
    setRosterBusy(true);
    try {
      const result = await getSessionRoster(session.id);
      setRoster(result);
    } catch (error) {
      setRoster(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the session roster.",
      );
    } finally {
      setRosterBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !mfaSatisfied || isDemoMode) {
      setSessions([]);
      return;
    }
    void load().catch(() =>
      setMessage("Connect a staff session with MFA to manage scheduling."),
    );
  }, [isAuthenticated, mfaSatisfied, isDemoMode, load]);

  async function createSession(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`${API}/admin/scheduling/sessions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        ...form,
        programmeOfferingId: form.programmeOfferingId || null,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      }),
    });
    if (!response.ok) {
      setMessage(
        `Could not create session (${response.status}). Staff MFA is required.`,
      );
      return;
    }
    setForm(emptyForm);
    setMessage("Session created and persisted.");
    await load();
  }

  async function cancelSession(session: Session) {
    const reason = window.prompt("Cancellation reason");
    if (!reason) return;
    const response = await fetch(
      `${API}/admin/scheduling/sessions/${session.id}/cancel`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason }),
      },
    );
    if (!response.ok) {
      setMessage(`Could not cancel session (${response.status}).`);
      return;
    }
    await load();
  }

  async function completeSession(session: Session) {
    const response = await fetch(
      `${API}/admin/scheduling/sessions/${session.id}/complete`,
      { method: "POST", headers: authHeaders() },
    );
    if (response.ok) await load();
  }

  async function changeAttendance(athleteId: string, status: AttendanceMark) {
    if (!selected || savingAthlete) return;
    setSavingAthlete(athleteId);
    setMessage("");
    try {
      await recordSessionAttendance(selected.id, athleteId, status);
      await loadRoster(selected);
      await load();
      setMessage("Attendance saved to the Academy database.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Attendance was not saved. Refresh and retry.",
      );
    } finally {
      setSavingAthlete(null);
    }
  }

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Scheduling & Attendance"
          subtitle="Create real training events, manage cancellations, and record attendance."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Scheduling" },
          ]}
        />
        {message && (
          <p
            role="status"
            style={{ padding: 12, background: "#FEF3C7", borderRadius: 8 }}
          >
            {message}
          </p>
        )}
        <form
          onSubmit={createSession}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 10,
            padding: 16,
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
          }}
        >
          <input
            required
            placeholder="Event / session title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            type="datetime-local"
            required
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
          <input
            type="datetime-local"
            required
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
          <input
            required
            placeholder="Venue"
            value={form.venueName}
            onChange={(e) => setForm({ ...form, venueName: e.target.value })}
          />
          <input
            placeholder="Court"
            value={form.courtName}
            onChange={(e) => setForm({ ...form, courtName: e.target.value })}
          />
          <input
            placeholder="Coach"
            value={form.coachName}
            onChange={(e) => setForm({ ...form, coachName: e.target.value })}
          />
          <input
            placeholder="Programme offering UUID (optional)"
            value={form.programmeOfferingId}
            onChange={(e) =>
              setForm({ ...form, programmeOfferingId: e.target.value })
            }
          />
          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Button type="submit" variant="primary">
            Create session
          </Button>
        </form>

        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {sessions.length === 0 ? (
            <p>
              No training sessions found. Create a session only after confirming
              its offering, coach, court and time.
            </p>
          ) : (
            sessions.map((session) => (
              <article
                key={session.id}
                style={{
                  padding: 16,
                  background: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>{session.title}</strong>
                    <div>
                      {new Date(session.startsAt).toLocaleString()} —{" "}
                      {new Date(session.endsAt).toLocaleTimeString()}
                    </div>
                    <small>
                      {session.venueName}
                      {session.courtName ? ` · ${session.courtName}` : ""}
                      {session.coachName ? ` · Coach ${session.coachName}` : ""}
                    </small>
                  </div>
                  <strong>{session.status}</strong>
                </div>
                {session.cancellationReason && (
                  <p>Cancelled: {session.cancellationReason}</p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(session);
                      setRoster(null);
                      void loadRoster(session);
                    }}
                  >
                    Attendance ({session._count?.attendances ?? 0})
                  </Button>
                  {session.status === "SCHEDULED" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void completeSession(session)}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void cancelSession(session)}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {selected && (
          <section
            style={{
              marginTop: 24,
              padding: 18,
              background: "#18181B",
              color: "white",
              borderRadius: 12,
            }}
          >
            <h2>Attendance · {selected.title}</h2>
            <p style={{ color: "#d4d4d8", fontSize: 14 }}>
              Only ACTIVE members of this session's offering are eligible.
              Unmarked players are not automatically counted absent.
            </p>
            {rosterBusy && <p role="status">Loading enrolled players…</p>}
            {!rosterBusy && roster && roster.players.length === 0 && (
              <p role="status">
                No eligible players. Check the session's offering and active
                memberships; staff cannot add arbitrary attendee names.
              </p>
            )}
            {!rosterBusy && roster && roster.players.length > 0 && (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {roster.players.map((player) => (
                  <div
                    key={player.athleteId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid #3f3f46",
                    }}
                  >
                    <strong>{player.athleteName}</strong>
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ fontSize: 12 }}>Attendance</span>
                      <select
                        aria-label={`Attendance for ${player.athleteName}`}
                        value={player.attendanceStatus}
                        disabled={
                          Boolean(savingAthlete) ||
                          selected.status === "CANCELLED"
                        }
                        onChange={(e) =>
                          void changeAttendance(
                            player.athleteId,
                            e.target.value as AttendanceMark,
                          )
                        }
                      >
                        <option value="UNMARKED" disabled>
                          Not marked
                        </option>
                        <option value="PRESENT">Present</option>
                        <option value="LATE">Late</option>
                        <option value="ABSENT">Absent</option>
                        <option value="EXCUSED">Excused</option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            )}
            <p style={{ color: "#d4d4d8", fontSize: 12 }}>
              Make-up bookings are not yet enabled. Record an excused absence
              and ask Academy Management to review a replacement session.
            </p>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
