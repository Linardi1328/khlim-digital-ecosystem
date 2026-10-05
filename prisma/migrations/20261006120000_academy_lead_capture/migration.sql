-- CreateEnum
CREATE TYPE "AcademyLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'ENROLLED', 'CLOSED');

-- CreateTable
CREATE TABLE "academy_leads" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "guardian_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(254),
    "child_age" INTEGER NOT NULL,
    "programme_offering_id" UUID,
    "source" VARCHAR(64),
    "status" "AcademyLeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" VARCHAR(2000),
    "consent_at" TIMESTAMP(3) NOT NULL,
    "consent_version" VARCHAR(32) NOT NULL,
    "idempotency_key" VARCHAR(128),
    "payload_hash" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_rate_limits" (
    "id" UUID NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_leads_organization_id_idempotency_key_key" ON "academy_leads"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "academy_leads_organization_id_status_created_at_idx" ON "academy_leads"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "academy_leads_organization_id_created_at_idx" ON "academy_leads"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "academy_leads_organization_id_source_idx" ON "academy_leads"("organization_id", "source");

-- CreateIndex
CREATE INDEX "academy_leads_organization_id_programme_offering_id_idx" ON "academy_leads"("organization_id", "programme_offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_rate_limits_key_key" ON "submission_rate_limits"("key");

-- CreateIndex
CREATE INDEX "submission_rate_limits_expires_at_idx" ON "submission_rate_limits"("expires_at");

-- AddForeignKey
ALTER TABLE "academy_leads" ADD CONSTRAINT "academy_leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_leads" ADD CONSTRAINT "academy_leads_programme_offering_id_fkey" FOREIGN KEY ("programme_offering_id") REFERENCES "programme_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint
ALTER TABLE "public"."academy_leads"
  ADD CONSTRAINT "academy_leads_child_age_range"
  CHECK ("child_age" >= 3 AND "child_age" <= 18);

-- RLS lockdown for Supabase Data API roles
ALTER TABLE "public"."academy_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."submission_rate_limits" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "public"."academy_leads" FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "public"."submission_rate_limits" FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "public"."academy_leads" FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "public"."submission_rate_limits" FROM authenticated';
  END IF;
END
$$;
