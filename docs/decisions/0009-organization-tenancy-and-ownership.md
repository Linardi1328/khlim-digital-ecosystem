# ADR 0009 — Organization Tenancy and Ownership Boundaries

**Status:** Accepted

**Supersedes:** the no-prebuilt-tenancy guardrail in ADR 0005 where it conflicts with the now-validated platform direction. ADR 0005 remains accepted for basketball-first, sport-aware design.

## Context

KHLIM began as the only operating organization, so the original architecture correctly avoided speculative external-club tenancy. The product direction has now expanded: the same platform should be capable of serving KHLIM and additional sports organizations while preserving one durable athlete identity, strong tenant isolation, white-label presentation, and organization-owned operations.

Retrofitting tenancy after Events, Teams, Results, Evidence, Media, and athlete-history data have accumulated would create a large migration and security risk. The platform therefore needs an explicit organization boundary before those capabilities expand materially.

## Decision

Use a **shared PostgreSQL database and shared schema** initially, with an explicit `Organization` aggregate and organization ownership on tenant-owned records.

Key rules:

1. `User`, `AthleteProfile`, Guardian ↔ Athlete relationships, and the base `Sport` catalogue remain platform/global concepts unless a later requirement proves otherwise.
2. Organization-owned records carry an explicit `organizationId` or are owned transitively by an aggregate that does.
3. Initial organization-owned domains include staff memberships/permissions, Programmes, Programme Offerings, Membership Plans, Memberships, Venues/Courts, Teams, Events, Registrations, Rosters, Games/Results, Scheduling, organization notifications/content, media ownership, and operational settings.
4. KHLIM becomes **Organization #001** through a controlled migration; the visible KHLIM experience should not require a product rewrite.
5. Organization-specific uniqueness uses compound constraints such as `(organizationId, code)` rather than global uniqueness where appropriate.
6. Cross-organization athlete identity does not imply cross-organization data visibility. Portability and disclosure are separate policies.
7. One database per organization is not adopted at this stage because it would add migration, backup, operations, and global-identity complexity without proven scale need.
8. Organization resolution is server-authoritative. A client-supplied organization ID is never sufficient proof of access.
9. Database constraints, audit records, and adversarial tenant-isolation tests provide defense in depth. Application authorization remains mandatory even if database row-level security is introduced later.
10. Tenant-specific application forks are rejected. White-label behavior must use shared code plus organization configuration.

## Migration strategy

Use an expand → backfill → switch → constrain sequence:

1. add nullable organization ownership fields;
2. create KHLIM Organization #001;
3. backfill existing KHLIM-owned operational records;
4. switch service queries and API authorization to organization-aware access;
5. add tenant-aware indexes and compound uniqueness;
6. validate every existing record;
7. make organization ownership non-null where the domain requires it;
8. remove temporary implicit-KHLIM fallbacks.

## Consequences

### Positive

- tenant isolation is established before Event/Evidence data scales;
- KHLIM can continue using the same platform and URLs;
- a second organization can be onboarded without a separate codebase;
- global athlete/family identity can support later portable verified history;
- white-label organization settings become straightforward.

### Tradeoffs / risks

- many current single-organization models need careful migration;
- every tenant-owned query must be reviewed for scope leakage;
- global identity introduces privacy and disclosure decisions that must remain explicit;
- shared-schema tenancy requires strong automated adversarial testing.

## Rejected approaches

### Rebuild as a new multi-tenant product
Rejected because the current identity, family, Academy, Billing, Scheduling, Audit, API, web, and admin foundations remain useful and migration risk would increase.

### Database per organization now
Rejected because current scale and team size do not justify the operational complexity.

### Keep KHLIM implicit until external sales begin
Rejected because Events, Results, Evidence, and Media would otherwise accumulate single-tenant assumptions that are expensive and risky to unwind later.
