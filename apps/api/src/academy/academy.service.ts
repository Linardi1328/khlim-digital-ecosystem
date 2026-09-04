import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  optionalFutureOrPresentIsoDate,
  optionalInteger,
  optionalTrimmedString,
  requireInteger,
  requireTrimmedString,
} from "../common/input-validation";
import { PrismaService } from "../database/prisma.service";
import { DEFAULT_ORGANIZATION_ID } from "../organization/organization.constants";
import type {
  CreateCourtDto,
  CreateMembershipPlanDto,
  CreatePendingMembershipDto,
  CreateProgrammeDto,
  CreateProgrammeOfferingDto,
  CreateSportDto,
  CreateVenueDto,
  LinkPlanOfferingDto,
} from "./academy.dto";

const offeringStatuses = new Set(["DRAFT", "OPEN", "CLOSED", "INACTIVE"]);
const billingFrequencies = new Set(["MONTHLY", "UPFRONT"]);
const capacityHoldingMembershipStatuses = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
] as const;

@Injectable()
export class AcademyService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicOfferings() {
    const now = new Date();
    return this.prisma.client.programmeOffering.findMany({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        status: "OPEN",
        programme: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          active: true,
          sport: { active: true },
        },
        OR: [{ enrollmentOpensAt: null }, { enrollmentOpensAt: { lte: now } }],
        AND: [
          {
            OR: [
              { enrollmentClosesAt: null },
              { enrollmentClosesAt: { gte: now } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        capacity: true,
        startsOn: true,
        endsOn: true,
        programme: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            minimumAge: true,
            maximumAge: true,
            level: true,
            sport: { select: { code: true, defaultName: true } },
          },
        },
        venue: { select: { id: true, name: true, address: true } },
        planEligibilities: {
          where: {
            plan: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              active: true,
            },
          },
          select: {
            plan: {
              select: {
                id: true,
                name: true,
                durationMonths: true,
                commitmentCycles: true,
                billingFrequency: true,
                recurringAmountMinor: true,
                upfrontAmountMinor: true,
                currency: true,
                sessionAllowance: true,
                benefitsSummary: true,
              },
            },
          },
        },
      },
      orderBy: [{ startsOn: "asc" }, { name: "asc" }],
    });
  }

  async createSport(organizationId: string, body: CreateSportDto) {
    const code = requireTrimmedString(body?.code, "code", 60).toUpperCase();
    const defaultName = requireTrimmedString(
      body?.defaultName,
      "defaultName",
      120,
    );

    return this.prisma.client.$transaction(async (transaction) => {
      const sport = await transaction.sport.upsert({
        where: { code },
        create: { code, defaultName },
        update: { active: true },
      });

      await transaction.organizationSport.upsert({
        where: {
          organizationId_sportId: {
            organizationId,
            sportId: sport.id,
          },
        },
        create: {
          organizationId,
          sportId: sport.id,
          active: true,
        },
        update: { active: true },
      });

      return sport;
    });
  }

  createVenue(organizationId: string, body: CreateVenueDto) {
    const name = requireTrimmedString(body?.name, "name", 160);
    const address =
      optionalTrimmedString(body?.address, "address", 500) ?? null;
    return this.prisma.client.venue.create({
      data: { organizationId, name, address },
    });
  }

  async createCourt(
    organizationId: string,
    venueId: string,
    body: CreateCourtDto,
  ) {
    const name = requireTrimmedString(body?.name, "name", 120);
    const capacity =
      optionalInteger(body?.capacity, "capacity", 1, 10000) ?? null;

    const venue = await this.prisma.client.venue.findFirst({
      where: { id: venueId, organizationId },
      select: { id: true },
    });
    if (!venue) {
      throw new NotFoundException("Venue not found");
    }

    return this.prisma.client.court.create({
      data: { venueId, name, capacity },
    });
  }

  async createProgramme(organizationId: string, body: CreateProgrammeDto) {
    const sportId = requireTrimmedString(body?.sportId, "sportId", 100);
    const code = requireTrimmedString(body?.code, "code", 80).toUpperCase();
    const name = requireTrimmedString(body?.name, "name", 160);
    const description =
      optionalTrimmedString(body?.description, "description", 2000) ?? null;
    const minimumAge =
      optionalInteger(body?.minimumAge, "minimumAge", 1, 100) ?? null;
    const maximumAge =
      optionalInteger(body?.maximumAge, "maximumAge", 1, 100) ?? null;
    if (minimumAge !== null && maximumAge !== null && minimumAge > maximumAge) {
      throw new BadRequestException("minimumAge cannot exceed maximumAge");
    }
    const level = optionalTrimmedString(body?.level, "level", 100) ?? null;

    const organizationSport =
      await this.prisma.client.organizationSport.findUnique({
        where: {
          organizationId_sportId: {
            organizationId,
            sportId,
          },
        },
        select: { active: true },
      });
    if (!organizationSport?.active) {
      throw new BadRequestException(
        "Sport is not active for this organization",
      );
    }

    return this.prisma.client.programme.create({
      data: {
        organizationId,
        sportId,
        code,
        name,
        description,
        minimumAge,
        maximumAge,
        level,
      },
    });
  }

  async createOffering(
    organizationId: string,
    body: CreateProgrammeOfferingDto,
  ) {
    const programmeId = requireTrimmedString(
      body?.programmeId,
      "programmeId",
      100,
    );
    const venueId =
      optionalTrimmedString(body?.venueId, "venueId", 100) ?? null;
    const name = requireTrimmedString(body?.name, "name", 180);
    const capacity = requireInteger(body?.capacity, "capacity", 1, 10000);
    const startsOn =
      optionalFutureOrPresentIsoDate(body?.startsOn, "startsOn") ?? null;
    const endsOn =
      optionalFutureOrPresentIsoDate(body?.endsOn, "endsOn") ?? null;
    if (startsOn && endsOn && startsOn > endsOn) {
      throw new BadRequestException("startsOn cannot be after endsOn");
    }
    const status = body?.status ?? "DRAFT";
    if (typeof status !== "string" || !offeringStatuses.has(status)) {
      throw new BadRequestException("status is invalid");
    }

    return this.prisma.client.$transaction(async (transaction) => {
      const programme = await transaction.programme.findFirst({
        where: { id: programmeId, organizationId },
        select: { id: true },
      });
      if (!programme) {
        throw new NotFoundException("Programme not found");
      }

      if (venueId) {
        const venue = await transaction.venue.findFirst({
          where: { id: venueId, organizationId },
          select: { id: true },
        });
        if (!venue) {
          throw new NotFoundException("Venue not found");
        }
      }

      return transaction.programmeOffering.create({
        data: {
          organizationId,
          programmeId,
          venueId,
          name,
          capacity,
          startsOn,
          endsOn,
          status: status as "DRAFT" | "OPEN" | "CLOSED" | "INACTIVE",
        },
      });
    });
  }

  createMembershipPlan(organizationId: string, body: CreateMembershipPlanDto) {
    const name = requireTrimmedString(body?.name, "name", 160);
    const durationMonths =
      optionalInteger(body?.durationMonths, "durationMonths", 1, 120) ?? null;
    const commitmentCycles =
      optionalInteger(body?.commitmentCycles, "commitmentCycles", 1, 120) ??
      null;
    const billingFrequency = requireTrimmedString(
      body?.billingFrequency,
      "billingFrequency",
      30,
    ).toUpperCase();
    if (!billingFrequencies.has(billingFrequency)) {
      throw new BadRequestException("billingFrequency is invalid");
    }
    const recurringAmountMinor =
      optionalInteger(
        body?.recurringAmountMinor,
        "recurringAmountMinor",
        0,
        100000000,
      ) ?? null;
    const upfrontAmountMinor =
      optionalInteger(
        body?.upfrontAmountMinor,
        "upfrontAmountMinor",
        0,
        100000000,
      ) ?? null;
    if (billingFrequency === "MONTHLY" && recurringAmountMinor === null) {
      throw new BadRequestException(
        "MONTHLY plans require recurringAmountMinor",
      );
    }
    if (billingFrequency === "UPFRONT" && upfrontAmountMinor === null) {
      throw new BadRequestException("UPFRONT plans require upfrontAmountMinor");
    }
    const currency = (
      optionalTrimmedString(body?.currency, "currency", 3) ?? "MYR"
    ).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException("currency must be a three-letter code");
    }
    const sessionAllowance =
      optionalInteger(body?.sessionAllowance, "sessionAllowance", 1, 10000) ??
      null;
    const benefitsSummary =
      optionalTrimmedString(body?.benefitsSummary, "benefitsSummary", 2000) ??
      null;
    return this.prisma.client.membershipPlan.create({
      data: {
        organizationId,
        name,
        durationMonths,
        commitmentCycles,
        billingFrequency: billingFrequency as "MONTHLY" | "UPFRONT",
        recurringAmountMinor,
        upfrontAmountMinor,
        currency,
        sessionAllowance,
        benefitsSummary,
      },
    });
  }

  async linkPlanToOffering(organizationId: string, body: LinkPlanOfferingDto) {
    const planId = requireTrimmedString(body?.planId, "planId", 100);
    const offeringId = requireTrimmedString(
      body?.offeringId,
      "offeringId",
      100,
    );

    const [plan, offering] = await Promise.all([
      this.prisma.client.membershipPlan.findFirst({
        where: { id: planId, organizationId },
        select: { id: true },
      }),
      this.prisma.client.programmeOffering.findFirst({
        where: { id: offeringId, organizationId },
        select: { id: true },
      }),
    ]);
    if (!plan || !offering) {
      throw new NotFoundException("Plan or programme offering not found");
    }

    return this.prisma.client.membershipPlanOfferingEligibility.upsert({
      where: { planId_offeringId: { planId, offeringId } },
      create: { planId, offeringId },
      update: {},
    });
  }

  listAthleteMemberships(organizationId: string, athleteId: string) {
    return this.prisma.client.membership.findMany({
      where: { organizationId, athleteId },
      include: {
        membershipPlan: true,
        programmeOffering: { include: { programme: true, venue: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createPendingMembership(
    organizationIdOrPurchaserUserId: string,
    purchaserUserIdOrAthleteId: string,
    athleteIdOrBody: string | CreatePendingMembershipDto,
    maybeBody?: CreatePendingMembershipDto,
  ) {
    const usingCompatibilityFallback = maybeBody === undefined;
    const organizationId = usingCompatibilityFallback
      ? DEFAULT_ORGANIZATION_ID
      : organizationIdOrPurchaserUserId;
    const purchaserUserId = usingCompatibilityFallback
      ? organizationIdOrPurchaserUserId
      : purchaserUserIdOrAthleteId;
    const athleteId = usingCompatibilityFallback
      ? purchaserUserIdOrAthleteId
      : (athleteIdOrBody as string);
    const body = usingCompatibilityFallback
      ? (athleteIdOrBody as CreatePendingMembershipDto)
      : (maybeBody as CreatePendingMembershipDto);

    const offeringId = requireTrimmedString(
      body?.offeringId,
      "offeringId",
      100,
    );
    const planId = requireTrimmedString(body?.planId, "planId", 100);

    return this.prisma.client.$transaction(async (transaction) => {
      // Serialize membership creation per tenant-owned offering. The
      // organization predicate also makes a foreign tenant ID fail closed.
      const lockedOfferings = await transaction.$queryRaw<
        Array<{ id: string }>
      >`
        SELECT id::text
        FROM programme_offerings
        WHERE id = ${offeringId}::uuid
          AND organization_id = ${organizationId}::uuid
        FOR UPDATE
      `;
      if (lockedOfferings.length === 0) {
        throw new NotFoundException("Programme offering not found");
      }

      const eligibility =
        await transaction.membershipPlanOfferingEligibility.findFirst({
          where: {
            planId,
            offeringId,
            plan: { organizationId, active: true },
            offering: { organizationId, status: "OPEN" },
          },
          include: { plan: true, offering: true },
        });
      if (!eligibility) {
        throw new BadRequestException(
          "Selected plan is not available for this offering",
        );
      }

      const duplicate = await transaction.membership.findFirst({
        where: {
          organizationId,
          athleteId,
          programmeOfferingId: offeringId,
          status: { in: [...capacityHoldingMembershipStatuses] },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException(
          "Athlete already has a current membership for this offering",
        );
      }

      const occupiedSeats = await transaction.membership.count({
        where: {
          organizationId,
          programmeOfferingId: offeringId,
          status: { in: [...capacityHoldingMembershipStatuses] },
        },
      });
      if (occupiedSeats >= eligibility.offering.capacity) {
        throw new ConflictException("Programme offering is at capacity");
      }

      return transaction.membership.create({
        data: {
          organizationId,
          athleteId,
          programmeOfferingId: offeringId,
          membershipPlanId: planId,
          purchasedByUserId: purchaserUserId,
          status: "PENDING",
        },
        include: { membershipPlan: true, programmeOffering: true },
      });
    });
  }

  async getMembership(
    membershipId: string,
    organizationId = DEFAULT_ORGANIZATION_ID,
  ) {
    const membership = await this.prisma.client.membership.findFirst({
      where: { id: membershipId, organizationId },
      include: { athlete: true, membershipPlan: true, programmeOffering: true },
    });
    if (!membership) throw new NotFoundException("Membership not found");
    return membership;
  }
}
