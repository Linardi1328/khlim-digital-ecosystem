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

  async resolveContext(user: AuthenticatedUserContext, requestedSlug?: string) {
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

    // Compatibility bridge: existing Admin writers still mutate the legacy
    // UserRoleAssignment table. For Organization #001 only, mirror those staff
    // assignments into the new scoped tables on authentication. Authorization
    // then reads organization_role_assignments rather than treating the legacy
    // global staff role as authority. Organization #002+ never receives this
    // bridge, so a KHLIM staff role cannot grant access to another tenant.
    if (organization.slug === DEFAULT_ORGANIZATION_SLUG) {
      await this.syncLegacyStaffRoles(organization.id, user.id);
    }

    const roles = await this.listActiveStaffRoles(organization.id, user.id);

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

  private async syncLegacyStaffRoles(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.client.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        INSERT INTO organization_memberships (
          organization_id,
          user_id,
          status,
          updated_at
        )
        SELECT ${organizationId}::uuid, ${userId}::uuid, 'ACTIVE', CURRENT_TIMESTAMP
        WHERE EXISTS (
          SELECT 1
          FROM user_role_assignments ura
          WHERE ura.user_id = ${userId}::uuid
            AND ura.role::text IN (
              'COACH', 'SUPER_ADMIN', 'MANAGEMENT', 'FINANCE_ADMIN',
              'ACADEMY_ADMIN', 'HEAD_COACH', 'EVENT_STAFF'
            )
        )
        ON CONFLICT (organization_id, user_id) DO UPDATE
        SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
      `;

      await transaction.$executeRaw`
        INSERT INTO organization_role_assignments (
          organization_membership_id,
          role
        )
        SELECT om.id, ura.role::text
        FROM organization_memberships om
        JOIN user_role_assignments ura ON ura.user_id = om.user_id
        WHERE om.organization_id = ${organizationId}::uuid
          AND om.user_id = ${userId}::uuid
          AND ura.role::text IN (
            'COACH', 'SUPER_ADMIN', 'MANAGEMENT', 'FINANCE_ADMIN',
            'ACADEMY_ADMIN', 'HEAD_COACH', 'EVENT_STAFF'
          )
        ON CONFLICT (organization_membership_id, role) DO NOTHING
      `;

      await transaction.$executeRaw`
        DELETE FROM organization_role_assignments ora
        USING organization_memberships om
        WHERE ora.organization_membership_id = om.id
          AND om.organization_id = ${organizationId}::uuid
          AND om.user_id = ${userId}::uuid
          AND NOT EXISTS (
            SELECT 1
            FROM user_role_assignments ura
            WHERE ura.user_id = ${userId}::uuid
              AND ura.role::text = ora.role
              AND ura.role::text IN (
                'COACH', 'SUPER_ADMIN', 'MANAGEMENT', 'FINANCE_ADMIN',
                'ACADEMY_ADMIN', 'HEAD_COACH', 'EVENT_STAFF'
              )
          )
      `;
    });
  }
}
