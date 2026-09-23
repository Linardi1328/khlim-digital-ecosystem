-- Phase 1B: establish direct organization ownership for Academy aggregate roots.
-- External multi-organization runtime remains disabled until the remaining
-- finance, scheduling, editorial, reporting, and governance surfaces are scoped.

ALTER TABLE "venues" ADD COLUMN "organization_id" UUID;
ALTER TABLE "programmes" ADD COLUMN "organization_id" UUID;
ALTER TABLE "programme_offerings" ADD COLUMN "organization_id" UUID;
ALTER TABLE "membership_plans" ADD COLUMN "organization_id" UUID;
ALTER TABLE "memberships" ADD COLUMN "organization_id" UUID;

UPDATE "venues"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

UPDATE "programmes"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

UPDATE "programme_offerings"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

UPDATE "membership_plans"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

UPDATE "memberships"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

ALTER TABLE "venues"
  ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "programmes"
  ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "programme_offerings"
  ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "membership_plans"
  ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "memberships"
  ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "venues"
  ADD CONSTRAINT "venues_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "programmes"
  ADD CONSTRAINT "programmes_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "programme_offerings"
  ADD CONSTRAINT "programme_offerings_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_plans"
  ADD CONSTRAINT "membership_plans_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "programmes_code_key";
CREATE UNIQUE INDEX "programmes_organization_id_code_key"
  ON "programmes"("organization_id", "code");

DROP INDEX "venues_active_idx";
CREATE INDEX "venues_organization_id_active_idx"
  ON "venues"("organization_id", "active");

DROP INDEX "programmes_sport_id_active_idx";
CREATE INDEX "programmes_organization_id_sport_id_active_idx"
  ON "programmes"("organization_id", "sport_id", "active");

DROP INDEX "programme_offerings_programme_id_status_idx";
DROP INDEX "programme_offerings_venue_id_status_idx";
CREATE INDEX "programme_offerings_organization_id_programme_id_status_idx"
  ON "programme_offerings"("organization_id", "programme_id", "status");
CREATE INDEX "programme_offerings_organization_id_venue_id_status_idx"
  ON "programme_offerings"("organization_id", "venue_id", "status");

DROP INDEX "membership_plans_active_idx";
CREATE INDEX "membership_plans_organization_id_active_idx"
  ON "membership_plans"("organization_id", "active");

DROP INDEX "memberships_athlete_id_status_idx";
DROP INDEX "memberships_programme_offering_id_status_idx";
DROP INDEX "memberships_membership_plan_id_status_idx";
CREATE INDEX "memberships_organization_id_athlete_id_status_idx"
  ON "memberships"("organization_id", "athlete_id", "status");
CREATE INDEX "memberships_organization_id_programme_offering_id_status_idx"
  ON "memberships"("organization_id", "programme_offering_id", "status");
CREATE INDEX "memberships_organization_id_membership_plan_id_status_idx"
  ON "memberships"("organization_id", "membership_plan_id", "status");
