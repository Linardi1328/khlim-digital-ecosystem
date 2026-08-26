# Project Documentation

This directory is the source of truth for product, engineering, UX, security, and delivery decisions behind the **KHLIM Digital Sports Ecosystem**.

The confirmed direction is:

> **KHLIM Basketball first, website/member portal first, shared platform core, Super App later.**

The first public product is a revenue/operations-focused KHLIM website and family member portal. The Admin web application and NestJS API are developed alongside it. The native Expo client remains reserved for later activation and reuses the same backend/auth/payment/domain infrastructure.

## Current platform model

```text
                  KHLIM PLATFORM
                        │
       ┌────────────────┼────────────────┐
       │                │                │
    Website          Admin Web       Super App
     FIRST             FIRST           LATER
       │                │                │
       └────────────────┴────────────────┘
                        │
                   Shared REST API
                        │
               NestJS Modular Monolith
                        │
             PostgreSQL / Auth / Storage
                        │
           Payments / Notifications / Integrations
```

Key constraints:
- one KHLIM identity ecosystem;
- one authoritative relational database;
- shared API/auth/payment/notification foundations;
- business logic remains backend-authoritative;
- Programmes, Membership Plans, prices, venues, capacities, benefits, billing policies, and schedules are configurable rather than hard-coded;
- Guardian ↔ Athlete remains many-to-many;
- Programme, Team, Membership, Payment, and KHERO points remain distinct domain concepts;
- history is preserved where operationally meaningful;
- no raw card number/CVV storage;
- payment webhooks/idempotency/auditability are launch-critical;
- public launch requires controlled alpha/beta/pilot and no open P0/P1 defects.

## Documentation structure

```text
docs/
├── product/
│   ├── product-brief.md       # Why the ecosystem exists and current business/product priority
│   ├── platform-vision.md     # Long-term multi-channel/multi-service/multi-sport direction
│   ├── mvp-scope.md           # First website MVP scope and explicit deferrals
│   ├── requirements.md        # Implementation-oriented requirements
│   └── user-roles.md          # Family, athlete, coach, finance/admin permission model
│
├── roadmap/
│   └── development-roadmap.md # Phase 0 → website MVP → V1/V2 → Super App
│
├── architecture/
│   ├── system-architecture.md # Shared clients/API/domain/provider direction
│   ├── data-model.md          # Conceptual commercial + athlete relational model
│   ├── module-boundaries.md   # Domain ownership/coupling rules
│   ├── localization.md        # Multilingual architecture
│   └── deployment.md          # Environments, deployment, recovery, rollout
│
├── security/
│   └── security-and-privacy.md
│
├── ux/
│   └── core-user-workflows.md # Website registration/payment/member/admin flows + later modules
│
└── decisions/
    └── Architecture Decision Records (ADRs)
```

## Current MVP domain priorities

### Must build for first public website MVP
- Engineering foundation.
- Identity / Family / Authorization.
- Sport-aware Athlete foundation with Basketball enabled.
- Programmes / Programme Offerings.
- Membership Plans / Memberships.
- Billing / Payments / recurring schedules.
- Payment gateway abstraction/tokenization/webhooks/idempotency.
- Venues/Courts/basic scheduling.
- Public website + family/member portal.
- Admin/finance operations.
- Basic transactional email.
- Audit/security/monitoring/backups/recovery.
- Internal alpha → family beta → Academy pilot → limited production → public launch.

### Build after MVP as business scale justifies
- Dunning/overdue/suspension/reactivation automation.
- WhatsApp integration.
- Attendance/QR-assisted check-in.
- Benefits/Entitlements/starter-kit fulfilment.
- Athlete development/evaluations.
- KHLIM 3x3 and Camps.
- Native Super App.
- Commerce/private coaching/additional sports/advanced AI later.

## Architecture decisions

Major decisions are recorded in `docs/decisions/`. ADR 0008 records the website-first shared commercial-platform decision and supersedes the old delivery assumption that the player-first mobile experience should be the first functional vertical.

## Working rules

- Product behaviour should be documented before or alongside implementation.
- Major architecture choices receive an ADR.
- MVP scope changes update `product/mvp-scope.md`.
- Strategic future capabilities belong in `product/platform-vision.md` and must not silently become immediate scope.
- Financial/payment state and family/minor data require explicit security/audit/test coverage.
- Backend APIs remain authoritative for price, eligibility, permissions, payment state, membership state, and entitlements.
- Configuration is preferred for business concepts expected to change; security/integrity rules remain tested code/policy.
- Documentation states intended behaviour; code/tests become the exact runtime source of truth once implemented.
- Public launch is blocked by unresolved P0/P1 defects.

## Current stage

**Phase 1 — Engineering Foundation is active.**

The repository already contains the monorepo boundary, pinned tooling, Prisma/PostgreSQL boundary, shared TypeScript configs, foundation regression tests, and PPO PR validation. `apps/web` is now part of the required first-client structure alongside `apps/admin` and `apps/api`; `apps/mobile` remains reserved for later product activation.

Next Phase 1 work should complete real Next.js/NestJS scaffolding, environment/configuration, Supabase Auth integration skeleton, OpenAPI/client generation, localization runtime, observability, Prisma runtime/migrations, and full CI build/type/lint validation before Phase 2 identity/family implementation begins.
