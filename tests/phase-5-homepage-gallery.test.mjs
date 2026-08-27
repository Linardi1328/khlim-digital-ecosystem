import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("homepage hero uses an accessible timed carousel with manual and swipe controls", async () => {
  const carousel = await read("apps/web/components/home/hero-carousel.tsx");

  assert.match(carousel, /AUTOPLAY_MS\s*=\s*6000/);
  assert.match(carousel, /setInterval/);
  assert.match(carousel, /prefers-reduced-motion/);
  assert.match(carousel, /onTouchStart/);
  assert.match(carousel, /onTouchEnd/);
  assert.match(carousel, /Show previous academy photo/);
  assert.match(carousel, /Show next academy photo/);
  assert.match(carousel, /aria-roledescription="carousel"/);
});

test("homepage photo slots are configuration-driven and do not require temporary image assets", async () => {
  const page = await read("apps/web/app/page.tsx");
  const carousel = await read("apps/web/components/home/hero-carousel.tsx");
  const gallery = await read("apps/web/components/home/photo-gallery.tsx");

  assert.match(page, /heroSlides/);
  assert.match(page, /photoStories/);
  assert.match(page, /galleryItems/);
  assert.match(carousel, /imageUrl\?/);
  assert.match(gallery, /imageUrl\?/);
  assert.doesNotMatch(page, /https?:\/\//);
});

test("homepage keeps live programme discovery between photo-led sections", async () => {
  const page = await read("apps/web/app/page.tsx");

  const heroPosition = page.indexOf("<HeroCarousel");
  const programmesPosition = page.indexOf(
    'className="home-programmes-section"',
  );
  const storyPosition = page.indexOf("<PhotoStorySection");
  const galleryPosition = page.indexOf("<PhotoGallery");

  assert.ok(heroPosition >= 0);
  assert.ok(programmesPosition > heroPosition);
  assert.ok(storyPosition > programmesPosition);
  assert.ok(galleryPosition > storyPosition);
  assert.match(page, /apiService[\s\S]*getPublicOfferings/);
});

test("homepage gallery has responsive and reduced-motion styling", async () => {
  const css = await read("apps/web/app/globals.css");

  assert.match(css, /\.home-hero-carousel/);
  assert.match(css, /\.home-photo-story/);
  assert.match(css, /\.home-gallery-grid/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
