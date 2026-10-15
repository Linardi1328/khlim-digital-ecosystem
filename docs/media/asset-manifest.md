# KHLIM Official Media Asset Manifest

**Issue:** RIC-85 — Replace Image Placeholders with Official KHLIM Media  
**Date:** October 2026  
**Status:** Approved & Implemented  
**Asset Source:** Esther (Official KHLIM Google Drive folder: `1hCSJ3QhtMhBxBya4yisD7PAZB76KFJSF`)  
**Base Branch:** `staging/ric-65-academy-soft-launch`  
**Feature Branch:** `feat/ric-85-replace-image-placeholders`  

---

## 1. Asset Registry & Optimization Matrix

All official media has been converted to web-optimized WebP format, organized under `apps/web/public/media/khlim/` and `apps/admin/public/media/khlim/`.

| Original Drive Asset | Optimized File | Intrinsic Size | Aspect Ratio | Public Placement | Alt Text / Accessible Description | Publication Approval Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `main hero page.jpg` (5603×3735) | `academy-hero-desktop.webp` | 1920×1080 | 16:9 | Homepage Hero (Desktop / Wide) | *KHLIM Basketball Academy training action on court* | Approved by Esther for Academy soft launch |
| `main hero page.jpg` (5603×3735) | `academy-hero-mobile.webp` | 800×1000 | 4:5 vertical | Homepage Hero (Mobile viewport ≤ 768px) | *KHLIM Basketball Academy training action on court* | Approved by Esther for Academy soft launch |
| `Training photos.png` (1654×994) | `club-training-portrait.webp` | 1200×721 | ~16:10 | Academy Page (`/academy` Coaching & Venues section) | *KHLIM basketball athletes in training session* | Approved as club credibility & culture image |
| `Coach Seng Jun.jpg` (1280×1086) | `coach-seng-jun.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Seng Jun — KHLIM Basketball Academy* | Approved. Bio uses verified fundamentals/progression facts. |
| `Coach Jia Xuan.jpg` (3306×4133) | `coach-jia-xuan.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Jia Xuan — KHLIM Basketball Academy* | Approved with neutral coach designation |
| `Coach Puimann.jpg` (3306×4133) | `coach-puimann.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Puimann — KHLIM Basketball Academy* | Approved with neutral coach designation |
| `Coach Woon.png` (1122×1402) | `coach-woon.webp` | 800×1000 | 4:5 portrait | Academy Page (`/academy` Meet Our Coaches) | *Coach Woon — KHLIM Basketball Academy* | Approved with neutral coach designation |
| `80th CLS International Cup, Indonesia 2026 - Champion.JPG` (3000×2000) | `achievement-cls-2026.webp` | 1200×800 | 3:2 | Homepage Achievements (`#achievements`) | *80th CLS International Cup 2026 Champions* | Approved tournament victory (Surabaya, Indonesia) |
| `Jasmine Cup 2025-2026 KHLIM A - Champion.jpg` (5712×4284) | `achievement-jasmine-cup-2026.webp` | 1200×900 | 4:3 | Homepage Achievements (`#achievements`) | *U16 Jasmine Cup 2025-2026 Champions* | Approved tournament victory |
| `U15 SBA D1 Selangor Tournament 2025 - Champion.jpg` (1280×960) | `achievement-sba-2025.webp` | 1200×900 | 4:3 | Homepage Achievements (`#achievements`) | *U15 SBA Selangor Tournament 2025 Champions* | Approved tournament victory. Division-neutral caption displayed. |
| `Academy Logo.png` (738×869) | `logo-academy.webp` & `khs-academy-logo.webp` | 738×869 | 256:301 | Header, Footer, Favicon, Auth, Shell | *KHLIM Sports Academy* | Approved official Academy branding |
| `Club Logo.png` (2333×2124) | `logo-club.webp` | 1200×1092 | ~11:10 | Achievements section distinction banner | *KHLIM Basketball Club* | Approved official Club branding |
| `KHLIM Logo.png` (499×500) | `logo-khlim.webp` | 499×500 | 1:1 | Digital Ecosystem & Parent Brand surfaces | *KHLIM* | Approved official brand logo |
| `KHS ACADEMY Logo.png` (674×410) | `logo-khs-academy.webp` | 674×410 | ~16:10 | KHS Partner surfaces where confirmed | *KHS Academy* | Approved secondary partner logo |

---

## 2. Integrity & Policy Notes

### 2.1 Coach Seng Jun Biography & Qualifications
- **Current copy:** "Focuses on core basketball fundamentals, skill progression, and competitive player development."
- **Policy enforcement:** Per the Website Checklist and soft launch instructions, assertions of **Head Coach** appointment or **MABA Level 3** qualification have NOT been published without explicit final confirmation.
- **Action for Esther/Management:** Confirm whether MABA Level 3 certificate verification is completed before adding it to public copy.

### 2.2 U15 SBA Tournament Discrepancy Flag
- **Discrepancy:** The photo filename in Google Drive states `U15 SBA D1 Selangor Tournament 2025 - Champion` (Division 1), whereas the Website Checklist notes this as `Division B`.
- **Policy enforcement:** Published with the division-neutral title **"U15 SBA Selangor Tournament"** and placing **"Champion"** to prevent publishing unverified or conflicting division claims.
- **Action for Esther/Management:** Confirm whether this title was Division 1 or Division B so the caption can be updated with full precision.

### 2.3 Safeguarding & Minor Consent
- All team celebration and court photographs supplied are official tournament awards ceremonies or club training photos with implied consent for club publicity.
- In compliance with youth safeguarding, no individual minor names, dates of birth, school names, or residential locations are attached to tournament crowd or team photos.

### 2.4 Khero Mascot Safeguards
- The Khero mascot artwork provided (`2.png`, `3.png`, `4.png`) consists of promotional posters with embedded typography.
- Component `KheroSection` retains the security/rights check `process.env.NEXT_PUBLIC_KHERO_MEDIA_RIGHTS_CONFIRMED === "1"`. When disabled, the section presents the standard `compliance.khero.mediaPendingRights` fallback notice, preserving full legal and rights compliance.

### 2.5 Club vs. Academy Distinction
- An official Club Distinction banner featuring the official KHLIM Basketball Club logo (`logo-club.webp`) has been introduced to the Homepage Achievements section.
- Explicit copy states across all 5 supported languages (`en`, `ms`, `zh-Hans`, `zh-Hant`, `hi`):
  *"These competitive milestones reflect the tournament history of KHLIM Basketball Club and are distinct from individual youth Academy training progression."*
