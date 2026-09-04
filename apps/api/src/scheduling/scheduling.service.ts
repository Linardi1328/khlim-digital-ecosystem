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

  async updateSession(
    organizationId: string,
    id: string,
    input: SessionInput,
  ) {
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

  async markAttendance(
    organizationId: string,
    id: string,
    input: AttendanceInput,
  ) {
    await this.requireSession(organizationId, id);
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
