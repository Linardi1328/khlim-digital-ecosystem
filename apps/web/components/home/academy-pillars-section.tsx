"use client";

import React from "react";
import { useI18n } from "../../lib/i18n-context";

const pillars = [
  {
    index: "01",
    titleKey: "academy.playerDevelopment.title",
    bodyKey: "academy.playerDevelopment.body",
  },
  {
    index: "02",
    titleKey: "academy.teamStandards.title",
    bodyKey: "academy.teamStandards.body",
  },
  {
    index: "03",
    titleKey: "academy.familyVisibility.title",
    bodyKey: "academy.familyVisibility.body",
  },
] as const;

export function AcademyPillarsSection() {
  const { t } = useI18n();

  return (
    <section
      className="home-academy-pillars"
      aria-labelledby="home-academy-pillars-title"
    >
      <div className="home-academy-pillars-heading">
        <span>{t("home.academyPillars.eyebrow")}</span>
        <h2 id="home-academy-pillars-title">
          {t("home.academyPillars.title")}
        </h2>
        <p>{t("home.academyPillars.description")}</p>
      </div>
      <div className="home-academy-pillar-grid">
        {pillars.map((pillar) => (
          <article key={pillar.index} className="home-academy-pillar-card">
            <span className="home-academy-pillar-index">{pillar.index}</span>
            <div>
              <h3>{t(pillar.titleKey)}</h3>
              <p>{t(pillar.bodyKey)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
