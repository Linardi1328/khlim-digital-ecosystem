import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  optionalTrimmedString,
  requireIsoDate,
  requireTrimmedString,
} from "../common/input-validation";
import { PrismaService } from "../database/prisma.service";
import { requireSupportedLocale } from "../identity/locale-policy";
import type { CreateManagedAthleteDto, UpdateAthleteDto } from "./family.dto";

const athleteSelect = {
  id: true,
  displayName: true,
  dateOfBirth: true,
  preferredLocale: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async listManagedAthletes(guardianUserId: string) {
    const links = await this.prisma.client.guardianAthleteLink.findMany({
      where: {
        guardianUserId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        relationshipType: true,
        approvedAt: true,
        athlete: {
          select: athleteSelect,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return links.map((link) => ({
      familyLinkId: link.id,
      relationshipType: link.relationshipType,
      approvedAt: link.approvedAt,
      athlete: link.athlete,
    }));
  }

  async createManagedAthlete(
    guardianUserId: string,
    body: CreateManagedAthleteDto,
  ) {
    const displayName = requireTrimmedString(body?.displayName, "displayName", 120);
    const dateOfBirth = requireIsoDate(body?.dateOfBirth, "dateOfBirth");
    const preferredLocale =
      body?.preferredLocale === undefined
        ? "en"
        : requireSupportedLocale(body.preferredLocale);
    const relationshipType =
      optionalTrimmedString(body?.relationshipType, "relationshipType", 50) ??
      "guardian";

    return this.prisma.client.$transaction(async (transaction) => {
      const athlete = await transaction.athleteProfile.create({
        data: {
          displayName,
          dateOfBirth,
          preferredLocale,
        },
        select: athleteSelect,
      });

      const familyLink = await transaction.guardianAthleteLink.create({
        data: {
          guardianUserId,
          athleteId: athlete.id,
          relationshipType,
          status: "ACTIVE",
          createdByUserId: guardianUserId,
          approvedAt: new Date(),
        },
        select: {
          id: true,
          relationshipType: true,
          status: true,
          approvedAt: true,
        },
      });

      return {
        athlete,
        familyLink,
      };
    });
  }

  async getAthlete(athleteId: string) {
    const athlete = await this.prisma.client.athleteProfile.findUnique({
      where: { id: athleteId },
      select: athleteSelect,
    });

    if (!athlete) {
      throw new NotFoundException("Athlete not found");
    }

    return athlete;
  }

  async updateAthlete(athleteId: string, body: UpdateAthleteDto) {
    const data: {
      displayName?: string;
      dateOfBirth?: Date;
      preferredLocale?: string;
    } = {};

    if (body?.displayName !== undefined) {
      data.displayName = requireTrimmedString(body.displayName, "displayName", 120);
    }

    if (body?.dateOfBirth !== undefined) {
      data.dateOfBirth = requireIsoDate(body.dateOfBirth, "dateOfBirth");
    }

    if (body?.preferredLocale !== undefined) {
      data.preferredLocale = requireSupportedLocale(body.preferredLocale);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("At least one athlete field must be provided");
    }

    try {
      return await this.prisma.client.athleteProfile.update({
        where: { id: athleteId },
        data,
        select: athleteSelect,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("Athlete not found");
      }

      throw error;
    }
  }

  async revokeOwnFamilyLink(guardianUserId: string, athleteId: string) {
    return this.prisma.client.$transaction(async (transaction) => {
      const link = await transaction.guardianAthleteLink.findFirst({
        where: {
          guardianUserId,
          athleteId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!link) {
        throw new NotFoundException("Active family link not found");
      }

      const [athlete, activeGuardianCount] = await Promise.all([
        transaction.athleteProfile.findUnique({
          where: { id: athleteId },
          select: { userId: true },
        }),
        transaction.guardianAthleteLink.count({
          where: {
            athleteId,
            status: "ACTIVE",
          },
        }),
      ]);

      if (!athlete) {
        throw new NotFoundException("Athlete not found");
      }

      if (!athlete.userId && activeGuardianCount <= 1) {
        throw new ConflictException(
          "Cannot remove the only active access path to a managed athlete",
        );
      }

      return transaction.guardianAthleteLink.update({
        where: { id: link.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          revokedAt: true,
        },
      });
    });
  }
}
