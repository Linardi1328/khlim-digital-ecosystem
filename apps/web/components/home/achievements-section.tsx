"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getLocalizedAchievementArchiveSlots,
  publishedAchievements,
  type AchievementStory,
} from "../../lib/editorial-content";
import { fetchPublishedAchievements } from "../../lib/editorial-api";
import { useI18n } from "../../lib/i18n-context";

function AchievementCard({
  story,
  preview,
}: {
  story: AchievementStory;
  preview: boolean;
}) {
  const { t } = useI18n();
  const backgroundImage = story.imageUrl
    ? `linear-gradient(180deg, rgba(9, 9, 11, 0.08), rgba(9, 9, 11, 0.84)), url("${story.imageUrl}")`
    : `linear-gradient(180deg, rgba(9, 9, 11, 0.1), rgba(9, 9, 11, 0.84)), ${story.placeholderGradient}`;

  return (
    <article className="home-achievement-card">
      <div
        className="home-achievement-photo"
        style={{ backgroundImage }}
        role="img"
        aria-label={
          story.imageUrl
            ? story.photoLabel
            : t("home.photoSlot", { label: story.photoLabel })
        }
      >
        {!story.imageUrl && (
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
  const [remote, setRemote] = useState<AchievementStory[]>([]);
  useEffect(() => {
    void fetchPublishedAchievements()
      .then(setRemote)
      .catch(() => undefined);
  }, []);
  const live = remote.length > 0 ? remote : publishedAchievements;
  const localizedArchiveSlots = useMemo(
    () => getLocalizedAchievementArchiveSlots(t),
    [locale, t],
  );
  const stories = live.length > 0 ? live : localizedArchiveSlots;
  const preview = live.length === 0;

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

      {preview && (
        <div className="home-editorial-notice" role="note">
          <strong>{t("home.achievements.previewTitle")}</strong>
          <span>{t("home.achievements.previewBody")}</span>
        </div>
      )}

      <div className="home-achievements-grid">
        {stories.slice(0, 6).map((story) => (
          <AchievementCard key={story.id} story={story} preview={preview} />
        ))}
      </div>
    </section>
  );
}
