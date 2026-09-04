CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(80) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organizations_status_check" CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED'))
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

INSERT INTO "organizations" ("id", "slug", "name", "status")
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'khlim-basketball',
  'KHLIM Basketball',
  'ACTIVE'
)
ON CONFLICT ("slug") DO NOTHING;

CREATE TABLE "organization_memberships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_memberships_status_check" CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "organization_memberships_organization_id_user_id_key"
  ON "organization_memberships"("organization_id", "user_id");
CREATE INDEX "organization_memberships_user_id_status_idx"
  ON "organization_memberships"("user_id", "status");
CREATE INDEX "organization_memberships_organization_id_status_idx"
  ON "organization_memberships"("organization_id", "status");

CREATE TABLE "organization_role_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_membership_id" UUID NOT NULL,
  "role" VARCHAR(40) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_role_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_role_assignments_role_check" CHECK (
    "role" IN ('COACH', 'SUPER_ADMIN', 'MANAGEMENT', 'FINANCE_ADMIN', 'ACADEMY_ADMIN', 'HEAD_COACH', 'EVENT_STAFF')
  ),
  CONSTRAINT "organization_role_assignments_membership_id_fkey" FOREIGN KEY ("organization_membership_id") REFERENCES "organization_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "organization_role_assignments_membership_id_role_key"
  ON "organization_role_assignments"("organization_membership_id", "role");
CREATE INDEX "organization_role_assignments_role_idx"
  ON "organization_role_assignments"("role");

CREATE TABLE "organization_settings" (
  "organization_id" UUID NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'MYR',
  "timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("organization_id"),
  CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "organization_branding" (
  "organization_id" UUID NOT NULL,
  "display_name" VARCHAR(180) NOT NULL,
  "logo_url" TEXT,
  "primary_color" VARCHAR(20),
  "secondary_color" VARCHAR(20),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_branding_pkey" PRIMARY KEY ("organization_id"),
  CONSTRAINT "organization_branding_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "organization_sports" (
  "organization_id" UUID NOT NULL,
  "sport_id" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_sports_pkey" PRIMARY KEY ("organization_id", "sport_id"),
  CONSTRAINT "organization_sports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_sports_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "organization_sports_organization_id_active_sort_order_idx"
  ON "organization_sports"("organization_id", "active", "sort_order");

INSERT INTO "organization_settings" ("organization_id", "currency", "timezone", "version")
SELECT
  '00000000-0000-4000-8000-000000000001'::uuid,
  COALESCE(ps."currency", 'MYR'),
  COALESCE(ps."timezone", 'Asia/Kuala_Lumpur'),
  COALESCE(ps."version", 1)
FROM (SELECT 1) seed
LEFT JOIN "platform_settings" ps ON ps."id" = 'academy-defaults'
ON CONFLICT ("organization_id") DO NOTHING;

INSERT INTO "organization_branding" ("organization_id", "display_name")
VALUES ('00000000-0000-4000-8000-000000000001'::uuid, 'KHLIM Basketball')
ON CONFLICT ("organization_id") DO NOTHING;

INSERT INTO "organization_sports" ("organization_id", "sport_id", "active", "sort_order")
SELECT
  '00000000-0000-4000-8000-000000000001'::uuid,
  s."id",
  s."active",
  s."sort_order"
FROM "sports" s
ON CONFLICT ("organization_id", "sport_id") DO NOTHING;

INSERT INTO "organization_memberships" ("organization_id", "user_id", "status")
SELECT
  '00000000-0000-4000-8000-000000000001'::uuid,
  ura."user_id",
  'ACTIVE'
FROM "user_role_assignments" ura
WHERE ura."role"::text IN (
  'COACH', 'SUPER_ADMIN', 'MANAGEMENT', 'FINANCE_ADMIN',
  'ACADEMY_ADMIN', 'HEAD_COACH', 'EVENT_STAFF'
)
GROUP BY ura."user_id"
ON CONFLICT ("organization_id", "user_id") DO UPDATE
SET "status" = 'ACTIVE', "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "organization_role_assignments" ("organization_membership_id", "role")
SELECT om."id", ura."role"::text
FROM "organization_memberships" om
JOIN "user_role_assignments" ura ON ura."user_id" = om."user_id"
WHERE om."organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
  AND ura."role"::text IN (
    'COACH', 'SUPER_ADMIN', 'MANAGEMENT', 'FINANCE_ADMIN',
    'ACADEMY_ADMIN', 'HEAD_COACH', 'EVENT_STAFF'
  )
ON CONFLICT ("organization_membership_id", "role") DO NOTHING;

ALTER TABLE "audit_events"
  ADD COLUMN "organization_id" UUID;

ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "audit_events"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

CREATE INDEX "audit_events_organization_id_created_at_idx"
  ON "audit_events"("organization_id", "created_at");

-- Transitional compatibility only: existing audit writers do not yet expose
-- organization_id through the Prisma model. Default their new rows to KHLIM
-- Organization #001 unless a future tenant-aware writer supplies another org.
CREATE FUNCTION "default_audit_event_organization"()
RETURNS trigger AS $$
BEGIN
  IF NEW."organization_id" IS NULL THEN
    NEW."organization_id" := '00000000-0000-4000-8000-000000000001'::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_events_default_organization"
BEFORE INSERT ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION "default_audit_event_organization"();
