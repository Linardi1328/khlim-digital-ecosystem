-- Phase 2 identity, profile, role, and family foundation.
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "UserRoleCode" AS ENUM ('GUARDIAN', 'ATHLETE', 'COACH', 'SUPER_ADMIN', 'MANAGEMENT', 'FINANCE_ADMIN', 'ACADEMY_ADMIN', 'HEAD_COACH', 'EVENT_STAFF');
CREATE TYPE "GuardianAthleteLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_provider_subject" TEXT NOT NULL,
    "email" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferred_locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRoleCode" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guardian_profiles" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guardian_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "coach_profiles" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "athlete_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "display_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "preferred_locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "athlete_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guardian_athlete_links" (
    "id" UUID NOT NULL,
    "guardian_user_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "relationship_type" TEXT,
    "status" "GuardianAthleteLinkStatus" NOT NULL DEFAULT 'PENDING',
    "created_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guardian_athlete_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_auth_provider_subject_key" ON "users"("auth_provider_subject");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE UNIQUE INDEX "user_role_assignments_user_id_role_key" ON "user_role_assignments"("user_id", "role");
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments"("role");
CREATE UNIQUE INDEX "athlete_profiles_user_id_key" ON "athlete_profiles"("user_id");
CREATE INDEX "athlete_profiles_date_of_birth_idx" ON "athlete_profiles"("date_of_birth");
CREATE UNIQUE INDEX "guardian_athlete_links_guardian_user_id_athlete_id_key" ON "guardian_athlete_links"("guardian_user_id", "athlete_id");
CREATE INDEX "guardian_athlete_links_guardian_user_id_status_idx" ON "guardian_athlete_links"("guardian_user_id", "status");
CREATE INDEX "guardian_athlete_links_athlete_id_status_idx" ON "guardian_athlete_links"("athlete_id", "status");

ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guardian_profiles" ADD CONSTRAINT "guardian_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "athlete_profiles" ADD CONSTRAINT "athlete_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guardian_athlete_links" ADD CONSTRAINT "guardian_athlete_links_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guardian_athlete_links" ADD CONSTRAINT "guardian_athlete_links_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guardian_athlete_links" ADD CONSTRAINT "guardian_athlete_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
