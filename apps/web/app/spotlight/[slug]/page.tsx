import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter } from "../../../components/layout/public-footer";
import { PublicHeader } from "../../../components/layout/public-header";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  findSpotlightArticle,
  playerSpotlightEditorialPreview,
} from "../../../lib/editorial-content";
import { fetchPublishedSpotlight } from "../../../lib/editorial-api";

async function resolveSpotlight(slug: string) {
  const remote = await fetchPublishedSpotlight(slug).catch(() => null);
  return remote ?? findSpotlightArticle(slug);
}

type SpotlightPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: SpotlightPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await resolveSpotlight(slug);
  if (!article) return { title: "Player Spotlight | KHLIM" };

  return {
    title: `${article.headline} | KHLIM Player Spotlight`,
    description: article.excerpt,
  };
}

export default async function PlayerSpotlightArticlePage({
  params,
}: SpotlightPageProps) {
  const { slug } = await params;
  const article = await resolveSpotlight(slug);
  if (!article) notFound();

  const preview = article.slug === playerSpotlightEditorialPreview.slug;
  const backgroundImage = article.imageUrl
    ? `linear-gradient(180deg, rgba(9, 9, 11, 0.14), rgba(9, 9, 11, 0.82)), url("${article.imageUrl}")`
    : `linear-gradient(180deg, rgba(9, 9, 11, 0.1), rgba(9, 9, 11, 0.84)), ${article.placeholderGradient}`;

  return (
    <div className="spotlight-page-shell">
      <PublicHeader />
      <main className="spotlight-article-main">
        <Link href="/#player-spotlight" className="spotlight-back-link">
          ← Back to Player Spotlight
        </Link>

        {preview && (
          <div className="spotlight-preview-warning" role="note">
            <strong>Editorial preview — not a real player result.</strong>
            <span>
              This AI-assisted article demonstrates the intended voice and
              layout. Replace the placeholder player/event facts and approved
              photo before publishing a real KHLIM story.
            </span>
          </div>
        )}

        <article>
          <header className="spotlight-article-header">
            <div className="spotlight-article-labels">
              <Badge variant="brand" size="md">
                Player Spotlight
              </Badge>
              {article.aiAssisted && (
                <span className="spotlight-ai-label">
                  AI-assisted editorial
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
                : `Photo slot: ${article.photoLabel}`
            }
          >
            {!article.imageUrl && (
              <span>Photo slot · {article.photoLabel}</span>
            )}
          </div>

          <div className="spotlight-article-body">
            {article.articleParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <footer className="spotlight-article-footer">
            <div>
              <span>Editorial standard</span>
              <strong>Facts first. Storytelling second.</strong>
              <p>
                KHLIM Player Spotlight copy can be AI-assisted, but names, event
                details, results, dates and photo permissions should be verified
                before publication.
              </p>
            </div>
            <Link href="/programmes" style={{ textDecoration: "none" }}>
              <Button variant="primary">Explore KHLIM programmes</Button>
            </Link>
          </footer>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
