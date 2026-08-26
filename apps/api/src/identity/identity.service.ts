import { ForbiddenException, Injectable } from "@nestjs/common";
import type { VerifiedSupabaseIdentity } from "../auth/supabase-jwt-verifier";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { requireTrimmedString, optionalTrimmedString } from "../common/input-validation";
import { PrismaService } from "../database/prisma.service";
import type {
  UpdatePreferencesDto,
  UpsertGuardianProfileDto,
} from "./identity.dto";
import { requireSupportedLocale } from "./locale-policy";

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAuthenticatedUser(
    identity: VerifiedSupabaseIdentity,
  ): Promise<AuthenticatedUserContext> {
    const user = await this.prisma.client.user.upsert({
      where: {
        authProviderSubject: identity.subject,
      },
      create: {
        authProviderSubject: identity.subject,
        email: identity.email ?? null,
      },
      update: identity.email
        ? {
            email: identity.email,
          }
        : {},
      include: {
        roleAssignments: {
          select: {
            role: true,
          },
        },
      },
    });

    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("KHLIM account is not active");
    }

    return {
      id: user.id,
      authProviderSubject: user.authProviderSubject,
      email: user.email,
      preferredLocale: user.preferredLocale,
      roles: user.roleAssignments.map((assignment) => assignment.role).sort(),
    };
  }

  async getAccount(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        preferredLocale: true,
        createdAt: true,
        updatedAt: true,
        roleAssignments: {
          select: { role: true },
          orderBy: { role: "asc" },
        },
        guardianProfile: {
          select: {
            displayName: true,
            phone: true,
          },
        },
        coachProfile: {
          select: {
            displayName: true,
            bio: true,
          },
        },
        athleteProfile: {
          select: {
            id: true,
            displayName: true,
            dateOfBirth: true,
            preferredLocale: true,
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new ForbiddenException("KHLIM account is not active");
    }

    return {
      ...user,
      roles: user.roleAssignments.map((assignment) => assignment.role),
      roleAssignments: undefined,
    };
  }

  async upsertGuardianProfile(userId: string, body: UpsertGuardianProfileDto) {
    const displayName = requireTrimmedString(body?.displayName, "displayName", 120);
    const phone = optionalTrimmedString(body?.phone, "phone", 40) ?? null;

    return this.prisma.client.$transaction(async (transaction) => {
      const profile = await transaction.guardianProfile.upsert({
        where: { userId },
        create: {
          userId,
          displayName,
          phone,
        },
        update: {
          displayName,
          phone,
        },
        select: {
          userId: true,
          displayName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await transaction.userRoleAssignment.upsert({
        where: {
          userId_role: {
            userId,
            role: "GUARDIAN",
          },
        },
        create: {
          userId,
          role: "GUARDIAN",
        },
        update: {},
      });

      return profile;
    });
  }

  async updatePreferences(userId: string, body: UpdatePreferencesDto) {
    const preferredLocale = requireSupportedLocale(body?.preferredLocale);

    return this.prisma.client.user.update({
      where: { id: userId },
      data: { preferredLocale },
      select: {
        id: true,
        preferredLocale: true,
        updatedAt: true,
      },
    });
  }
}
