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
        status: "OPEN",
        programme: { active: true, sport: { active: true } },
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
          where: { plan: { active: true } },
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

  createSport(body: CreateSportDto) {
    const code = requireTrimmedString(body?.code, "code", 60).toUpperCase();
    const defaultName = requireTrimmedString(
      body?.defaultName,
      "defaultName",
      120,
    );
    return this.prisma.client.sport.create({ data: { code, defaultName } });
  }

  createVenue(body: CreateVenueDto) {
    const name = requireTrimmedString(body?.name, "name", 160);
    const address =
      optionalTrimmedString(body?.address, "address", 500) ?? null;
    return this.prisma.client.venue.create({ data: { name, address } });
  }

  createCourt(venueId: string, body: CreateCourtDto) {
    const name = requireTrimmedString(body?.name, "name", 120);
    const capacity =
      optionalInteger(body?.capacity, "capacity", 1, 10000) ?? null;
    return this.prisma.client.court.create({
      data: { venueId, name, capacity },
    });
  }

  createProgramme(body: CreateProgrammeDto) {
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
    return this.prisma.client.programme.create({
      data: { sportId, code, name, description, minimumAge, maximumAge, level },
    });
  }

  createOffering(body: CreateProgrammeOfferingDto) {
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
    return this.prisma.client.programmeOffering.create({
      data: {
        programmeId,
        venueId,
        name,
        capacity,
        startsOn,
        endsOn,
        status: status as "DRAFT" | "OPEN" | "CLOSED" | "INACTIVE",
      },
    });
  }

  createMembershipPlan(body: CreateMembershipPlanDto) {
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

  async linkPlanToOffering(body: LinkPlanOfferingDto) {
    const planId = requireTrimmedString(body?.planId, "planId", 100);
    const offeringId = requireTrimmedString(
      body?.offeringId,
      "offeringId",
      100,
    );
    return this.prisma.client.membershipPlanOfferingEligibility.upsert({
      where: { planId_offeringId: { planId, offeringId } },
      create: { planId, offeringId },
      update: {},
    });
  }

  listAthleteMemberships(athleteId: string) {
    return this.prisma.client.membership.findMany({
      where: { athleteId },
      include: {
        membershipPlan: true,
        programmeOffering: { include: { programme: true, venue: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createPendingMembership(
    purchaserUserId: string,
    athleteId: string,
    body: CreatePendingMembershipDto,
  ) {
    const offeringId = requireTrimmedString(
      body?.offeringId,
      "offeringId",
      100,
    );
    const planId = requireTrimmedString(body?.planId, "planId", 100);

    return this.prisma.client.$transaction(async (transaction) => {
      // Serialize membership creation per offering. Without this row lock, two
      // concurrent requests can both observe the final available seat and
      // create memberships beyond the configured capacity.
      await transaction.$queryRaw`
        SELECT id
        FROM programme_offerings
        WHERE id = ${offeringId}::uuid
        FOR UPDATE
      `;

      const eligibility =
        await transaction.membershipPlanOfferingEligibility.findUnique({
          where: { planId_offeringId: { planId, offeringId } },
          include: { plan: true, offering: true },
        });
      if (
        !eligibility ||
        !eligibility.plan.active ||
        eligibility.offering.status !== "OPEN"
      ) {
        throw new BadRequestException(
          "Selected plan is not available for this offering",
        );
      }

      const duplicate = await transaction.membership.findFirst({
        where: {
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
          programmeOfferingId: offeringId,
          status: { in: [...capacityHoldingMembershipStatuses] },
        },
      });
      if (occupiedSeats >= eligibility.offering.capacity) {
        throw new ConflictException("Programme offering is at capacity");
      }

      return transaction.membership.create({
        data: {
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

  async getMembership(membershipId: string) {
    const membership = await this.prisma.client.membership.findUnique({
      where: { id: membershipId },
      include: { athlete: true, membershipPlan: true, programmeOffering: true },
    });
    if (!membership) throw new NotFoundException("Membership not found");
    return membership;
  }
}
