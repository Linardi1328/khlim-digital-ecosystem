export type FeatureAvailabilityStatus = "AVAILABLE" | "COMING_SOON" | "HIDDEN";

export type V1FeatureKey =
  | "home"
  | "academy"
  | "academyTrainingSessions"
  | "academyRegistration"
  | "programmes"
  | "spotlight"
  | "registerInterest"
  | "about"
  | "contact"
  | "legal"
  | "accountAuth"
  | "academyEnrolmentCheckout"
  | "parentPortal"
  | "kheroPoints"
  | "internalMediaPreview"
  | "editorialDemoPreview";

export interface FeatureAvailabilityEntry {
  readonly key: V1FeatureKey;
  readonly routes: readonly string[];
  readonly status: FeatureAvailabilityStatus;
  readonly gateNote: string;
}

const enrolmentEnabled = process.env.NEXT_PUBLIC_ENABLE_V1_ENROLMENT === "1";
const portalEnabled = process.env.NEXT_PUBLIC_ENABLE_V1_PORTAL === "1";
const stagingMediaReviewEnabled =
  process.env.NEXT_PUBLIC_STAGING_MEDIA_REVIEW === "1";

export const V1_FEATURE_AVAILABILITY: Record<
  V1FeatureKey,
  FeatureAvailabilityEntry
> = {
  home: {
    key: "home",
    routes: ["/"],
    status: "AVAILABLE",
    gateNote: "Core public landing page",
  },
  academy: {
    key: "academy",
    routes: ["/academy"],
    status: "AVAILABLE",
    gateNote: "Core Academy overview, pathway, and coaches",
  },
  academyTrainingSessions: {
    key: "academyTrainingSessions",
    routes: ["/academy#training-sessions"],
    status: "AVAILABLE",
    gateNote:
      "Owner-approved venue, lead coach, age-group time slots, and proposed practice day",
  },
  academyRegistration: {
    key: "academyRegistration",
    routes: ["/academy/register"],
    status: "AVAILABLE",
    gateNote:
      "Academy Registration V1 customer flow; live openness is governed authoritatively by GET /v1/academy/registration-config",
  },
  programmes: {
    key: "programmes",
    routes: ["/programmes", "/programmes/[offeringId]"],
    status: "AVAILABLE",
    gateNote: "Public programme catalogue (informational + Register Interest)",
  },
  spotlight: {
    key: "spotlight",
    routes: ["/spotlight", "/spotlight/[slug]"],
    status: "AVAILABLE",
    gateNote: "Verified club achievements, gallery, and published spotlights",
  },
  registerInterest: {
    key: "registerInterest",
    routes: ["/interest"],
    status: "AVAILABLE",
    gateNote: "Active V1 lead capture funnel with campaign attribution",
  },
  about: {
    key: "about",
    routes: ["/about"],
    status: "AVAILABLE",
    gateNote: "Public club and ecosystem overview",
  },
  contact: {
    key: "contact",
    routes: ["/contact"],
    status: "AVAILABLE",
    gateNote: "Public contact and business disclosure page",
  },
  legal: {
    key: "legal",
    routes: ["/privacy", "/terms", "/cookies", "/refunds"],
    status: "AVAILABLE",
    gateNote: "Bilingual EN/BM legal and compliance disclosures",
  },
  accountAuth: {
    key: "accountAuth",
    routes: [
      "/auth/login",
      "/auth/register",
      "/auth/forgot-password",
      "/auth/reset-password",
    ],
    status: "AVAILABLE",
    gateNote: "Guardian account creation and sign-in",
  },
  academyEnrolmentCheckout: {
    key: "academyEnrolmentCheckout",
    routes: ["/enrol", "/enrol/confirmation"],
    status: enrolmentEnabled ? "AVAILABLE" : "COMING_SOON",
    gateNote:
      "Deferred online membership fee checkout (Billplz production gate); distinct from Academy Registration V1 (/academy/register)",
  },
  parentPortal: {
    key: "parentPortal",
    routes: [
      "/portal",
      "/portal/dashboard",
      "/portal/players",
      "/portal/membership",
      "/portal/payments",
      "/portal/schedule",
      "/portal/notifications",
      "/portal/account",
    ],
    status: portalEnabled ? "AVAILABLE" : "COMING_SOON",
    gateNote:
      "Deferred until live Academy registration and payment checkout gates pass",
  },
  kheroPoints: {
    key: "kheroPoints",
    routes: ["/#khero-points"],
    status: portalEnabled ? "AVAILABLE" : "COMING_SOON",
    gateNote: "KHero rewards dashboard deferred alongside Parent Portal",
  },
  internalMediaPreview: {
    key: "internalMediaPreview",
    routes: ["/preview/media"],
    status: stagingMediaReviewEnabled ? "AVAILABLE" : "HIDDEN",
    gateNote: "Internal staging review tool; hidden from public customers",
  },
  editorialDemoPreview: {
    key: "editorialDemoPreview",
    routes: ["/spotlight/editorial-preview-player-achievement"],
    status: "HIDDEN",
    gateNote: "Unfinished editorial demo template; hidden from customers",
  },
};

export function getFeatureStatus(key: V1FeatureKey): FeatureAvailabilityStatus {
  return V1_FEATURE_AVAILABILITY[key].status;
}

export function isFeatureAvailable(key: V1FeatureKey): boolean {
  return getFeatureStatus(key) === "AVAILABLE";
}
