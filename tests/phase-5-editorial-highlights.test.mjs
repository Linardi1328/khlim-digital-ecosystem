import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("homepage includes achievements and Player Spotlight before supporting Khero content", async () => {
  const page = await read("apps/web/app/page.tsx");
  assert.match(page, /<AchievementsSection\s*\/>/);
  assert.match(page, /<PlayerSpotlightSection\s*\/>/);
  assert.match(page, /<KheroSection\s*\/>/);
  assert.ok(
    page.indexOf("<AchievementsSection />") <
      page.indexOf("<PlayerSpotlightSection />"),
  );
  assert.ok(
    page.indexOf("<PlayerSpotlightSection />") <
      page.indexOf("<KheroSection />"),
  );
});

test("achievement publishing requires explicit fact verification", async () => {
  const content = await read("apps/web/lib/editorial-content.ts");
  assert.match(content, /factsVerified: boolean/);
  assert.match(content, /status: EditorialPublicationStatus/);
  assert.match(
    content,
    /story\.status === "published" && story\.factsVerified/,
  );
  assert.match(content, /These neutral archive slots/);
});

test("Player Spotlight keeps AI drafting subordinate to verified facts", async () => {
  const content = await read("apps/web/lib/editorial-content.ts");
  const section = await read(
    "apps/web/components/home/player-spotlight-section.tsx",
  );
  const webCatalogue = await read("packages/i18n/src/messages/web.ts");

  assert.match(content, /aiAssisted: true/);
  assert.match(
    content,
    /article\.status === "published" && article\.factsVerified/,
  );
  assert.match(section, /t\("spotlight\.previewNoticeTitle"\)/);
  assert.match(section, /t\("spotlight\.previewNoticeBody"\)/);
  assert.match(section, /getLocalizedSpotlightPreview\(t\)/);
  assert.match(webCatalogue, /AI-assisted example, not a real player claim/);
  assert.match(webCatalogue, /player, event, result and timing/);
});

test("Player Spotlight has archive and shareable article routes", async () => {
  const archive = await read("apps/web/app/spotlight/page.tsx");
  const article = await read("apps/web/app/spotlight/[slug]/page.tsx");
  assert.match(archive, /publishedPlayerSpotlights/);
  assert.match(article, /findSpotlightArticle/);
  assert.match(article, /generateMetadata/);
});

test("new editorial layouts include responsive mobile fallbacks", async () => {
  const styles = await read("apps/web/app/editorial.css");
  assert.match(styles, /\.home-achievements-grid/);
  assert.match(styles, /\.home-spotlight-card\.is-featured/);
  assert.match(styles, /\.spotlight-article-hero/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});
