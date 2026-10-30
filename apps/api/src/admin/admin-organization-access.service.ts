import type { Prisma } from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { PrismaService } from "../database/prisma.service";
import {
  ORGANIZATION_STAFF_ROLES,
  type OrganizationStaffRole,
} from "../organization/organization.constants";
import type { UpdateAccountStatusDto, UpdateStaffRolesDto } from "./admin.dto";

const staffRoleSet = new Set<string>(ORGANIZATION_STAFF_ROLES);
const membershipStatuses = new Set(["ACTIVE", "SUSPENDED", "DEACTIVATED"]);

interface ListOrganizationUsersQuery {
  q?: string;
  status?: string;
  role?: string;
  take?: string;
}

@Injectable()
export class AdminOrganizationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(organizationId: string, query: ListOrganizationUsersQuery) {
    const q = query.q?.trim().slice(0, 120) || undefined;
    const status = query.status?.trim().toUpperCase() || undefined;
    const role = query.role?.trim().toUpperCase() || undefined;
    const requestedTake = query.take ? Number.parseInt(query.take, 10) : 25;

    if (status && !membershipStatuses.has(status)) {
      throw new BadRequestException("status is invalid");
    }
    if (role && !staffRoleSet.has(role)) {
      throw new BadRequestException("role is invalid");
    }
    if (!Number.isFinite(requestedTake) || requestedTake < 1) {
      throw new BadRequestException("take must be a positive integer");
    }

    const take = Math.min(requestedTake, 50);
    const where = {
      organizationId,
      ...(status ? { status } : {}),
      ...(role
        ? {
            roleAssignments: {
              some: { role },
            },
          }
        : {}),
      ...(q
        ? {
            user: {
              is: {
                OR: [
                  { email: { contains: q, mode: "insensitive" as const } },
                  {
                    guardianProfile: {
                      is: {
                        displayName: {
                          contains: q,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                  {
                    coachProfile: {
                      is: {
                        displayName: {
                          contains: q,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                  {
                    athleteProfile: {
                      is: {
                        displayName: {
                          contains: q,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                ],
              },
            },
          }
        : {}),
    };

    const [memberships, total] = await Promise.all([
      this.prisma.client.organizationMembership.findMany({
        where,
        take,
        orderBy: [{ updatedAt: "desc" }, { userId: "asc" }],
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roleAssignments: {
            select: { role: true },
            orderBy: { role: "asc" },
          },
          user: {
            select: {
              id: true,
              email: true,
              preferredLocale: true,
              guardianProfile: { select: { displayName: true } },
              coachProfile: { select: { displayName: true } },
              athleteProfile: { select: { displayName: true } },
            },
          },
        },
      }),
      this.prisma.client.organizationMembership.count({ where }),
    ]);

    return {
      items: memberships.map((membership) => ({
        id: membership.user.id,
        email: membership.user.email,
        displayName:
          membership.user.coachProfile?.displayName ??
          membership.user.guardianProfile?.displayName ??
          membership.user.athleteProfile?.displayName ??
          membership.user.email?.split("@")[0] ??
          "KHLIM User",
        status: membership.status,
        preferredLocale: membership.user.preferredLocale,
        roles: membership.roleAssignments.map((assignment) => assignment.role),
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      })),
      total,
      limit: take,
    };
  }

  async getUser(organizationId: string, userId: string) {
    const membership = await this.requireMembership(organizationId, userId);
    return {
      id: membership.user.id,
      email: membership.user.email,
      status: membership.status,
      preferredLocale: membership.user.preferredLocale,
      roleAssignments: membership.roleAssignments,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }

  async replaceStaffRoles(
    organizationId: string,
    actor: AuthenticatedUserContext,
    userId: string,
    body: UpdateStaffRolesDto,
  ) {
    if (actor.id === userId) {
      throw new ForbiddenException("Staff cannot change their own roles");
    }
    if (!Array.isArray(body?.roles)) {
      throw new BadRequestException("roles must be an array");
    }

    const roles = [...new Set(body.roles)];
    if (
      roles.some((role) => typeof role !== "string" || !staffRoleSet.has(role))
    ) {
      throw new BadRequestException("roles contains an unsupported staff role");
    }

    if (roles.includes("SUPER_ADMIN") && !actor.roles.includes("SUPER_ADMIN")) {
      throw new ForbiddenException("Only a Super Admin can assign Super Admin");
    }

    const target = await this.requireMembership(organizationId, userId);
    const targetRoles = target.roleAssignments.map(
      (assignment) => assignment.role,
    );
    if (
      targetRoles.includes("SUPER_ADMIN") &&
      !actor.roles.includes("SUPER_ADMIN")
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify a Super Admin",
      );
    }

    return this.prisma.client.$transaction(async (transaction) => {
      const liveActorRoles = await this.requireLiveStaffMutator(
        transaction,
        organizationId,
        actor,
      );
      const liveTarget = await this.requireLiveMembership(
        transaction,
        organizationId,
        userId,
      );
      const liveTargetRoles = liveTarget.roleAssignments.map(
        (assignment) => assignment.role,
      );
      if (
        liveTargetRoles.includes("SUPER_ADMIN") &&
        !liveActorRoles.includes("SUPER_ADMIN")
      ) {
        throw new ForbiddenException(
          "Only a Super Admin can modify a Super Admin",
        );
      }

      if (roles.includes("SUPER_ADMIN") && !liveActorRoles.includes("SUPER_ADMIN")) {
        throw new ForbiddenException("Only a Super Admin can assign Super Admin");
      }
      if (
        liveTarget.status === "ACTIVE" &&
        liveTargetRoles.includes("SUPER_ADMIN") &&
        !roles.includes("SUPER_ADMIN")
      ) {
        await this.requireAnotherActiveSuperAdmin(
          transaction,
          organizationId,
          userId,
        );
      }

      await transaction.organizationRoleAssignment.deleteMany({
        where: {
          organizationMembershipId: liveTarget.id,
          role: { in: [...ORGANIZATION_STAFF_ROLES] },
        },
      });

      if (roles.length > 0) {
        await transaction.organizationRoleAssignment.createMany({
          data: roles.map((role) => ({
            organizationMembershipId: liveTarget.id,
            role: role as OrganizationStaffRole,
          })),
          skipDuplicates: true,
        });
      }

      const assignments = await transaction.organizationRoleAssignment.findMany(
        {
          where: { organizationMembershipId: liveTarget.id },
          select: { role: true },
          orderBy: { role: "asc" },
        },
      );

      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorUserId: actor.id,
          actorEmail: actor.email,
          actorRoles: actor.roles.join(", ") || "STAFF",
          action: "ORGANIZATION_STAFF_ROLES_REPLACED",
          entityType: "ORGANIZATION_MEMBERSHIP",
          entityId: liveTarget.id,
          summary: `Organization staff roles for ${liveTarget.user.email ?? userId} changed from ${liveTargetRoles.join(", ") || "none"} to ${roles.join(", ") || "none"}.`,
          metadata: {
            targetUserId: userId,
            before: liveTargetRoles,
            after: assignments.map((assignment) => assignment.role),
          },
        },
      });

      return assignments;
    });
  }

  async updateMembershipStatus(
    organizationId: string,
    actor: AuthenticatedUserContext,
    userId: string,
    body: UpdateAccountStatusDto,
  ) {
    if (actor.id === userId) {
      throw new ForbiddenException(
        "Staff cannot change their own organization access status",
      );
    }
    if (
      typeof body?.status !== "string" ||
      !membershipStatuses.has(body.status)
    ) {
      throw new BadRequestException("status is invalid");
    }

    const target = await this.requireMembership(organizationId, userId);
    const targetRoles = target.roleAssignments.map(
      (assignment) => assignment.role,
    );
    if (
      targetRoles.includes("SUPER_ADMIN") &&
      !actor.roles.includes("SUPER_ADMIN")
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify a Super Admin",
      );
    }

    return this.prisma.client.$transaction(async (transaction) => {
      const liveActorRoles = await this.requireLiveStaffMutator(
        transaction,
        organizationId,
        actor,
      );
      const liveTarget = await this.requireLiveMembership(
        transaction,
        organizationId,
        userId,
      );
      const liveTargetRoles = liveTarget.roleAssignments.map(
        (assignment) => assignment.role,
      );
      if (
        liveTargetRoles.includes("SUPER_ADMIN") &&
        !liveActorRoles.includes("SUPER_ADMIN")
      ) {
        throw new ForbiddenException(
          "Only a Super Admin can modify a Super Admin",
        );
      }

      if (
        liveTarget.status === "ACTIVE" &&
        body.status !== "ACTIVE" &&
        liveTargetRoles.includes("SUPER_ADMIN")
      ) {
        await this.requireAnotherActiveSuperAdmin(
          transaction,
          organizationId,
          userId,
        );
      }

      const updated = await transaction.organizationMembership.update({
        where: { id: liveTarget.id },
        data: { status: body.status },
        select: {
          userId: true,
          status: true,
          updatedAt: true,
        },
      });

      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorUserId: actor.id,
          actorEmail: actor.email,
          actorRoles: actor.roles.join(", ") || "STAFF",
          action: "ORGANIZATION_MEMBERSHIP_STATUS_UPDATED",
          entityType: "ORGANIZATION_MEMBERSHIP",
          entityId: liveTarget.id,
          summary: `Organization access for ${liveTarget.user.email ?? userId} changed from ${liveTarget.status} to ${updated.status}.`,
          metadata: {
            targetUserId: userId,
            before: { status: liveTarget.status },
            after: { status: updated.status },
          },
        },
      });

      return {
        id: updated.userId,
        status: updated.status,
        updatedAt: updated.updatedAt,
      };
    });
  }

  // This parent-row lock serializes role/status edits to a single tenant.
  // Re-read live authority after locking: JWT claims from request start may
  // be stale if another administrator revoked this actor concurrently.
  private async requireLiveStaffMutator(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    actor: AuthenticatedUserContext,
  ): Promise<string[]> {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM organizations
      WHERE id = ${organizationId}::uuid
      FOR UPDATE
    `;
    if (locked.length !== 1) {
      throw new ForbiddenException("Organization access is unavailable");
    }
    const membership = await transaction.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: actor.id },
      },
      select: {
        status: true,
        roleAssignments: { select: { role: true } },
      },
    });
    const liveRoles =
      membership?.roleAssignments.map((assignment) => assignment.role) ?? [];
    if (
      membership?.status !== "ACTIVE" ||
      !liveRoles.some(
        (role) => role === "SUPER_ADMIN" || role === "MANAGEMENT",
      )
    ) {
      throw new ForbiddenException("Staff permissions have changed");
    }
    return liveRoles;
  }

  private async requireLiveMembership(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
  ) {
    const target = await transaction.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      select: {
        id: true,
        status: true,
        roleAssignments: { select: { role: true } },
        user: { select: { email: true } },
      },
    });
    if (!target) {
      throw new NotFoundException("Organization member not found");
    }
    return target;
  }

  private async requireAnotherActiveSuperAdmin(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const other = await transaction.organizationMembership.findFirst({
      where: {
        organizationId,
        status: "ACTIVE",
        userId: { not: userId },
        roleAssignments: { some: { role: "SUPER_ADMIN" } },
      },
      select: { id: true },
    });
    if (!other) {
      throw new ForbiddenException(
        "The last active Super Admin cannot be removed or suspended",
      );
    }
  }

  private async requireMembership(organizationId: string, userId: string) {
    const membership =
      await this.prisma.client.organizationMembership.findUnique({
        where: {
          organizationId_userId: { organizationId, userId },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roleAssignments: {
            select: { role: true },
            orderBy: { role: "asc" },
          },
          user: {
            select: {
              id: true,
              email: true,
              preferredLocale: true,
            },
          },
        },
      });

    if (!membership) {
      throw new NotFoundException("Organization member not found");
    }
    return membership;
  }
}
