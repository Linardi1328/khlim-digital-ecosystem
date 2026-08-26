import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import {
  optionalTrimmedString,
  requireIsoDate,
  requireTrimmedString,
} from "../common/input-validation";
import { PrismaService } from "../database/prisma.service";
import { requireSupportedLocale } from "../identity/locale-policy";
import type {
  AcceptGuardianInvitationDto,
  CreateGuardianInvitationDto,
  CreateManagedAthleteDto,
  UpdateAthleteDto,
} from "./family.dto";

const athleteSelect = {
  id: true,
  displayName: true,
  dateOfBirth: true,
  preferredLocale: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function normalizeEmail(value: unknown): string {
  const email = requireTrimmedString(value, "email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException("email must be a valid address");
  }
  return email;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
    const displayName = requireTrimmedString(
      body?.displayName,
      "displayName",
      120,
    );
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
      data.displayName = requireTrimmedString(
        body.displayName,
        "displayName",
        120,
      );
    }

    if (body?.dateOfBirth !== undefined) {
      data.dateOfBirth = requireIsoDate(body.dateOfBirth, "dateOfBirth");
    }

    if (body?.preferredLocale !== undefined) {
      data.preferredLocale = requireSupportedLocale(body.preferredLocale);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        "At least one athlete field must be provided",
      );
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

  async createGuardianInvitation(
    invitedByUserId: string,
    athleteId: string,
    body: CreateGuardianInvitationDto,
  ) {
    const inviteeEmail = normalizeEmail(body?.email);
    const relationshipType =
      optionalTrimmedString(body?.relationshipType, "relationshipType", 50) ??
      "guardian";
    const deliveryToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(deliveryToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.client.$transaction(
      async (transaction) => {
        await transaction.guardianInvitation.updateMany({
          where: {
            athleteId,
            inviteeEmail,
            status: "PENDING",
          },
          data: {
            status: "REVOKED",
            revokedAt: new Date(),
          },
        });

        return transaction.guardianInvitation.create({
          data: {
            athleteId,
            invitedByUserId,
            inviteeEmail,
            relationshipType,
            tokenHash,
            expiresAt,
          },
          select: {
            id: true,
            athleteId: true,
            inviteeEmail: true,
            relationshipType: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        });
      },
    );

    return {
      ...invitation,
      deliveryToken,
    };
  }

  async revokeGuardianInvitation(
    actorUserId: string,
    athleteId: string,
    invitationId: string,
  ) {
    const invitation = await this.prisma.client.guardianInvitation.findFirst({
      where: {
        id: invitationId,
        athleteId,
        invitedByUserId: actorUserId,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (!invitation) {
      throw new NotFoundException("Pending guardian invitation not found");
    }

    return this.prisma.client.guardianInvitation.update({
      where: { id: invitation.id },
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
  }

  async acceptGuardianInvitation(
    user: AuthenticatedUserContext,
    body: AcceptGuardianInvitationDto,
  ) {
    if (!user.email) {
      throw new ForbiddenException(
        "An authenticated email address is required to accept an invitation",
      );
    }

    const token = requireTrimmedString(body?.token, "token", 512);
    const tokenHash = hashToken(token);
    const normalizedUserEmail = user.email.trim().toLowerCase();

    return this.prisma.client.$transaction(async (transaction) => {
      const invitation = await transaction.guardianInvitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          athleteId: true,
          inviteeEmail: true,
          relationshipType: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!invitation || invitation.status !== "PENDING") {
        throw new NotFoundException("Active guardian invitation not found");
      }

      if (invitation.expiresAt.getTime() <= Date.now()) {
        await transaction.guardianInvitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        throw new BadRequestException("Guardian invitation has expired");
      }

      if (invitation.inviteeEmail !== normalizedUserEmail) {
        throw new ForbiddenException(
          "Guardian invitation email does not match the authenticated account",
        );
      }

      const link = await transaction.guardianAthleteLink.upsert({
        where: {
          guardianUserId_athleteId: {
            guardianUserId: user.id,
            athleteId: invitation.athleteId,
          },
        },
        create: {
          guardianUserId: user.id,
          athleteId: invitation.athleteId,
          relationshipType: invitation.relationshipType,
          status: "ACTIVE",
          createdByUserId: user.id,
          approvedAt: new Date(),
        },
        update: {
          relationshipType: invitation.relationshipType,
          status: "ACTIVE",
          approvedAt: new Date(),
          revokedAt: null,
        },
        select: {
          id: true,
          athleteId: true,
          relationshipType: true,
          status: true,
          approvedAt: true,
        },
      });

      await transaction.userRoleAssignment.upsert({
        where: {
          userId_role: {
            userId: user.id,
            role: "GUARDIAN",
          },
        },
        create: {
          userId: user.id,
          role: "GUARDIAN",
        },
        update: {},
      });

      await transaction.guardianInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedByUserId: user.id,
          acceptedAt: new Date(),
        },
      });

      return link;
    });
  }
}
