-- Phase 1B: make editorial content an explicit organization-owned aggregate.
-- Existing KHLIM editorial records remain owned by Organization #001 during
-- the compatibility period while public organization routing is still deferred.

ALTER TABLE "editorial_entries"
ADD COLUMN "organization_id" UUID;

UPDATE "editorial_entries"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

ALTER TABLE "editorial_entries"
ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "editorial_entries"
ADD CONSTRAINT "editorial_entries_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "editorial_entries_slug_key";
CREATE UNIQUE INDEX "editorial_entries_organization_id_slug_key"
ON "editorial_entries"("organization_id", "slug");

DROP INDEX IF EXISTS "editorial_entries_type_status_publishedAt_idx";
CREATE INDEX "editorial_entries_organization_id_type_status_publishedAt_idx"
ON "editorial_entries"("organization_id", "type", "status", "publishedAt");
