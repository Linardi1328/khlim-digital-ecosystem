import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

type SendInput = {
  type?:
    | "ANNOUNCEMENT"
    | "SCHEDULE_CHANGE"
    | "BILLING"
    | "EDITORIAL"
    | "SYSTEM";
  title: string;
  body: string;
  audience: "ALL_GUARDIANS" | "OFFERING" | "USER";
  programmeOfferingId?: string | null;
  userId?: string | null;
};

const recipientMembershipStatuses = ["ACTIVE", "PENDING"] as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  listAdmin(organizationId: string) {
    return this.prisma.client.notification.findMany({
      where: { organizationId },
      include: { _count: { select: { receipts: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async send(
    organizationId: string,
    input: SendInput,
    createdByUserId: string | null,
  ) {
    if (!input.title?.trim() || !input.body?.trim()) {
      throw new BadRequestException("Notification title and body are required");
    }
    const recipients = await this.resolveRecipients(organizationId, input);
    if (recipients.length === 0) {
      throw new BadRequestException("Notification audience has no recipients");
    }
    return this.prisma.client.notification.create({
      data: {
        organizationId,
        type: input.type ?? "ANNOUNCEMENT",
        title: input.title.trim(),
        body: input.body.trim(),
        programmeOfferingId: input.programmeOfferingId?.trim() || null,
        createdByUserId,
        receipts: { create: recipients.map((userId) => ({ userId })) },
      },
      include: { _count: { select: { receipts: true } } },
    });
  }

  async notifyOffering(
    organizationId: string,
    programmeOfferingId: string,
    title: string,
    body: string,
  ) {
    return this.send(
      organizationId,
      {
        type: "SCHEDULE_CHANGE",
        title,
        body,
        audience: "OFFERING",
        programmeOfferingId,
      },
      null,
    );
  }

  async listMine(organizationId: string, userId: string) {
    const receipts = await this.prisma.client.notificationReceipt.findMany({
      where: { userId, notification: { organizationId } },
      include: { notification: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return receipts.map((receipt) => ({
      id: receipt.id,
      readAt: receipt.readAt,
      createdAt: receipt.createdAt,
      notificationId: receipt.notificationId,
      type: receipt.notification.type,
      title: receipt.notification.title,
      body: receipt.notification.body,
      programmeOfferingId: receipt.notification.programmeOfferingId,
    }));
  }

  async markRead(
    organizationId: string,
    receiptId: string,
    userId: string,
  ) {
    const receipt = await this.prisma.client.notificationReceipt.findFirst({
      where: { id: receiptId, userId, notification: { organizationId } },
      select: { id: true },
    });
    if (!receipt) throw new NotFoundException("Notification not found");
    return this.prisma.client.notificationReceipt.update({
      where: { id: receipt.id },
      data: { readAt: new Date() },
    });
  }

  private async resolveRecipients(
    organizationId: string,
    input: SendInput,
  ): Promise<string[]> {
    if (input.audience === "USER") {
      if (!input.userId?.trim()) {
        throw new BadRequestException(
          "User ID is required for a direct notification",
        );
      }
      const userId = input.userId.trim();
      await this.requireOrganizationRecipient(organizationId, userId);
      return [userId];
    }

    if (input.audience === "ALL_GUARDIANS") {
      const memberships = await this.prisma.client.membership.findMany({
        where: {
          organizationId,
          status: { in: [...recipientMembershipStatuses] },
        },
        include: {
          athlete: {
            include: {
              guardianLinks: {
                where: { status: "ACTIVE" },
                select: { guardianUserId: true },
              },
            },
          },
        },
      });
      return this.collectMembershipRecipients(memberships);
    }

    const programmeOfferingId = input.programmeOfferingId?.trim();
    if (!programmeOfferingId) {
      throw new BadRequestException(
        "Programme offering ID is required for an offering notification",
      );
    }

    const offering = await this.prisma.client.programmeOffering.findFirst({
      where: { id: programmeOfferingId, organizationId },
      select: { id: true },
    });
    if (!offering) throw new NotFoundException("Programme offering not found");

    const memberships = await this.prisma.client.membership.findMany({
      where: {
        organizationId,
        programmeOfferingId,
        status: { in: [...recipientMembershipStatuses] },
      },
      include: {
        athlete: {
          include: {
            guardianLinks: {
              where: { status: "ACTIVE" },
              select: { guardianUserId: true },
            },
          },
        },
      },
    });
    return this.collectMembershipRecipients(memberships);
  }

  private collectMembershipRecipients(
    memberships: Array<{
      purchasedByUserId: string | null;
      athlete: { guardianLinks: Array<{ guardianUserId: string }> };
    }>,
  ) {
    const ids = new Set<string>();
    for (const membership of memberships) {
      if (membership.purchasedByUserId) ids.add(membership.purchasedByUserId);
      for (const link of membership.athlete.guardianLinks) {
        ids.add(link.guardianUserId);
      }
    }
    return [...ids];
  }

  private async requireOrganizationRecipient(
    organizationId: string,
    userId: string,
  ) {
    const [staffMembership, familyMembership] = await Promise.all([
      this.prisma.client.organizationMembership.findFirst({
        where: { organizationId, userId, status: "ACTIVE" },
        select: { id: true },
      }),
      this.prisma.client.membership.findFirst({
        where: {
          organizationId,
          status: { in: [...recipientMembershipStatuses] },
          OR: [
            { purchasedByUserId: userId },
            { athlete: { userId } },
            {
              athlete: {
                guardianLinks: {
                  some: { guardianUserId: userId, status: "ACTIVE" },
                },
              },
            },
          ],
        },
        select: { id: true },
      }),
    ]);
    if (!staffMembership && !familyMembership) {
      throw new NotFoundException("Notification recipient not found");
    }
  }
}
