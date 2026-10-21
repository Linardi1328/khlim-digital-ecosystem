/**
 * KHLIM Staging Media Registry & Rights Specification
 *
 * Tracks the 14 optimized responsive WebP derivatives prepared from the
 * 2026-10-18 Media Staging Pack.
 *
 * FAIL-CLOSED SECURITY INVARIANT:
 * All assets in this staging registry require explicit rights confirmation
 * before entering public-facing builds (public_ready: false). Unapproved assets
 * must never be placed in `apps/web/public/` or served directly on production.
 */

export type MediaCategory =
  "branding" | "khero" | "coaches" | "youth" | "achievements";

export type RightsStatus =
  | "VERIFIED"
  | "BRAND_OWNER_APPROVAL_REQUIRED"
  | "MASCOT_ARTWORK_APPROVAL_REQUIRED"
  | "COACH_AND_PHOTOGRAPHER_RELEASE_REQUIRED"
  | "GUARDIAN_AND_PHOTOGRAPHER_CONSENT_REQUIRED";

export interface StagedMediaAsset {
  id: string;
  file: string;
  sourceFile: string;
  category: MediaCategory;
  width: number;
  height: number;
  sizeBytes: number;
  sha256: string;
  suggestedPlacement: string;
  rightsStatus: RightsStatus;
  authorizationRequiredFrom: string[];
  isYouthMinor: boolean;
  publicReady: boolean;
  stagingPreviewUrl: string;
  titleKey: string;
  notes: string;
}

export interface AuthorizationScorecard {
  totalStaged: number;
  verifiedCount: number;
  pendingApprovalCount: number;
  brandOwnerApprovalRequiredCount: number;
  mascotArtworkApprovalRequiredCount: number;
  coachAndPhotographerReleaseRequiredCount: number;
  guardianAndPhotographerConsentRequiredCount: number;
  minorAssetsCount: number;
  publicReadyCount: number;
}

export const STAGED_MEDIA_ASSETS: readonly StagedMediaAsset[] = [
  {
    id: "branding-khlim-laurel-crest",
    file: "branding/khlim-laurel-crest.webp",
    sourceFile: "KHLIM Logo.png",
    category: "branding",
    width: 499,
    height: 500,
    sizeBytes: 71826,
    sha256: "741779a099753c8141dfe1a1cdf9ebd70373efc0be5209a25fa3a1df51b9f556",
    suggestedPlacement: "Corporate identity, optional About section",
    rightsStatus: "BRAND_OWNER_APPROVAL_REQUIRED",
    authorizationRequiredFrom: [
      "KHLIM Brand Owner",
      "Corporate Legal Representative",
    ],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl: "/api/preview-media/branding/khlim-laurel-crest.webp",
    titleKey: "brand.khlim",
    notes:
      "Corporate laurel crest. Awaits brand governance decision on primary corporate identity.",
  },
  {
    id: "branding-khs-academy-mark",
    file: "branding/khs-academy-mark.webp",
    sourceFile: "KHS ACADEMY Logo.png",
    category: "branding",
    width: 674,
    height: 410,
    sizeBytes: 48296,
    sha256: "c9360b3680d5b207c37b1fbe2fe3c484b74d033ce7824947823c30a198a573ff",
    suggestedPlacement: "Academy header/identity, after brand confirmation",
    rightsStatus: "BRAND_OWNER_APPROVAL_REQUIRED",
    authorizationRequiredFrom: ["KHLIM Brand Owner", "Academy Director"],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl: "/api/preview-media/branding/khs-academy-mark.webp",
    titleKey: "brand.academy",
    notes:
      "Horizontal KHS Academy wordmark. Evaluate against existing crest logo before replacing.",
  },
  {
    id: "branding-academy-crest",
    file: "branding/academy-crest.webp",
    sourceFile: "Academy Logo.png",
    category: "branding",
    width: 738,
    height: 869,
    sizeBytes: 117008,
    sha256: "9a33889197dcc7522e69e2a612cff51c6c4a13bce33dd2bbaadf44e9782ff24b",
    suggestedPlacement: "Academy programmes and coach section",
    rightsStatus: "BRAND_OWNER_APPROVAL_REQUIRED",
    authorizationRequiredFrom: ["KHLIM Brand Owner", "Academy Director"],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl: "/api/preview-media/branding/academy-crest.webp",
    titleKey: "brand.academy",
    notes:
      "Academy shield crest variant. Requires confirmation whether this supersedes /khs-academy-logo.webp.",
  },
  {
    id: "branding-kh-basketball-club",
    file: "branding/kh-basketball-club.webp",
    sourceFile: "Club Logo.png",
    category: "branding",
    width: 800,
    height: 728,
    sizeBytes: 207600,
    sha256: "e616701622c24fe6a4b4d4585c0d59b82f3a7ef0def9d0c2798b6007cc43d698",
    suggestedPlacement: "Club identity only (Achievements section)",
    rightsStatus: "BRAND_OWNER_APPROVAL_REQUIRED",
    authorizationRequiredFrom: ["KHLIM Brand Owner", "Club Management"],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl: "/api/preview-media/branding/kh-basketball-club.webp",
    titleKey: "home.achievements.clubBadge",
    notes:
      "Competitive club badge. Dedicated to Achievements section; distinct from youth academy identity.",
  },
  {
    id: "khero-meet-khero",
    file: "khero/meet-khero.webp",
    sourceFile: "2.png",
    category: "khero",
    width: 1240,
    height: 1748,
    sizeBytes: 228934,
    sha256: "88c428fa940311d06a55a68cecb58ff351962f8d8a5564cc8d1bbdf9deabc5e8",
    suggestedPlacement: "KHero / Meet KHero",
    rightsStatus: "MASCOT_ARTWORK_APPROVAL_REQUIRED",
    authorizationRequiredFrom: [
      "Mascot Artwork Illustrator / Studio",
      "KHLIM Brand Owner",
    ],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl: "/api/preview-media/khero/meet-khero.webp",
    titleKey: "home.khero.poster.meet",
    notes:
      "Poster with embedded English text (Sept 23, Libra, origin story). Requires artist copyright release.",
  },
  {
    id: "khero-meaning",
    file: "khero/khero-meaning.webp",
    sourceFile: "3.png",
    category: "khero",
    width: 1240,
    height: 1748,
    sizeBytes: 228120,
    sha256: "119ef6c23142265a092460aa3d3cd8f29abdbf6750b078578f79d1a8a8231b53",
    suggestedPlacement: "KHero / KHero Meaning",
    rightsStatus: "MASCOT_ARTWORK_APPROVAL_REQUIRED",
    authorizationRequiredFrom: [
      "Mascot Artwork Illustrator / Studio",
      "KHLIM Brand Owner",
    ],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl: "/api/preview-media/khero/khero-meaning.webp",
    titleKey: "home.khero.poster.meaning",
    notes:
      "Poster explaining 'KH' + 'Hero' origin. Requires artist copyright release.",
  },
  {
    id: "khero-way",
    file: "khero/khero-way.webp",
    sourceFile: "4.png",
    category: "khero",
    width: 1240,
    height: 1748,
    sizeBytes: 225716,
    sha256: "7c124fd5adaa1b661f73881d13c797fec2183a98e0f81533f38722b90c2ed644",
    suggestedPlacement: "KHero / KHero Way",
    rightsStatus: "MASCOT_ARTWORK_APPROVAL_REQUIRED",
    authorizationRequiredFrom: [
      "Mascot Artwork Illustrator / Studio",
      "KHLIM Brand Owner",
    ],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl: "/api/preview-media/khero/khero-way.webp",
    titleKey: "home.khero.poster.way",
    notes:
      "Poster with four foundational rules. Requires artist copyright release.",
  },
  {
    id: "coach-seng-jun",
    file: "restricted_pending_approval/coaches/seng-jun-portrait-720.webp",
    sourceFile: "Coach Seng Jun.jpg",
    category: "coaches",
    width: 720,
    height: 900,
    sizeBytes: 83556,
    sha256: "444f2360cc668d2d282c9db7f8e3c249dc8319ae149a635f8c3aa9b6cc31befa",
    suggestedPlacement: "Academy coaching profile (Coach Seng Jun)",
    rightsStatus: "COACH_AND_PHOTOGRAPHER_RELEASE_REQUIRED",
    authorizationRequiredFrom: ["Coach Seng Jun", "Photographer"],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl:
      "/api/preview-media/restricted_pending_approval/coaches/seng-jun-portrait-720.webp",
    titleKey: "academy.coaches.sengJun.name",
    notes:
      "720x900 aspect 4:5 portrait. Requires photographer release and coach publicity consent.",
  },
  {
    id: "coach-jia-xuan",
    file: "restricted_pending_approval/coaches/jia-xuan-portrait-720.webp",
    sourceFile: "Coach Jia Xuan.jpg",
    category: "coaches",
    width: 720,
    height: 900,
    sizeBytes: 36070,
    sha256: "75f7afc873c30e756ed2e0adc7f6283358740c08de101805ced1ffa70a8aba5e",
    suggestedPlacement: "Academy coaching profile (Coach Jia Xuan)",
    rightsStatus: "COACH_AND_PHOTOGRAPHER_RELEASE_REQUIRED",
    authorizationRequiredFrom: ["Coach Jia Xuan", "Photographer"],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl:
      "/api/preview-media/restricted_pending_approval/coaches/jia-xuan-portrait-720.webp",
    titleKey: "academy.coaches.jiaXuan.name",
    notes:
      "720x900 aspect 4:5 portrait. Requires photographer release and coach publicity consent.",
  },
  {
    id: "coach-puimann",
    file: "restricted_pending_approval/coaches/puimann-portrait-720.webp",
    sourceFile: "Coach Puimann.jpg",
    category: "coaches",
    width: 720,
    height: 900,
    sizeBytes: 44326,
    sha256: "4aa0f1dd525af70bb77047da82f74389376558e123258d693349f4c5a7533452",
    suggestedPlacement: "Academy coaching profile (Coach Puimann)",
    rightsStatus: "COACH_AND_PHOTOGRAPHER_RELEASE_REQUIRED",
    authorizationRequiredFrom: ["Coach Puimann", "Photographer"],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl:
      "/api/preview-media/restricted_pending_approval/coaches/puimann-portrait-720.webp",
    titleKey: "academy.coaches.puimann.name",
    notes:
      "720x900 aspect 4:5 portrait. Requires photographer release and coach publicity consent.",
  },
  {
    id: "coach-woon",
    file: "restricted_pending_approval/coaches/woon-portrait-720.webp",
    sourceFile: "Coach Woon.png",
    category: "coaches",
    width: 720,
    height: 900,
    sizeBytes: 32384,
    sha256: "cb0dcc1d05724bcebd375f3d2a25cf27f7ddd87ab643761cf503828c6da51685",
    suggestedPlacement: "Academy coaching profile (Coach Woon)",
    rightsStatus: "COACH_AND_PHOTOGRAPHER_RELEASE_REQUIRED",
    authorizationRequiredFrom: ["Coach Woon", "Photographer"],
    isYouthMinor: false,
    publicReady: false,
    stagingPreviewUrl:
      "/api/preview-media/restricted_pending_approval/coaches/woon-portrait-720.webp",
    titleKey: "academy.coaches.woon.name",
    notes:
      "720x900 aspect 4:5 portrait. Requires photographer release and coach publicity consent.",
  },
  {
    id: "youth-team-hero-1920",
    file: "restricted_pending_approval/youth/team-hero-1920.webp",
    sourceFile: "main hero page.jpg",
    category: "youth",
    width: 1920,
    height: 1280,
    sizeBytes: 420166,
    sha256: "3eab5e8d12dba6da16889667129d83f4879a1301bea14b31eb8f93ba2cc432ab",
    suggestedPlacement: "Home hero / full-frame 3:2 source",
    rightsStatus: "GUARDIAN_AND_PHOTOGRAPHER_CONSENT_REQUIRED",
    authorizationRequiredFrom: [
      "Legal Guardians of Identifiable Minors",
      "Photographer",
      "Academy Director",
    ],
    isYouthMinor: true,
    publicReady: false,
    stagingPreviewUrl:
      "/api/preview-media/restricted_pending_approval/youth/team-hero-1920.webp",
    titleKey: "home.hero.photo.training",
    notes:
      "Full squad photograph containing identifiable minors. STRICTLY PROHIBITED in public tree without signed guardian consent forms on file.",
  },
  {
    id: "youth-team-hero-wide-1920",
    file: "restricted_pending_approval/youth/team-hero-wide-1920.webp",
    sourceFile: "main hero page.jpg",
    category: "youth",
    width: 1920,
    height: 1080,
    sizeBytes: 368788,
    sha256: "70c5a4b34c93d2aea415a4219a914117b0e1057d9029172a70c6a37f9defee23",
    suggestedPlacement: "Home hero / 16:9 variant; review subject cropping",
    rightsStatus: "GUARDIAN_AND_PHOTOGRAPHER_CONSENT_REQUIRED",
    authorizationRequiredFrom: [
      "Legal Guardians of Identifiable Minors",
      "Photographer",
      "Academy Director",
    ],
    isYouthMinor: true,
    publicReady: false,
    stagingPreviewUrl:
      "/api/preview-media/restricted_pending_approval/youth/team-hero-wide-1920.webp",
    titleKey: "home.hero.photo.training",
    notes:
      "16:9 panoramic crop of squad photograph containing identifiable minors. Subject to minor privacy protections.",
  },
  {
    id: "youth-training-group-1280",
    file: "restricted_pending_approval/youth/training-group-1280.webp",
    sourceFile: "Training photos.png",
    category: "youth",
    width: 1280,
    height: 769,
    sizeBytes: 172706,
    sha256: "0895f883cd7a62eba8280b1ad62f009a50c341c2b9a93301e5e345a2e4239066",
    suggestedPlacement: "Programmes or Academy social-proof image",
    rightsStatus: "GUARDIAN_AND_PHOTOGRAPHER_CONSENT_REQUIRED",
    authorizationRequiredFrom: [
      "Legal Guardians of Identifiable Minors",
      "Photographer",
      "Academy Director",
    ],
    isYouthMinor: true,
    publicReady: false,
    stagingPreviewUrl:
      "/api/preview-media/restricted_pending_approval/youth/training-group-1280.webp",
    titleKey: "home.story.development.photoLabel",
    notes:
      "Training session photography containing identifiable minors. Requires signed guardian media consent before publication.",
  },
] as const;

export function getMediaAuthorizationScorecard(): AuthorizationScorecard {
  let brandOwnerApprovalRequiredCount = 0;
  let mascotArtworkApprovalRequiredCount = 0;
  let coachAndPhotographerReleaseRequiredCount = 0;
  let guardianAndPhotographerConsentRequiredCount = 0;
  let minorAssetsCount = 0;
  let verifiedCount = 0;
  let publicReadyCount = 0;

  for (const asset of STAGED_MEDIA_ASSETS) {
    if (asset.publicReady) {
      publicReadyCount += 1;
    }
    if (asset.isYouthMinor) {
      minorAssetsCount += 1;
    }

    switch (asset.rightsStatus) {
      case "VERIFIED":
        verifiedCount += 1;
        break;
      case "BRAND_OWNER_APPROVAL_REQUIRED":
        brandOwnerApprovalRequiredCount += 1;
        break;
      case "MASCOT_ARTWORK_APPROVAL_REQUIRED":
        mascotArtworkApprovalRequiredCount += 1;
        break;
      case "COACH_AND_PHOTOGRAPHER_RELEASE_REQUIRED":
        coachAndPhotographerReleaseRequiredCount += 1;
        break;
      case "GUARDIAN_AND_PHOTOGRAPHER_CONSENT_REQUIRED":
        guardianAndPhotographerConsentRequiredCount += 1;
        break;
    }
  }

  return {
    totalStaged: STAGED_MEDIA_ASSETS.length,
    verifiedCount,
    pendingApprovalCount: STAGED_MEDIA_ASSETS.length - verifiedCount,
    brandOwnerApprovalRequiredCount,
    mascotArtworkApprovalRequiredCount,
    coachAndPhotographerReleaseRequiredCount,
    guardianAndPhotographerConsentRequiredCount,
    minorAssetsCount,
    publicReadyCount,
  };
}

export function getStagedMediaAssets(): readonly StagedMediaAsset[] {
  return STAGED_MEDIA_ASSETS;
}

export function getStagedAssetsByCategory(
  category: MediaCategory,
): readonly StagedMediaAsset[] {
  return STAGED_MEDIA_ASSETS.filter((asset) => asset.category === category);
}
