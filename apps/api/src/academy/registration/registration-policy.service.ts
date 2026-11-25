import { Injectable } from "@nestjs/common";
import type { AuthenticatedUserContext } from "../../auth/authenticated-user";
import { PrismaService } from "../../database/prisma.service";
import { loadApiRuntimeConfig } from "../../environment";
import { DEFAULT_ORGANIZATION_ID } from "../../organization/organization.constants";
import { Prisma } from "../../generated/prisma/client";
import {
  CONSENT_TYPES,
  REGISTRATION_LOCALES,
  REGISTRATION_OPTIONS,
  REQUIRED_CONSENT_TYPES,
  IDEMPOTENCY_KEY_PATTERN,
} from "./registration.constants";
import { writeRegistrationAudit } from "./registration-audit";
import {
  parseCreatePolicy,
  parseVersionOnly,
  type PolicyContent,
} from "./registration-admin.validation";
import { loadHmacKeyRing } from "./registration.crypto";
import {
  RegistrationApiException,
  withSanitizedErrors,
} from "./registration.errors";
import { parseUuidParam } from "./registration.validation";

/**
 * The deployment tier exactly as the API runtime resolves it at startup
 * (`KHLIM_ENV`, else `production` when `NODE_ENV=production`). Any invalid
 * configuration is treated as production so the synthetic guard fails closed.
 */
export function resolveDeploymentTier(
  environment: NodeJS.ProcessEnv = process.env,
): "development" | "staging" | "production" {
  try {
    return loadApiRuntimeConfig(environment).deploymentEnv;
  } catch {
    return "production";
  }
}

export interface CurrentPolicy {
  id: string;
  policyVersion: string;
  approvedAt: Date;
  content: PolicyContent;
}

function mapPolicy(policy: {
  id: string;
  policyVersion: string;
  status: string;
  version: number;
  approvedAt: Date | null;
  retiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  content: unknown;
}) {
  return {
    id: policy.id,
    policyVersion: policy.policyVersion,
    status: policy.status,
    version: policy.version,
    content: policy.content,
    approvedAt: policy.approvedAt?.toISOString() ?? null,
    retiredAt: policy.retiredAt?.toISOString() ?? null,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

@Injectable()
export class RegistrationPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentPolicy(
    organizationId = DEFAULT_ORGANIZATION_ID,
  ): Promise<CurrentPolicy | null> {
    const policy = await this.prisma.client.academyRegistrationPolicy.findFirst(
      {
        where: { organizationId, status: "APPROVED" },
      },
    );
    if (!policy?.approvedAt) return null;
    return {
      id: policy.id,
      policyVersion: policy.policyVersion,
      approvedAt: policy.approvedAt,
      content: policy.content as unknown as PolicyContent,
    };
  }

  /** Registration is open only with an approved policy AND a configured HMAC key ring. */
  async getPublicConfig() {
    const [policy, ring] = await withSanitizedErrors(
      async () => [await this.getCurrentPolicy(), loadHmacKeyRing()] as const,
    );
    const open = Boolean(policy && ring);
    return {
      registrationOpen: open,
      closedReasonCode: open ? null : "REGISTRATION_NOT_CONFIGURED",
      consent:
        open && policy
          ? {
              policyVersion: policy.policyVersion,
              approvedAt: policy.approvedAt.toISOString(),
              locales: [...REGISTRATION_LOCALES],
              items: CONSENT_TYPES.map((type) => ({
                type,
                required: REQUIRED_CONSENT_TYPES.includes(type),
                defaultChecked: false,
                content: policy.content[type],
              })),
            }
          : null,
      options: REGISTRATION_OPTIONS,
      idempotencyKey: {
        header: "Idempotency-Key",
        minLength: 22,
        maxLength: 128,
        pattern: IDEMPOTENCY_KEY_PATTERN.source,
      },
    };
  }

  list(organizationId: string) {
    return withSanitizedErrors(async () => {
      // Bounded history plus the current policy, which stays reachable (for
      // retirement) however many newer drafts exist.
      // Both reads come from one REPEATABLE READ snapshot, so a policy can
      // never appear as DRAFT in `items` and APPROVED in `current`.
      const [rows, current] = await this.prisma.client.$transaction(
        async (tx) => [
          await tx.academyRegistrationPolicy.findMany({
            where: { organizationId },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 50,
          }),
          await tx.academyRegistrationPolicy.findFirst({
            where: { organizationId, status: "APPROVED" },
          }),
        ],
        {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          maxWait: 5000,
          timeout: 15000,
        },
      );
      return {
        current: current ? mapPolicy(current) : null,
        items: rows.map(mapPolicy),
      };
    });
  }

  create(
    organizationId: string,
    actor: AuthenticatedUserContext,
    body: unknown,
  ) {
    const input = parseCreatePolicy(body);
    return withSanitizedErrors(async () => {
      try {
        const row = await this.prisma.client.$transaction(async (tx) => {
          const created = await tx.academyRegistrationPolicy.create({
            data: {
              organizationId,
              policyVersion: input.policyVersion,
              content: input.content as unknown as Prisma.InputJsonValue,
              createdByUserId: actor.id,
            },
          });
          await writeRegistrationAudit(tx, organizationId, actor, {
            action: "ACADEMY_REGISTRATION_POLICY_CREATED",
            entityType: "ACADEMY_REGISTRATION_POLICY",
            entityId: created.id,
            summary: "Academy registration policy draft created.",
            metadata: { policyVersion: created.policyVersion },
          });
          return created;
        });
        return mapPolicy(row);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new RegistrationApiException(
            409,
            "POLICY_VERSION_EXISTS",
            "Policy version already exists",
          );
        }
        throw error;
      }
    });
  }

  approve(
    organizationId: string,
    actor: AuthenticatedUserContext,
    id: string,
    body: unknown,
  ) {
    const policyId = parseUuidParam(id, "POLICY_NOT_FOUND");
    const { expectedVersion } = parseVersionOnly(body);
    return withSanitizedErrors(() =>
      this.prisma.client.$transaction(async (tx) => {
        // One approval/retirement at a time per organization; always taken
        // before any policy row lock (submit never takes this lock).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`registration-policy:${organizationId}`}, 0))`;
        const rows = await tx.$queryRaw<
          Array<{ status: string; version: number; policy_version: string }>
        >`
          SELECT status::text AS status, version, policy_version
          FROM academy_registration_policies
          WHERE id = ${policyId}::uuid AND organization_id = ${organizationId}::uuid
          FOR UPDATE
        `;
        const row = rows[0];
        if (!row) {
          throw new RegistrationApiException(
            404,
            "POLICY_NOT_FOUND",
            "Policy not found",
          );
        }
        if (row.version !== expectedVersion) {
          throw new RegistrationApiException(
            409,
            "STALE_VERSION",
            "Policy changed",
          );
        }
        if (row.status !== "DRAFT") {
          throw new RegistrationApiException(
            409,
            "POLICY_INVALID_STATE",
            "Only a draft policy can be approved",
          );
        }
        // Synthetic fixtures must never become live policy versions.
        if (
          /^synthetic/i.test(row.policy_version) &&
          resolveDeploymentTier() !== "development"
        ) {
          throw new RegistrationApiException(
            409,
            "POLICY_NOT_APPROVABLE",
            "Synthetic policy versions cannot be approved in this environment",
          );
        }
        const now = new Date();
        // Previously approved policy (at most one), retired by this approval;
        // its retirement is audited on its own entity below.
        // Audit only what this statement actually retired: a concurrent
        // writer (for example direct SQL) may already have retired the policy
        // that was approved when this transaction started.
        const replaced = await tx.academyRegistrationPolicy.updateManyAndReturn(
          {
            where: { organizationId, status: "APPROVED" },
            data: {
              status: "RETIRED",
              retiredAt: now,
              version: { increment: 1 },
            },
            select: { id: true, policyVersion: true },
          },
        );
        const approved = await tx.academyRegistrationPolicy.update({
          where: { id: policyId },
          data: {
            status: "APPROVED",
            approvedAt: now,
            approvedByUserId: actor.id,
            version: { increment: 1 },
          },
        });
        await writeRegistrationAudit(tx, organizationId, actor, {
          action: "ACADEMY_REGISTRATION_POLICY_APPROVED",
          entityType: "ACADEMY_REGISTRATION_POLICY",
          entityId: policyId,
          summary: "Academy registration policy approved.",
          metadata: {
            policyVersion: approved.policyVersion,
            retiredPolicyId: replaced[0]?.id ?? null,
          },
        });
        for (const previous of replaced) {
          await writeRegistrationAudit(tx, organizationId, actor, {
            action: "ACADEMY_REGISTRATION_POLICY_RETIRED",
            entityType: "ACADEMY_REGISTRATION_POLICY",
            entityId: previous.id,
            summary:
              "Academy registration policy retired by approval of a replacement.",
            metadata: {
              policyVersion: previous.policyVersion,
              reason: "REPLACED",
              replacedByPolicyId: policyId,
            },
          });
        }
        return mapPolicy(approved);
      }),
    );
  }

  retire(
    organizationId: string,
    actor: AuthenticatedUserContext,
    id: string,
    body: unknown,
  ) {
    const policyId = parseUuidParam(id, "POLICY_NOT_FOUND");
    const { expectedVersion } = parseVersionOnly(body);
    return withSanitizedErrors(() =>
      this.prisma.client.$transaction(async (tx) => {
        // One approval/retirement at a time per organization; always taken
        // before any policy row lock (submit never takes this lock).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`registration-policy:${organizationId}`}, 0))`;
        const rows = await tx.$queryRaw<
          Array<{ status: string; version: number }>
        >`
          SELECT status::text AS status, version
          FROM academy_registration_policies
          WHERE id = ${policyId}::uuid AND organization_id = ${organizationId}::uuid
          FOR UPDATE
        `;
        const row = rows[0];
        if (!row) {
          throw new RegistrationApiException(
            404,
            "POLICY_NOT_FOUND",
            "Policy not found",
          );
        }
        if (row.version !== expectedVersion) {
          throw new RegistrationApiException(
            409,
            "STALE_VERSION",
            "Policy changed",
          );
        }
        if (row.status === "RETIRED") {
          throw new RegistrationApiException(
            409,
            "POLICY_INVALID_STATE",
            "Policy already retired",
          );
        }
        const retired = await tx.academyRegistrationPolicy.update({
          where: { id: policyId },
          data: {
            status: "RETIRED",
            retiredAt: new Date(),
            version: { increment: 1 },
          },
        });
        await writeRegistrationAudit(tx, organizationId, actor, {
          action: "ACADEMY_REGISTRATION_POLICY_RETIRED",
          entityType: "ACADEMY_REGISTRATION_POLICY",
          entityId: policyId,
          summary: "Academy registration policy retired.",
          metadata: { policyVersion: retired.policyVersion },
        });
        return mapPolicy(retired);
      }),
    );
  }
}
