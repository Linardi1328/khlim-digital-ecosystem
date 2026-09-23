CREATE TYPE "EditorialEntryType" AS ENUM ('ACHIEVEMENT', 'PLAYER_SPOTLIGHT');
CREATE TYPE "EditorialEntryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "editorial_entries" (
  "id" UUID NOT NULL,
  "type" "EditorialEntryType" NOT NULL,
  "slug" VARCHAR(160),
  "title" VARCHAR(220) NOT NULL,
  "eventName" VARCHAR(220) NOT NULL,
  "summary" TEXT NOT NULL,
  "yearLabel" VARCHAR(80),
  "playerName" VARCHAR(160),
  "achievement" VARCHAR(220),
  "achievedOnLabel" VARCHAR(120),
  "articleParagraphs" JSONB,
  "photoLabel" VARCHAR(220) NOT NULL,
  "imageUrl" TEXT,
  "factsVerified" BOOLEAN NOT NULL DEFAULT false,
  "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
  "status" "EditorialEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "editorial_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "editorial_entries_slug_key" ON "editorial_entries"("slug");
CREATE INDEX "editorial_entries_type_status_publishedAt_idx" ON "editorial_entries"("type", "status", "publishedAt");
