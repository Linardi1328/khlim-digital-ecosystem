"use client";

import Link from "next/link";
import { PublicFooter } from "../layout/public-footer";
import { PublicHeader } from "../layout/public-header";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  getLocalizedSpotlightPreview,
  playerSpotlightEditorialPreview,
  type PlayerSpotlightArticle,
} from "../../lib/editorial-content";
import { useI18n } from "../../lib/i18n-context";

export function SpotlightArticleContent({
  article: sourceArticle,
}: {
  article: PlayerSpotlightArticle;
}) {
  const { t } = useI18n();
  const preview = sourceArticle.slug === playerSpotlightEditorialPreview.slug;
  const article = preview ? getLocalizedSpotlightPreview(t) : sourceArticle;
  const backgroundImage = article.imageUrl
    ? `linear-gradient(180deg, rgba(9, 9, 11, 0.14), rgba(9, 9, 11, 0.82)), url("${article.imageUrl}")`
    : `linear-gradient(180deg, rgba(9, 9, 11, 0.1), rgba(9, 9, 11, 0.84)), ${article.placeholderGradient}`;

  return (
    <div className="spotlight-page-shell">
      <PublicHeader />
      <main className="spotlight-article-main">
        <Link href="/#player-spotlight" className="spotlight-back-link">
          {t("spotlight.article.back")}
        </Link>

        {preview && (
          <div className="spotlight-preview-warning" role="note">
            <strong>{t("spotlight.article.previewTitle")}</strong>
            <span>{t("spotlight.article.previewBody")}</span>
          </div>
        )}

        <article>
          <header className="spotlight-article-header">
            <div className="spotlight-article-labels">
              <Badge variant="brand" size="md">
                {t("spotlight.archive.badge")}
              </Badge>
              {article.aiAssisted && (
                <span className="spotlight-ai-label">
                  {t("spotlight.article.aiEditorial")}
                </span>
              )}
            </div>
            <p className="spotlight-article-event">
              {article.eventName} · {article.achievedOnLabel}
            </p>
            <h1>{article.headline}</h1>
            <p className="spotlight-article-dek">{article.excerpt}</p>
            <div className="spotlight-article-byline">
              <strong>{article.playerName}</strong>
              <span>{article.achievement}</span>
            </div>
          </header>

          <div
            className="spotlight-article-hero"
            style={{ backgroundImage }}
            role="img"
            aria-label={
              article.imageUrl
                ? article.photoLabel
                : t("spotlight.archive.photoSlot", {
                    label: article.photoLabel,
                  })
            }
          >
            {!article.imageUrl && (
              <span>
                {t("spotlight.article.photoSlot", {
                  label: article.photoLabel,
                })}
              </span>
            )}
          </div>

          <div className="spotlight-article-body">
            {article.articleParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <footer className="spotlight-article-footer">
            <div>
              <span>{t("spotlight.article.standardLabel")}</span>
              <strong>{t("spotlight.article.standardTitle")}</strong>
              <p>{t("spotlight.article.standardBody")}</p>
            </div>
            <Link href="/programmes" style={{ textDecoration: "none" }}>
              <Button variant="primary">
                {t("spotlight.article.programmesCta")}
              </Button>
            </Link>
          </footer>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
