# KHLIM Official Media Asset Manifest

**Issue:** RIC-85 — Replace Image Placeholders with Official KHLIM Media  
**Date:** October 2026  
**Status:** Staging Review — Fail-Closed Safeguards Active  
**Asset Source:** Esther (Official KHLIM Google Drive folder: `1hCSJ3QhtMhBxBya4yisD7PAZB76KFJSF`)  
**Base Branch:** `staging/ric-65-academy-soft-launch`  
**Feature Branch:** `feat/ric-85-replace-image-placeholders`  

---

## 1. Asset Registry & Optimization Matrix

All official media has been converted to web-optimized WebP format under `apps/web/public/media/khlim/`. Redundant asset duplication has been removed from Admin (`apps/admin/public/media` pruned to prevent bundle bloat; Admin references `apps/admin/public/khs-academy-logo.webp`).

| Original Drive Asset | Optimized File | Intrinsic Size | Aspect Ratio | Public Placement | Alt Text / Accessible Description | Internal Tracking Ref | Public Build Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `main hero page.jpg` (5603×3735) | `academy-hero-desktop.webp` | 1920×1080 | 16:9 | Homepage Hero (Desktop / Wide) | *KHLIM Basketball Academy team portrait celebrating club community and heritage* | `REF-ESTHER-ACADEMY-HERO-REL` | **Held from public build** (fails closed to polished black-and-gold abstract court gradient pending custodian-verified releases) |
| `main hero page.jpg` (5603×3735) | `academy-hero-mobile.webp` | 800×1000 | 4:5 vertical | Homepage Hero (Mobile viewport ≤ 768px) | *KHLIM Basketball Academy team portrait celebrating club community and heritage* | `REF-ESTHER-ACADEMY-HERO-REL` | **Held from public build** (fails closed to polished black-and-gold abstract court gradient pending custodian-verified releases) |
| `Training photos.png` (1654×994) | `club-training-portrait.webp` | 1200×721 | ~16:10 | Academy Page (`/academy` Coaching & Venues section) | *KHLIM basketball squad portrait celebrating club community and heritage* | `REF-ESTHER-CLUB-HERITAGE-REL` | **Held from public build** (fails closed to official Academy crest and development standards showcase pending custodian releases) |
| `Coach Seng Jun.jpg` (1280×1086) | `coach-seng-jun.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Seng Jun — KHLIM Basketball Academy* | `REF-ESTHER-COACH-SENGJUN-REL` | **Approved for publication** (Adult coach portrait; factual fundamentals/progression biography) |
| `Coach Jia Xuan.jpg` (3306×4133) | `coach-jia-xuan.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Jia Xuan — KHLIM Basketball Academy* | `REF-ESTHER-COACH-JIAXUAN-REL` | **Approved for publication** (Adult coach portrait; neutral coach designation) |
| `Coach Puimann.jpg` (3306×4133) | `coach-puimann.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Puimann — KHLIM Basketball Academy* | `REF-ESTHER-COACH-PUIMANN-REL` | **Approved for publication** (Adult coach portrait; neutral coach designation) |
| `Coach Woon.png` (1122×1402) | `coach-woon.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Woon — KHLIM Basketball Academy* | `REF-ESTHER-COACH-WOON-REL` | **Approved for publication** (Adult coach portrait; neutral coach designation) |
| `80th CLS International Cup, Indonesia 2026 - Champion.JPG` (3000×2000) | `achievement-cls-2026.webp` | 1200×800 | 3:2 | Homepage Achievements (`#achievements`) | *80th CLS International Cup 2026 Champions* | `REF-ESTHER-TOURNAMENT-CLS26-REL` | **Held from public build** (fcatually verified victory in Indonesia; youth photo held pending custodian releases, gradient fallback rendered) |
| `Jasmine Cup 2025-2026 KHLIM A - Champion.jpg` (5712×4284) | `achievement-jasmine-cup-2026.webp` | 1200×900 | 4:3 | Homepage Achievements (`#achievements`) | *U16 Jasmine Cup 2025-2026 Champions* | `REF-ESTHER-TOURNAMENT-JAS26-REL` | **Held from public build** (factually verified victory; youth photo held pending custodian releases, gradient fallback rendered) |
| `U15 SBA D1 Selangor Tournament 2025 - Champion.jpg` (1280×960) | `achievement-sba-2025.webp` | 1200×900 | 4:3 | Homepage Achievements (`#achievements`) | *U15 SBA Selangor Tournament 2025 Champions* | `REF-ESTHER-TOURNAMENT-SBA25-REL` | **Held from public build** (factually verified; division-neutral title; youth photo held pending custodian releases, gradient fallback rendered) |
| `Academy Logo.png` (738×869) | `logo-academy.webp` & `khs-academy-logo.webp` | 738×869 | 256:301 | Header, Footer, Favicon, Auth, Shell | *KHLIM Sports Academy* | `REF-ESTHER-BRAND-ACADEMY-LOGO` | **Approved for publication** (Official Academy vertical crest branding) |
| `Club Logo.png` (2333×2124) | `logo-club.webp` | 1200×1092 | ~11:10 | Achievements section distinction banner | *KHLIM Basketball Club* | `REF-ESTHER-BRAND-CLUB-LOGO` | **Approved for publication** (Official Club branding) |
| `KHLIM Logo.png` (499×500) | `logo-khlim.webp` | 499×500 | 1:1 | Digital Ecosystem & Parent Brand surfaces | *KHLIM* | `REF-ESTHER-BRAND-ECOSYSTEM-LOGO` | **Approved for publication** (Official brand logo) |
| `KHS ACADEMY Logo.png` (674×410) | `logo-khs-academy.webp` | 674×410 | ~16:10 | KHS Partner surfaces where confirmed | *KHS Academy* | `REF-ESTHER-BRAND-KHS-PARTNER` | **Approved for publication** (Secondary partner logo) |

---

## 2. Integrity, Governance & Policy Notes

### 2.1 Safeguarding, Release Verification & Public Git Remediation

- **Distinction Between Internal Reference and Verified Consent:** The identifiers `REF-ESTHER-*` are internal organizational asset tracking references. They do **not**, by themselves, constitute verified guardian media consent.
- **Strict Prohibition of "Implied Consent":** In accordance with Malaysian Personal Data Protection Act 2010 (PDPA) principles and youth safeguarding best practices, youth consent is **never** treated as implied.
- **Fail-Closed Public Build Policy:** Because genuine signed per-asset guardian media releases have not yet been validated by an authorized custodian, all photographs depicting identifiable minors are **held from public rendering** in the production build.
  - Homepage Hero fails closed to the polished abstract black-and-gold basketball visual treatment.
  - Academy Coaching section fails closed to the official Academy crest and development standards showcase.
  - Achievements section fails closed to non-identifying championship milestone cards with verified facts and subtle brand gradients.
- **Public Git History Remediation Risk:** Asset files committed to the public Git repository feature branch in earlier commits represent a separate exposure risk independent of website rendering. A formal Git history remediation (e.g. BFG / git-filter-repo) requires explicit management authorization and must be scheduled as a controlled administrative task to avoid destructive upstream history rewriting on active review branches.
- **Data Privacy & Takedown Protocol:**
  - No minor names, dates of birth, school affiliations, or residential localities are published anywhere on the website.
  - An immediate takedown and redaction workflow is maintained: any parent or legal guardian may request redaction or removal of any image via the club safeguarding contact, which takes effect immediately via the live editorial unpublishing mechanism.
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

### 2.6 Khero Mascot Safeguards

- The Khero mascot artwork provided (`2.png`, `3.png`, `4.png`) consists of promotional posters with embedded typography.
- Component `KheroSection` retains the security/rights check `process.env.NEXT_PUBLIC_KHERO_MEDIA_RIGHTS_CONFIRMED === "1"`. When disabled, the section presents the standard `compliance.khero.mediaPendingRights` fallback notice, preserving full legal and rights compliance.

### 2.7 Club vs. Academy Distinction

- An official Club Distinction banner featuring the official KHLIM Basketball Club logo (`logo-club.webp`) is rendered above tournament achievements when live published.
- Explicit copy states across all 5 supported languages (`en`, `ms`, `zh-Hans`, `zh-Hant`, `hi`):
  *"These competitive milestones reflect the tournament history of KHLIM Basketball Club and are distinct from individual youth Academy training progression."*

### 2.8 Backend Handoff for Codex

To fully complete persistent media governance, the following backend capabilities are identified for Codex:

1. **Persistent Media Release Registry:** A dedicated backend table or metadata field on editorial media assets recording:
   - `guardianConsentVerified`: Boolean indicating verified signed consent on file with the custodian.
   - `verifiedByCustodian`: Staff user ID / timestamp of custodian verification.
   - `consentExpiryDate`: Date when release expires or requires renewal.
2. **CDN Cache Invalidation / Takedown Hook:** When an achievement or media asset is unpublished via the Admin Editorial Studio, an automated webhook/event must invalidate the CDN edge cache for the corresponding asset URL to ensure instantaneous global purge.

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
