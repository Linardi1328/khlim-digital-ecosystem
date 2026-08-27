"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../lib/api-service";
import { useI18n } from "../lib/i18n-context";
import type { PublicOfferingItem } from "../lib/types";
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

const heroSlides: HeroCarouselSlide[] = [
  {
    id: "training-action",
    photoLabel: "training action",
    placeholderGradient:
      "radial-gradient(circle at 72% 24%, rgba(245, 158, 11, 0.34), transparent 18%), linear-gradient(135deg, #27272a, #111827 50%, #3f2d0b)",
  },
  {
    id: "coach-player",
    photoLabel: "coach and player instruction",
    placeholderGradient:
      "radial-gradient(circle at 28% 42%, rgba(245, 158, 11, 0.28), transparent 22%), linear-gradient(125deg, #18181b, #292524 58%, #0f172a)",
  },
  {
    id: "team-community",
    photoLabel: "team and community moment",
    placeholderGradient:
      "radial-gradient(circle at 70% 55%, rgba(251, 191, 36, 0.24), transparent 24%), linear-gradient(145deg, #0f172a, #27272a 56%, #3f3f46)",
  },
  {
    id: "game-energy",
    photoLabel: "game-day energy",
    placeholderGradient:
      "radial-gradient(circle at 34% 25%, rgba(245, 158, 11, 0.3), transparent 20%), linear-gradient(120deg, #18181b, #3f3f46 52%, #292524)",
  },
];

const photoStories: PhotoStoryItem[] = [
  {
    id: "purposeful-practice",
    eyebrow: "Development",
    title: "Train with purpose.",
    description:
      "Use approved action photography here to show the pace, focus and detail of academy training without interrupting the registration journey.",
    photoLabel: "focused skills training",
    placeholderGradient:
      "radial-gradient(circle at 68% 40%, rgba(245, 158, 11, 0.34), transparent 22%), linear-gradient(120deg, #18181b, #3f3f46 58%, #171717)",
  },
  {
    id: "grow-through-game",
    eyebrow: "Community",
    title: "Grow through the game.",
    description:
      "This second visual story slot can feature team culture, coaching connection or a competition moment once the final KHLIM photo library is approved.",
    photoLabel: "team culture or competition",
    placeholderGradient:
      "radial-gradient(circle at 28% 55%, rgba(251, 191, 36, 0.28), transparent 24%), linear-gradient(135deg, #0f172a, #27272a 58%, #3f2d0b)",
  },
];

const galleryItems: PhotoGalleryItem[] = [
  {
    id: "gallery-1",
    photoLabel: "ball-handling close-up",
    placeholderGradient: "linear-gradient(135deg, #27272a, #4b3520)",
  },
  {
    id: "gallery-2",
    photoLabel: "coach instruction",
    placeholderGradient: "linear-gradient(145deg, #18181b, #374151)",
  },
  {
    id: "gallery-3",
    photoLabel: "team huddle",
    placeholderGradient: "linear-gradient(125deg, #3f3f46, #1f2937)",
  },
  {
    id: "gallery-4",
    photoLabel: "game action",
    placeholderGradient: "linear-gradient(140deg, #171717, #5b401c)",
  },
  {
    id: "gallery-5",
    photoLabel: "academy community",
    placeholderGradient: "linear-gradient(130deg, #1f2937, #3f3f46)",
  },
  {
    id: "gallery-6",
    photoLabel: "player development moment",
    placeholderGradient: "linear-gradient(150deg, #292524, #111827)",
  },
];

function ageLabel(offering: PublicOfferingItem): string {
  const minimum = offering.programme.minimumAge;
  const maximum = offering.programme.maximumAge;
  if (minimum !== null && maximum !== null) return `Ages ${minimum}–${maximum}`;
  if (minimum !== null) return `Age ${minimum}+`;
  return "Age eligibility varies";
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

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <main style={{ flex: 1 }}>
        <HeroCarousel
          slides={heroSlides}
          eyebrow="KHLIM Basketball Academy"
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          primaryCtaLabel={t("hero.cta.join")}
          secondaryCtaLabel={t("hero.cta.explore")}
        />

        <section className="home-programmes-section">
          <div className="home-section-heading">
            <span>Programmes</span>
            <h2>{t("programmes.title")}</h2>
            <p>{t("programmes.subtitle")}</p>
          </div>
          {loading ? (
            <p style={{ textAlign: "center" }}>
              Loading current academy offerings…
            </p>
          ) : offerings.length === 0 ? (
            <Card style={{ padding: 32, textAlign: "center" }}>
              No open programme offerings are currently published.
            </Card>
          ) : (
            <div className="home-programme-grid">
              {offerings.slice(0, 6).map((offering) => (
                <Card key={offering.id}>
                  <CardHeader>
                    <Badge variant="brand" size="sm">
                      {ageLabel(offering)}
                    </Badge>
                    <CardTitle>{offering.name}</CardTitle>
                    <CardDescription>
                      {offering.programme.description ??
                        offering.programme.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Venue: {offering.venue?.name ?? "To be confirmed"}</p>
                    <p>Term start: {offering.startsOn ?? "To be confirmed"}</p>
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

        {photoStories.map((item) => (
          <PhotoStorySection key={item.id} item={item} />
        ))}

        <PhotoGallery items={galleryItems} />

        <section className="home-join-cta">
          <div>
            <span>Ready when you are</span>
            <h2>Find the right KHLIM programme.</h2>
            <p>
              Browse currently published offerings first, then continue into the
              secure enrolment flow when your family is ready.
            </p>
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
