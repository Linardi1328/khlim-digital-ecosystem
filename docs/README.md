# Project Documentation

This directory is the source of truth for product, engineering, UX, security, testing, and delivery decisions behind the **KHLIM Digital Sports Ecosystem**.

The confirmed direction remains:

> **KHLIM Basketball first, website/member portal first, shared platform core, Super App later.**

The repository is no longer in early foundation-only development. Phases 0–4 have established the product, engineering, identity/family, programme/membership, and provider-neutral billing foundations; Phase 5 delivered the public website/member portal implementation; and Phase 6 delivered the staff operations console UI with explicit demo isolation and fail-closed production behavior.

The immediate milestone is now **pre-alpha integration and test hardening** before external family beta.

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
                   Shared REST API /v1
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
- Programmes, Membership Plans, prices, venues, capacities, billing policies, and schedules are configurable rather than hard-coded;
- Guardian ↔ Athlete remains many-to-many;
- Programme, Programme Offering, Team, Membership, Payment, and KHERO points remain distinct concepts;
- history is preserved where operationally meaningful;
- no raw card number/CVV storage;
- verified payment webhooks, idempotency, deduplication, and auditability are launch-critical;
- privileged admin operations fail closed unless real staff authentication and backend support are configured;
- public launch requires controlled alpha/beta/pilot and no open P0/P1 defects.

## Implementation status

| Area | Current state |
| --- | --- |
| Engineering foundation | Complete baseline with pinned Node/pnpm, Turborepo, CI, Prisma, OpenAPI, observability and deployment configuration |
| Identity/family/authorization | Implemented backend foundation with Supabase JWT verification, relationship-aware access and MFA-aware privileged controls |
| Programmes/memberships | Implemented backend/schema foundation with configurable offerings/plans and membership lifecycle |
| Billing/payments | Provider-neutral backend foundation implemented; real production gateway adapter still required |
| Public web/member portal | Implemented responsive UI and API/auth integration paths; staging/production integration must be exercised end to end |
| Admin operations | Broad responsive UI implemented; demo reads/writes are non-persistent and real privileged integration remains a pre-alpha task |
| Scheduling/notifications | Partial surfaces exist; production scheduling rules, exceptions and transactional delivery remain Phase 7 work |
| Testing/release | Automated regression/build/browser checks exist; next step is deeper integration/security/payment/recovery testing and internal alpha |

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

The next work should optimize for **truthful integration and failure testing**, not feature-count growth.

### Before internal alpha

- connect real staff authentication to the Admin application;
- connect supported Admin operations to real backend endpoints and keep unsupported operations disabled/fail-closed;
- integrate a real payment-provider sandbox adapter;
- verify signed webhook handling, duplicate events, retries and idempotency;
- finish the minimum scheduling/transactional-notification capability needed for a trustworthy family experience;
- create realistic non-production fixtures for multi-child families, memberships, payments, venues, schedules and staff roles;
- test authorization from the server boundary, including negative cases;
- exercise migration, backup/restore, monitoring and rollback procedures in staging;
- execute browser and API end-to-end flows across supported viewports and roles.

Once these gates are green, move into internal alpha followed by a **5–10 trusted-family closed beta**.

See `testing/pre-alpha-test-plan.md` for the working validation plan.

## Architecture decisions

Major decisions are recorded in `docs/decisions/`. ADR 0008 records the website-first shared commercial-platform decision and supersedes the older delivery assumption that the player-first mobile experience should be the first functional vertical.

## Working rules

- Product behaviour should be documented before or alongside implementation.
- Major architecture choices receive an ADR.
- MVP scope changes update `product/mvp-scope.md`.
- Strategic future capabilities belong in `product/platform-vision.md` and must not silently become immediate scope.
- Financial/payment state and family/minor data require explicit security, audit and test coverage.
- Backend APIs remain authoritative for price, eligibility, permissions, payment state, membership state and entitlements.
- Configuration is preferred for business concepts expected to change; security/integrity rules remain tested code/policy.
- Demo/preview behavior must be visibly non-production and must not create fake persisted state.
- Documentation states intended behaviour; code/tests become the exact runtime source of truth once implemented.
- Public launch is blocked by unresolved P0/P1 defects.

## Current stage

**Post-Phase 6 — pre-alpha integration and testing preparation.**

The next major product milestone is not another broad frontend phase. The project should now close remaining production integration gaps, complete the minimum Phase 7 operational dependencies, and prove the existing commercial/family/admin flows under realistic failure conditions before external users are invited.
