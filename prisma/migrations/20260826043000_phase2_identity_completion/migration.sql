CREATE TYPE "GuardianInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

CREATE TABLE "guardian_invitations" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "invitee_email" TEXT NOT NULL,
    "relationship_type" TEXT,
    "token_hash" TEXT NOT NULL,
    "status" "GuardianInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_by_user_id" UUID,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guardian_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guardian_invitations_token_hash_key" ON "guardian_invitations"("token_hash");
CREATE INDEX "guardian_invitations_athlete_id_status_idx" ON "guardian_invitations"("athlete_id", "status");
CREATE INDEX "guardian_invitations_invitee_email_status_idx" ON "guardian_invitations"("invitee_email", "status");

ALTER TABLE "guardian_invitations"
ADD CONSTRAINT "guardian_invitations_athlete_id_fkey"
FOREIGN KEY ("athlete_id") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guardian_invitations"
ADD CONSTRAINT "guardian_invitations_invited_by_user_id_fkey"
FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guardian_invitations"
ADD CONSTRAINT "guardian_invitations_accepted_by_user_id_fkey"
FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
