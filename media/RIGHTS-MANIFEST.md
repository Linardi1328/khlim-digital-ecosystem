# KHLIM public media rights register

This register is a production-release control, not legal proof by itself. A public-facing asset must have a documented ownership, licence or other lawful-use basis before KHLIM publishes it. Identifiable minors also require the appropriate guardian/publication consent where applicable.

## Status values

- `VERIFIED`: evidence has been checked and a reference to that evidence is recorded.
- `REVIEW_REQUIRED`: the file exists, but the repository does not contain enough evidence to certify public-use rights.
- `DO_NOT_PUBLISH`: known rights or consent problem.

## Current assets

| Asset | Intended use | Status | Evidence basis / Provenance | Public-Tree Status |
| --- | --- | --- | --- | --- |
| `apps/web/public/khlim-logo.jpg` | KHLIM brand logo | REVIEW_REQUIRED | Unverified legacy file; not covered by director confirmation pack. | **Removed from deployable public tree** (unused; unverified file removed to avoid serving over HTTP 200). |
| `apps/web/public/media/khero/meet-khero.webp` | KHero promotional artwork | VERIFIED | User reported that Esther, director of KHLIM Basketball, confirmed the relevant rights are covered (2026-10-18). | **Active in public tree.** Approved high-res artwork integrated with 3-language accessible transcripts. |
| `apps/web/public/media/khero/khero-meaning.webp` | KHero promotional artwork | VERIFIED | User reported that Esther, director of KHLIM Basketball, confirmed the relevant rights are covered (2026-10-18). | **Active in public tree.** Approved high-res artwork integrated with 3-language accessible transcripts. |
| `apps/web/public/media/khero/khero-way.webp` | KHero promotional artwork | VERIFIED | User reported that Esther, director of KHLIM Basketball, confirmed the relevant rights are covered (2026-10-18). | **Active in public tree.** Approved high-res artwork integrated with 3-language accessible transcripts. |
| `apps/web/public/media/khero/coming-soon.webp` | KHero promotional artwork | REVIEW_REQUIRED | No approved replacement was supplied in the 2026-10-18 pack. | **Retained as placeholder** in public tree to display localized Coming Soon notice without broken links. |

## Evidence record template

For each asset moved to `VERIFIED`, record:

- exact file path and asset version/hash where practical;
- creator/photographer/designer/source;
- copyright owner;
- basis for use: KHLIM-owned, written assignment, licence, stock licence, public-domain/other lawful basis;
- scope and restrictions of the licence;
- evidence location (contract, invoice, licence receipt, email approval, internal asset record);
- whether identifiable people appear;
- if a minor appears, the guardian/publication consent reference and permitted channels/duration;
- reviewer and review date.

Do not put private consent forms, identity documents or other personal data in this public repository. Store evidence in an approved private business location and reference it here using a non-sensitive internal identifier.

## Publication rule

Editorial content in `apps/web/lib/editorial-content.ts` requires both `factsVerified` and `photoRightsVerified` before a real achievement/player story can enter the published set. KHero promotional images are separately gated by `NEXT_PUBLIC_KHERO_MEDIA_RIGHTS_CONFIRMED=1` or specific approved asset mapping. Spotlight player stories remain individually verified and subject to authoritative editorial publication checks.

## 2026-10-18 Approved Website Media Integration (Confirmed by Director Esther)


The user reports that Esther, director of KHLIM Basketball, confirmed the relevant media rights are covered for the 28 web-optimized assets supplied in `KHLIM_Approved_Website_Media_Integration_2026-10-18.zip`. This file records that user report; it is not a substitute for stored physical releases or guardian records in private business files.

| Asset Path | Category | Dimensions | Intended Placement | Status | Authorization Basis |
| --- | --- | --- | --- | --- | --- |
| `apps/web/public/media/khlim/team-hero-wide-1920.webp` | Hero (Wide) | 1920x1080 | Homepage hero (desktop/tablet) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/khlim/team-hero-1920.webp` | Hero (Full) | 1920x1280 | Homepage hero (mobile portrait) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/khlim/training-group-1280.webp` | Training | 1280x769 | Academy training section | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/coaches/seng-jun.webp` | Coaches | 720x900 | Coach Seng Jun portrait | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/coaches/jia-xuan.webp` | Coaches | 720x900 | Coach Jia Xuan portrait | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/coaches/puimann.webp` | Coaches | 720x900 | Coach Puimann portrait | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/coaches/woon.webp` | Coaches | 720x900 | Coach Woon portrait | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/khero/meet-khero.webp` | KHero | 1240x1748 | Meet KHero poster | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/khero/khero-meaning.webp` | KHero | 1240x1748 | KHero Meaning poster | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/khero/khero-way.webp` | KHero | 1240x1748 | The KHero Way poster | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/brand/academy-crest.webp` | Brand | 738x869 | Academy programmes/coaches | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/brand/kh-basketball-club.webp` | Brand | 800x728 | Club identity (Achievements) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/brand/khlim-laurel-crest.webp` | Brand | 499x500 | About / Corporate KHLIM | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/brand/khs-academy-mark.webp` | Brand | 674x410 | Academy brand mark | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/achievements/*.webp` (14 files) | Achievements | Various | Historical tournament gallery | `VERIFIED` | Director confirmation reported by user (2026-10-18); staged as draft records for editorial publication |

## 2026-10-18 Approved Homepage Photo Carousel Addon (Confirmed by Director Esther)

The user reports that Esther, director of KHLIM Basketball, confirmed the relevant media rights are covered for the 6 web-optimized carousel crop variants extracted for the 4-slide homepage hero presentation.

| Asset Path | Category | Dimensions | Intended Placement | Status | Authorization Basis |
| --- | --- | --- | --- | --- | --- |
| `apps/web/public/media/home/team-huddle-desktop.webp` | Hero Carousel | 2560x1440 | Homepage Carousel Slide 2 (Desktop/Tablet) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/home/team-huddle-mobile.webp` | Hero Carousel | 1080x1350 | Homepage Carousel Slide 2 (Mobile portrait) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/home/sideline-energy-desktop.webp` | Hero Carousel | 2560x1440 | Homepage Carousel Slide 3 (Desktop/Tablet) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/home/sideline-energy-mobile.webp` | Hero Carousel | 1080x1350 | Homepage Carousel Slide 3 (Mobile portrait) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/home/court-together-desktop.webp` | Hero Carousel | 1920x1080 | Homepage Carousel Slide 4 (Desktop/Tablet) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |
| `apps/web/public/media/home/court-together-mobile.webp` | Hero Carousel | 1080x1350 | Homepage Carousel Slide 4 (Mobile portrait) | `VERIFIED` | Director confirmation reported by user (2026-10-18) |

## 2026-10-18 Jasmine Cup Image Repairs (Confirmed by Director Esther)

The user reports that Esther, director of KHLIM Basketball, confirmed the relevant media rights are covered for the repaired full-color WebP assets replacing the previous defective conversions.

| Asset Path | Category | Dimensions | Intended Placement | Status | Authorization Basis |
| --- | --- | --- | --- | --- | --- |
| `apps/web/public/media/achievements/jasmine-cup-2025-2026-khlim-a-champion.webp` | Achievements | 2048x1536 | Achievements Gallery / Spotlight | `VERIFIED` | Director confirmation reported by user (2026-10-18); full-color WebP conversion |
| `apps/web/public/media/achievements/jasmine-cup-2025-2026-khlim-e-fourth.webp` | Achievements | 2048x1536 | Achievements Gallery / Spotlight | `VERIFIED` | Director confirmation reported by user (2026-10-18); full-color WebP conversion |

## 2026-10-21 Complete 36-Asset Google Drive Reconciliation & Integration (Confirmed by Director Esther)

The operator explicitly confirmed that Esther, Director of KHLIM Basketball, has approved the use of every photograph and brand asset supplied in the official shared Google Drive folder (`1hCSJ3QhtMhBxBya4yisD7PAZB76KFJSF`) for publication on KHLIM's public website.

This register records Director Esther's explicit organizational authorization as the lawful basis for public website publication. In compliance with youth safeguarding principles, this entry records director-level approval and does not assert independent repository verification of individual signed guardian release forms, which remain maintained within private club management records.

### Complete 36-File Reconciliation & Placement Matrix

| # | Original Drive File | Web Asset Path | Intrinsic Dimensions | Website Section & Placement | Authorization & Status |
|---|---|---|---|---|---|
| 1 | `Training photos.png` | `apps/web/public/media/khlim/training-group-1280.webp` | 1280×769 | `/academy` Coaching & Venues showcase | `VERIFIED` — Director Esther website authorization |
| 2 | `main hero page.jpg` | `apps/web/public/media/khlim/team-hero-wide-1920.webp` | 1920×1080 | Homepage Hero (Desktop/Tablet Slide 1) | `VERIFIED` — Director Esther website authorization |
|   | `main hero page.jpg` (mobile) | `apps/web/public/media/khlim/team-hero-1920.webp` | 1920×1280 | Homepage Hero (Mobile Portrait Slide 1) | `VERIFIED` — Director Esther website authorization |
|   | `main hero page.jpg` (crops) | `apps/web/public/media/home/*.webp` (6 variants) | Various | Homepage Hero Carousel (Slides 2, 3, 4) | `VERIFIED` — Director Esther website authorization |
| 3 | `Copy of NIN_5719.jpg` | `apps/web/public/media/achievements/club-gallery-team-huddle-circle.webp` | 1920×1280 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization |
| 4 | `Copy of NIN_5725.jpg` | `apps/web/public/media/achievements/club-gallery-court-lineup-hoop.webp` | 1920×1280 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization |
| 5 | `Copy of NIN_6916.jpg` | `apps/web/public/media/achievements/club-gallery-sideline-celebration-wide.webp` | 1920×1280 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization |
| 6 | `Copy of NIN_6971.jpg` | `apps/web/public/media/achievements/club-gallery-sideline-celebration-moment.webp` | 1920×1280 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization |
| 7 | `Copy of NIN_7275.jpg` | `apps/web/public/media/achievements/club-gallery-matchday-bench-cheering.webp` | 1920×1280 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization |
| 8 | `IMG_2398.HEIC` | `apps/web/public/media/achievements/club-gallery-studio-squad-spirit.webp` | 1440×1920 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization (90° CW upright) |
| 9 | `IMG_2477 2.PNG` | `apps/web/public/media/achievements/club-gallery-studio-team-portrait.webp` | 1920×1536 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization |
| 10 | `IMG_2814.JPG` | `apps/web/public/media/achievements/club-gallery-in-game-court-huddle.webp` | 1920×1279 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization |
| 11 | `IMG_2824.HEIC` | `apps/web/public/media/achievements/club-gallery-state-honours-lineup.webp` | 1440×1920 | `/spotlight#achievements` Club Event Gallery | `VERIFIED` — Director Esther website authorization (90° CW upright) |
| 12 | `Coach Seng Jun.jpg` | `apps/web/public/media/coaches/seng-jun.webp` | 720×900 | `/academy` Meet Our Coaches | `VERIFIED` — Director Esther website authorization |
| 13 | `Coach Jia Xuan.jpg` | `apps/web/public/media/coaches/jia-xuan.webp` | 720×900 | `/academy` Meet Our Coaches | `VERIFIED` — Director Esther website authorization |
| 14 | `Coach Puimann.jpg` | `apps/web/public/media/coaches/puimann.webp` | 720×900 | `/academy` Meet Our Coaches | `VERIFIED` — Director Esther website authorization |
| 15 | `Coach Woon.png` | `apps/web/public/media/coaches/woon.webp` | 720×900 | `/academy` Meet Our Coaches | `VERIFIED` — Director Esther website authorization |
| 16 | `2.png` | `apps/web/public/media/khero/meet-khero.webp` | 1240×1748 | Homepage KHero Showcase (Poster 1) | `VERIFIED` — Director Esther website authorization |
| 17 | `3.png` | `apps/web/public/media/khero/khero-meaning.webp` | 1240×1748 | Homepage KHero Showcase (Poster 2) | `VERIFIED` — Director Esther website authorization |
| 18 | `4.png` | `apps/web/public/media/khero/khero-way.webp` | 1240×1748 | Homepage KHero Showcase (Poster 3) | `VERIFIED` — Director Esther website authorization |
| 19 | `U15 SBA D1 Selangor Tournament 2025 - Champion` | `apps/web/public/media/achievements/u15-sba-d1-selangor-2025-champion.webp` | 1280×960 | `/spotlight#achievements` Featured Honours | `VERIFIED` — Director Esther website authorization |
| 20 | `U15 SBA D2 Selangor Tournament 2025` | `apps/web/public/media/achievements/u15-sba-d2-selangor-2025.webp` | 1280×960 | `/spotlight#achievements` Tournament Archive | `VERIFIED` — Director Esther website authorization |
| 21 | `U14G MPBL league 2025 - 1st runner up` | `apps/web/public/media/achievements/u14g-mpbl-2025-runner-up.webp` | 1200×800 | `/spotlight#achievements` Tournament Archive | `VERIFIED` — Director Esther website authorization |
| 22 | `U14G Fastbreak Mini League 2024 - Champion` | `apps/web/public/media/achievements/u14g-fastbreak-2024-champion.webp` | 1200×800 | `/spotlight#achievements` Tournament Archive | `VERIFIED` — Director Esther website authorization |
| 23 | `U15 SBA Selangor Tournament 2024 - 3rd place` | `apps/web/public/media/achievements/u15-sba-selangor-2024-third.webp` | 1280×960 | `/spotlight#achievements` Tournament Archive | `VERIFIED` — Director Esther website authorization |
| 24 | `U16 D2 SBA Selangor Tournament 2026 - 1st runner up` | `apps/web/public/media/achievements/u16-d2-sba-selangor-2026-runner-up.webp` | 1200×800 | `/spotlight#achievements` Featured Honours | `VERIFIED` — Director Esther website authorization |
| 25 | `Jasmine Cup 2025-2026 KHLIM E - 4th Place` | `apps/web/public/media/achievements/jasmine-cup-2025-2026-khlim-e-fourth.webp` | 2048×1536 | `/spotlight#achievements` Tournament Archive | `VERIFIED` — Director Esther website authorization |
| 26 | `Jasmine Cup 2025-2026 KHLIM A - Champion` | `apps/web/public/media/achievements/jasmine-cup-2025-2026-khlim-a-champion.webp` | 2048×1536 | `/spotlight#achievements` Featured Honours | `VERIFIED` — Director Esther website authorization |
| 27 | `80th CLS International Cup, Indonesia 2026 - Champion` | `apps/web/public/media/achievements/cls-international-indonesia-2026-champion.webp` | 1200×800 | `/spotlight#achievements` Featured Honours | `VERIFIED` — Director Esther website authorization |
| 28 | `KHLIM Representative in MSSM 2024` | `apps/web/public/media/achievements/khlim-mssm-2024.webp` | 1200×800 | `/spotlight#player-spotlights` Representative Selection | `VERIFIED` — Director Esther website authorization |
| 29 | `KHLIM Representative in MSSM 2025` | `apps/web/public/media/achievements/khlim-mssm-2025.webp` | 1200×800 | `/spotlight#player-spotlights` Representative Selection | `VERIFIED` — Director Esther website authorization |
| 30 | `KHLIM Representative in the U15 LMC National Cup 2025` | `apps/web/public/media/achievements/khlim-u15-lmc-cup-2025.webp` | 1200×800 | `/spotlight#player-spotlights` Representative Selection | `VERIFIED` — Director Esther website authorization |
| 31 | `KHLIM Representative in 60th MABA-MATRIX 17 & Below National Basketball Championship 2026 (2)` | `apps/web/public/media/achievements/khlim-maba-matrix-u17-2026-2.webp` | 1200×800 | `/spotlight#player-spotlights` Representative Selection | `VERIFIED` — Director Esther website authorization |
| 32 | `KHLIM Representative in 60th MABA-MATRIX 17 & Below National Basketball Championship 2026` | `apps/web/public/media/achievements/khlim-maba-matrix-u17-2026.webp` | 1200×800 | `/spotlight#player-spotlights` Representative Selection | `VERIFIED` — Director Esther website authorization |
| 33 | `KHS ACADEMY Logo` | `apps/web/public/media/brand/khs-academy-mark.webp` | 674×410 | Academy brand mark | `VERIFIED` — Director Esther website authorization |
| 34 | `KHLIM Logo` | `apps/web/public/media/brand/khlim-laurel-crest.webp` | 499×500 | Ecosystem brand mark | `VERIFIED` — Director Esther website authorization |
| 35 | `Academy Logo` | `apps/web/public/media/brand/academy-crest.webp` | 738×869 | Official Academy crest (Header, Footer, Nav) | `VERIFIED` — Director Esther website authorization |
| 36 | `Club Logo` | `apps/web/public/media/brand/kh-basketball-club.webp` | 800×728 | Official Club distinction crest | `VERIFIED` — Director Esther website authorization |

## 2026-10-22 Website media review approval (user report)

The project operator explicitly approved the photographs visible in the access-protected updated Spotlight gallery preview on 22 October 2026 for the KHLIM website. This is additional project-level visual and publication-direction approval for that displayed gallery. It does **not** independently establish photographer copyright assignments, individual guardian consents, or the scope of permissions for identifiable minors. Continue to apply the media-rights register and publication safeguards before releasing the production website; do not publish evidence documents or minors' personal information in this public repository.
