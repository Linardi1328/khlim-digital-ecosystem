from pathlib import Path

schema = Path("prisma/schema.prisma")
text = schema.read_text()
if "enum TrainingSessionStatus" not in text:
    text += '''

enum TrainingSessionStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
  LATE
}

model TrainingSession {
  id                  String                @id @default(uuid()) @db.Uuid
  programmeOfferingId String?               @map("programme_offering_id") @db.Uuid
  title               String                @db.VarChar(180)
  startsAt            DateTime              @map("starts_at")
  endsAt              DateTime              @map("ends_at")
  venueName           String                @map("venue_name") @db.VarChar(180)
  courtName           String?               @map("court_name") @db.VarChar(120)
  coachName           String?               @map("coach_name") @db.VarChar(160)
  notes               String?               @db.Text
  status              TrainingSessionStatus @default(SCHEDULED)
  cancellationReason  String?               @map("cancellation_reason") @db.Text
  createdAt           DateTime              @default(now()) @map("created_at")
  updatedAt           DateTime              @updatedAt @map("updated_at")
  attendances         AttendanceRecord[]

  @@index([programmeOfferingId, startsAt, status])
  @@index([startsAt, status])
  @@map("training_sessions")
}

model AttendanceRecord {
  id          String           @id @default(uuid()) @db.Uuid
  sessionId   String           @map("session_id") @db.Uuid
  athleteId   String           @map("athlete_id") @db.Uuid
  athleteName String           @map("athlete_name") @db.VarChar(160)
  status      AttendanceStatus @default(PRESENT)
  notes       String?          @db.Text
  markedAt    DateTime         @default(now()) @map("marked_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")
  session     TrainingSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, athleteId])
  @@index([athleteId, markedAt])
  @@map("attendance_records")
}
'''
    schema.write_text(text)

migration = Path("prisma/migrations/20260828033000_scheduling_attendance")
migration.mkdir(exist_ok=True)
(migration / "migration.sql").write_text('''CREATE TYPE "TrainingSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

CREATE TABLE "training_sessions" (
  "id" UUID NOT NULL,
  "programme_offering_id" UUID,
  "title" VARCHAR(180) NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "venue_name" VARCHAR(180) NOT NULL,
  "court_name" VARCHAR(120),
  "coach_name" VARCHAR(160),
  "notes" TEXT,
  "status" "TrainingSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "cancellation_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_records" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "athlete_id" UUID NOT NULL,
  "athlete_name" VARCHAR(160) NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
  "notes" TEXT,
  "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "training_sessions_programme_offering_id_starts_at_status_idx" ON "training_sessions"("programme_offering_id", "starts_at", "status");
CREATE INDEX "training_sessions_starts_at_status_idx" ON "training_sessions"("starts_at", "status");
CREATE UNIQUE INDEX "attendance_records_session_id_athlete_id_key" ON "attendance_records"("session_id", "athlete_id");
CREATE INDEX "attendance_records_athlete_id_marked_at_idx" ON "attendance_records"("athlete_id", "marked_at");
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
''')

scheduling = Path("apps/api/src/scheduling")
scheduling.mkdir(exist_ok=True)
(scheduling / "scheduling.service.ts").write_text(r'''import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

type SessionInput = {
  programmeOfferingId?: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  courtName?: string | null;
  coachName?: string | null;
  notes?: string | null;
};

type AttendanceInput = {
  athleteId?: string;
  athleteName: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE";
  notes?: string | null;
};

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  listAdminSessions() {
    return this.prisma.client.trainingSession.findMany({
      include: { _count: { select: { attendances: true } } },
      orderBy: { startsAt: "asc" },
    });
  }

  async createSession(input: SessionInput) {
    const data = this.normalizeSession(input);
    return this.prisma.client.trainingSession.create({ data });
  }

  async updateSession(id: string, input: SessionInput) {
    await this.requireSession(id);
    const data = this.normalizeSession(input);
    return this.prisma.client.trainingSession.update({ where: { id }, data });
  }

  async cancelSession(id: string, reason: string) {
    await this.requireSession(id);
    if (!reason?.trim()) throw new BadRequestException("Cancellation reason is required");
    return this.prisma.client.trainingSession.update({
      where: { id },
      data: { status: "CANCELLED", cancellationReason: reason.trim() },
    });
  }

  async completeSession(id: string) {
    await this.requireSession(id);
    return this.prisma.client.trainingSession.update({
      where: { id },
      data: { status: "COMPLETED" },
    });
  }

  async listAttendance(id: string) {
    await this.requireSession(id);
    return this.prisma.client.attendanceRecord.findMany({
      where: { sessionId: id },
      orderBy: [{ athleteName: "asc" }],
    });
  }

  async markAttendance(id: string, input: AttendanceInput) {
    await this.requireSession(id);
    if (!input.athleteName?.trim()) throw new BadRequestException("Athlete name is required");
    const athleteId = input.athleteId?.trim() || randomUUID();
    return this.prisma.client.attendanceRecord.upsert({
      where: { sessionId_athleteId: { sessionId: id, athleteId } },
      create: {
        sessionId: id,
        athleteId,
        athleteName: input.athleteName.trim(),
        status: input.status,
        notes: input.notes?.trim() || null,
      },
      update: {
        athleteName: input.athleteName.trim(),
        status: input.status,
        notes: input.notes?.trim() || null,
        markedAt: new Date(),
      },
    });
  }

  async listMySchedule(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: {
        athleteProfile: { select: { id: true } },
        guardianAthleteLinks: {
          where: { status: "ACTIVE" },
          select: { athleteId: true },
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    const athleteIds = new Set(user.guardianAthleteLinks.map((link) => link.athleteId));
    if (user.athleteProfile?.id) athleteIds.add(user.athleteProfile.id);
    if (athleteIds.size === 0) return [];

    const memberships = await this.prisma.client.membership.findMany({
      where: {
        athleteId: { in: [...athleteIds] },
        status: { in: ["ACTIVE", "PENDING"] },
      },
      select: { athleteId: true, programmeOfferingId: true },
    });
    const offeringIds = [...new Set(memberships.map((item) => item.programmeOfferingId))];
    if (offeringIds.length === 0) return [];

    return this.prisma.client.trainingSession.findMany({
      where: {
        programmeOfferingId: { in: offeringIds },
        startsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: {
        attendances: {
          where: { athleteId: { in: [...athleteIds] } },
          select: { athleteId: true, athleteName: true, status: true },
        },
      },
      orderBy: { startsAt: "asc" },
    });
  }

  private normalizeSession(input: SessionInput) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (!input.title?.trim() || !input.venueName?.trim()) {
      throw new BadRequestException("Title and venue are required");
    }
    if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf()) || endsAt <= startsAt) {
      throw new BadRequestException("Session end time must be after its start time");
    }
    return {
      programmeOfferingId: input.programmeOfferingId?.trim() || null,
      title: input.title.trim(),
      startsAt,
      endsAt,
      venueName: input.venueName.trim(),
      courtName: input.courtName?.trim() || null,
      coachName: input.coachName?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "SCHEDULED" as const,
      cancellationReason: null,
    };
  }

  private async requireSession(id: string) {
    const session = await this.prisma.client.trainingSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Training session not found");
    return session;
  }
}
''')

(scheduling / "scheduling.controller.ts").write_text(r'''import { Body, Controller, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { RequireAnyRole, RequireMfa } from "../auth/authorization.decorators";
import { CurrentUser } from "../auth/current-user.decorator";
import { SchedulingService } from "./scheduling.service";

@ApiTags("scheduling")
@ApiBearerAuth("supabase")
@Controller()
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  @Get("me/schedule")
  mySchedule(@CurrentUser() user: AuthenticatedUserContext) {
    return this.scheduling.listMySchedule(user.id);
  }

  @Get("admin/scheduling/sessions")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH", "COACH", "EVENT_STAFF")
  listAdmin() {
    return this.scheduling.listAdminSessions();
  }

  @Post("admin/scheduling/sessions")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  create(@Body() body: Parameters<SchedulingService["createSession"]>[0]) {
    return this.scheduling.createSession(body);
  }

  @Patch("admin/scheduling/sessions/:id")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  update(@Param("id") id: string, @Body() body: Parameters<SchedulingService["updateSession"]>[1]) {
    return this.scheduling.updateSession(id, body);
  }

  @Post("admin/scheduling/sessions/:id/cancel")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH")
  @RequireMfa()
  cancel(@Param("id") id: string, @Body() body: { reason: string }) {
    return this.scheduling.cancelSession(id, body.reason);
  }

  @Post("admin/scheduling/sessions/:id/complete")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH", "COACH")
  complete(@Param("id") id: string) {
    return this.scheduling.completeSession(id);
  }

  @Get("admin/scheduling/sessions/:id/attendance")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH", "COACH", "EVENT_STAFF")
  attendance(@Param("id") id: string) {
    return this.scheduling.listAttendance(id);
  }

  @Put("admin/scheduling/sessions/:id/attendance")
  @RequireAnyRole("SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN", "HEAD_COACH", "COACH", "EVENT_STAFF")
  markAttendance(@Param("id") id: string, @Body() body: Parameters<SchedulingService["markAttendance"]>[1]) {
    return this.scheduling.markAttendance(id, body);
  }
}
''')

(scheduling / "scheduling.module.ts").write_text(r'''import { Module } from "@nestjs/common";
import { SchedulingController } from "./scheduling.controller";
import { SchedulingService } from "./scheduling.service";

@Module({ controllers: [SchedulingController], providers: [SchedulingService], exports: [SchedulingService] })
export class SchedulingModule {}
''')

app = Path("apps/api/src/app.module.ts")
s = app.read_text()
if "SchedulingModule" not in s:
    s = s.replace('import { HealthController } from "./health.controller";', 'import { HealthController } from "./health.controller";\nimport { SchedulingModule } from "./scheduling/scheduling.module";')
    s = s.replace('    EditorialModule,\n', '    EditorialModule,\n    SchedulingModule,\n')
app.write_text(s)

Path("apps/admin/app/scheduling/page.tsx").write_text(r'''"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { getAdminAccessToken } from "../../lib/admin-api";

const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1").replace(/\/+$/, "");
type Session = { id: string; programmeOfferingId: string | null; title: string; startsAt: string; endsAt: string; venueName: string; courtName: string | null; coachName: string | null; notes: string | null; status: "SCHEDULED" | "COMPLETED" | "CANCELLED"; cancellationReason: string | null; _count?: { attendances: number } };
type Attendance = { id: string; athleteId: string; athleteName: string; status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE"; notes: string | null };
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getAdminAccessToken() || ""}` });
const emptyForm = { programmeOfferingId: "", title: "", startsAt: "", endsAt: "", venueName: "", courtName: "", coachName: "", notes: "" };

export default function SchedulingPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeStatus, setAttendeeStatus] = useState<Attendance["status"]>("PRESENT");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`${API}/admin/scheduling/sessions`, { headers: authHeaders(), cache: "no-store" });
    if (!response.ok) throw new Error(`Scheduling API ${response.status}`);
    setSessions(await response.json());
  }, []);
  const loadAttendance = useCallback(async (session: Session) => {
    const response = await fetch(`${API}/admin/scheduling/sessions/${session.id}/attendance`, { headers: authHeaders(), cache: "no-store" });
    if (response.ok) setAttendance(await response.json());
  }, []);

  useEffect(() => { void load().catch(() => setMessage("Connect a staff session to manage scheduling.")); }, [load]);

  async function createSession(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`${API}/admin/scheduling/sessions`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...form, programmeOfferingId: form.programmeOfferingId || null, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() }) });
    if (!response.ok) { setMessage(`Could not create session (${response.status}). Staff MFA is required.`); return; }
    setForm(emptyForm); setMessage("Session created and persisted."); await load();
  }

  async function cancelSession(session: Session) {
    const reason = window.prompt("Cancellation reason"); if (!reason) return;
    const response = await fetch(`${API}/admin/scheduling/sessions/${session.id}/cancel`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ reason }) });
    if (!response.ok) { setMessage(`Could not cancel session (${response.status}).`); return; }
    await load();
  }

  async function completeSession(session: Session) {
    const response = await fetch(`${API}/admin/scheduling/sessions/${session.id}/complete`, { method: "POST", headers: authHeaders() });
    if (response.ok) await load();
  }

  async function addAttendance(event: React.FormEvent) {
    event.preventDefault(); if (!selected || !attendeeName.trim()) return;
    const response = await fetch(`${API}/admin/scheduling/sessions/${selected.id}/attendance`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ athleteName: attendeeName, status: attendeeStatus }) });
    if (!response.ok) { setMessage(`Could not mark attendance (${response.status}).`); return; }
    setAttendeeName(""); await loadAttendance(selected); await load();
  }

  async function changeAttendance(record: Attendance, status: Attendance["status"]) {
    if (!selected) return;
    const response = await fetch(`${API}/admin/scheduling/sessions/${selected.id}/attendance`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ athleteId: record.athleteId, athleteName: record.athleteName, status, notes: record.notes }) });
    if (response.ok) await loadAttendance(selected);
  }

  return <AdminShell><div>
    <PageHeader title="Scheduling & Attendance" subtitle="Create real training events, manage cancellations, and record attendance." breadcrumbs={[{ label: "Operations", href: "/" }, { label: "Scheduling" }]} />
    {message && <p role="status" style={{ padding: 12, background: "#FEF3C7", borderRadius: 8 }}>{message}</p>}
    <form onSubmit={createSession} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, padding: 16, background: "white", border: "1px solid #E2E8F0", borderRadius: 12 }}>
      <input required placeholder="Event / session title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
      <input type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
      <input required placeholder="Venue" value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} />
      <input placeholder="Court" value={form.courtName} onChange={(e) => setForm({ ...form, courtName: e.target.value })} />
      <input placeholder="Coach" value={form.coachName} onChange={(e) => setForm({ ...form, coachName: e.target.value })} />
      <input placeholder="Programme offering UUID (optional)" value={form.programmeOfferingId} onChange={(e) => setForm({ ...form, programmeOfferingId: e.target.value })} />
      <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button type="submit" variant="primary">Create session</Button>
    </form>

    <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
      {sessions.length === 0 ? <p>No sessions yet. Create a fake event above to test the workflow.</p> : sessions.map((session) => <article key={session.id} style={{ padding: 16, background: "white", border: "1px solid #E2E8F0", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong>{session.title}</strong><div>{new Date(session.startsAt).toLocaleString()} — {new Date(session.endsAt).toLocaleTimeString()}</div><small>{session.venueName}{session.courtName ? ` · ${session.courtName}` : ""}{session.coachName ? ` · Coach ${session.coachName}` : ""}</small></div><strong>{session.status}</strong></div>
        {session.cancellationReason && <p>Cancelled: {session.cancellationReason}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}><Button variant="outline" size="sm" onClick={() => { setSelected(session); void loadAttendance(session); }}>Attendance ({session._count?.attendances ?? 0})</Button>{session.status === "SCHEDULED" && <><Button variant="outline" size="sm" onClick={() => void completeSession(session)}>Complete</Button><Button variant="outline" size="sm" onClick={() => void cancelSession(session)}>Cancel</Button></>}</div>
      </article>)}
    </div>

    {selected && <section style={{ marginTop: 24, padding: 18, background: "#18181B", color: "white", borderRadius: 12 }}><h2>Attendance · {selected.title}</h2><form onSubmit={addAttendance} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input aria-label="Attendee name" placeholder="Fake or real attendee name" value={attendeeName} onChange={(e) => setAttendeeName(e.target.value)} /><select value={attendeeStatus} onChange={(e) => setAttendeeStatus(e.target.value as Attendance["status"])}><option>PRESENT</option><option>LATE</option><option>ABSENT</option><option>EXCUSED</option></select><Button type="submit" variant="primary">Add attendance</Button></form><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{attendance.map((record) => <div key={record.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span>{record.athleteName}</span><select value={record.status} onChange={(e) => void changeAttendance(record, e.target.value as Attendance["status"])}><option>PRESENT</option><option>LATE</option><option>ABSENT</option><option>EXCUSED</option></select></div>)}</div></section>}
  </div></AdminShell>;
}
''')

web_types = Path("apps/web/lib/types.ts")
s = web_types.read_text()
if "export interface ScheduleSessionItem" not in s:
    s += '''\n\nexport interface ScheduleSessionItem {\n  id: string;\n  programmeOfferingId: string | null;\n  title: string;\n  startsAt: string;\n  endsAt: string;\n  venueName: string;\n  courtName: string | null;\n  coachName: string | null;\n  notes: string | null;\n  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";\n  cancellationReason: string | null;\n  attendances: Array<{ athleteId: string; athleteName: string; status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" }>;\n}\n'''
web_types.write_text(s)

api_service = Path("apps/web/lib/api-service.ts")
s = api_service.read_text()
if "ScheduleSessionItem" not in s:
    s = s.replace('  CheckoutSessionResponse,\n', '  CheckoutSessionResponse,\n  ScheduleSessionItem,\n')
if "listMySchedule" not in s:
    pos = s.rfind("};")
    s = s[:pos] + '''\n  async listMySchedule(): Promise<ScheduleSessionItem[]> {\n    return apiClient.get<ScheduleSessionItem[]>("/me/schedule");\n  },\n''' + s[pos:]
api_service.write_text(s)

Path("apps/web/app/portal/schedule/page.tsx").write_text(r'''"use client";

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
    apiService.listMySchedule().then(setSessions).catch(() => setError("Could not load the family schedule right now.")).finally(() => setLoading(false));
  }, []);

  return <PortalShell><div><h1>Training schedule</h1><p style={{ color: "#64748b" }}>Upcoming and recent sessions tied to your family memberships. Session, court and coach details come from KHLIM operations rather than being inferred from the programme term.</p>
    {loading ? <p>Loading sessions…</p> : error ? <Card style={{ padding: 24 }}>{error}</Card> : sessions.length === 0 ? <Card style={{ padding: 24 }}>No individual sessions have been scheduled for your active memberships yet.</Card> : <div style={{ display: "grid", gap: 14, marginTop: 18 }}>{sessions.map((session) => <Card key={session.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ marginBottom: 4 }}>{session.title}</h2><strong>{new Date(session.startsAt).toLocaleString()}</strong><p>{session.venueName}{session.courtName ? ` · ${session.courtName}` : ""}{session.coachName ? ` · Coach ${session.coachName}` : ""}</p></div><Badge variant={session.status === "CANCELLED" ? "warning" : session.status === "COMPLETED" ? "neutral" : "success"}>{session.status}</Badge></div>{session.cancellationReason && <p><strong>Cancellation:</strong> {session.cancellationReason}</p>}{session.notes && <p>{session.notes}</p>}{session.attendances.length > 0 && <small>Attendance: {session.attendances.map((item) => `${item.athleteName} — ${item.status}`).join(", ")}</small>}</Card>)}</div>}
  </div></PortalShell>;
}
''')

Path("tests/phase-7-scheduling-attendance.test.mjs").write_text(r'''import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("scheduling and attendance persist as first-class records", async () => {
  const schema = await read("prisma/schema.prisma");
  assert.match(schema, /model TrainingSession/);
  assert.match(schema, /model AttendanceRecord/);
  assert.match(schema, /@@unique\(\[sessionId, athleteId\]\)/);
});

test("session mutations are privileged while attendance supports event operations", async () => {
  const controller = await read("apps/api/src/scheduling/scheduling.controller.ts");
  assert.match(controller, /admin\/scheduling\/sessions/);
  assert.match(controller, /@RequireMfa\(\)/);
  assert.match(controller, /EVENT_STAFF/);
  assert.match(controller, /attendance/);
});

test("guardian portal schedule is relationship and membership scoped", async () => {
  const service = await read("apps/api/src/scheduling/scheduling.service.ts");
  const portal = await read("apps/web/app/portal/schedule/page.tsx");
  assert.match(service, /guardianAthleteLinks/);
  assert.match(service, /programmeOfferingId/);
  assert.match(portal, /listMySchedule/);
  assert.doesNotMatch(portal, /later platform capability/);
});

test("Admin Scheduling supports fake events and manual attendance testing", async () => {
  const page = await read("apps/admin/app/scheduling/page.tsx");
  assert.match(page, /Create session/);
  assert.match(page, /Fake or real attendee name/);
  assert.match(page, /Cancellation reason/);
  assert.match(page, /Attendance/);
});
''')

Path("docs/testing/pr32-scheduling-attendance.md").write_text('''# PR #32 — Scheduling & Attendance acceptance\n\nRepository acceptance requires Prisma validation/migration, the complete regression suite, lint/format checks, and successful API/Admin/web builds.\n\nManual staging later: create a fake session in Admin, add manual attendance, change attendance status, complete/cancel a session, and confirm membership-scoped sessions render in `/portal/schedule`. Session creation/update/cancellation requires an MFA-authenticated staff session.\n\nVercel preview deployment is intentionally deferred while the project is at its deployment usage limit.\n''')
