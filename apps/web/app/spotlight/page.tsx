"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  getLocalizedSpotlightPreview,
  publishedPlayerSpotlights,
} from "../../lib/editorial-content";
import { fetchPublishedSpotlights } from "../../lib/editorial-api";
import { useI18n } from "../../lib/i18n-context";

export default function PlayerSpotlightArchivePage() {
  const { t } = useI18n();
  const [remote, setRemote] = useState<typeof publishedPlayerSpotlights>([]);
  useEffect(() => {
    void fetchPublishedSpotlights()
      .then(setRemote)
      .catch(() => undefined);
  }, []);
  const live = remote.length > 0 ? remote : publishedPlayerSpotlights;
  const preview = live.length === 0;
  const stories = preview ? [getLocalizedSpotlightPreview(t)] : live;

  return (
    <div className="spotlight-page-shell">
      <PublicHeader />
      <main className="spotlight-archive-main">
        <header className="spotlight-archive-header">
          <Badge variant="brand" size="md">
            {t("spotlight.archive.badge")}
          </Badge>
          <h1>{t("spotlight.archive.title")}</h1>
          <p>{t("spotlight.archive.description")}</p>
        </header>

        {preview && (
          <div className="spotlight-preview-warning" role="note">
            <strong>{t("spotlight.archive.previewTitle")}</strong>
            <span>{t("spotlight.archive.previewBody")}</span>
          </div>
        )}

        <div className="spotlight-archive-grid">
          {stories.map((article) => {
            const backgroundImage = article.imageUrl
              ? `linear-gradient(180deg, rgba(9, 9, 11, 0.04), rgba(9, 9, 11, 0.78)), url("${article.imageUrl}")`
              : `linear-gradient(180deg, rgba(9, 9, 11, 0.06), rgba(9, 9, 11, 0.82)), ${article.placeholderGradient}`;

            return (
              <article key={article.slug} className="spotlight-archive-card">
                <div
                  className="spotlight-archive-photo"
                  style={{ backgroundImage }}
                  role="img"
                  aria-label={
                    article.imageUrl
                      ? article.photoLabel
                      : t("spotlight.archive.photoSlot", {
                          label: article.photoLabel,
                        })
                  }
                />
                <div className="spotlight-archive-copy">
                  <span>
                    {article.eventName} · {article.achievedOnLabel}
                  </span>
                  <h2>{article.headline}</h2>
                  <p>{article.excerpt}</p>
                  <Link
                    href={`/spotlight/${article.slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Button variant="outline">
                      {preview
                        ? t("spotlight.archive.previewStory")
                        : t("spotlight.archive.readStory")}
                    </Button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
