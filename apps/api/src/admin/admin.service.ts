import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import type { KhlimUserRole } from "../auth/roles";
import { PrismaService } from "../database/prisma.service";
import type { UpdateAccountStatusDto, UpdateStaffRolesDto } from "./admin.dto";

const STAFF_ROLES: readonly KhlimUserRole[] = [
  "COACH",
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "EVENT_STAFF",
];
const staffRoleSet = new Set<string>(STAFF_ROLES);
const accountStatuses = new Set(["ACTIVE", "SUSPENDED", "DEACTIVATED"]);

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        preferredLocale: true,
        roleAssignments: {
          select: { role: true },
          orderBy: { role: "asc" },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async replaceStaffRoles(
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
      roles.some(
        (role) => typeof role !== "string" || !staffRoleSet.has(role),
      )
    ) {
      throw new BadRequestException("roles contains an unsupported staff role");
    }

    if (roles.includes("SUPER_ADMIN") && !actor.roles.includes("SUPER_ADMIN")) {
      throw new ForbiddenException("Only a Super Admin can assign Super Admin");
    }

    const target = await this.getUser(userId);
    const targetRoles = target.roleAssignments.map((assignment) => assignment.role);
    if (
      targetRoles.includes("SUPER_ADMIN") &&
      !actor.roles.includes("SUPER_ADMIN")
    ) {
      throw new ForbiddenException("Only a Super Admin can modify a Super Admin");
    }

    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.userRoleAssignment.deleteMany({
        where: {
          userId,
          role: { in: [...STAFF_ROLES] },
        },
      });

      if (roles.length > 0) {
        await transaction.userRoleAssignment.createMany({
          data: roles.map((role) => ({
            userId,
            role: role as KhlimUserRole,
          })),
          skipDuplicates: true,
        });
      }

      return transaction.userRoleAssignment.findMany({
        where: { userId },
        select: { role: true },
        orderBy: { role: "asc" },
      });
    });
  }

  async updateAccountStatus(
    actor: AuthenticatedUserContext,
    userId: string,
    body: UpdateAccountStatusDto,
  ) {
    if (actor.id === userId) {
      throw new ForbiddenException("Staff cannot change their own account status");
    }

    if (typeof body?.status !== "string" || !accountStatuses.has(body.status)) {
      throw new BadRequestException("status is invalid");
    }

    const target = await this.getUser(userId);
    const targetRoles = target.roleAssignments.map((assignment) => assignment.role);
    if (
      targetRoles.includes("SUPER_ADMIN") &&
      !actor.roles.includes("SUPER_ADMIN")
    ) {
      throw new ForbiddenException("Only a Super Admin can modify a Super Admin");
    }

    return this.prisma.client.user.update({
      where: { id: userId },
      data: { status: body.status as "ACTIVE" | "SUSPENDED" | "DEACTIVATED" },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });
  }
}
