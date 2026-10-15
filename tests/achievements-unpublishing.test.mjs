import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("AchievementsSection preserves editorial unpublishing authority", async () => {
  const componentSource = await read(
    "apps/web/components/home/achievements-section.tsx",
  );

  // Must not use naive remote.length > 0 fallback that resurrects hardcoded cards
  assert.doesNotMatch(
    componentSource,
    /remote\.length\s*>\s*0\s*\?\s*remote\s*:\s*publishedAchievements/,
    "Must not fall back to hardcoded cards when remote array is empty",
  );

  // Must export resolveAchievementStories from editorial-content
  const editorialSource = await read("apps/web/lib/editorial-content.ts");
  assert.match(editorialSource, /export function resolveAchievementStories/);
  assert.match(componentSource, /resolveAchievementStories\(\{/);

  // Import the pure resolver
  const { resolveAchievementStories } = await import(
    new URL("apps/web/lib/editorial-content.ts", root).href
  );

  const mockFallback = [
    {
      id: "cls-2026",
      yearLabel: "2026",
      title: "Champion",
      eventName: "CLS Cup",
      description: "Test description",
      photoLabel: "CLS Cup Champion",
      placeholderGradient: "none",
      factsVerified: true,
      photoRightsVerified: true,
      status: "published",
    },
  ];

  const mockArchiveSlots = [
    {
      id: "archive-1",
      yearLabel: "Archive",
      title: "Milestone",
      eventName: "Event",
      description: "Archive description",
      photoLabel: "Archive slot",
      placeholderGradient: "none",
      factsVerified: false,
      photoRightsVerified: false,
      status: "draft",
    },
  ];

  // Case 1: Authoritative API succeeds with intentional empty array (staff unpublished all)
  const intentionalEmpty = resolveAchievementStories({
    remote: [],
    apiError: false,
    fallback: mockFallback,
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(intentionalEmpty.stories.length, 0);
  assert.equal(intentionalEmpty.isIntentionalEmpty, true);
  assert.equal(intentionalEmpty.preview, false);

  // Case 2: Authoritative API succeeds with published items
  const mockRemote = [
    {
      id: "remote-1",
      yearLabel: "2026",
      title: "Live Champion",
      eventName: "Live Cup",
      description: "Live description",
      photoLabel: "Live photo",
      placeholderGradient: "none",
      factsVerified: true,
      photoRightsVerified: true,
      status: "published",
    },
  ];
  const liveSuccess = resolveAchievementStories({
    remote: mockRemote,
    apiError: false,
    fallback: mockFallback,
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(liveSuccess.stories.length, 1);
  assert.equal(liveSuccess.stories[0].id, "remote-1");
  assert.equal(liveSuccess.isIntentionalEmpty, false);
  assert.equal(liveSuccess.preview, false);

  // Case 3: API fails / network offline -> fall back to verified local records
  const apiFailed = resolveAchievementStories({
    remote: null,
    apiError: true,
    fallback: mockFallback,
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(apiFailed.stories.length, 1);
  assert.equal(apiFailed.stories[0].id, "cls-2026");
  assert.equal(apiFailed.isIntentionalEmpty, false);
  assert.equal(apiFailed.preview, false);

  // Case 4: API fails and local fallback is empty -> fall back to archive slots
  const noFallback = resolveAchievementStories({
    remote: null,
    apiError: true,
    fallback: [],
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(noFallback.stories.length, 1);
  assert.equal(noFallback.stories[0].id, "archive-1");
  assert.equal(noFallback.isIntentionalEmpty, false);
  assert.equal(noFallback.preview, true);
});
