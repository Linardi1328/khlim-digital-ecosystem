-- RIC-190 lock corrections (separately reviewed follow-up; the original
-- 20261125000000_academy_registration_v1 migration is frozen and unchanged).
--
-- 1. Conflict markers write a NON-KEY column ("updated_at" = "updated_at")
--    instead of "id" = "id". Because these tables have BEFORE UPDATE triggers,
--    PostgreSQL chooses the row-lock mode from the columns named in SET; naming
--    the primary key took a lock that conflicts with foreign-key KEY SHARE
--    checks, so an open FK check (for example another offering referencing the
--    same programme, or a lead referencing the offering) could block the
--    marker. A non-key no-op write takes FOR NO KEY UPDATE: it still creates a
--    new row version (so REPEATABLE READ/SERIALIZABLE writers still fail with
--    40001) and still serializes with other markers and FOR SHARE/UPDATE, but
--    no longer conflicts with KEY SHARE.
-- 2. The confirmation guard also locks the registration session row FOR SHARE
--    after the offering, so a direct session-only closure cannot be bypassed by
--    a REPEATABLE READ confirmation reading a stale snapshot.
--
-- Only function bodies change (CREATE OR REPLACE keeps owners, privileges and
-- the existing triggers). No table, data, RLS or grant changes.

CREATE OR REPLACE FUNCTION "public"."academy_offering_tenant_integrity"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Parent conflict marker: a no-op write to the referenced programme (and
  -- venue) row, so this offering write and a concurrent parent tenant move
  -- cannot both commit. The move's UPDATE holds the parent row; here the marker
  -- waits for it and then (READ COMMITTED) reads the committed organization in
  -- the next statement, or (REPEATABLE READ/SERIALIZABLE) fails with 40001. In
  -- the other order the move waits for this transaction and its guard then sees
  -- the committed offering, or fails with 40001. `SET "updated_at" = "updated_at"` changes no
  -- key (FK KEY SHARE locks from other offerings do not conflict) and fires no
  -- column-specific trigger.
  UPDATE "public"."programmes" SET "updated_at" = "updated_at" WHERE "id" = NEW."programme_id";
  IF NEW."venue_id" IS NOT NULL THEN
    UPDATE "public"."venues" SET "updated_at" = "updated_at" WHERE "id" = NEW."venue_id";
  END IF;
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

CREATE OR REPLACE FUNCTION "public"."academy_membership_registration_isolation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE "public"."programme_offerings" SET "updated_at" = "updated_at"
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

CREATE OR REPLACE FUNCTION "public"."academy_eligibility_registration_isolation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE "public"."programme_offerings" SET "updated_at" = "updated_at"
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

CREATE OR REPLACE FUNCTION "public"."academy_session_requires_clean_offering"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Conflict marker (see the isolation-level note above).
  UPDATE "public"."programme_offerings" SET "updated_at" = "updated_at"
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

CREATE OR REPLACE FUNCTION "public"."academy_session_publish_requires_venue"()
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
  UPDATE "public"."programme_offerings" SET "updated_at" = "updated_at"
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

CREATE OR REPLACE FUNCTION "public"."academy_registration_state_guard"()
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
    UPDATE "public"."programme_offerings" o SET "updated_at" = o."updated_at"
      FROM "public"."academy_registration_sessions" s
      WHERE s."id" = NEW."session_id" AND o."id" = s."programme_offering_id";
    -- Re-read AFTER the offering lock: the joined session row above came from
    -- the pre-wait snapshot, so a closure that committed while this trigger
    -- waited would otherwise still look PUBLISHED.
    SELECT o."capacity" INTO v_capacity
    FROM "public"."academy_registration_sessions" s
    JOIN "public"."programme_offerings" o
      ON o."id" = s."programme_offering_id" AND o."organization_id" = s."organization_id"
    WHERE s."id" = NEW."session_id" AND s."organization_id" = NEW."organization_id";
    -- Lock the session row too (after the offering: same order as every other
    -- writer). A session-only closure does not touch the offering, so without
    -- this lock a REPEATABLE READ confirmation would read the pre-closure
    -- snapshot. Under READ COMMITTED this waits for the closure and reads its
    -- committed state; under REPEATABLE READ/SERIALIZABLE a closure committed
    -- after the snapshot raises 40001.
    SELECT s."publication_state" INTO v_state
    FROM "public"."academy_registration_sessions" s
    WHERE s."id" = NEW."session_id" AND s."organization_id" = NEW."organization_id"
    FOR SHARE;
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
