"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getLocalizedAchievementArchiveSlots,
  resolveAchievementStories,
  type AchievementStory,
  type ResolvedAchievementsResult,
} from "../../lib/editorial-content";
import { fetchPublishedAchievements } from "../../lib/editorial-api";
import { useI18n } from "../../lib/i18n-context";

export { resolveAchievementStories, type ResolvedAchievementsResult };

function AchievementCard({
  story,
  preview,
}: {
  story: AchievementStory;
  preview: boolean;
}) {
  const { t } = useI18n();
  const youthMediaRightsConfirmed =
    process.env.NEXT_PUBLIC_YOUTH_MEDIA_RIGHTS_CONFIRMED === "1";
  const hasVerifiedImage = Boolean(
    story.imageUrl && story.photoRightsVerified && youthMediaRightsConfirmed,
  );
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
        {preview && (
          <span className="home-editorial-state">
            {t("home.achievements.archiveSlot")}
          </span>
        )}
        <h3>{story.title}</h3>
        <p>{story.description}</p>
      </div>
    </article>
  );
}

export function AchievementsSection() {
  const { t, locale } = useI18n();
  const [remote, setRemote] = useState<AchievementStory[] | null>(null);
  const [apiError, setApiError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    void fetchPublishedAchievements()
      .then((data) => {
        setRemote(data);
        setApiError(false);
      })
      .catch(() => {
        setRemote(null);
        setApiError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const localizedArchiveSlots = useMemo(
    () => getLocalizedAchievementArchiveSlots(t),
    [locale, t],
  );

  const { state, stories, isIntentionalEmpty, preview } = useMemo(
    () =>
      resolveAchievementStories({
        remote,
        apiError,
        isLoading,
        archiveSlots: localizedArchiveSlots,
      }),
    [remote, apiError, isLoading, localizedArchiveSlots],
  );

  return (
    <section
      id="achievements"
      className="home-achievements-section"
      aria-labelledby="home-achievements-title"
    >
      <div className="home-section-heading">
        <span>{t("home.achievements.eyebrow")}</span>
        <h2 id="home-achievements-title">{t("home.achievements.title")}</h2>
        <p>{t("home.achievements.description")}</p>
      </div>

      {state === "loading" ? (
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
                background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
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
      ) : isIntentionalEmpty ? (
        <div className="home-editorial-notice" role="status">
          <span>{t("home.achievements.nonePublished")}</span>
        </div>
      ) : preview ? (
        <>
          <div className="home-editorial-notice" role="note">
            <strong>{t("home.achievements.previewTitle")}</strong>
            <span>{t("home.achievements.previewBody")}</span>
          </div>
          <div className="home-achievements-grid">
            {stories.slice(0, 6).map((story) => (
              <AchievementCard key={story.id} story={story} preview={preview} />
            ))}
          </div>
        </>
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
            <img
              src="/media/khlim/logo-club.webp"
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

          <div className="home-achievements-grid">
            {stories.slice(0, 6).map((story) => (
              <AchievementCard key={story.id} story={story} preview={false} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
