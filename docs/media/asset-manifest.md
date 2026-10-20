# KHLIM Official Media Asset Manifest

**Issue:** RIC-85 — Replace Image Placeholders with Official KHLIM Media

**Date:** October 2026

**Status:** Staging Review — no RIC-85 deployment verified; historical exposure unresolved

**Asset Source:** Esther (Official KHLIM Google Drive folder: `1hCSJ3QhtMhBxBya4yisD7PAZB76KFJSF`)

**Base Branch:** `staging/ric-65-academy-soft-launch`

**Feature Branch:** `feat/ric-85-replace-image-placeholders`

---

## 1. Asset Registry & Optimization Matrix

Approved logos and adult coach portraits remain as web-optimized WebP files under `apps/web/public/media/khlim/`. The six youth photographs listed below are withheld from the current branch tree. Redundant asset duplication has been removed from Admin (`apps/admin/public/media` pruned; Admin references `apps/admin/public/khs-academy-logo.webp`).

| Original Drive Asset | Optimized File | Intrinsic Size | Aspect Ratio | Public Placement | Alt Text / Accessible Description | Internal Tracking Ref | Public Build Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `main hero page.jpg` (5603×3735) | `academy-hero-desktop.webp` | 1920×1080 | 16:9 | Homepage Hero (Desktop / Wide) | *KHLIM Basketball Academy team portrait celebrating club community and heritage* | `REF-ESTHER-ACADEMY-HERO-REL` | **Removed from deployable public directory & branch tip** (Withheld pending custodian-verified releases; renders abstract court gradient) |
| `main hero page.jpg` (5603×3735) | `academy-hero-mobile.webp` | 800×1000 | 4:5 vertical | Homepage Hero (Mobile viewport ≤ 768px) | *KHLIM Basketball Academy team portrait celebrating club community and heritage* | `REF-ESTHER-ACADEMY-HERO-REL` | **Removed from deployable public directory & branch tip** (Withheld pending custodian-verified releases; renders abstract court gradient) |
| `Training photos.png` (1654×994) | `club-training-portrait.webp` | 1200×721 | ~16:10 | Academy Page (`/academy` Coaching & Venues section) | *KHLIM basketball squad portrait celebrating club community and heritage* | `REF-ESTHER-CLUB-HERITAGE-REL` | **Removed from deployable public directory & branch tip** (Withheld pending custodian releases; renders official Academy crest showcase) |
| `Coach Seng Jun.jpg` (1280×1086) | `coach-seng-jun.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Seng Jun — KHLIM Basketball Academy* | `REF-ESTHER-COACH-SENGJUN-REL` | **Approved for publication** (Adult coach portrait; factual fundamentals/progression biography) |
| `Coach Jia Xuan.jpg` (3306×4133) | `coach-jia-xuan.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Jia Xuan — KHLIM Basketball Academy* | `REF-ESTHER-COACH-JIAXUAN-REL` | **Approved for publication** (Adult coach portrait; neutral coach designation) |
| `Coach Puimann.jpg` (3306×4133) | `coach-puimann.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Puimann — KHLIM Basketball Academy* | `REF-ESTHER-COACH-PUIMANN-REL` | **Approved for publication** (Adult coach portrait; neutral coach designation) |
| `Coach Woon.png` (1122×1402) | `coach-woon.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Woon — KHLIM Basketball Academy* | `REF-ESTHER-COACH-WOON-REL` | **Approved for publication** (Adult coach portrait; neutral coach designation) |
| `80th CLS International Cup, Indonesia 2026 - Champion.JPG` (3000×2000) | `achievement-cls-2026.webp` | 1200×800 | 3:2 | Homepage Achievements (`#achievements`) | *80th CLS International Cup 2026 Champions* | `REF-ESTHER-TOURNAMENT-CLS26-REL` | **Removed from deployable public directory & branch tip** (Factually verified victory in Indonesia; youth photo withheld pending custodian releases, gradient milestone card rendered) |
| `Jasmine Cup 2025-2026 KHLIM A - Champion.jpg` (5712×4284) | `achievement-jasmine-cup-2026.webp` | 1200×900 | 4:3 | Homepage Achievements (`#achievements`) | *U16 Jasmine Cup 2025-2026 Champions* | `REF-ESTHER-TOURNAMENT-JAS26-REL` | **Removed from deployable public directory & branch tip** (Factually verified victory; youth photo withheld pending custodian releases, gradient milestone card rendered) |
| `U15 SBA D1 Selangor Tournament 2025 - Champion.jpg` (1280×960) | `achievement-sba-2025.webp` | 1200×900 | 4:3 | Homepage Achievements (`#achievements`) | *U15 SBA Selangor Tournament 2025 Champions* | `REF-ESTHER-TOURNAMENT-SBA25-REL` | **Removed from deployable public directory & branch tip** (Factually verified; division-neutral title; youth photo withheld pending custodian releases, gradient milestone card rendered) |
| `Academy Logo.png` (738×869) | `logo-academy.webp` & `khs-academy-logo.webp` | 738×869 | 256:301 | Header, Footer, Favicon, Auth, Shell | *KHLIM Sports Academy* | `REF-ESTHER-BRAND-ACADEMY-LOGO` | **Approved for publication** (Official Academy vertical crest branding) |
| `Club Logo.png` (2333×2124) | `logo-club.webp` | 1200×1092 | ~11:10 | Achievements section distinction banner | *KHLIM Basketball Club* | `REF-ESTHER-BRAND-CLUB-LOGO` | **Approved for publication** (Official Club branding) |
| `KHLIM Logo.png` (499×500) | `logo-khlim.webp` | 499×500 | 1:1 | Digital Ecosystem & Parent Brand surfaces | *KHLIM* | `REF-ESTHER-BRAND-ECOSYSTEM-LOGO` | **Approved for publication** (Official brand logo) |
| `KHS ACADEMY Logo.png` (674×410) | `logo-khs-academy.webp` | 674×410 | ~16:10 | KHS Partner surfaces where confirmed | *KHS Academy* | `REF-ESTHER-BRAND-KHS-PARTNER` | **Approved for publication** (Secondary partner logo) |

---

## 2. Integrity, Governance & Policy Notes

### 2.1 Safeguarding, Asset Removal & Residual Risk Governance

- **Removal from Current Tree:** All six unverified media files containing identifiable minors (`academy-hero-desktop.webp`, `academy-hero-mobile.webp`, `club-training-portrait.webp`, `achievement-cls-2026.webp`, `achievement-jasmine-cup-2026.webp`, `achievement-sba-2025.webp`) are absent from `apps/web/public/media/khlim/` at commit `26fdba7`. Their earlier Git objects remain reachable through the feature branch and PR #94; deleting files in a later commit does not erase them from history.
- **Preservation of Approved Brand Logos & Adult Coach Images:**
  - **Adult Coach Portraits:** `coach-seng-jun.webp`, `coach-jia-xuan.webp`, `coach-puimann.webp`, and `coach-woon.webp` remain preserved in `apps/web/public/media/khlim/`. These are adult professionals supplied directly by Esther for the "Meet Our Coaches" section with verified publication permission.
  - **Official Brand Logos:** `logo-academy.webp`, `logo-club.webp`, `logo-khlim.webp`, and `logo-khs-academy.webp` remain preserved in `apps/web/public/media/khlim/`. These are official organizational vector/raster logos with no persons depicted.
- **Fail-Closed Public Rendering:**
  - Homepage Hero renders a polished abstract black-and-gold basketball court visual treatment with full responsive desktop and mobile support.
  - Academy Coaching section renders the official Academy crest and development standards showcase.
  - Achievements section renders non-identifying championship milestone cards with verified facts and subtle brand gradients.
- **Distinction Between Internal Reference and Verified Consent:** The identifiers `REF-ESTHER-*` are internal organizational asset tracking references. They do **not**, by themselves, constitute verified guardian media consent. In accordance with Malaysian Personal Data Protection Act 2010 (PDPA) principles and youth safeguarding best practices, youth consent is **never** treated as implied.
- **Residual Git History Exposure Risk:**
  - **Nature of Exposure:** Commit `0991967` introduced the six files in both Web and Admin public directories. Commit `fbeaa82` removed the Admin duplicates, and `26fdba7` removed the Web copies. The intervening commits and PR #94 still retain the original commit in their ancestry. The checked staging web deployment is from `0f467ee`, before RIC-85; this does not prove that every historical preview or GitHub cache is clear.
  - **Staging Integration:** A clean squash onto the staging branch can avoid adding the affected commits to staging history, but it does not remove the original feature branch, PR refs, cached GitHub views, clones, or any affected deployment. A replacement PR based directly on staging with only the final safe tree provides a cleaner review and integration path.
  - **Historical Purge:** Removing reachable Git objects from the existing feature branch requires a coordinated history rewrite and force-push or retirement of affected refs, followed by GitHub Support review for PR refs and cached views. This is a separate, owner-approved operation; collaborator clones and forks require their own cleanup.
- **Residual CDN & Preview Cache Exposure Risk:**
  - **Nature of Exposure:** If an affected Vercel deployment exists, its immutable deployment URL may continue serving the files even after another deployment removes them. Edge and browser caches may retain copies. No affected RIC-85 deployment has been established by this manifest.
  - **Remediation Protocol:** Inventory deployment IDs and source SHAs first. For an affected deployment, coordinate disabling access or deleting that deployment with the owner; purge the relevant Vercel CDN cache where applicable, then check the exact asset URLs with header-only requests. A cache purge alone does not delete files from an existing deployment or clear visitor browser caches, and no immediate global 404 can be promised.
- **Data Privacy & Takedown Protocol:**
  - A parent or legal guardian may request redaction or removal via the club safeguarding contact. Editorial unpublishing can stop a page from linking to an image after the change is deployed, but it does not revoke a static asset URL, Git object, old deployment, CDN copy, or browser cache. Confirm each surface separately before declaring takedown complete.
  - Sensitive release documents and personal information must remain strictly outside the public repository.

### 2.2 Editorial Unpublishing Authority & State Machine

The editorial resolver `resolveAchievementStories` implements four distinct, fail-closed states:

1. **`loading` state (`isLoading === true` / pre-resolution):**
   - The UI renders loading skeleton cards.
   - **Crucial:** No photographs or fallback cards are revealed during loading.
2. **`empty` state (`remote !== null && !apiError && remote.length === 0`):**
   - Authoritative API returned an empty list (staff unpublished all achievements or none exist).
   - Renders the localized notice (`home.achievements.nonePublished`).
   - Hardcoded cards are **never** resurrected.
3. **`success` state (`remote !== null && !apiError && remote.length > 0`):**
   - Displays live published achievements and the Club Distinction banner.
   - Any image rendering requires verified rights and explicit environment clearance (`NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED === "1"`).
4. **`error` state (`apiError === true`):**
   - Network outage, API timeout, or offline state.
   - Renders neutral archive preview slots with the editorial preview notice.
   - **Crucial:** Fails closed; never resurrects hardcoded youth photographs.

Verified by automated unit tests in `tests/achievements-unpublishing.test.mjs`.

### 2.3 Media Directory De-duplication & Logo Mapping

- **Admin Media Optimization:** Removed the 2.35MB duplicate media directory (`apps/admin/public/media/khlim`). Admin surfaces only require the operational logo asset `apps/admin/public/khs-academy-logo.webp`, preserving lean bundle sizes and fast deployment times.
- **Brand Identity Separation:**
  - `Academy Logo.png` (738×869 vertical shield) is the official KHLIM Basketball Academy crest used for public header, footer, favicon, and admin authentication gates.
  - `Club Logo.png` (round crest) is reserved specifically for KHLIM Basketball Club history and tournament distinction.
  - `KHLIM Logo.png` represents the overarching Digital Ecosystem parent brand.
  - `KHS ACADEMY Logo.png` (wide partner banner) is restricted to confirmed KHS partnership surfaces.

### 2.4 Adult Coach Publication Permissions & Credentials

- **Adult Staff Approval:** Coach Seng Jun, Coach Jia Xuan, Coach Puimann, and Coach Woon are adult coaches. Esther provided their individual professional headshots specifically for the "Meet Our Coaches" section on the Academy website, with approved publication permission for this purpose.
- **Coach Seng Jun Biography:** Copy states: *"Focuses on core basketball fundamentals, skill progression, and competitive player development."* Assertions of **Head Coach** appointment or **MABA Level 3** qualification remain withheld pending explicit final confirmation.
- **Coaches Jia Xuan, Puimann, and Woon:** Displayed with the neutral designation "Coach" and factual youth skill development descriptions without inventing credentials.

### 2.5 U15 SBA Tournament Discrepancy Flag

- **Discrepancy:** The photo filename in Google Drive states `U15 SBA D1 Selangor Tournament 2025 - Champion` (Division 1), whereas the Website Checklist notes this as `Division B`.
- **Policy Enforcement:** Published with the division-neutral title **"U15 SBA Selangor Tournament"** and placing **"Champion"** to prevent publishing unverified or conflicting division claims.
- **Action for Esther/Management:** Confirm whether this title was Division 1 or Division B so the caption can be updated with full precision.

### 2.6 Khero Mascot & Public-Tree Media Safeguards

- The unverified Khero promotional artwork files have been removed from the deployable public directory (`apps/web/public/media/khero/`) and replaced with safe reviewable placeholder WebP files. This ensures that direct HTTP requests to these paths do not serve unverified promotional assets, while preserving layout geometry and preventing broken links.
- Component `KheroSection` retains the security/rights check `process.env.NEXT_PUBLIC_KHERO_MEDIA_RIGHTS_CONFIRMED === "1"`. When disabled, the section presents the standard `compliance.khero.mediaPendingRights` fallback notice, preserving full legal and rights compliance.
- Unused asset `apps/web/public/khlim-logo.jpg` marked `REVIEW_REQUIRED` has been removed from the public deployable tree to eliminate direct HTTP 200 exposure. Rights are not inferred from approved logo WebPs.

### 2.7 Club vs. Academy Distinction

- An official Club Distinction banner featuring the official KHLIM Basketball Club logo (`logo-club.webp`) is rendered above tournament achievements when live published.
- Explicit copy states across all 5 supported languages (`en`, `ms`, `zh-Hans`, `zh-Hant`, `hi`):
  *"These competitive milestones reflect the tournament history of KHLIM Basketball Club and are distinct from individual youth Academy training progression."*

### 2.8 Release-Safety Follow-Up

This review does not add backend media governance features. Before any staging integration, retain evidence of per-asset rights decisions outside the public repository, choose a clean staging integration commit, and resolve the original branch and PR exposure with the repository owner and GitHub Support as applicable. Any later release registry or automated cache handling needs a separate design and cannot guarantee instantaneous removal from Git history, immutable deployments, or browser caches.

---

## 3. Visual Verification

Visual layout and responsiveness across desktop, tablet, and mobile viewports have been verified via local automated test suites (`tests/e2e/staging-browser-acceptance.spec.mjs`, `tests/media-integration-preview.test.mjs`, `tests/homepage-carousel-4slides.test.mjs`). In accordance with repository safeguarding policies, binary browser screenshots are retained in local verification artifacts and excluded from the public git repository.

---

## 4. Homepage Hero Carousel Addon (2026-10-18)

6 high-resolution web-optimized WebP carousel crops were added under `apps/web/public/media/home/` to support the 4-slide responsive hero carousel:

| File Name | Placement | Intrinsic Size | Aspect Ratio | Provenance / Authorization |
| :--- | :--- | :--- | :--- | :--- |
| `team-huddle-desktop.webp` | Hero Slide 2 (Desktop/Tablet) | 2560×1440 | 16:9 | Director Esther confirmation reported by user (2026-10-18) |
| `team-huddle-mobile.webp` | Hero Slide 2 (Mobile portrait) | 1080×1350 | ~4:5 | Director Esther confirmation reported by user (2026-10-18) |
| `sideline-energy-desktop.webp` | Hero Slide 3 (Desktop/Tablet) | 2560×1440 | 16:9 | Director Esther confirmation reported by user (2026-10-18) |
| `sideline-energy-mobile.webp` | Hero Slide 3 (Mobile portrait) | 1080×1350 | ~4:5 | Director Esther confirmation reported by user (2026-10-18) |
| `court-together-desktop.webp` | Hero Slide 4 (Desktop/Tablet) | 1920×1080 | 16:9 | Director Esther confirmation reported by user (2026-10-18) |
| `court-together-mobile.webp` | Hero Slide 4 (Mobile portrait) | 1080×1350 | ~4:5 | Director Esther confirmation reported by user (2026-10-18) |

---

## 5. Jasmine Cup Image Conversions (2026-10-18)

Repaired color WebP assets replaced the previous defective HEIF decodes under `apps/web/public/media/achievements/`:

| File Name | Placement | Intrinsic Size | Aspect Ratio | Provenance / Authorization |
| :--- | :--- | :--- | :--- | :--- |
| `jasmine-cup-2025-2026-khlim-a-champion.webp` | Achievements Gallery | 2048×1536 | 4:3 | Director Esther confirmation reported by user (2026-10-18); full-color WebP conversion |
| `jasmine-cup-2025-2026-khlim-e-fourth.webp` | Achievements Gallery | 2048×1536 | 4:3 | Director Esther confirmation reported by user (2026-10-18); full-color WebP conversion |
