"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { adminApi, getAdminAccessToken } from "../../lib/admin-api";
import type { OfferingItem } from "../../lib/types";
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
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Session | null>(null);
  const { isAuthenticated, mfaSatisfied, isDemoMode, user } = useAdminAuth();
  const [roster, setRoster] = useState<SessionRoster | null>(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [savingAthlete, setSavingAthlete] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const creatingRef = useRef(false);
  const rosterRequestId = useRef(0);
  const staffContextRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = staffContextRequestId.current;
    const response = await fetch(`${API}/admin/scheduling/sessions`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Scheduling API ${response.status}`);
    const result = (await response.json()) as Session[];
    if (requestId === staffContextRequestId.current) setSessions(result);
  }, []);
  const loadRoster = useCallback(async (session: Session) => {
    const requestId = ++rosterRequestId.current;
    setRosterBusy(true);
    try {
      const result = await getSessionRoster(session.id);
      if (rosterRequestId.current === requestId) setRoster(result);
    } catch (error) {
      if (rosterRequestId.current !== requestId) return;
      setRoster(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the session roster.",
      );
    } finally {
      if (rosterRequestId.current === requestId) setRosterBusy(false);
    }
  }, []);

  useEffect(() => {
    const requestId = ++staffContextRequestId.current;
    if (!isAuthenticated || !mfaSatisfied || isDemoMode) {
      ++rosterRequestId.current;
      setSelected(null);
      setRoster(null);
      setRosterBusy(false);
      setSessions([]);
      setOfferings([]);
      return;
    }
    void Promise.all([
      load(),
      adminApi.listOfferings().then((rows) => {
        if (requestId === staffContextRequestId.current) {
          setOfferings(rows);
        }
      }),
    ]).catch(() => {
      if (requestId === staffContextRequestId.current) {
        setMessage(
          "Could not load training sessions or eligible offerings. Check staff access.",
        );
      }
    });
    return () => {
      ++staffContextRequestId.current;
    };
  }, [isAuthenticated, mfaSatisfied, isDemoMode, user?.id, load]);

  async function createSession(event: React.FormEvent) {
    event.preventDefault();
    if (creatingRef.current) return;
    if (!isAuthenticated || !mfaSatisfied || isDemoMode) {
      setMessage(
        "Staff authentication and MFA are required to create sessions.",
      );
      return;
    }
    creatingRef.current = true;
    setIsCreating(true);
    setMessage("");
    try {
      // datetime-local has no zone: interpret the values as Malaysian local time.
      const startsAt = new Date(`${form.startsAt}+08:00`);
      const endsAt = new Date(`${form.endsAt}+08:00`);
      if (
        !Number.isFinite(startsAt.getTime()) ||
        !Number.isFinite(endsAt.getTime()) ||
        endsAt <= startsAt
      ) {
        setMessage(
          "Enter a valid Malaysia-time range with the end after the start.",
        );
        return;
      }
      const response = await fetch(`${API}/admin/scheduling/sessions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          programmeOfferingId: form.programmeOfferingId || null,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      });
      if (!response.ok) {
        setMessage(`Could not create session (${response.status}).`);
        return;
      }
      setForm(emptyForm);
      setMessage("Session created and persisted.");
      await load();
    } catch {
      setMessage(
        "The session could not be confirmed. Check whether it was saved before retrying.",
      );
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
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
        <form onSubmit={createSession} className="admin-form-panel">
          <div className="admin-form-panel-header">
            <h2>Create training session</h2>
            <p>
              Choose the registered offering first. Dates and times use Malaysia
              local time (MYT). Only authorised staff can save sessions.
            </p>
          </div>
          <div className="admin-form-grid">
            <div className="admin-form-field admin-form-field-wide">
              <label htmlFor="training-offering">
                Programme offering <span aria-hidden="true">*</span>
              </label>
              <select
                id="training-offering"
                name="programmeOfferingId"
                required
                value={form.programmeOfferingId}
                onChange={(e) =>
                  setForm({ ...form, programmeOfferingId: e.target.value })
                }
              >
                <option value="">Choose an active programme offering</option>
                {offerings
                  .filter((offering) => offering.status === "OPEN")
                  .map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.name}
                    </option>
                  ))}
              </select>
              <span className="admin-form-hint">
                Selecting an offering links the session to enrolled players.
                Open an offering in Academy Setup if none are available.
              </span>
            </div>
            <div className="admin-form-field admin-form-field-wide">
              <label htmlFor="training-title">Training session name *</label>
              <input
                id="training-title"
                name="title"
                required
                placeholder="e.g. U12 Saturday skills training"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="admin-form-field">
              <label htmlFor="training-start">
                Start date and time (MYT) *
              </label>
              <input
                id="training-start"
                name="startsAt"
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div className="admin-form-field">
              <label htmlFor="training-end">End date and time (MYT) *</label>
              <input
                id="training-end"
                name="endsAt"
                type="datetime-local"
                required
                min={form.startsAt || undefined}
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
            <div className="admin-form-field">
              <label htmlFor="training-venue">
                Venue / training location *
              </label>
              <input
                id="training-venue"
                name="venueName"
                required
                placeholder="e.g. TIS Puchong"
                value={form.venueName}
                onChange={(e) =>
                  setForm({ ...form, venueName: e.target.value })
                }
              />
            </div>
            <div className="admin-form-field">
              <label htmlFor="training-court">Court (optional)</label>
              <input
                id="training-court"
                name="courtName"
                placeholder="e.g. Court 1"
                value={form.courtName}
                onChange={(e) =>
                  setForm({ ...form, courtName: e.target.value })
                }
              />
            </div>
            <div className="admin-form-field">
              <label htmlFor="training-coach">
                Coach display name (optional)
              </label>
              <input
                id="training-coach"
                name="coachName"
                placeholder="e.g. Coach Ahmad"
                value={form.coachName}
                onChange={(e) =>
                  setForm({ ...form, coachName: e.target.value })
                }
              />
              <span className="admin-form-hint">
                Display name only; this does not grant the coach attendance
                access. Verified coach assignments are a separate security
                requirement.
              </span>
            </div>
            <div className="admin-form-field">
              <label htmlFor="training-notes">Session notes (optional)</label>
              <textarea
                id="training-notes"
                name="notes"
                rows={3}
                placeholder="Equipment, drills, or general operational notes (no medical details)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="admin-form-actions admin-form-field-wide">
              <Button type="submit" variant="primary" isLoading={isCreating}>
                Create training session
              </Button>
            </div>
          </div>
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
                      {new Date(session.startsAt).toLocaleString("en-MY", {
                        timeZone: "Asia/Kuala_Lumpur",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      —{" "}
                      {new Date(session.endsAt).toLocaleTimeString("en-MY", {
                        timeZone: "Asia/Kuala_Lumpur",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                      ++rosterRequestId.current;
                      setSelected(session);
                      setRoster(null);
                      setRosterBusy(false);
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
            {!rosterBusy &&
              roster?.sessionId === selected.id &&
              roster.players.length === 0 && (
                <p role="status">
                  No eligible players. Check the session's offering and active
                  memberships; staff cannot add arbitrary attendee names.
                </p>
              )}
            {!rosterBusy &&
              roster?.sessionId === selected.id &&
              roster.players.length > 0 && (
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
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
