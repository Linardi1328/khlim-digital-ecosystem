import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as crypto from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import type { AuthenticatedUserContext } from "../auth/authenticated-user";
import { PrismaService } from "../database/prisma.service";
import { DEFAULT_ORGANIZATION_ID } from "../organization/organization.constants";
import {
  ACADEMY_LEAD_STATUSES,
  type AcademyLeadItemDto,
  type AcademyLeadListResponseDto,
  type AcademyLeadQueryDto,
  type AcademyLeadStatus,
  type AcademyLeadSummaryResponseDto,
  type CreateAcademyLeadDto,
  type CreateAcademyLeadResponseDto,
  type UpdateAcademyLeadDto,
} from "./academy-leads.dto";
import {
  CONSENT_VERSION,
  normalizePhoneNumber,
  sanitizeCampaignSource,
  sanitizeIdempotencyKey,
  validateChildAge,
  validateConsent,
  validateEmail,
  validateGuardianName,
  validateLeadStatus,
  validateNotes,
} from "./academy-leads.validation";

type LeadWithOffering = Prisma.AcademyLeadGetPayload<{
  include: {
    programmeOffering: {
      select: {
        id: true;
        name: true;
        programme: { select: { id: true; name: true } };
      };
    };
  };
}>;

function mapLeadItem(lead: LeadWithOffering): AcademyLeadItemDto {
  return {
    id: lead.id,
    organizationId: lead.organizationId,
    guardianName: lead.guardianName,
    phone: lead.phone,
    email: lead.email,
    childAge: lead.childAge,
    programmeOfferingId: lead.programmeOfferingId,
    offeringName: lead.programmeOffering?.name ?? null,
    programmeName: lead.programmeOffering?.programme?.name ?? null,
    source: lead.source,
    status: lead.status as AcademyLeadStatus,
    notes: lead.notes,
    consentAt: lead.consentAt.toISOString(),
    consentVersion: lead.consentVersion,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

@Injectable()
export class AcademyLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enforces minimal server-side submission rate limits using hashed IPs and phones.
   * Tolerates high event Wi-Fi traffic (30 submissions/10min per IP; 5 submissions/hr per phone).
   */
  private async checkRateLimits(
    clientIp: string | undefined,
    normalizedPhone: string,
  ): Promise<void> {
    const now = new Date();

    try {
      if (clientIp) {
        const ipHash = crypto
          .createHash("sha256")
          .update(clientIp.trim())
          .digest("hex")
          .slice(0, 32);
        const windowSlot = Math.floor(now.getTime() / (10 * 60 * 1000));
        const ipKey = `lead:ip:${ipHash}:${windowSlot}`;
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

        const record = await this.prisma.client.submissionRateLimit.upsert({
          where: { key: ipKey },
          create: { key: ipKey, count: 1, expiresAt },
          update: { count: { increment: 1 } },
        });

        if (record.count > 30) {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message:
                "Too many registrations from this connection. Please wait a few minutes before trying again.",
              retryAfter: 600,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      const phoneHash = crypto
        .createHash("sha256")
        .update(normalizedPhone)
        .digest("hex")
        .slice(0, 32);
      const hourSlot = Math.floor(now.getTime() / (60 * 60 * 1000));
      const phoneKey = `lead:phone:${phoneHash}:${hourSlot}`;
      const phoneExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);

      const phoneRecord = await this.prisma.client.submissionRateLimit.upsert({
        where: { key: phoneKey },
        create: { key: phoneKey, count: 1, expiresAt: phoneExpiresAt },
        update: { count: { increment: 1 } },
      });

      if (phoneRecord.count > 5) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:
              "Too many registrations for this contact number. Please wait before submitting another enquiry.",
            retryAfter: 3600,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // If table is unmigrated or DB issue during tests without DB, fail open or log
    }
  }

  /**
   * Public create lead: durable persistence with idempotency and non-PII acknowledgement.
   */
  async createPublicLead(
    body: CreateAcademyLeadDto,
    clientIp?: string,
  ): Promise<CreateAcademyLeadResponseDto> {
    const guardianName = validateGuardianName(body?.guardianName);
    const phone = normalizePhoneNumber(body?.phone);
    const email = validateEmail(body?.email);
    const childAge = validateChildAge(body?.childAge);
    validateConsent(body?.consent);
    const source = sanitizeCampaignSource(body?.source);
    const idempotencyKey = sanitizeIdempotencyKey(body?.idempotencyKey);
    const programmeOfferingId = body?.programmeOfferingId?.trim() || null;

    await this.checkRateLimits(clientIp, phone);

    // Resolve tenant server-side and verify active status
    const organization = await this.prisma.client.organization.findUnique({
      where: { id: DEFAULT_ORGANIZATION_ID },
      select: { id: true, status: true },
    });
    if (!organization || organization.status !== "ACTIVE") {
      throw new BadRequestException(
        "Academy organization is currently inactive",
      );
    }

    // Verify programme offering ownership & public eligibility if provided
    if (programmeOfferingId) {
      const offering = await this.prisma.client.programmeOffering.findFirst({
        where: {
          id: programmeOfferingId,
          organizationId: DEFAULT_ORGANIZATION_ID,
          status: "OPEN",
          programme: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            active: true,
          },
        },
        select: { id: true },
      });
      if (!offering) {
        throw new BadRequestException(
          "Selected programme offering is unavailable or invalid",
        );
      }
    }

    // Calculate deterministic payload hash for idempotency checking
    const payloadHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          guardianName,
          phone,
          email,
          childAge,
          programmeOfferingId,
          source,
        }),
      )
      .digest("hex");

    // Check existing record with the same idempotency token
    if (idempotencyKey) {
      const existing = await this.prisma.client.academyLead.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            idempotencyKey,
          },
        },
      });

      if (existing) {
        if (existing.payloadHash === payloadHash) {
          return {
            id: existing.id,
            status: "RECEIVED",
            message:
              "Thank you for registering your interest with KHLIM Academy. Our team will follow up with you.",
            createdAt: existing.createdAt.toISOString(),
          };
        }
        throw new ConflictException(
          "Submission token already used with a different payload",
        );
      }
    }

    // Attempt creation with concurrent unique constraint fallback
    try {
      const lead = await this.prisma.client.academyLead.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          guardianName,
          phone,
          email,
          childAge,
          programmeOfferingId,
          source,
          status: "NEW",
          consentAt: new Date(),
          consentVersion: CONSENT_VERSION,
          idempotencyKey,
          payloadHash,
        },
      });

      return {
        id: lead.id,
        status: "RECEIVED",
        message:
          "Thank you for registering your interest with KHLIM Academy. Our team will follow up with you.",
        createdAt: lead.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.prisma.client.academyLead.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              idempotencyKey,
            },
          },
        });
        if (existing && existing.payloadHash === payloadHash) {
          return {
            id: existing.id,
            status: "RECEIVED",
            message:
              "Thank you for registering your interest with KHLIM Academy. Our team will follow up with you.",
            createdAt: existing.createdAt.toISOString(),
          };
        }
        throw new ConflictException(
          "Submission token already used with a different payload",
        );
      }
      throw error;
    }
  }

  /**
   * Admin listing: bounded, paginated, newest-first, tenant-scoped.
   */
  async listAdminLeads(
    organizationId: string,
    query: AcademyLeadQueryDto,
  ): Promise<AcademyLeadListResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AcademyLeadWhereInput = {
      organizationId,
    };

    if (query.status === "NEEDS_FOLLOW_UP") {
      where.status = { in: ["NEW", "CONTACTED", "QUALIFIED"] };
    } else if (query.status) {
      where.status = validateLeadStatus(query.status);
    }

    if (query.source) {
      where.source = sanitizeCampaignSource(query.source) ?? undefined;
    }

    if (query.offeringId) {
      where.programmeOfferingId = query.offeringId.trim();
    }

    if (query.q) {
      const searchTerm = query.q.trim().slice(0, 100);
      if (searchTerm) {
        where.OR = [
          { guardianName: { contains: searchTerm, mode: "insensitive" } },
          { phone: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
        ];
      }
    }

    const [total, records] = await Promise.all([
      this.prisma.client.academyLead.count({ where }),
      this.prisma.client.academyLead.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          programmeOffering: {
            select: {
              id: true,
              name: true,
              programme: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      items: records.map(mapLeadItem),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin summary: role-gated counts for NEW and Needs Follow-up pipeline.
   */
  async getAdminLeadsSummary(
    organizationId: string,
  ): Promise<AcademyLeadSummaryResponseDto> {
    const grouped = await this.prisma.client.academyLead.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    });

    const statusMap: Record<AcademyLeadStatus, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      ENROLLED: 0,
      CLOSED: 0,
    };

    for (const item of grouped) {
      if (ACADEMY_LEAD_STATUSES.includes(item.status as AcademyLeadStatus)) {
        statusMap[item.status as AcademyLeadStatus] = item._count._all;
      }
    }

    const newLeads = statusMap.NEW;
    const needsFollowUp =
      statusMap.NEW + statusMap.CONTACTED + statusMap.QUALIFIED;
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    return {
      newLeads,
      needsFollowUp,
      byStatus: statusMap,
      total,
    };
  }

  /**
   * Admin lead detail: tenant-scoped single item.
   */
  async getAdminLeadDetail(
    organizationId: string,
    leadId: string,
  ): Promise<AcademyLeadItemDto> {
    const lead = await this.prisma.client.academyLead.findFirst({
      where: { id: leadId, organizationId },
      include: {
        programmeOffering: {
          select: {
            id: true,
            name: true,
            programme: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException("Lead not found");
    }

    return mapLeadItem(lead);
  }

  /**
   * Admin lead update: status and notes modification with concurrency conflict protection and PII-clean audit.
   */
  async updateAdminLead(
    organizationId: string,
    leadId: string,
    actor: AuthenticatedUserContext,
    body: UpdateAcademyLeadDto,
  ): Promise<AcademyLeadItemDto> {
    const nextStatus = body.status
      ? validateLeadStatus(body.status)
      : undefined;
    const nextNotes =
      body.notes !== undefined ? validateNotes(body.notes) : undefined;

    return this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.academyLead.findFirst({
        where: { id: leadId, organizationId },
        include: {
          programmeOffering: {
            select: {
              id: true,
              name: true,
              programme: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundException("Lead not found");
      }

      // Concurrency conflict detection using ISO timestamp
      if (body.expectedUpdatedAt) {
        const expected = new Date(body.expectedUpdatedAt).getTime();
        const actual = existing.updatedAt.getTime();
        if (actual !== expected) {
          throw new ConflictException(
            "Lead was modified by another operator. Please refresh and review latest changes before saving.",
          );
        }
      }

      const updated = await tx.academyLead.update({
        where: { id: existing.id },
        data: {
          ...(nextStatus ? { status: nextStatus } : {}),
          ...(nextNotes !== undefined ? { notes: nextNotes } : {}),
        },
        include: {
          programmeOffering: {
            select: {
              id: true,
              name: true,
              programme: { select: { id: true, name: true } },
            },
          },
        },
      });

      const statusChanged = nextStatus && nextStatus !== existing.status;
      const notesChanged =
        nextNotes !== undefined && nextNotes !== existing.notes;

      if (statusChanged || notesChanged) {
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorUserId: actor.id,
            actorEmail: actor.email,
            actorRoles: actor.roles.join(", ") || "STAFF",
            action: "ACADEMY_LEAD_UPDATED",
            entityType: "ACADEMY_LEAD",
            entityId: existing.id,
            summary: `Academy lead status changed from ${existing.status} to ${updated.status}${notesChanged ? " (operational notes updated)" : ""}.`,
            metadata: {
              previousStatus: existing.status,
              newStatus: updated.status,
              notesUpdated: notesChanged,
            },
          },
        });
      }

      return mapLeadItem(updated);
    });
  }
}
