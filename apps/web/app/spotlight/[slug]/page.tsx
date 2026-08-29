import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpotlightArticleContent } from "../../../components/editorial/spotlight-article-content";
import { findSpotlightArticle } from "../../../lib/editorial-content";
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
  if (!article) return { title: "KHLIM" };

  return {
    title: `${article.headline} | KHLIM`,
    description: article.excerpt,
  };
}

export default async function PlayerSpotlightArticlePage({
  params,
}: SpotlightPageProps) {
  const { slug } = await params;
  const article = await resolveSpotlight(slug);
  if (!article) notFound();

  return <SpotlightArticleContent article={article} />;
}
