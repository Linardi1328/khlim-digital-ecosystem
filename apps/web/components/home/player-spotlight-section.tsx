import React from "react";
import Link from "next/link";
import {
  playerSpotlightEditorialPreview,
  publishedPlayerSpotlights,
  type PlayerSpotlightArticle,
} from "../../lib/editorial-content";
import { Button } from "../ui/button";

function SpotlightCard({
  article,
  preview,
  featured = false,
}: {
  article: PlayerSpotlightArticle;
  preview: boolean;
  featured?: boolean;
}) {
  const backgroundImage = article.imageUrl
    ? `linear-gradient(180deg, rgba(9, 9, 11, 0.04), rgba(9, 9, 11, 0.76)), url("${article.imageUrl}")`
    : `linear-gradient(180deg, rgba(9, 9, 11, 0.06), rgba(9, 9, 11, 0.8)), ${article.placeholderGradient}`;

  return (
    <article className={`home-spotlight-card${featured ? " is-featured" : ""}`}>
      <div
        className="home-spotlight-photo"
        style={{ backgroundImage }}
        role="img"
        aria-label={
          article.imageUrl
            ? article.photoLabel
            : `Photo slot: ${article.photoLabel}`
        }
      >
        {!article.imageUrl && (
          <span className="home-spotlight-photo-label">
            Photo slot · {article.photoLabel}
          </span>
        )}
        <div className="home-spotlight-photo-meta">
          <span>{preview ? "Editorial preview" : "Player spotlight"}</span>
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
          <span>{article.aiAssisted ? "AI-assisted draft" : "Editorial"}</span>
        </div>
        <Link
          href={`/spotlight/${article.slug}`}
          style={{ textDecoration: "none", alignSelf: "flex-start" }}
        >
          <Button variant="outline" size="md">
            {preview ? "Preview article format →" : "Read player story →"}
          </Button>
        </Link>
      </div>
    </article>
  );
}

export function PlayerSpotlightSection() {
  const preview = publishedPlayerSpotlights.length === 0;
  const stories = preview
    ? [playerSpotlightEditorialPreview]
    : publishedPlayerSpotlights.slice(0, 3);

  return (
    <section
      id="player-spotlight"
      className="home-spotlight-section"
      aria-labelledby="home-spotlight-title"
    >
      <div className="home-spotlight-heading-row">
        <div className="home-section-heading home-spotlight-heading">
          <span>Player Spotlight</span>
          <h2 id="home-spotlight-title">When KHLIM players make the news.</h2>
          <p>
            Short-form news stories celebrating verified player milestones at
            major events, with AI-assisted writing used to turn approved facts
            into a polished club newsletter article.
          </p>
        </div>
        {!preview && publishedPlayerSpotlights.length > 3 && (
          <Link href="/spotlight" style={{ textDecoration: "none" }}>
            <Button variant="outline">View all stories</Button>
          </Link>
        )}
      </div>

      {preview && (
        <div
          className="home-editorial-notice home-spotlight-notice"
          role="note"
        >
          <strong>AI-assisted example, not a real player claim.</strong>
          <span>
            The preview below demonstrates the finished editorial experience.
            Real stories remain hidden until the player, event, result and
            timing are verified by KHLIM staff.
          </span>
        </div>
      )}

      <div className="home-spotlight-grid">
        {stories.map((article, index) => (
          <SpotlightCard
            key={article.slug}
            article={article}
            preview={preview}
            featured={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
