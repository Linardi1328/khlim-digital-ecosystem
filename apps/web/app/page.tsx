"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../lib/api-service";
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
  return t("programmes.ageEligibilityVaries");
}

export default function HomePage() {
  const { t } = useI18n();
  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getPublicOfferings()
      .then(setOfferings)
      .catch(() => setOfferings([]))
      .finally(() => setLoading(false));
  }, []);

  const heroSlides: HeroCarouselSlide[] = [
    {
      id: "academy-first",
      photoLabel: t("home.hero.photo.training"),
      showPlaceholderLabel: false,
      placeholderGradient:
        "radial-gradient(circle at 76% 24%, rgba(245, 158, 11, 0.36), transparent 18%), radial-gradient(circle at 78% 72%, rgba(245, 158, 11, 0.14), transparent 24%), linear-gradient(135deg, #09090b 0%, #18181b 48%, #2a1d08 100%)",
    },
  ];

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <main style={{ flex: 1 }}>
        <HeroCarousel
          slides={heroSlides}
          eyebrow={t("home.academyHero.eyebrow")}
          title={t("home.academyHero.title")}
          subtitle={t("home.academyHero.subtitle")}
          primaryCtaLabel={t("hero.cta.join")}
          secondaryCtaLabel={t("hero.cta.explore")}
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
                <Card key={offering.id}>
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
                  <CardFooter>
                    <Link
                      href={`/programmes/${offering.id}`}
                      style={{ width: "100%" }}
                    >
                      <Button variant="outline" style={{ width: "100%" }}>
                        {t("programmes.viewDetails")}
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
            <Link href="/programmes" style={{ textDecoration: "none" }}>
              <Button variant="outline" size="lg">
                {t("hero.cta.explore")}
              </Button>
            </Link>
            <Link href="/enrol" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                {t("hero.cta.join")}
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
