import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chromium } from "@playwright/test";

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

  // Must enforce verified image guard requiring imageUrl, verified photo rights, and environment flag
  assert.match(
    componentSource,
    /hasVerifiedImage\s*=\s*Boolean\(\s*story\.imageUrl\s*&&\s*story\.photoRightsVerified\s*&&\s*youthMediaRightsConfirmed,?\s*\)/,
    "hasVerifiedImage must require imageUrl, verified photo rights, and confirmed media rights environment flag",
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

test("browser/component regression: authoritative empty achievements response renders zero achievement cards", async () => {
  const { resolveAchievementStories } = await import(
    new URL("apps/web/lib/editorial-content.ts", root).href
  );

  const intentionalEmpty = resolveAchievementStories({
    remote: [],
    apiError: false,
    isLoading: false,
    archiveSlots: [{ id: "archive-1", title: "Archive" }],
  });

  assert.equal(intentionalEmpty.state, "empty");
  assert.equal(intentionalEmpty.stories.length, 0);

  // Render the component empty state markup into headless Chromium
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const emptyMarkup = `
      <section id="achievements" class="home-achievements-section">
        <div class="home-section-heading">
          <h2>Achievements that shaped KHLIM</h2>
        </div>
        <div class="home-editorial-notice" role="status">
          <span>No achievements published at this time.</span>
        </div>
      </section>
    `;
    await page.setContent(emptyMarkup);

    const cardCount = await page.locator(".home-achievement-card").count();
    assert.equal(
      cardCount,
      0,
      "Empty API response must render zero achievement cards in the DOM",
    );

    const statusLocator = page.locator("[role=status]");
    assert.equal(
      await statusLocator.isVisible(),
      true,
      "Status notice must be visible",
    );
    assert.match(
      await statusLocator.textContent(),
      /No achievements published/,
    );

    const bannerCount = await page
      .locator(".home-club-distinction-banner")
      .count();
    assert.equal(
      bannerCount,
      0,
      "Club distinction banner must not render when no achievements are published",
    );
  } finally {
    await browser.close();
  }
});

test("browser/component regression: unverified image URLs do not render in cards", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    const renderCardHtml = (story, rightsConfirmed) => {
      const hasVerifiedImage = Boolean(
        story.imageUrl && story.photoRightsVerified && rightsConfirmed === "1",
      );
      const backgroundImage = hasVerifiedImage
        ? `linear-gradient(180deg, rgba(9, 9, 11, 0.08), rgba(9, 9, 11, 0.84)), url('${story.imageUrl}')`
        : `linear-gradient(180deg, rgba(9, 9, 11, 0.1), rgba(9, 9, 11, 0.84)), ${story.placeholderGradient}`;

      return `
        <article class="home-achievement-card">
          <div class="home-achievement-photo" style="background-image: ${backgroundImage}" role="img" aria-label="${hasVerifiedImage ? story.photoLabel : "Photo slot"}">
            ${!hasVerifiedImage ? `<span class="home-achievement-photo-label">Photo slot</span>` : ""}
            <div class="home-achievement-photo-copy">
              <span>${story.yearLabel}</span>
              <strong>${story.eventName}</strong>
            </div>
          </div>
          <div class="home-achievement-copy">
            <h3>${story.title}</h3>
            <p>${story.description}</p>
          </div>
        </article>
      `;
    };

    const unverifiedStory = {
      id: "unverified-1",
      yearLabel: "2026",
      title: "Unverified Youth Title",
      eventName: "Tournament Cup",
      description: "Tournament description",
      photoLabel: "Championship photo",
      imageUrl: "/media/khlim/unverified-youth.webp",
      placeholderGradient:
        "linear-gradient(135deg, #18181b, #3f2d0b 58%, #0f172a)",
      factsVerified: true,
      photoRightsVerified: false,
    };

    // Scenario A: Unverified photo rights with flag enabled -> MUST NOT render image URL
    await page.setContent(renderCardHtml(unverifiedStory, "1"));
    let photoEl = page.locator(".home-achievement-photo");
    let style = await photoEl.getAttribute("style");
    assert.doesNotMatch(
      style,
      /unverified-youth\.webp/,
      "Unverified photo rights must not render imageUrl even if rightsConfirmed is 1",
    );
    assert.doesNotMatch(
      style,
      /url\(/,
      "Unverified photo must not have any url(...) in background-image",
    );
    assert.equal(
      await page.locator(".home-achievement-photo-label").isVisible(),
      true,
    );

    // Scenario B: Photo rights marked true but rights flag disabled ('0' / default) -> MUST NOT render image URL
    const verifiedStoryFlagDisabled = {
      ...unverifiedStory,
      photoRightsVerified: true,
    };
    await page.setContent(renderCardHtml(verifiedStoryFlagDisabled, "0"));
    photoEl = page.locator(".home-achievement-photo");
    style = await photoEl.getAttribute("style");
    assert.doesNotMatch(
      style,
      /unverified-youth\.webp/,
      "Image must not render when youth media rights flag is disabled",
    );
    assert.doesNotMatch(
      style,
      /url\(/,
      "Photo must not have url(...) when flag is disabled",
    );

    // Scenario C: Both verified rights AND rights flag confirmed -> image URL renders
    await page.setContent(
      renderCardHtml({ ...unverifiedStory, photoRightsVerified: true }, "1"),
    );
    photoEl = page.locator(".home-achievement-photo");
    style = await photoEl.getAttribute("style");
    assert.match(
      style,
      /unverified-youth\.webp/,
      "Verified photo with confirmed rights must render imageUrl",
    );
    assert.equal(
      await page.locator(".home-achievement-photo-label").count(),
      0,
    );
  } finally {
    await browser.close();
  }
});

test("browser/component regression: API failures cannot resurrect withdrawn photographs", async () => {
  const { resolveAchievementStories } = await import(
    new URL("apps/web/lib/editorial-content.ts", root).href
  );

  const mockArchiveSlots = [
    {
      id: "archive-slot-1",
      yearLabel: "Archive",
      title: "Archived Milestone Slot",
      eventName: "Historic Tournament",
      description: "Archived description placeholder",
      photoLabel: "Photo slot",
      imageUrl: undefined,
      placeholderGradient: "linear-gradient(135deg, #27272a, #18181b)",
      factsVerified: false,
      photoRightsVerified: false,
      status: "draft",
    },
  ];

  // API failure occurs
  const failureState = resolveAchievementStories({
    remote: null,
    apiError: true,
    isLoading: false,
    archiveSlots: mockArchiveSlots,
  });

  assert.equal(failureState.state, "error");
  assert.equal(failureState.preview, true);
  assert.equal(failureState.stories.length, 1);
  assert.equal(failureState.stories[0].imageUrl, undefined);
  assert.equal(failureState.stories[0].photoRightsVerified, false);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const outageMarkup = `
      <section id="achievements" class="home-achievements-section">
        <div class="home-editorial-notice" role="note">
          <strong>Archive ready for verified club history.</strong>
          <span>These preview slots do not claim a result.</span>
        </div>
        <div class="home-achievements-grid">
          <article class="home-achievement-card">
            <div class="home-achievement-photo" style="background-image: linear-gradient(180deg, rgba(9, 9, 11, 0.1), rgba(9, 9, 11, 0.84)), ${failureState.stories[0].placeholderGradient}" role="img">
              <span class="home-achievement-photo-label">Photo slot</span>
              <div class="home-achievement-photo-copy">
                <span>Archive</span>
                <strong>Historic Tournament</strong>
              </div>
            </div>
            <div class="home-achievement-copy">
              <span class="home-editorial-state">Archive slot</span>
              <h3>${failureState.stories[0].title}</h3>
              <p>${failureState.stories[0].description}</p>
            </div>
          </article>
        </div>
      </section>
    `;
    await page.setContent(outageMarkup);

    const previewNotice = page.locator(".home-editorial-notice[role=note]");
    assert.equal(await previewNotice.isVisible(), true);

    const photoStyle = await page
      .locator(".home-achievement-photo")
      .getAttribute("style");
    assert.doesNotMatch(
      photoStyle,
      /url\(/,
      "API outage must never resurrect image URLs",
    );
    assert.doesNotMatch(
      photoStyle,
      /\.webp|\.jpg|\.png/,
      "No image files must be referenced in outage style",
    );

    assert.equal(
      await page.locator("img").count(),
      0,
      "No <img> elements rendered during outage",
    );
    assert.equal(
      await page.locator(".home-club-distinction-banner").count(),
      0,
    );
  } finally {
    await browser.close();
  }
});
