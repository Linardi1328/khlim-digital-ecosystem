import React from "react";
import {
  achievementArchiveSlots,
  publishedAchievements,
  type AchievementStory,
} from "../../lib/editorial-content";

function AchievementCard({
  story,
  preview,
}: {
  story: AchievementStory;
  preview: boolean;
}) {
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
          story.imageUrl ? story.photoLabel : `Photo slot: ${story.photoLabel}`
        }
      >
        {!story.imageUrl && (
          <span className="home-achievement-photo-label">
            Photo slot · {story.photoLabel}
          </span>
        )}
        <div className="home-achievement-photo-copy">
          <span>{story.yearLabel}</span>
          <strong>{story.eventName}</strong>
        </div>
      </div>
      <div className="home-achievement-copy">
        {preview && <span className="home-editorial-state">Archive slot</span>}
        <h3>{story.title}</h3>
        <p>{story.description}</p>
      </div>
    </article>
  );
}

export function AchievementsSection() {
  const stories =
    publishedAchievements.length > 0
      ? publishedAchievements
      : achievementArchiveSlots;
  const preview = publishedAchievements.length === 0;

  return (
    <section
      id="achievements"
      className="home-achievements-section"
      aria-labelledby="home-achievements-title"
    >
      <div className="home-section-heading">
        <span>Club history</span>
        <h2 id="home-achievements-title">Achievements that shaped KHLIM.</h2>
        <p>
          A visual archive for the club&apos;s highest competitive results,
          representative milestones and defining moments. Every published entry
          is intended to pair a verified result with the photo and short story
          behind it.
        </p>
      </div>

      {preview && (
        <div className="home-editorial-notice" role="note">
          <strong>Archive ready for verified club history.</strong>
          <span>
            These three preview slots do not claim a result. Replace them with
            confirmed event names, years, descriptions and approved photos
            before publication.
          </span>
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
