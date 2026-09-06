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

  async listUsers(
    organizationId: string,
    query: ListOrganizationUsersQuery,
  ) {
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
      await transaction.organizationRoleAssignment.deleteMany({
        where: {
          organizationMembershipId: target.id,
          role: { in: [...ORGANIZATION_STAFF_ROLES] },
        },
      });

      if (roles.length > 0) {
        await transaction.organizationRoleAssignment.createMany({
          data: roles.map((role) => ({
            organizationMembershipId: target.id,
            role: role as OrganizationStaffRole,
          })),
          skipDuplicates: true,
        });
      }

      const assignments =
        await transaction.organizationRoleAssignment.findMany({
          where: { organizationMembershipId: target.id },
          select: { role: true },
          orderBy: { role: "asc" },
        });

      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorUserId: actor.id,
          actorEmail: actor.email,
          actorRoles: actor.roles.join(", ") || "STAFF",
          action: "ORGANIZATION_STAFF_ROLES_REPLACED",
          entityType: "ORGANIZATION_MEMBERSHIP",
          entityId: target.id,
          summary: `Organization staff roles for ${target.user.email ?? userId} changed from ${targetRoles.join(", ") || "none"} to ${roles.join(", ") || "none"}.`,
          metadata: {
            targetUserId: userId,
            before: targetRoles,
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
      const updated = await transaction.organizationMembership.update({
        where: { id: target.id },
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
          entityId: target.id,
          summary: `Organization access for ${target.user.email ?? userId} changed from ${target.status} to ${updated.status}.`,
          metadata: {
            targetUserId: userId,
            before: { status: target.status },
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
