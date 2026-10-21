"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { VerifiedMilestoneGallery } from "../../components/editorial/verified-milestone-gallery";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../../lib/campaign-source";
import {
  canRenderYouthMedia,
  clubEventGallery,
  publishedPlayerSpotlights,
  verifiedTeamResults,
  verifiedRepresentativeMilestones,
  type AchievementStory,
  type PlayerSpotlightArticle,
} from "../../lib/editorial-content";
import {
  fetchPublishedAchievements,
  fetchPublishedSpotlights,
} from "../../lib/editorial-api";
import { useI18n } from "../../lib/i18n-context";

// Only Vercel-authenticated preview deployments can show internal review media.
const isStagingMediaReview =
  process.env.NEXT_PUBLIC_STAGING_MEDIA_REVIEW === "1";

const FEATURED_ACHIEVEMENT_IDS = [
  "cls-international-cup-2026",
  "sba-selangor-2025-d1",
  "jasmine-cup-2026-a",
  "sba-selangor-2026-u16",
];

const MILESTONE_ACHIEVEMENT_IDS = [
  "mssm-2024",
  "mssm-2025",
  "lmc-cup-2025",
  "maba-matrix-u17-2026",
  "maba-matrix-u17-2026-squad2",
];

function AchievementCard({ story }: { story: AchievementStory }) {
  const { t } = useI18n();
  const hasVerifiedImage = canRenderYouthMedia(story);
  const backgroundImage = hasVerifiedImage
    ? `linear-gradient(180deg, rgba(9, 9, 11, 0.08), rgba(9, 9, 11, 0.84)), url("${story.imageUrl}")`
    : `linear-gradient(180deg, rgba(9, 9, 11, 0.1), rgba(9, 9, 11, 0.84)), ${story.placeholderGradient}`;

  return (
    <article className="home-achievement-card">
      <div
        className="home-achievement-photo"
        style={{ backgroundImage }}
        role="img"
        aria-label={
          hasVerifiedImage
            ? story.photoLabel
            : t("home.photoSlot", { label: story.photoLabel })
        }
      >
        {!hasVerifiedImage && (
          <span className="home-achievement-photo-label">
            {t("home.photoSlot", { label: story.photoLabel })}
          </span>
        )}
        <div className="home-achievement-photo-copy">
          <span>{story.yearLabel}</span>
          <strong>{story.eventName}</strong>
        </div>
      </div>
      <div className="home-achievement-copy">
        <h3>{story.title}</h3>
        <p>{story.description}</p>
      </div>
    </article>
  );
}

function SpotlightArchiveContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const [storedCampaign, setStoredCampaign] = useState<string | null>(null);

  useEffect(() => {
    setStoredCampaign(resolveCampaignSource(searchParams));
  }, [searchParams]);

  const campaignSource = queryCampaign ?? storedCampaign;

  const [achievements, setAchievements] = useState<AchievementStory[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [achievementsError, setAchievementsError] = useState(false);

  const [spotlights, setSpotlights] = useState<PlayerSpotlightArticle[]>([]);
  const [spotlightsLoading, setSpotlightsLoading] = useState(true);
  const [spotlightsError, setSpotlightsError] = useState(false);

  useEffect(() => {
    if (isStagingMediaReview) {
      setAchievements([]);
      setAchievementsLoading(false);
      setAchievementsError(false);
      return;
    }
    setAchievementsLoading(true);
    setAchievementsError(false);
    void fetchPublishedAchievements()
      .then((data) => {
        setAchievements(data);
        setAchievementsError(false);
      })
      .catch(() => {
        setAchievements([]);
        setAchievementsError(true);
      })
      .finally(() => {
        setAchievementsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isStagingMediaReview) {
      setSpotlights([]);
      setSpotlightsLoading(false);
      setSpotlightsError(false);
      return;
    }
    setSpotlightsLoading(true);
    setSpotlightsError(false);
    void fetchPublishedSpotlights()
      .then((data) => {
        setSpotlights(data);
        setSpotlightsError(false);
      })
      .catch(() => {
        setSpotlights([]);
        setSpotlightsError(true);
      })
      .finally(() => {
        setSpotlightsLoading(false);
      });
  }, []);

  const liveSpotlights =
    spotlights.length > 0 ? spotlights : publishedPlayerSpotlights;

  const featuredAchievements = useMemo(
    () =>
      FEATURED_ACHIEVEMENT_IDS.map((id) =>
        achievements.find((item) => item.id === id),
      ).filter((item): item is AchievementStory => Boolean(item)),
    [achievements],
  );

  const milestoneAchievements = useMemo(
    () =>
      MILESTONE_ACHIEVEMENT_IDS.map((id) =>
        achievements.find((item) => item.id === id),
      ).filter((item): item is AchievementStory => Boolean(item)),
    [achievements],
  );

  const archiveAchievements = useMemo(() => {
    const curatedIds = new Set([
      ...featuredAchievements.map((item) => item.id),
      ...milestoneAchievements.map((item) => item.id),
    ]);
    return achievements.filter((item) => !curatedIds.has(item.id));
  }, [achievements, featuredAchievements, milestoneAchievements]);

  return (
    <div className="spotlight-page-shell">
      <PublicHeader campaignSource={campaignSource} />
      <main className="spotlight-archive-main">
        <header className="spotlight-archive-header">
          <Badge variant="brand" size="md">
            {t("spotlight.archive.badge")}
          </Badge>
          <h1>{t("spotlight.archive.title")}</h1>
          <p>{t("spotlight.archive.description")}</p>

          <nav
            aria-label={t("spotlight.archive.title")}
            className="spotlight-jump-nav"
          >
            <a href="#achievements" className="spotlight-jump-pill">
              🏆 {t("spotlight.nav.jumpAchievements")}
            </a>
            <a href="#player-spotlights" className="spotlight-jump-pill">
              ⭐ {t("spotlight.nav.jumpPlayers")}
            </a>
          </nav>
        </header>

        {/* Section 1: Team Achievements */}
        <section
          id="achievements"
          className="spotlight-section"
          aria-labelledby="spotlight-achievements-title"
        >
          <div className="spotlight-section-heading">
            <span>{t("spotlight.archive.badge")}</span>
            <h2 id="spotlight-achievements-title">
              {t("spotlight.achievements.title")}
            </h2>
            <p>{t("spotlight.achievements.description")}</p>
          </div>

          <div className="spotlight-subsection" id="verified-team-honours">
            <div className="spotlight-subsection-header">
              <h3>{t("spotlight.achievements.verifiedGalleryTitle")}</h3>
              <p>{t("spotlight.achievements.galleryDesc")}</p>
            </div>
            <VerifiedMilestoneGallery stories={verifiedTeamResults} />
          </div>

          {achievementsLoading ? (
            <div
              className="home-achievements-grid"
              role="status"
              aria-label={t("home.achievements.loading")}
              style={{ opacity: 0.6 }}
            >
              {[1, 2, 3].map((id) => (
                <div
                  key={id}
                  className="home-achievement-card"
                  style={{
                    minHeight: 280,
                    background:
                      "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
                    borderRadius: 16,
                    border: "1px solid #3f3f46",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: 20,
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      height: 16,
                      width: "40%",
                      background: "#3f3f46",
                      borderRadius: 4,
                      marginBottom: 10,
                    }}
                  />
                  <div
                    style={{
                      height: 24,
                      width: "70%",
                      background: "#52525b",
                      borderRadius: 4,
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      height: 14,
                      width: "90%",
                      background: "#3f3f46",
                      borderRadius: 4,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : achievementsError ? (
            <div
              className="spotlight-empty-state spotlight-error-state"
              role="status"
            >
              <div
                className="home-club-distinction-banner"
                role="note"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  maxWidth: 700,
                  margin: "0 0 24px",
                  padding: "16px 20px",
                  background: "#ffffff",
                  border: "1px solid #e4e4e7",
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
                  boxSizing: "border-box",
                  textAlign: "left",
                }}
              >
                <Image
                  src="/media/brand/kh-basketball-club.webp"
                  alt={t("home.achievements.clubBadge")}
                  width={48}
                  height={44}
                  style={{ objectFit: "contain", flexShrink: 0 }}
                />
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#18181b",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    {t("home.achievements.clubBadge")}
                  </strong>
                  <span
                    style={{
                      color: "#71717a",
                      fontSize: "0.8125rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {t("home.achievements.clubDisclaimer")}
                  </span>
                </div>
              </div>
              <h3>{t("spotlight.achievements.errorTitle")}</h3>
              <p>{t("spotlight.achievements.errorBody")}</p>
            </div>
          ) : achievements.length === 0 ? (
            <div className="spotlight-empty-state" role="status">
              <div
                className="home-club-distinction-banner"
                role="note"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  maxWidth: 700,
                  margin: "0 0 24px",
                  padding: "16px 20px",
                  background: "#ffffff",
                  border: "1px solid #e4e4e7",
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
                  boxSizing: "border-box",
                  textAlign: "left",
                }}
              >
                <Image
                  src="/media/brand/kh-basketball-club.webp"
                  alt={t("home.achievements.clubBadge")}
                  width={48}
                  height={44}
                  style={{ objectFit: "contain", flexShrink: 0 }}
                />
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#18181b",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    {t("home.achievements.clubBadge")}
                  </strong>
                  <span
                    style={{
                      color: "#71717a",
                      fontSize: "0.8125rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {t("home.achievements.clubDisclaimer")}
                  </span>
                </div>
              </div>
              <h3>{t("spotlight.achievements.emptyTitle")}</h3>
              <p>{t("spotlight.achievements.emptyBody")}</p>
            </div>
          ) : (
            <>
              <div
                className="home-club-distinction-banner"
                role="note"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  maxWidth: 900,
                  margin: "0 auto 36px",
                  padding: "16px 20px",
                  background: "#ffffff",
                  border: "1px solid #e4e4e7",
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
                  boxSizing: "border-box",
                }}
              >
                <Image
                  src="/media/brand/kh-basketball-club.webp"
                  alt={t("home.achievements.clubBadge")}
                  width={48}
                  height={44}
                  style={{ objectFit: "contain", flexShrink: 0 }}
                />
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#18181b",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    {t("home.achievements.clubBadge")}
                  </strong>
                  <span
                    style={{
                      color: "#71717a",
                      fontSize: "0.8125rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {t("home.achievements.clubDisclaimer")}
                  </span>
                </div>
              </div>

              {/* Subsection 1: Featured Championship Honours */}
              {featuredAchievements.length > 0 && (
                <div className="spotlight-subsection">
                  <div className="spotlight-subsection-header">
                    <h3>{t("spotlight.achievements.featured")}</h3>
                  </div>
                  <div className="home-achievements-grid">
                    {featuredAchievements.map((story) => (
                      <AchievementCard key={story.id} story={story} />
                    ))}
                  </div>
                </div>
              )}

              {/* Subsection 2: Club Tournament Archive */}
              {archiveAchievements.length > 0 && (
                <div className="spotlight-subsection">
                  <div className="spotlight-subsection-header">
                    <h3>{t("spotlight.achievements.archive")}</h3>
                  </div>
                  <div className="home-achievements-grid">
                    {archiveAchievements.map((story) => (
                      <AchievementCard key={story.id} story={story} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section
          className="spotlight-section"
          id="club-event-gallery"
          aria-labelledby="club-event-gallery-title"
        >
          <div className="spotlight-section-heading">
            <span>{t("spotlight.archive.badge")}</span>
            <h2 id="club-event-gallery-title">
              {t("spotlight.achievements.gallery")}
            </h2>
            <p>{t("spotlight.achievements.galleryDesc")}</p>
          </div>
          <div className="spotlight-club-gallery-grid">
            {clubEventGallery.map((item) => {
              const showImage = canRenderYouthMedia(item);
              return (
                <figure key={item.id} className="spotlight-gallery-card">
                  <div
                    className="spotlight-gallery-image-wrapper"
                    style={{
                      position: "relative",
                      height: 300,
                      background: "#18181b",
                    }}
                  >
                    {showImage ? (
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.photoLabel}
                        style={{ position: "absolute", inset: 0 }}
                      >
                        <Image
                          src={item.imageUrl}
                          alt={item.photoLabel}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          style={{ objectFit: "contain" }}
                        />
                      </a>
                    ) : (
                      <span className="home-achievement-photo-label">
                        {t("spotlight.archive.photoSlot", {
                          label: item.photoLabel,
                        })}
                      </span>
                    )}
                  </div>
                  <figcaption className="spotlight-gallery-caption">
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>

        {/* Section 2: Player Spotlights */}
        <section
          id="player-spotlights"
          className="spotlight-section"
          aria-labelledby="spotlight-players-title"
        >
          <div className="spotlight-section-heading">
            <span>{t("spotlight.archive.badge")}</span>
            <h2 id="spotlight-players-title">{t("spotlight.players.title")}</h2>
            <p>{t("spotlight.players.description")}</p>
          </div>

          <div className="spotlight-subsection" id="representative-milestones">
            <div className="spotlight-subsection-header">
              <h3>{t("spotlight.achievements.milestones")}</h3>
              <p>{t("spotlight.achievements.milestonesDesc")}</p>
            </div>
            <VerifiedMilestoneGallery stories={verifiedRepresentativeMilestones} />
            <p className="verified-milestone-context">
              {t("spotlight.representatives.namesPending")}
            </p>
          </div>

          {/* Representative Selection Milestones (District, State & National honours) */}
          {milestoneAchievements.length > 0 && (
            <div
              className="spotlight-subsection"
              style={{ marginBottom: "3rem" }}
            >
              <div className="spotlight-subsection-header">
                <h3>{t("spotlight.achievements.milestones")}</h3>
                <p>{t("spotlight.achievements.milestonesDesc")}</p>
              </div>
              <div className="home-achievements-grid">
                {milestoneAchievements.map((story) => (
                  <AchievementCard key={story.id} story={story} />
                ))}
              </div>
            </div>
          )}

          {spotlightsLoading ? (
            <div
              className="spotlight-archive-grid"
              role="status"
              aria-label={t("spotlight.players.loading")}
              style={{ opacity: 0.6 }}
            >
              {[1, 2].map((id) => (
                <div
                  key={id}
                  className="spotlight-archive-card"
                  style={{
                    minHeight: 280,
                    background:
                      "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
                    borderRadius: 20,
                    border: "1px solid #3f3f46",
                  }}
                />
              ))}
            </div>
          ) : spotlightsError ? (
            <div
              className="spotlight-empty-state spotlight-error-state"
              role="status"
            >
              <h3>{t("spotlight.players.errorTitle")}</h3>
              <p>{t("spotlight.players.errorBody")}</p>
            </div>
          ) : liveSpotlights.length === 0 ? (
            <div className="spotlight-empty-state" role="status">
              <h3>{t("spotlight.players.emptyTitle")}</h3>
              <p>{t("spotlight.players.emptyBody")}</p>
            </div>
          ) : (
            <div className="spotlight-archive-grid">
              {liveSpotlights.map((article) => {
                const hasVerifiedImage = canRenderYouthMedia(article);
                const backgroundImage = hasVerifiedImage
                  ? `linear-gradient(180deg, rgba(9, 9, 11, 0.04), rgba(9, 9, 11, 0.78)), url("${article.imageUrl}")`
                  : `linear-gradient(180deg, rgba(9, 9, 11, 0.06), rgba(9, 9, 11, 0.82)), ${article.placeholderGradient}`;

                return (
                  <article
                    key={article.slug}
                    className="spotlight-archive-card"
                  >
                    <div
                      className="spotlight-archive-photo"
                      style={{ backgroundImage }}
                      role="img"
                      aria-label={
                        hasVerifiedImage
                          ? article.photoLabel
                          : t("spotlight.archive.photoSlot", {
                              label: article.photoLabel,
                            })
                      }
                    >
                      {!hasVerifiedImage && (
                        <span className="home-spotlight-photo-label">
                          {t("spotlight.archive.photoSlot", {
                            label: article.photoLabel,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="spotlight-archive-copy">
                      <span>
                        {article.eventName} · {article.achievedOnLabel}
                      </span>
                      <h2>{article.headline}</h2>
                      <p>{article.excerpt}</p>
                      <Link
                        href={buildUrlWithSource(
                          `/spotlight/${article.slug}`,
                          campaignSource,
                        )}
                        style={{ textDecoration: "none" }}
                      >
                        <Button variant="outline">
                          {t("spotlight.archive.readStory")}
                        </Button>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function SpotlightArchivePage() {
  return (
    <Suspense
      fallback={<div aria-busy="true" style={{ minHeight: "100vh" }} />}
    >
      <SpotlightArchiveContent />
    </Suspense>
  );
}
