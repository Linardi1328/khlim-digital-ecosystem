# Real Admin Operations + Multi-Role Staff Milestone

## Goal

Move the KHLIM Admin Console from demo-only review data to persisted staging data while preserving the Phase 1B organization boundary, and support one staff identity holding multiple organization roles (for example Management + Coach) without shared accounts.

## Product decisions

- One human identity signs in once and may hold multiple organization staff roles.
- Backend authorization always evaluates the complete set of roles assigned to that organization membership.
- The Admin Console exposes an **active work view** switcher for roles actually assigned to the signed-in staff member. This changes navigation emphasis only; it never impersonates another user and never grants a role the account does not already hold.
- Audit attribution remains tied to the real signed-in identity, regardless of active work view.
- Demo mode remains available only as an explicit opt-in build flag for isolated UI previews. Real staging review must use persisted API data.
- Multi-organization runtime remains disabled until the separate Phase 1 exit criteria are satisfied.

## Scope

1. Connect the legacy Admin operational screens to organization-scoped persisted API reads for programmes, offerings, membership plans, memberships, athletes, guardians, payments, venues, sessions and staff.
2. Keep existing persisted reporting, governance, editorial, notification and access-control endpoints in place.
3. Allow real multi-role staff accounts to switch the Admin navigation work view among their assigned roles.
4. Preserve union-of-roles backend authorization; the work-view selector is not a security boundary.
5. Add password show/hide controls to public guardian registration/login and Admin staff sign-in.
6. Add regression and browser coverage proving real-mode screens no longer silently fall back to fabricated demo datasets.

## Safety / acceptance gates

- Every real operational read must resolve from the authenticated active organization.
- Finance data remains restricted to finance-capable roles.
- Organization staff roles continue to come only from OrganizationMembership/OrganizationRoleAssignment.
- No shared master credentials or account impersonation.
- Demo data must never be returned when `NEXT_PUBLIC_ADMIN_DEMO_MODE` is disabled.
- PPO validation, persistence/integration, Admin UI E2E, Web Preview E2E, payment and runtime gates must be green before owner review.
- Implementation debrief and owner approval are required before merge.
