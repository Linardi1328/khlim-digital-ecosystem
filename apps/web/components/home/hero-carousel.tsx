"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface HeroCarouselSlide {
  id: string;
  imageUrl?: string;
  photoLabel: string;
  placeholderGradient: string;
}

export interface HeroCarouselProps {
  slides: HeroCarouselSlide[];
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD_PX = 48;

export function HeroCarousel({
  slides,
  eyebrow,
  title,
  subtitle,
  primaryCtaLabel,
  secondaryCtaLabel,
}: HeroCarouselProps) {
  const safeSlides = useMemo(() => (slides.length > 0 ? slides : []), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = (index: number) => {
    if (safeSlides.length === 0) return;
    const normalized = (index + safeSlides.length) % safeSlides.length;
    setActiveIndex(normalized);
  };

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
      setActiveIndex((current) => (current + 1) % safeSlides.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, prefersReducedMotion, safeSlides.length]);

  if (safeSlides.length === 0) return null;

  return (
    <section
      className="home-hero-carousel"
      aria-roledescription="carousel"
      aria-label="KHLIM academy photo highlights"
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
      <div className="home-hero-carousel-track" aria-live="off">
        {safeSlides.map((slide, index) => {
          const isActive = index === activeIndex;
          const backgroundImage = slide.imageUrl
            ? `linear-gradient(90deg, rgba(9, 9, 11, 0.78), rgba(9, 9, 11, 0.48), rgba(9, 9, 11, 0.65)), url("${slide.imageUrl}")`
            : `linear-gradient(90deg, rgba(9, 9, 11, 0.76), rgba(9, 9, 11, 0.44), rgba(9, 9, 11, 0.72)), ${slide.placeholderGradient}`;

          return (
            <div
              key={slide.id}
              className={`home-hero-slide${isActive ? " is-active" : ""}`}
              aria-hidden={!isActive}
              style={{ backgroundImage }}
            >
              {!slide.imageUrl && (
                <div className="home-photo-placeholder-label">
                  Photo slot · {slide.photoLabel}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="home-hero-overlay">
        <div className="home-hero-content">
          <Badge variant="brand" size="md">
            {eyebrow}
          </Badge>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <div className="home-hero-actions">
            <Link href="/enrol" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                {primaryCtaLabel}
              </Button>
            </Link>
            <Link href="/programmes" style={{ textDecoration: "none" }}>
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
            aria-label="Show previous academy photo"
            onClick={() => goTo(activeIndex - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="home-carousel-arrow home-carousel-arrow-right"
            aria-label="Show next academy photo"
            onClick={() => goTo(activeIndex + 1)}
          >
            ›
          </button>
          <div
            className="home-carousel-dots"
            role="group"
            aria-label="Choose academy photo"
          >
            {safeSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={`home-carousel-dot${index === activeIndex ? " is-active" : ""}`}
                aria-label={`Show academy photo ${index + 1}: ${slide.photoLabel}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
