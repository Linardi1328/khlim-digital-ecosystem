CREATE TYPE "ProgrammeOfferingStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'INACTIVE');
CREATE TYPE "BillingFrequency" AS ENUM ('MONTHLY', 'UPFRONT');
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

CREATE TABLE "sports" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "default_name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sports_code_key" ON "sports"("code");
CREATE INDEX "sports_active_sort_order_idx" ON "sports"("active", "sort_order");

CREATE TABLE "venues" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "venues_active_idx" ON "venues"("active");

CREATE TABLE "courts" (
  "id" UUID NOT NULL,
  "venue_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "courts_venue_id_name_key" ON "courts"("venue_id", "name");
CREATE INDEX "courts_venue_id_active_idx" ON "courts"("venue_id", "active");

CREATE TABLE "programmes" (
  "id" UUID NOT NULL,
  "sport_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "minimum_age" INTEGER,
  "maximum_age" INTEGER,
  "level" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "programmes_code_key" ON "programmes"("code");
CREATE INDEX "programmes_sport_id_active_idx" ON "programmes"("sport_id", "active");

CREATE TABLE "programme_offerings" (
  "id" UUID NOT NULL,
  "programme_id" UUID NOT NULL,
  "venue_id" UUID,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "enrollment_opens_at" TIMESTAMP(3),
  "enrollment_closes_at" TIMESTAMP(3),
  "starts_on" DATE,
  "ends_on" DATE,
  "status" "ProgrammeOfferingStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "programme_offerings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "programme_offerings_programme_id_status_idx" ON "programme_offerings"("programme_id", "status");
CREATE INDEX "programme_offerings_venue_id_status_idx" ON "programme_offerings"("venue_id", "status");

CREATE TABLE "membership_plans" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "duration_months" INTEGER,
  "commitment_cycles" INTEGER,
  "billing_frequency" "BillingFrequency" NOT NULL,
  "recurring_amount_minor" INTEGER,
  "upfront_amount_minor" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "session_allowance" INTEGER,
  "benefits_summary" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "membership_plans_active_idx" ON "membership_plans"("active");

CREATE TABLE "membership_plan_offering_eligibilities" (
  "id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "offering_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "membership_plan_offering_eligibilities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "membership_plan_offering_eligibilities_plan_id_offering_id_key" ON "membership_plan_offering_eligibilities"("plan_id", "offering_id");
CREATE INDEX "membership_plan_offering_eligibilities_offering_id_idx" ON "membership_plan_offering_eligibilities"("offering_id");

CREATE TABLE "memberships" (
  "id" UUID NOT NULL,
  "athlete_id" UUID NOT NULL,
  "programme_offering_id" UUID NOT NULL,
  "membership_plan_id" UUID NOT NULL,
  "purchased_by_user_id" UUID,
  "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "suspended_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "memberships_athlete_id_status_idx" ON "memberships"("athlete_id", "status");
CREATE INDEX "memberships_programme_offering_id_status_idx" ON "memberships"("programme_offering_id", "status");
CREATE INDEX "memberships_membership_plan_id_status_idx" ON "memberships"("membership_plan_id", "status");

ALTER TABLE "courts" ADD CONSTRAINT "courts_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "programme_offerings" ADD CONSTRAINT "programme_offerings_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "programme_offerings" ADD CONSTRAINT "programme_offerings_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "membership_plan_offering_eligibilities" ADD CONSTRAINT "membership_plan_offering_eligibilities_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_plan_offering_eligibilities" ADD CONSTRAINT "membership_plan_offering_eligibilities_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "programme_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_programme_offering_id_fkey" FOREIGN KEY ("programme_offering_id") REFERENCES "programme_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_membership_plan_id_fkey" FOREIGN KEY ("membership_plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_purchased_by_user_id_fkey" FOREIGN KEY ("purchased_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
