import { ForbiddenException, Injectable } from "@nestjs/common";
import type { VerifiedSupabaseIdentity } from "../auth/supabase-jwt-verifier";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { PrismaService } from "../database/prisma.service";

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
      roles: user.roleAssignments
        .map((assignment) => assignment.role)
        .sort(),
    };
  }
}
