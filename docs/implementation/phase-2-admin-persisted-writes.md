# Phase 2 — Persisted Admin Academy Writes

**Status:** In progress

**Branch:** `phase-2-admin-persisted-writes`

## Objective

Remove pretend persistence from the Academy Admin configuration path and make every supported real-mode write either:

1. persist successfully through the organization-scoped backend and reload from backend truth; or
2. fail visibly without creating a local record that looks persisted.

Demo mode remains explicitly non-persistent and isolated from real staff operation.

## Slice 2A — Programme creation

Acceptance requirements:

- load active sports from the authenticated organization;
- require an organization sport ID before programme creation;
- write through `POST /admin/academy/programmes`;
- keep organization resolution server-side;
- retain `SUPER_ADMIN` / `MANAGEMENT` / `ACADEMY_ADMIN` plus MFA enforcement;
- refresh the programme list from the backend after successful creation;
- show a visible error and keep the form available when the write fails;
- never fabricate a local programme ID or hard-code Basketball as a successful fallback;
- preserve explicit demo-mode non-persistence.

## Immediate follow-ups

### Slice 2B — Offering configuration

- remove optimistic local create fallback;
- add persisted offering status transitions instead of React-only OPEN/CLOSED/INACTIVE changes;
- verify programme/venue references remain organization-scoped.

### Slice 2C — Membership Plan configuration

- remove optimistic local create fallback;
- preserve minor-unit currency handling and backend-authoritative pricing;
- add explicit persisted lifecycle/status mutations where required.

### Slice 2D — Venue and Court configuration

- remove optimistic local venue fallback;
- expose real court creation using the existing organization-scoped backend endpoint;
- ensure venue/court references used by scheduling are durable persisted IDs.

## Phase boundary

This work does not enable external multi-organization runtime. `KHLIM_MULTI_ORGANIZATION_ENABLED` remains unchanged/off until the separate tenant-runtime readiness gates are satisfied.
