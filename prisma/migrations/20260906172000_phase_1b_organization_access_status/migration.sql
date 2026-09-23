-- Phase 1B: organization access status is independent from global user status.
-- Keep INACTIVE for backward compatibility while allowing explicit suspension
-- and deactivation at the organization boundary.

ALTER TABLE "organization_memberships"
DROP CONSTRAINT IF EXISTS "organization_memberships_status_check";

ALTER TABLE "organization_memberships"
ADD CONSTRAINT "organization_memberships_status_check"
CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DEACTIVATED'));
