CREATE TYPE "TrainingSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

CREATE TABLE "training_sessions" (
  "id" UUID NOT NULL,
  "programme_offering_id" UUID,
  "title" VARCHAR(180) NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "venue_name" VARCHAR(180) NOT NULL,
  "court_name" VARCHAR(120),
  "coach_name" VARCHAR(160),
  "notes" TEXT,
  "status" "TrainingSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "cancellation_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_records" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "athlete_id" UUID NOT NULL,
  "athlete_name" VARCHAR(160) NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
  "notes" TEXT,
  "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "training_sessions_programme_offering_id_starts_at_status_idx" ON "training_sessions"("programme_offering_id", "starts_at", "status");
CREATE INDEX "training_sessions_starts_at_status_idx" ON "training_sessions"("starts_at", "status");
CREATE UNIQUE INDEX "attendance_records_session_id_athlete_id_key" ON "attendance_records"("session_id", "athlete_id");
CREATE INDEX "attendance_records_athlete_id_marked_at_idx" ON "attendance_records"("athlete_id", "marked_at");
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
