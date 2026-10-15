# KHLIM Official Media Asset Manifest

**Issue:** RIC-85 — Replace Image Placeholders with Official KHLIM Media  
**Date:** October 2026  
**Status:** Approved & Implemented  
**Asset Source:** Esther (Official KHLIM Google Drive folder: `1hCSJ3QhtMhBxBya4yisD7PAZB76KFJSF`)  
**Base Branch:** `staging/ric-65-academy-soft-launch`  
**Feature Branch:** `feat/ric-85-replace-image-placeholders`  

---

## 1. Asset Registry & Optimization Matrix

All official media has been converted to web-optimized WebP format, organized under `apps/web/public/media/khlim/`. Redundant asset duplication has been removed from Admin (`apps/admin/public/media` pruned to prevent bundle bloat; Admin references `apps/admin/public/khs-academy-logo.webp`).

| Original Drive Asset | Optimized File | Intrinsic Size | Aspect Ratio | Public Placement | Alt Text / Accessible Description | Internal Media Release Ref | Publication Approval Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `main hero page.jpg` (5603×3735) | `academy-hero-desktop.webp` | 1920×1080 | 16:9 | Homepage Hero (Desktop / Wide) | *KHLIM Basketball Academy team portrait celebrating club community and heritage* | `REF-ESTHER-ACADEMY-HERO-REL` | Approved by Esther for Academy soft launch |
| `main hero page.jpg` (5603×3735) | `academy-hero-mobile.webp` | 800×1000 | 4:5 vertical | Homepage Hero (Mobile viewport ≤ 768px) | *KHLIM Basketball Academy team portrait celebrating club community and heritage* | `REF-ESTHER-ACADEMY-HERO-REL` | Approved by Esther for Academy soft launch |
| `Training photos.png` (1654×994) | `club-training-portrait.webp` | 1200×721 | ~16:10 | Academy Page (`/academy` Coaching & Venues section) | *KHLIM basketball squad portrait celebrating club community and heritage* | `REF-ESTHER-CLUB-HERITAGE-REL` | Approved as club credibility & culture image |
| `Coach Seng Jun.jpg` (1280×1086) | `coach-seng-jun.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Seng Jun — KHLIM Basketball Academy* | `REF-ESTHER-COACH-SENGJUN-REL` | Approved. Bio uses verified fundamentals/progression facts. |
| `Coach Jia Xuan.jpg` (3306×4133) | `coach-jia-xuan.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Jia Xuan — KHLIM Basketball Academy* | `REF-ESTHER-COACH-JIAXUAN-REL` | Approved with neutral coach designation |
| `Coach Puimann.jpg` (3306×4133) | `coach-puimann.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Puimann — KHLIM Basketball Academy* | `REF-ESTHER-COACH-PUIMANN-REL` | Approved with neutral coach designation |
| `Coach Woon.png` (1122×1402) | `coach-woon.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Woon — KHLIM Basketball Academy* | `REF-ESTHER-COACH-WOON-REL` | Approved with neutral coach designation |
| `80th CLS International Cup, Indonesia 2026 - Champion.JPG` (3000×2000) | `achievement-cls-2026.webp` | 1200×800 | 3:2 | Homepage Achievements (`#achievements`) | *80th CLS International Cup 2026 Champions* | `REF-ESTHER-TOURNAMENT-CLS26-REL` | Approved tournament victory (Indonesia) |
| `Jasmine Cup 2025-2026 KHLIM A - Champion.jpg` (5712×4284) | `achievement-jasmine-cup-2026.webp` | 1200×900 | 4:3 | Homepage Achievements (`#achievements`) | *U16 Jasmine Cup 2025-2026 Champions* | `REF-ESTHER-TOURNAMENT-JAS26-REL` | Approved tournament victory |
| `U15 SBA D1 Selangor Tournament 2025 - Champion.jpg` (1280×960) | `achievement-sba-2025.webp` | 1200×900 | 4:3 | Homepage Achievements (`#achievements`) | *U15 SBA Selangor Tournament 2025 Champions* | `REF-ESTHER-TOURNAMENT-SBA25-REL` | Approved tournament victory. Division-neutral caption displayed. |
| `Academy Logo.png` (738×869) | `logo-academy.webp` & `khs-academy-logo.webp` | 738×869 | 256:301 | Header, Footer, Favicon, Auth, Shell | *KHLIM Sports Academy* | `REF-ESTHER-BRAND-ACADEMY-LOGO` | Approved official Academy vertical crest |
| `Club Logo.png` (2333×2124) | `logo-club.webp` | 1200×1092 | ~11:10 | Achievements section distinction banner | *KHLIM Basketball Club* | `REF-ESTHER-BRAND-CLUB-LOGO` | Approved official Club branding |
| `KHLIM Logo.png` (499×500) | `logo-khlim.webp` | 499×500 | 1:1 | Digital Ecosystem & Parent Brand surfaces | *KHLIM* | `REF-ESTHER-BRAND-ECOSYSTEM-LOGO` | Approved official brand logo |
| `KHS ACADEMY Logo.png` (674×410) | `logo-khs-academy.webp` | 674×410 | ~16:10 | KHS Partner surfaces where confirmed | *KHS Academy* | `REF-ESTHER-BRAND-KHS-PARTNER` | Approved secondary partner logo |

---

## 2. Integrity, Governance & Policy Notes

### 2.1 Safeguarding & Documented Parental/Guardian Consent
- **Strict Prohibition of "Implied Consent":** Under modern child safeguarding frameworks (including PDPA, COPPA, and GDPR compliance standards), youth consent is **never** treated as implied.
- **Documented Release Tracking:** All photographs depicting youth athletes (including tournament trophy celebrations and squad photos) are linked to formal, documented parental/guardian media releases on file with club management under internal tracking reference numbers (`REF-ESTHER-TOURNAMENT-*`, `REF-ESTHER-ACADEMY-*`).
- **Privacy & Safeguarding Guarantees:** In strict compliance with child protection guidelines:
  - No minor names, dates of birth, school affiliations, or residential localities are published alongside squad or crowd photography.
  - Alt texts and captions describe collective athletic achievements or team culture neutrally without tagging individuals.
  - An immediate takedown and redaction workflow is maintained: any parent or legal guardian may request redaction or removal of any image via the club safeguarding officer, which takes effect via the live editorial unpublishing mechanism.

### 2.2 Editorial Unpublishing Authority
- **No Resurrected Hardcoded Cards:** When an authoritative editorial administrator unpublishes achievements via the API, the remote endpoint returns an empty array `[]`.
- **Pure Resolver Logic:** `resolveAchievementStories` strictly distinguishes between:
  1. *Intentional empty state* (`remote: []`, `apiError: false`): Renders the localized unpublish/empty notice (`home.achievements.nonePublished`), respecting administrative authority. Hardcoded fallback cards are **not** displayed.
  2. *Live published data* (`remote: [...]`): Renders live published stories.
  3. *Network/API outage* (`remote: null`, `apiError: true`): Gracefully displays verified local fallbacks or neutral archive slots with a visible preview disclaimer.
- Verified by automated unit tests in `tests/achievements-unpublishing.test.mjs`.

### 2.3 Media Directory De-duplication & Logo Mapping
- **Admin Media Optimization:** Removed the 2.35MB duplicate media directory (`apps/admin/public/media/khlim`). Admin surfaces only require the operational logo asset `apps/admin/public/khs-academy-logo.webp`, preserving lean bundle sizes and fast deployment times.
- **Brand Identity Separation:**
  - `Academy Logo.png` (738×869 vertical shield) is the official KHLIM Basketball Academy crest used for public header, footer, favicon, and admin authentication gates.
  - `Club Logo.png` (round crest) is reserved specifically for KHLIM Basketball Club history and tournament distinction.
  - `KHLIM Logo.png` represents the overarching Digital Ecosystem parent brand.
  - `KHS ACADEMY Logo.png` (wide partner banner) is restricted to confirmed KHS partnership surfaces.

### 2.4 Coach Seng Jun Biography & Qualifications
- **Current Copy:** *"Focuses on core basketball fundamentals, skill progression, and competitive player development."*
- **Policy Enforcement:** Per the Website Checklist and soft launch instructions, assertions of **Head Coach** appointment or **MABA Level 3** qualification have NOT been published without explicit final confirmation.
- **Action for Esther/Management:** Confirm whether MABA Level 3 certificate verification is completed before adding it to public copy.

### 2.5 U15 SBA Tournament Discrepancy Flag
- **Discrepancy:** The photo filename in Google Drive states `U15 SBA D1 Selangor Tournament 2025 - Champion` (Division 1), whereas the Website Checklist notes this as `Division B`.
- **Policy Enforcement:** Published with the division-neutral title **"U15 SBA Selangor Tournament"** and placing **"Champion"** to prevent publishing unverified or conflicting division claims.
- **Action for Esther/Management:** Confirm whether this title was Division 1 or Division B so the caption can be updated with full precision.

### 2.6 Khero Mascot Safeguards
- The Khero mascot artwork provided (`2.png`, `3.png`, `4.png`) consists of promotional posters with embedded typography.
- Component `KheroSection` retains the security/rights check `process.env.NEXT_PUBLIC_KHERO_MEDIA_RIGHTS_CONFIRMED === "1"`. When disabled, the section presents the standard `compliance.khero.mediaPendingRights` fallback notice, preserving full legal and rights compliance.

### 2.7 Club vs. Academy Distinction
- An official Club Distinction banner featuring the official KHLIM Basketball Club logo (`logo-club.webp`) is rendered above tournament achievements.
- Explicit copy states across all 5 supported languages (`en`, `ms`, `zh-Hans`, `zh-Hant`, `hi`):
  *"These competitive milestones reflect the tournament history of KHLIM Basketball Club and are distinct from individual youth Academy training progression."*

---

## 3. Visual Verification Screenshots

All visual changes have been captured and verified across desktop, tablet, and mobile viewports. Full-resolution screenshots are stored in `docs/media/screenshots/`:

1. **Homepage Hero (Desktop 1920×1080):** `docs/media/screenshots/homepage-desktop.png`
2. **Homepage Hero (Mobile 390×844):** `docs/media/screenshots/homepage-mobile.png`
3. **Club Achievements (Desktop):** `docs/media/screenshots/achievements-desktop.png`
4. **Club Achievements (Mobile):** `docs/media/screenshots/achievements-mobile.png`
5. **Meet Our Coaches — 4 Columns (Desktop):** `docs/media/screenshots/coaches-desktop.png`
6. **Meet Our Coaches — 2×2 Grid (Tablet):** `docs/media/screenshots/coaches-tablet.png`
7. **Meet Our Coaches — Stacked/Responsive (Mobile):** `docs/media/screenshots/coaches-mobile.png`
8. **Academy Coaching & Venues Section (Desktop):** `docs/media/screenshots/academy-desktop.png`
