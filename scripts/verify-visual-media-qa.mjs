import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

const SCREENSHOTS_DIR =
  process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), "khlim-screenshots");

async function run() {
  const browser = await chromium.launch({ headless: true });
  console.log("Starting visual media QA verification...");

  // 1. Desktop 1440px Retina DPR (DPR=2)
  console.log("\n--- Testing Desktop 1440px Retina DPR (scale 2) ---");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://localhost:3000/", {
    waitUntil: "networkidle",
  });

  const dots = desktopPage.locator(".home-carousel-dots button");
  const dotCount = await dots.count();
  console.log(`Found ${dotCount} carousel dots`);

  const expectedDesktopImages = [
    {
      name: "Slide 1 (Team Hero)",
      url: "/media/khlim/team-hero-wide-1920.webp",
      expectedW: 1920,
      expectedH: 1080,
    },
    {
      name: "Slide 2 (Team Huddle)",
      url: "/media/home/team-huddle-desktop.webp",
      expectedW: 2560,
      expectedH: 1440,
    },
    {
      name: "Slide 3 (Sideline Energy)",
      url: "/media/home/sideline-energy-desktop.webp",
      expectedW: 2560,
      expectedH: 1440,
    },
    {
      name: "Slide 4 (Court Together)",
      url: "/media/home/court-together-desktop.webp",
      expectedW: 1920,
      expectedH: 1080,
    },
  ];

  for (let i = 0; i < expectedDesktopImages.length; i++) {
    const item = expectedDesktopImages[i];
    await dots.nth(i).click();
    await desktopPage.waitForTimeout(600); // allow transition

    const activeSlide = desktopPage.locator(".home-hero-slide.is-active");
    await activeSlide.waitFor({ state: "visible" });

    const bgImage = await activeSlide.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });

    console.log(
      `[Desktop] ${item.name}: computed background-image = ${bgImage}`,
    );
    assert.match(
      bgImage,
      new RegExp(item.url),
      `Slide ${i + 1} must reference ${item.url}`,
    );

    // Verify natural image dimensions via browser Image loader
    const dims = await desktopPage.evaluate((url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Failed to load " + url));
        img.src = url;
      });
    }, item.url);

    console.log(
      `[Desktop] ${item.name}: natural dimensions = ${dims.width}x${dims.height} (expected ${item.expectedW}x${item.expectedH})`,
    );
    assert.equal(
      dims.width,
      item.expectedW,
      `Width must match ${item.expectedW}`,
    );
    assert.equal(
      dims.height,
      item.expectedH,
      `Height must match ${item.expectedH}`,
    );

    await desktopPage.screenshot({
      path: `${SCREENSHOTS_DIR}/hero-slide${i + 1}-1440px-retina.png`,
      clip: { x: 0, y: 0, width: 1440, height: 720 },
    });
  }

  // 2. Mobile 390px (portrait)
  console.log("\n--- Testing Mobile 390px ---");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000/", { waitUntil: "networkidle" });

  const mobileDots = mobilePage.locator(".home-carousel-dots button");
  const expectedMobileImages = [
    {
      name: "Slide 1 (Team Hero Mobile)",
      url: "/media/khlim/team-hero-1920.webp",
      expectedW: 1920,
      expectedH: 1280,
    },
    {
      name: "Slide 2 (Team Huddle Mobile)",
      url: "/media/home/team-huddle-mobile.webp",
      expectedW: 1080,
      expectedH: 1350,
    },
    {
      name: "Slide 3 (Sideline Energy Mobile)",
      url: "/media/home/sideline-energy-mobile.webp",
      expectedW: 1080,
      expectedH: 1350,
    },
    {
      name: "Slide 4 (Court Together Mobile)",
      url: "/media/home/court-together-mobile.webp",
      expectedW: 1080,
      expectedH: 1350,
    },
  ];

  for (let i = 0; i < expectedMobileImages.length; i++) {
    const item = expectedMobileImages[i];
    await mobileDots.nth(i).click();
    await mobilePage.waitForTimeout(600);

    const activeSlide = mobilePage.locator(".home-hero-slide.is-active");
    await activeSlide.waitFor({ state: "visible" });

    const bgImage = await activeSlide.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });

    console.log(
      `[Mobile] ${item.name}: computed background-image = ${bgImage}`,
    );
    assert.match(
      bgImage,
      new RegExp(item.url),
      `Mobile slide ${i + 1} must reference mobile crop ${item.url}`,
    );
    assert.doesNotMatch(
      bgImage,
      /-desktop\.webp/,
      `Mobile slide must NOT reference desktop crop`,
    );

    const dims = await mobilePage.evaluate((url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Failed to load " + url));
        img.src = url;
      });
    }, item.url);

    console.log(
      `[Mobile] ${item.name}: natural dimensions = ${dims.width}x${dims.height} (expected ${item.expectedW}x${item.expectedH})`,
    );
    assert.equal(dims.width, item.expectedW);
    assert.equal(dims.height, item.expectedH);

    await mobilePage.screenshot({
      path: `${SCREENSHOTS_DIR}/hero-slide${i + 1}-390px-mobile.png`,
      clip: { x: 0, y: 0, width: 390, height: 600 },
    });
  }

  // 3. Spotlight page with published achievements & Jasmine Cup photos
  console.log("\n--- Testing Spotlight Page with Published Achievements ---");
  const spotlightContext = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });
  const spotlightPage = await spotlightContext.newPage();

  // Mock API returning real curated records from source inventory
  const mockApiRecords = [
    {
      id: "cls-cuid",
      slug: "cls-international-cup-2026",
      title: "Champion — Girls KU-16",
      eventName: "80th CLS International Cup, Indonesia",
      summary:
        "KHLIM Basketball Club emerged as champions at the 80th CLS International Cup, Indonesia.",
      yearLabel: "2026",
      photoLabel: "80th CLS International Cup 2026 Champions",
      factsVerified: true,
    },
    {
      id: "jasmine-a-cuid",
      slug: "jasmine-cup-2026-a",
      title: "Champion — KHLIM A",
      eventName: "Jasmine Cup 2025–2026",
      summary:
        "KHLIM A captured the championship trophy at the Jasmine Cup in full-color team glory.",
      yearLabel: "2025–2026",
      photoLabel: "Jasmine Cup 2025-2026 KHLIM A Champions",
      imageUrl: "/media/achievements/jasmine-cup-2025-2026-khlim-a-champion.webp",
      photoRightsVerified: true,
      factsVerified: true,
    },
    {
      id: "jasmine-e-cuid",
      slug: "jasmine-cup-2026-e",
      title: "4th Place — KHLIM E",
      eventName: "Jasmine Cup 2025–2026",
      summary:
        "KHLIM E secured 4th place at the Jasmine Cup through tenacity and dedicated team play.",
      yearLabel: "2025–2026",
      photoLabel: "Jasmine Cup 2025-2026 KHLIM E 4th Place",
      imageUrl: "/media/achievements/jasmine-cup-2025-2026-khlim-e-fourth.webp",
      photoRightsVerified: true,
      factsVerified: true,
    },
    {
      id: "sba-d1-cuid",
      slug: "sba-selangor-2025-d1",
      title: "Champion — Division 1",
      eventName: "U15 SBA D1 Selangor Tournament",
      summary:
        "KHLIM secured the Division 1 championship title at the state-level U15 SBA Selangor Tournament.",
      yearLabel: "2025",
      photoLabel: "U15 SBA D1 Selangor Tournament 2025 Champions",
      factsVerified: true,
    },
    {
      id: "mssm-2024-cuid",
      slug: "mssm-2024",
      title: "MSSM State Representative",
      eventName: "MSSM National Championship",
      summary:
        "KHLIM student-athletes were chosen to represent the state at the prestigious Majlis Sukan Sekolah Malaysia (MSSM) National Championship 2024.",
      yearLabel: "2024",
      photoLabel: "KHLIM Representative in MSSM 2024",
      factsVerified: true,
    },
    {
      id: "maba-u17-cuid",
      slug: "maba-matrix-u17-2026",
      title: "National Representative",
      eventName: "60th MABA-MATRIX 17 & Below National Championship",
      summary:
        "KHLIM athletes earned prestigious selections to represent at the 60th MABA-MATRIX National Basketball Championship.",
      yearLabel: "2026",
      photoLabel: "60th MABA-MATRIX U17 National Championship Representatives",
      factsVerified: true,
    },
    {
      id: "revoked-rights-cuid",
      slug: "sba-selangor-2024-third",
      title: "3rd Place — Division 1",
      eventName: "U15 SBA Selangor 2024",
      summary: "Revoked photo rights test record",
      yearLabel: "2024",
      photoLabel: "Revoked photo label",
      factsVerified: true,
      photoRightsVerified: false,
    },
  ];

  await spotlightPage.route("**/v1/editorial/achievements", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockApiRecords),
    });
  });
  await spotlightPage.route(
    "**/v1/editorial/player-spotlights",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    },
  );

  await spotlightPage.goto("http://localhost:3000/spotlight", {
    waitUntil: "networkidle",
  });

  // Verify cards are visible
  const cards = spotlightPage.locator(".home-achievement-card");
  const cardCount = await cards.count();
  console.log(`Rendered ${cardCount} achievement cards on /spotlight`);
  assert.equal(
    cardCount,
    7,
    "Must render exactly the 7 published achievement records",
  );

  // Verify revoked rights photo has no url(...) in style
  const revokedPhoto = spotlightPage
    .locator(".home-achievement-photo", { hasText: "U15 SBA Selangor 2024" })
    .first();
  const revokedStyle = await revokedPhoto.getAttribute("style");
  assert.doesNotMatch(
    revokedStyle,
    /url\(/,
    "Revoked photo rights must not have url(...) in style",
  );

  // Verify Jasmine Cup A and E photos
  const jasmineAPhoto = spotlightPage
    .locator(".home-achievement-photo", { hasText: "Jasmine Cup 2025–2026" })
    .first();
  const jasmineAStyle = await jasmineAPhoto.getAttribute("style");
  console.log("Jasmine Cup A photo style:", jasmineAStyle);
  assert.match(jasmineAStyle, /jasmine-cup-2025-2026-khlim-a-champion\.webp/);

  // Check Jasmine Cup image dimensions in browser
  const jasmineDims = await spotlightPage.evaluate(async () => {
    const urls = [
      "/media/achievements/jasmine-cup-2025-2026-khlim-a-champion.webp",
      "/media/achievements/jasmine-cup-2025-2026-khlim-e-fourth.webp",
    ];
    return Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({
                url,
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            img.src = url;
          }),
      ),
    );
  });
  console.log("Jasmine Cup natural dimensions:", jasmineDims);
  assert.equal(jasmineDims[0].width, 2048);
  assert.equal(jasmineDims[0].height, 1536);
  assert.equal(jasmineDims[1].width, 2048);
  assert.equal(jasmineDims[1].height, 1536);

  // Verify Representative Milestones subsection exists in Player Spotlights and contains MSSM and MABA
  const milestonesSub = spotlightPage.locator(
    "#player-spotlights .spotlight-subsection",
    {
      hasText: "Player Highlights & Representative Milestones",
    },
  );
  assert.equal(
    await milestonesSub.count(),
    1,
    "Must render Representative Milestones subsection in #player-spotlights",
  );
  assert.match(await milestonesSub.textContent(), /MSSM National Championship/);
  assert.match(await milestonesSub.textContent(), /60th MABA-MATRIX/);

  // Verify category placement: Achievements has 4 club records, Player Spotlights has 2 representative records
  const clubCards = spotlightPage.locator(
    "#achievements .home-achievement-card",
  );
  assert.equal(
    await clubCards.count(),
    4,
    "Must render exactly 4 club achievements in #achievements",
  );
  const repCards = spotlightPage.locator(
    "#player-spotlights .home-achievement-card",
  );
  assert.equal(
    await repCards.count(),
    2,
    "Must render exactly 2 representative milestone cards in #player-spotlights",
  );

  await spotlightPage.screenshot({
    path: `${SCREENSHOTS_DIR}/spotlight-published-achievements-1440px.png`,
    fullPage: false,
  });

  // 4. Empty State
  console.log("\n--- Testing Spotlight Empty State ---");
  await spotlightPage.unroute("**/v1/editorial/achievements");
  await spotlightPage.route("**/v1/editorial/achievements", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
  await spotlightPage.reload({ waitUntil: "networkidle" });
  const emptyTitle = await spotlightPage
    .locator(".spotlight-empty-state h3")
    .first()
    .textContent();
  console.log("Spotlight empty title:", emptyTitle);
  assert.match(emptyTitle, /Editorial Review in Progress/);
  await spotlightPage.screenshot({
    path: `${SCREENSHOTS_DIR}/spotlight-empty-state-1440px.png`,
  });

  // 5. Error State
  console.log(
    "\n--- Testing Spotlight Error State (Distinguishable from empty) ---",
  );
  await spotlightPage.unroute("**/v1/editorial/achievements");
  await spotlightPage.route("**/v1/editorial/achievements", async (route) => {
    await route.abort();
  });
  await spotlightPage.reload({ waitUntil: "networkidle" });
  const errorTitle = await spotlightPage
    .locator(".spotlight-error-state h3")
    .first()
    .textContent();
  console.log("Spotlight error title:", errorTitle);
  assert.match(errorTitle, /Editorial Archive Currently Unavailable/);
  await spotlightPage.screenshot({
    path: `${SCREENSHOTS_DIR}/spotlight-error-state-1440px.png`,
  });

  await browser.close();
  console.log("\nAll visual QA checks passed successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
