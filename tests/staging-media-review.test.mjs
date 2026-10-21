import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

test("staging-only gallery never replaces published editorial data", async () => {
  const config = await readFile(
    new URL("apps/web/next.config.ts", root),
    "utf8",
  );
  const page = await readFile(
    new URL("apps/web/app/spotlight/page.tsx", root),
    "utf8",
  );
  const messages = await readFile(
    new URL("packages/i18n/src/messages/spotlight-web.ts", root),
    "utf8",
  );

  assert.match(config, /process\.env\.VERCEL_ENV === "preview"/);
  assert.match(page, /isStagingMediaReview && \(/);
  assert.match(page, /id="staging-media-review"/);
  assert.match(page, /const showImage = canRenderYouthMedia\(item\)/);
  assert.match(page, /fetchPublishedAchievements\(\)/);
  assert.match(page, /fetchPublishedSpotlights\(\)/);

  for (const key of [
    "spotlight.review.badge",
    "spotlight.review.title",
    "spotlight.review.description",
  ]) {
    const occurrences = messages.split(`"${key}":`).length - 1;
    assert.equal(occurrences, 5);
  }
});
