"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { Button } from "../ui/button";

const posters = [
  {
    id: "meaning",
    src: "/media/khero/khero-meaning.webp",
    altKey: "home.khero.poster.meaning",
  },
  {
    id: "way",
    src: "/media/khero/khero-way.webp",
    altKey: "home.khero.poster.way",
  },
  {
    id: "meet",
    src: "/media/khero/meet-khero.webp",
    altKey: "home.khero.poster.meet",
  },
  {
    id: "coming",
    src: "/media/khero/coming-soon.webp",
    altKey: "home.khero.poster.coming",
  },
] as const;

export function KheroSection() {
  const { t } = useI18n();

  return (
    <section className="home-khero-section" aria-labelledby="home-khero-title">
      <div className="home-khero-heading">
        <span>{t("home.khero.eyebrow")}</span>
        <h2 id="home-khero-title">{t("home.khero.title")}</h2>
        <p>{t("home.khero.description")}</p>
      </div>

      <div className="home-khero-poster-grid">
        {posters.map((poster, index) => (
          <figure
            key={poster.id}
            className={`home-khero-poster home-khero-poster-${index + 1}`}
          >
            <img
              src={poster.src}
              alt={t(poster.altKey)}
              loading={index === 0 ? "eager" : "lazy"}
            />
          </figure>
        ))}
      </div>

      <div className="home-khero-points" id="khero-points">
        <div className="home-khero-points-copy">
          <span>{t("home.khero.points.eyebrow")}</span>
          <h3>{t("home.khero.points.title")}</h3>
          <p>{t("home.khero.points.description")}</p>
          <div className="home-khero-points-list" role="list">
            <div role="listitem">
              <span className="home-khero-point-index">01</span>
              <strong>{t("home.khero.points.training")}</strong>
            </div>
            <div role="listitem">
              <span className="home-khero-point-index">02</span>
              <strong>{t("home.khero.points.teamwork")}</strong>
            </div>
            <div role="listitem">
              <span className="home-khero-point-index">03</span>
              <strong>{t("home.khero.points.progress")}</strong>
            </div>
          </div>
          <Link href="/portal" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="lg">
              {t("home.khero.points.cta")}
            </Button>
          </Link>
        </div>

        <div className="home-khero-points-visual" aria-hidden="true">
          <div className="home-khero-coin home-khero-coin-main">K</div>
          <div className="home-khero-coin home-khero-coin-small">+</div>
          <div className="home-khero-orbit home-khero-orbit-one" />
          <div className="home-khero-orbit home-khero-orbit-two" />
          <div className="home-khero-points-wordmark">
            <strong>KHERO</strong>
            <span>POINTS</span>
          </div>
        </div>
      </div>
    </section>
  );
}
