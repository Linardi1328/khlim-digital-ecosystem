# Project Documentation

This directory is the source of truth for product, engineering, UX, security, testing, and delivery decisions behind the **KHLIM Digital Sports Ecosystem**.

The confirmed direction is now:

> **KHLIM Basketball first, website/member/admin foundation preserved, Organization tenancy next, Event + Evidence after that, Super App and advanced intelligence later.**

KHLIM becomes **Organization #001** inside one shared platform. The product keeps one durable athlete/family identity model while organization-owned operational, financial, event, content, media, and future merchandise data remain explicitly tenant-scoped.

The immediate implementation milestone is **Organization #001 Compatibility Slice**.

## Current platform model

```text
                   SHARED SPORTS PLATFORM
                           │
              Global Identity / Family
                           │
                    Organization Layer
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
 Public/Member Web      Admin Web         Future Super App
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                      REST API /v1
                           │
                  NestJS Modular Monolith
                           │
                 PostgreSQL / Auth / Storage
                           │
   Academy / Billing / Scheduling / Events / Evidence / Media
                           │
           Merchandise Marketing / Later Commerce
```

## Key constraints

- one durable platform identity ecosystem;
- Guardian ↔ Athlete remains many-to-many and is not duplicated per organization;
- `Organization` is the ownership/security boundary for tenant-owned operations;
- organization staff authority is scoped through organization membership/roles rather than global operational roles;
- one authoritative relational database initially uses shared-schema tenancy;
- business logic remains backend-authoritative;
- Programmes, Membership Plans, prices, venues, capacities, billing policies, schedules, events, organization branding, and merchandise marketing configuration are configurable where safe;
- Programme, Programme Offering, Team, Event, Membership, Payment, Evidence, and KHERO points remain distinct concepts;
- Evidence explains why a sporting fact is trusted; Audit explains who changed the system;
- AI-assisted ingestion creates reviewable candidates rather than silently verified facts;
- missing statistics/video remain unavailable rather than inferred;
- no raw card number/CVV storage;
- verified payment webhooks, idempotency, deduplication, tenant isolation, and auditability are release-critical;
- public launch/pilots require controlled validation and no open P0/P1 defects;
- white-label behavior uses one codebase, not per-organization forks;
- Merchandise Marketing can launch before full transactional Commerce and must not invent inventory/payment/fulfilment truth.

## Implementation status

| Area | Current state |
| --- | --- |
| Engineering foundation | Complete baseline with pinned Node/pnpm, Turborepo, CI, Prisma, OpenAPI, observability and deployment configuration |
| Identity/family/authorization | Strong single-organization foundation with Supabase JWT verification, relationship-aware access and MFA-aware privileged controls; organization scoping is the next security evolution |
| Programmes/memberships | Backend/schema foundation implemented with configurable offerings/plans and membership lifecycle; tenancy migration and live Admin wiring remain |
| Billing/payments | Provider-neutral correctness foundation exists; sandbox/production operating model and tenant attribution require continued validation |
| Public web/member portal | Responsive implementation and API/auth integration exist; production/staging workflows still require launch-gate validation |
| Admin operations | Broad UI/governance/reporting/audit foundation exists; remaining Academy configuration needs real persisted live integration |
| Scheduling/attendance/notifications | Implemented foundations exist; deeper operational rules/integration continue to mature |
| Organization tenancy | Planned/accepted architecture; Organization #001 compatibility is the next implementation milestone |
| Event OS | Planned after tenant-aware existing operations are stable |
| Evidence / Athlete Record | Architecture accepted; implementation follows real Event facts rather than manual profile duplication |
| Merchandise Marketing | Planned organization-owned growth feature; lightweight catalog/interest first, transactional Commerce later if validated |
| AI/video/Twin | Explicitly later and evidence-gated |

## Documentation structure

```text
docs/
├── product/
│   ├── product-brief.md
│   ├── platform-vision.md
│   ├── mvp-scope.md
│   ├── requirements.md
│   └── user-roles.md
│
├── roadmap/
│   └── development-roadmap.md
│
├── testing/
│   └── pre-alpha-test-plan.md
│
├── architecture/
│   ├── system-architecture.md
│   ├── data-model.md
│   ├── identity-family.md
│   ├── module-boundaries.md
│   ├── platform-expansion-backend.md
│   ├── localization.md
│   └── deployment.md
│
├── security/
│   └── security-and-privacy.md
│
├── ux/
│   └── core-user-workflows.md
│
└── decisions/
    └── Architecture Decision Records (ADRs)
```

## Current development priority

The next work should establish tenant ownership without destabilizing KHLIM's existing product.

### Organization #001 Compatibility Slice

- create the Organization kernel;
- create KHLIM Basketball as Organization #001;
- migrate current organization-owned data through expand/backfill/switch/constrain steps;
- introduce organization membership and organization-scoped staff roles;
- make tenant-owned reads/writes/reporting/audit organization-aware;
- add malicious cross-tenant authorization tests using a synthetic Organization #002;
- preserve current KHLIM public/member/admin URLs and branding during the migration.

### Immediately after

- finish real persisted Admin Academy configuration under the tenant boundary;
- complete tenant-aware operational hardening for Programmes, Memberships, Venues, Scheduling, Billing attribution, Notifications, and Audit;
- build the first KHLIM Event OS vertical slice;
- attach Evidence/Verification so accepted tournament facts project into athlete history;
- onboard a real Organization #002 before advanced AI/video work.

Merchandise Marketing may be pulled forward as a small public-growth feature after tenant ownership/branding are stable if KHLIM has real products to promote. Full orders/inventory/fulfilment remain separate later scope.

See `roadmap/development-roadmap.md` for the sequence and `architecture/platform-expansion-backend.md` for backend implementation guidance.

## Architecture decisions

Major decisions are recorded in `docs/decisions/`.

The latest platform-expansion decisions are:

- ADR 0009 — Organization tenancy and ownership boundaries;
- ADR 0010 — Organization-scoped authorization;
- ADR 0011 — Evidence, provenance, and corrections.

ADR 0009 supersedes only the earlier no-prebuilt-tenancy guardrail in ADR 0005; the basketball-first, sport-aware core remains accepted.

## Working rules

- Product behaviour should be documented before or alongside implementation.
- Major architecture choices receive an ADR rather than silently rewriting old decisions.
- Strategic scope changes update the roadmap/platform vision.
- Financial/payment state, tenant boundaries, family/minor data, portable athlete history, and media require explicit security/audit/test coverage.
- Backend APIs remain authoritative for price, eligibility, permissions, organization ownership, payment state, membership state, results verification, and entitlements.
- Configuration is preferred for business concepts expected to change; security/integrity rules remain tested code/policy.
- Demo/preview behavior must be visibly non-production and must not create fake persisted state.
- Documentation states intended behaviour; code/tests become the exact runtime source of truth once implemented.
- Public launch or external organization pilots are blocked by unresolved P0/P1 defects.

## Current stage

**Strategic expansion alignment complete; Organization #001 Compatibility Slice is next.**

The project should establish the tenant boundary first, then finish live KHLIM operational integration, then prove the Event → Evidence → Athlete History loop before broad external commercialization or advanced intelligence investment.
