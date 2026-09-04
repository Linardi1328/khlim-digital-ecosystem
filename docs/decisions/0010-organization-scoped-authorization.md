# ADR 0010 — Organization-Scoped Authorization

**Status:** Accepted

## Context

The current system has strong deny-by-default authorization, MFA requirements for sensitive administration, and relationship-aware Guardian ↔ Athlete access. However, staff role assignments are currently global. Once multiple organizations exist, a global `ACADEMY_ADMIN`, `FINANCE_ADMIN`, `COACH`, or similar role would create unacceptable cross-tenant privilege risk.

## Decision

Separate **platform identity/roles** from **organization membership/roles**.

Conceptually:

```text
Authenticated User
    + active OrganizationMembership
    + organization-scoped role/permission
    + resource relationship/policy
    = authorization decision
```

Key rules:

1. Organization operational permissions are granted through `OrganizationMembership` and organization-scoped role assignments.
2. Rare platform-wide powers, such as true platform operator administration, remain separate from organization roles and receive stronger safeguards.
3. Guardian and Athlete identity semantics are not converted into organization staff roles.
4. Every tenant-owned backend operation resolves an authoritative organization context before reading or mutating data.
5. A role name alone never grants access to another organization's resources.
6. Finance, coaching, event operations, academy operations, and management scopes remain distinguishable.
7. MFA/AAL2 remains mandatory for sensitive organization administration where policy requires it.
8. Tenant ownership is checked at the point of sensitive execution, not only in navigation/UI filtering.
9. Cross-organization access attempts are treated as authorization failures even when the caller knows valid opaque resource IDs.
10. Tests must include malicious cross-tenant combinations, stale memberships, suspended users, and resource IDs belonging to other organizations.

## Suggested model

```text
User
  ├─ PlatformRoleAssignment[]          // rare, platform-level only
  └─ OrganizationMembership[]
         └─ OrganizationRoleAssignment[]

Organization
  └─ OrganizationMembership[]
```

Organization role codes may initially reuse familiar role names such as `MANAGEMENT`, `FINANCE_ADMIN`, `ACADEMY_ADMIN`, `HEAD_COACH`, `COACH`, and `EVENT_STAFF`, but their authority is scoped to one organization.

## Consequences

### Positive

- prevents global staff-role leakage across organizations;
- preserves the current least-privilege philosophy;
- supports one person belonging to multiple organizations with different permissions;
- enables independent organization administration without duplicating user identities.

### Tradeoffs

- existing staff role data must be migrated to KHLIM Organization #001;
- authorization helpers/controllers/services need organization context plumbing;
- administrative reporting and audit views must distinguish platform-level from organization-level actions.

## Rejected approaches

### Keep global roles and filter by organization in the UI
Rejected because UI filtering is not a security boundary.

### Create separate user accounts per organization
Rejected because it breaks the one-identity platform direction and creates duplicate people, credentials, family relationships, and athlete history.
