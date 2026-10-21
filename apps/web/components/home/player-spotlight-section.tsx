"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getLocalizedSpotlightPreview,
  publishedPlayerSpotlights,
  verifiedRepresentativeMilestones,
  type PlayerSpotlightArticle,
} from "../../lib/editorial-content";
import { fetchPublishedSpotlights } from "../../lib/editorial-api";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
} from "../../lib/campaign-source";
import { useI18n } from "../../lib/i18n-context";
import { Button } from "../ui/button";
import { VerifiedMilestoneGallery } from "../editorial/verified-milestone-gallery";

function SpotlightCard({
  article,
  preview,
  featured = false,
  campaignSource,
}: {
  article: PlayerSpotlightArticle;
  preview: boolean;
  featured?: boolean;
  campaignSource?: string | null;
}) {
  const { t } = useI18n();
  const youthMediaRightsConfirmed =
    process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED === "1";
  const hasVerifiedImage = Boolean(
    article.imageUrl &&
    article.photoRightsVerified &&
    youthMediaRightsConfirmed,
  );
  const backgroundImage = hasVerifiedImage
    ? `linear-gradient(180deg, rgba(9, 9, 11, 0.04), rgba(9, 9, 11, 0.76)), url("${article.imageUrl}")`
    : `linear-gradient(180deg, rgba(9, 9, 11, 0.06), rgba(9, 9, 11, 0.8)), ${article.placeholderGradient}`;

  return (
    <article className={`home-spotlight-card${featured ? " is-featured" : ""}`}>
      <div
        className="home-spotlight-photo"
        style={{ backgroundImage }}
        role="img"
        aria-label={
          hasVerifiedImage
            ? article.photoLabel
            : t("home.photoSlot", { label: article.photoLabel })
        }
      >
        {!hasVerifiedImage && (
          <span className="home-spotlight-photo-label">
            {t("home.photoSlot", { label: article.photoLabel })}
          </span>
        )}
        <div className="home-spotlight-photo-meta">
          <span>
            {preview
              ? t("spotlight.editorialPreview")
              : t("spotlight.playerSpotlight")}
          </span>
          <strong>{article.achievement}</strong>
        </div>
      </div>

      <div className="home-spotlight-copy">
        <div className="home-spotlight-kicker">
          <span>{article.eventName}</span>
          <span aria-hidden="true">·</span>
          <span>{article.achievedOnLabel}</span>
        </div>
        <h3>{article.headline}</h3>
        <p>{article.excerpt}</p>
        <div className="home-spotlight-byline">
          <span>{article.playerName}</span>
          <span>
            {article.aiAssisted
              ? t("spotlight.aiAssistedDraft")
              : t("spotlight.editorial")}
          </span>
        </div>
        <Link
          href={buildUrlWithSource(
            `/spotlight/${article.slug}`,
            campaignSource,
          )}
          style={{ textDecoration: "none", alignSelf: "flex-start" }}
        >
          <Button variant="outline" size="md">
            {preview
              ? t("spotlight.previewArticleCta")
              : t("spotlight.readStoryCta")}
          </Button>
        </Link>
      </div>
    </article>
  );
}

export function PlayerSpotlightSection({
  campaignSource,
}: {
  campaignSource?: string | null;
} = {}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const effectiveCampaignSource = campaignSource ?? queryCampaign;

  const [remote, setRemote] = useState<PlayerSpotlightArticle[]>([]);
  useEffect(() => {
    void fetchPublishedSpotlights()
      .then(setRemote)
      .catch(() => undefined);
  }, []);
  const live = remote.length > 0 ? remote : publishedPlayerSpotlights;
  const preview = live.length === 0;
  const stories = preview
    ? [getLocalizedSpotlightPreview(t)]
    : live.slice(0, 3);

  return (
    <section
      id="player-spotlight"
      className="home-spotlight-section"
      aria-labelledby="home-spotlight-title"
    >
      <div className="home-spotlight-heading-row">
        <div className="home-section-heading home-spotlight-heading">
          <span>{t("spotlight.playerSpotlight")}</span>
          <h2 id="home-spotlight-title">{t("spotlight.homeTitle")}</h2>
          <p>{t("spotlight.homeDescription")}</p>
        </div>
        <Link
          href={buildUrlWithSource(
            "/spotlight#player-spotlights",
            effectiveCampaignSource,
          )}
          style={{ textDecoration: "none" }}
        >
          <Button variant="outline">{t("spotlight.viewAll")}</Button>
        </Link>
      </div>

      <VerifiedMilestoneGallery
        stories={verifiedRepresentativeMilestones.slice(0, 3)}
        compact
      />
      <p className="verified-milestone-context">
        {t("spotlight.representatives.namesPending")}
      </p>

      {preview && (
        <div
          className="home-editorial-notice home-spotlight-notice"
          role="note"
        >
          <strong>{t("spotlight.previewNoticeTitle")}</strong>
          <span>{t("spotlight.previewNoticeBody")}</span>
        </div>
      )}

      <div className="home-spotlight-grid">
        {stories.map((article, index) => (
          <SpotlightCard
            key={article.slug}
            article={article}
            preview={preview}
            featured={index === 0}
            campaignSource={effectiveCampaignSource}
          />
        ))}
      </div>
    </section>
  );
}
