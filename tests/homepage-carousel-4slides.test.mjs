import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");

test("static contract: homepage uses a single photo-free hero and retains the responsive carousel component", async () => {
  const page = await read("apps/web/app/page.tsx");
  const carousel = await read("apps/web/components/home/hero-carousel.tsx");
  const globalsCss = await read("apps/web/app/globals.css");
  const academyCss = await read("apps/web/app/home-academy.css");

  assert.match(page, /id:\s*"academy-first"/);
  assert.doesNotMatch(page, /imageUrl(?:Mobile)?: "\/media\/(?:home|khlim)\//);
  assert.doesNotMatch(
    page,
    /id:\s*"(team-huddle|sideline-energy|court-together)"/,
  );

  assert.match(carousel, /AUTOPLAY_MS\s*=\s*6000/);
  assert.match(carousel, /onMouseEnter/);
  assert.match(carousel, /onMouseLeave/);
  assert.match(carousel, /onFocusCapture/);
  assert.match(carousel, /onBlurCapture/);
  assert.match(carousel, /onTouchStart/);
  assert.match(carousel, /onTouchEnd/);
  assert.match(carousel, /prefers-reduced-motion/);

  // 4. LCP and bandwidth optimization: slide 0 preload + deferred slide loading + CSS variable media separation
  assert.match(carousel, /firstSlide\?\.imageUrlMobile/);
  assert.match(carousel, /media="\(max-width: 768px\)"/);
  assert.match(carousel, /firstSlide\?\.imageUrl/);
  assert.match(carousel, /loadedIndices/);
  assert.match(carousel, /"--hero-bg-desktop"/);
  assert.match(carousel, /"--hero-bg-mobile"/);

  // CSS variables wire to background-image without forced inline image fetching
  assert.match(globalsCss, /background-image:\s*var\(--hero-bg-desktop\)/);
  assert.match(
    academyCss,
    /var\(--hero-bg-mobile,\s*var\(--hero-bg-desktop\)\)/,
  );
});

test("browser: 4-slide hero carousel renders, navigates, and avoids overflow across 5 viewports", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    const sampleSlides = [
      {
        id: "academy-first",
        imageUrl: "/media/khero/meet-khero.webp",
        imageUrlMobile: "/media/khero/meet-khero.webp",
        photoLabel: "team portrait",
        showPlaceholderLabel: false,
        placeholderGradient: "linear-gradient(#09090b, #2a1d08)",
      },
      {
        id: "team-huddle",
        imageUrl: "/media/khero/meet-khero.webp",
        imageUrlMobile: "/media/khero/meet-khero.webp",
        photoLabel: "coach and player instruction",
        showPlaceholderLabel: false,
        placeholderGradient: "linear-gradient(#18181b, #1f2937)",
      },
      {
        id: "sideline-energy",
        imageUrl: "/media/khero/meet-khero.webp",
        imageUrlMobile: "/media/khero/meet-khero.webp",
        photoLabel: "game-day energy",
        showPlaceholderLabel: false,
        placeholderGradient: "linear-gradient(#18181b, #0f172a)",
      },
      {
        id: "court-together",
        imageUrl: "/media/khero/meet-khero.webp",
        imageUrlMobile: "/media/khero/meet-khero.webp",
        photoLabel: "team and community moment",
        showPlaceholderLabel: false,
        placeholderGradient: "linear-gradient(#111827, #4b3520)",
      },
    ];

    await mountComponent(page, {
      component: "heroCarousel",
      props: {
        slides: sampleSlides,
        eyebrow: "KHLIM Sports Academy",
        title: "Train With Purpose.",
        subtitle:
          "Comprehensive basketball development across youth and elite pathways.",
        secondaryCtaLabel: "Explore Programmes",
      },
    });

    // Verify carousel structure
    const carouselEl = page.locator(".home-hero-carousel");
    await carouselEl.waitFor({ state: "visible" });

    // Verify 4 slides in DOM
    const slides = page.locator(".home-hero-slide");
    assert.equal(await slides.count(), 4, "Must render exactly 4 slides");

    // Initially slide 0 is active
    assert.match(await slides.nth(0).getAttribute("class"), /is-active/);

    // Verify prev/next buttons and pagination dots
    const prevBtn = page.locator(".home-carousel-arrow-left");
    const nextBtn = page.locator(".home-carousel-arrow-right");
    const dots = page.locator(".home-carousel-dots button");
    assert.equal(await prevBtn.isVisible(), true);
    assert.equal(await nextBtn.isVisible(), true);
    assert.equal(await dots.count(), 4);

    // Click next -> slide 1 becomes active
    await nextBtn.click();
    assert.match(await slides.nth(1).getAttribute("class"), /is-active/);

    // Click dot 3 (index 2) -> slide 2 becomes active
    await dots.nth(2).click();
    assert.match(await slides.nth(2).getAttribute("class"), /is-active/);

    // Click dot 4 (index 3) -> slide 3 becomes active
    await dots.nth(3).click();
    assert.match(await slides.nth(3).getAttribute("class"), /is-active/);

    // Click prev -> slide 2 becomes active
    await prevBtn.click();
    assert.match(await slides.nth(2).getAttribute("class"), /is-active/);

    // Core content remains stable and visible over all slides
    const h1 = page.locator(".home-hero-content h1");
    assert.equal(await h1.isVisible(), true);
    const registerCta = page.locator(".home-hero-actions a").first();
    assert.equal(await registerCta.isVisible(), true);

    // Responsive check across 5 viewports: 320, 390, 768, 1024, 1440
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

      const hasOverflow = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1
        );
      });
      assert.equal(
        hasOverflow,
        false,
        `Horizontal overflow detected at ${vp.width}px`,
      );
      assert.equal(
        await h1.isVisible(),
        true,
        `H1 must remain visible at ${vp.width}px`,
      );
    }
  } finally {
    await browser.close();
  }
});
