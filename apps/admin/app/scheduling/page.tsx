"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { getAdminAccessToken } from "../../lib/admin-api";

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
type Attendance = {
  id: string;
  athleteId: string;
  athleteName: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE";
  notes: string | null;
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
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeStatus, setAttendeeStatus] =
    useState<Attendance["status"]>("PRESENT");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`${API}/admin/scheduling/sessions`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Scheduling API ${response.status}`);
    setSessions(await response.json());
  }, []);
  const loadAttendance = useCallback(async (session: Session) => {
    const response = await fetch(
      `${API}/admin/scheduling/sessions/${session.id}/attendance`,
      { headers: authHeaders(), cache: "no-store" },
    );
    if (response.ok) setAttendance(await response.json());
  }, []);

  useEffect(() => {
    void load().catch(() =>
      setMessage("Connect a staff session to manage scheduling."),
    );
  }, [load]);

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

  async function addAttendance(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !attendeeName.trim()) return;
    const response = await fetch(
      `${API}/admin/scheduling/sessions/${selected.id}/attendance`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          athleteName: attendeeName,
          status: attendeeStatus,
        }),
      },
    );
    if (!response.ok) {
      setMessage(`Could not mark attendance (${response.status}).`);
      return;
    }
    setAttendeeName("");
    await loadAttendance(selected);
    await load();
  }

  async function changeAttendance(
    record: Attendance,
    status: Attendance["status"],
  ) {
    if (!selected) return;
    const response = await fetch(
      `${API}/admin/scheduling/sessions/${selected.id}/attendance`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          athleteId: record.athleteId,
          athleteName: record.athleteName,
          status,
          notes: record.notes,
        }),
      },
    );
    if (response.ok) await loadAttendance(selected);
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
              No sessions yet. Create a fake event above to test the workflow.
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
                      void loadAttendance(session);
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
            <form
              onSubmit={addAttendance}
              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
            >
              <input
                aria-label="Attendee name"
                placeholder="Fake or real attendee name"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
              />
              <select
                value={attendeeStatus}
                onChange={(e) =>
                  setAttendeeStatus(e.target.value as Attendance["status"])
                }
              >
                <option>PRESENT</option>
                <option>LATE</option>
                <option>ABSENT</option>
                <option>EXCUSED</option>
              </select>
              <Button type="submit" variant="primary">
                Add attendance
              </Button>
            </form>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {attendance.map((record) => (
                <div
                  key={record.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>{record.athleteName}</span>
                  <select
                    value={record.status}
                    onChange={(e) =>
                      void changeAttendance(
                        record,
                        e.target.value as Attendance["status"],
                      )
                    }
                  >
                    <option>PRESENT</option>
                    <option>LATE</option>
                    <option>ABSENT</option>
                    <option>EXCUSED</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
