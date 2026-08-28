import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

type SendInput = {
  type?:
    "ANNOUNCEMENT" | "SCHEDULE_CHANGE" | "BILLING" | "EDITORIAL" | "SYSTEM";
  title: string;
  body: string;
  audience: "ALL_GUARDIANS" | "OFFERING" | "USER";
  programmeOfferingId?: string | null;
  userId?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.client.notification.findMany({
      include: { _count: { select: { receipts: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async send(input: SendInput, createdByUserId: string | null) {
    if (!input.title?.trim() || !input.body?.trim()) {
      throw new BadRequestException("Notification title and body are required");
    }
    const recipients = await this.resolveRecipients(input);
    if (recipients.length === 0) {
      throw new BadRequestException("Notification audience has no recipients");
    }
    return this.prisma.client.notification.create({
      data: {
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
    programmeOfferingId: string,
    title: string,
    body: string,
  ) {
    return this.send(
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

  async listMine(userId: string) {
    const receipts = await this.prisma.client.notificationReceipt.findMany({
      where: { userId },
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

  async markRead(receiptId: string, userId: string) {
    const result = await this.prisma.client.notificationReceipt.updateMany({
      where: { id: receiptId, userId },
      data: { readAt: new Date() },
    });
    if (result.count === 0)
      throw new NotFoundException("Notification not found");
    return this.prisma.client.notificationReceipt.findUnique({
      where: { id: receiptId },
    });
  }

  private async resolveRecipients(input: SendInput): Promise<string[]> {
    if (input.audience === "USER") {
      if (!input.userId?.trim())
        throw new BadRequestException(
          "User ID is required for a direct notification",
        );
      return [input.userId.trim()];
    }
    if (input.audience === "ALL_GUARDIANS") {
      const assignments = await this.prisma.client.userRoleAssignment.findMany({
        where: { role: "GUARDIAN" },
        select: { userId: true },
      });
      return [...new Set(assignments.map((item) => item.userId))];
    }
    if (!input.programmeOfferingId?.trim()) {
      throw new BadRequestException(
        "Programme offering ID is required for an offering notification",
      );
    }
    const memberships = await this.prisma.client.membership.findMany({
      where: {
        programmeOfferingId: input.programmeOfferingId.trim(),
        status: { in: ["ACTIVE", "PENDING"] },
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
    const ids = new Set<string>();
    for (const membership of memberships) {
      if (membership.purchasedByUserId) ids.add(membership.purchasedByUserId);
      for (const link of membership.athlete.guardianLinks)
        ids.add(link.guardianUserId);
    }
    return [...ids];
  }
}
