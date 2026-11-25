import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  canRenderYouthMedia,
  verifiedRepresentativeMilestones,
  verifiedTeamResults,
} from "../apps/web/lib/editorial-content.ts";

const root = new URL("../", import.meta.url);

test("verified photos are categorized by subject", async () => {
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
    assert.equal(story.photoRightsVerified, true);
    assert.equal(story.status, "published");
    assert.ok(story.imageUrl?.startsWith("/media/achievements/"));
    // Restricted youth media: not served from the public tree.
    await assert.rejects(
      access(new URL(`apps/web/public${story.imageUrl}`, root)),
    );
  }
});

test("the historical gallery respects the youth rights flag and fails closed by default", async () => {
  const previous = process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED;
  const representative = verifiedRepresentativeMilestones[0];
  const unapprovedStory = {
    ...verifiedTeamResults[0],
    photoRightsVerified: false,
  };
  try {
    // 1. Environment variable unset -> fail closed
    delete process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED;
    assert.equal(canRenderYouthMedia(verifiedTeamResults[0]), false);
    assert.equal(canRenderYouthMedia(representative), false);

    // 2. Explicit value "0" -> fail closed
    process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED = "0";
    assert.equal(canRenderYouthMedia(verifiedTeamResults[0]), false);
    assert.equal(canRenderYouthMedia(representative), false);

    // 3. Explicit value "1" but no documented guardian consent -> blocked
    process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED = "1";
    assert.equal(canRenderYouthMedia(verifiedTeamResults[0]), false);
    assert.equal(canRenderYouthMedia(representative), false);

    // 3b. Flag "1" AND a documented consent entry for that exact URL -> allowed
    const approvals = [
      {
        url: verifiedTeamResults[0].imageUrl,
        consentRef: "TEST-CONSENT-1",
        channels: ["website"],
        reviewBy: "2999-12-31",
      },
    ];
    assert.equal(canRenderYouthMedia(verifiedTeamResults[0], approvals), true);
    assert.equal(canRenderYouthMedia(representative, approvals), false);
    // Expired, channel-mismatched or reference-less entries do not authorize.
    for (const bad of [
      { ...approvals[0], reviewBy: "2000-01-01" },
      { ...approvals[0], channels: ["print"] },
      { ...approvals[0], consentRef: " " },
    ]) {
      assert.equal(canRenderYouthMedia(verifiedTeamResults[0], [bad]), false);
    }

    // 4. Explicit value "1" with individually unapproved media -> blocked
    assert.equal(canRenderYouthMedia(unapprovedStory), false);
    assert.equal(
      canRenderYouthMedia({
        imageUrl: "/media/achievements/example.webp",
        photoRightsVerified: false,
      }),
      false,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED;
    } else {
      process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED = previous;
    }
  }

  // Next.js config must default NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED to fail closed ("0")
  const nextConfig = await readFile(
    new URL("apps/web/next.config.ts", root),
    "utf8",
  );
  assert.doesNotMatch(
    nextConfig,
    /NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED\s*\?\?\s*["']1["']/,
    "next.config.ts must not default NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED to '1'",
  );
  assert.match(
    nextConfig,
    /process\.env\.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED\s*===\s*["']1["']\s*\?\s*["']1["']\s*:\s*["']0["']/,
  );

  // Homepage hero and Academy group section must also gate youth photos via canRenderYouthMedia
  const [homePage, academyPage] = await Promise.all([
    readFile(new URL("apps/web/app/page.tsx", root), "utf8"),
    readFile(new URL("apps/web/app/academy/page.tsx", root), "utf8"),
  ]);
  assert.match(homePage, /canRenderYouthMedia\(/);
  assert.match(
    homePage,
    /heroYouthMediaEnabled\s*\?\s*"\/media\/khlim\/team-hero-wide-1920\.webp"\s*:\s*undefined/,
  );
  assert.match(
    academyPage,
    /canRenderYouthMedia\(\{\s*imageUrl:\s*"\/media\/khlim\/training-group-1280\.webp"/,
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
