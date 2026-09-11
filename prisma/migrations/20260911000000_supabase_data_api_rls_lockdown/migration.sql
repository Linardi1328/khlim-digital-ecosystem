-- KHLIM application data is served through the authenticated API + Prisma.
-- Supabase Data API roles therefore receive the PostgreSQL RLS default-deny behavior
-- until a future PPO slice deliberately introduces narrowly scoped policies.
-- Table-owner access remains available to the server-side Prisma connection.

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_role_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_role_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_branding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_sports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."guardian_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."coach_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."athlete_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."guardian_athlete_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."guardian_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."courts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."programmes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."programme_offerings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_plan_offering_eligibilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."membership_agreements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_installments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_provider_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."editorial_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."training_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;
