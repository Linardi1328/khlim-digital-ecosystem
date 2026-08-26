CREATE TYPE "BillingProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PaymentScheduleStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PaymentInstallmentStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'PAID', 'FAILED', 'OVERDUE', 'WAIVED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "PaymentProviderEventProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'ACTION_REQUIRED', 'FAILED');

CREATE TABLE "membership_agreements" (
  "id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "terms_version" TEXT NOT NULL,
  "accepted_by_user_id" UUID NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "amount_minor_snapshot" INTEGER NOT NULL,
  "currency_snapshot" TEXT NOT NULL,
  "billing_frequency_snapshot" "BillingFrequency" NOT NULL,
  "installment_count_snapshot" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "membership_agreements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "membership_agreements_membership_id_terms_version_key" ON "membership_agreements"("membership_id", "terms_version");
CREATE INDEX "membership_agreements_accepted_by_user_id_idx" ON "membership_agreements"("accepted_by_user_id");

CREATE TABLE "billing_profiles" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_customer_id" TEXT NOT NULL,
  "status" "BillingProfileStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "billing_profiles_user_id_provider_key" ON "billing_profiles"("user_id", "provider");
CREATE UNIQUE INDEX "billing_profiles_provider_provider_customer_id_key" ON "billing_profiles"("provider", "provider_customer_id");
CREATE INDEX "billing_profiles_status_idx" ON "billing_profiles"("status");

CREATE TABLE "payment_methods" (
  "id" UUID NOT NULL,
  "billing_profile_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_payment_method_reference" TEXT NOT NULL,
  "method_type" TEXT NOT NULL,
  "brand" TEXT,
  "last_four" TEXT,
  "expiry_month" INTEGER,
  "expiry_year" INTEGER,
  "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_methods_provider_provider_payment_method_reference_key" ON "payment_methods"("provider", "provider_payment_method_reference");
CREATE INDEX "payment_methods_billing_profile_id_status_idx" ON "payment_methods"("billing_profile_id", "status");

CREATE TABLE "payment_schedules" (
  "id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "frequency" "BillingFrequency" NOT NULL,
  "installment_count" INTEGER NOT NULL,
  "amount_per_installment_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "status" "PaymentScheduleStatus" NOT NULL DEFAULT 'PENDING',
  "provider_subscription_reference" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_schedules_membership_id_key" ON "payment_schedules"("membership_id");
CREATE INDEX "payment_schedules_status_idx" ON "payment_schedules"("status");

CREATE TABLE "payment_installments" (
  "id" UUID NOT NULL,
  "payment_schedule_id" UUID NOT NULL,
  "sequence_number" INTEGER NOT NULL,
  "due_at" TIMESTAMP(3) NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "PaymentInstallmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_installments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_installments_payment_schedule_id_sequence_number_key" ON "payment_installments"("payment_schedule_id", "sequence_number");
CREATE INDEX "payment_installments_status_due_at_idx" ON "payment_installments"("status", "due_at");

CREATE TABLE "payments" (
  "id" UUID NOT NULL,
  "payer_user_id" UUID NOT NULL,
  "membership_id" UUID,
  "payment_installment_id" UUID,
  "provider" TEXT NOT NULL,
  "provider_payment_id" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "attempt_number" INTEGER NOT NULL DEFAULT 1,
  "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settled_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "failure_code" TEXT,
  "safe_failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");
CREATE INDEX "payments_membership_id_status_idx" ON "payments"("membership_id", "status");
CREATE INDEX "payments_payment_installment_id_status_idx" ON "payments"("payment_installment_id", "status");

CREATE TABLE "payment_provider_events" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "processing_status" "PaymentProviderEventProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "payload_hash" TEXT NOT NULL,
  "safe_metadata" JSONB,
  CONSTRAINT "payment_provider_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_provider_events_provider_provider_event_id_key" ON "payment_provider_events"("provider", "provider_event_id");
CREATE INDEX "payment_provider_events_processing_status_received_at_idx" ON "payment_provider_events"("processing_status", "received_at");

ALTER TABLE "membership_agreements" ADD CONSTRAINT "membership_agreements_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_agreements" ADD CONSTRAINT "membership_agreements_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "billing_profiles" ADD CONSTRAINT "billing_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_billing_profile_id_fkey" FOREIGN KEY ("billing_profile_id") REFERENCES "billing_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_installments" ADD CONSTRAINT "payment_installments_payment_schedule_id_fkey" FOREIGN KEY ("payment_schedule_id") REFERENCES "payment_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_installment_id_fkey" FOREIGN KEY ("payment_installment_id") REFERENCES "payment_installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
