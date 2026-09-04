import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  DEFAULT_ORGANIZATION_ID,
  MULTI_ORGANIZATION_RUNTIME_ENABLED,
} from "../organization/organization.constants";

const COMPATIBILITY_TENANT_MODELS = new Set([
  "venue",
  "programme",
  "programmeoffering",
  "membershipplan",
  "membership",
  "trainingsession",
  "notification",
]);

function applyCompatibilityOrganization(data: unknown): void {
  const records = Array.isArray(data) ? data : [data];

  for (const record of records) {
    if (!record || typeof record !== "object") continue;

    const mutableRecord = record as Record<string, unknown>;
    if (
      !("organizationId" in mutableRecord) &&
      !("organization" in mutableRecord)
    ) {
      mutableRecord.organizationId = DEFAULT_ORGANIZATION_ID;
    }
  }
}

function withOrganizationCompatibility(client: PrismaClient): PrismaClient {
  if (MULTI_ORGANIZATION_RUNTIME_ENABLED) return client;

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model && COMPATIBILITY_TENANT_MODELS.has(model.toLowerCase())) {
            const mutableArgs = args as {
              create?: unknown;
              data?: unknown;
            };

            if (operation === "create" || operation === "createMany") {
              applyCompatibilityOrganization(mutableArgs.data);
            } else if (operation === "upsert") {
              applyCompatibilityOrganization(mutableArgs.create);
            }
          }

          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private prismaClient: PrismaClient | null = null;

  get client(): PrismaClient {
    if (!this.prismaClient) {
      const connectionString = process.env.DATABASE_URL?.trim();

      if (!connectionString) {
        throw new Error("DATABASE_URL is required before database access");
      }

      const adapter = new PrismaPg({ connectionString });
      const client = new PrismaClient({ adapter });
      this.prismaClient = withOrganizationCompatibility(client);
    }

    return this.prismaClient;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
    }
  }
}
