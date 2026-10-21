import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

test("club gallery is independent of live editorial API and rights-gated", async () => {
  const page = await readFile(
    new URL("apps/web/app/spotlight/page.tsx", root),
    "utf8",
  );
  const messages = await readFile(
    new URL("packages/i18n/src/messages/spotlight-web.ts", root),
    "utf8",
  );

  assert.match(page, /id="club-event-gallery"/);
  assert.match(page, /const showImage = canRenderYouthMedia\(item\)/);
  assert.match(page, /href=\{item\.imageUrl\}/);
  assert.match(page, /objectFit: "contain"/);
  assert.doesNotMatch(page, /isStagingMediaReview && \(/);
  assert.match(page, /fetchPublishedAchievements\(\)/);
  assert.match(page, /fetchPublishedSpotlights\(\)/);

  for (const key of [
    "spotlight.achievements.gallery",
    "spotlight.achievements.galleryDesc",
  ]) {
    assert.equal(messages.split(`"${key}":`).length - 1, 5);
  }
});
