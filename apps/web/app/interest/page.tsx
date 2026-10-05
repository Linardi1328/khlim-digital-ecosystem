"use client";

import React, { Suspense, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiService } from "../../lib/api-service";
import { getPublicBusinessDetails } from "../../lib/business-details";
import {
  buildUrlWithSource,
  resolveCampaignSource,
} from "../../lib/campaign-source";
import { useI18n } from "../../lib/i18n-context";
import type { PublicOfferingItem } from "../../lib/types";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";

function getCleanDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function getStaffWhatsAppUrl(): string | null {
  const configuredNumber =
    process.env.NEXT_PUBLIC_KHLIM_WHATSAPP_NUMBER?.trim() ||
    getPublicBusinessDetails().phone?.trim();

  if (!configuredNumber) return null;
  const digits = getCleanDigits(configuredNumber);
  if (!digits) return null;

  const internationalDigits = digits.startsWith("0")
    ? `60${digits.slice(1)}`
    : digits;

  return `https://wa.me/${internationalDigits}`;
}

function InterestForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  // Campaign source handling with precedence: query param -> sessionStorage -> direct
  const querySource = searchParams?.get("source");
  const queryOfferingId = searchParams?.get("offeringId");

  const [campaignSource, setCampaignSource] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [staleOfferingNotice, setStaleOfferingNotice] = useState(false);

  // Form inputs (kept in memory on retry/error)
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [childAge, setChildAge] = useState("");
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>("");
  const [consent, setConsent] = useState(false);

  // State management
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Idempotency token generated per form session
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  const guardianNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const offeringSelectId = useId();

  useEffect(() => {
    const resolved = resolveCampaignSource(querySource);
    setCampaignSource(resolved);

    // Generate unique idempotency key for this submission attempt session
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      setIdempotencyKey(`lead-idem-${crypto.randomUUID()}`);
    } else {
      setIdempotencyKey(
        `lead-idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      );
    }
  }, [querySource]);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getPublicOfferings()
      .then((items) => {
        if (cancelled) return;
        setOfferings(items);

        if (queryOfferingId) {
          const match = items.find((item) => item.id === queryOfferingId);
          if (match) {
            setSelectedOfferingId(match.id);
            setStaleOfferingNotice(false);
          } else {
            // Unknown, stale, closed or foreign offering ID
            setSelectedOfferingId("");
            setStaleOfferingNotice(true);
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setOfferings([]);
        if (queryOfferingId) {
          setSelectedOfferingId("");
          setStaleOfferingNotice(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOfferings(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryOfferingId]);

  const validateLocal = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedName = guardianName.trim();
    if (!trimmedName) {
      errors.guardianName = t("interest.error.guardianName");
    }

    const cleanedPhone = phone.trim().replace(/[\s\-\(\)\.]/g, "");
    const isValidPhone =
      /^01\d{8,9}$/.test(cleanedPhone) ||
      /^601\d{8,9}$/.test(cleanedPhone) ||
      /^\+601\d{8,9}$/.test(cleanedPhone) ||
      /^\+[1-9]\d{7,14}$/.test(cleanedPhone);

    if (!isValidPhone) {
      errors.phone = t("interest.error.phone");
    }

    const parsedAge = Number(childAge.trim());
    if (
      !childAge.trim() ||
      Number.isNaN(parsedAge) ||
      !Number.isInteger(parsedAge) ||
      parsedAge < 3 ||
      parsedAge > 18
    ) {
      errors.childAge = t("interest.error.childAge");
    }

    if (!consent) {
      errors.consent = t("interest.error.consent");
    }

    setFieldErrors(errors);

    if (errors.guardianName) {
      guardianNameRef.current?.focus();
      return false;
    }
    if (errors.phone) {
      phoneRef.current?.focus();
      return false;
    }
    if (errors.childAge) {
      ageRef.current?.focus();
      return false;
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setErrorMessage(null);

    if (!validateLocal()) {
      return;
    }

    setSubmitting(true);

    try {
      await apiService.createLead({
        guardianName: guardianName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        childAge: Number(childAge.trim()),
        programmeOfferingId: selectedOfferingId || null,
        source: campaignSource || null,
        consent: true,
        idempotencyKey,
      });

      setSubmissionSuccess(true);
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number }).status
          : 0;

      if (status === 429) {
        setErrorMessage(t("interest.rateLimited"));
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        setErrorMessage(t("interest.offlineError"));
      } else if (err && typeof err === "object" && "message" in err) {
        setErrorMessage(String((err as { message: unknown }).message));
      } else {
        setErrorMessage(t("common.error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const staffWhatsAppUrl = getStaffWhatsAppUrl();
  const enrolUrl = buildUrlWithSource(
    selectedOfferingId
      ? `/enrol?offeringId=${encodeURIComponent(selectedOfferingId)}`
      : "/enrol",
    campaignSource,
  );
  const programmesUrl = buildUrlWithSource("/programmes", campaignSource);

  return (
    <main
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "40px 20px 64px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Badge variant="brand">{t("brand.academy")}</Badge>
        <h1 style={{ marginTop: 12, marginBottom: 8, fontSize: "2rem" }}>
          {t("interest.title")}
        </h1>
        <p style={{ color: "#71717A", fontSize: "1rem", lineHeight: 1.5 }}>
          {t("interest.subtitle")}
        </p>
      </div>

      {submissionSuccess ? (
        <Card>
          <CardContent style={{ padding: "32px 24px", textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "#ECFDF5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                margin: "0 auto 20px",
              }}
            >
              ✓
            </div>
            <h2
              style={{ fontSize: "1.5rem", marginBottom: 12, color: "#18181B" }}
            >
              {t("interest.successTitle")}
            </h2>
            <p
              style={{
                color: "#3F3F46",
                fontSize: "1.0625rem",
                lineHeight: 1.6,
                maxWidth: 540,
                margin: "0 auto 16px",
              }}
            >
              {t("interest.successMessage")}
            </p>
            <div
              style={{
                background: "#F4F4F5",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: "0.875rem",
                color: "#71717A",
                marginBottom: 28,
                lineHeight: 1.4,
              }}
            >
              {t("interest.successDisclaimer")}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: 360,
                margin: "0 auto",
              }}
            >
              {staffWhatsAppUrl ? (
                <a
                  href={staffWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button variant="primary" style={{ width: "100%" }}>
                    💬 {t("interest.whatsappAction")}
                  </Button>
                </a>
              ) : null}

              <Link href={enrolUrl} style={{ textDecoration: "none" }}>
                <Button
                  variant={staffWhatsAppUrl ? "outline" : "primary"}
                  style={{ width: "100%" }}
                >
                  {t("interest.enrolAction")}
                </Button>
              </Link>

              <Link href={programmesUrl} style={{ textDecoration: "none" }}>
                <Button variant="outline" style={{ width: "100%" }}>
                  {t("interest.exploreAction")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent style={{ padding: "32px 24px" }}>
            {staleOfferingNotice ? (
              <div style={{ marginBottom: 20 }}>
                <Alert
                  variant="warning"
                  title={t("interest.offeringUnavailableNotice")}
                >
                  {t("interest.offeringUnavailableNotice")}
                </Alert>
              </div>
            ) : null}

            {errorMessage ? (
              <div style={{ marginBottom: 20 }} role="alert">
                <Alert variant="danger" title={t("interest.errorTitle")}>
                  {errorMessage}
                </Alert>
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div>
                <Input
                  ref={guardianNameRef}
                  label={t("interest.guardianName")}
                  required
                  autoComplete="name"
                  placeholder={t("interest.guardianNamePlaceholder")}
                  value={guardianName}
                  onChange={(e) => {
                    setGuardianName(e.target.value);
                    if (fieldErrors.guardianName) {
                      setFieldErrors((prev) => ({ ...prev, guardianName: "" }));
                    }
                  }}
                  error={fieldErrors.guardianName}
                />
              </div>

              <div>
                <Input
                  ref={phoneRef}
                  label={t("interest.phone")}
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder={t("interest.phonePlaceholder")}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    }
                  }}
                  error={fieldErrors.phone}
                />
                <small
                  style={{ color: "#71717A", marginTop: 4, display: "block" }}
                >
                  {t("interest.phoneHelper")}
                </small>
              </div>

              <div>
                <Input
                  label={t("interest.email")}
                  type="email"
                  autoComplete="email"
                  placeholder={t("interest.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Input
                  ref={ageRef}
                  label={t("interest.childAge")}
                  required
                  type="number"
                  min={3}
                  max={18}
                  step={1}
                  placeholder={t("interest.childAgePlaceholder")}
                  value={childAge}
                  onChange={(e) => {
                    setChildAge(e.target.value);
                    if (fieldErrors.childAge) {
                      setFieldErrors((prev) => ({ ...prev, childAge: "" }));
                    }
                  }}
                  error={fieldErrors.childAge}
                />
                <small
                  style={{ color: "#71717A", marginTop: 4, display: "block" }}
                >
                  {t("interest.childAgeHelper")}
                </small>
              </div>

              <div>
                <label
                  htmlFor={offeringSelectId}
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#18181B",
                  }}
                >
                  {t("interest.offering")}
                </label>
                <select
                  id={offeringSelectId}
                  value={selectedOfferingId}
                  disabled={loadingOfferings}
                  onChange={(e) => setSelectedOfferingId(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 44,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #D4D4D8",
                    backgroundColor: "#FFFFFF",
                    fontSize: "0.9375rem",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">{t("interest.offeringGeneral")}</option>
                  {offerings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.programme.name}
                      {item.venue?.name ? ` — ${item.venue.name}` : ""})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 8 }}>
                <Checkbox
                  id="interest-privacy-consent"
                  required
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (fieldErrors.consent) {
                      setFieldErrors((prev) => ({ ...prev, consent: "" }));
                    }
                  }}
                  error={fieldErrors.consent}
                  label={
                    <span data-i18n-static="bilingual">
                      I have read the{" "}
                      <Link href="/privacy" target="_blank">
                        Privacy Policy
                      </Link>{" "}
                      and consent to KHLIM using my name and contact details to
                      follow up on this Academy enquiry. I understand this does
                      not subscribe me to marketing. / Saya telah membaca{" "}
                      <Link href="/privacy" target="_blank">
                        Dasar Privasi
                      </Link>{" "}
                      dan bersetuju KHLIM menggunakan nama dan maklumat
                      perhubungan saya untuk membuat susulan mengenai pertanyaan
                      Akademi ini. Saya faham ini tidak mendaftarkan saya untuk
                      pemasaran.
                    </span>
                  }
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={submitting}
                  style={{ width: "100%", minHeight: 48 }}
                >
                  {submitting ? t("interest.submitting") : t("interest.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

export default function InterestPage() {
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <Suspense
        fallback={
          <main
            aria-busy="true"
            style={{ flex: 1, padding: 48, textAlign: "center" }}
          />
        }
      >
        <InterestForm />
      </Suspense>
      <PublicFooter />
    </div>
  );
}
