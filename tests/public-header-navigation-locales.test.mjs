import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const screenshotDir =
  process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), "khlim-screenshots");

async function read(relPath) {
  return readFile(new URL(relPath, root), "utf8");
}

test("static contract: public header defines Spotlight navigation and translations", async () => {
  const header = await read("apps/web/components/layout/public-header.tsx");
  const en = await read("packages/i18n/src/messages/en.ts");
  const ms = await read("packages/i18n/src/messages/ms.ts");
  const zhHans = await read("packages/i18n/src/messages/zh-Hans.ts");

  // Spotlight is in shared navLinks
  assert.match(
    header,
    /href:\s*buildUrlWithSource\(\s*["']\/spotlight["'],\s*campaignSource\s*\)/,
    "Spotlight must be included in navLinks with campaign source preservation",
  );
  assert.match(
    header,
    /label:\s*t\(\s*["']nav\.spotlight["']\s*\)/,
    "Spotlight must use t('nav.spotlight') translation key",
  );

  // Translations exist
  assert.match(en, /"nav\.spotlight":\s*"Spotlight"/);
  assert.match(ms, /"nav\.spotlight":\s*"Sorotan"/);
  assert.match(zhHans, /"nav\.spotlight":\s*"球员聚焦"/);
});

test("static contract: public locale selector restricts to 3 languages in order", async () => {
  const switcher = await read("apps/web/components/layout/locale-switcher.tsx");
  const i18n = await read("apps/web/lib/i18n-context.tsx");

  // PUBLIC_LOCALES contains en, ms, zh-Hans in order
  assert.match(
    i18n,
    /export const PUBLIC_LOCALES[\s\S]*?=\s*\[\s*"en",\s*"ms",\s*"zh-Hans",?\s*\]/,
  );
  // zh-Hant and hi must not appear in localeLabels in switcher
  assert.doesNotMatch(switcher, /"zh-Hant"/);
  assert.doesNotMatch(switcher, /"hi"/);
  assert.match(switcher, /en:\s*"English"/);
  assert.match(switcher, /ms:\s*"Bahasa Melayu"/);
  assert.match(switcher, /"zh-Hans":\s*"简体中文"/);
});

test("browser/component: desktop navigation displays Spotlight and preserves nonintersecting layout across 1280px, 1440px, 1600px", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const viewports = [
      { width: 1600, height: 900 },
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await mountComponent(page, {
        component: "publicHeader",
        props: { campaignSource: "fb-oct24" },
      });

      // Desktop nav is visible
      const desktopNav = page.locator(".desktop-nav");
      assert.equal(
        await desktopNav.isVisible(),
        true,
        `Desktop nav must be visible at ${vp.width}px`,
      );

      // Mobile menu button is hidden at desktop
      const menuBtn = page.locator(".mobile-menu-btn");
      assert.equal(
        await menuBtn.isVisible(),
        false,
        `Mobile menu button must be hidden at ${vp.width}px`,
      );

      // Spotlight link is visible and carries campaign source
      const spotlightLink = desktopNav.locator('a[href*="/spotlight"]');
      assert.equal(await spotlightLink.isVisible(), true);
      const href = await spotlightLink.getAttribute("href");
      assert.match(href, /^\/spotlight\?source=fb-oct24$/);

      // Verify no horizontal overflow
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth > root.clientWidth + 2;
      });
      assert.equal(
        overflow,
        false,
        `Desktop header must not overflow horizontally at ${vp.width}px`,
      );

      // Verify non-intersecting bounding boxes
      const brandBox = await page.locator(".public-header-brand").boundingBox();
      const navBox = await desktopNav.boundingBox();
      const actionsBox = await page
        .locator(".public-header-actions")
        .boundingBox();
      const innerBox = await page.locator(".public-header-inner").boundingBox();

      assert.ok(
        brandBox && navBox && actionsBox && innerBox,
        "All header bounding boxes must exist",
      );
      assert.ok(
        brandBox.x + brandBox.width <= navBox.x + 0.5,
        `Brand (right: ${brandBox.x + brandBox.width}) must not overlap Nav (left: ${navBox.x}) at ${vp.width}px`,
      );
      assert.ok(
        navBox.x + navBox.width <= actionsBox.x + 0.5,
        `Nav (right: ${navBox.x + navBox.width}) must not overlap Actions (left: ${actionsBox.x}) at ${vp.width}px`,
      );
      assert.ok(
        actionsBox.x + actionsBox.width <= innerBox.x + innerBox.width + 0.5,
        `Actions must be contained within inner container at ${vp.width}px`,
      );

      // Every visible navigation item is contained within navBox
      const navLinks = await desktopNav.locator("a").all();
      assert.ok(navLinks.length >= 7, "All navigation items must be present");
      for (const link of navLinks) {
        const linkBox = await link.boundingBox();
        assert.ok(linkBox, "Nav link bounding box must exist");
        assert.ok(
          linkBox.x >= navBox.x - 0.5 &&
            linkBox.x + linkBox.width <= navBox.x + navBox.width + 0.5,
          `Nav link must be contained within desktop nav bounds at ${vp.width}px`,
        );
      }

      // Verify keyboard focus on Spotlight link
      await spotlightLink.focus();
      const focusStyle = await spotlightLink.evaluate((el) => {
        const s = window.getComputedStyle(el);
        return {
          outlineStyle: s.outlineStyle,
          outlineWidth: s.outlineWidth,
        };
      });
      assert.notEqual(
        focusStyle.outlineStyle,
        "none",
        `Spotlight link must have visible outline at ${vp.width}px`,
      );
    }
  } finally {
    await browser.close();
  }
});

test("browser/component: mobile navigation displays Spotlight, exactly one language selector, and nonintersecting layout across 320px, 390px, 768px, 1024px", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const mobileViewports = [
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ];

    for (const vp of mobileViewports) {
      await page.setViewportSize(vp);
      await mountComponent(page, {
        component: "publicHeader",
        props: { campaignSource: "ig-test" },
      });

      // Desktop nav is hidden at mobile/tablet
      const desktopNav = page.locator(".desktop-nav");
      assert.equal(
        await desktopNav.isVisible(),
        false,
        `Desktop nav must be hidden at ${vp.width}px`,
      );

      // Mobile menu button is visible
      const menuBtn = page.locator(".mobile-menu-btn");
      assert.equal(
        await menuBtn.isVisible(),
        true,
        `Mobile menu button must be visible at ${vp.width}px`,
      );

      // Verify brand and actions do not overlap
      const brandBox = await page.locator(".public-header-brand").boundingBox();
      const actionsBox = await page
        .locator(".public-header-actions")
        .boundingBox();
      assert.ok(brandBox && actionsBox);
      assert.ok(
        brandBox.x + brandBox.width <= actionsBox.x + 0.5,
        `Brand (right: ${brandBox.x + brandBox.width}) must not overlap Actions (left: ${actionsBox.x}) at ${vp.width}px`,
      );

      // Defect 2: Exactly one visible language selector in header
      const headerSelects = await page
        .locator(".public-header-locale select:visible")
        .count();
      assert.equal(
        headerSelects,
        1,
        `Exactly one visible language selector in header at ${vp.width}px`,
      );

      // Open menu
      await menuBtn.click();
      const dialog = page.locator('div[role="dialog"]');
      assert.equal(
        await dialog.isVisible(),
        true,
        `Dialog must open at ${vp.width}px`,
      );

      // Defect 2: Drawer must NOT contain duplicate language selector
      const dialogSelects = await dialog.locator("select").count();
      assert.equal(
        dialogSelects,
        0,
        `Drawer must not contain duplicate language selector at ${vp.width}px`,
      );

      // Defect 2: Across the entire page, exactly one language selector is visible
      const totalVisibleSelects = await page.locator("select:visible").count();
      assert.equal(
        totalVisibleSelects,
        1,
        `Total visible language selectors must remain exactly 1 while drawer is open at ${vp.width}px`,
      );

      // Spotlight link is inside drawer
      const spotlightDrawerLink = dialog.locator('a[href*="/spotlight"]');
      assert.equal(await spotlightDrawerLink.isVisible(), true);
      const href = await spotlightDrawerLink.getAttribute("href");
      assert.match(href, /^\/spotlight\?source=ig-test$/);

      // Clicking Spotlight link closes drawer
      await spotlightDrawerLink.click();
      assert.equal(
        await page.locator('div[role="dialog"]').count(),
        0,
        `Clicking Spotlight link must close drawer at ${vp.width}px`,
      );

      // No horizontal overflow
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth > root.clientWidth + 2;
      });
      assert.equal(
        overflow,
        false,
        `Mobile header must not overflow horizontally at ${vp.width}px`,
      );
    }
  } finally {
    await browser.close();
  }
});

test("browser/component: dropdown restricts to exactly 3 locales and falls back from legacy preferences", async () => {
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // Test 1: Dropdown options
    await mountComponent(page, { component: "publicHeader" });
    const select = page.locator(".public-header-locale select");
    const optionValues = await select
      .locator("option")
      .evaluateAll((opts) =>
        opts.map((o) => ({ value: o.value, text: o.text })),
      );

    assert.deepEqual(optionValues, [
      { value: "en", text: "English" },
      { value: "ms", text: "Bahasa Melayu" },
      { value: "zh-Hans", text: "简体中文" },
    ]);

    // Test 2: Language change updates navigation
    await select.selectOption("ms");
    assert.equal(await select.inputValue(), "ms");
    assert.equal(
      await page.locator(".desktop-nav a[href*='/spotlight']").innerText(),
      "Sorotan",
    );

    await select.selectOption("zh-Hans");
    assert.equal(await select.inputValue(), "zh-Hans");
    assert.equal(
      await page.locator(".desktop-nav a[href*='/spotlight']").innerText(),
      "球员聚焦",
    );

    // Test 3: Legacy preference fallback
    for (const legacyLocale of ["zh-Hant", "hi", "invalid-locale"]) {
      await page.evaluate((loc) => {
        localStorage.setItem("khlim_locale", loc);
      }, legacyLocale);

      await mountComponent(page, { component: "publicHeader" });

      const reloadedSelect = page.locator(".public-header-locale select");
      const activeValue = await reloadedSelect.inputValue();
      assert.equal(
        activeValue,
        "en",
        `Legacy preference ${legacyLocale} must safely fall back to en`,
      );

      const persistedValue = await page.evaluate(() =>
        localStorage.getItem("khlim_locale"),
      );
      assert.equal(
        persistedValue,
        "en",
        `LocalStorage must be sanitized to en after legacy fallback`,
      );
    }
  } finally {
    await browser.close();
  }
});

test("browser/production-and-component: captures screenshots and verifies non-intersecting layout across 7 viewports", async () => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const { mountComponent } = await import("./helpers/browser-mount.mjs");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const viewports = [
      { width: 1600, height: 900, isDesktop: true },
      { width: 1440, height: 900, isDesktop: true },
      { width: 1280, height: 800, isDesktop: true },
      { width: 1024, height: 768, isDesktop: false },
      { width: 768, height: 1024, isDesktop: false },
      { width: 390, height: 844, isDesktop: false },
      { width: 320, height: 568, isDesktop: false },
    ];

    let hasLocalServer = false;
    try {
      const res = await fetch("http://localhost:3033/");
      if (res.ok) hasLocalServer = true;
    } catch {
      hasLocalServer = false;
    }

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      if (hasLocalServer) {
        await page.goto("http://localhost:3033/?source=fb-oct24", {
          waitUntil: "domcontentloaded",
        });
      } else {
        await mountComponent(page, {
          component: "publicHeader",
          props: { campaignSource: "fb-oct24" },
        });
      }

      const header = page.locator("header");
      await header.screenshot({
        path: path.join(screenshotDir, `header-${vp.width}px.png`),
      });

      const brandBox = await page.locator(".public-header-brand").boundingBox();
      const actionsBox = await page
        .locator(".public-header-actions")
        .boundingBox();
      assert.ok(brandBox && actionsBox);

      if (vp.isDesktop) {
        const navBox = await page.locator(".desktop-nav").boundingBox();
        assert.ok(navBox);
        assert.ok(
          brandBox.x + brandBox.width <= navBox.x + 0.5,
          `Brand must not overlap Nav at ${vp.width}px`,
        );
        assert.ok(
          navBox.x + navBox.width <= actionsBox.x + 0.5,
          `Nav must not overlap Actions at ${vp.width}px`,
        );
      } else {
        assert.ok(
          brandBox.x + brandBox.width <= actionsBox.x + 0.5,
          `Brand must not overlap Actions at ${vp.width}px`,
        );
        const count = await page
          .locator(".public-header-locale select:visible")
          .count();
        assert.equal(
          count,
          1,
          `Header must have exactly 1 visible locale switcher at ${vp.width}px`,
        );
      }
    }
  } finally {
    await browser.close();
  }
});
