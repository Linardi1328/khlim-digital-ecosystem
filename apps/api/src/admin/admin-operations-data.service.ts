import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { KHLIM_USER_ROLES, type KhlimUserRole } from "../auth/roles";

const CAPACITY_HOLDING_MEMBERSHIP_STATUSES = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
] as const;
const STAFF_ROLES = new Set<KhlimUserRole>(
  KHLIM_USER_ROLES.filter(
    (role) => role !== "GUARDIAN" && role !== "ATHLETE",
  ),
);

function dateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const month = today.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (
    month < 0 ||
    (month === 0 && today.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }
  return Math.max(0, age);
}

function displayName(user: {
  email: string | null;
  guardianProfile: { displayName: string } | null;
  coachProfile: { displayName: string } | null;
  athleteProfile: { displayName: string } | null;
}): string {
  return (
    user.coachProfile?.displayName ??
    user.guardianProfile?.displayName ??
    user.athleteProfile?.displayName ??
    user.email?.split("@")[0] ??
    "KHLIM User"
  );
}

function sessionDateTime(value: Date, timezone: string) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
  return { date, time };
}

@Injectable()
export class AdminOperationsDataService {
  constructor(private readonly prisma: PrismaService) {}

  async listSports(organizationId: string) {
    const rows = await this.prisma.client.organizationSport.findMany({
      where: {
        organizationId,
        active: true,
        sport: { active: true },
      },
      select: {
        sport: {
          select: { id: true, code: true, defaultName: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return rows.map(({ sport }) => ({
      id: sport.id,
      code: sport.code,
      name: sport.defaultName,
    }));
  }

  async listProgrammes(organizationId: string) {
    const rows = await this.prisma.client.programme.findMany({
      where: { organizationId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        minimumAge: true,
        maximumAge: true,
        level: true,
        active: true,
        sport: { select: { code: true, defaultName: true } },
        _count: {
          select: {
            offerings: {
              where: {
                organizationId,
                status: { in: ["DRAFT", "OPEN", "CLOSED"] },
              },
            },
          },
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      sportCode: row.sport.code,
      sportName: row.sport.defaultName,
      minimumAge: row.minimumAge,
      maximumAge: row.maximumAge,
      level: row.level ?? "Unspecified",
      active: row.active,
      offeringsCount: row._count.offerings,
    }));
  }

  async listOfferings(organizationId: string) {
    const rows = await this.prisma.client.programmeOffering.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        capacity: true,
        startsOn: true,
        endsOn: true,
        status: true,
        programme: { select: { id: true, name: true } },
        venue: { select: { id: true, name: true } },
        _count: {
          select: {
            memberships: {
              where: {
                organizationId,
                status: { in: [...CAPACITY_HOLDING_MEMBERSHIP_STATUSES] },
              },
            },
          },
        },
      },
      orderBy: [{ startsOn: "asc" }, { name: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      programmeId: row.programme.id,
      programmeName: row.programme.name,
      venueId: row.venue?.id,
      venueName: row.venue?.name,
      courtName: undefined,
      name: row.name,
      capacity: row.capacity,
      enrolledCount: row._count.memberships,
      availablePlaces: Math.max(0, row.capacity - row._count.memberships),
      startsOn: dateOnly(row.startsOn) ?? "",
      endsOn: dateOnly(row.endsOn),
      status: row.status,
    }));
  }

  async listMembershipPlans(organizationId: string) {
    const rows = await this.prisma.client.membershipPlan.findMany({
      where: { organizationId },
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
        active: true,
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    return rows.map((row) => ({
      ...row,
      durationMonths: row.durationMonths ?? 0,
      commitmentCycles: row.commitmentCycles ?? 0,
      recurringAmountMinor: row.recurringAmountMinor ?? 0,
      upfrontAmountMinor: row.upfrontAmountMinor ?? 0,
    }));
  }

  async listMemberships(organizationId: string) {
    const rows = await this.prisma.client.membership.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        athlete: { select: { id: true, displayName: true } },
        programmeOffering: {
          select: {
            id: true,
            name: true,
            programme: { select: { name: true } },
          },
        },
        membershipPlan: {
          select: {
            id: true,
            name: true,
            recurringAmountMinor: true,
            upfrontAmountMinor: true,
            currency: true,
          },
        },
        purchasedBy: {
          select: {
            id: true,
            email: true,
            guardianProfile: { select: { displayName: true } },
            coachProfile: { select: { displayName: true } },
            athleteProfile: { select: { displayName: true } },
          },
        },
        agreements: {
          select: { termsVersion: true },
          orderBy: { acceptedAt: "desc" },
          take: 1,
        },
        paymentSchedule: {
          select: {
            installments: {
              where: { status: "OVERDUE" },
              select: { id: true },
              take: 1,
            },
          },
        },
        payments: {
          select: { status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => {
      const latestPayment = row.payments[0]?.status;
      const hasOverdueInstallment =
        (row.paymentSchedule?.installments.length ?? 0) > 0;
      const paymentIndicator =
        latestPayment === "FAILED"
          ? "FAILED"
          : hasOverdueInstallment
            ? "OVERDUE"
            : latestPayment === "PAID"
              ? "PAID"
              : "PENDING";
      const purchaser = row.purchasedBy;

      return {
        id: row.id,
        athleteId: row.athlete.id,
        athleteName: row.athlete.displayName,
        guardianId: purchaser?.id,
        guardianName: purchaser ? displayName(purchaser) : undefined,
        guardianEmail: purchaser?.email ?? undefined,
        programmeOfferingId: row.programmeOffering.id,
        programmeName: row.programmeOffering.programme.name,
        offeringName: row.programmeOffering.name,
        membershipPlanId: row.membershipPlan.id,
        planName: row.membershipPlan.name,
        status: row.status,
        startsOn: dateOnly(row.startsAt) ?? "",
        endsOn: dateOnly(row.endsAt),
        paymentIndicator,
        termsAcceptedVersion: row.agreements[0]?.termsVersion ?? "Not accepted",
        recurringAmountMinor:
          row.membershipPlan.recurringAmountMinor ??
          row.membershipPlan.upfrontAmountMinor ??
          0,
        currency: row.membershipPlan.currency,
      };
    });
  }

  async listAthletes(organizationId: string) {
    const rows = await this.prisma.client.athleteProfile.findMany({
      where: { memberships: { some: { organizationId } } },
      select: {
        id: true,
        displayName: true,
        dateOfBirth: true,
        preferredLocale: true,
        user: { select: { status: true } },
        guardianLinks: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            relationshipType: true,
            guardian: {
              select: {
                id: true,
                guardianProfile: {
                  select: { displayName: true, phone: true },
                },
              },
            },
          },
        },
        memberships: {
          where: { organizationId },
          select: { status: true },
        },
      },
      orderBy: { displayName: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      dateOfBirth: dateOnly(row.dateOfBirth) ?? "",
      age: calculateAge(row.dateOfBirth),
      gender: null,
      preferredLocale: row.preferredLocale,
      guardians: row.guardianLinks.map((link) => ({
        id: link.id,
        guardianId: link.guardian.id,
        guardianName:
          link.guardian.guardianProfile?.displayName ?? "KHLIM Guardian",
        relationshipType: link.relationshipType ?? "Guardian",
        phone: link.guardian.guardianProfile?.phone ?? undefined,
      })),
      membershipsCount: row.memberships.length,
      activeMembershipsCount: row.memberships.filter(
        (membership) => membership.status === "ACTIVE",
      ).length,
      status: row.user?.status === "DEACTIVATED" ? "INACTIVE" : "ACTIVE",
    }));
  }

  async listGuardians(organizationId: string) {
    const rows = await this.prisma.client.user.findMany({
      where: {
        guardianProfile: { isNot: null },
        guardianAthleteLinks: {
          some: {
            status: "ACTIVE",
            athlete: { memberships: { some: { organizationId } } },
          },
        },
      },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        guardianProfile: {
          select: { displayName: true, phone: true },
        },
        guardianAthleteLinks: {
          where: {
            status: "ACTIVE",
            athlete: { memberships: { some: { organizationId } } },
          },
          select: {
            relationshipType: true,
            athlete: {
              select: { id: true, displayName: true, dateOfBirth: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      displayName: row.guardianProfile?.displayName ?? "KHLIM Guardian",
      email: row.email ?? "",
      phone: row.guardianProfile?.phone ?? null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      managedAthletes: row.guardianAthleteLinks.map((link) => ({
        id: link.athlete.id,
        displayName: link.athlete.displayName,
        dateOfBirth: dateOnly(link.athlete.dateOfBirth) ?? "",
        relationshipType: link.relationshipType ?? "Guardian",
      })),
      accountStatus: row.status,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async listPayments(organizationId: string) {
    const rows = await this.prisma.client.payment.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        providerPaymentId: true,
        amountMinor: true,
        currency: true,
        status: true,
        attemptNumber: true,
        settledAt: true,
        safeFailureReason: true,
        createdAt: true,
        payer: {
          select: {
            email: true,
            guardianProfile: { select: { displayName: true } },
            coachProfile: { select: { displayName: true } },
            athleteProfile: { select: { displayName: true } },
          },
        },
        membership: {
          select: {
            id: true,
            athlete: { select: { displayName: true } },
            programmeOffering: {
              select: { programme: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { attemptedAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      paymentId: row.providerPaymentId ?? row.id,
      payerName: displayName(row.payer),
      payerEmail: row.payer.email ?? "",
      athleteName: row.membership?.athlete.displayName ?? "Not linked",
      membershipId: row.membership?.id ?? "",
      programmeName:
        row.membership?.programmeOffering.programme.name ?? "Not linked",
      amountMinor: row.amountMinor,
      currency: row.currency,
      provider: row.provider,
      providerReference: row.providerPaymentId,
      status: row.status,
      attemptNumber: row.attemptNumber,
      settledAt: row.settledAt?.toISOString() ?? null,
      failureReason: row.safeFailureReason,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async listVenues(organizationId: string) {
    const [venues, upcomingSessions] = await Promise.all([
      this.prisma.client.venue.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          address: true,
          courts: {
            where: { active: true },
            select: { id: true, name: true, capacity: true },
            orderBy: { name: "asc" },
          },
          _count: {
            select: {
              offerings: {
                where: { organizationId, status: "OPEN" },
              },
            },
          },
        },
        orderBy: [{ active: "desc" }, { name: "asc" }],
      }),
      this.prisma.client.trainingSession.findMany({
        where: {
          organizationId,
          status: "SCHEDULED",
          startsAt: { gte: new Date() },
        },
        select: { venueName: true },
      }),
    ]);

    const upcomingByVenue = new Map<string, number>();
    for (const session of upcomingSessions) {
      upcomingByVenue.set(
        session.venueName,
        (upcomingByVenue.get(session.venueName) ?? 0) + 1,
      );
    }

    return venues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      address: venue.address,
      courts: venue.courts.map((court) => ({
        id: court.id,
        venueId: venue.id,
        name: court.name,
        capacity: court.capacity ?? 0,
      })),
      activeOfferingsCount: venue._count.offerings,
      upcomingSessionsCount: upcomingByVenue.get(venue.name) ?? 0,
      closurePeriods: [],
    }));
  }

  async listSessions(organizationId: string) {
    const [sessions, setting] = await Promise.all([
      this.prisma.client.trainingSession.findMany({
        where: { organizationId },
        select: {
          id: true,
          programmeOfferingId: true,
          title: true,
          startsAt: true,
          endsAt: true,
          venueName: true,
          courtName: true,
          coachName: true,
          status: true,
        },
        orderBy: { startsAt: "desc" },
      }),
      this.prisma.client.organizationSetting.findUnique({
        where: { organizationId },
        select: { timezone: true },
      }),
    ]);

    const offeringIds = Array.from(
      new Set(
        sessions
          .map((session) => session.programmeOfferingId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const offerings = offeringIds.length
      ? await this.prisma.client.programmeOffering.findMany({
          where: { organizationId, id: { in: offeringIds } },
          select: {
            id: true,
            name: true,
            programme: { select: { name: true } },
          },
        })
      : [];
    const offeringMap = new Map(offerings.map((offering) => [offering.id, offering]));
    const timezone = setting?.timezone ?? "Asia/Kuala_Lumpur";

    return sessions.map((session) => {
      const starts = sessionDateTime(session.startsAt, timezone);
      const ends = sessionDateTime(session.endsAt, timezone);
      const offering = session.programmeOfferingId
        ? offeringMap.get(session.programmeOfferingId)
        : undefined;

      return {
        id: session.id,
        offeringId: session.programmeOfferingId ?? "",
        offeringName: offering?.name ?? session.title,
        programmeName: offering?.programme.name ?? "General Training",
        venueName: session.venueName,
        courtName: session.courtName ?? "",
        coachName: session.coachName ?? "Unassigned",
        sessionDate: starts.date,
        startTime: starts.time,
        endTime: ends.time,
        status: session.status,
      };
    });
  }

  async listStaff(organizationId: string) {
    const rows = await this.prisma.client.organizationMembership.findMany({
      where: { organizationId },
      select: {
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            guardianProfile: { select: { displayName: true } },
            coachProfile: { select: { displayName: true } },
            athleteProfile: { select: { displayName: true } },
          },
        },
        roleAssignments: { select: { role: true } },
      },
    });

    return rows
      .map((row) => {
        const roles = row.roleAssignments
          .map(({ role }) => role)
          .filter((role): role is KhlimUserRole =>
            STAFF_ROLES.has(role as KhlimUserRole),
          );
        return {
          id: row.user.id,
          email: row.user.email ?? "",
          displayName: displayName(row.user),
          roles,
          status: row.status,
          lastActiveAt: null,
          mfaEnabled: null,
        };
      })
      .filter((row) => row.roles.length > 0)
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }
}
