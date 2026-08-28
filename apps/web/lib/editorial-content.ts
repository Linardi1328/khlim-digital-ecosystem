export type EditorialPublicationStatus = "draft" | "published";

export interface AchievementStory {
  id: string;
  yearLabel: string;
  title: string;
  eventName: string;
  description: string;
  photoLabel: string;
  imageUrl?: string;
  placeholderGradient: string;
  factsVerified: boolean;
  status: EditorialPublicationStatus;
}

export interface PlayerSpotlightArticle {
  slug: string;
  playerName: string;
  headline: string;
  eventName: string;
  achievement: string;
  achievedOnLabel: string;
  excerpt: string;
  articleParagraphs: string[];
  photoLabel: string;
  imageUrl?: string;
  placeholderGradient: string;
  factsVerified: boolean;
  status: EditorialPublicationStatus;
  aiAssisted: true;
}

/**
 * Historical achievement records belong here only after the club has verified
 * the event, result, date/year and photo rights. Keeping publication status and
 * verification separate prevents an unfinished editorial draft from becoming a
 * public club claim by accident.
 */
export const achievementStories: AchievementStory[] = [];

/**
 * These neutral archive slots keep the section visually complete until the
 * verified KHLIM history/photo library is supplied. They are labels for content
 * categories, not claims that a specific achievement has already happened.
 */
export const achievementArchiveSlots: AchievementStory[] = [
  {
    id: "signature-competitive-milestone",
    yearLabel: "Club archive",
    title: "Signature competitive milestone",
    eventName: "Highest verified team result",
    description:
      "Reserve this lead story for the defining championship, podium finish or tournament run in KHLIM history. Pair the verified result with the photo that best captures the moment.",
    photoLabel: "championship or podium celebration",
    placeholderGradient:
      "radial-gradient(circle at 75% 24%, rgba(245, 158, 11, 0.36), transparent 24%), linear-gradient(135deg, #18181b, #3f2d0b 58%, #0f172a)",
    factsVerified: false,
    status: "draft",
  },
  {
    id: "national-stage-milestone",
    yearLabel: "Club archive",
    title: "National-stage milestone",
    eventName: "Verified representative achievement",
    description:
      "Use this story for a memorable KHLIM moment on a state, national or international stage, with a concise explanation of why the achievement mattered to the club.",
    photoLabel: "team or player on the national stage",
    placeholderGradient:
      "radial-gradient(circle at 28% 36%, rgba(251, 191, 36, 0.28), transparent 24%), linear-gradient(145deg, #111827, #27272a 58%, #4b3520)",
    factsVerified: false,
    status: "draft",
  },
  {
    id: "legacy-community-milestone",
    yearLabel: "Club archive",
    title: "Legacy & community milestone",
    eventName: "Verified club-defining moment",
    description:
      "Not every important achievement is a medal. This slot can preserve a landmark team, breakthrough season, academy milestone or community moment that shaped KHLIM's identity.",
    photoLabel: "club legacy or community moment",
    placeholderGradient:
      "radial-gradient(circle at 68% 60%, rgba(245, 158, 11, 0.24), transparent 25%), linear-gradient(125deg, #292524, #18181b 55%, #1f2937)",
    factsVerified: false,
    status: "draft",
  },
];

/**
 * Player Spotlight stories are AI-assisted editorial drafts built from verified
 * source facts. Do not place a real player story in published state until the
 * player's name, event, result and timing have been checked by KHLIM staff.
 */
export const playerSpotlightArticles: PlayerSpotlightArticle[] = [];

/**
 * This article is an explicitly labelled editorial preview. It demonstrates the
 * tone and layout requested for Player Spotlight without inventing a real KHLIM
 * player result. Replace the placeholder facts with a verified brief before
 * publication.
 */
export const playerSpotlightEditorialPreview: PlayerSpotlightArticle = {
  slug: "editorial-preview-player-achievement",
  playerName: "Player Name",
  headline: "A defining moment on the competitive stage",
  eventName: "Verified event name",
  achievement: "Verified medal, selection or milestone",
  achievedOnLabel: "Event date to verify",
  excerpt:
    "An AI-assisted editorial preview showing how KHLIM can turn a verified player achievement into a concise, celebratory news story for families and the wider basketball community.",
  articleParagraphs: [
    "A major player achievement is more than a result on a scoresheet. It is a snapshot of the preparation, resilience and competitive habits built over months of training, games and learning moments.",
    "For a published KHLIM Player Spotlight, this paragraph will introduce the verified event and explain exactly what the player achieved. The article should name the competition, level, result and date without exaggerating the accomplishment or implying credit that belongs to another team or programme.",
    "The next part of the story should connect the milestone to the player's development journey: the habits coaches observed, the challenges the athlete worked through and the qualities that made the performance memorable. This keeps the article focused on development rather than simply celebrating a medal.",
    "KHLIM can close each spotlight by recognising the player's teammates, coaches and family support while looking ahead to the next stage of growth. Every published version should be reviewed against the source facts and approved photo before it goes live.",
  ],
  photoLabel: "player holding medal or celebrating verified achievement",
  placeholderGradient:
    "radial-gradient(circle at 72% 28%, rgba(245, 158, 11, 0.4), transparent 23%), linear-gradient(135deg, #111827, #27272a 55%, #4b3520)",
  factsVerified: false,
  status: "draft",
  aiAssisted: true,
};

export const publishedAchievements = achievementStories.filter(
  (story) => story.status === "published" && story.factsVerified,
);

export const publishedPlayerSpotlights = playerSpotlightArticles.filter(
  (article) => article.status === "published" && article.factsVerified,
);

export function findSpotlightArticle(slug: string): PlayerSpotlightArticle | null {
  const published = publishedPlayerSpotlights.find(
    (article) => article.slug === slug,
  );
  if (published) return published;
  if (slug === playerSpotlightEditorialPreview.slug) {
    return playerSpotlightEditorialPreview;
  }
  return null;
}
