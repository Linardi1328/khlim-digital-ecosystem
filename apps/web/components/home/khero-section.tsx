"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { Button } from "../ui/button";

const posters = [
  {
    id: "meet",
    src: "/media/khero/meet-khero.webp",
    altKey: "home.khero.poster.meet",
  },
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
            <Image
              src={poster.src}
              alt={t(poster.altKey)}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
              priority={index === 0}
              style={{ objectFit: "cover" }}
            />
          </figure>
        ))}
      </div>

      {/* Accessible multilingual transcript and values cards for KHero posters */}
      <div
        className="home-khero-transcripts"
        style={{ marginTop: 32, marginBottom: 16 }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h3
            style={{
              fontSize: "clamp(1.15rem, 2vw, 1.35rem)",
              fontWeight: 800,
              color: "#18181b",
              margin: "0 0 6px",
            }}
          >
            {t("home.khero.transcripts.title")}
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#71717a",
              margin: 0,
              maxWidth: 620,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.5,
            }}
          >
            {t("home.khero.transcripts.subtitle")}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {/* Meet Khero Transcript */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e4e4e7",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                color: "#b45309",
                fontSize: "0.75rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              {t("home.khero.poster.meet")}
            </span>
            <strong
              style={{ fontSize: "0.95rem", color: "#18181b", marginBottom: 4 }}
            >
              {t("home.khero.poster.meet.tagline")}
            </strong>
            <span
              style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: 8 }}
            >
              {t("home.khero.poster.meet.details")}
            </span>
            <p
              style={{
                fontSize: "0.825rem",
                color: "#52525b",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {t("home.khero.poster.meet.story")}
            </p>
          </div>

          {/* Khero Meaning Transcript */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e4e4e7",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                color: "#b45309",
                fontSize: "0.75rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              {t("home.khero.poster.meaning")}
            </span>
            <strong
              style={{ fontSize: "0.95rem", color: "#18181b", marginBottom: 4 }}
            >
              {t("home.khero.poster.meaning.tagline")}
            </strong>
            <span
              style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: 8 }}
            >
              {t("home.khero.poster.meaning.origin")}
            </span>
            <p
              style={{
                fontSize: "0.825rem",
                color: "#52525b",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {t("home.khero.poster.meaning.values")}
            </p>
          </div>

          {/* The Khero Way Transcript */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e4e4e7",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                color: "#b45309",
                fontSize: "0.75rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              {t("home.khero.poster.way")}
            </span>
            <strong
              style={{ fontSize: "0.95rem", color: "#18181b", marginBottom: 4 }}
            >
              {t("home.khero.poster.way.tagline")}
            </strong>
            <span
              style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: 8 }}
            >
              {t("home.khero.poster.way.motto")}
            </span>
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                color: "#52525b",
                fontSize: "0.8rem",
                lineHeight: 1.5,
              }}
            >
              <li>{t("home.khero.poster.way.p1")}</li>
              <li>{t("home.khero.poster.way.p2")}</li>
              <li>{t("home.khero.poster.way.p3")}</li>
              <li>{t("home.khero.poster.way.p4")}</li>
            </ul>
          </div>
        </div>
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
          <div className="home-khero-coin home-khero-coin-main" />
          <div className="home-khero-coin home-khero-coin-small" />
          <div className="home-khero-orbit home-khero-orbit-one" />
          <div className="home-khero-orbit home-khero-orbit-two" />
        </div>
      </div>
    </section>
  );
}
