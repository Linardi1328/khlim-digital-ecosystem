import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export type EditorialType = "ACHIEVEMENT" | "PLAYER_SPOTLIGHT";

export interface EditorialInput {
  type: EditorialType;
  slug?: string;
  title: string;
  eventName: string;
  summary: string;
  yearLabel?: string;
  playerName?: string;
  achievement?: string;
  achievedOnLabel?: string;
  articleParagraphs?: string[];
  photoLabel: string;
  imageUrl?: string;
  factsVerified?: boolean;
  aiAssisted?: boolean;
}

@Injectable()
export class EditorialService {
  constructor(private readonly prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.client.editorialEntry.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  listPublished(type: EditorialType) {
    return this.prisma.client.editorialEntry.findMany({
      where: { type, status: "PUBLISHED", factsVerified: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  findPublishedSpotlight(slug: string) {
    return this.prisma.client.editorialEntry.findFirst({
      where: {
        slug,
        type: "PLAYER_SPOTLIGHT",
        status: "PUBLISHED",
        factsVerified: true,
      },
    });
  }

  create(input: EditorialInput) {
    this.assertComplete(input);
    return this.prisma.client.editorialEntry.create({
      data: {
        type: input.type,
        slug: input.slug,
        title: input.title,
        eventName: input.eventName,
        summary: input.summary,
        yearLabel: input.yearLabel,
        playerName: input.playerName,
        achievement: input.achievement,
        achievedOnLabel: input.achievedOnLabel,
        articleParagraphs: input.articleParagraphs,
        photoLabel: input.photoLabel,
        imageUrl: input.imageUrl,
        factsVerified: Boolean(input.factsVerified),
        aiAssisted: Boolean(input.aiAssisted),
      },
    });
  }

  async update(id: string, input: Partial<EditorialInput>) {
    const existing = await this.requireEntry(id);
    const merged = {
      type: existing.type,
      slug: input.slug ?? existing.slug ?? undefined,
      title: input.title ?? existing.title,
      eventName: input.eventName ?? existing.eventName,
      summary: input.summary ?? existing.summary,
      yearLabel: input.yearLabel ?? existing.yearLabel ?? undefined,
      playerName: input.playerName ?? existing.playerName ?? undefined,
      achievement: input.achievement ?? existing.achievement ?? undefined,
      achievedOnLabel:
        input.achievedOnLabel ?? existing.achievedOnLabel ?? undefined,
      articleParagraphs:
        input.articleParagraphs ??
        (Array.isArray(existing.articleParagraphs)
          ? existing.articleParagraphs.filter(
              (item): item is string => typeof item === "string",
            )
          : undefined),
      photoLabel: input.photoLabel ?? existing.photoLabel,
      imageUrl: input.imageUrl ?? existing.imageUrl ?? undefined,
      factsVerified: input.factsVerified ?? existing.factsVerified,
      aiAssisted: input.aiAssisted ?? existing.aiAssisted,
    } satisfies EditorialInput;
    this.assertComplete(merged);
    return this.prisma.client.editorialEntry.update({
      where: { id },
      data: {
        slug: input.slug,
        title: input.title,
        eventName: input.eventName,
        summary: input.summary,
        yearLabel: input.yearLabel,
        playerName: input.playerName,
        achievement: input.achievement,
        achievedOnLabel: input.achievedOnLabel,
        articleParagraphs: input.articleParagraphs,
        photoLabel: input.photoLabel,
        imageUrl: input.imageUrl,
        factsVerified: input.factsVerified,
        aiAssisted: input.aiAssisted,
      },
    });
  }

  async publish(id: string) {
    const entry = await this.requireEntry(id);
    if (!entry.factsVerified)
      throw new BadRequestException(
        "Facts must be verified before publication",
      );
    this.assertComplete({
      type: entry.type,
      slug: entry.slug ?? undefined,
      title: entry.title,
      eventName: entry.eventName,
      summary: entry.summary,
      yearLabel: entry.yearLabel ?? undefined,
      playerName: entry.playerName ?? undefined,
      achievement: entry.achievement ?? undefined,
      achievedOnLabel: entry.achievedOnLabel ?? undefined,
      articleParagraphs: Array.isArray(entry.articleParagraphs)
        ? entry.articleParagraphs.filter(
            (item): item is string => typeof item === "string",
          )
        : undefined,
      photoLabel: entry.photoLabel,
      imageUrl: entry.imageUrl ?? undefined,
      factsVerified: entry.factsVerified,
      aiAssisted: entry.aiAssisted,
    });
    return this.prisma.client.editorialEntry.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: entry.publishedAt ?? new Date(),
      },
    });
  }

  async unpublish(id: string) {
    await this.requireEntry(id);
    return this.prisma.client.editorialEntry.update({
      where: { id },
      data: { status: "DRAFT", publishedAt: null },
    });
  }

  generateSpotlightDraft(input: {
    playerName: string;
    eventName: string;
    achievement: string;
    achievedOnLabel: string;
    developmentNote?: string;
  }) {
    const required = [
      input.playerName,
      input.eventName,
      input.achievement,
      input.achievedOnLabel,
    ];
    if (required.some((value) => !value?.trim()))
      throw new BadRequestException(
        "Player, event, achievement and event date are required",
      );
    const development =
      input.developmentNote?.trim() ||
      "the preparation, habits and resilience built through consistent training";
    return {
      headline: `${input.playerName} reaches ${input.achievement} at ${input.eventName}`,
      excerpt: `${input.playerName} has reached ${input.achievement} at ${input.eventName}, a milestone that reflects ${development}.`,
      articleParagraphs: [
        `${input.playerName} reached ${input.achievement} at ${input.eventName} on ${input.achievedOnLabel}, marking a memorable competitive milestone.`,
        `The result reflects ${development}. KHLIM's editorial focus is on the verified achievement and the development habits behind it rather than overstating the club's role.`,
        "The achievement also recognises the wider support around the player, including teammates, coaches and family, while keeping the focus on the athlete's next stage of growth.",
      ],
      aiAssisted: true,
      generator: "khlim-editorial-assist-v1",
      sourceFactsOnly: true,
    };
  }

  private async requireEntry(id: string) {
    const entry = await this.prisma.client.editorialEntry.findUnique({
      where: { id },
    });
    if (!entry) throw new NotFoundException("Editorial entry not found");
    return entry;
  }

  private assertComplete(input: EditorialInput) {
    if (
      !input.title?.trim() ||
      !input.eventName?.trim() ||
      !input.summary?.trim() ||
      !input.photoLabel?.trim()
    )
      throw new BadRequestException(
        "Title, event name, summary and photo label are required",
      );
    if (input.type === "ACHIEVEMENT" && !input.yearLabel?.trim())
      throw new BadRequestException("Achievement year label is required");
    if (input.type === "PLAYER_SPOTLIGHT") {
      if (
        !input.slug?.trim() ||
        !input.playerName?.trim() ||
        !input.achievement?.trim() ||
        !input.achievedOnLabel?.trim()
      )
        throw new BadRequestException(
          "Spotlight slug, player, achievement and event date are required",
        );
      if (!input.articleParagraphs || input.articleParagraphs.length < 2)
        throw new BadRequestException(
          "Spotlight article requires at least two paragraphs",
        );
    }
  }
}
