"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiService } from "../lib/api-service";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../lib/campaign-source";
import { trackCampaignLanding } from "../lib/posthog";
import { useAnalyticsConsent } from "../lib/analytics-consent";
import { useI18n } from "../lib/i18n-context";
import type { PublicOfferingItem } from "../lib/types";
import { AcademyPillarsSection } from "../components/home/academy-pillars-section";
import { AchievementsSection } from "../components/home/achievements-section";
import {
  HeroCarousel,
  type HeroCarouselSlide,
} from "../components/home/hero-carousel";
import { KheroSection } from "../components/home/khero-section";
import { PlayerSpotlightSection } from "../components/home/player-spotlight-section";
import { PublicFooter } from "../components/layout/public-footer";
import { PublicHeader } from "../components/layout/public-header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

function ageLabel(
  offering: PublicOfferingItem,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const minimum = offering.programme.minimumAge;
  const maximum = offering.programme.maximumAge;
  if (minimum !== null && maximum !== null) {
    return t("programmes.ageRange", { minimum, maximum });
  }
  if (minimum !== null) return t("programmes.minimumAge", { minimum });
  if (maximum !== null) return t("programmes.maximumAge", { maximum });
  return t("programmes.ageEligibilityVaries");
}

function HomeContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const [storedCampaign, setStoredCampaign] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStoredCampaign(resolveCampaignSource(searchParams));
  }, [searchParams]);

  const { hasConsent } = useAnalyticsConsent();
  const campaignSource = queryCampaign ?? storedCampaign;

  useEffect(() => {
    if (hasConsent && campaignSource) {
      void trackCampaignLanding(campaignSource, "/");
    }
  }, [hasConsent, campaignSource]);

  useEffect(() => {
    apiService
      .getPublicOfferings()
      .then(setOfferings)
      .catch(() => setOfferings([]))
      .finally(() => setLoading(false));
  }, []);

  const activeBasketballVenueName = offerings
    .find(
      (o) =>
        o.programme.sport.code === "BASKETBALL" &&
        Boolean(o.venue?.name?.trim()),
    )
    ?.venue?.name?.trim();

  const heroSlides: HeroCarouselSlide[] = [
    {
      id: "academy-first",
      // Approved responsive hero imagery: wide variant for desktop/tablet, full-frame variant for mobile portrait
      imageUrl: "/media/khlim/team-hero-wide-1920.webp",
      imageUrlMobile: "/media/khlim/team-hero-1920.webp",
      photoLabel: t("home.hero.photo.training"),
      showPlaceholderLabel: false,
      placeholderGradient:
        "radial-gradient(circle at 76% 24%, rgba(245, 158, 11, 0.36), transparent 18%), radial-gradient(circle at 78% 72%, rgba(245, 158, 11, 0.14), transparent 24%), linear-gradient(135deg, #09090b 0%, #18181b 48%, #2a1d08 100%)",
    },
    {
      id: "team-huddle",
      imageUrl: "/media/home/team-huddle-desktop.webp",
      imageUrlMobile: "/media/home/team-huddle-mobile.webp",
      photoLabel: t("home.hero.photo.coaching"),
      showPlaceholderLabel: false,
      placeholderGradient:
        "radial-gradient(circle at 35% 40%, rgba(245, 158, 11, 0.25), transparent 24%), linear-gradient(135deg, #18181b, #27272a 58%, #1f2937)",
    },
    {
      id: "sideline-energy",
      imageUrl: "/media/home/sideline-energy-desktop.webp",
      imageUrlMobile: "/media/home/sideline-energy-mobile.webp",
      photoLabel: t("home.hero.photo.gameDay"),
      showPlaceholderLabel: false,
      placeholderGradient:
        "radial-gradient(circle at 75% 24%, rgba(245, 158, 11, 0.28), transparent 24%), linear-gradient(135deg, #18181b, #3f2d0b 58%, #0f172a)",
    },
    {
      id: "court-together",
      imageUrl: "/media/home/court-together-desktop.webp",
      imageUrlMobile: "/media/home/court-together-mobile.webp",
      photoLabel: t("home.hero.photo.community"),
      showPlaceholderLabel: false,
      placeholderGradient:
        "radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.25), transparent 24%), linear-gradient(145deg, #111827, #27272a 58%, #4b3520)",
    },
  ];

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader campaignSource={campaignSource} />
      <main style={{ flex: 1 }}>
        <HeroCarousel
          slides={heroSlides}
          eyebrow={t("brand.academy")}
          title={t("home.academyHero.title")}
          subtitle={t("home.academyHero.subtitle")}
          primaryCtaLabel={t("hero.cta.join")}
          secondaryCtaLabel={t("hero.cta.explore")}
          source={campaignSource}
          pathwayBadge={t("home.academyHero.pathwayBadge")}
          venueBadge={activeBasketballVenueName}
        />

        <AcademyPillarsSection />

        <section className="home-programmes-section">
          <div className="home-section-heading">
            <span>{t("programmes.eyebrow")}</span>
            <h2>{t("programmes.title")}</h2>
            <p>{t("programmes.subtitle")}</p>
          </div>
          {loading ? (
            <p style={{ textAlign: "center" }}>
              {t("programmes.loadingOfferings")}
            </p>
          ) : offerings.length === 0 ? (
            <Card style={{ padding: 32, textAlign: "center" }}>
              {t("programmes.noPublishedOfferings")}
            </Card>
          ) : (
            <div className="home-programme-grid">
              {offerings.slice(0, 6).map((offering) => (
                <Card key={offering.id} className="khlim-offering-card">
                  <CardHeader>
                    <Badge variant="brand" size="sm">
                      {ageLabel(offering, t)}
                    </Badge>
                    <CardTitle>{offering.name}</CardTitle>
                    <CardDescription>
                      {offering.programme.description ??
                        offering.programme.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      {t("programmes.venueLabel")}:{" "}
                      {offering.venue?.name ?? t("common.toBeConfirmed")}
                    </p>
                    <p>
                      {t("programmes.termStartLabel")}:{" "}
                      {offering.startsOn ?? t("common.toBeConfirmed")}
                    </p>
                  </CardContent>
                  <CardFooter
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <Link
                      href={buildUrlWithSource(
                        `/programmes/${offering.id}`,
                        campaignSource,
                      )}
                      style={{ width: "100%" }}
                    >
                      <Button variant="outline" style={{ width: "100%" }}>
                        {t("programmes.viewDetails")}
                      </Button>
                    </Link>
                    <Link
                      href={buildUrlWithSource("/interest", campaignSource, {
                        offeringId: offering.id,
                      })}
                      style={{ width: "100%" }}
                    >
                      <Button variant="primary" style={{ width: "100%" }}>
                        {t("nav.registerInterest")}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <AchievementsSection />

        <PlayerSpotlightSection />

        <KheroSection />

        <section className="home-join-cta">
          <div>
            <span>{t("home.join.eyebrow")}</span>
            <h2>{t("home.join.title")}</h2>
            <p>{t("home.join.description")}</p>
          </div>
          <div className="home-join-cta-actions">
            <Link
              href={buildUrlWithSource("/interest", campaignSource)}
              style={{ textDecoration: "none" }}
            >
              <Button variant="primary" size="lg">
                {t("nav.registerInterest")}
              </Button>
            </Link>
            <Link
              href={buildUrlWithSource("/programmes", campaignSource)}
              style={{ textDecoration: "none" }}
            >
              <Button variant="outline" size="lg">
                {t("hero.cta.explore")}
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={<div aria-busy="true" style={{ minHeight: "100vh" }} />}
    >
      <HomeContent />
    </Suspense>
  );
}
