# Identity and Family Implementation Baseline

**Status:** Phase 2 implementation baseline

This document resolves the account-versus-athlete distinction needed for the website-first family journey.

## Authenticated users and managed athletes are different concepts

`User` represents an authenticated KHLIM account bound to a verified Supabase authentication-provider subject. It is the security principal used for sessions, account status, locale preference, and role assignments.

`AthleteProfile` represents the durable athlete/person record used by academy, membership, team, attendance, development, event, and future sports workflows. An athlete may optionally be linked to a `User` account later, but a child does **not** need an email address, Supabase identity, or login merely because a guardian registers them.

This preserves the required family flow:

```text
Guardian authenticates
    ↓
KHLIM User account
    ↓
GuardianProfile
    ↓
GuardianAthleteLink
    ↓
AthleteProfile (managed child; login optional)
```

If an athlete later receives their own authenticated account, `AthleteProfile.user_id` can link that account without replacing the athlete ID or losing historical memberships, attendance, evaluations, teams, or guardian relationships.

## Family relationship rule

Guardian-to-athlete ownership is many-to-many through `GuardianAthleteLink`.

- one guardian can manage multiple athletes;
- one athlete can have multiple authorized guardians;
- there is no direct `parent_id` column on the athlete;
- link status and approval/revocation timestamps preserve relationship history;
- hard deletion is not the normal way to revoke family access.

Relationship-aware authorization must check an active link at the point of sensitive athlete access. Possessing the `GUARDIAN` role alone is never sufficient to access an unrelated athlete.

## Roles

Authenticated users can hold multiple role assignments. Phase 2 starts with:

- `GUARDIAN`
- `ATHLETE`
- `COACH`
- `SUPER_ADMIN`
- `MANAGEMENT`
- `FINANCE_ADMIN`
- `ACADEMY_ADMIN`
- `HEAD_COACH`
- `EVENT_STAFF`

Roles are coarse authorization inputs, not substitutes for relationship, assignment, or resource-level checks.

## API trust boundary

The NestJS API uses two global guards:

1. **Authentication guard** — every non-public controller route must present a Bearer token that validates against the configured Supabase JWKS/issuer. The verified provider subject is resolved to a durable KHLIM `User`; first verified access provisions the KHLIM account record idempotently. Suspended or deactivated KHLIM accounts are rejected.
2. **Authorization guard** — every non-public route must explicitly declare either `@AllowAuthenticated()` or `@RequireAnyRole(...)`. A route with no authorization policy is denied by default.

Public endpoints must opt out explicitly with `@Public()`. The health endpoint is the initial public exception.

The API never trusts client-supplied role claims as KHLIM authorization truth. Roles and future family/coach/resource relationships come from the KHLIM database after the Supabase token establishes the external identity.

## Scope of this foundation

This tranche establishes schema, migration, identity resolution, authentication, and authorization policy primitives. It does not yet implement guardian onboarding forms, athlete CRUD/family-link APIs, staff role administration, admin MFA enforcement, account recovery/deactivation workflows, or athlete-specific relationship guards. Those are subsequent Phase 2 tranches built on this boundary.
