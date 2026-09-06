-- Phase 1B: make finance roots organization-owned while preserving provider-global identifiers.
-- Historical rows belong to KHLIM Organization #001 during the compatibility phase.

ALTER TABLE "billing_profiles" ADD COLUMN "organization_id" UUID;
ALTER TABLE "payment_methods" ADD COLUMN "organization_id" UUID;
ALTER TABLE "payments" ADD COLUMN "organization_id" UUID;
ALTER TABLE "payment_provider_events" ADD COLUMN "organization_id" UUID;

UPDATE "billing_profiles"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

UPDATE "payment_methods" AS pm
SET "organization_id" = bp."organization_id"
FROM "billing_profiles" AS bp
WHERE pm."billing_profile_id" = bp."id"
  AND pm."organization_id" IS NULL;

UPDATE "payments" AS p
SET "organization_id" = m."organization_id"
FROM "memberships" AS m
WHERE p."membership_id" = m."id"
  AND p."organization_id" IS NULL;

-- Legacy payments that are not attached directly to a membership pre-date tenant
-- attribution, so compatibility assigns them to the seeded KHLIM organization.
UPDATE "payments"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

-- Provider events historically carried no persisted membership/payment ownership.
-- They remain KHLIM #001 until organization-specific webhook routing is introduced.
UPDATE "payment_provider_events"
SET "organization_id" = '00000000-0000-4000-8000-000000000001'::uuid
WHERE "organization_id" IS NULL;

ALTER TABLE "billing_profiles" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "payment_methods" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "payment_provider_events" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "billing_profiles"
  ADD CONSTRAINT "billing_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_methods"
  ADD CONSTRAINT "payment_methods_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_provider_events"
  ADD CONSTRAINT "payment_provider_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- A user may hold an independent provider customer profile in more than one
-- organization, but provider-native customer IDs remain globally unique.
DROP INDEX "billing_profiles_user_id_provider_key";
DROP INDEX "billing_profiles_status_idx";
CREATE UNIQUE INDEX "billing_profiles_organization_id_user_id_provider_key"
  ON "billing_profiles"("organization_id", "user_id", "provider");
CREATE INDEX "billing_profiles_organization_id_status_idx"
  ON "billing_profiles"("organization_id", "status");

DROP INDEX "payment_methods_billing_profile_id_status_idx";
CREATE INDEX "payment_methods_organization_id_billing_profile_id_status_idx"
  ON "payment_methods"("organization_id", "billing_profile_id", "status");

DROP INDEX "payments_membership_id_status_idx";
DROP INDEX "payments_payment_installment_id_status_idx";
CREATE INDEX "payments_organization_id_membership_id_status_idx"
  ON "payments"("organization_id", "membership_id", "status");
CREATE INDEX "payments_organization_id_payment_installment_id_status_idx"
  ON "payments"("organization_id", "payment_installment_id", "status");
CREATE INDEX "payments_organization_id_status_attempted_at_idx"
  ON "payments"("organization_id", "status", "attempted_at");

DROP INDEX "payment_provider_events_processing_status_received_at_idx";
CREATE INDEX "payment_provider_events_organization_id_processing_status_received_at_idx"
  ON "payment_provider_events"("organization_id", "processing_status", "received_at");

-- Intentionally retain these provider-global uniqueness constraints:
--   billing_profiles_provider_provider_customer_id_key
--   payment_methods_provider_provider_payment_method_reference_key
--   payments_provider_provider_payment_id_key
--   payments_idempotency_key_key
--   payment_provider_events_provider_provider_event_id_key
