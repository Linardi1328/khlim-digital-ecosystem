CREATE TYPE "NotificationType" AS ENUM ('ANNOUNCEMENT', 'SCHEDULE_CHANGE', 'BILLING', 'EDITORIAL', 'SYSTEM');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'ANNOUNCEMENT',
  "title" VARCHAR(180) NOT NULL,
  "body" TEXT NOT NULL,
  "programme_offering_id" UUID,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_receipts" (
  "id" UUID NOT NULL,
  "notification_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_receipts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_programme_offering_id_created_at_idx" ON "notifications"("programme_offering_id", "created_at");
CREATE INDEX "notifications_type_created_at_idx" ON "notifications"("type", "created_at");
CREATE UNIQUE INDEX "notification_receipts_notification_id_user_id_key" ON "notification_receipts"("notification_id", "user_id");
CREATE INDEX "notification_receipts_user_id_read_at_created_at_idx" ON "notification_receipts"("user_id", "read_at", "created_at");
ALTER TABLE "notification_receipts" ADD CONSTRAINT "notification_receipts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
