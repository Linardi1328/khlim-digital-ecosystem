import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Every image or video served from a public app directory must be listed here
// with its exact SHA-256 and documented rights basis. Youth photographs
// (identifiable minors) are NOT allowed in public directories at all: they need
// documented guardian publication consent and must be served from approved
// private storage (see media/RIGHTS-MANIFEST.md). Adding a file here requires a
// documented rights record, never a filename or a build flag.
const PUBLIC_MEDIA_ALLOWLIST = [
  [
    "apps/admin/public/khs-academy-logo.webp",
    "e799d6257989c63894eb07e7c38edbaeccc561608e55ff0951fcf2b75b5009e5",
    "byte-identical to documented media/khlim/logo-academy.webp (official logo, no people)",
  ],
  [
    "apps/web/public/khs-academy-logo.webp",
    "e799d6257989c63894eb07e7c38edbaeccc561608e55ff0951fcf2b75b5009e5",
    "byte-identical to documented media/khlim/logo-academy.webp (official logo, no people)",
  ],
  [
    "apps/web/public/media/brand/academy-crest.webp",
    "9a33889197dcc7522e69e2a612cff51c6c4a13bce33dd2bbaadf44e9782ff24b",
    "RIGHTS-MANIFEST 2026-10-21 rows 33-36 (official logos, no people)",
  ],
  [
    "apps/web/public/media/brand/kh-basketball-club.webp",
    "e616701622c24fe6a4b4d4585c0d59b82f3a7ef0def9d0c2798b6007cc43d698",
    "RIGHTS-MANIFEST 2026-10-21 rows 33-36 (official logos, no people)",
  ],
  [
    "apps/web/public/media/brand/khlim-laurel-crest.webp",
    "741779a099753c8141dfe1a1cdf9ebd70373efc0be5209a25fa3a1df51b9f556",
    "RIGHTS-MANIFEST 2026-10-21 rows 33-36 (official logos, no people)",
  ],
  [
    "apps/web/public/media/brand/khs-academy-mark.webp",
    "c9360b3680d5b207c37b1fbe2fe3c484b74d033ce7824947823c30a198a573ff",
    "RIGHTS-MANIFEST 2026-10-21 rows 33-36 (official logos, no people)",
  ],
  [
    "apps/web/public/media/coaches/jia-xuan.webp",
    "75f7afc873c30e756ed2e0adc7f6283358740c08de101805ced1ffa70a8aba5e",
    "RIGHTS-MANIFEST 2026-10-21 rows 12-15 (adult coach portraits)",
  ],
  [
    "apps/web/public/media/coaches/puimann.webp",
    "4aa0f1dd525af70bb77047da82f74389376558e123258d693349f4c5a7533452",
    "RIGHTS-MANIFEST 2026-10-21 rows 12-15 (adult coach portraits)",
  ],
  [
    "apps/web/public/media/coaches/seng-jun.webp",
    "444f2360cc668d2d282c9db7f8e3c249dc8319ae149a635f8c3aa9b6cc31befa",
    "RIGHTS-MANIFEST 2026-10-21 rows 12-15 (adult coach portraits)",
  ],
  [
    "apps/web/public/media/coaches/woon.webp",
    "cb0dcc1d05724bcebd375f3d2a25cf27f7ddd87ab643761cf503828c6da51685",
    "RIGHTS-MANIFEST 2026-10-21 rows 12-15 (adult coach portraits)",
  ],
  [
    "apps/web/public/media/khero/khero-meaning.webp",
    "119ef6c23142265a092460aa3d3cd8f29abdbf6750b078578f79d1a8a8231b53",
    "RIGHTS-MANIFEST 2026-10-21 rows 16-18 (KHero illustrations)",
  ],
  [
    "apps/web/public/media/khero/khero-way.webp",
    "7c124fd5adaa1b661f73881d13c797fec2183a98e0f81533f38722b90c2ed644",
    "RIGHTS-MANIFEST 2026-10-21 rows 16-18 (KHero illustrations)",
  ],
  [
    "apps/web/public/media/khero/meet-khero.webp",
    "88c428fa940311d06a55a68cecb58ff351962f8d8a5564cc8d1bbdf9deabc5e8",
    "RIGHTS-MANIFEST 2026-10-21 rows 16-18 (KHero illustrations)",
  ],
  [
    "apps/web/public/media/khlim/coach-jia-xuan.webp",
    "30e260a25b5816f34bccfee26889531a0796da045726a641eb9a02b3b856e7f0",
    "asset-manifest.md (adult coach portraits, REF-ESTHER)",
  ],
  [
    "apps/web/public/media/khlim/coach-puimann.webp",
    "7263d7b2f484ad3e91e6620ad7186fcbfa3c947fddfb8f3b264076da8d953cef",
    "asset-manifest.md (adult coach portraits, REF-ESTHER)",
  ],
  [
    "apps/web/public/media/khlim/coach-seng-jun.webp",
    "6a9d9cb7334e7821620814ba9acc4b83e1c9cabb74c23e63d4ea05547cb512c7",
    "asset-manifest.md (adult coach portraits, REF-ESTHER)",
  ],
  [
    "apps/web/public/media/khlim/coach-woon.webp",
    "02704863e8bb98f2bbf664297fe78366f8656820e155dfe1c674c7bd7593de9d",
    "asset-manifest.md (adult coach portraits, REF-ESTHER)",
  ],
  [
    "apps/web/public/media/khlim/logo-academy.webp",
    "e799d6257989c63894eb07e7c38edbaeccc561608e55ff0951fcf2b75b5009e5",
    "asset-manifest.md (official logos, no people)",
  ],
  [
    "apps/web/public/media/khlim/logo-club.webp",
    "7e38375bf222e0350926f681d11c0e5e1b316f5c34796f2d1b61f65a3ce1afa1",
    "asset-manifest.md (official logos, no people)",
  ],
  [
    "apps/web/public/media/khlim/logo-khlim.webp",
    "345812b116997773973d84d8c71abb3a7ead5653a2f29399a2938fcb44740e1c",
    "asset-manifest.md (official logos, no people)",
  ],
  [
    "apps/web/public/media/khlim/logo-khs-academy.webp",
    "f7da21a0d51e0bdac340d5f462fbbe5e66a9f53ebd013496160d59fdfeaa3590",
    "asset-manifest.md (official logos, no people)",
  ],
];

const MEDIA_EXTENSIONS = /\.(webp|jpe?g|png|gif|avif|svg|mp4|webm|mov|heic)$/i;
const root = fileURLToPath(new URL("../", import.meta.url));

function scan(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) found.push(...scan(full));
    else if (MEDIA_EXTENSIONS.test(entry)) found.push(full.slice(root.length));
  }
  return found;
}

test("public app directories serve only allowlisted media with matching hashes", () => {
  const served = ["apps/web/public", "apps/admin/public"]
    .flatMap((dir) => scan(`${root}${dir}`))
    .sort();
  const allowed = new Map(PUBLIC_MEDIA_ALLOWLIST.map(([p, h]) => [p, h]));
  for (const file of served) {
    assert.ok(
      allowed.has(file),
      `${file} is served publicly without a documented rights record`,
    );
    const digest = createHash("sha256")
      .update(readFileSync(`${root}${file}`))
      .digest("hex");
    assert.equal(
      digest,
      allowed.get(file),
      `${file} changed; re-verify its rights record`,
    );
  }
  assert.deepEqual(
    served,
    [...allowed.keys()].sort(),
    "allowlisted media must exist",
  );
});

test("restricted youth media is absent from every public directory", () => {
  const served = ["apps/web/public", "apps/admin/public"].flatMap((dir) =>
    scan(`${root}${dir}`),
  );
  for (const restricted of [
    "/media/achievements/",
    "/media/home/",
    "/media/khlim/team-hero",
    "/media/khlim/training-group",
    "/media/khero/coming-soon",
  ]) {
    assert.ok(
      !served.some((file) => file.includes(restricted)),
      `${restricted} must not be publicly served`,
    );
  }
});
