"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  isFeatureNotAvailableError,
  parseRegistrationErrorBody,
  type CreateRegistrationRequestDto,
  type PublicRegistrationSessionDto,
  type RegistrationConfigDto,
  type RegistrationErrorFieldDto,
  type RegistrationReceiptDto,
} from "@khlim/api-client";
import { ApiError, apiService } from "../../lib/api-service";
import { resolveConsentPolicyForLocale } from "../../lib/academy-consent-registry";
import {
  computeAgeAtReferenceDate,
  fingerprintRegistrationPayload,
  formatDateOnlyForLocale,
  formatMytTimestampForLocale,
  formatSessionTimeRange,
  generateRegistrationIdempotencyKey,
  getMalaysiaTodayDateOnly,
  isDateOnlyInFuture,
  isValidDateOnly,
  isValidRegistrationPhone,
  isValidRegistrationReceipt,
  resolveSessionAgeReferenceDate,
  toRegistrationLocale,
} from "../../lib/academy-registration-utils";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
  resolveCampaignSource,
  sanitizeCampaignToken,
} from "../../lib/campaign-source";
import { useI18n } from "../../lib/i18n-context";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button, getButtonStyles } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { StepIndicator } from "../ui/step-indicator";

interface RegistrationFormValues {
  sessionId: string;
  playerFullName: string;
  playerDateOfBirth: string;
  playerGender: string;
  playerJerseySize: string;
  playerPhone: string;
  guardianFullName: string;
  guardianPhone: string;
  guardianRelationship: string;
  emergencyFullName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  authorityConfirmed: boolean;
  registrationPrivacy: boolean;
  marketing: boolean;
  photography: boolean;
}

const INITIAL_FORM_VALUES: RegistrationFormValues = {
  sessionId: "",
  playerFullName: "",
  playerDateOfBirth: "",
  playerGender: "",
  playerJerseySize: "",
  playerPhone: "",
  guardianFullName: "",
  guardianPhone: "",
  guardianRelationship: "",
  emergencyFullName: "",
  emergencyPhone: "",
  emergencyRelationship: "",
  authorityConfirmed: false,
  registrationPrivacy: false,
  marketing: false,
  photography: false,
};

interface PendingSubmissionAttempt {
  key: string;
  fingerprint: string;
  payload: CreateRegistrationRequestDto;
  ambiguous: boolean;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "deferred" }
  | { kind: "closed"; config: RegistrationConfigDto }
  | { kind: "empty"; config: RegistrationConfigDto }
  | {
      kind: "ready";
      config: RegistrationConfigDto;
      sessions: PublicRegistrationSessionDto[];
    };

const STEP1_FIELD_KEYS = [
  "sessionId",
  "player.fullName",
  "player.dateOfBirth",
  "player.gender",
  "player.jerseySize",
  "player.phone",
] as const;

const STEP2_FIELD_KEYS = [
  "guardian.fullName",
  "guardian.phone",
  "guardian.relationship",
  "emergencyContact.fullName",
  "emergencyContact.phone",
  "emergencyContact.relationship",
] as const;

const STEP3_FIELD_KEYS = [
  "guardian.authorityConfirmed",
  "consents.registrationPrivacy",
  "consents.marketing",
  "consents.photography",
] as const;

function stepForField(field: string): 1 | 2 | 3 {
  if ((STEP1_FIELD_KEYS as readonly string[]).includes(field)) return 1;
  if ((STEP2_FIELD_KEYS as readonly string[]).includes(field)) return 2;
  return 3;
}

export function AcademyRegistrationFlow() {
  const { t, locale } = useI18n();
  const registrationLocale = toRegistrationLocale(locale);
  const searchParams = useSearchParams();

  const querySessionId = searchParams?.get("sessionId") ?? "";
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const [storedCampaign, setStoredCampaign] = useState<string | null>(null);

  useEffect(() => {
    setStoredCampaign(resolveCampaignSource(searchParams));
  }, [searchParams]);

  const campaignSource = sanitizeCampaignToken(queryCampaign ?? storedCampaign);

  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<RegistrationFormValues>(INITIAL_FORM_VALUES);
  const [stalePreselectedSession, setStalePreselectedSession] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingLockRef = useRef(false);

  const [pendingAttempt, setPendingAttempt] =
    useState<PendingSubmissionAttempt | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  const [receipt, setReceipt] = useState<RegistrationReceiptDto | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">(
    "idle",
  );
  const copyTimerRef = useRef<number | null>(null);
  const copyOpSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const loadSequence = useRef(0);
  const fullLoadInFlightRef = useRef(false);
  const loadStateKindRef = useRef<LoadState["kind"]>("loading");
  loadStateKindRef.current = loadState.kind;
  const configRefreshSeq = useRef(0);
  const sessionRefreshSeq = useRef(0);
  const loadedPolicyVersion = useRef<string | null | undefined>(undefined);
  const [acceptedConsentKey, setAcceptedConsentKey] = useState<string | null>(
    null,
  );
  const [rejectedConsentVersion, setRejectedConsentVersion] = useState<
    string | null
  >(null);
  const [configRefreshing, setConfigRefreshing] = useState(false);
  const [sessionRefreshing, setSessionRefreshing] = useState(false);
  const [sessionRefreshRequired, setSessionRefreshRequired] = useState(false);
  const [policyChangedNotice, setPolicyChangedNotice] = useState(false);

  const resetConsent = useCallback(() => {
    setAcceptedConsentKey(null);
    setForm((prev) => ({
      ...prev,
      authorityConfirmed: false,
      registrationPrivacy: false,
      marketing: false,
      photography: false,
    }));
  }, []);

  const trackPolicyVersion = useCallback(
    (config: RegistrationConfigDto) => {
      const version = config.consent?.policyVersion ?? null;
      if (
        loadedPolicyVersion.current !== undefined &&
        loadedPolicyVersion.current !== version
      ) {
        resetConsent();
        setPolicyChangedNotice(true);
      }
      loadedPolicyVersion.current = version;
    },
    [resetConsent],
  );

  // Track locale changes so consent checkboxes are NEVER silently preserved across different wording
  const previousLocaleRef = useRef(registrationLocale);
  useEffect(() => {
    if (previousLocaleRef.current !== registrationLocale) {
      previousLocaleRef.current = registrationLocale;
      setAcceptedConsentKey(null);
      const hadAnyConsentChecked =
        form.authorityConfirmed ||
        form.registrationPrivacy ||
        form.marketing ||
        form.photography;
      if (hadAnyConsentChecked || step === 3) {
        setForm((prev) => ({
          ...prev,
          authorityConfirmed: false,
          registrationPrivacy: false,
          marketing: false,
          photography: false,
        }));
        setNoticeBanner(t("academyReg.step3.localeResetNotice"));
      }
    }
  }, [
    registrationLocale,
    form.authorityConfirmed,
    form.registrationPrivacy,
    form.marketing,
    form.photography,
    step,
    t,
  ]);

  // Countdown timer for Retry-After on 429 / 503
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setRetryCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryCountdown]);

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const setFieldRef = (key: string) => (el: HTMLElement | null) => {
    fieldRefs.current[key] = el;
  };

  const focusField = useCallback((fieldKey: string) => {
    window.setTimeout(() => {
      const target = fieldRefs.current[fieldKey];
      if (target && typeof target.focus === "function") {
        target.focus();
      }
    }, 40);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      copyOpSeqRef.current += 1;
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

  const loadConfigAndSessions = useCallback(async () => {
    const sequence = ++loadSequence.current;
    configRefreshSeq.current += 1;
    sessionRefreshSeq.current += 1;
    fullLoadInFlightRef.current = true;
    setLoadState({ kind: "loading" });
    setBannerError(null);
    setConfigRefreshing(false);
    setSessionRefreshing(false);
    try {
      const [config, sessionsResponse] = await Promise.all([
        apiService.getAcademyRegistrationConfig(),
        apiService.listPublicAcademySessions(),
      ]);
      if (sequence !== loadSequence.current) return;
      fullLoadInFlightRef.current = false;
      trackPolicyVersion(config);
      setSessionRefreshRequired(false);

      if (!config.registrationOpen || !sessionsResponse.registrationOpen) {
        setLoadState({ kind: "closed", config });
        return;
      }
      if (!sessionsResponse.items || sessionsResponse.items.length === 0) {
        setLoadState({ kind: "empty", config });
        return;
      }
      const sessions = sessionsResponse.items;
      setLoadState({ kind: "ready", config, sessions });
      const preselected = sessions.find((item) => item.id === querySessionId);
      setStalePreselectedSession(Boolean(querySessionId && !preselected));
      setForm((prev) => ({
        ...prev,
        sessionId:
          prev.sessionId && sessions.some((item) => item.id === prev.sessionId)
            ? prev.sessionId
            : (preselected?.id ?? ""),
      }));
    } catch (error) {
      if (sequence !== loadSequence.current) return;
      fullLoadInFlightRef.current = false;
      setLoadState(
        isFeatureNotAvailableError(error)
          ? { kind: "deferred" }
          : { kind: "error" },
      );
    }
  }, [querySessionId, trackPolicyVersion]);

  useEffect(() => {
    void loadConfigAndSessions();
    return () => {
      ++loadSequence.current;
      ++configRefreshSeq.current;
      ++sessionRefreshSeq.current;
      fullLoadInFlightRef.current = false;
    };
  }, [loadConfigAndSessions]);

  const refreshConsentConfig = async (options?: { clearBanner?: boolean }) => {
    if (fullLoadInFlightRef.current || loadStateKindRef.current !== "ready") {
      await loadConfigAndSessions();
      return;
    }
    const fullSeq = loadSequence.current;
    const refreshSeq = ++configRefreshSeq.current;
    setConfigRefreshing(true);
    if (options?.clearBanner) {
      setBannerError(null);
    }
    try {
      const config = await apiService.getAcademyRegistrationConfig();
      if (
        fullSeq !== loadSequence.current ||
        refreshSeq !== configRefreshSeq.current
      ) {
        return;
      }
      trackPolicyVersion(config);
      setLoadState((prev) =>
        !config.registrationOpen
          ? { kind: "closed", config }
          : prev.kind === "ready"
            ? { ...prev, config }
            : prev,
      );
    } catch (error) {
      if (
        fullSeq !== loadSequence.current ||
        refreshSeq !== configRefreshSeq.current
      ) {
        return;
      }
      if (isFeatureNotAvailableError(error)) {
        setLoadState({ kind: "deferred" });
      } else {
        setBannerError(t("academyReg.sessions.errorBody"));
      }
    } finally {
      if (
        fullSeq === loadSequence.current &&
        refreshSeq === configRefreshSeq.current
      ) {
        setConfigRefreshing(false);
      }
    }
  };

  const refreshUnavailableSessions = async (options?: {
    clearBanner?: boolean;
  }) => {
    if (fullLoadInFlightRef.current || loadStateKindRef.current !== "ready") {
      await loadConfigAndSessions();
      return;
    }
    const fullSeq = loadSequence.current;
    const refreshSeq = ++sessionRefreshSeq.current;
    setSessionRefreshing(true);
    setSessionRefreshRequired(true);
    if (options?.clearBanner) {
      setBannerError(null);
    }
    try {
      const refreshed = await apiService.listPublicAcademySessions();
      if (
        fullSeq !== loadSequence.current ||
        refreshSeq !== sessionRefreshSeq.current
      ) {
        return;
      }
      setLoadState((prev) => {
        if (prev.kind !== "ready") return prev;
        if (!refreshed.registrationOpen) {
          return {
            kind: "closed",
            config: { ...prev.config, registrationOpen: false },
          };
        }
        if (refreshed.items.length === 0)
          return { kind: "empty", config: prev.config };
        return { ...prev, sessions: refreshed.items };
      });
      const preselected = refreshed.items.find(
        (item) => item.id === querySessionId,
      );
      setStalePreselectedSession(Boolean(querySessionId && !preselected));
      setForm((prev) => ({
        ...prev,
        sessionId:
          refreshed.registrationOpen &&
          refreshed.items.some((item) => item.id === prev.sessionId)
            ? prev.sessionId
            : refreshed.registrationOpen
              ? (preselected?.id ?? "")
              : "",
      }));
      setSessionRefreshRequired(false);
    } catch (error) {
      if (
        fullSeq !== loadSequence.current ||
        refreshSeq !== sessionRefreshSeq.current
      ) {
        return;
      }
      if (isFeatureNotAvailableError(error)) {
        setLoadState({ kind: "deferred" });
      } else {
        setBannerError(t("academyReg.sessions.errorBody"));
      }
    } finally {
      if (
        fullSeq === loadSequence.current &&
        refreshSeq === sessionRefreshSeq.current
      ) {
        setSessionRefreshing(false);
      }
    }
  };

  const selectedSession = useMemo(() => {
    if (loadState.kind !== "ready") return null;
    return (
      loadState.sessions.find((item) => item.id === form.sessionId) ?? null
    );
  }, [loadState, form.sessionId]);

  const resolvedConsent = useMemo(() => {
    if (
      loadState.kind !== "ready" ||
      !loadState.config.consent ||
      loadState.config.consent.policyVersion === rejectedConsentVersion
    )
      return null;
    return resolveConsentPolicyForLocale(
      loadState.config.consent,
      registrationLocale,
    );
  }, [loadState, registrationLocale, rejectedConsentVersion]);

  const consentContextKey = resolvedConsent?.allResolved
    ? JSON.stringify([resolvedConsent.policyVersion, registrationLocale])
    : null;
  const hasCurrentConsent = Boolean(
    consentContextKey &&
    acceptedConsentKey === consentContextKey &&
    form.authorityConfirmed &&
    form.registrationPrivacy,
  );
  const canRetryOriginal = Boolean(
    pendingAttempt &&
    hasCurrentConsent &&
    resolvedConsent &&
    pendingAttempt.payload.consentVersion === resolvedConsent.policyVersion &&
    pendingAttempt.payload.locale === registrationLocale &&
    pendingAttempt.payload.guardian.authorityConfirmed ===
      form.authorityConfirmed &&
    pendingAttempt.payload.consents.registrationPrivacy ===
      form.registrationPrivacy &&
    pendingAttempt.payload.consents.marketing === form.marketing &&
    pendingAttempt.payload.consents.photography === form.photography,
  );

  const todayMyt = useMemo(() => getMalaysiaTodayDateOnly(), []);

  // Client-side age guidance strictly following the selected session's declared eligibility rule.
  // Never submitted to the server; server remains authoritative.
  const ageGuidance = useMemo(() => {
    if (!selectedSession || !isValidDateOnly(form.playerDateOfBirth)) {
      return null;
    }
    if (isDateOnlyInFuture(form.playerDateOfBirth, todayMyt)) {
      return null;
    }
    const refDate = resolveSessionAgeReferenceDate(selectedSession, todayMyt);
    if (!refDate) return null;
    const computedAge = computeAgeAtReferenceDate(
      form.playerDateOfBirth,
      refDate,
    );
    if (computedAge === null || computedAge < 0) return null;
    const minAge = selectedSession.minAge;
    const maxAge = selectedSession.maxAge;
    if (minAge === null || maxAge === null) return null;

    const withinRange = computedAge >= minAge && computedAge <= maxAge;
    return {
      age: computedAge,
      minAge,
      maxAge,
      withinRange,
    };
  }, [selectedSession, form.playerDateOfBirth, todayMyt]);

  const translateOption = (
    group: "gender" | "jerseySize" | "relationship",
    code: string,
  ): string => {
    const key = `academyReg.option.${group}.${code}`;
    const translated = t(key);
    return translated === key ? code : translated;
  };

  const translateFieldCode = (code: string): string => {
    const key = `academyReg.fieldError.${code}`;
    const translated = t(key);
    return translated === key
      ? t("academyReg.fieldError.INVALID_VALUE")
      : translated;
  };

  const updateField = <K extends keyof RegistrationFormValues>(
    field: K,
    value: RegistrationFormValues[K],
    errorKey?: string,
  ) => {
    if (submittingLockRef.current) return;
    if (typeof value === "boolean") setAcceptedConsentKey(consentContextKey);
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errorKey) {
      setFieldErrors((prev) => {
        if (!prev[errorKey]) return prev;
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const buildRequestPayload =
    useCallback((): CreateRegistrationRequestDto | null => {
      if (loadState.kind !== "ready" || !loadState.config.consent) return null;
      const payload: CreateRegistrationRequestDto = {
        sessionId: form.sessionId,
        locale: registrationLocale,
        consentVersion: loadState.config.consent.policyVersion,
        player: {
          fullName: form.playerFullName.trim(),
          dateOfBirth: form.playerDateOfBirth.trim(),
          gender: form.playerGender,
          jerseySize: form.playerJerseySize,
          phone: form.playerPhone.trim() ? form.playerPhone.trim() : null,
        },
        guardian: {
          fullName: form.guardianFullName.trim(),
          phone: form.guardianPhone.trim(),
          relationship: form.guardianRelationship,
          authorityConfirmed: form.authorityConfirmed,
        },
        emergencyContact: {
          fullName: form.emergencyFullName.trim(),
          phone: form.emergencyPhone.trim(),
          relationship: form.emergencyRelationship,
        },
        consents: {
          registrationPrivacy: form.registrationPrivacy,
          marketing: form.marketing,
          photography: form.photography,
        },
      };

      if (campaignSource) {
        payload.source = campaignSource;
      }
      return payload;
    }, [loadState, form, registrationLocale, campaignSource]);

  const currentFingerprint = useMemo(() => {
    const payload = buildRequestPayload();
    return payload ? fingerprintRegistrationPayload(payload) : null;
  }, [buildRequestPayload]);

  const editedAfterAmbiguousAttempt = Boolean(
    pendingAttempt?.ambiguous &&
    currentFingerprint &&
    pendingAttempt.fingerprint !== currentFingerprint,
  );

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!selectedSession || sessionRefreshRequired || sessionRefreshing) {
      errors.sessionId = t("academyReg.step1.sessionRequired");
    }
    if (!form.playerFullName.trim()) {
      errors["player.fullName"] = t("academyReg.fieldError.REQUIRED");
    }
    if (!form.playerDateOfBirth.trim()) {
      errors["player.dateOfBirth"] = t("academyReg.fieldError.REQUIRED");
    } else if (!isValidDateOnly(form.playerDateOfBirth)) {
      errors["player.dateOfBirth"] = t("academyReg.fieldError.INVALID_DATE");
    } else if (isDateOnlyInFuture(form.playerDateOfBirth, todayMyt)) {
      errors["player.dateOfBirth"] = t("academyReg.fieldError.DATE_IN_FUTURE");
    }
    if (!form.playerGender) {
      errors["player.gender"] = t("academyReg.fieldError.REQUIRED");
    }
    if (!form.playerJerseySize) {
      errors["player.jerseySize"] = t("academyReg.fieldError.REQUIRED");
    }
    if (
      form.playerPhone.trim() &&
      !isValidRegistrationPhone(form.playerPhone)
    ) {
      errors["player.phone"] = t("academyReg.fieldError.INVALID_PHONE");
    }

    setFieldErrors(errors);
    const firstKey = STEP1_FIELD_KEYS.find((k) => Boolean(errors[k]));
    if (firstKey) {
      focusField(firstKey);
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.guardianFullName.trim()) {
      errors["guardian.fullName"] = t("academyReg.fieldError.REQUIRED");
    }
    if (!form.guardianPhone.trim()) {
      errors["guardian.phone"] = t("academyReg.fieldError.REQUIRED");
    } else if (!isValidRegistrationPhone(form.guardianPhone)) {
      errors["guardian.phone"] = t("academyReg.fieldError.INVALID_PHONE");
    }
    if (!form.guardianRelationship) {
      errors["guardian.relationship"] = t("academyReg.fieldError.REQUIRED");
    }
    if (!form.emergencyFullName.trim()) {
      errors["emergencyContact.fullName"] = t("academyReg.fieldError.REQUIRED");
    }
    if (!form.emergencyPhone.trim()) {
      errors["emergencyContact.phone"] = t("academyReg.fieldError.REQUIRED");
    } else if (!isValidRegistrationPhone(form.emergencyPhone)) {
      errors["emergencyContact.phone"] = t(
        "academyReg.fieldError.INVALID_PHONE",
      );
    }
    if (!form.emergencyRelationship) {
      errors["emergencyContact.relationship"] = t(
        "academyReg.fieldError.REQUIRED",
      );
    }

    setFieldErrors(errors);
    const firstKey = STEP2_FIELD_KEYS.find((k) => Boolean(errors[k]));
    if (firstKey) {
      focusField(firstKey);
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
    if (
      !form.authorityConfirmed ||
      acceptedConsentKey !== consentContextKey ||
      !consentContextKey
    ) {
      errors["guardian.authorityConfirmed"] = t(
        "academyReg.fieldError.MUST_BE_TRUE",
      );
    }
    if (!form.registrationPrivacy) {
      errors["consents.registrationPrivacy"] = t(
        "academyReg.fieldError.MUST_BE_TRUE",
      );
    }
    setFieldErrors(errors);
    const firstKey = STEP3_FIELD_KEYS.find((k) => Boolean(errors[k]));
    if (firstKey) {
      focusField(firstKey);
      return false;
    }
    return true;
  };

  const applyServerFieldErrors = (
    serverErrors: RegistrationErrorFieldDto[],
  ) => {
    const mapped: Record<string, string> = {};
    let earliestStep: 1 | 2 | 3 = 3;
    let firstErrorField: string | null = null;

    for (const item of serverErrors) {
      mapped[item.field] = translateFieldCode(item.code);
      const targetStep = stepForField(item.field);
      if (targetStep < earliestStep) {
        earliestStep = targetStep;
        firstErrorField = item.field;
      } else if (targetStep === earliestStep && !firstErrorField) {
        firstErrorField = item.field;
      }
    }

    setFieldErrors(mapped);
    setStep(earliestStep);
    if (firstErrorField) {
      focusField(firstErrorField);
    }
  };

  const executeSubmission = async (
    payload: CreateRegistrationRequestDto,
    idempotencyKey: string,
    fingerprint: string,
  ) => {
    if (submittingLockRef.current) return;
    submittingLockRef.current = true;
    setSubmitting(true);
    setBannerError(null);
    setNoticeBanner(null);
    setPolicyChangedNotice(false);

    try {
      const response = await apiService.submitAcademyRegistration(
        payload,
        idempotencyKey,
      );

      if (!isValidRegistrationReceipt(response)) {
        setPendingAttempt({
          key: idempotencyKey,
          fingerprint,
          payload,
          ambiguous: true,
        });
        setBannerError(t("academyReg.error.GENERIC"));
        return;
      }

      // Clear sensitive in-memory form data immediately after valid receipt
      setForm(INITIAL_FORM_VALUES);
      setPendingAttempt(null);
      setFieldErrors({});
      setRetryCountdown(0);
      setReceipt(response);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        const envelope = parseRegistrationErrorBody(error.responseBody);
        const code = envelope?.code ?? "";
        const retrySeconds =
          error.retryAfterSeconds ?? envelope?.retryAfter ?? 0;

        if (code === "VALIDATION_FAILED") {
          setPendingAttempt(null);
          if (envelope?.fieldErrors && envelope.fieldErrors.length > 0) {
            applyServerFieldErrors(envelope.fieldErrors);
          }
          setBannerError(t("academyReg.error.VALIDATION_FAILED"));
          return;
        }

        if (code === "CONSENT_VERSION_MISMATCH") {
          setPendingAttempt(null);
          setRejectedConsentVersion(payload.consentVersion);
          resetConsent();
          setBannerError(t("academyReg.error.CONSENT_VERSION_MISMATCH"));
          await refreshConsentConfig();
          return;
        }

        if (code === "SESSION_FULL" || code === "SESSION_NOT_AVAILABLE") {
          setPendingAttempt(null);
          setBannerError(t(`academyReg.error.${code}`));
          setForm((prev) => ({ ...prev, sessionId: "" }));
          setStep(1);
          await refreshUnavailableSessions();
          focusField("sessionId");
          return;
        }

        if (code === "REGISTRATION_CLOSED") {
          setPendingAttempt(null);
          setBannerError(t("academyReg.error.REGISTRATION_CLOSED"));
          setLoadState((prev) =>
            prev.kind === "ready"
              ? {
                  kind: "closed",
                  config: { ...prev.config, registrationOpen: false },
                }
              : prev,
          );
          return;
        }

        if (code === "PLAYER_AGE_INELIGIBLE") {
          setPendingAttempt(null);
          const minAge = envelope?.details?.minAge;
          const maxAge = envelope?.details?.maxAge;
          const msg =
            typeof minAge === "number" && typeof maxAge === "number"
              ? t("academyReg.error.PLAYER_AGE_INELIGIBLE_RANGE", {
                  min: minAge,
                  max: maxAge,
                })
              : t("academyReg.error.PLAYER_AGE_INELIGIBLE");
          setBannerError(msg);
          setFieldErrors({ "player.dateOfBirth": msg });
          setStep(1);
          focusField("player.dateOfBirth");
          return;
        }

        if (code === "IDEMPOTENCY_KEY_CONFLICT") {
          setPendingAttempt({
            key: idempotencyKey,
            fingerprint,
            payload,
            ambiguous: true,
          });
          setBannerError(t("academyReg.error.IDEMPOTENCY_KEY_CONFLICT"));
          return;
        }

        if (
          code === "RATE_LIMITED" ||
          error.status === 429 ||
          code === "SERVICE_TEMPORARILY_UNAVAILABLE" ||
          code === "REGISTRATION_PERSISTENCE_FAILED" ||
          error.status === 503
        ) {
          // Preserve key + payload for identical idempotent retry
          setPendingAttempt({
            key: idempotencyKey,
            fingerprint,
            payload,
            ambiguous:
              error.status === 503 &&
              code !== "REGISTRATION_PERSISTENCE_FAILED",
          });
          if (retrySeconds > 0) {
            setRetryCountdown(Math.ceil(retrySeconds));
          }
          const errorKey =
            code &&
            [
              "RATE_LIMITED",
              "SERVICE_TEMPORARILY_UNAVAILABLE",
              "REGISTRATION_PERSISTENCE_FAILED",
            ].includes(code)
              ? `academyReg.error.${code}`
              : error.status === 429
                ? "academyReg.error.RATE_LIMITED"
                : "academyReg.error.SERVICE_TEMPORARILY_UNAVAILABLE";
          setBannerError(t(errorKey));
          return;
        }

        if (
          isFeatureNotAvailableError(error) ||
          code === "FEATURE_NOT_AVAILABLE"
        ) {
          setPendingAttempt(null);
          setBannerError(t("academyReg.error.FEATURE_NOT_AVAILABLE"));
          return;
        }

        if (
          code === "IDEMPOTENCY_KEY_REQUIRED" ||
          code === "IDEMPOTENCY_KEY_INVALID"
        ) {
          setPendingAttempt(null);
          setBannerError(t(`academyReg.error.${code}`));
          return;
        }

        // Fallback for unexpected 5xx (treat as ambiguous to avoid duplicate registrations)
        if (error.status >= 500) {
          setPendingAttempt({
            key: idempotencyKey,
            fingerprint,
            payload,
            ambiguous: true,
          });
        }
        setBannerError(t("academyReg.error.GENERIC"));
        return;
      }

      // Network drop / timeout: ambiguous outcome — preserve exact key & payload
      setPendingAttempt({
        key: idempotencyKey,
        fingerprint,
        payload,
        ambiguous: true,
      });
      setBannerError(t("academyReg.error.NETWORK"));
    } finally {
      submittingLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || submittingLockRef.current || retryCountdown > 0) return;

    if (!resolvedConsent?.allResolved) {
      setBannerError(t("academyReg.step3.consentUnavailableBody"));
      return;
    }

    if (
      !selectedSession ||
      sessionRefreshRequired ||
      sessionRefreshing ||
      configRefreshing
    ) {
      setStep(1);
      return;
    }
    if (!validateStep3()) return;

    const payload = buildRequestPayload();
    if (!payload) return;
    const fingerprint = fingerprintRegistrationPayload(payload);

    // If an ambiguous attempt exists and payload changed, require explicit user choice
    if (
      pendingAttempt?.ambiguous &&
      pendingAttempt.fingerprint !== fingerprint
    ) {
      setBannerError(t("academyReg.retry.editedAfterAmbiguousBody"));
      return;
    }

    // Reuse key when retrying identical payload; generate a new key for a new attempt
    const keyToUse =
      pendingAttempt && pendingAttempt.fingerprint === fingerprint
        ? pendingAttempt.key
        : generateRegistrationIdempotencyKey();

    await executeSubmission(payload, keyToUse, fingerprint);
  };

  const handleRetryOriginalAttempt = async () => {
    if (
      !pendingAttempt ||
      !canRetryOriginal ||
      submitting ||
      submittingLockRef.current ||
      retryCountdown > 0 ||
      configRefreshing ||
      sessionRefreshing ||
      sessionRefreshRequired
    )
      return;
    await executeSubmission(
      pendingAttempt.payload,
      pendingAttempt.key,
      pendingAttempt.fingerprint,
    );
  };

  const handleStartFreshAttempt = async () => {
    if (
      submitting ||
      submittingLockRef.current ||
      retryCountdown > 0 ||
      configRefreshing ||
      sessionRefreshing ||
      sessionRefreshRequired ||
      !selectedSession
    )
      return;
    if (!resolvedConsent?.allResolved) return;
    if (!validateStep3()) return;
    const payload = buildRequestPayload();
    if (!payload) return;
    const fingerprint = fingerprintRegistrationPayload(payload);
    const freshKey = generateRegistrationIdempotencyKey();
    setPendingAttempt(null);
    await executeSubmission(payload, freshKey, fingerprint);
  };

  const handleCopyReferenceCode = async () => {
    if (!receipt) return;
    const opSeq = ++copyOpSeqRef.current;
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    if (
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      if (isMountedRef.current && copyOpSeqRef.current === opSeq) {
        setCopyStatus("manual");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(receipt.referenceCode);
      if (!isMountedRef.current || copyOpSeqRef.current !== opSeq) return;
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      setCopyStatus("copied");
      const timerId = window.setTimeout(() => {
        if (!isMountedRef.current || copyOpSeqRef.current !== opSeq) return;
        if (copyTimerRef.current === timerId) {
          copyTimerRef.current = null;
        }
        setCopyStatus("idle");
      }, 3000);
      copyTimerRef.current = timerId;
    } catch {
      if (!isMountedRef.current || copyOpSeqRef.current !== opSeq) return;
      setCopyStatus("manual");
    }
  };

  const interestHref = buildUrlWithSource("/interest", campaignSource);
  const academyHref = buildUrlWithSource("/academy", campaignSource);
  const homeHref = buildUrlWithSource("/", campaignSource);

  const steps = useMemo(
    () => [
      { id: 1, label: t("academyReg.steps.step1") },
      { id: 2, label: t("academyReg.steps.step2") },
      { id: 3, label: t("academyReg.steps.step3") },
    ],
    [t],
  );

  // Receipt screen (sensitive form data already cleared from memory)
  if (receipt) {
    return (
      <main
        className="ph-no-capture registration-main registration-main-receipt"
        data-ph-no-capture="true"
      >
        <Card
          data-testid="registration-receipt-card"
          style={{
            borderRadius: 20,
            border: "1px solid #e4e4e7",
            boxShadow: "0 14px 36px rgba(24, 24, 27, 0.06)",
          }}
        >
          <CardContent className="registration-card-body">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: "#FFFBEB",
                  border: "2px solid #F59E0B",
                  color: "#B45309",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.55rem",
                  fontWeight: 800,
                  margin: "0 auto 14px",
                }}
              >
                ✓
              </div>
              <div style={{ marginBottom: 12 }}>
                <Badge
                  variant="warning"
                  size="md"
                  className="registration-receipt-badge"
                  style={{
                    whiteSpace: "normal",
                    textAlign: "center",
                    maxWidth: "100%",
                    lineHeight: 1.35,
                  }}
                >
                  {t("academyReg.receipt.badge")}
                </Badge>
              </div>
              <h1
                style={{
                  margin: "0 0 10px",
                  fontSize: "clamp(1.55rem, 3.5vw, 2.15rem)",
                  color: "#18181b",
                  letterSpacing: "-0.02em",
                }}
              >
                {t("academyReg.receipt.title")}
              </h1>
              <p
                style={{
                  margin: "0 auto",
                  maxWidth: 560,
                  color: "#3f3f46",
                  fontSize: "0.96rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academyReg.receipt.message")}
              </p>
            </div>

            <div
              style={{
                background: "#fafafa",
                border: "1px solid #e4e4e7",
                borderRadius: 14,
                padding: 18,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  paddingBottom: 14,
                  marginBottom: 14,
                  borderBottom: "1px solid #e4e4e7",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#71717a",
                      marginBottom: 4,
                    }}
                  >
                    {t("academyReg.receipt.referenceLabel")}
                  </div>
                  <div
                    data-testid="receipt-reference-code"
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.3rem",
                      fontWeight: 800,
                      color: "#18181b",
                      letterSpacing: "0.04em",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {receipt.referenceCode}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => void handleCopyReferenceCode()}
                  data-testid="copy-reference-code-btn"
                  style={{ minHeight: 44 }}
                >
                  {copyStatus === "copied"
                    ? t("academyReg.receipt.copied")
                    : t("academyReg.receipt.copyCode")}
                </Button>
              </div>

              {copyStatus === "manual" ? (
                <div
                  role="status"
                  data-testid="copy-reference-manual-notice"
                  style={{
                    marginBottom: 14,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#78350f",
                    fontSize: "0.84rem",
                    lineHeight: 1.45,
                  }}
                >
                  {t("academyReg.receipt.copyManual")}
                </div>
              ) : null}

              <dl className="registration-meta-dl">
                <dt style={{ color: "#71717a", fontWeight: 600 }}>
                  {t("academyReg.receipt.statusLabel")}
                </dt>
                <dd style={{ margin: 0, color: "#92400e", fontWeight: 700 }}>
                  {t("academyReg.receipt.statusValue")}
                </dd>

                <dt style={{ color: "#71717a", fontWeight: 600 }}>
                  {t("academyReg.receipt.sessionLabel")}
                </dt>
                <dd style={{ margin: 0, color: "#18181b", fontWeight: 700 }}>
                  {receipt.session.name}
                </dd>

                <dt style={{ color: "#71717a", fontWeight: 600 }}>
                  {t("academyReg.receipt.receivedAtLabel")}
                </dt>
                <dd style={{ margin: 0, color: "#18181b", fontWeight: 600 }}>
                  {formatMytTimestampForLocale(receipt.receivedAt, locale)}
                </dd>
              </dl>
            </div>

            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 12,
                padding: "14px 16px",
                color: "#78350f",
                fontSize: "0.88rem",
                lineHeight: 1.55,
                marginBottom: 24,
              }}
            >
              {t("academyReg.receipt.noticeNoPlace")}
            </div>

            <div className="registration-receipt-actions">
              <Link
                href={academyHref}
                style={{ ...getButtonStyles("primary", "lg"), minHeight: 44 }}
              >
                {t("academyReg.receipt.backAcademy")}
              </Link>
              <Link
                href={homeHref}
                style={{ ...getButtonStyles("outline", "lg"), minHeight: 44 }}
              >
                {t("academyReg.receipt.backHome")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="ph-no-capture registration-main" data-ph-no-capture="true">
      <div style={{ marginBottom: 10 }}>
        <Link
          href={academyHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#52525b",
            fontWeight: 600,
            fontSize: "0.9rem",
            textDecoration: "none",
            minHeight: 40,
          }}
        >
          <span aria-hidden="true">←</span>
          <span>{t("academyReg.page.backToAcademy")}</span>
        </Link>
      </div>

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Badge variant="brand">{t("academyReg.page.badge")}</Badge>
        <h1
          style={{
            marginTop: 10,
            marginBottom: 8,
            fontSize: "clamp(1.6rem, 3.8vw, 2.3rem)",
            color: "#18181b",
            letterSpacing: "-0.025em",
          }}
        >
          {t("academyReg.page.title")}
        </h1>
        <p
          style={{
            color: "#52525b",
            fontSize: "0.95rem",
            lineHeight: 1.55,
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          {t("academyReg.page.subtitle")}
        </p>
      </div>

      {loadState.kind === "loading" && (
        <Card style={{ padding: 28 }} aria-busy="true">
          <span className="sr-only">{t("academyReg.page.loading")}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Skeleton width="50%" height={24} />
            <Skeleton width="100%" height={56} />
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={48} />
          </div>
        </Card>
      )}

      {loadState.kind === "error" && (
        <div role="alert" data-testid="registration-page-error">
          <Alert variant="warning" title={t("academyReg.sessions.errorTitle")}>
            <p style={{ margin: "0 0 16px", lineHeight: 1.55 }}>
              {t("academyReg.sessions.errorBody")}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => void loadConfigAndSessions()}
                style={{ minHeight: 44 }}
              >
                {t("academyReg.sessions.retry")}
              </Button>
              <Link
                href={interestHref}
                style={{ ...getButtonStyles("outline", "md"), minHeight: 44 }}
              >
                {t("nav.registerInterest")}
              </Link>
            </div>
          </Alert>
        </div>
      )}

      {loadState.kind === "deferred" && (
        <Card
          data-testid="registration-page-deferred"
          style={{
            padding: "36px 24px",
            borderRadius: 20,
            border: "1px solid #e4e4e7",
            background: "#fafafa",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <Badge variant="neutral" size="md">
              {t("academyReg.sessions.deferredBadge")}
            </Badge>
          </div>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "1.45rem",
              color: "#18181b",
            }}
          >
            {t("academyReg.sessions.deferredTitle")}
          </h2>
          <p
            style={{
              margin: "0 auto 24px",
              maxWidth: 540,
              color: "#52525b",
              lineHeight: 1.6,
            }}
          >
            {t("academyReg.sessions.deferredBody")}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={interestHref}
              style={{ ...getButtonStyles("primary", "lg"), minHeight: 44 }}
            >
              {t("nav.registerInterest")}
            </Link>
            <Link
              href={academyHref}
              style={{ ...getButtonStyles("outline", "lg"), minHeight: 44 }}
            >
              {t("academyReg.page.backToAcademy")}
            </Link>
          </div>
        </Card>
      )}

      {loadState.kind === "closed" && (
        <Card
          data-testid="registration-page-closed"
          style={{
            padding: "36px 24px",
            borderRadius: 20,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <Badge variant="warning" size="md">
              {t("academyReg.sessions.closedBadge")}
            </Badge>
          </div>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "1.45rem",
              color: "#78350f",
            }}
          >
            {t("academyReg.sessions.closedTitle")}
          </h2>
          <p
            style={{
              margin: "0 auto 24px",
              maxWidth: 540,
              color: "#78350f",
              lineHeight: 1.6,
            }}
          >
            {t("academyReg.sessions.closedBody")}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={interestHref}
              style={{ ...getButtonStyles("primary", "lg"), minHeight: 44 }}
            >
              {t("nav.registerInterest")}
            </Link>
            <Link
              href={academyHref}
              style={{ ...getButtonStyles("outline", "lg"), minHeight: 44 }}
            >
              {t("academyReg.page.backToAcademy")}
            </Link>
          </div>
        </Card>
      )}

      {loadState.kind === "empty" && (
        <Card
          data-testid="registration-page-empty"
          style={{
            padding: "36px 24px",
            borderRadius: 20,
            border: "1px solid #e4e4e7",
            background: "#ffffff",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <Badge variant="neutral" size="md">
              {t("academyReg.sessions.emptyBadge")}
            </Badge>
          </div>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "1.45rem",
              color: "#18181b",
            }}
          >
            {t("academyReg.sessions.emptyTitle")}
          </h2>
          <p
            style={{
              margin: "0 auto 24px",
              maxWidth: 540,
              color: "#52525b",
              lineHeight: 1.6,
            }}
          >
            {t("academyReg.sessions.emptyBody")}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={interestHref}
              style={{ ...getButtonStyles("primary", "lg"), minHeight: 44 }}
            >
              {t("nav.registerInterest")}
            </Link>
            <Link
              href={academyHref}
              style={{ ...getButtonStyles("outline", "lg"), minHeight: 44 }}
            >
              {t("academyReg.page.backToAcademy")}
            </Link>
          </div>
        </Card>
      )}

      {loadState.kind === "ready" && (
        <>
          <StepIndicator
            steps={steps}
            currentStep={step}
            ariaLabel={t("academyReg.page.badge")}
          />

          <Card
            style={{
              borderRadius: 20,
              border: "1px solid #e4e4e7",
              boxShadow: "0 12px 32px rgba(24, 24, 27, 0.05)",
            }}
          >
            <CardContent className="registration-card-body">
              {stalePreselectedSession ? (
                <div style={{ marginBottom: 20 }}>
                  <Alert variant="warning">
                    {t("academyReg.step1.staleSessionNotice")}
                  </Alert>
                </div>
              ) : null}

              {noticeBanner || policyChangedNotice ? (
                <div style={{ marginBottom: 20 }} role="status">
                  <Alert variant="info">
                    {noticeBanner ?? t("academyReg.step3.consentUpdatedNotice")}
                  </Alert>
                </div>
              ) : null}

              {bannerError ? (
                <div
                  style={{ marginBottom: 20 }}
                  role="alert"
                  data-testid="registration-error-banner"
                >
                  <Alert variant="danger" title={t("academyReg.error.title")}>
                    {bannerError}
                  </Alert>
                </div>
              ) : null}

              {sessionRefreshRequired ? (
                <Alert
                  variant="warning"
                  title={t("academyReg.sessions.errorTitle")}
                >
                  <Button
                    type="button"
                    disabled={sessionRefreshing || submitting}
                    data-testid="registration-session-refresh-btn"
                    onClick={() =>
                      void refreshUnavailableSessions({ clearBanner: true })
                    }
                  >
                    {t("academyReg.sessions.retry")}
                  </Button>
                </Alert>
              ) : null}

              {pendingAttempt?.ambiguous && step === 3 ? (
                <div
                  style={{ marginBottom: 20 }}
                  data-testid="ambiguous-retry-panel"
                >
                  <Alert
                    variant="warning"
                    title={t("academyReg.retry.ambiguousTitle")}
                  >
                    <p style={{ margin: "0 0 12px", lineHeight: 1.5 }}>
                      {editedAfterAmbiguousAttempt
                        ? t("academyReg.retry.editedAfterAmbiguousBody")
                        : t("academyReg.retry.ambiguousBody")}
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={
                          submitting ||
                          retryCountdown > 0 ||
                          !canRetryOriginal ||
                          configRefreshing ||
                          sessionRefreshing ||
                          sessionRefreshRequired
                        }
                        onClick={() => void handleRetryOriginalAttempt()}
                        data-testid="retry-original-attempt-btn"
                        style={{ minHeight: 44 }}
                      >
                        {t("academyReg.retry.retryOriginal")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          submitting ||
                          retryCountdown > 0 ||
                          !resolvedConsent?.allResolved ||
                          !selectedSession ||
                          configRefreshing ||
                          sessionRefreshing ||
                          sessionRefreshRequired
                        }
                        onClick={() => void handleStartFreshAttempt()}
                        data-testid="start-new-attempt-btn"
                        style={{ minHeight: 44 }}
                      >
                        {t("academyReg.retry.startNewAttempt")}
                      </Button>
                    </div>
                  </Alert>
                </div>
              ) : null}

              {/* STEP 1: Player information & session */}
              {step === 1 && (
                <div
                  data-testid="registration-step-1"
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                >
                  <div>
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "1.3rem",
                        color: "#18181b",
                      }}
                    >
                      {t("academyReg.step1.title")}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        color: "#52525b",
                        fontSize: "0.92rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {t("academyReg.step1.subtitle")}
                    </p>
                  </div>

                  <fieldset
                    style={{
                      border: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <legend
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "#18181b",
                        marginBottom: 8,
                      }}
                    >
                      {t("academyReg.step1.sessionLegend")}
                    </legend>
                    <div className="registration-session-picker">
                      {loadState.sessions.map((session, idx) => {
                        const selected = form.sessionId === session.id;
                        const scheduleLine = [
                          session.weekday &&
                          session.weekday >= 1 &&
                          session.weekday <= 7
                            ? t(
                                `academyReg.sessions.weekday.${session.weekday}`,
                              )
                            : "",
                          formatSessionTimeRange(
                            session.startTime,
                            session.endTime,
                          ),
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <label
                            key={session.id}
                            htmlFor={`session-option-${session.id}`}
                            data-testid={`session-option-card-${session.id}`}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 12,
                              padding: 16,
                              borderRadius: 12,
                              border: selected
                                ? "2px solid #f59e0b"
                                : fieldErrors.sessionId
                                  ? "1px solid #ef4444"
                                  : "1px solid #d4d4d8",
                              backgroundColor: selected ? "#fffbeb" : "#ffffff",
                              cursor: "pointer",
                              transition: "border-color 0.15s ease",
                            }}
                          >
                            <input
                              ref={
                                idx === 0 ? setFieldRef("sessionId") : undefined
                              }
                              id={`session-option-${session.id}`}
                              type="radio"
                              name="sessionId"
                              value={session.id}
                              checked={selected}
                              onChange={() => {
                                setStalePreselectedSession(false);
                                updateField(
                                  "sessionId",
                                  session.id,
                                  "sessionId",
                                );
                              }}
                              style={{
                                width: 20,
                                height: 20,
                                accentColor: "#f59e0b",
                                marginTop: 2,
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  marginBottom: 4,
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 800,
                                    color: "#18181b",
                                    fontSize: "0.98rem",
                                  }}
                                >
                                  {session.name}
                                </span>
                                {session.minAge !== null &&
                                session.maxAge !== null ? (
                                  <Badge variant="brand" size="sm">
                                    {t("academyReg.sessions.ageRange", {
                                      min: session.minAge,
                                      max: session.maxAge,
                                    })}
                                  </Badge>
                                ) : null}
                              </div>
                              {scheduleLine ? (
                                <div
                                  style={{
                                    fontSize: "0.86rem",
                                    fontWeight: 700,
                                    color: "#b45309",
                                    marginBottom: 4,
                                  }}
                                >
                                  {scheduleLine}
                                </div>
                              ) : null}
                              <div
                                style={{
                                  fontSize: "0.83rem",
                                  color: "#52525b",
                                  lineHeight: 1.45,
                                }}
                              >
                                {session.venue.name}
                                {session.coachDisplayName
                                  ? ` · ${session.coachDisplayName}`
                                  : ""}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {fieldErrors.sessionId ? (
                      <span
                        role="alert"
                        style={{
                          fontSize: "0.8125rem",
                          color: "#b91c1c",
                          fontWeight: 500,
                        }}
                      >
                        {fieldErrors.sessionId}
                      </span>
                    ) : null}
                  </fieldset>

                  <Input
                    ref={setFieldRef("player.fullName")}
                    id="player-full-name"
                    name="playerFullName"
                    label={t("academyReg.step1.playerFullName")}
                    placeholder={t(
                      "academyReg.step1.playerFullNamePlaceholder",
                    )}
                    required
                    autoComplete="name"
                    value={form.playerFullName}
                    onChange={(e) =>
                      updateField(
                        "playerFullName",
                        e.target.value,
                        "player.fullName",
                      )
                    }
                    error={fieldErrors["player.fullName"]}
                  />

                  <div>
                    <Input
                      ref={setFieldRef("player.dateOfBirth")}
                      id="player-dob"
                      name="playerDateOfBirth"
                      type="date"
                      label={t("academyReg.step1.dateOfBirth")}
                      required
                      max={todayMyt}
                      autoComplete="bday"
                      value={form.playerDateOfBirth}
                      onChange={(e) =>
                        updateField(
                          "playerDateOfBirth",
                          e.target.value,
                          "player.dateOfBirth",
                        )
                      }
                      error={fieldErrors["player.dateOfBirth"]}
                    />
                    <small
                      style={{
                        color: "#52525b",
                        marginTop: 6,
                        display: "block",
                        lineHeight: 1.45,
                      }}
                    >
                      {t("academyReg.step1.dateOfBirthHelper")}
                    </small>
                    {ageGuidance ? (
                      <div
                        data-testid="age-eligibility-guidance"
                        style={{
                          marginTop: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          fontSize: "0.84rem",
                          lineHeight: 1.45,
                          backgroundColor: ageGuidance.withinRange
                            ? "#ecfdf5"
                            : "#fffbeb",
                          border: ageGuidance.withinRange
                            ? "1px solid #a7f3d0"
                            : "1px solid #fde68a",
                          color: ageGuidance.withinRange
                            ? "#065f46"
                            : "#92400e",
                        }}
                      >
                        {ageGuidance.withinRange
                          ? t("academyReg.step1.ageGuidanceEligible", {
                              age: ageGuidance.age,
                              min: ageGuidance.minAge,
                              max: ageGuidance.maxAge,
                            })
                          : t("academyReg.step1.ageGuidanceOutside", {
                              age: ageGuidance.age,
                              min: ageGuidance.minAge,
                              max: ageGuidance.maxAge,
                            })}
                      </div>
                    ) : null}
                  </div>

                  <div className="two-column-form">
                    <Select
                      ref={setFieldRef("player.gender")}
                      id="player-gender"
                      name="playerGender"
                      label={t("academyReg.step1.gender")}
                      required
                      value={form.playerGender}
                      onChange={(e) =>
                        updateField(
                          "playerGender",
                          e.target.value,
                          "player.gender",
                        )
                      }
                      error={fieldErrors["player.gender"]}
                      options={[
                        {
                          value: "",
                          label: t("academyReg.step1.genderPlaceholder"),
                        },
                        ...(loadState.config.options.gender ?? []).map(
                          (code) => ({
                            value: code,
                            label: translateOption("gender", code),
                          }),
                        ),
                      ]}
                    />

                    <Select
                      ref={setFieldRef("player.jerseySize")}
                      id="player-jersey-size"
                      name="playerJerseySize"
                      label={t("academyReg.step1.jerseySize")}
                      required
                      value={form.playerJerseySize}
                      onChange={(e) =>
                        updateField(
                          "playerJerseySize",
                          e.target.value,
                          "player.jerseySize",
                        )
                      }
                      error={fieldErrors["player.jerseySize"]}
                      options={[
                        {
                          value: "",
                          label: t("academyReg.step1.jerseySizePlaceholder"),
                        },
                        ...(loadState.config.options.jerseySize ?? []).map(
                          (code) => ({
                            value: code,
                            label: translateOption("jerseySize", code),
                          }),
                        ),
                      ]}
                    />
                  </div>

                  <div>
                    <Input
                      ref={setFieldRef("player.phone")}
                      id="player-phone"
                      name="playerPhone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      label={t("academyReg.step1.playerPhone")}
                      placeholder={t("academyReg.step1.playerPhonePlaceholder")}
                      value={form.playerPhone}
                      onChange={(e) =>
                        updateField(
                          "playerPhone",
                          e.target.value,
                          "player.phone",
                        )
                      }
                      error={fieldErrors["player.phone"]}
                    />
                    <small
                      style={{
                        color: "#52525b",
                        marginTop: 6,
                        display: "block",
                        lineHeight: 1.45,
                      }}
                    >
                      {t("academyReg.step1.playerPhoneHelper")}
                    </small>
                  </div>

                  <div className="registration-step-actions registration-step-actions-single">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      data-testid="step1-next-btn"
                      onClick={() => {
                        setBannerError(null);
                        if (validateStep1()) {
                          setStep(2);
                        }
                      }}
                      style={{ minHeight: 46, minWidth: 160 }}
                    >
                      {t("academyReg.nav.next")}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Guardian & emergency contact */}
              {step === 2 && (
                <div
                  data-testid="registration-step-2"
                  style={{ display: "flex", flexDirection: "column", gap: 22 }}
                >
                  <div>
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "1.3rem",
                        color: "#18181b",
                      }}
                    >
                      {t("academyReg.step2.title")}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        color: "#52525b",
                        fontSize: "0.92rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {t("academyReg.step2.subtitle")}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: 20,
                      borderRadius: 14,
                      background: "#fafafa",
                      border: "1px solid #e4e4e7",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: "#18181b",
                      }}
                    >
                      {t("academyReg.step2.guardianHeading")}
                    </h3>

                    <Input
                      ref={setFieldRef("guardian.fullName")}
                      id="guardian-full-name"
                      name="guardianFullName"
                      label={t("academyReg.step2.guardianFullName")}
                      placeholder={t(
                        "academyReg.step2.guardianFullNamePlaceholder",
                      )}
                      required
                      autoComplete="name"
                      value={form.guardianFullName}
                      onChange={(e) =>
                        updateField(
                          "guardianFullName",
                          e.target.value,
                          "guardian.fullName",
                        )
                      }
                      error={fieldErrors["guardian.fullName"]}
                    />

                    <div>
                      <Input
                        ref={setFieldRef("guardian.phone")}
                        id="guardian-phone"
                        name="guardianPhone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        label={t("academyReg.step2.guardianPhone")}
                        placeholder={t(
                          "academyReg.step2.guardianPhonePlaceholder",
                        )}
                        required
                        value={form.guardianPhone}
                        onChange={(e) =>
                          updateField(
                            "guardianPhone",
                            e.target.value,
                            "guardian.phone",
                          )
                        }
                        error={fieldErrors["guardian.phone"]}
                      />
                      <small
                        style={{
                          color: "#52525b",
                          marginTop: 6,
                          display: "block",
                          lineHeight: 1.45,
                        }}
                      >
                        {t("academyReg.step2.guardianPhoneHelper")}
                      </small>
                    </div>

                    <Select
                      ref={setFieldRef("guardian.relationship")}
                      id="guardian-relationship"
                      name="guardianRelationship"
                      label={t("academyReg.step2.guardianRelationship")}
                      required
                      value={form.guardianRelationship}
                      onChange={(e) =>
                        updateField(
                          "guardianRelationship",
                          e.target.value,
                          "guardian.relationship",
                        )
                      }
                      error={fieldErrors["guardian.relationship"]}
                      options={[
                        {
                          value: "",
                          label: t("academyReg.step2.relationshipPlaceholder"),
                        },
                        ...(
                          loadState.config.options.guardianRelationship ?? []
                        ).map((code) => ({
                          value: code,
                          label: translateOption("relationship", code),
                        })),
                      ]}
                    />
                  </div>

                  <div
                    style={{
                      padding: 20,
                      borderRadius: 14,
                      background: "#fafafa",
                      border: "1px solid #e4e4e7",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: "#18181b",
                      }}
                    >
                      {t("academyReg.step2.emergencyHeading")}
                    </h3>

                    <Input
                      ref={setFieldRef("emergencyContact.fullName")}
                      id="emergency-full-name"
                      name="emergencyFullName"
                      label={t("academyReg.step2.emergencyFullName")}
                      placeholder={t(
                        "academyReg.step2.emergencyFullNamePlaceholder",
                      )}
                      required
                      value={form.emergencyFullName}
                      onChange={(e) =>
                        updateField(
                          "emergencyFullName",
                          e.target.value,
                          "emergencyContact.fullName",
                        )
                      }
                      error={fieldErrors["emergencyContact.fullName"]}
                    />

                    <Input
                      ref={setFieldRef("emergencyContact.phone")}
                      id="emergency-phone"
                      name="emergencyPhone"
                      type="tel"
                      inputMode="tel"
                      label={t("academyReg.step2.emergencyPhone")}
                      placeholder={t(
                        "academyReg.step2.emergencyPhonePlaceholder",
                      )}
                      required
                      value={form.emergencyPhone}
                      onChange={(e) =>
                        updateField(
                          "emergencyPhone",
                          e.target.value,
                          "emergencyContact.phone",
                        )
                      }
                      error={fieldErrors["emergencyContact.phone"]}
                    />

                    <Select
                      ref={setFieldRef("emergencyContact.relationship")}
                      id="emergency-relationship"
                      name="emergencyRelationship"
                      label={t("academyReg.step2.emergencyRelationship")}
                      required
                      value={form.emergencyRelationship}
                      onChange={(e) =>
                        updateField(
                          "emergencyRelationship",
                          e.target.value,
                          "emergencyContact.relationship",
                        )
                      }
                      error={fieldErrors["emergencyContact.relationship"]}
                      options={[
                        {
                          value: "",
                          label: t("academyReg.step2.relationshipPlaceholder"),
                        },
                        ...(
                          loadState.config.options
                            .emergencyContactRelationship ?? []
                        ).map((code) => ({
                          value: code,
                          label: translateOption("relationship", code),
                        })),
                      ]}
                    />
                  </div>

                  <div className="registration-step-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      data-testid="step2-back-btn"
                      onClick={() => setStep(1)}
                      style={{ minHeight: 46 }}
                    >
                      {t("academyReg.nav.back")}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      data-testid="step2-next-btn"
                      onClick={() => {
                        setBannerError(null);
                        if (validateStep2()) {
                          setStep(3);
                        }
                      }}
                      style={{ minHeight: 46, minWidth: 160 }}
                    >
                      {t("academyReg.nav.next")}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Review & consent */}
              {step === 3 && (
                <form
                  onSubmit={handlePrimarySubmit}
                  noValidate
                  data-testid="registration-step-3"
                  style={{ display: "flex", flexDirection: "column", gap: 22 }}
                >
                  <div>
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "1.3rem",
                        color: "#18181b",
                      }}
                    >
                      {t("academyReg.step3.title")}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        color: "#52525b",
                        fontSize: "0.92rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {t("academyReg.step3.subtitle")}
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="registration-review-grid">
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "#fafafa",
                        border: "1px solid #e4e4e7",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <strong
                          style={{ fontSize: "0.92rem", color: "#18181b" }}
                        >
                          {t("academyReg.step3.summaryPlayer")}
                        </strong>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setStep(1)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#b45309",
                            fontWeight: 700,
                            fontSize: "0.84rem",
                            cursor: "pointer",
                            minHeight: 36,
                            padding: "4px 8px",
                          }}
                        >
                          {t("academyReg.nav.edit")}
                        </button>
                      </div>
                      <dl className="registration-review-dl">
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step3.summarySession")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            color: "#18181b",
                          }}
                        >
                          {selectedSession?.name ?? ""}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step1.playerFullName")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {form.playerFullName.trim()}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step1.dateOfBirth")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {formatDateOnlyForLocale(
                            form.playerDateOfBirth,
                            locale,
                          )}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step1.gender")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {translateOption("gender", form.playerGender)}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step1.jerseySize")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {translateOption("jerseySize", form.playerJerseySize)}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step1.playerPhone")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {form.playerPhone.trim() ||
                            t("academyReg.step3.notProvided")}
                        </dd>
                      </dl>
                    </div>

                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "#fafafa",
                        border: "1px solid #e4e4e7",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <strong
                          style={{ fontSize: "0.92rem", color: "#18181b" }}
                        >
                          {t("academyReg.steps.step2")}
                        </strong>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setStep(2)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#b45309",
                            fontWeight: 700,
                            fontSize: "0.84rem",
                            cursor: "pointer",
                            minHeight: 36,
                            padding: "4px 8px",
                          }}
                        >
                          {t("academyReg.nav.edit")}
                        </button>
                      </div>
                      <dl className="registration-review-dl">
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step2.guardianFullName")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {form.guardianFullName.trim()}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step2.guardianPhone")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {form.guardianPhone.trim()}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step2.guardianRelationship")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {translateOption(
                            "relationship",
                            form.guardianRelationship,
                          )}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step2.emergencyFullName")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {form.emergencyFullName.trim()}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step2.emergencyPhone")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {form.emergencyPhone.trim()}
                        </dd>
                        <dt style={{ color: "#71717a" }}>
                          {t("academyReg.step2.emergencyRelationship")}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {translateOption(
                            "relationship",
                            form.emergencyRelationship,
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>

                  {/* Consents */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.05rem",
                          fontWeight: 800,
                          color: "#18181b",
                        }}
                      >
                        {t("academyReg.step3.consentHeading")}
                      </h3>
                      {resolvedConsent ? (
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: "#71717a",
                            fontFamily: "monospace",
                          }}
                        >
                          {t("academyReg.step3.consentVersionLabel", {
                            version: resolvedConsent.policyVersion,
                          })}
                        </span>
                      ) : null}
                    </div>

                    {!resolvedConsent?.allResolved ? (
                      <div
                        role="alert"
                        data-testid="consent-wording-unavailable-alert"
                      >
                        <Alert
                          variant="danger"
                          title={t("academyReg.step3.consentUnavailableTitle")}
                        >
                          <p style={{ margin: "0 0 12px", lineHeight: 1.55 }}>
                            {t("academyReg.step3.consentUnavailableBody")}
                          </p>
                          {rejectedConsentVersion !== null && (
                            <Button
                              type="button"
                              disabled={configRefreshing || submitting}
                              data-testid="registration-config-refresh-btn"
                              onClick={() =>
                                void refreshConsentConfig({ clearBanner: true })
                              }
                            >
                              {t("academyReg.sessions.retry")}
                            </Button>
                          )}
                          <Link
                            href={interestHref}
                            style={{
                              ...getButtonStyles("outline", "sm"),
                              minHeight: 44,
                            }}
                          >
                            {t("nav.registerInterest")}
                          </Link>
                        </Alert>
                      </div>
                    ) : (
                      <>
                        {resolvedConsent.hasSyntheticFixtures ? (
                          <div data-testid="synthetic-consent-fixture-notice">
                            <Badge
                              variant="warning"
                              size="sm"
                              style={{
                                whiteSpace: "normal",
                                textAlign: "left",
                                maxWidth: "100%",
                                lineHeight: 1.35,
                              }}
                            >
                              {t("academyReg.step3.syntheticFixtureBadge")}
                            </Badge>
                          </div>
                        ) : null}

                        {resolvedConsent.items.map((item) => {
                          const isAuthority =
                            item.type === "GUARDIAN_AUTHORITY";
                          const isPrivacy =
                            item.type === "REGISTRATION_PRIVACY";
                          const isMarketing = item.type === "MARKETING";
                          const isPhotography = item.type === "PHOTOGRAPHY";

                          const checked = isAuthority
                            ? form.authorityConfirmed
                            : isPrivacy
                              ? form.registrationPrivacy
                              : isMarketing
                                ? form.marketing
                                : isPhotography
                                  ? form.photography
                                  : false;

                          const fieldKey = isAuthority
                            ? "guardian.authorityConfirmed"
                            : isPrivacy
                              ? "consents.registrationPrivacy"
                              : isMarketing
                                ? "consents.marketing"
                                : "consents.photography";

                          const formKey: keyof RegistrationFormValues =
                            isAuthority
                              ? "authorityConfirmed"
                              : isPrivacy
                                ? "registrationPrivacy"
                                : isMarketing
                                  ? "marketing"
                                  : "photography";

                          const typeHeadingKey = `academyReg.step3.consentType.${item.type}`;
                          const typeHeading =
                            t(typeHeadingKey) === typeHeadingKey
                              ? item.type
                              : t(typeHeadingKey);

                          return (
                            <div
                              key={item.type}
                              data-testid={`consent-item-${item.type}`}
                              style={{
                                padding: 16,
                                borderRadius: 12,
                                border: fieldErrors[fieldKey]
                                  ? "1px solid #ef4444"
                                  : item.required
                                    ? "1px solid #d4d4d8"
                                    : "1px solid #e4e4e7",
                                background: item.required
                                  ? "#ffffff"
                                  : "#fafafa",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "0.9rem",
                                    color: "#18181b",
                                  }}
                                >
                                  {typeHeading}
                                </span>
                                <Badge
                                  variant={item.required ? "brand" : "neutral"}
                                  size="sm"
                                >
                                  {item.required
                                    ? t("academyReg.step3.requiredBadge")
                                    : t("academyReg.step3.optionalBadge")}
                                </Badge>
                              </div>
                              <Checkbox
                                ref={setFieldRef(fieldKey)}
                                id={`consent-checkbox-${item.type}`}
                                checked={checked}
                                disabled={submitting || configRefreshing}
                                required={item.required}
                                onChange={(e) =>
                                  updateField(
                                    formKey,
                                    e.target.checked,
                                    fieldKey,
                                  )
                                }
                                error={fieldErrors[fieldKey]}
                                label={
                                  <span style={{ lineHeight: 1.55 }}>
                                    {item.text}
                                  </span>
                                }
                              />
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {retryCountdown > 0 ? (
                    <div
                      role="status"
                      data-testid="retry-after-countdown"
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "#92400e",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: 10,
                        padding: "10px 14px",
                      }}
                    >
                      {t("academyReg.retry.waitCountdown", {
                        seconds: retryCountdown,
                      })}
                    </div>
                  ) : null}

                  <div className="registration-step-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      disabled={submitting}
                      data-testid="step3-back-btn"
                      onClick={() => setStep(2)}
                      style={{ minHeight: 46 }}
                    >
                      {t("academyReg.nav.back")}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={
                        submitting ||
                        retryCountdown > 0 ||
                        !resolvedConsent?.allResolved ||
                        !selectedSession ||
                        configRefreshing ||
                        sessionRefreshing ||
                        sessionRefreshRequired ||
                        editedAfterAmbiguousAttempt
                      }
                      data-testid="registration-submit-btn"
                      style={{ minHeight: 46, minWidth: 200 }}
                    >
                      {submitting
                        ? t("academyReg.nav.submitting")
                        : t("academyReg.nav.submit")}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
