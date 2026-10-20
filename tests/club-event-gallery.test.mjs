import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { test } from "node:test";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);

test("club event gallery: data model accounts for all 9 event photographs with factual captions", async () => {
  const { clubEventGallery } = await import(
    new URL("apps/web/lib/editorial-content.ts", root).href
  );

  assert.equal(
    clubEventGallery.length,
    9,
    "Must contain exactly 9 club event gallery items",
  );

  const expectedOriginals = [
    "Copy of NIN_5719.jpg",
    "Copy of NIN_5725.jpg",
    "Copy of NIN_6916.jpg",
    "Copy of NIN_6971.jpg",
    "Copy of NIN_7275.jpg",
    "IMG_2398.HEIC",
    "IMG_2477 2.PNG",
    "IMG_2814.JPG",
    "IMG_2824.HEIC",
  ];

  for (const original of expectedOriginals) {
    const item = clubEventGallery.find((g) => g.originalFileName === original);
    assert.ok(item, `Gallery must include item for original file ${original}`);
    assert.ok(
      item.title && item.title.trim().length > 0,
      `Item for ${original} must have title`,
    );
    assert.ok(
      item.description && item.description.trim().length > 0,
      `Item for ${original} must have description`,
    );
    assert.ok(
      item.photoLabel && item.photoLabel.trim().length > 0,
      `Item for ${original} must have photoLabel`,
    );
    assert.ok(
      item.imageUrl && item.imageUrl.startsWith("/media/achievements/"),
      `Item for ${original} must have webp image path`,
    );

    // Verify file exists on disk in deployable public tree
    const diskPath = `apps/web/public${item.imageUrl}`;
    await access(new URL(diskPath, root));
  }

  // Factual caption verification: duplicate / companion analysis
  const wideItem = clubEventGallery.find(
    (g) => g.originalFileName === "Copy of NIN_6916.jpg",
  );
  const momentItem = clubEventGallery.find(
    (g) => g.originalFileName === "Copy of NIN_6971.jpg",
  );
  assert.match(
    wideItem.notes,
    /NIN_6971/,
    "NIN_6916 must note companion relationship with NIN_6971",
  );
  assert.match(
    momentItem.notes,
    /NIN_6916/,
    "NIN_6971 must note companion relationship with NIN_6916",
  );

  const spiritItem = clubEventGallery.find(
    (g) => g.originalFileName === "IMG_2398.HEIC",
  );
  const formalItem = clubEventGallery.find(
    (g) => g.originalFileName === "IMG_2477 2.PNG",
  );
  assert.match(
    spiritItem.notes,
    /IMG_2477/,
    "IMG_2398 must be distinguished from formal portrait IMG_2477 2",
  );
  assert.match(
    formalItem.notes,
    /IMG_2398/,
    "IMG_2477 2 must be distinguished from spirit pose IMG_2398",
  );

  const huddleItem = clubEventGallery.find(
    (g) => g.originalFileName === "Copy of NIN_5719.jpg",
  );
  const lineupItem = clubEventGallery.find(
    (g) => g.originalFileName === "Copy of NIN_5725.jpg",
  );
  assert.match(
    huddleItem.notes,
    /NIN_5725/,
    "NIN_5719 must note matchday pairing with NIN_5725",
  );
  assert.match(
    lineupItem.notes,
    /NIN_5719/,
    "NIN_5725 must note matchday pairing with NIN_5719",
  );
});

test("browser: unified spotlight page renders 9-item club gallery under #achievements", async () => {
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
        body: JSON.stringify([]),
      });
    });

    await mountComponent(page, {
      component: "spotlightArchivePage",
      env: { NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED: "1" },
    });

    await page.waitForSelector(".spotlight-club-gallery-grid");

    const galleryCards = page.locator(".spotlight-gallery-card");
    assert.equal(
      await galleryCards.count(),
      9,
      "Must render exactly 9 gallery cards",
    );

    const firstCardTitle = await galleryCards
      .first()
      .locator("h4")
      .textContent();
    assert.equal(firstCardTitle, "Pre-Game Strategy Circle");
  } finally {
    await browser.close();
  }
});
