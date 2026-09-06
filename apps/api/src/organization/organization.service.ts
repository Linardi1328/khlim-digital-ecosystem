import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { PrismaService } from "../database/prisma.service";
import {
  DEFAULT_ORGANIZATION_SLUG,
  type OrganizationStaffRole,
} from "./organization.constants";

interface OrganizationRow {
  id: string;
  slug: string;
  name: string;
  status: string;
}

interface OrganizationRoleRow {
  role: OrganizationStaffRole;
}

function normalizeRequestedSlug(value: string | undefined): string {
  const slug = (value || DEFAULT_ORGANIZATION_SLUG).trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    throw new ForbiddenException("Organization context is invalid");
  }
  return slug;
}

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveContext(_user: AuthenticatedUserContext, requestedSlug?: string) {
    const slug = normalizeRequestedSlug(requestedSlug);
    const organizations = await this.prisma.client.$queryRaw<OrganizationRow[]>`
      SELECT id::text, slug, name, status
      FROM organizations
      WHERE slug = ${slug}
      LIMIT 1
    `;
    const organization = organizations[0];

    if (!organization || organization.status !== "ACTIVE") {
      throw new ForbiddenException("Organization is not available");
    }

    const roles = await this.listActiveStaffRoles(organization.id, _user.id);

    return {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      roles,
    };
  }

  private async listActiveStaffRoles(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationStaffRole[]> {
    const rows = await this.prisma.client.$queryRaw<OrganizationRoleRow[]>`
      SELECT ora.role
      FROM organization_memberships om
      JOIN organization_role_assignments ora
        ON ora.organization_membership_id = om.id
      WHERE om.organization_id = ${organizationId}::uuid
        AND om.user_id = ${userId}::uuid
        AND om.status = 'ACTIVE'
      ORDER BY ora.role ASC
    `;
    return rows.map((row) => row.role);
  }
}
