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
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await mountComponent(page, {
      component: "achievements",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector("[role=status]");
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
      /No club achievements are currently published/i,
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
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    const makeStory = (photoRightsVerified) => ({
      id: "unverified-1",
      yearLabel: "2026",
      title: "Unverified Youth Title",
      eventName: "Tournament Cup",
      summary: "Tournament description",
      photoLabel: "Championship photo",
      imageUrl: "/media/khlim/unverified-youth.webp",
      factsVerified: true,
      photoRightsVerified,
      aiAssisted: false,
    });

    // Scenario A: Unverified photo rights with flag enabled -> MUST NOT render image URL
    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([makeStory(false)]),
      });
    });

    await mountComponent(page, {
      component: "achievements",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector(".home-achievement-card");
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
    await page.unroute("**/editorial/achievements");
    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([makeStory(true)]),
      });
    });

    await mountComponent(page, {
      component: "achievements",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "0" },
    });

    await page.waitForSelector(".home-achievement-card");
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
    await page.unroute("**/editorial/achievements");
    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([makeStory(true)]),
      });
    });

    await mountComponent(page, {
      component: "achievements",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector(".home-achievement-card");
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

    // Scenario D: Known local slug whose rights are explicitly revoked via API (photoRightsVerified: false)
    await page.unroute("**/editorial/achievements");
    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "jasmine-cup-2026-a",
            slug: "jasmine-cup-2026-a",
            yearLabel: "2026",
            title: "Revoked Rights Story",
            eventName: "Jasmine Cup",
            summary: "Revoked summary",
            photoLabel: "Photo label",
            imageUrl:
              "/media/achievements/jasmine-cup-2025-2026-khlim-a-champion.webp",
            factsVerified: true,
            photoRightsVerified: false,
            aiAssisted: false,
          },
        ]),
      });
    });

    await mountComponent(page, {
      component: "achievements",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector(".home-achievement-card");
    photoEl = page.locator(".home-achievement-photo");
    style = await photoEl.getAttribute("style");
    assert.doesNotMatch(
      style,
      /url\(/,
      "Explicit API photoRightsVerified=false must override local metadata and not render url(...)",
    );

    // Scenario E: Local metadata must not re-authorize an API entry with omitted rights.
    await page.unroute("**/editorial/achievements");
    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            ...makeStory(true),
            id: "jasmine-cup-2026-a",
            slug: "jasmine-cup-2026-a",
            photoRightsVerified: undefined,
            imageUrl:
              "/media/achievements/jasmine-cup-2025-2026-khlim-a-champion.webp",
          },
        ]),
      });
    });
    await mountComponent(page, {
      component: "achievements",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });
    await page.waitForSelector(".home-achievement-card");
    photoEl = page.locator(".home-achievement-photo");
    style = await photoEl.getAttribute("style");
    assert.doesNotMatch(
      style,
      /url\(/,
      "Missing API photo rights must fail closed even for a known local slug",
    );

    // Scenario F: A rights-verified API entry without an image URL must not
    // inherit a previously approved local asset after an editorial withdrawal.
    await page.unroute("**/editorial/achievements");
    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            ...makeStory(true),
            id: "jasmine-cup-2026-a",
            slug: "jasmine-cup-2026-a",
            imageUrl: undefined,
          },
        ]),
      });
    });
    await mountComponent(page, {
      component: "achievements",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });
    await page.waitForSelector(".home-achievement-card");
    photoEl = page.locator(".home-achievement-photo");
    style = await photoEl.getAttribute("style");
    assert.doesNotMatch(
      style,
      /url\(/,
      "Missing API image URL must not fall back to locally approved youth photography",
    );
  } finally {
    await browser.close();
  }
});

test("browser/component regression: API failures cannot resurrect withdrawn photographs", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({ status: 500 });
    });

    await mountComponent(page, {
      component: "achievements",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector(".home-editorial-notice[role=note]");
    const previewNotice = page.locator(".home-editorial-notice[role=note]");
    assert.equal(await previewNotice.isVisible(), true);

    const photos = page.locator(".home-achievement-photo");
    const count = await photos.count();
    assert.ok(count > 0, "Archive fallback slots must be rendered");

    for (let i = 0; i < count; i++) {
      const photoStyle = await photos.nth(i).getAttribute("style");
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
    }

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

test("browser/component regression: player spotlight cards fail closed like achievements", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    const makeSpotlight = (photoRightsVerified) => ({
      id: "spotlight-test-1",
      slug: "rising-star-milestone",
      title: "Rising Star Championship",
      eventName: "Junior National Cup",
      summary: "Player achieved defining national milestone",
      playerName: "Rising Athlete",
      achievement: "Gold Medal",
      achievedOnLabel: "October 2026",
      photoLabel: "Player on podium celebration",
      imageUrl: "/media/khlim/unverified-spotlight.webp",
      factsVerified: true,
      photoRightsVerified,
      aiAssisted: true,
    });

    // Scenario A: Unverified photo rights with flag enabled -> MUST NOT render image URL
    await page.route("**/editorial/player-spotlights", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([makeSpotlight(false)]),
      });
    });

    await mountComponent(page, {
      component: "spotlightSection",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector(".home-spotlight-card");
    let photoEl = page.locator(".home-spotlight-photo");
    let style = await photoEl.getAttribute("style");
    assert.doesNotMatch(
      style,
      /unverified-spotlight\.webp/,
      "Spotlight card with unverified photo rights must not render imageUrl",
    );
    assert.doesNotMatch(
      style,
      /url\(/,
      "Spotlight card with unverified photo rights must not have url(...) in background",
    );
    assert.equal(
      await page.locator(".home-spotlight-photo-label").isVisible(),
      true,
      "Spotlight card must render placeholder label when photo rights are unverified",
    );

    // Scenario B: Verified photo rights but flag disabled -> MUST NOT render image URL
    await page.unroute("**/editorial/player-spotlights");
    await page.route("**/editorial/player-spotlights", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([makeSpotlight(true)]),
      });
    });

    await mountComponent(page, {
      component: "spotlightSection",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "0" },
    });

    await page.waitForSelector(".home-spotlight-card");
    photoEl = page.locator(".home-spotlight-photo");
    style = await photoEl.getAttribute("style");
    assert.doesNotMatch(
      style,
      /unverified-spotlight\.webp/,
      "Spotlight image must not render when youth media rights flag is disabled",
    );
    assert.doesNotMatch(style, /url\(/);

    // Scenario C: Both verified rights and flag enabled -> image renders
    await page.unroute("**/editorial/player-spotlights");
    await page.route("**/editorial/player-spotlights", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([makeSpotlight(true)]),
      });
    });

    await mountComponent(page, {
      component: "spotlightSection",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector(".home-spotlight-card");
    photoEl = page.locator(".home-spotlight-photo");
    style = await photoEl.getAttribute("style");
    assert.match(
      style,
      /unverified-spotlight\.webp/,
      "Spotlight card with verified rights and confirmed flag must render imageUrl",
    );
    assert.equal(await page.locator(".home-spotlight-photo-label").count(), 0);
  } finally {
    await browser.close();
  }
});

test("browser/component regression: spotlight article detail page fails closed on unverified image", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    const makeArticle = (photoRightsVerified) => ({
      slug: "article-slug-test",
      playerName: "Test Player",
      headline: "National Stage Achievement",
      eventName: "Junior Championship",
      achievement: "Top Scorer",
      achievedOnLabel: "2026",
      excerpt: "Article excerpt text",
      articleParagraphs: ["First paragraph.", "Second paragraph."],
      photoLabel: "Player celebrating",
      imageUrl: "/media/khlim/unverified-article-photo.webp",
      placeholderGradient: "linear-gradient(135deg, #18181b, #0f172a)",
      factsVerified: true,
      photoRightsVerified,
      status: "published",
      aiAssisted: true,
    });

    // Unverified article photo -> must not render imageUrl
    await mountComponent(page, {
      component: "spotlightArticle",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
      props: { article: makeArticle(false) },
    });

    await page.waitForSelector(".spotlight-article-hero", {
      state: "attached",
    });
    let hero = page.locator(".spotlight-article-hero");
    let style = await hero.getAttribute("style");
    assert.doesNotMatch(style, /unverified-article-photo\.webp/);
    assert.doesNotMatch(style, /url\(/);
    assert.equal(await hero.locator("span").isVisible(), true);

    // Verified article photo + confirmed flag -> renders imageUrl
    await mountComponent(page, {
      component: "spotlightArticle",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
      props: { article: makeArticle(true) },
    });

    await page.waitForSelector(".spotlight-article-hero", {
      state: "attached",
    });
    hero = page.locator(".spotlight-article-hero");
    style = await hero.getAttribute("style");
    assert.match(style, /unverified-article-photo\.webp/);
    assert.equal(await hero.locator("span").count(), 0);
  } finally {
    await browser.close();
  }
});

test("browser/component regression: locale switcher restores visible keyboard focus indicator", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await mountComponent(page, {
      component: "localeSwitcher",
      env: {},
    });

    const select = page.locator("select");
    await select.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");

    const outline = await select.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        outlineWidth: s.outlineWidth,
        outlineStyle: s.outlineStyle,
        outlineColor: s.outlineColor,
      };
    });

    assert.notEqual(
      outline.outlineStyle,
      "none",
      "Keyboard focus indicator must not have outlineStyle none",
    );
    assert.match(
      outline.outlineWidth,
      /^[1-9]\d*px/,
      "Keyboard focus indicator must have visible outline width >= 1px",
    );
  } finally {
    await browser.close();
  }
});
