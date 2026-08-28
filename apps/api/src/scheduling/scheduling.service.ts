import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
    if (!reason?.trim())
      throw new BadRequestException("Cancellation reason is required");
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
    if (!input.athleteName?.trim())
      throw new BadRequestException("Athlete name is required");
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
    const athleteIds = new Set(
      user.guardianAthleteLinks.map((link) => link.athleteId),
    );
    if (user.athleteProfile?.id) athleteIds.add(user.athleteProfile.id);
    if (athleteIds.size === 0) return [];

    const memberships = await this.prisma.client.membership.findMany({
      where: {
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

  private async requireSession(id: string) {
    const session = await this.prisma.client.trainingSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException("Training session not found");
    return session;
  }
}
