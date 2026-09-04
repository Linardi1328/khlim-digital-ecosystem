-- Phase 1B: establish direct organization ownership for operational roots
-- whose programme-offering linkage is optional.

ALTER TABLE "training_sessions" ADD COLUMN "organization_id" UUID;
ALTER TABLE "notifications" ADD COLUMN "organization_id" UUID;

UPDATE "training_sessions"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

UPDATE "notifications"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

ALTER TABLE "training_sessions"
  ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "notifications"
  ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "training_sessions"
  ADD CONSTRAINT "training_sessions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "training_sessions_programme_offering_id_starts_at_status_idx";
DROP INDEX "training_sessions_starts_at_status_idx";
CREATE INDEX "training_sessions_organization_id_programme_offering_id_starts_at_status_idx"
  ON "training_sessions"("organization_id", "programme_offering_id", "starts_at", "status");
CREATE INDEX "training_sessions_organization_id_starts_at_status_idx"
  ON "training_sessions"("organization_id", "starts_at", "status");

DROP INDEX "notifications_programme_offering_id_created_at_idx";
DROP INDEX "notifications_type_created_at_idx";
CREATE INDEX "notifications_organization_id_programme_offering_id_created_at_idx"
  ON "notifications"("organization_id", "programme_offering_id", "created_at");
CREATE INDEX "notifications_organization_id_type_created_at_idx"
  ON "notifications"("organization_id", "type", "created_at");
