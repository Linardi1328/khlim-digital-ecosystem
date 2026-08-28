import type {
  AchievementStory,
  PlayerSpotlightArticle,
} from "./editorial-content";
const API = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1"
).replace(/\/+$/, "");
const GRADIENT = "linear-gradient(135deg, #18181b, #3f2d0b 58%, #0f172a)";
type Entry = {
  id: string;
  slug?: string | null;
  title: string;
  eventName: string;
  summary: string;
  yearLabel?: string | null;
  playerName?: string | null;
  achievement?: string | null;
  achievedOnLabel?: string | null;
  articleParagraphs?: unknown;
  photoLabel: string;
  imageUrl?: string | null;
  factsVerified: boolean;
  aiAssisted: boolean;
};
const paragraphs = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
export const toAchievement = (entry: Entry): AchievementStory => ({
  id: entry.id,
  yearLabel: entry.yearLabel || "KHLIM",
  title: entry.title,
  eventName: entry.eventName,
  description: entry.summary,
  photoLabel: entry.photoLabel,
  imageUrl: entry.imageUrl || undefined,
  placeholderGradient: GRADIENT,
  factsVerified: entry.factsVerified,
  status: "published",
});
export const toSpotlight = (entry: Entry): PlayerSpotlightArticle => ({
  slug: entry.slug || entry.id,
  playerName: entry.playerName || "KHLIM Player",
  headline: entry.title,
  eventName: entry.eventName,
  achievement: entry.achievement || "Verified milestone",
  achievedOnLabel: entry.achievedOnLabel || "Verified date",
  excerpt: entry.summary,
  articleParagraphs: paragraphs(entry.articleParagraphs),
  photoLabel: entry.photoLabel,
  imageUrl: entry.imageUrl || undefined,
  placeholderGradient: GRADIENT,
  factsVerified: entry.factsVerified,
  status: "published",
  aiAssisted: true,
});
async function get(path: string) {
  const response = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Editorial API ${response.status}`);
  return response.json() as Promise<Entry[]>;
}
export async function fetchPublishedAchievements() {
  return (await get("/editorial/achievements")).map(toAchievement);
}
export async function fetchPublishedSpotlights() {
  return (await get("/editorial/player-spotlights")).map(toSpotlight);
}
export async function fetchPublishedSpotlight(slug: string) {
  const response = await fetch(
    `${API}/editorial/player-spotlights/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const entry = (await response.json()) as Entry | null;
  return entry ? toSpotlight(entry) : null;
}
