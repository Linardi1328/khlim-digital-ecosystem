import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");

test("static contract: unified spotlight archive page structure and references", async () => {
  const page = await read("apps/web/app/spotlight/page.tsx");
  const achievementsComp = await read(
    "apps/web/components/home/achievements-section.tsx",
  );
  const spotlightComp = await read(
    "apps/web/components/home/player-spotlight-section.tsx",
  );

  // Contract references required by other test suites
  assert.match(page, /publishedPlayerSpotlights/);
  assert.match(page, /fetchPublishedSpotlights/);
  assert.match(page, /fetchPublishedAchievements/);

  // Unified archive heading and section IDs
  assert.match(page, /t\("spotlight\.archive\.title"\)/);
  assert.match(page, /id="achievements"/);
  assert.match(page, /id="player-spotlights"/);
  assert.match(page, /href="#achievements"/);
  assert.match(page, /href="#player-spotlights"/);

  // Curated achievement IDs for championships and representative milestones
  assert.match(page, /cls-international-cup-2026/);
  assert.match(page, /sba-selangor-2025-d1/);
  assert.match(page, /jasmine-cup-2026-a/);
  assert.match(page, /sba-selangor-2026-u16/);
  assert.match(page, /mssm-2024/);
  assert.match(page, /mssm-2025/);
  assert.match(page, /lmc-cup-2025/);
  assert.match(page, /maba-matrix-u17-2026/);

  // Fail-closed empty states
  assert.match(page, /t\("spotlight\.achievements\.emptyTitle"\)/);
  assert.match(page, /t\("spotlight\.achievements\.emptyBody"\)/);
  assert.match(page, /t\("spotlight\.players\.emptyTitle"\)/);
  assert.match(page, /t\("spotlight\.players\.emptyBody"\)/);

  // Homepage CTAs
  assert.match(
    achievementsComp,
    /buildUrlWithSource\(\s*["']\/spotlight#achievements["']/,
  );
  assert.match(
    spotlightComp,
    /buildUrlWithSource\(\s*["']\/spotlight#player-spotlights["']/,
  );
});

test("browser: unified spotlight page renders honest empty states when API returns empty", async () => {
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
    await page.route("**/editorial/player-spotlights", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await mountComponent(page, {
      component: "spotlightArchivePage",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    // Main heading
    const heading = page.locator("h1");
    await heading.waitFor({ state: "visible" });
    assert.equal(await heading.textContent(), "KHLIM Spotlight");
    await page
      .locator("#achievements .spotlight-empty-state")
      .waitFor({ state: "visible" });
    await page
      .locator("#player-spotlights .spotlight-empty-state")
      .waitFor({ state: "visible" });

    // Quick jump navigation
    const jumpLinks = page.locator(".spotlight-jump-pill");
    assert.equal(await jumpLinks.count(), 2);
    assert.match(await jumpLinks.nth(0).getAttribute("href"), /#achievements$/);
    assert.match(
      await jumpLinks.nth(1).getAttribute("href"),
      /#player-spotlights$/,
    );

    // Section 1: Team Achievements empty state
    const achievementsSection = page.locator("#achievements");
    assert.equal(await achievementsSection.count(), 1);
    const achievementsEmpty = achievementsSection.locator(
      ".spotlight-empty-state",
    );
    assert.equal(await achievementsEmpty.count(), 1);
    assert.match(
      await achievementsEmpty.locator("h3").textContent(),
      /Editorial Review in Progress/,
    );
    assert.match(
      await achievementsEmpty.locator("p").textContent(),
      /Championship records and tournament photographs are currently undergoing editorial and media-rights certification/,
    );
    // Club badge banner is visible in achievements empty state
    assert.equal(
      await achievementsSection
        .locator(".home-club-distinction-banner")
        .isVisible(),
      true,
    );

    // Section 2: Player Spotlights empty state (honest, no fake news)
    const spotlightsSection = page.locator("#player-spotlights");
    assert.equal(await spotlightsSection.count(), 1);
    const spotlightsEmpty = spotlightsSection.locator(".spotlight-empty-state");
    assert.equal(await spotlightsEmpty.count(), 1);
    assert.match(
      await spotlightsEmpty.locator("h3").textContent(),
      /Individual Stories Pending Release/,
    );
    assert.match(
      await spotlightsEmpty.locator("p").textContent(),
      /Individual player profiles require verified source facts, coach review, and documented guardian consent/,
    );

    // Zero fake / unverified article cards rendered
    assert.equal(await page.locator(".spotlight-archive-card").count(), 0);
    assert.equal(await page.locator(".home-achievement-card").count(), 0);
  } finally {
    await browser.close();
  }
});

test("browser: unified spotlight page curates published achievements and player spotlights", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    const mockAchievements = [
      {
        id: "cls-international-cup-2026",
        yearLabel: "2026",
        title: "Champion — Girls KU-16",
        eventName: "80th CLS International Cup, Indonesia",
        summary: "CLS Champions summary",
        photoLabel: "80th CLS Champions photo",
        imageUrl:
          "/media/achievements/cls-international-indonesia-2026-champion.webp",
        factsVerified: true,
        photoRightsVerified: true,
        aiAssisted: false,
      },
      {
        id: "sba-selangor-2025-d1",
        yearLabel: "2025",
        title: "Champion — Division 1",
        eventName: "U15 SBA D1 Selangor Tournament",
        summary: "SBA D1 Champions summary",
        photoLabel: "U15 SBA D1 photo",
        imageUrl: "/media/achievements/u15-sba-d1-selangor-2025-champion.webp",
        factsVerified: true,
        photoRightsVerified: true,
        aiAssisted: false,
      },
      {
        id: "mssm-2024",
        yearLabel: "2024",
        title: "MSSM State Representative",
        eventName: "MSSM National Championship",
        summary: "KHLIM MSSM representative milestone",
        photoLabel: "MSSM Representative photo",
        imageUrl: "/media/achievements/khlim-mssm-2024.webp",
        factsVerified: true,
        photoRightsVerified: true,
        aiAssisted: false,
      },
      {
        id: "fastbreak-2024-u14g",
        yearLabel: "2024",
        title: "Champion — Girls U14",
        eventName: "U14G Fastbreak League",
        summary: "Fastbreak League Champions",
        photoLabel: "U14G Fastbreak photo",
        imageUrl: "/media/achievements/u14g-fastbreak-2024-champion.webp",
        factsVerified: true,
        photoRightsVerified: true,
        aiAssisted: false,
      },
    ];

    const mockSpotlights = [
      {
        id: "spotlight-test-1",
        slug: "verified-player-story",
        title: "Championship Finalist Performance",
        eventName: "National Cup 2026",
        summary: "Outstanding game leadership in tournament playoffs.",
        playerName: "Alex Tan",
        achievement: "Tournament MVP",
        achievedOnLabel: "August 2026",
        photoLabel: "Alex Tan medal ceremony",
        imageUrl: "/media/khlim/team-hero-1920.webp",
        factsVerified: true,
        photoRightsVerified: true,
        aiAssisted: true,
      },
    ];

    await page.route("**/editorial/achievements", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAchievements),
      });
    });
    await page.route("**/editorial/player-spotlights", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSpotlights),
      });
    });

    await mountComponent(page, {
      component: "spotlightArchivePage",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector(".home-achievement-card");

    // Section 1: Team Achievements subsections
    const achievementsSection = page.locator("#achievements");

    // Championship honours subsection contains CLS and SBA D1
    const featuredHeading = achievementsSection.getByRole("heading", {
      name: "Championship Honours",
    });
    await expect(featuredHeading).toBeVisible();

    // Archive subsection contains Fastbreak
    const archiveHeading = achievementsSection.getByRole("heading", {
      name: "Tournament Archive",
    });
    await expect(archiveHeading).toBeVisible();

    // Verified club achievement cards count (CLS, SBA D1, Fastbreak)
    const achievementCards = achievementsSection.locator(
      ".home-achievement-card",
    );
    assert.equal(await achievementCards.count(), 3);

    // Section 2: Player Spotlights
    const spotlightsSection = page.locator("#player-spotlights");

    // Milestones subsection in Player Spotlights contains MSSM (Representative selection)
    const milestonesHeading = spotlightsSection.getByRole("heading", {
      name: "Player Highlights & Representative Milestones",
    });
    await expect(milestonesHeading).toBeVisible();

    // Verified representative milestone cards count in Player Spotlights
    const representativeCards = spotlightsSection.locator(
      ".home-achievement-card",
    );
    assert.equal(await representativeCards.count(), 1);

    const spotlightCards = spotlightsSection.locator(".spotlight-archive-card");
    assert.equal(await spotlightCards.count(), 1);
    assert.match(
      await spotlightCards.locator("h2").textContent(),
      /Championship Finalist Performance/,
    );
    assert.match(
      await spotlightCards.locator("a").getAttribute("href"),
      /\/spotlight\/verified-player-story/,
    );
  } finally {
    await browser.close();
  }
});

test("browser: responsive layout and no horizontal overflow across 5 viewports", async () => {
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
    await page.route("**/editorial/player-spotlights", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await mountComponent(page, {
      component: "spotlightArchivePage",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    const viewports = [
      { width: 320, height: 600 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(100);

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth > root.clientWidth + 1;
      });
      assert.equal(
        overflow,
        false,
        `Horizontal overflow detected at viewport ${vp.width}x${vp.height}`,
      );

      const h1Visible = await page.locator("h1").isVisible();
      assert.equal(h1Visible, true, `H1 must be visible at ${vp.width}px`);
    }
  } finally {
    await browser.close();
  }
});

test("browser: multilingual localization on spotlight page (en, ms, zh-Hans)", async () => {
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
    await page.route("**/editorial/player-spotlights", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // English
    await mountComponent(page, {
      component: "spotlightArchivePage",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
      props: { initialLocale: "en" },
    });
    assert.equal(await page.locator("h1").textContent(), "KHLIM Spotlight");
    assert.match(
      await page.locator("#achievements h2").textContent(),
      /Team Achievements/,
    );
    assert.match(
      await page.locator("#player-spotlights h2").textContent(),
      /Player Spotlights/,
    );

    // Bahasa Melayu
    await mountComponent(page, {
      component: "spotlightArchivePage",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
      props: { initialLocale: "ms" },
    });
    assert.equal(await page.locator("h1").textContent(), "Sorotan KHLIM");
    assert.match(
      await page.locator("#achievements h2").textContent(),
      /Pencapaian Pasukan/,
    );
    assert.match(
      await page.locator("#player-spotlights h2").textContent(),
      /Sorotan Pemain/,
    );

    // 简体中文
    await mountComponent(page, {
      component: "spotlightArchivePage",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
      props: { initialLocale: "zh-Hans" },
    });
    assert.equal(await page.locator("h1").textContent(), "KHLIM 聚焦");
    assert.match(
      await page.locator("#achievements h2").textContent(),
      /球队战绩/,
    );
    assert.match(
      await page.locator("#player-spotlights h2").textContent(),
      /球员聚焦/,
    );
  } finally {
    await browser.close();
  }
});

function expect(locator) {
  return {
    async toBeVisible() {
      const isVis = await locator.isVisible();
      assert.equal(isVis, true, `Expected element to be visible`);
    },
  };
}
