import Link from "next/link";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  playerSpotlightEditorialPreview,
  publishedPlayerSpotlights,
} from "../../lib/editorial-content";

export default function PlayerSpotlightArchivePage() {
  const preview = publishedPlayerSpotlights.length === 0;
  const stories = preview
    ? [playerSpotlightEditorialPreview]
    : publishedPlayerSpotlights;

  return (
    <div className="spotlight-page-shell">
      <PublicHeader />
      <main className="spotlight-archive-main">
        <header className="spotlight-archive-header">
          <Badge variant="brand" size="md">
            Player Spotlight
          </Badge>
          <h1>Stories from the next milestone.</h1>
          <p>
            KHLIM Player Spotlight turns verified player achievements into
            concise club news stories, using AI-assisted drafting with staff
            review before publication.
          </p>
        </header>

        {preview && (
          <div className="spotlight-preview-warning" role="note">
            <strong>Editorial preview only.</strong>
            <span>
              No verified player spotlight has been published yet. The sample
              below demonstrates the article format without claiming a real
              result.
            </span>
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
                      : `Photo slot: ${article.photoLabel}`
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
                      {preview ? "Preview story →" : "Read story →"}
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
