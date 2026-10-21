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
  photoRightsVerified: boolean;
  mediaReleaseRef?: string;
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
  photoRightsVerified: boolean;
  status: EditorialPublicationStatus;
  aiAssisted: true;
}

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

/**
 * Historical achievement records belong here only after the club has verified
 * the event, result, date/year and photo rights. Keeping publication status and
 * verification separate prevents an unfinished editorial draft from becoming a
 * public club claim by accident.
 */
export const achievementStories: AchievementStory[] = [
  {
    id: "cls-international-cup-2026",
    yearLabel: "2026",
    title: "Champion — Girls KU-16",
    eventName: "80th CLS International Cup, Indonesia",
    description:
      "KHLIM Basketball Club emerged as champions at the 80th CLS International Cup, Indonesia, demonstrating competitive poise, teamwork, and court discipline on the international stage.",
    photoLabel: "80th CLS International Cup 2026 Champions",
    imageUrl:
      "/media/achievements/cls-international-indonesia-2026-champion.webp",
    placeholderGradient:
      "radial-gradient(circle at 75% 24%, rgba(245, 158, 11, 0.36), transparent 24%), linear-gradient(135deg, #18181b, #3f2d0b 58%, #0f172a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "jasmine-cup-2026-a",
    yearLabel: "2025–2026",
    title: "Champion — KHLIM A",
    eventName: "Jasmine Cup 2025–2026",
    description:
      "KHLIM A captured the championship trophy at the Jasmine Cup, showcasing high-level fundamentals, court discipline, and team resilience.",
    photoLabel: "Jasmine Cup 2025-2026 KHLIM A Champions",
    imageUrl: "/media/achievements/jasmine-cup-2025-2026-khlim-a-champion.webp",
    placeholderGradient:
      "radial-gradient(circle at 28% 36%, rgba(251, 191, 36, 0.28), transparent 24%), linear-gradient(145deg, #111827, #27272a 58%, #4b3520)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "jasmine-cup-2026-e",
    yearLabel: "2025–2026",
    title: "4th Place — KHLIM E",
    eventName: "Jasmine Cup 2025–2026",
    description:
      "KHLIM E secured 4th place at the Jasmine Cup through tenacity and dedicated team play against seasoned regional squads.",
    photoLabel: "Jasmine Cup 2025-2026 KHLIM E 4th Place",
    imageUrl: "/media/achievements/jasmine-cup-2025-2026-khlim-e-fourth.webp",
    placeholderGradient:
      "radial-gradient(circle at 35% 40%, rgba(245, 158, 11, 0.22), transparent 24%), linear-gradient(135deg, #18181b, #27272a 58%, #1f2937)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "sba-selangor-2025-d1",
    yearLabel: "2025",
    title: "Champion — Division 1",
    eventName: "U15 SBA D1 Selangor Tournament",
    description:
      "KHLIM secured the Division 1 championship title at the state-level U15 SBA Selangor Tournament, underscoring competitive development and player dedication.",
    photoLabel: "U15 SBA D1 Selangor Tournament 2025 Champions",
    imageUrl: "/media/achievements/u15-sba-d1-selangor-2025-champion.webp",
    placeholderGradient:
      "radial-gradient(circle at 68% 60%, rgba(245, 158, 11, 0.24), transparent 25%), linear-gradient(125deg, #292524, #18181b 55%, #1f2937)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "sba-selangor-2025-d2",
    yearLabel: "2025",
    title: "Division 2 Competitor",
    eventName: "U15 SBA D2 Selangor Tournament",
    description:
      "KHLIM developmental squads gained valuable tournament mileage and high-pressure game experience in the U15 SBA D2 Selangor competition.",
    photoLabel: "U15 SBA D2 Selangor Tournament 2025 Team",
    imageUrl: "/media/achievements/u15-sba-d2-selangor-2025.webp",
    placeholderGradient:
      "radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.2), transparent 30%), linear-gradient(135deg, #18181b, #27272a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "sba-selangor-2024",
    yearLabel: "2024",
    title: "3rd Place",
    eventName: "U15 SBA Selangor Tournament",
    description:
      "A podium finish at the 2024 U15 SBA Selangor Tournament marked a critical milestone in establishing KHLIM's competitive standard in the state.",
    photoLabel: "U15 SBA Selangor Tournament 2024 3rd Place",
    imageUrl: "/media/achievements/u15-sba-selangor-2024-third.webp",
    placeholderGradient:
      "radial-gradient(circle at 40% 30%, rgba(245, 158, 11, 0.25), transparent 25%), linear-gradient(135deg, #18181b, #27272a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "sba-selangor-2026-u16",
    yearLabel: "2026",
    title: "1st Runner-Up — Division 2",
    eventName: "U16 D2 SBA Selangor Tournament",
    description:
      "KHLIM U16 reached the grand finals of the 2026 U16 D2 SBA Selangor Tournament, finishing as proud first runners-up after an undefeated group stage.",
    photoLabel: "U16 D2 SBA Selangor Tournament 2026 1st Runner-Up",
    imageUrl: "/media/achievements/u16-d2-sba-selangor-2026-runner-up.webp",
    placeholderGradient:
      "radial-gradient(circle at 70% 30%, rgba(245, 158, 11, 0.3), transparent 25%), linear-gradient(135deg, #18181b, #3f2d0b)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "mpbl-2025-u14g",
    yearLabel: "2025",
    title: "1st Runner-Up — Girls U14",
    eventName: "U14G MPBL League",
    description:
      "The KHLIM Girls U14 team demonstrated exceptional court discipline and tactical execution, capturing 1st runner-up in the competitive MPBL League 2025.",
    photoLabel: "U14G MPBL League 2025 1st Runner-Up",
    imageUrl: "/media/achievements/u14g-mpbl-2025-runner-up.webp",
    placeholderGradient:
      "radial-gradient(circle at 60% 40%, rgba(245, 158, 11, 0.25), transparent 25%), linear-gradient(135deg, #18181b, #27272a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "fastbreak-2024-u14g",
    yearLabel: "2024",
    title: "Champion — Girls U14",
    eventName: "U14G Fastbreak League",
    description:
      "KHLIM Girls U14 captured the championship title in the Fastbreak League 2024, exemplifying high-tempo transition play and relentless teamwork.",
    photoLabel: "U14G Fastbreak League 2024 Champions",
    imageUrl: "/media/achievements/u14g-fastbreak-2024-champion.webp",
    placeholderGradient:
      "radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.35), transparent 25%), linear-gradient(135deg, #18181b, #3f2d0b)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "maba-matrix-u17-2026",
    yearLabel: "2026",
    title: "National Representative",
    eventName: "60th MABA-MATRIX 17 & Below National Championship",
    description:
      "KHLIM athletes earned prestigious selections to represent at the 60th MABA-MATRIX National Basketball Championship, competing at the highest youth level in Malaysia.",
    photoLabel: "60th MABA-MATRIX U17 National Championship Representatives",
    imageUrl: "/media/achievements/khlim-maba-matrix-u17-2026.webp",
    placeholderGradient:
      "radial-gradient(circle at 75% 25%, rgba(245, 158, 11, 0.3), transparent 25%), linear-gradient(135deg, #18181b, #27272a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "maba-matrix-u17-2026-squad2",
    yearLabel: "2026",
    title: "National Representative (Squad 2)",
    eventName: "60th MABA-MATRIX 17 & Below National Championship",
    description:
      "Continued representation at the 60th MABA-MATRIX National Championship, showcasing KHLIM's developmental depth across junior age brackets.",
    photoLabel: "60th MABA-MATRIX U17 National Championship Squad 2",
    imageUrl: "/media/achievements/khlim-maba-matrix-u17-2026-2.webp",
    placeholderGradient:
      "radial-gradient(circle at 65% 35%, rgba(245, 158, 11, 0.3), transparent 25%), linear-gradient(135deg, #18181b, #27272a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "mssm-2024",
    yearLabel: "2024",
    title: "MSSM State Representative",
    eventName: "MSSM National Championship",
    description:
      "KHLIM student-athletes were chosen to represent the state at the prestigious Majlis Sukan Sekolah Malaysia (MSSM) National Championship 2024.",
    photoLabel: "KHLIM Representative in MSSM 2024",
    imageUrl: "/media/achievements/khlim-mssm-2024.webp",
    placeholderGradient:
      "radial-gradient(circle at 55% 45%, rgba(245, 158, 11, 0.28), transparent 25%), linear-gradient(135deg, #18181b, #27272a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "mssm-2025",
    yearLabel: "2025",
    title: "MSSM State Representative",
    eventName: "MSSM National Championship",
    description:
      "Consecutive-year selection of KHLIM talent to represent at the MSSM National Championship 2025, validating the academy's player development pipeline.",
    photoLabel: "KHLIM Representative in MSSM 2025",
    imageUrl: "/media/achievements/khlim-mssm-2025.webp",
    placeholderGradient:
      "radial-gradient(circle at 55% 45%, rgba(245, 158, 11, 0.28), transparent 25%), linear-gradient(135deg, #18181b, #27272a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
  {
    id: "lmc-cup-2025",
    yearLabel: "2025",
    title: "National Cup Representative",
    eventName: "U15 LMC National Cup",
    description:
      "KHLIM representatives competed in the U15 LMC National Cup 2025, demonstrating poise, teamwork, and high-level basketball skills on a national stage.",
    photoLabel: "KHLIM Representative in U15 LMC National Cup 2025",
    imageUrl: "/media/achievements/khlim-u15-lmc-cup-2025.webp",
    placeholderGradient:
      "radial-gradient(circle at 45% 55%, rgba(245, 158, 11, 0.25), transparent 25%), linear-gradient(135deg, #18181b, #27272a)",
    factsVerified: true,
    photoRightsVerified: true,
    mediaReleaseRef: "REF-ESTHER-DIRECTOR-APPROVAL-2026-10-21",
    status: "published",
  },
];

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
    photoRightsVerified: false,
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
    photoRightsVerified: false,
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
    photoRightsVerified: false,
    status: "draft",
  },
];

export function getLocalizedAchievementArchiveSlots(
  t: Translate,
): AchievementStory[] {
  const keys = ["signature", "national", "legacy"] as const;
  return achievementArchiveSlots.map((story, index) => {
    const key = keys[index]!;
    return {
      ...story,
      yearLabel: t("home.achievements.archiveLabel"),
      title: t(`home.achievements.${key}.title`),
      eventName: t(`home.achievements.${key}.event`),
      description: t(`home.achievements.${key}.description`),
      photoLabel: t(`home.achievements.${key}.photoLabel`),
    };
  });
}

/**
 * Player Spotlight stories are AI-assisted editorial drafts built from verified
 * source facts. Do not place a real player story in published state until the
 * player's name, event, result, timing and photo rights have been checked by
 * KHLIM staff.
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
  photoRightsVerified: false,
  status: "draft",
  aiAssisted: true,
};

export function getLocalizedSpotlightPreview(
  t: Translate,
): PlayerSpotlightArticle {
  return {
    ...playerSpotlightEditorialPreview,
    playerName: t("spotlight.preview.playerName"),
    headline: t("spotlight.preview.headline"),
    eventName: t("spotlight.preview.eventName"),
    achievement: t("spotlight.preview.achievement"),
    achievedOnLabel: t("spotlight.preview.date"),
    excerpt: t("spotlight.preview.excerpt"),
    articleParagraphs: [
      t("spotlight.preview.paragraph1"),
      t("spotlight.preview.paragraph2"),
      t("spotlight.preview.paragraph3"),
      t("spotlight.preview.paragraph4"),
    ],
    photoLabel: t("spotlight.preview.photoLabel"),
  };
}

export const publishedAchievements = achievementStories.filter(
  (story) =>
    story.status === "published" &&
    story.factsVerified &&
    story.photoRightsVerified,
);

/**
 * Director-reviewed historical club records are a separate, curated collection
 * from the live editorial API. They are grouped by subject, not by the source
 * Google Drive folder name. Individual names must never be inferred from photos.
 *
 * Publishing an asset also requires a valid media permission record: the
 * canRenderYouthMedia() gate controls presentation, not HTTP asset access.
 */
const VERIFIED_TEAM_RESULT_IDS = [
  "cls-international-cup-2026",
  "jasmine-cup-2026-a",
  "sba-selangor-2025-d1",
  "fastbreak-2024-u14g",
  "mpbl-2025-u14g",
  "sba-selangor-2026-u16",
  "jasmine-cup-2026-e",
  "sba-selangor-2024",
  "sba-selangor-2025-d2",
] as const;

const VERIFIED_REPRESENTATIVE_IDS = [
  "maba-matrix-u17-2026",
  "maba-matrix-u17-2026-squad2",
  "mssm-2025",
  "mssm-2024",
  "lmc-cup-2025",
] as const;

function selectCuratedMilestones(ids: readonly string[]): AchievementStory[] {
  return ids.flatMap((id) => {
    const record = publishedAchievements.find((story) => story.id === id);
    return record ? [record] : [];
  });
}

export const verifiedTeamResults = selectCuratedMilestones(
  VERIFIED_TEAM_RESULT_IDS,
);
export const verifiedRepresentativeMilestones = selectCuratedMilestones(
  VERIFIED_REPRESENTATIVE_IDS,
);

export type AchievementSectionState = "loading" | "success" | "empty" | "error";

export interface ResolvedAchievementsResult {
  state: AchievementSectionState;
  stories: AchievementStory[];
  isIntentionalEmpty: boolean;
  preview: boolean;
  isLoading: boolean;
}

export function resolveAchievementStories({
  remote,
  apiError,
  isLoading,
  archiveSlots = [],
  fallback: _fallback = [],
}: {
  remote: AchievementStory[] | null;
  apiError: boolean;
  isLoading?: boolean;
  archiveSlots?: AchievementStory[];
  fallback?: AchievementStory[];
}): ResolvedAchievementsResult {
  // 1. Initial loading: remote is null and no error yet, or explicit isLoading flag
  if (isLoading || (remote === null && !apiError)) {
    return {
      state: "loading",
      stories: [],
      isIntentionalEmpty: false,
      preview: false,
      isLoading: true,
    };
  }

  // 2. Authoritative API response succeeded
  if (remote !== null && !apiError) {
    if (remote.length === 0) {
      // Authoritative unpublish: staff unpublished all achievements or none exist
      return {
        state: "empty",
        stories: [],
        isIntentionalEmpty: true,
        preview: false,
        isLoading: false,
      };
    }
    return {
      state: "success",
      stories: remote,
      isIntentionalEmpty: false,
      preview: false,
      isLoading: false,
    };
  }

  // 3. API Error / Network outage: fail-closed against unverified or unpublished media.
  // Never resurrect hardcoded youth photographs. Render neutral archive preview slots.
  return {
    state: "error",
    stories: archiveSlots,
    isIntentionalEmpty: false,
    preview: true,
    isLoading: false,
  };
}

export const publishedPlayerSpotlights = playerSpotlightArticles.filter(
  (article) =>
    article.status === "published" &&
    article.factsVerified &&
    article.photoRightsVerified,
);

export function findSpotlightArticle(
  slug: string,
): PlayerSpotlightArticle | null {
  const published = publishedPlayerSpotlights.find(
    (article) => article.slug === slug,
  );
  if (published) return published;
  if (slug === playerSpotlightEditorialPreview.slug) {
    return playerSpotlightEditorialPreview;
  }
  return null;
}

export function canRenderYouthMedia(
  item: { imageUrl?: string; photoRightsVerified?: boolean } | null | undefined,
): boolean {
  if (!item || !item.imageUrl) return false;
  return (
    Boolean(item.photoRightsVerified) &&
    process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED === "1"
  );
}

export interface ClubGalleryItem {
  id: string;
  title: string;
  description: string;
  photoLabel: string;
  imageUrl: string;
  originalFileName: string;
  aspectRatio: "landscape" | "portrait";
  notes: string;
  photoRightsVerified: boolean;
  mediaReleaseRef?: string;
}

/**
 * Verified event and matchday photographs from official KHLIM basketball
 * competition seasons, authorized by Director Esther for website publication.
 */
export const clubEventGallery: ClubGalleryItem[] = [
  {
    id: "team-huddle-circle",
    title: "Pre-Game Strategy Circle",
    description:
      "KHLIM squad seated in an on-court strategy circle reviewing game plan and defensive assignments during tournament competition.",
    photoLabel: "KHLIM team seated on court during tournament strategy circle",
    imageUrl: "/media/achievements/club-gallery-team-huddle-circle.webp",
    originalFileName: "Copy of NIN_5719.jpg",
    aspectRatio: "landscape",
    notes:
      "Complementary matchday court moment paired with NIN_5725 lineup under hoop.",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
  {
    id: "court-lineup-hoop",
    title: "Tournament Squad Lineup",
    description:
      "KHLIM 13-player squad standing united under the hoop during tournament competition.",
    photoLabel: "13 KHLIM players lined up under hoop on tournament court",
    imageUrl: "/media/achievements/club-gallery-court-lineup-hoop.webp",
    originalFileName: "Copy of NIN_5725.jpg",
    aspectRatio: "landscape",
    notes:
      "Matchday squad lineup captured under hoop during the same court session as NIN_5719.",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
  {
    id: "sideline-celebration-wide",
    title: "Sideline Bench Energy (Wide Angle)",
    description:
      "Team bench and coaching staff celebrating on-court momentum with arms raised in unison during tournament play.",
    photoLabel:
      "KHLIM bench and coaches celebrating during match play (wide perspective)",
    imageUrl: "/media/achievements/club-gallery-sideline-celebration-wide.webp",
    originalFileName: "Copy of NIN_6916.jpg",
    aspectRatio: "landscape",
    notes:
      "Wide sideline celebration perspective; sequential pair with NIN_6971 taken 21 seconds earlier.",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
  {
    id: "sideline-celebration-moment",
    title: "Courtside Energy & Focus",
    description:
      "Medium-range perspective of player and coach intensity celebrating a decisive scoring run during tournament minutes.",
    photoLabel:
      "Focused sideline celebration moment during tournament match play",
    imageUrl:
      "/media/achievements/club-gallery-sideline-celebration-moment.webp",
    originalFileName: "Copy of NIN_6971.jpg",
    aspectRatio: "landscape",
    notes:
      "Tighter sideline angle of the celebration sequence (21 seconds after NIN_6916).",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
  {
    id: "matchday-bench-cheering",
    title: "Matchday Bench Support",
    description:
      "KHLIM substitutes and coaching staff on their feet providing vocal support and defensive encouragement during active gameplay.",
    photoLabel:
      "KHLIM bench players standing and cheering during active game play",
    imageUrl: "/media/achievements/club-gallery-matchday-bench-cheering.webp",
    originalFileName: "Copy of NIN_7275.jpg",
    aspectRatio: "landscape",
    notes: "Active game day bench cheer with opponent in defensive transition.",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
  {
    id: "studio-squad-spirit",
    title: "Club Spirit & Team Camaraderie",
    description:
      "Official studio team spirit photoshoot featuring coaches and athletes in club jerseys, showcasing dynamic poses and unity.",
    photoLabel: "KHLIM club team spirit portrait with coaches and athletes",
    imageUrl: "/media/achievements/club-gallery-studio-squad-spirit.webp",
    originalFileName: "IMG_2398.HEIC",
    aspectRatio: "portrait",
    notes:
      "Dynamic team spirit pose from the official studio session (distinguished from formal portrait IMG_2477 2).",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
  {
    id: "studio-team-portrait",
    title: "Official Club Squad Portrait",
    description:
      "Formal club studio portrait with 3 coaching staff members and 14 players in official white home uniforms.",
    photoLabel: "Official formal portrait of KHLIM squad and coaching staff",
    imageUrl: "/media/achievements/club-gallery-studio-team-portrait.webp",
    originalFileName: "IMG_2477 2.PNG",
    aspectRatio: "landscape",
    notes:
      "Full formal club squad portrait (distinguished from spirit pose IMG_2398).",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
  {
    id: "in-game-court-huddle",
    title: "In-Game Team Huddle",
    description:
      "Coach Jia Xuan directing an in-game timeout huddle as players unite fists together before returning to the court.",
    photoLabel: "Coach Jia Xuan and players in tournament timeout court huddle",
    imageUrl: "/media/achievements/club-gallery-in-game-court-huddle.webp",
    originalFileName: "IMG_2814.JPG",
    aspectRatio: "landscape",
    notes: "In-game timeout instruction and team fist rally.",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
  {
    id: "state-honours-lineup",
    title: "Representative Honours Squad Recognition",
    description:
      "KHLIM representative honours squad and coaching staff gathered in commemorative uniforms celebrating district, state, and national achievements.",
    photoLabel:
      "Representative honours squad lineup celebrating state and national selections",
    imageUrl: "/media/achievements/club-gallery-state-honours-lineup.webp",
    originalFileName: "IMG_2824.HEIC",
    aspectRatio: "portrait",
    notes:
      "Milestone squad portrait honoring state and national representative achievements.",
    photoRightsVerified: true,
    mediaReleaseRef: "DIR-AUTH-ESTHER-202610",
  },
];
