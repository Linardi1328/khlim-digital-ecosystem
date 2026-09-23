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

## Owner-gate re-review

The PR was re-reviewed after the walkthrough deployment branches landed on `main`. The failures were gate-contract issues rather than tenant-isolation or authentication regressions: four new Admin/API files needed repository Prettier formatting, and two desktop browser tests still targeted the previous `Switch demo role` accessibility label after the UI moved to the safer `Switch active work view` wording.

The repair keeps the security model unchanged: real authorization still uses the signed-in account's full organization role set, while the selected work view only filters Admin navigation. The temporary normalization workflow used during implementation was removed after formatting and browser-contract repair so it cannot land in the milestone merge.

A subsequent exact-head PPO run passed regression, localization, whitespace, lint, formatting, type checks and Prisma validation, then correctly detected generated OpenAPI drift from the newly registered `admin/operations-data` routes. The committed OpenAPI JSON and generated TypeScript schema were regenerated from the source API, and the temporary synchronization workflow was removed before this final owner-gate retry.

The Admin browser retry then confirmed the work-view trigger itself was reachable but exposed a test-selector mismatch: each assigned work view intentionally has the accessible role `menuitemradio`, not `button`. The browser gates now target that semantic role and retain the stronger ARIA contract. Exact repository Prettier output was applied to both adjusted E2E files, and the temporary formatter workflow removed itself before this final exact-head run.
