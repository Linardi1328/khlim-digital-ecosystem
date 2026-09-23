# Phase 2 — Persisted Admin Academy Writes

**Status:** Complete in implementation branch; validation pending

**Branches:**

- `phase-2-admin-persisted-writes` — Slice 2A, merged through PR #56
- `phase-2-complete-persisted-admin-writes` — Slices 2B–2D

## Objective

Remove pretend persistence from Academy Admin configuration. Every supported real-mode write must either persist through the organization-scoped backend and reload backend truth, or fail visibly without creating a local record that looks durable.

Demo mode remains explicitly non-persistent and may simulate UI state only when the interface clearly labels the change as non-persistent.

## Slice 2A — Programme creation

Completed through PR #56:

- active sports load from the authenticated organization;
- programme creation requires a real organization sport ID;
- creation writes through `POST /admin/academy/programmes`;
- organization resolution stays server-side;
- `SUPER_ADMIN` / `MANAGEMENT` / `ACADEMY_ADMIN` plus MFA enforcement is preserved;
- successful real writes reload the programme list from backend truth;
- failed writes keep the form available and never fabricate programme records;
- demo writes are explicitly labeled as simulated and non-persistent.

## Slice 2B — Offering configuration

Completed:

- removed optimistic local offering creation fallback;
- real creation reloads persisted offering data after success;
- added organization-scoped persisted `DRAFT` / `OPEN` / `CLOSED` / `INACTIVE` status mutations;
- eliminated React-only real-mode status transitions;
- programme and venue references remain validated by organization-scoped backend logic;
- demo status changes are allowed only as clearly labeled simulations.

## Slice 2C — Membership Plan configuration

Completed:

- removed optimistic local membership-plan creation fallback;
- MYR pricing remains converted to and persisted as minor units;
- backend-authoritative pricing and membership/payment state separation remain unchanged;
- added persisted active/inactive plan lifecycle mutation;
- failed writes no longer create local plan records that appear durable;
- demo plan mutations are explicitly non-persistent.

## Slice 2D — Venue and Court configuration

Completed:

- removed optimistic local venue creation fallback;
- exposed real court creation using `POST /admin/academy/venues/:venueId/courts`;
- real venue and court writes reload durable backend IDs;
- court creation is scoped under an organization-owned venue before persistence;
- failed venue/court writes never fabricate local durable IDs;
- closure periods remain read-only in this phase because no persisted Admin closure-write contract exists yet.

## Mutation security boundary

The new Offering-status and Membership-Plan-active mutation routes:

- derive organization context from the authenticated staff session;
- reject records outside the active organization;
- require `SUPER_ADMIN`, `MANAGEMENT`, or `ACADEMY_ADMIN`;
- require MFA;
- are internal Admin mutation routes and are intentionally excluded from the public generated OpenAPI client in this phase.

## Phase boundary

Phase 2 does not enable external multi-organization runtime. `KHLIM_MULTI_ORGANIZATION_ENABLED` remains unchanged/off until the separate tenant-runtime readiness gates are satisfied.

Phase 2 is complete only when the exact implementation head passes the repository regression suite, formatting, lint, type checks, Prisma validation, OpenAPI stability check, runtime builds, Admin UI E2E, Web Preview E2E, and the existing pre-alpha integration suites.
