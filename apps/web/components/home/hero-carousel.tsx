"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { buildUrlWithSource } from "../../lib/campaign-source";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface HeroCarouselSlide {
  id: string;
  imageUrl?: string;
  imageUrlMobile?: string;
  photoLabel: string;
  placeholderGradient: string;
  showPlaceholderLabel?: boolean;
}

export interface HeroCarouselProps {
  slides: HeroCarouselSlide[];
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCtaLabel?: string;
  secondaryCtaLabel: string;
  source?: string | null;
  pathwayBadge?: string;
  venueBadge?: string;
}

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD_PX = 48;

export function HeroCarousel({
  slides,
  eyebrow,
  title,
  subtitle,
  secondaryCtaLabel,
  source,
  pathwayBadge,
  venueBadge,
}: HeroCarouselProps) {
  const { t } = useI18n();
  const safeSlides = useMemo(() => (slides.length > 0 ? slides : []), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [loadedIndices, setLoadedIndices] = useState<number[]>([0]);
  const touchStartX = useRef<number | null>(null);

  const markSlideLoaded = (index: number) => {
    setLoadedIndices((current) => {
      if (current.includes(index)) return current;
      return [...current, index];
    });
  };

  const goTo = (index: number) => {
    if (safeSlides.length === 0) return;
    const normalized = (index + safeSlides.length) % safeSlides.length;
    markSlideLoaded(normalized);
    markSlideLoaded((normalized + 1) % safeSlides.length);
    setActiveIndex(normalized);
  };

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    const timer = window.setTimeout(() => {
      setLoadedIndices(safeSlides.map((_, i) => i));
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [safeSlides.length]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(media.matches);
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (safeSlides.length <= 1 || isPaused || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % safeSlides.length;
        markSlideLoaded(next);
        markSlideLoaded((next + 1) % safeSlides.length);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, prefersReducedMotion, safeSlides.length]);

  const firstSlide = safeSlides[0];

  return (
    <section
      className="home-hero-carousel"
      aria-roledescription="carousel"
      aria-label={t("home.hero.carouselLabel")}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const delta = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
        goTo(activeIndex + (delta < 0 ? 1 : -1));
      }}
    >
      {firstSlide?.imageUrlMobile && (
        <link
          rel="preload"
          as="image"
          href={firstSlide.imageUrlMobile}
          media="(max-width: 768px)"
        />
      )}
      {firstSlide?.imageUrl && (
        <link
          rel="preload"
          as="image"
          href={firstSlide.imageUrl}
          media={firstSlide.imageUrlMobile ? "(min-width: 769px)" : undefined}
        />
      )}
      <div className="home-hero-carousel-track" aria-live="off">
        {safeSlides.map((slide, index) => {
          const isActive = index === activeIndex;
          const isLoaded = loadedIndices.includes(index);
          const bgDesktop =
            isLoaded && slide.imageUrl
              ? `linear-gradient(90deg, rgba(9, 9, 11, 0.82) 0%, rgba(9, 9, 11, 0.42) 50%, rgba(9, 9, 11, 0.3) 100%), url("${slide.imageUrl}")`
              : `linear-gradient(90deg, rgba(9, 9, 11, 0.76), rgba(9, 9, 11, 0.44), rgba(9, 9, 11, 0.72)), ${slide.placeholderGradient}`;
          const bgMobile =
            isLoaded && slide.imageUrlMobile
              ? `linear-gradient(180deg, rgba(9, 9, 11, 0.72) 0%, rgba(9, 9, 11, 0.36) 50%, rgba(9, 9, 11, 0.86) 100%), url("${slide.imageUrlMobile}")`
              : bgDesktop;

          return (
            <div
              key={slide.id}
              className={`home-hero-slide${isActive ? " is-active" : ""}`}
              aria-hidden={!isActive}
              style={
                {
                  "--hero-bg-desktop": bgDesktop,
                  "--hero-bg-mobile": bgMobile,
                } as React.CSSProperties
              }
            >
              {!slide.imageUrl && slide.showPlaceholderLabel !== false && (
                <div className="home-photo-placeholder-label">
                  {t("home.photoSlot", { label: slide.photoLabel })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="home-hero-overlay">
        <div className="home-hero-content">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <Badge variant="brand" size="md">
              {eyebrow}
            </Badge>
            {pathwayBadge && (
              <Badge variant="neutral" size="md">
                {pathwayBadge}
              </Badge>
            )}
            {venueBadge && (
              <Badge
                variant="neutral"
                size="md"
                style={{
                  whiteSpace: "normal",
                  maxWidth: "100%",
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {venueBadge}
              </Badge>
            )}
          </div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <div className="home-hero-actions">
            <Link
              href={buildUrlWithSource("/interest", source)}
              style={{ textDecoration: "none" }}
            >
              <Button variant="primary" size="lg">
                {t("nav.registerInterest")}
              </Button>
            </Link>
            <Link
              href={buildUrlWithSource("/programmes", source)}
              style={{ textDecoration: "none" }}
            >
              <Button variant="outline" size="lg">
                {secondaryCtaLabel}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {safeSlides.length > 1 && (
        <>
          <button
            type="button"
            className="home-carousel-arrow home-carousel-arrow-left"
            aria-label={t("home.hero.previousPhoto")}
            onClick={() => goTo(activeIndex - 1)}
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            ‹
          </button>
          <button
            type="button"
            className="home-carousel-arrow home-carousel-arrow-right"
            aria-label={t("home.hero.nextPhoto")}
            onClick={() => goTo(activeIndex + 1)}
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            ›
          </button>
          <div
            className="home-carousel-dots"
            role="group"
            aria-label={t("home.hero.choosePhoto")}
          >
            {safeSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={t("home.hero.showPhoto", {
                  count: index + 1,
                  label: slide.photoLabel,
                })}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goTo(index)}
                style={{
                  width: "44px",
                  height: "44px",
                  display: "inline-flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  className={`home-carousel-dot${index === activeIndex ? " is-active" : ""}`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
