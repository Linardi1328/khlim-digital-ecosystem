"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../lib/api-service";
import { useI18n } from "../lib/i18n-context";
import type { PublicOfferingItem } from "../lib/types";
import { AchievementsSection } from "../components/home/achievements-section";
import {
  HeroCarousel,
  type HeroCarouselSlide,
} from "../components/home/hero-carousel";
import {
  PhotoGallery,
  PhotoStorySection,
  type PhotoGalleryItem,
  type PhotoStoryItem,
} from "../components/home/photo-gallery";
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
      id: "training-action",
      photoLabel: t("home.hero.photo.training"),
      imageUrl: "/media/khero/coming-soon.webp",
      placeholderGradient:
        "radial-gradient(circle at 72% 24%, rgba(245, 158, 11, 0.34), transparent 18%), linear-gradient(135deg, #27272a, #111827 50%, #3f2d0b)",
    },
    {
      id: "coach-player",
      photoLabel: t("home.hero.photo.coaching"),
      imageUrl: "/media/khero/meet-khero.webp",
      placeholderGradient:
        "radial-gradient(circle at 28% 42%, rgba(245, 158, 11, 0.28), transparent 22%), linear-gradient(125deg, #18181b, #292524 58%, #0f172a)",
    },
    {
      id: "team-community",
      photoLabel: t("home.hero.photo.community"),
      imageUrl: "/media/khero/khero-meaning.webp",
      placeholderGradient:
        "radial-gradient(circle at 70% 55%, rgba(251, 191, 36, 0.24), transparent 24%), linear-gradient(145deg, #0f172a, #27272a 56%, #3f3f46)",
    },
    {
      id: "game-energy",
      photoLabel: t("home.hero.photo.gameDay"),
      imageUrl: "/media/khero/khero-way.webp",
      placeholderGradient:
        "radial-gradient(circle at 34% 25%, rgba(245, 158, 11, 0.3), transparent 20%), linear-gradient(120deg, #18181b, #3f3f46 52%, #292524)",
    },
  ];

  const photoStories: PhotoStoryItem[] = [
    {
      id: "purposeful-practice",
      eyebrow: t("home.story.development.eyebrow"),
      title: t("home.story.development.title"),
      description: t("home.story.development.description"),
      photoLabel: t("home.story.development.photoLabel"),
      imageUrl: "/media/khero/khero-way.webp",
      placeholderGradient:
        "radial-gradient(circle at 68% 40%, rgba(245, 158, 11, 0.34), transparent 22%), linear-gradient(120deg, #18181b, #3f3f46 58%, #171717)",
    },
    {
      id: "grow-through-game",
      eyebrow: t("home.story.community.eyebrow"),
      title: t("home.story.community.title"),
      description: t("home.story.community.description"),
      photoLabel: t("home.story.community.photoLabel"),
      imageUrl: "/media/khero/meet-khero.webp",
      placeholderGradient:
        "radial-gradient(circle at 28% 55%, rgba(251, 191, 36, 0.28), transparent 24%), linear-gradient(135deg, #0f172a, #27272a 58%, #3f2d0b)",
    },
  ];

  const galleryItems: PhotoGalleryItem[] = [
    {
      id: "gallery-1",
      photoLabel: t("home.gallery.photo.ballHandling"),
      imageUrl: "/media/khero/coming-soon.webp",
      placeholderGradient: "linear-gradient(135deg, #27272a, #4b3520)",
    },
    {
      id: "gallery-2",
      photoLabel: t("home.gallery.photo.coaching"),
      imageUrl: "/media/khero/meet-khero.webp",
      placeholderGradient: "linear-gradient(145deg, #18181b, #374151)",
    },
    {
      id: "gallery-3",
      photoLabel: t("home.gallery.photo.huddle"),
      imageUrl: "/media/khero/khero-meaning.webp",
      placeholderGradient: "linear-gradient(125deg, #3f3f46, #1f2937)",
    },
    {
      id: "gallery-4",
      photoLabel: t("home.gallery.photo.gameAction"),
      imageUrl: "/media/khero/khero-way.webp",
      placeholderGradient: "linear-gradient(140deg, #171717, #5b401c)",
    },
    {
      id: "gallery-5",
      photoLabel: t("home.gallery.photo.community"),
      imageUrl: "/media/khero/meet-khero.webp",
      placeholderGradient: "linear-gradient(130deg, #1f2937, #3f3f46)",
    },
    {
      id: "gallery-6",
      photoLabel: t("home.gallery.photo.development"),
      imageUrl: "/media/khero/khero-meaning.webp",
      placeholderGradient: "linear-gradient(150deg, #292524, #111827)",
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
          eyebrow={t("brand.academy")}
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          primaryCtaLabel={t("hero.cta.join")}
          secondaryCtaLabel={t("hero.cta.explore")}
        />

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

        {photoStories[0] && <PhotoStorySection item={photoStories[0]} />}

        <PlayerSpotlightSection />

        {photoStories.slice(1).map((item) => (
          <PhotoStorySection key={item.id} item={item} />
        ))}

        <PhotoGallery items={galleryItems} />

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
