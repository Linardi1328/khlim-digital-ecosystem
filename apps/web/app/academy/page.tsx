"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isFeatureNotAvailableError } from "@khlim/api-client";
import { apiService } from "../../lib/api-service";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../../lib/campaign-source";
import { trackCampaignLanding } from "../../lib/posthog";
import { useAnalyticsConsent } from "../../lib/analytics-consent";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { TrainingSessionsSection } from "../../components/academy/training-sessions-section";
import { ProgrammeCatalogueSection } from "../../components/academy/programme-catalogue-section";
import type { AcademyAvailabilityState } from "../../components/academy/published-registration-sessions";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { getButtonStyles } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { canRenderYouthMedia } from "../../lib/editorial-content";
import { resolveLocalVisualReviewImageUrl } from "../../lib/local-visual-review-media";
import { useI18n } from "../../lib/i18n-context";

function AcademyContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const [storedCampaign, setStoredCampaign] = useState<string | null>(null);
  const [availabilityState, setAvailabilityState] =
    useState<AcademyAvailabilityState>({ status: "loading" });

  const loadAvailability = useCallback(async () => {
    setAvailabilityState({ status: "loading" });
    try {
      const [config, sessionsResponse] = await Promise.all([
        apiService.getAcademyRegistrationConfig(),
        apiService.listPublicAcademySessions(),
      ]);

      if (!config.registrationOpen || !sessionsResponse.registrationOpen) {
        setAvailabilityState({ status: "closed", config });
        return;
      }

      if (!sessionsResponse.items || sessionsResponse.items.length === 0) {
        setAvailabilityState({ status: "empty", config });
        return;
      }

      setAvailabilityState({
        status: "open",
        config,
        sessions: sessionsResponse.items,
      });
    } catch (error) {
      setAvailabilityState(
        isFeatureNotAvailableError(error)
          ? { status: "deferred" }
          : { status: "error" },
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const [config, sessionsResponse] = await Promise.all([
          apiService.getAcademyRegistrationConfig(),
          apiService.listPublicAcademySessions(),
        ]);
        if (!active) return;
        if (!config.registrationOpen || !sessionsResponse.registrationOpen) {
          setAvailabilityState({ status: "closed", config });
          return;
        }
        if (!sessionsResponse.items || sessionsResponse.items.length === 0) {
          setAvailabilityState({ status: "empty", config });
          return;
        }
        setAvailabilityState({
          status: "open",
          config,
          sessions: sessionsResponse.items,
        });
      } catch (error) {
        if (!active) return;
        setAvailabilityState(
          isFeatureNotAvailableError(error)
            ? { status: "deferred" }
            : { status: "error" },
        );
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const isRegistrationOpen = availabilityState.status === "open";

  useEffect(() => {
    setStoredCampaign(resolveCampaignSource(searchParams));
  }, [searchParams]);

  const { hasConsent } = useAnalyticsConsent();
  const campaignSource = queryCampaign ?? storedCampaign;
  const registerHref = buildUrlWithSource("/academy/register", campaignSource);
  const interestHref = buildUrlWithSource("/interest", campaignSource);

  useEffect(() => {
    if (hasConsent && campaignSource) {
      void trackCampaignLanding(campaignSource, "/academy");
    }
  }, [hasConsent, campaignSource]);

  const coaches = useMemo(
    () => [
      {
        id: "seng-jun",
        name: t("academy.coaches.sengJun.name"),
        role: t("academy.coaches.role"),
        bio: t("academy.coaches.sengJun.bio"),
        imageUrl: "/media/coaches/seng-jun.webp",
        alt: `${t("academy.coaches.sengJun.name")} — ${t("brand.academy")}`,
      },
      {
        id: "jia-xuan",
        name: t("academy.coaches.jiaXuan.name"),
        role: t("academy.coaches.role"),
        bio: t("academy.coaches.genericBio"),
        imageUrl: "/media/coaches/jia-xuan.webp",
        alt: `${t("academy.coaches.jiaXuan.name")} — ${t("brand.academy")}`,
      },
      {
        id: "puimann",
        name: t("academy.coaches.puimann.name"),
        role: t("academy.coaches.role"),
        bio: t("academy.coaches.genericBio"),
        imageUrl: "/media/coaches/puimann.webp",
        alt: `${t("academy.coaches.puimann.name")} — ${t("brand.academy")}`,
      },
      {
        id: "woon",
        name: t("academy.coaches.woon.name"),
        role: t("academy.coaches.role"),
        bio: t("academy.coaches.genericBio"),
        imageUrl: "/media/coaches/woon.webp",
        alt: `${t("academy.coaches.woon.name")} — ${t("brand.academy")}`,
      },
    ],
    [t],
  );

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader campaignSource={campaignSource} />
      <main className="academy-main">
        {/* Above-the-fold Hero / Introduction */}
        <section className="academy-section" style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <Badge variant="brand">{t("academy.badge")}</Badge>
            <Badge variant="neutral">{t("academy.pathway.badge")}</Badge>
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              margin: "0 0 16px",
              letterSpacing: "-0.03em",
            }}
          >
            {t("academy.title")}
          </h1>
          <p
            style={{
              color: "#71717a",
              maxWidth: 680,
              margin: "0 auto 24px",
              fontSize: "1.05rem",
              lineHeight: 1.6,
            }}
          >
            {t("academy.intro")}
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {isRegistrationOpen ? (
              <>
                <Link
                  href={registerHref}
                  data-testid="academy-hero-register-now"
                  style={getButtonStyles("primary", "lg")}
                >
                  {t("academyReg.sessions.registerNow")}
                </Link>
                <a
                  href="#training-sessions"
                  style={getButtonStyles("outline", "lg")}
                >
                  {t("academy.trainingSessionsCta")}
                </a>
                <Link
                  href={interestHref}
                  data-testid="academy-hero-register-interest-secondary"
                  style={getButtonStyles("outline", "lg")}
                >
                  {t("nav.registerInterest")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={buildUrlWithSource("/interest", campaignSource)}
                  style={getButtonStyles("primary", "lg")}
                >
                  {t("nav.registerInterest")}
                </Link>
                <a
                  href="#training-sessions"
                  style={getButtonStyles("outline", "lg")}
                >
                  {t("academy.trainingSessionsCta")}
                </a>
                <a href="#programmes" style={getButtonStyles("outline", "lg")}>
                  {t("academy.programmesCta")}
                </a>
              </>
            )}
          </div>
        </section>

        {/* Training Sessions and Venue */}
        <TrainingSessionsSection
          campaignSource={campaignSource}
          availabilityState={availabilityState}
          onRetryAvailability={() => void loadAvailability()}
        />

        {/* U9 / U12 / U15 Development Pathway */}
        <section
          id="development-pathway"
          data-testid="academy-pathway-overview"
          style={{ marginBottom: 52 }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span
              style={{
                color: "#b45309",
                fontSize: "0.8rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {t("academy.pathway.badge")}
            </span>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
                margin: "8px 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              {t("academy.pathway.title")}
            </h2>
            <p
              style={{
                color: "#71717a",
                maxWidth: 640,
                margin: "0 auto",
                fontSize: "0.95rem",
              }}
            >
              {t("academy.pathway.subtitle")}
            </p>
          </div>
          <div style={{ maxWidth: 860, margin: "0 auto 24px" }}>
            <Alert variant="info" role="note">
              {t("programmes.pathway.disclaimer")}
            </Alert>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            <Card style={{ padding: 24 }}>
              <Badge variant="brand" size="sm" style={{ marginBottom: 12 }}>
                {t("academy.pathway.u9.badge")}
              </Badge>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>
                {t("academy.pathway.u9.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.pathway.u9.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <Badge variant="brand" size="sm" style={{ marginBottom: 12 }}>
                {t("academy.pathway.u12.badge")}
              </Badge>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>
                {t("academy.pathway.u12.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.pathway.u12.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <Badge variant="brand" size="sm" style={{ marginBottom: 12 }}>
                {t("academy.pathway.u15.badge")}
              </Badge>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>
                {t("academy.pathway.u15.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.pathway.u15.body")}
              </p>
            </Card>
          </div>
        </section>

        {/* Live Authoritative Programme Catalogue */}
        <ProgrammeCatalogueSection campaignSource={campaignSource} />

        {/* Existing Truthful Trust Signals */}
        <section style={{ marginBottom: 52 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
                {t("academy.playerDevelopment.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.playerDevelopment.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
                {t("academy.teamStandards.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.teamStandards.body")}
              </p>
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
                {t("academy.familyVisibility.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {t("academy.familyVisibility.body")}
              </p>
            </Card>
          </div>

          <Card style={{ marginTop: 24, padding: 28 }}>
            {/* Youth squad training photography renders only when youth media rights are explicitly confirmed
                (or during explicitly enabled localhost-only development visual review) */}
            {(() => {
              const showConsentedTrainingGroup = canRenderYouthMedia({
                imageUrl: "/media/khlim/training-group-1280.webp",
                photoRightsVerified: true,
              });
              const localReviewTrainingGroupUrl = showConsentedTrainingGroup
                ? undefined
                : resolveLocalVisualReviewImageUrl(
                    "/media/khlim/training-group-1280.webp",
                  );

              if (!showConsentedTrainingGroup && !localReviewTrainingGroupUrl) {
                return null;
              }

              return (
                <div
                  data-testid="academy-training-group-photo"
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "4 / 3",
                    borderRadius: 12,
                    overflow: "hidden",
                    margin: "0 0 24px",
                    border: "1px solid #e4e4e7",
                    background: "#18181b",
                  }}
                >
                  {showConsentedTrainingGroup ? (
                    <Image
                      src="/media/khlim/training-group-1280.webp"
                      alt={t("academy.training.alt")}
                      fill
                      sizes="(max-width: 768px) 100vw, 1100px"
                      style={{ objectFit: "contain", objectPosition: "center" }}
                    />
                  ) : (
                    <img
                      src={localReviewTrainingGroupUrl}
                      alt={t("academy.training.alt")}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                        display: "block",
                      }}
                    />
                  )}
                </div>
              );
            })()}

            <div
              data-testid="academy-training-fallback"
              style={{
                position: "relative",
                width: "100%",
                borderRadius: 12,
                overflow: "hidden",
                margin: "0 0 24px",
                border: "1px solid #e4e4e7",
                background:
                  "radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.15), transparent 45%), linear-gradient(135deg, #18181b 0%, #27272a 60%, #3f2d0b 100%)",
                padding: "32px 24px",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <Image
                src="/media/brand/academy-crest.webp"
                alt={t("brand.academy")}
                width={64}
                height={75}
                style={{ objectFit: "contain", flexShrink: 0 }}
              />

              <div>
                <span
                  style={{
                    color: "#f59e0b",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {t("academy.badge")}
                </span>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  {t("academy.teamStandards.title")}
                </div>
                <p
                  style={{
                    color: "#d4d4d8",
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {t("academy.teamStandards.body")}
                </p>
              </div>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
              {t("academy.coaching.title")}
            </h3>
            <p
              style={{
                color: "#71717a",
                margin: "0 0 20px",
                fontSize: "0.92rem",
                lineHeight: 1.6,
              }}
            >
              {t("academy.coaching.body")}
            </p>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
              {t("academy.venues.title")}
            </h3>
            <p
              style={{
                color: "#71717a",
                margin: "0 0 20px",
                fontSize: "0.92rem",
                lineHeight: 1.6,
              }}
            >
              {t("academy.venues.body")}
            </p>
            <a href="#programmes" style={getButtonStyles("outline", "md")}>
              {t("academy.programmesCta")}
            </a>
          </Card>
        </section>

        {/* Meet Our Coaches Section */}
        <section
          style={{ marginBottom: 52 }}
          aria-labelledby="academy-coaches-title"
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span
              style={{
                color: "#b45309",
                fontSize: "0.8rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {t("academy.coaches.eyebrow")}
            </span>
            <h2
              id="academy-coaches-title"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
                margin: "8px 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              {t("academy.coaches.title")}
            </h2>
            <p
              style={{
                color: "#71717a",
                maxWidth: 640,
                margin: "0 auto",
                fontSize: "0.95rem",
                lineHeight: 1.6,
              }}
            >
              {t("academy.coaches.subtitle")}
            </p>
          </div>

          <div className="academy-coaches-grid">
            {coaches.map((coach) => (
              <Card
                key={coach.id}
                style={{
                  overflow: "hidden",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid #e4e4e7",
                  borderRadius: 16,
                  background: "#ffffff",
                  boxShadow: "0 10px 30px rgba(24, 24, 27, 0.05)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "4 / 5",
                    overflow: "hidden",
                    background: "#18181b",
                  }}
                >
                  <Image
                    src={coach.imageUrl}
                    alt={coach.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    style={{
                      objectFit: "cover",
                      objectPosition: "center top",
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.05rem",
                        fontWeight: 800,
                        color: "#18181b",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {coach.name}
                    </h3>
                    <Badge variant="brand" size="sm">
                      {coach.role}
                    </Badge>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "0.85rem",
                      lineHeight: 1.55,
                      color: "#71717a",
                      flex: 1,
                    }}
                  >
                    {coach.bio}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* What happens next */}
        <section className="academy-section" data-testid="academy-next-steps">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2
              style={{
                fontSize: "clamp(1.65rem, 3vw, 2.35rem)",
                margin: "0 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              {t("academy.nextSteps.title")}
            </h2>
            <p
              style={{
                color: "#71717a",
                maxWidth: 640,
                margin: "0 auto",
                fontSize: "0.95rem",
              }}
            >
              {isRegistrationOpen
                ? t("academyReg.academyOpen.nextStepsSubtitle")
                : t("academy.nextSteps.subtitle")}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#fffbeb",
                  color: "#b45309",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  marginBottom: 12,
                }}
              >
                1
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>
                {isRegistrationOpen
                  ? t("academyReg.academyOpen.nextSteps.step1.title")
                  : t("academy.nextSteps.step1.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {isRegistrationOpen
                  ? t("academyReg.academyOpen.nextSteps.step1.body")
                  : t("academy.nextSteps.step1.body")}
              </p>
            </Card>
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#fffbeb",
                  color: "#b45309",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  marginBottom: 12,
                }}
              >
                2
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>
                {isRegistrationOpen
                  ? t("academyReg.academyOpen.nextSteps.step2.title")
                  : t("academy.nextSteps.step2.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {isRegistrationOpen
                  ? t("academyReg.academyOpen.nextSteps.step2.body")
                  : t("academy.nextSteps.step2.body")}
              </p>
            </Card>
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#fffbeb",
                  color: "#b45309",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  marginBottom: 12,
                }}
              >
                3
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>
                {isRegistrationOpen
                  ? t("academyReg.academyOpen.nextSteps.step3.title")
                  : t("academy.nextSteps.step3.title")}
              </h3>
              <p
                style={{
                  color: "#71717a",
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                {isRegistrationOpen
                  ? t("academyReg.academyOpen.nextSteps.step3.body")
                  : t("academy.nextSteps.step3.body")}
              </p>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section
          data-testid="academy-final-cta"
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "#f4f4f5",
            borderRadius: 20,
            border: "1px solid #e4e4e7",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            {isRegistrationOpen
              ? t("academyReg.academyOpen.finalCtaTitle")
              : t("academy.finalCta.title")}
          </h2>
          <p
            style={{
              color: "#71717a",
              maxWidth: 560,
              margin: "0 auto 24px",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
          >
            {isRegistrationOpen
              ? t("academyReg.academyOpen.finalCtaBody")
              : t("academy.finalCta.body")}
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {isRegistrationOpen ? (
              <>
                <Link
                  href={registerHref}
                  data-testid="academy-final-register-now"
                  style={getButtonStyles("primary", "lg")}
                >
                  {t("academyReg.sessions.registerNow")}
                </Link>
                <Link
                  href={interestHref}
                  style={getButtonStyles("outline", "lg")}
                >
                  {t("nav.registerInterest")}
                </Link>
              </>
            ) : (
              <Link
                href={interestHref}
                style={getButtonStyles("primary", "lg")}
              >
                {t("nav.registerInterest")}
              </Link>
            )}
          </div>
        </section>
      </main>
      <PublicFooter campaignSource={campaignSource} />
    </div>
  );
}

export default function AcademyPage() {
  return (
    <Suspense
      fallback={<div aria-busy="true" style={{ minHeight: "100vh" }} />}
    >
      <AcademyContent />
    </Suspense>
  );
}
