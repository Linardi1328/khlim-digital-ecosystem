-- Defense-in-depth hardening for the Supabase-exposed public schema.
-- KHLIM operational data is served through the authenticated API + Prisma.
-- Browser clients use Supabase directly for Auth only.

-- Protect Prisma migration history from Supabase Data API roles while preserving
-- table-owner access for server-side Prisma migration operations.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Remove mutable search_path warnings from KHLIM trigger functions.
ALTER FUNCTION "public"."prevent_audit_event_mutation"()
  SET search_path = pg_catalog, public;
ALTER FUNCTION "public"."default_audit_event_organization"()
  SET search_path = pg_catalog, public;

-- Trigger functions are not public RPC endpoints. Prevent PUBLIC from executing
-- current or future postgres-owned functions in the public schema by default.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Supabase installs anon/authenticated roles, while local CI uses vanilla
-- PostgreSQL. Apply the direct-Data-API privilege lockdown when those roles are
-- present without making the migration non-portable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated';
  END IF;
END
$$;

-- Financial and capacity invariants are enforced in the application already;
-- these database checks prevent future server bugs or owner scripts from
-- persisting structurally invalid money/capacity values.
ALTER TABLE "public"."programme_offerings"
  ADD CONSTRAINT "programme_offerings_capacity_positive"
  CHECK ("capacity" > 0);

ALTER TABLE "public"."membership_plans"
  ADD CONSTRAINT "membership_plans_duration_positive"
  CHECK ("duration_months" IS NULL OR "duration_months" > 0),
  ADD CONSTRAINT "membership_plans_commitment_cycles_positive"
  CHECK ("commitment_cycles" IS NULL OR "commitment_cycles" > 0),
  ADD CONSTRAINT "membership_plans_recurring_amount_nonnegative"
  CHECK ("recurring_amount_minor" IS NULL OR "recurring_amount_minor" >= 0),
  ADD CONSTRAINT "membership_plans_upfront_amount_nonnegative"
  CHECK ("upfront_amount_minor" IS NULL OR "upfront_amount_minor" >= 0),
  ADD CONSTRAINT "membership_plans_currency_format"
  CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "membership_plans_session_allowance_positive"
  CHECK ("session_allowance" IS NULL OR "session_allowance" > 0);

ALTER TABLE "public"."membership_agreements"
  ADD CONSTRAINT "membership_agreements_amount_nonnegative"
  CHECK ("amount_minor_snapshot" >= 0),
  ADD CONSTRAINT "membership_agreements_installment_count_positive"
  CHECK ("installment_count_snapshot" > 0),
  ADD CONSTRAINT "membership_agreements_currency_format"
  CHECK ("currency_snapshot" ~ '^[A-Z]{3}$');

ALTER TABLE "public"."payment_methods"
  ADD CONSTRAINT "payment_methods_expiry_month_range"
  CHECK ("expiry_month" IS NULL OR "expiry_month" BETWEEN 1 AND 12),
  ADD CONSTRAINT "payment_methods_expiry_year_sane"
  CHECK ("expiry_year" IS NULL OR "expiry_year" >= 2000);

ALTER TABLE "public"."payment_schedules"
  ADD CONSTRAINT "payment_schedules_installment_count_positive"
  CHECK ("installment_count" > 0),
  ADD CONSTRAINT "payment_schedules_amount_positive"
  CHECK ("amount_per_installment_minor" > 0),
  ADD CONSTRAINT "payment_schedules_currency_format"
  CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "public"."payment_installments"
  ADD CONSTRAINT "payment_installments_sequence_positive"
  CHECK ("sequence_number" > 0),
  ADD CONSTRAINT "payment_installments_amount_positive"
  CHECK ("amount_minor" > 0),
  ADD CONSTRAINT "payment_installments_currency_format"
  CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_amount_positive"
  CHECK ("amount_minor" > 0),
  ADD CONSTRAINT "payments_attempt_number_positive"
  CHECK ("attempt_number" > 0),
  ADD CONSTRAINT "payments_currency_format"
  CHECK ("currency" ~ '^[A-Z]{3}$');
