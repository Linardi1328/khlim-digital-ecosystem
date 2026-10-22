"use client";

import type { AchievementStory } from "../../lib/editorial-content";
import { canRenderYouthMedia } from "../../lib/editorial-content";
import { useI18n } from "../../lib/i18n-context";

export function VerifiedMilestoneGallery({
  stories,
  compact = false,
}: {
  stories: readonly AchievementStory[];
  compact?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      className={`verified-milestone-grid${compact ? " verified-milestone-grid--compact" : ""}`}
    >
      {stories.map((story) => {
        const showImage = canRenderYouthMedia(story);
        return (
          <article className="verified-milestone-card" key={story.id}>
            <div className="verified-milestone-media">
              {showImage && story.imageUrl ? (
                <a
                  href={story.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={story.photoLabel}
                  className="verified-milestone-photo-link"
                >
                  <img
                    src={story.imageUrl}
                    alt={story.photoLabel}
                    className="verified-milestone-photo"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              ) : (
                <span className="verified-milestone-placeholder">
                  {t("home.photoSlot", { label: story.photoLabel })}
                </span>
              )}
            </div>
            <div className="verified-milestone-details">
              <span className="verified-milestone-year">{story.yearLabel}</span>
              <h3>{story.eventName}</h3>
              <strong>{story.title}</strong>
              <p>{story.description}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
