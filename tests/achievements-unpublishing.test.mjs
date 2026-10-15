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

  // Must track loading separately from completion
  assert.match(
    componentSource,
    /const \[isLoading, setIsLoading\] = useState\(true\)/,
  );

  // Must gate youth photographs behind confirmed media rights
  assert.match(
    componentSource,
    /NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED === "1"/,
  );

  // Import the pure resolver
  const { resolveAchievementStories } = await import(
    new URL("apps/web/lib/editorial-content.ts", root).href
  );

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

  // Case 1: Initial loading state prior to API resolution (must not reveal photographs)
  const loadingState = resolveAchievementStories({
    remote: null,
    apiError: false,
    isLoading: true,
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(loadingState.state, "loading");
  assert.equal(loadingState.stories.length, 0);
  assert.equal(loadingState.isLoading, true);
  assert.equal(loadingState.isIntentionalEmpty, false);
  assert.equal(loadingState.preview, false);

  // Case 2: Authoritative API succeeds with intentional empty array (staff unpublished all)
  const intentionalEmpty = resolveAchievementStories({
    remote: [],
    apiError: false,
    isLoading: false,
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(intentionalEmpty.state, "empty");
  assert.equal(intentionalEmpty.stories.length, 0);
  assert.equal(intentionalEmpty.isIntentionalEmpty, true);
  assert.equal(intentionalEmpty.preview, false);
  assert.equal(intentionalEmpty.isLoading, false);

  // Case 3: Authoritative API succeeds with published items
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
    isLoading: false,
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(liveSuccess.state, "success");
  assert.equal(liveSuccess.stories.length, 1);
  assert.equal(liveSuccess.stories[0].id, "remote-1");
  assert.equal(liveSuccess.isIntentionalEmpty, false);
  assert.equal(liveSuccess.preview, false);
  assert.equal(liveSuccess.isLoading, false);

  // Case 4: API outage / network offline -> fail-closed against unverified or unpublished media
  // Must NEVER resurrect youth photographs; renders neutral archive preview slots
  const apiFailed = resolveAchievementStories({
    remote: null,
    apiError: true,
    isLoading: false,
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(apiFailed.state, "error");
  assert.equal(apiFailed.stories.length, 1);
  assert.equal(apiFailed.stories[0].id, "archive-1");
  assert.equal(apiFailed.isIntentionalEmpty, false);
  assert.equal(apiFailed.preview, true);
  assert.equal(apiFailed.isLoading, false);

  // Case 5: Takedown scenario: live items published, then unpublished to []
  const takedown = resolveAchievementStories({
    remote: [],
    apiError: false,
    isLoading: false,
    archiveSlots: mockArchiveSlots,
  });
  assert.equal(takedown.state, "empty");
  assert.equal(takedown.stories.length, 0);
  assert.equal(takedown.isIntentionalEmpty, true);
});
