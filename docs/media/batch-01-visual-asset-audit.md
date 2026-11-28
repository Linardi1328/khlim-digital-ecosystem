# KHLIM Website Production Readiness Batch 01 — Visual Asset Restoration & Permission Audit

- **Repository:** `Linardi1328/khlim-digital-ecosystem`
- **Approved Baseline:** `9be0f275a913f4f50fd596a784cdd9946ee007db`
- **Historical Pre-Containment Reference Commit:** `da0c9d72912bcd6a3ab238cdfbb122a21434d3c2` (prior to PR #129 youth-media containment commit `3470201cedd59c47c445538ab6a75f0acd03b38f`)
- **Governance Controls Preserved:**
  - `media/RIGHTS-MANIFEST.md` (unchanged)
  - `tests/public-media-allowlist.test.mjs` (SHA-256 allowlist enforced, unchanged)
  - `APPROVED_YOUTH_MEDIA` in `apps/web/lib/editorial-content.ts` (empty, fail-closed, unchanged)
  - `NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED` default `"0"` in `apps/web/next.config.ts` (unchanged)

---

## 1. Executive Summary

A full inventory comparing the current website (`9be0f275`) against historical visual revisions (`b97d26d`, `16e8778`, `da0c9d7`) and `media/RIGHTS-MANIFEST.md` confirms:

1. **All 20 individually approved public web visual assets** (official brand logos/crests, 4 adult coach portraits, and 3 KHero mascot illustrations) are present in `apps/web/public/` and pinned by exact SHA-256 in `tests/public-media-allowlist.test.mjs`. Of these 20 allowlisted files, **11 are actively rendered** in their original public placements (`/khs-academy-logo.webp`, 3 brand crests, 4 adult coach portraits, and 3 KHero posters) with zero broken image requests, while **9 are allowlisted and preserved** (`media/brand/khs-academy-mark.webp` and 8 legacy `media/khlim/` aliases documented in `docs/media/asset-manifest.md`).
2. **32 restricted youth photographs (identifiable minors)** were removed from `apps/web/public/` in PR #129 (`3470201`) because they lack documented individual guardian publication consent and approved private/access-controlled storage. Their restoration to the public website is **blocked by missing privacy permissions and unprovisioned controlled storage**. They are **not** restored to `apps/web/public/` and `APPROVED_YOUTH_MEDIA` is **not** bypassed.
3. **1 unverified KHero placeholder file** (`apps/web/public/media/khero/coming-soon.webp`) has no rights record and is unused on the live site; it remains removed.
4. **1 admin console logo derivative** (`apps/admin/public/khs-academy-logo.webp`, no people) remains retained in the SHA-256 allowlist pending owner confirmation.

---

## 2. Individually Approved Public Assets — Active & Verified (20 Web Files)

Every asset below is verified present on disk, SHA-256 matched by `tests/public-media-allowlist.test.mjs`, and verified against its historical placement:

| Category | Public Asset Path | Historical & Current Placement | Status |
| :--- | :--- | :--- | :--- |
| Brand Identity | `/khs-academy-logo.webp` | Site Header & Footer (`BrandLogo`), favicon/apple icon (`layout.tsx`) | **Active & visible** |
| Brand Identity | `/media/brand/academy-crest.webp` | `/academy` training standards showcase (`academy-training-fallback`) | **Active & visible** |
| Brand Identity | `/media/brand/kh-basketball-club.webp` | Homepage `AchievementsSection` (when API achievements are published) and `/spotlight` Club Distinction banner | **Active & visible** |
| Brand Identity | `/media/brand/khlim-laurel-crest.webp` | `/about` header corporate crest | **Active & visible** |
| Brand Identity | `/media/brand/khs-academy-mark.webp` | Allowlisted official horizontal brand mark (not placed on public pages in `b97d26d`–`da0c9d7`; preserved untouched) | **Allowlisted & preserved** |
| Brand Identity (legacy aliases) | `/media/khlim/logo-academy.webp`, `logo-club.webp`, `logo-khlim.webp`, `logo-khs-academy.webp` | Documented `docs/media/asset-manifest.md` paths (`logo-academy.webp` is byte-identical to `/khs-academy-logo.webp`) | **Allowlisted & preserved** |
| Adult Coaching Staff | `/media/coaches/seng-jun.webp` | `/academy` Meet Our Coaches (Coach Seng Jun, 4:5 portrait) | **Active & visible** |
| Adult Coaching Staff | `/media/coaches/jia-xuan.webp` | `/academy` Meet Our Coaches (Coach Jia Xuan, 4:5 portrait) | **Active & visible** |
| Adult Coaching Staff | `/media/coaches/puimann.webp` | `/academy` Meet Our Coaches (Coach Puimann, 4:5 portrait) | **Active & visible** |
| Adult Coaching Staff | `/media/coaches/woon.webp` | `/academy` Meet Our Coaches (Coach Woon, 4:5 portrait) | **Active & visible** |
| Adult Coaching Staff (legacy aliases) | `/media/khlim/coach-seng-jun.webp`, `coach-jia-xuan.webp`, `coach-puimann.webp`, `coach-woon.webp` | Documented `docs/media/asset-manifest.md` coach portrait paths | **Allowlisted & preserved** |
| KHero Illustrations | `/media/khero/meet-khero.webp` | Homepage `KheroSection` Poster 1 + multilingual transcript | **Active & visible** |
| KHero Illustrations | `/media/khero/khero-meaning.webp` | Homepage `KheroSection` Poster 2 + multilingual transcript | **Active & visible** |
| KHero Illustrations | `/media/khero/khero-way.webp` | Homepage `KheroSection` Poster 3 + multilingual transcript | **Active & visible** |

---

## 3. Blocked Assets — Restoration Withheld Pending Permissions & Controlled Storage (33 Removed + 1 Pending)

### A. Restricted Youth Photographs — Identifiable Minors (32 Files, Blocked)

- **Historical source commit for authorized private recovery:** `da0c9d72912bcd6a3ab238cdfbb122a21434d3c2`
- **Blocking reasons:**
  1. **Missing documented individual guardian publication consent** covering the website channel with an explicit review date (stored privately outside this repository). Director website authorization (2026-10-21) and operator gallery review (2026-10-22) are project-level publication direction only, not guardian consent.
  2. **Authorized private / access-controlled media storage not yet provisioned.** Per `media/RIGHTS-MANIFEST.md`, youth photographs must never be restored into `apps/web/public/` (which is publicly downloadable and tracked in Git); they must be hosted in approved private/access-controlled storage and registered individually in `APPROVED_YOUTH_MEDIA` alongside `NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED=1`.
- **Current public UI behavior:** Fail-closed with zero broken image requests (`0` HTTP 404/4xx image errors):
  - Homepage Hero renders the 4-slide KHLIM gold/obsidian gradient composition without broken photo URLs.
  - `/academy` renders the approved `academy-crest.webp` branded training-standards showcase card (`academy-training-fallback`).
  - Homepage & `/spotlight` render clean 4:3 uniform placeholder frames (`home.photoSlot`) with verified non-personal historical text records.

| Surface & Placement | Blocked Asset Paths (32 Total) | Count |
| :--- | :--- | :---: |
| Homepage Hero Slide 1 (Desktop & Mobile) | `media/khlim/team-hero-wide-1920.webp`, `media/khlim/team-hero-1920.webp` | 2 |
| Homepage Hero Slides 2–4 (Desktop & Mobile) | `media/home/team-huddle-{desktop,mobile}.webp`, `media/home/sideline-energy-{desktop,mobile}.webp`, `media/home/court-together-{desktop,mobile}.webp` | 6 |
| `/academy` Training Group Section | `media/khlim/training-group-1280.webp` | 1 |
| Homepage & `/spotlight` Verified Team Honours | `media/achievements/cls-international-indonesia-2026-champion.webp`, `jasmine-cup-2025-2026-khlim-a-champion.webp`, `jasmine-cup-2025-2026-khlim-e-fourth.webp`, `u15-sba-d1-selangor-2025-champion.webp`, `u15-sba-d2-selangor-2025.webp`, `u15-sba-selangor-2024-third.webp`, `u16-d2-sba-selangor-2026-runner-up.webp`, `u14g-mpbl-2025-runner-up.webp`, `u14g-fastbreak-2024-champion.webp` | 9 |
| Homepage & `/spotlight` Representative Milestones | `media/achievements/khlim-maba-matrix-u17-2026.webp`, `khlim-maba-matrix-u17-2026-2.webp`, `khlim-mssm-2025.webp`, `khlim-mssm-2024.webp`, `khlim-u15-lmc-cup-2025.webp` | 5 |
| `/spotlight` Club Event & Matchday Gallery | `media/achievements/club-gallery-team-huddle-circle.webp`, `club-gallery-court-lineup-hoop.webp`, `club-gallery-sideline-celebration-wide.webp`, `club-gallery-sideline-celebration-moment.webp`, `club-gallery-matchday-bench-cheering.webp`, `club-gallery-studio-squad-spirit.webp`, `club-gallery-studio-team-portrait.webp`, `club-gallery-in-game-court-huddle.webp`, `club-gallery-state-honours-lineup.webp` | 9 |

### B. Unverified / Pending Non-Minor Assets (2 Files)

| Asset Path | Status | Blocker / Disposition |
| :--- | :--- | :--- |
| `apps/web/public/media/khero/coming-soon.webp` | **Removed & blocked** | No rights record in `media/RIGHTS-MANIFEST.md`; unused on live site because all 3 approved KHero posters are active. |
| `apps/admin/public/khs-academy-logo.webp` | **Retained (owner decision pending)** | Official logo derivative with no people; flagged in `tests/public-media-allowlist.test.mjs` for owner confirmation or replacement. |

---

## 4. Controlled Restoration Runbook (Owner Action Required)

When the owner completes guardian consent collection and provisions authorized private/access-controlled storage:

1. Extract only individually consented image blobs from commit `da0c9d72912bcd6a3ab238cdfbb122a21434d3c2` into the authorized private storage bucket (never into `apps/web/public/`).
2. Store signed guardian consent records privately in KHLIM business files (never in this repository).
3. Add each consented asset's controlled-storage URL, non-sensitive `consentRef`, `"website"` channel, and `reviewBy` ISO date to `APPROVED_YOUTH_MEDIA` in `apps/web/lib/editorial-content.ts`:
   - **URL validity, prerendering, and expiry policy:** `canRenderYouthMedia()` runs during page rendering and validates the exact URL, `consentRef`, `"website"` channel, and `reviewBy` — it does **not** parse signed-URL expiry timestamps, and public pages (`/`, `/academy`, `/spotlight`) are statically prerendered without per-request dynamic revalidation. Therefore, to ensure a youth photograph never renders or resolves after its `reviewBy` date (including from cached or prerendered HTML):
     1. The controlled-storage origin **must** enforce server-side access expiry/revocation at or before `reviewBy` (so even cached HTML cannot load an image once consent lapses or is revoked), **and**
     2. The KHLIM website maintainer **must** schedule a rebuild/redeployment before each asset's `reviewBy` date (either removing the entry or updating it with a renewed `consentRef` and `reviewBy` date), and rotate/re-register any shorter-lived signed URL before it expires.
     3. Whenever URL expiry and `reviewBy` differ, **the earlier date controls availability**.
4. Configure Next.js remote image loading in `apps/web/next.config.ts` **before** enabling the flag in Step 6:
   - Add the exact authorized controlled-storage `protocol`, `hostname`, and `pathname` pattern to `images.remotePatterns` in `apps/web/next.config.ts` (otherwise `<Image src={...}>` rejects remote storage URLs at runtime).
   - Ship and verify this `next.config.ts` update before setting `NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED=1`.
5. Update every restored placement to pass the exact shared registered URL from `APPROVED_YOUTH_MEDIA` into both `canRenderYouthMedia()` and the rendered image source (replacing removed `/media/...` public-path literals so the gate and image source always share one value):
   - `apps/web/app/academy/page.tsx`: pass the shared registered URL to `canRenderYouthMedia()` and `<Image src>` for the training-group showcase.
   - `apps/web/app/page.tsx`: pass the shared registered URLs to `canRenderYouthMedia()` and the hero slide `imageUrl` / `imageUrlMobile` fields.
   - `apps/web/lib/editorial-content.ts`: update each consented story/gallery item's `imageUrl` to match its exact `APPROVED_YOUTH_MEDIA` entry.
6. Enable `NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED=1` in the authorized deployment environment after Steps 1–5 are deployed and verified.

---

## 5. Authorized Localhost-Only Visual Review (Development Only)

For internal owner review of the original KHLIM visual composition without placing restricted youth photographs in `apps/web/public/` or manufacturing consent records:

1. Recover the 52 historical files from commit `da0c9d72912bcd6a3ab238cdfbb122a21434d3c2` into a private directory outside the repository (`chmod 700 "$HOME/KHLIM-Private-Media-Recovery"`).
2. Start the development server bound strictly to loopback with explicit opt-in:
   ```bash
   KHLIM_LOCAL_VISUAL_REVIEW=1 \
   KHLIM_PRIVATE_MEDIA_RECOVERY_DIR="$HOME/KHLIM-Private-Media-Recovery/apps/web/public/media" \
   pnpm --filter @khlim/web exec next dev -H 127.0.0.1 -p 3197
   ```
3. **Hard security invariants enforced by `apps/web/lib/local-visual-review-media.ts`, `apps/web/next.config.ts`, and `apps/web/app/api/preview-media/[...path]/route.ts`:**
   - Unconditionally disabled in production builds (`NODE_ENV === "production"`) and hosted deployments (`VERCEL` / `VERCEL_ENV`).
   - Enforces loopback-only access (`127.0.0.1`, `localhost`, `[::1]`) across URL hostname, `Host`, and `X-Forwarded-Host` headers.
   - Serves only the exact 32-asset recovered youth-media allowlist via `/api/preview-media/recovered/...` with `Cache-Control: private, no-store, must-revalidate`, `X-Robots-Tag: noindex, nofollow, noimageindex`, and `X-Public-Ready: false`.
   - Enforces path traversal and `realpath` symlink containment checks.
   - Leaves `APPROVED_YOUTH_MEDIA` empty (`[]`), `NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED` default `"0"`, and `apps/web/public/` SHA-256 allowlist untouched.
