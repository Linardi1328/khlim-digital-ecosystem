/**
 * Consent wording registry for Academy Registration V1 (RIC-191).
 *
 * IMPORTANT COMPLIANCE RULE:
 * - The backend API returns policy version, locale-specific references (`ref`),
 *   and SHA-256 hashes (`sha256`), NOT legal copy.
 * - NEVER invent legal wording or mark synthetic wording as approved.
 * - Approved owner wording must only be registered in `APPROVED_CONSENT_WORDING_REGISTRY`
 *   after KHLIM management formally approves EN / MS / ZH-Hans legal text.
 * - If an approved ref cannot be resolved for the active locale, the frontend MUST
 *   block registration submission and surface the integration dependency clearly.
 * - Synthetic fixtures below are strictly isolated to explicit local test hosts
 *   (`localhost` / `127.0.0.1` or `NODE_ENV === "test"`) AND `SYNTHETIC-*` policy versions
 *   with `synthetic://` refs, making accidental activation in staging/production impossible.
 */

import type {
  RegistrationConsentConfigDto,
  RegistrationConsentItemDto,
  RegistrationLocale,
} from "@khlim/api-client";

export interface RegisteredConsentWording {
  readonly ref: string;
  readonly sha256: string;
  readonly text: string;
}

export interface ResolvedConsentItem {
  readonly type: string;
  readonly required: boolean;
  readonly defaultChecked: false;
  readonly ref: string | null;
  readonly sha256: string | null;
  readonly text: string | null;
  readonly resolved: boolean;
  readonly isSyntheticFixture: boolean;
  readonly missingReason?:
    "MISSING_LOCALE_CONTENT" | "UNRESOLVED_REF" | "HASH_MISMATCH";
}

export interface ResolvedConsentPolicy {
  readonly policyVersion: string;
  readonly allResolved: boolean;
  readonly hasSyntheticFixtures: boolean;
  readonly items: ResolvedConsentItem[];
}

/**
 * Owner-approved localized legal wording registry.
 * Keyed by `${locale}:${ref}`.
 *
 * Intentionally empty until KHLIM management formally approves EN/MS/ZH-Hans
 * Academy Registration V1 consent wording.
 */
const APPROVED_CONSENT_WORDING_REGISTRY: Readonly<
  Record<string, RegisteredConsentWording>
> = Object.freeze({});

/**
 * Strictly isolated local/test synthetic fixture wording.
 * ONLY eligible on `localhost` / `127.0.0.1` (or `NODE_ENV === "test"`)
 * when `policyVersion` starts with `SYNTHETIC-` and `ref` starts with `synthetic://`.
 */
const SYNTHETIC_LOCAL_TEST_WORDING: Readonly<
  Record<string, RegisteredConsentWording>
> = Object.freeze({
  "en:synthetic://academy-registration/guardian-authority/v1": {
    ref: "synthetic://academy-registration/guardian-authority/v1",
    sha256: "1111111111111111111111111111111111111111111111111111111111111111",
    text: "[Synthetic Test Fixture — EN] I confirm I am the parent or legal guardian authorized to submit this Academy registration for the named minor.",
  },
  "ms:synthetic://academy-registration/guardian-authority/v1": {
    ref: "synthetic://academy-registration/guardian-authority/v1",
    sha256: "1111111111111111111111111111111111111111111111111111111111111112",
    text: "[Teks Ujian Sintetik — BM] Saya mengesahkan bahawa saya ialah ibu bapa atau penjaga sah yang diberi kuasa untuk menghantar pendaftaran Akademi ini bagi pemain di bawah umur tersebut.",
  },
  "zh-Hans:synthetic://academy-registration/guardian-authority/v1": {
    ref: "synthetic://academy-registration/guardian-authority/v1",
    sha256: "1111111111111111111111111111111111111111111111111111111111111113",
    text: "【本地测试文本 — 简体中文】本人确认是该未成年球员的家长或法定监护人，有权提交本次学院报名申请。",
  },
  "en:synthetic://academy-registration/registration-privacy/v1": {
    ref: "synthetic://academy-registration/registration-privacy/v1",
    sha256: "2222222222222222222222222222222222222222222222222222222222222221",
    text: "[Synthetic Test Fixture — EN] I consent to KHLIM processing the submitted player, guardian, and emergency contact details strictly to review and manage this Academy registration.",
  },
  "ms:synthetic://academy-registration/registration-privacy/v1": {
    ref: "synthetic://academy-registration/registration-privacy/v1",
    sha256: "2222222222222222222222222222222222222222222222222222222222222222",
    text: "[Teks Ujian Sintetik — BM] Saya bersetuju KHLIM memproses maklumat pemain, penjaga dan kenalan kecemasan yang dihantar khusus untuk menyemak dan mengurus pendaftaran Akademi ini.",
  },
  "zh-Hans:synthetic://academy-registration/registration-privacy/v1": {
    ref: "synthetic://academy-registration/registration-privacy/v1",
    sha256: "2222222222222222222222222222222222222222222222222222222222222223",
    text: "【本地测试文本 — 简体中文】本人同意 KHLIM 仅出于审核与管理本次学院报名的目的，处理所提交的球员、监护人及紧急联系人信息。",
  },
  "en:synthetic://academy-registration/marketing/v1": {
    ref: "synthetic://academy-registration/marketing/v1",
    sha256: "3333333333333333333333333333333333333333333333333333333333333331",
    text: "[Synthetic Test Fixture — EN] Optional: I agree to receive KHLIM Academy programme announcements, camps, and club updates.",
  },
  "ms:synthetic://academy-registration/marketing/v1": {
    ref: "synthetic://academy-registration/marketing/v1",
    sha256: "3333333333333333333333333333333333333333333333333333333333333332",
    text: "[Teks Ujian Sintetik — BM] Pilihan: Saya bersetuju untuk menerima pengumuman program Akademi KHLIM, kem latihan dan kemas kini kelab.",
  },
  "zh-Hans:synthetic://academy-registration/marketing/v1": {
    ref: "synthetic://academy-registration/marketing/v1",
    sha256: "3333333333333333333333333333333333333333333333333333333333333333",
    text: "【本地测试文本 — 简体中文】可选：本人同意接收 KHLIM 学院课程通知、训练营及俱乐部最新资讯。",
  },
  "en:synthetic://academy-registration/photography/v1": {
    ref: "synthetic://academy-registration/photography/v1",
    sha256: "4444444444444444444444444444444444444444444444444444444444444441",
    text: "[Synthetic Test Fixture — EN] Optional: I consent to KHLIM capturing and sharing training session photographs or videos featuring my child on official KHLIM channels.",
  },
  "ms:synthetic://academy-registration/photography/v1": {
    ref: "synthetic://academy-registration/photography/v1",
    sha256: "4444444444444444444444444444444444444444444444444444444444444442",
    text: "[Teks Ujian Sintetik — BM] Pilihan: Saya bersetuju KHLIM merakam dan berkongsi gambar atau video sesi latihan yang memaparkan anak saya di saluran rasmi KHLIM.",
  },
  "zh-Hans:synthetic://academy-registration/photography/v1": {
    ref: "synthetic://academy-registration/photography/v1",
    sha256: "4444444444444444444444444444444444444444444444444444444444444443",
    text: "【本地测试文本 — 简体中文】可选：本人同意 KHLIM 拍摄并在 KHLIM 官方渠道分享包含我孩子的训练照片或视频。",
  },
  // Version 2 synthetic fixtures for testing CONSENT_VERSION_MISMATCH refresh
  "en:synthetic://academy-registration/guardian-authority/v2": {
    ref: "synthetic://academy-registration/guardian-authority/v2",
    sha256: "5555555555555555555555555555555555555555555555555555555555555551",
    text: "[Synthetic Test Fixture v2 — EN] Updated wording: I confirm I am the parent or legal guardian authorized to submit this Academy registration.",
  },
  "ms:synthetic://academy-registration/guardian-authority/v2": {
    ref: "synthetic://academy-registration/guardian-authority/v2",
    sha256: "5555555555555555555555555555555555555555555555555555555555555552",
    text: "[Teks Ujian Sintetik v2 — BM] Teks dikemas kini: Saya mengesahkan saya ialah ibu bapa atau penjaga sah yang diberi kuasa untuk menghantar pendaftaran Akademi ini.",
  },
  "zh-Hans:synthetic://academy-registration/guardian-authority/v2": {
    ref: "synthetic://academy-registration/guardian-authority/v2",
    sha256: "5555555555555555555555555555555555555555555555555555555555555553",
    text: "【本地测试文本 v2 — 简体中文】更新条款：本人确认是该未成年球员的家长或法定监护人，有权提交本次学院报名。",
  },
  "en:synthetic://academy-registration/registration-privacy/v2": {
    ref: "synthetic://academy-registration/registration-privacy/v2",
    sha256: "6666666666666666666666666666666666666666666666666666666666666661",
    text: "[Synthetic Test Fixture v2 — EN] Updated wording: I consent to KHLIM processing the submitted details strictly to review this Academy registration.",
  },
  "ms:synthetic://academy-registration/registration-privacy/v2": {
    ref: "synthetic://academy-registration/registration-privacy/v2",
    sha256: "6666666666666666666666666666666666666666666666666666666666666662",
    text: "[Teks Ujian Sintetik v2 — BM] Teks dikemas kini: Saya bersetuju KHLIM memproses maklumat yang dihantar khusus untuk menyemak pendaftaran Akademi ini.",
  },
  "zh-Hans:synthetic://academy-registration/registration-privacy/v2": {
    ref: "synthetic://academy-registration/registration-privacy/v2",
    sha256: "6666666666666666666666666666666666666666666666666666666666666663",
    text: "【本地测试文本 v2 — 简体中文】更新条款：本人同意 KHLIM 仅出于审核本次学院报名的目的处理所提交的信息。",
  },
  "en:synthetic://academy-registration/marketing/v2": {
    ref: "synthetic://academy-registration/marketing/v2",
    sha256: "7777777777777777777777777777777777777777777777777777777777777771",
    text: "[Synthetic Test Fixture v2 — EN] Optional: I agree to receive KHLIM Academy programme announcements and updates.",
  },
  "ms:synthetic://academy-registration/marketing/v2": {
    ref: "synthetic://academy-registration/marketing/v2",
    sha256: "7777777777777777777777777777777777777777777777777777777777777772",
    text: "[Teks Ujian Sintetik v2 — BM] Pilihan: Saya bersetuju untuk menerima pengumuman program dan kemas kini Akademi KHLIM.",
  },
  "zh-Hans:synthetic://academy-registration/marketing/v2": {
    ref: "synthetic://academy-registration/marketing/v2",
    sha256: "7777777777777777777777777777777777777777777777777777777777777773",
    text: "【本地测试文本 v2 — 简体中文】可选：本人同意接收 KHLIM 学院课程通知及最新资讯。",
  },
  "en:synthetic://academy-registration/photography/v2": {
    ref: "synthetic://academy-registration/photography/v2",
    sha256: "8888888888888888888888888888888888888888888888888888888888888881",
    text: "[Synthetic Test Fixture v2 — EN] Optional: I consent to KHLIM sharing training photographs featuring my child on official channels.",
  },
  "ms:synthetic://academy-registration/photography/v2": {
    ref: "synthetic://academy-registration/photography/v2",
    sha256: "8888888888888888888888888888888888888888888888888888888888888882",
    text: "[Teks Ujian Sintetik v2 — BM] Pilihan: Saya bersetuju KHLIM berkongsi gambar latihan yang memaparkan anak saya di saluran rasmi.",
  },
  "zh-Hans:synthetic://academy-registration/photography/v2": {
    ref: "synthetic://academy-registration/photography/v2",
    sha256: "8888888888888888888888888888888888888888888888888888888888888883",
    text: "【本地测试文本 v2 — 简体中文】可选：本人同意 KHLIM 在官方渠道分享包含我孩子的训练照片。",
  },
});

export function isSyntheticConsentEnvironmentAllowed(
  hostnameOverride?: string,
): boolean {
  if (typeof hostnameOverride === "string") {
    return hostnameOverride === "localhost" || hostnameOverride === "127.0.0.1";
  }
  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }
  return process.env.NODE_ENV === "test";
}

function extractLocaleContentEntry(
  item: RegistrationConsentItemDto,
  locale: RegistrationLocale,
): { ref: string; sha256: string } | null {
  if (!item.content || typeof item.content !== "object") return null;
  const entry = item.content[locale];
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Record<string, unknown>;
  if (
    typeof candidate.ref !== "string" ||
    !candidate.ref.trim() ||
    typeof candidate.sha256 !== "string" ||
    !candidate.sha256.trim()
  ) {
    return null;
  }
  return {
    ref: candidate.ref.trim(),
    sha256: candidate.sha256.trim(),
  };
}

export function resolveConsentPolicyForLocale(
  consent: RegistrationConsentConfigDto | null,
  locale: RegistrationLocale,
  options?: { hostnameOverride?: string },
): ResolvedConsentPolicy | null {
  if (!consent || !Array.isArray(consent.items) || consent.items.length === 0) {
    return null;
  }

  const allowSynthetic =
    consent.policyVersion.startsWith("SYNTHETIC-") &&
    isSyntheticConsentEnvironmentAllowed(options?.hostnameOverride);

  const items: ResolvedConsentItem[] = consent.items.map((item) => {
    const entry = extractLocaleContentEntry(item, locale);
    if (!entry) {
      return {
        type: item.type,
        required: Boolean(item.required),
        defaultChecked: false,
        ref: null,
        sha256: null,
        text: null,
        resolved: false,
        isSyntheticFixture: false,
        missingReason: "MISSING_LOCALE_CONTENT",
      };
    }

    const key = `${locale}:${entry.ref}`;
    const approved = APPROVED_CONSENT_WORDING_REGISTRY[key];
    if (approved) {
      if (approved.sha256.toLowerCase() !== entry.sha256.toLowerCase()) {
        return {
          type: item.type,
          required: Boolean(item.required),
          defaultChecked: false,
          ref: entry.ref,
          sha256: entry.sha256,
          text: null,
          resolved: false,
          isSyntheticFixture: false,
          missingReason: "HASH_MISMATCH",
        };
      }
      return {
        type: item.type,
        required: Boolean(item.required),
        defaultChecked: false,
        ref: entry.ref,
        sha256: entry.sha256,
        text: approved.text,
        resolved: true,
        isSyntheticFixture: false,
      };
    }

    if (allowSynthetic && entry.ref.startsWith("synthetic://")) {
      const synthetic = SYNTHETIC_LOCAL_TEST_WORDING[key];
      if (synthetic) {
        if (synthetic.sha256.toLowerCase() !== entry.sha256.toLowerCase()) {
          return {
            type: item.type,
            required: Boolean(item.required),
            defaultChecked: false,
            ref: entry.ref,
            sha256: entry.sha256,
            text: null,
            resolved: false,
            isSyntheticFixture: true,
            missingReason: "HASH_MISMATCH",
          };
        }
        return {
          type: item.type,
          required: Boolean(item.required),
          defaultChecked: false,
          ref: entry.ref,
          sha256: entry.sha256,
          text: synthetic.text,
          resolved: true,
          isSyntheticFixture: true,
        };
      }
    }

    return {
      type: item.type,
      required: Boolean(item.required),
      defaultChecked: false,
      ref: entry.ref,
      sha256: entry.sha256,
      text: null,
      resolved: false,
      isSyntheticFixture: false,
      missingReason: "UNRESOLVED_REF",
    };
  });

  return {
    policyVersion: consent.policyVersion,
    allResolved: items.length > 0 && items.every((item) => item.resolved),
    hasSyntheticFixtures: items.some((item) => item.isSyntheticFixture),
    items,
  };
}
