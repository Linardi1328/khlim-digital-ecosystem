-- RIC-190 Academy Registration V1 (additive).
-- Synthetic-data local validation only; never applied to a hosted database by this change.
-- Unrelated pre-existing Prisma drift (default drops, index renames) is intentionally NOT included.

-- CreateEnum
CREATE TYPE "AcademyRegistrationStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AcademyRegistrationSessionState" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AcademyAgeReferenceRule" AS ENUM ('FIXED_DATE', 'SESSION_START_DATE', 'REGISTRATION_DATE');

-- CreateEnum
CREATE TYPE "AcademySessionRecurrence" AS ENUM ('NONE', 'WEEKLY');

-- CreateEnum
CREATE TYPE "AcademyRegistrationPolicyStatus" AS ENUM ('DRAFT', 'APPROVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AcademyConsentType" AS ENUM ('GUARDIAN_AUTHORITY', 'REGISTRATION_PRIVACY', 'MARKETING', 'PHOTOGRAPHY');

-- CreateTable
CREATE TABLE "academy_registration_policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "policy_version" VARCHAR(64) NOT NULL,
    "status" "AcademyRegistrationPolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" UUID,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_registration_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_registration_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "programme_offering_id" UUID NOT NULL,
    "coach_display_name" VARCHAR(120),
    "weekday" SMALLINT,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "first_session_date" DATE,
    "recurrence" "AcademySessionRecurrence",
    "age_reference_rule" "AcademyAgeReferenceRule",
    "age_reference_date" DATE,
    "publication_state" "AcademyRegistrationSessionState" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "published_by_user_id" UUID,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_registration_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_registrations" (
    "id" UUID NOT NULL,
    "reference_code" VARCHAR(16) NOT NULL,
    "organization_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "status" "AcademyRegistrationStatus" NOT NULL DEFAULT 'RECEIVED',
    "status_reason_code" VARCHAR(40),
    "status_changed_at" TIMESTAMP(3),
    "status_changed_by_user_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "session_name_snapshot" VARCHAR(180) NOT NULL,
    "player_full_name" VARCHAR(120) NOT NULL,
    "player_date_of_birth" DATE NOT NULL,
    "age_at_reference" SMALLINT NOT NULL,
    "age_reference_date_used" DATE NOT NULL,
    "player_gender" VARCHAR(16) NOT NULL,
    "player_jersey_size" VARCHAR(8) NOT NULL,
    "player_phone" VARCHAR(32),
    "guardian_full_name" VARCHAR(120) NOT NULL,
    "guardian_phone" VARCHAR(32) NOT NULL,
    "guardian_relationship" VARCHAR(24) NOT NULL,
    "guardian_authority_confirmed" BOOLEAN NOT NULL,
    "emergency_contact_name" VARCHAR(120) NOT NULL,
    "emergency_contact_phone" VARCHAR(32) NOT NULL,
    "emergency_contact_relationship" VARCHAR(24) NOT NULL,
    "source" VARCHAR(64),
    "idempotency_operation" VARCHAR(40) NOT NULL DEFAULT 'ACADEMY_REGISTRATION_CREATE',
    "idempotency_key_hmac" VARCHAR(64) NOT NULL,
    "payload_hmac" VARCHAR(64) NOT NULL,
    "hmac_key_version" VARCHAR(16) NOT NULL,
    "anonymized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_registration_consents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "consent_type" "AcademyConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policy_version" VARCHAR(64) NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "content_sha256" VARCHAR(64) NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_registration_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academy_registration_policies_organization_id_status_idx" ON "academy_registration_policies"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registration_policies_organization_id_policy_versio_key" ON "academy_registration_policies"("organization_id", "policy_version");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registration_policies_organization_id_id_key" ON "academy_registration_policies"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registration_sessions_programme_offering_id_key" ON "academy_registration_sessions"("programme_offering_id");

-- CreateIndex
CREATE INDEX "academy_registration_sessions_organization_id_publication_s_idx" ON "academy_registration_sessions"("organization_id", "publication_state");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registration_sessions_organization_id_id_key" ON "academy_registration_sessions"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registration_sessions_organization_id_programme_off_key" ON "academy_registration_sessions"("organization_id", "programme_offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registrations_reference_code_key" ON "academy_registrations"("reference_code");

-- CreateIndex
CREATE INDEX "academy_registrations_organization_id_status_created_at_id_idx" ON "academy_registrations"("organization_id", "status", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "academy_registrations_organization_id_session_id_status_idx" ON "academy_registrations"("organization_id", "session_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registrations_organization_id_id_key" ON "academy_registrations"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registrations_organization_id_idempotency_operation_key" ON "academy_registrations"("organization_id", "idempotency_operation", "idempotency_key_hmac");

-- CreateIndex
CREATE INDEX "academy_registration_consents_organization_id_consent_type__idx" ON "academy_registration_consents"("organization_id", "consent_type", "granted");

-- CreateIndex
CREATE INDEX "academy_registration_consents_policy_id_idx" ON "academy_registration_consents"("policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_registration_consents_registration_id_consent_type_key" ON "academy_registration_consents"("registration_id", "consent_type");

-- CreateIndex
CREATE UNIQUE INDEX "programme_offerings_organization_id_id_key" ON "programme_offerings"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "programmes_organization_id_id_key" ON "programmes"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "venues_organization_id_id_key" ON "venues"("organization_id", "id");

-- AddForeignKey
ALTER TABLE "academy_registration_policies" ADD CONSTRAINT "academy_registration_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_registration_sessions" ADD CONSTRAINT "academy_registration_sessions_organization_id_programme_of_fkey" FOREIGN KEY ("organization_id", "programme_offering_id") REFERENCES "programme_offerings"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_registrations" ADD CONSTRAINT "academy_registrations_organization_id_session_id_fkey" FOREIGN KEY ("organization_id", "session_id") REFERENCES "academy_registration_sessions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_registration_consents" ADD CONSTRAINT "academy_registration_consents_organization_id_registration_fkey" FOREIGN KEY ("organization_id", "registration_id") REFERENCES "academy_registrations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_registration_consents" ADD CONSTRAINT "academy_registration_consents_organization_id_policy_id_fkey" FOREIGN KEY ("organization_id", "policy_id") REFERENCES "academy_registration_policies"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Check constraints. Every comparison that can evaluate to SQL UNKNOWN on a
-- NULL is wrapped in COALESCE(..., false) so an incomplete published row can
-- never pass a CHECK (CHECK accepts TRUE and UNKNOWN).
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."academy_registration_policies"
  ADD CONSTRAINT "academy_registration_policies_version_nonblank"
  CHECK (COALESCE(length(btrim("policy_version")) > 0, false)),
  ADD CONSTRAINT "academy_registration_policies_approved_complete"
  CHECK ("status" <> 'APPROVED' OR COALESCE("approved_at" IS NOT NULL AND "approved_by_user_id" IS NOT NULL, false));

-- At most one current approved policy per organization.
CREATE UNIQUE INDEX "academy_registration_policies_one_approved_idx"
  ON "public"."academy_registration_policies" ("organization_id")
  WHERE "status" = 'APPROVED';

ALTER TABLE "public"."academy_registration_sessions"
  ADD CONSTRAINT "academy_registration_sessions_weekday_range"
  CHECK ("weekday" IS NULL OR COALESCE("weekday" BETWEEN 1 AND 7, false)),
  ADD CONSTRAINT "academy_registration_sessions_time_format"
  CHECK (
    ("start_time" IS NULL OR COALESCE("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$', false))
    AND ("end_time" IS NULL OR COALESCE("end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$', false))
  ),
  ADD CONSTRAINT "academy_registration_sessions_time_order"
  CHECK ("start_time" IS NULL OR "end_time" IS NULL OR COALESCE("start_time" < "end_time", false)),
  ADD CONSTRAINT "academy_registration_sessions_timezone_v1"
  CHECK ("timezone" = 'Asia/Kuala_Lumpur'),
  ADD CONSTRAINT "academy_registration_sessions_first_date_weekday"
  CHECK (
    "first_session_date" IS NULL OR "weekday" IS NULL
    OR COALESCE(EXTRACT(ISODOW FROM "first_session_date")::int = "weekday", false)
  ),
  ADD CONSTRAINT "academy_registration_sessions_age_reference_consistent"
  CHECK (
    ("age_reference_rule" IS DISTINCT FROM 'FIXED_DATE' OR "age_reference_date" IS NOT NULL)
    AND ("age_reference_rule" IS NOT DISTINCT FROM 'FIXED_DATE' OR "age_reference_date" IS NULL)
  ),
  ADD CONSTRAINT "academy_registration_sessions_coach_nonblank"
  CHECK ("coach_display_name" IS NULL OR COALESCE(length(btrim("coach_display_name")) > 0, false)),
  ADD CONSTRAINT "academy_registration_sessions_published_complete"
  CHECK (
    "publication_state" = 'DRAFT'
    OR (
      COALESCE("weekday" BETWEEN 1 AND 7, false)
      AND COALESCE("start_time" IS NOT NULL AND "end_time" IS NOT NULL AND "start_time" < "end_time", false)
      AND COALESCE("first_session_date" IS NOT NULL, false)
      AND COALESCE("recurrence" IS NOT NULL, false)
      AND COALESCE("age_reference_rule" IS NOT NULL, false)
      AND COALESCE("coach_display_name" IS NOT NULL AND length(btrim("coach_display_name")) > 0, false)
      AND COALESCE("published_at" IS NOT NULL AND "published_by_user_id" IS NOT NULL, false)
    )
  ),
  ADD CONSTRAINT "academy_registration_sessions_closed_has_timestamp"
  CHECK ("publication_state" <> 'CLOSED' OR COALESCE("closed_at" IS NOT NULL, false)),
  ADD CONSTRAINT "academy_registration_sessions_version_positive"
  CHECK ("version" >= 1);

ALTER TABLE "public"."academy_registrations"
  ADD CONSTRAINT "academy_registrations_reference_code_format"
  CHECK (COALESCE("reference_code" ~ '^KAR-[0-9A-HJKMNP-TV-Z]{8}$', false)),
  ADD CONSTRAINT "academy_registrations_guardian_authority_true"
  CHECK ("guardian_authority_confirmed" IS TRUE),
  ADD CONSTRAINT "academy_registrations_age_range"
  CHECK (COALESCE("age_at_reference" BETWEEN 3 AND 21, false)),
  ADD CONSTRAINT "academy_registrations_terminal_reason"
  CHECK ("status" NOT IN ('REJECTED', 'CANCELLED') OR COALESCE("status_reason_code" IS NOT NULL, false)),
  ADD CONSTRAINT "academy_registrations_hmac_format"
  CHECK (
    COALESCE("idempotency_key_hmac" ~ '^[0-9a-f]{64}$', false)
    AND COALESCE("payload_hmac" ~ '^[0-9a-f]{64}$', false)
  ),
  ADD CONSTRAINT "academy_registrations_version_positive"
  CHECK ("version" >= 1),
  ADD CONSTRAINT "academy_registrations_names_nonblank"
  CHECK (
    COALESCE(length(btrim("player_full_name")) > 0, false)
    AND COALESCE(length(btrim("guardian_full_name")) > 0, false)
    AND COALESCE(length(btrim("emergency_contact_name")) > 0, false)
  );

ALTER TABLE "public"."academy_registration_consents"
  ADD CONSTRAINT "academy_registration_consents_locale"
  CHECK ("locale" IN ('en', 'ms', 'zh-Hans')),
  ADD CONSTRAINT "academy_registration_consents_hash_format"
  CHECK (COALESCE("content_sha256" ~ '^[0-9a-f]{64}$', false)),
  ADD CONSTRAINT "academy_registration_consents_required_granted"
  CHECK ("consent_type" NOT IN ('GUARDIAN_AUTHORITY', 'REGISTRATION_PRIVACY') OR "granted" IS TRUE);

-- ---------------------------------------------------------------------------
-- Tenant integrity for legacy offering references (additive guard; the legacy
-- single-column foreign keys and their delete behaviour are unchanged).
-- ---------------------------------------------------------------------------
CREATE FUNCTION "public"."academy_offering_tenant_integrity"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "public"."programmes" p
    WHERE p."id" = NEW."programme_id" AND p."organization_id" = NEW."organization_id"
  ) THEN
    RAISE EXCEPTION 'CROSS_TENANT_REFERENCE' USING ERRCODE = '23514';
  END IF;
  IF NEW."venue_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "public"."venues" v
    WHERE v."id" = NEW."venue_id" AND v."organization_id" = NEW."organization_id"
  ) THEN
    RAISE EXCEPTION 'CROSS_TENANT_REFERENCE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "programme_offerings_tenant_integrity"
  BEFORE INSERT OR UPDATE OF "organization_id", "programme_id", "venue_id"
  ON "public"."programme_offerings"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_offering_tenant_integrity"();

-- ---------------------------------------------------------------------------
-- Offering guard: a registration-managed offering may not shrink below its
-- confirmed seats, lose its venue while published, or get an inverted window,
-- whichever writer performs the UPDATE.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "public"."academy_offering_registration_guard"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_session_id uuid;
  v_state "AcademyRegistrationSessionState";
  v_confirmed bigint;
BEGIN
  SELECT s."id", s."publication_state" INTO v_session_id, v_state
  FROM "public"."academy_registration_sessions" s
  WHERE s."programme_offering_id" = NEW."id";
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_confirmed
  FROM "public"."academy_registrations" r
  WHERE r."organization_id" = NEW."organization_id"
    AND r."session_id" = v_session_id AND r."status" = 'CONFIRMED';
  IF NEW."capacity" < v_confirmed THEN
    RAISE EXCEPTION 'CAPACITY_BELOW_CONFIRMED' USING ERRCODE = '23514';
  END IF;
  IF v_state = 'PUBLISHED' AND NEW."venue_id" IS NULL THEN
    RAISE EXCEPTION 'SESSION_INCOMPLETE' USING ERRCODE = '23514';
  END IF;
  IF NEW."enrollment_opens_at" IS NOT NULL
     AND NEW."enrollment_closes_at" IS NOT NULL
     AND NEW."enrollment_closes_at" < NEW."enrollment_opens_at" THEN
    RAISE EXCEPTION 'INVALID_ENROLLMENT_WINDOW' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "programme_offerings_registration_guard"
  BEFORE UPDATE OF "capacity", "venue_id", "enrollment_opens_at", "enrollment_closes_at"
  ON "public"."programme_offerings"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_offering_registration_guard"();

-- ---------------------------------------------------------------------------
-- Legacy checkout isolation: registration-managed offerings cannot receive
-- memberships or plan eligibilities, and an offering that already has either
-- cannot become registration-managed.
--
-- Isolation-level note (RIC-190 review): a row LOCK alone is not enough under
-- REPEATABLE READ or SERIALIZABLE, because the EXISTS check after the wait
-- still reads the transaction's original snapshot. Every writer on either side
-- therefore performs a no-op UPDATE of the offering row ("conflict marker").
-- Under READ COMMITTED the second writer waits and its next statement sees the
-- first writer's committed row; under REPEATABLE READ/SERIALIZABLE the second
-- writer fails with SQLSTATE 40001 (could not serialize). Either way at most
-- one side commits. `SET "id" = "id"` changes no key and fires none of the
-- column-specific offering triggers or foreign-key actions.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "public"."academy_membership_registration_isolation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE "public"."programme_offerings" SET "id" = "id"
    WHERE "id" = NEW."programme_offering_id";
  IF EXISTS (
    SELECT 1 FROM "public"."academy_registration_sessions" s
    WHERE s."programme_offering_id" = NEW."programme_offering_id"
  ) THEN
    RAISE EXCEPTION 'OFFERING_REGISTRATION_ONLY' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION "public"."academy_eligibility_registration_isolation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE "public"."programme_offerings" SET "id" = "id"
    WHERE "id" = NEW."offering_id";
  IF EXISTS (
    SELECT 1 FROM "public"."academy_registration_sessions" s
    WHERE s."programme_offering_id" = NEW."offering_id"
  ) THEN
    RAISE EXCEPTION 'OFFERING_REGISTRATION_ONLY' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION "public"."academy_session_requires_clean_offering"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Conflict marker (see the isolation-level note above).
  UPDATE "public"."programme_offerings" SET "id" = "id"
    WHERE "id" = NEW."programme_offering_id";
  IF EXISTS (
    SELECT 1 FROM "public"."memberships" m
    WHERE m."programme_offering_id" = NEW."programme_offering_id"
  ) OR EXISTS (
    SELECT 1 FROM "public"."membership_plan_offering_eligibilities" e
    WHERE e."offering_id" = NEW."programme_offering_id"
  ) THEN
    RAISE EXCEPTION 'OFFERING_HAS_LEGACY_USAGE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "memberships_registration_isolation"
  BEFORE INSERT OR UPDATE OF "programme_offering_id" ON "public"."memberships"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_membership_registration_isolation"();

CREATE TRIGGER "plan_eligibilities_registration_isolation"
  BEFORE INSERT OR UPDATE OF "offering_id" ON "public"."membership_plan_offering_eligibilities"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_eligibility_registration_isolation"();

CREATE TRIGGER "registration_sessions_clean_offering"
  BEFORE INSERT ON "public"."academy_registration_sessions"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_session_requires_clean_offering"();

-- ---------------------------------------------------------------------------
-- Immutable linkage: a session never moves to another offering/organization
-- (that would swap its capacity authority) and a registration never moves to
-- another session/organization or loses its receipt identity. There is no
-- approved V1 transfer workflow. ON UPDATE CASCADE from parents therefore also
-- fails closed.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "public"."academy_registration_session_identity_guard"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."organization_id" IS DISTINCT FROM OLD."organization_id"
     OR NEW."programme_offering_id" IS DISTINCT FROM OLD."programme_offering_id" THEN
    RAISE EXCEPTION 'REGISTRATION_LINKAGE_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "registration_sessions_identity_guard"
  BEFORE UPDATE ON "public"."academy_registration_sessions"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_registration_session_identity_guard"();

CREATE FUNCTION "public"."academy_registration_identity_guard"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."organization_id" IS DISTINCT FROM OLD."organization_id"
     OR NEW."session_id" IS DISTINCT FROM OLD."session_id"
     OR NEW."reference_code" IS DISTINCT FROM OLD."reference_code"
     OR NEW."session_name_snapshot" IS DISTINCT FROM OLD."session_name_snapshot"
     OR NEW."idempotency_operation" IS DISTINCT FROM OLD."idempotency_operation"
     OR NEW."idempotency_key_hmac" IS DISTINCT FROM OLD."idempotency_key_hmac"
     OR NEW."payload_hmac" IS DISTINCT FROM OLD."payload_hmac"
     OR NEW."hmac_key_version" IS DISTINCT FROM OLD."hmac_key_version"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION 'REGISTRATION_LINKAGE_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "academy_registrations_identity_guard"
  BEFORE UPDATE ON "public"."academy_registrations"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_registration_identity_guard"();

-- ---------------------------------------------------------------------------
-- A session can only enter PUBLISHED (insert or update) while its offering has
-- a venue. The offering guard covers the reverse direction (clearing a venue).
-- ---------------------------------------------------------------------------
CREATE FUNCTION "public"."academy_session_publish_requires_venue"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_venue uuid;
BEGIN
  IF NEW."publication_state" <> 'PUBLISHED'
     OR (TG_OP = 'UPDATE' AND OLD."publication_state" = 'PUBLISHED') THEN
    RETURN NEW;
  END IF;
  -- Conflict marker, then read the venue (fresh under READ COMMITTED).
  UPDATE "public"."programme_offerings" SET "id" = "id"
    WHERE "id" = NEW."programme_offering_id";
  SELECT o."venue_id" INTO v_venue
  FROM "public"."programme_offerings" o
  WHERE o."id" = NEW."programme_offering_id"
    AND o."organization_id" = NEW."organization_id";
  IF v_venue IS NULL THEN
    RAISE EXCEPTION 'SESSION_INCOMPLETE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "registration_sessions_publish_requires_venue"
  BEFORE INSERT OR UPDATE OF "publication_state" ON "public"."academy_registration_sessions"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_session_publish_requires_venue"();

-- ---------------------------------------------------------------------------
-- Parent organization changes: a programme or venue cannot move to another
-- organization while an offering of a different organization references it.
-- Deleting a venue keeps its legacy ON DELETE SET NULL behaviour.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "public"."academy_programme_tenant_move_guard"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."organization_id" IS DISTINCT FROM OLD."organization_id" AND EXISTS (
    SELECT 1 FROM "public"."programme_offerings" o
    WHERE o."programme_id" = NEW."id" AND o."organization_id" <> NEW."organization_id"
  ) THEN
    RAISE EXCEPTION 'CROSS_TENANT_REFERENCE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION "public"."academy_venue_tenant_move_guard"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW."organization_id" IS DISTINCT FROM OLD."organization_id" AND EXISTS (
    SELECT 1 FROM "public"."programme_offerings" o
    WHERE o."venue_id" = NEW."id" AND o."organization_id" <> NEW."organization_id"
  ) THEN
    RAISE EXCEPTION 'CROSS_TENANT_REFERENCE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "programmes_tenant_move_guard"
  BEFORE UPDATE OF "organization_id" ON "public"."programmes"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_programme_tenant_move_guard"();

CREATE TRIGGER "venues_tenant_move_guard"
  BEFORE UPDATE OF "organization_id" ON "public"."venues"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_venue_tenant_move_guard"();

-- ---------------------------------------------------------------------------
-- Registration state machine and capacity, enforced for any writer. The
-- application takes the same locks first (offering -> session -> registration);
-- this trigger re-takes the offering lock so even direct SQL cannot exceed
-- capacity. Messages are fixed codes and never contain row data.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "public"."academy_registration_state_guard"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_capacity integer;
  v_state "AcademyRegistrationSessionState";
  v_confirmed bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'RECEIVED' THEN
      RAISE EXCEPTION 'INVALID_INITIAL_STATUS' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD."status" = 'RECEIVED' AND NEW."status" IN ('UNDER_REVIEW', 'CONFIRMED', 'REJECTED', 'CANCELLED'))
    OR (OLD."status" = 'UNDER_REVIEW' AND NEW."status" IN ('CONFIRMED', 'REJECTED', 'CANCELLED'))
    OR (OLD."status" = 'CONFIRMED' AND NEW."status" = 'CANCELLED')
  ) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION' USING ERRCODE = '23514';
  END IF;

  IF NEW."status" = 'CONFIRMED' THEN
    SELECT o."capacity", s."publication_state" INTO v_capacity, v_state
    FROM "public"."academy_registration_sessions" s
    JOIN "public"."programme_offerings" o
      ON o."id" = s."programme_offering_id" AND o."organization_id" = s."organization_id"
    WHERE s."id" = NEW."session_id" AND s."organization_id" = NEW."organization_id"
    FOR UPDATE OF o;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = '23514';
    END IF;
    -- Conflict marker: concurrent confirmations, capacity changes and closures
    -- on one offering cannot both commit under REPEATABLE READ/SERIALIZABLE,
    -- where the count below would otherwise use a stale snapshot.
    UPDATE "public"."programme_offerings" o SET "id" = o."id"
      FROM "public"."academy_registration_sessions" s
      WHERE s."id" = NEW."session_id" AND o."id" = s."programme_offering_id";
    IF v_state <> 'PUBLISHED' THEN
      RAISE EXCEPTION 'SESSION_NOT_AVAILABLE' USING ERRCODE = '23514';
    END IF;
    SELECT count(*) INTO v_confirmed
    FROM "public"."academy_registrations" r
    WHERE r."organization_id" = NEW."organization_id"
      AND r."session_id" = NEW."session_id" AND r."status" = 'CONFIRMED' AND r."id" <> NEW."id";
    IF v_confirmed >= v_capacity THEN
      RAISE EXCEPTION 'CAPACITY_EXCEEDED' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "academy_registrations_state_guard"
  BEFORE INSERT OR UPDATE OF "status" ON "public"."academy_registrations"
  FOR EACH ROW EXECUTE FUNCTION "public"."academy_registration_state_guard"();

-- ---------------------------------------------------------------------------
-- RLS lockdown for Supabase Data API roles (same pattern as academy_leads).
-- No policies exist: direct Data API access is denied; Prisma (table owner)
-- is unaffected.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."academy_registration_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."academy_registration_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."academy_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."academy_registration_consents" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      FOREACH t IN ARRAY ARRAY[
        'academy_registration_policies',
        'academy_registration_sessions',
        'academy_registrations',
        'academy_registration_consents'
      ] LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE "public".%I FROM %I', t, r);
      END LOOP;
    END IF;
  END LOOP;
END
$$;
