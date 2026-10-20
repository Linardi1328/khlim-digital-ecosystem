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
