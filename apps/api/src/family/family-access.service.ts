import { Injectable } from "@nestjs/common";
import type { AthleteAccessMode } from "../auth/auth.constants";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import type { KhlimUserRole } from "../auth/roles";
import { PrismaService } from "../database/prisma.service";

const FAMILY_STAFF_ROLES = new Set<KhlimUserRole>([
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class FamilyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessAthlete(
    user: AuthenticatedUserContext,
    athleteId: string,
    mode: AthleteAccessMode,
  ): Promise<boolean> {
    if (!UUID_PATTERN.test(athleteId)) {
      return false;
    }

    const roles = new Set(user.roles as KhlimUserRole[]);

    if ([...FAMILY_STAFF_ROLES].some((role) => roles.has(role))) {
      return true;
    }

    if (roles.has("GUARDIAN")) {
      const guardianLink = await this.prisma.client.guardianAthleteLink.findFirst({
        where: {
          guardianUserId: user.id,
          athleteId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (guardianLink) {
        return true;
      }
    }

    if (mode === "read" && roles.has("ATHLETE")) {
      const athlete = await this.prisma.client.athleteProfile.findFirst({
        where: {
          id: athleteId,
          userId: user.id,
        },
        select: { id: true },
      });

      return Boolean(athlete);
    }

    return false;
  }
}
