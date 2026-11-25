import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  canRenderYouthMedia,
  verifiedRepresentativeMilestones,
  verifiedTeamResults,
} from "../apps/web/lib/editorial-content.ts";

const root = new URL("../", import.meta.url);

test("verified milestones are categorized by subject and have no public photos", async () => {
  assert.equal(verifiedTeamResults.length, 9);
  assert.equal(verifiedRepresentativeMilestones.length, 5);

  const teams = new Set(verifiedTeamResults.map((item) => item.id));
  const reps = new Set(verifiedRepresentativeMilestones.map((item) => item.id));
  assert.equal([...teams].filter((id) => reps.has(id)).length, 0);

  assert.ok(teams.has("cls-international-cup-2026"));
  assert.ok(reps.has("maba-matrix-u17-2026"));
  assert.ok(reps.has("maba-matrix-u17-2026-squad2"));
  assert.ok(reps.has("mssm-2024"));
  assert.ok(reps.has("mssm-2025"));

  for (const story of [
    ...verifiedTeamResults,
    ...verifiedRepresentativeMilestones,
  ]) {
    assert.equal(story.factsVerified, true);
    assert.equal(story.photoRightsVerified, false);
    assert.equal(story.status, "published");
    assert.equal(story.imageUrl, undefined);
  }
});

test("a claimed rights check cannot allow an unlisted youth URL", () => {
  assert.equal(
    canRenderYouthMedia({
      imageUrl:
        "/media/achievements/cls-international-indonesia-2026-champion.webp",
      photoRightsVerified: true,
    }),
    false,
  );
});

test("home and Spotlight use distinct photo groups", async () => {
  const files = [
    "apps/web/app/spotlight/page.tsx",
    "apps/web/components/home/achievements-section.tsx",
    "apps/web/components/home/player-spotlight-section.tsx",
  ];
  const contents = await Promise.all(
    files.map((path) => readFile(new URL(path, root), "utf8")),
  );
  assert.match(contents[0], /stories=\{verifiedTeamResults\}/);
  assert.match(contents[0], /stories=\{verifiedRepresentativeMilestones\}/);
  assert.match(contents[1], /verifiedTeamResults\.slice\(0, 3\)/);
  assert.match(contents[2], /verifiedRepresentativeMilestones\.slice\(0, 3\)/);
  assert.match(contents[0], /spotlight\.representatives\.namesPending/);
  assert.doesNotMatch(contents[2], /getLocalizedSpotlightPreview/);
  const galleryPath =
    "apps/web/components/editorial/verified-milestone-gallery.tsx";
  const component = await readFile(new URL(galleryPath, root), "utf8");
  assert.match(component, /canRenderYouthMedia\(story\)/);
  assert.match(component, /className="verified-milestone-photo"/);
  assert.match(component, /href={story.imageUrl}/);
  assert.doesNotMatch(component, /\bfill\b/);
  assert.doesNotMatch(component, /objectFit: "cover"/);

  const styles = await readFile(
    new URL("apps/web/app/editorial.css", root),
    "utf8",
  );
  const containPhoto = /\.verified-milestone-photo\s*\{\s*object-fit: contain;/;
  assert.match(styles, containPhoto);
  const uniformMedia = /\.verified-milestone-media[^}]*aspect-ratio: 4 \/ 3;/;
  assert.match(styles, uniformMedia);
  assert.doesNotMatch(styles, /height: clamp\(220px, 23vw, 320px\)/);
});
