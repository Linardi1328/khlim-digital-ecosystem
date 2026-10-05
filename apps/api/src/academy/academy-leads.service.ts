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
  parsePositiveInteger,
  sanitizeCampaignSource,
  sanitizeIdempotencyKey,
  validateChildAge,
  validateConsent,
  validateEmail,
  validateGuardianName,
  validateIsoTimestamp,
  validateLeadStatus,
  validateNotes,
  validateOptionalUuid,
  validateUuid,
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
   * Bounded purge of expired rate limit windows using the indexed expiresAt column.
   */
  async cleanupExpiredRateLimits(now = new Date()): Promise<number> {
    try {
      const res = await this.prisma.client.submissionRateLimit.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      return res.count;
    } catch {
      return 0;
    }
  }

  /**
   * Enforces server-side submission rate limits using hashed IPs and phones.
   * IP limit: 30 submissions per 10min window (accommodating shared event Wi-Fi networks).
   * Phone limit: 5 submissions per 1hr window.
   * Throws 429 Too Many Requests with retryAfter.
   * Never fails open in production: storage errors return safe 503 Service Unavailable.
   */
  async checkRateLimits(
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
      // Never fail open: storage or connectivity failure prevents write with retryable status
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            "Registration verification is temporarily unavailable. Please retry in a few moments.",
          retryAfter: 30,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Public create lead: durable persistence with idempotency receipt preservation and non-PII acknowledgment.
   */
  async createPublicLead(
    body: CreateAcademyLeadDto,
    clientIp?: string,
  ): Promise<CreateAcademyLeadResponseDto> {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Request body must be a valid JSON object");
    }

    // 1. Strict input validation
    const guardianName = validateGuardianName(body.guardianName);
    const phone = normalizePhoneNumber(body.phone);
    const email = validateEmail(body.email);
    const childAge = validateChildAge(body.childAge);
    validateConsent(body.consent);

    const source = sanitizeCampaignSource(body.source);
    const idempotencyKey = sanitizeIdempotencyKey(body.idempotencyKey);
    const programmeOfferingId = validateOptionalUuid(
      body.programmeOfferingId,
      "programmeOfferingId",
    );

    // 2. Tenant verification
    const organization = await this.prisma.client.organization.findUnique({
      where: { id: DEFAULT_ORGANIZATION_ID },
      select: { id: true, status: true },
    });
    if (!organization || organization.status !== "ACTIVE") {
      throw new BadRequestException(
        "KHLIM Academy organization is currently unavailable",
      );
    }

    // 3. Deterministic payload hash for idempotency checking
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

    // 4. IDEMPOTENCY RECEIPT CHECK FIRST:
    // Replay of an already-committed request must return its original receipt WITHOUT
    // consuming new rate-limit allowance or failing if the offering has since closed.
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

    // 5. Rate limit enforcement for new submission
    await this.checkRateLimits(clientIp, phone);

    // 6. Offering eligibility predicate (matches AcademyService.listPublicOfferings)
    if (programmeOfferingId) {
      const now = new Date();
      const offering = await this.prisma.client.programmeOffering.findFirst({
        where: {
          id: programmeOfferingId,
          organizationId: DEFAULT_ORGANIZATION_ID,
          status: "OPEN",
          programme: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            active: true,
            sport: { active: true },
          },
          OR: [
            { enrollmentOpensAt: null },
            { enrollmentOpensAt: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { enrollmentClosesAt: null },
                { enrollmentClosesAt: { gte: now } },
              ],
            },
          ],
        },
      });

      if (!offering) {
        throw new BadRequestException(
          "Selected programme offering is unavailable or closed",
        );
      }
    }

    // 7. Attempt creation with concurrent unique constraint race fallback
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
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        idempotencyKey
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
    query: AcademyLeadQueryDto = {},
  ): Promise<AcademyLeadListResponseDto> {
    const page = parsePositiveInteger(query.page, 1, 10000, "page");
    const limit = parsePositiveInteger(query.limit, 20, 100, "limit");
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
      where.programmeOfferingId = validateUuid(query.offeringId, "offeringId");
    }

    if (query.q) {
      if (typeof query.q !== "string") {
        throw new BadRequestException("Search query q must be a string");
      }
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
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Admin lead counts summary for dashboard cards and inbox filters.
   */
  async getAdminLeadSummary(
    organizationId: string,
  ): Promise<AcademyLeadSummaryResponseDto> {
    const counts = await this.prisma.client.academyLead.groupBy({
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

    let total = 0;
    for (const group of counts) {
      const status = group.status as AcademyLeadStatus;
      if (statusMap[status] !== undefined) {
        statusMap[status] = group._count._all;
        total += group._count._all;
      }
    }

    const newLeads = statusMap.NEW;
    const needsFollowUp =
      statusMap.NEW + statusMap.CONTACTED + statusMap.QUALIFIED;

    return {
      newLeads,
      needsFollowUp,
      byStatus: statusMap,
      total,
    };
  }

  /**
   * Admin lead detail: tenant-scoped retrieval.
   */
  async getAdminLeadDetail(
    organizationId: string,
    leadId: string,
  ): Promise<AcademyLeadItemDto> {
    const validLeadId = validateUuid(leadId, "id");
    const lead = await this.prisma.client.academyLead.findFirst({
      where: { id: validLeadId, organizationId },
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
   * Admin lead update: atomic compare-and-set with row-level locking, concurrency verification, and PII-clean audit.
   */
  async updateAdminLead(
    organizationId: string,
    leadId: string,
    actor: AuthenticatedUserContext,
    body: UpdateAcademyLeadDto,
  ): Promise<AcademyLeadItemDto> {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Request body must be a valid JSON object");
    }

    const validLeadId = validateUuid(leadId, "id");
    const expectedUpdatedAt = validateIsoTimestamp(
      body.expectedUpdatedAt,
      "expectedUpdatedAt",
    );

    const hasStatus = body.status !== undefined && body.status !== null;
    const hasNotes = body.notes !== undefined;

    if (!hasStatus && !hasNotes) {
      throw new BadRequestException(
        "At least status or notes must be provided for update",
      );
    }

    const nextStatus = hasStatus ? validateLeadStatus(body.status) : undefined;
    const nextNotes = hasNotes ? validateNotes(body.notes) : undefined;

    return this.prisma.client.$transaction(async (tx) => {
      // Atomic row lock via SELECT ... FOR UPDATE to eliminate TOCTOU race conditions
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          notes: string | null;
          updated_at: Date;
        }>
      >`
        SELECT id, status, notes, updated_at
        FROM academy_leads
        WHERE id = ${validLeadId}::uuid AND organization_id = ${organizationId}::uuid
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw new NotFoundException("Lead not found");
      }

      const existing = rows[0]!;
      const expectedMillis = new Date(expectedUpdatedAt).getTime();
      const actualMillis = existing.updated_at.getTime();

      if (actualMillis !== expectedMillis) {
        throw new ConflictException(
          "Lead was modified by another operator. Please refresh and review latest changes before saving.",
        );
      }

      const updated = await tx.academyLead.update({
        where: { id: validLeadId },
        data: {
          ...(nextStatus ? { status: nextStatus } : {}),
          ...(nextNotes !== undefined ? { notes: nextNotes } : {}),
          updatedAt: new Date(),
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
            entityId: validLeadId,
            summary: `Academy lead status changed from ${existing.status} to ${updated.status}${notesChanged ? " (operational notes updated)" : ""}.`,
            metadata: {
              previousStatus: existing.status,
              newStatus: updated.status,
              notesUpdated: Boolean(notesChanged),
            },
          },
        });
      }

      return mapLeadItem(updated);
    });
  }
}
