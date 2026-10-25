import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
  athleteId: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE";
  notes?: string | null;
};

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  listAdminSessions(organizationId: string) {
    return this.prisma.client.trainingSession.findMany({
      where: { organizationId },
      include: { _count: { select: { attendances: true } } },
      orderBy: { startsAt: "asc" },
    });
  }

  async createSession(organizationId: string, input: SessionInput) {
    const data = this.normalizeSession(input);
    await this.requireOffering(organizationId, data.programmeOfferingId);
    return this.prisma.client.trainingSession.create({
      data: { organizationId, ...data },
    });
  }

  async updateSession(organizationId: string, id: string, input: SessionInput) {
    await this.requireSession(organizationId, id);
    const data = this.normalizeSession(input);
    await this.requireOffering(organizationId, data.programmeOfferingId);
    return this.prisma.client.trainingSession.update({ where: { id }, data });
  }

  async cancelSession(organizationId: string, id: string, reason: string) {
    await this.requireSession(organizationId, id);
    if (!reason?.trim())
      throw new BadRequestException("Cancellation reason is required");
    return this.prisma.client.trainingSession.update({
      where: { id },
      data: { status: "CANCELLED", cancellationReason: reason.trim() },
    });
  }

  async completeSession(organizationId: string, id: string) {
    await this.requireSession(organizationId, id);
    return this.prisma.client.trainingSession.update({
      where: { id },
      data: { status: "COMPLETED" },
    });
  }

  async listAttendance(organizationId: string, id: string) {
    await this.requireSession(organizationId, id);
    return this.prisma.client.attendanceRecord.findMany({
      where: { sessionId: id },
      orderBy: [{ athleteName: "asc" }],
    });
  }

  async listSessionRoster(organizationId: string, id: string) {
    const session = await this.requireSession(organizationId, id);
    if (!session.programmeOfferingId) {
      return { sessionId: id, programmeOfferingId: null, players: [] };
    }

    // Small, bounded read model. Roster authority comes from ACTIVE
    // memberships, not manually typed attendance names or browser state.
    const [memberships, attendances] = await Promise.all([
      this.prisma.client.membership.findMany({
        where: {
          organizationId,
          programmeOfferingId: session.programmeOfferingId,
          status: "ACTIVE",
        },
        select: {
          athleteId: true,
          athlete: { select: { displayName: true } },
        },
        orderBy: { athleteId: "asc" },
      }),
      this.prisma.client.attendanceRecord.findMany({
        where: { sessionId: id },
        select: { athleteId: true, status: true, markedAt: true },
      }),
    ]);
    const byAthlete = new Map(
      attendances.map((record) => [record.athleteId, record]),
    );
    const uniquePlayers = new Map(
      memberships.map((membership) => [
        membership.athleteId,
        {
          athleteId: membership.athleteId,
          athleteName: membership.athlete.displayName,
        },
      ]),
    );
    return {
      sessionId: id,
      programmeOfferingId: session.programmeOfferingId,
      players: [...uniquePlayers.values()]
        .sort((a, b) => a.athleteName.localeCompare(b.athleteName))
        .map((player) => ({
          ...player,
          attendanceStatus:
            byAthlete.get(player.athleteId)?.status ?? "UNMARKED",
          markedAt: byAthlete.get(player.athleteId)?.markedAt ?? null,
        })),
    };
  }

  async markAttendance(
    organizationId: string,
    id: string,
    input: AttendanceInput,
  ) {
    const session = await this.requireSession(organizationId, id);
    const athleteId = input.athleteId?.trim();
    if (
      !athleteId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        athleteId,
      )
    ) {
      throw new BadRequestException("A valid enrolled athlete ID is required");
    }
    if (!["PRESENT", "ABSENT", "EXCUSED", "LATE"].includes(input.status)) {
      throw new BadRequestException("Unsupported attendance status");
    }
    if (!session.programmeOfferingId || session.status === "CANCELLED") {
      throw new BadRequestException(
        "Attendance requires an active, offering-linked session",
      );
    }
    const membership = await this.prisma.client.membership.findFirst({
      where: {
        organizationId,
        programmeOfferingId: session.programmeOfferingId,
        athleteId,
        status: "ACTIVE",
      },
      select: { athlete: { select: { displayName: true } } },
    });
    if (!membership) {
      throw new BadRequestException(
        "Athlete does not hold an active membership in this session's offering",
      );
    }
    const notes = input.notes?.trim() || null;
    if (notes && notes.length > 1000) {
      throw new BadRequestException("Attendance notes are too long");
    }
    return this.prisma.client.attendanceRecord.upsert({
      where: { sessionId_athleteId: { sessionId: id, athleteId } },
      create: {
        sessionId: id,
        athleteId,
        athleteName: membership.athlete.displayName,
        status: input.status,
        notes,
      },
      update: {
        athleteName: membership.athlete.displayName,
        status: input.status,
        notes,
        markedAt: new Date(),
      },
    });
  }

  async listMySchedule(organizationId: string, userId: string) {
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
    const athleteIds = new Set(
      user.guardianAthleteLinks.map((link) => link.athleteId),
    );
    if (user.athleteProfile?.id) athleteIds.add(user.athleteProfile.id);
    if (athleteIds.size === 0) return [];

    const memberships = await this.prisma.client.membership.findMany({
      where: {
        organizationId,
        athleteId: { in: [...athleteIds] },
        status: { in: ["ACTIVE", "PENDING"] },
      },
      select: { athleteId: true, programmeOfferingId: true },
    });
    const offeringIds = [
      ...new Set(memberships.map((item) => item.programmeOfferingId)),
    ];
    if (offeringIds.length === 0) return [];

    return this.prisma.client.trainingSession.findMany({
      where: {
        organizationId,
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
    if (
      Number.isNaN(startsAt.valueOf()) ||
      Number.isNaN(endsAt.valueOf()) ||
      endsAt <= startsAt
    ) {
      throw new BadRequestException(
        "Session end time must be after its start time",
      );
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

  private async requireOffering(
    organizationId: string,
    programmeOfferingId: string | null,
  ) {
    if (!programmeOfferingId) return;
    const offering = await this.prisma.client.programmeOffering.findFirst({
      where: { id: programmeOfferingId, organizationId },
      select: { id: true },
    });
    if (!offering) throw new NotFoundException("Programme offering not found");
  }

  private async requireSession(organizationId: string, id: string) {
    const session = await this.prisma.client.trainingSession.findFirst({
      where: { id, organizationId },
    });
    if (!session) throw new NotFoundException("Training session not found");
    return session;
  }
}
