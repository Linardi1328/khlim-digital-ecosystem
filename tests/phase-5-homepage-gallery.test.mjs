import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("homepage hero uses an accessible timed carousel with manual and swipe controls", async () => {
  const carousel = await read("apps/web/components/home/hero-carousel.tsx");
  const webCatalogue = await read("packages/i18n/src/messages/web.ts");

  assert.match(carousel, /AUTOPLAY_MS\s*=\s*6000/);
  assert.match(carousel, /setInterval/);
  assert.match(carousel, /prefers-reduced-motion/);
  assert.match(carousel, /onTouchStart/);
  assert.match(carousel, /onTouchEnd/);
  assert.match(carousel, /t\("home\.hero\.previousPhoto"\)/);
  assert.match(carousel, /t\("home\.hero\.nextPhoto"\)/);
  assert.match(webCatalogue, /Show previous academy photo/);
  assert.match(webCatalogue, /Show next academy photo/);
  assert.match(carousel, /aria-roledescription="carousel"/);
});

test("homepage media is configuration-driven without pretending placeholder photography is real", async () => {
  const page = await read("apps/web/app/page.tsx");
  const carousel = await read("apps/web/components/home/hero-carousel.tsx");
  const khero = await read("apps/web/components/home/khero-section.tsx");

  assert.match(page, /heroSlides/);
  assert.match(page, /showPlaceholderLabel: false/);
  assert.match(carousel, /imageUrl\?/);
  assert.match(carousel, /showPlaceholderLabel\?/);
  assert.match(khero, /\/media\/khero\/khero-meaning\.webp/);
  assert.match(khero, /\/media\/khero\/khero-way\.webp/);
  assert.match(khero, /\/media\/khero\/meet-khero\.webp/);
  assert.match(khero, /\/media\/khero\/coming-soon\.webp/);
  assert.doesNotMatch(page, /https?:\/\//);
});

test("homepage keeps live programme discovery ahead of editorial and Khero support content", async () => {
  const page = await read("apps/web/app/page.tsx");

  const heroPosition = page.indexOf("<HeroCarousel");
  const pillarsPosition = page.indexOf("<AcademyPillarsSection />");
  const programmesPosition = page.indexOf(
    'className="home-programmes-section"',
  );
  const achievementsPosition = page.indexOf("<AchievementsSection />");
  const spotlightPosition = page.indexOf("<PlayerSpotlightSection />");
  const kheroPosition = page.indexOf("<KheroSection />");

  assert.ok(heroPosition >= 0);
  assert.ok(pillarsPosition > heroPosition);
  assert.ok(programmesPosition > pillarsPosition);
  assert.ok(achievementsPosition > programmesPosition);
  assert.ok(spotlightPosition > achievementsPosition);
  assert.ok(kheroPosition > spotlightPosition);
  assert.match(page, /apiService[\s\S]*getPublicOfferings/);
});

test("academy-first supporting media has responsive and reduced-motion styling", async () => {
  const baseCss = await read("apps/web/app/globals.css");
  const academyCss = await read("apps/web/app/home-academy.css");

  assert.match(baseCss, /\.home-hero-carousel/);
  assert.match(academyCss, /\.home-academy-pillar-grid/);
  assert.match(academyCss, /\.home-khero-poster-grid/);
  assert.match(academyCss, /\.home-khero-points/);
  assert.match(academyCss, /@media \(max-width: 640px\)/);
  assert.match(academyCss, /@media \(prefers-reduced-motion: reduce\)/);
});
