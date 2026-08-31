CREATE TABLE "audit_events" (
  "id" UUID NOT NULL,
  "actor_user_id" UUID,
  "actor_email" VARCHAR(320),
  "actor_roles" VARCHAR(320) NOT NULL,
  "action" VARCHAR(120) NOT NULL,
  "entity_type" VARCHAR(120) NOT NULL,
  "entity_id" VARCHAR(180) NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");
CREATE INDEX "audit_events_actor_user_id_created_at_idx" ON "audit_events"("actor_user_id", "created_at");
CREATE INDEX "audit_events_entity_type_created_at_idx" ON "audit_events"("entity_type", "created_at");
CREATE INDEX "audit_events_action_created_at_idx" ON "audit_events"("action", "created_at");

CREATE FUNCTION "prevent_audit_event_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_events_append_only"
BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION "prevent_audit_event_mutation"();

CREATE TABLE "platform_settings" (
  "id" VARCHAR(80) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'MYR',
  "timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "platform_settings" ("id", "currency", "timezone")
VALUES ('academy-defaults', 'MYR', 'Asia/Kuala_Lumpur')
ON CONFLICT ("id") DO NOTHING;
