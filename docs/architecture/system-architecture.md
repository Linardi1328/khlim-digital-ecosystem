# System Architecture

**Status:** Accepted current Phase 1 baseline

## Architectural style

KHLIM starts as a **modular monolith** with strict business-domain boundaries. This remains the preferred architecture for a small team because deployment, transactions, authorization, debugging, and operational ownership stay straightforward without giving up modularity.

The platform launches with KHLIM Basketball but is both **sport-aware** and **channel-aware**: multiple frontends use the same authoritative backend rather than owning separate copies of business logic.

## Core platform principle

> **One backend. One database. One authentication system. One payment infrastructure. Multiple frontends.**

The first production clients are the public/member website and the staff admin application. The native mobile client remains reserved for later activation.

```text
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Next.js Website      │   │ Next.js Admin       │   │ Expo Super App       │
│ Public + Member      │   │ KHLIM Staff         │   │ Later activation     │
└──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
           │                          │                          │
           └──────────────── HTTPS / REST /v1 ─────────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │ NestJS Modular Monolith  │
                         ├──────────────────────────┤
                         │ Identity / Family        │
                         │ Sports / Profiles        │
                         │ Programmes               │
                         │ Memberships              │
                         │ Billing / Payments       │
                         │ Benefits / Entitlements  │
                         │ Venues / Scheduling      │
                         │ Teams / Attendance       │
                         │ Development              │
                         │ Events / Tournaments     │
                         │ Camps                    │
                         │ KHERO / Rewards          │
                         │ Notifications            │
                         │ Localization / Audit     │
                         │ Integrations             │
                         └────────────┬─────────────┘
                                      │
                                    Prisma
                                      │
                        ┌─────────────┼──────────────┐
                        ▼             ▼              ▼
                  PostgreSQL      Storage      External Providers
                  Supabase        Supabase     Payments / Email /
                                              WhatsApp / Push / SMS
```

KHLIM Assist and future public/event channels consume approved APIs or read models from this platform; they do not maintain a second authoritative event database.

## Finalized Phase 1 technology direction

### Language/workspace
- TypeScript end-to-end.
- Node.js 24 LTS.
- pnpm Workspaces + Turborepo.

### Website and admin
- Next.js App Router.
- `apps/web`: public KHLIM website + authenticated family/member portal.
- `apps/admin`: staff operations/configuration.
- Tailwind/shadcn-style component strategy where appropriate.
- TanStack Query for client-side server state where needed.
- React Hook Form + Zod for forms/client validation.

### Mobile
- React Native + Expo + Expo Router.
- `apps/mobile` is reserved in Phase 1 but is not the first product vertical.
- EAS becomes materially important when the native client enters active product development.

### API
- NestJS modular monolith.
- REST with `/v1`-style versioning.
- OpenAPI contracts + generated typed client.
- Business logic and authorization remain backend-authoritative.

### Data/infrastructure
- PostgreSQL on Supabase.
- Prisma ORM + Prisma Migrate as schema migration authority.
- Supabase Auth and Storage.
- Singapore-region infrastructure where supported.

### Delivery/operations
- GitHub Actions / PPO validation workflow.
- Sentry + structured logs.
- Railway for NestJS initially.
- Vercel for both Next.js deployable applications initially.
- Payment, notification, and other replaceable providers behind explicit adapters.

## Client boundaries

### Public/member website

The website is the first customer interface and supports:
- public programme/service discovery;
- family account creation/login;
- linked athlete management;
- programme/membership selection;
- secure payment checkout;
- member dashboard, payments, membership, and schedules.

The website must never calculate authoritative membership prices, discounts, eligibility, or payment state solely in client code.

```text
Website
  ↓ generated REST client
NestJS API
  ↓ domain/application service
Prisma
  ↓
PostgreSQL
```

### Admin web

Admin is a separate Next.js client optimized for tables, configuration, finance/operations, imports, scheduling, and staff workflows. It uses the same domain APIs and must not bypass authorization/business rules because it is staff-facing.

### Mobile Super App

The Expo client later consumes the same APIs and identity/payment/member data. Native development must not create a second membership, payment, schedule, or event source of truth.

## Core domain boundaries

### Universal platform concepts
- User / role / authorization context;
- Guardian ↔ Athlete relationships;
- Sport;
- Programme / ProgrammeOffering;
- MembershipPlan / Membership;
- BillingProfile / PaymentMethod reference / PaymentSchedule / Payment;
- Benefit / Entitlement;
- Venue / Court / Session;
- Team / TeamMembership;
- Attendance;
- DevelopmentFramework / Evaluation;
- Event / Registration;
- Notification;
- AuditEvent.

### Basketball presentation/configuration
- UI term `Player`;
- KHLIM age groups and basketball programmes;
- basketball positions/teams;
- basketball development criteria;
- KHERO basketball presentation;
- basketball competition labels/formats.

Basketball-specific fields must not leak unnecessarily into Identity, Family, Billing, Notifications, or Audit.

## Programme, membership, and team distinction

These are separate concepts:

```text
Programme
  U12 Academy
      ↓
ProgrammeOffering
  U12 · Serdang · Saturday 10 AM · capacity 30
      ↓
Membership
  Jayden enrolled under 6-Month Plan

Team
  KHLIM U12 Competitive Team
```

An athlete may hold academy membership without belonging to a competitive team and may later progress to a team without losing membership history.

## Payment architecture

Billing is an explicit backend domain.

```text
Membership / Registration / Order
             │
             ▼
        Billing Service
             │
             ▼
     PaymentGateway interface
             │
             ▼
      Provider Adapter(s)
```

Rules:
- never store raw card number/CVV;
- use provider tokenization/hosted secure fields;
- store provider customer/payment-method references only as needed;
- verify signed webhooks server-side;
- deduplicate provider event IDs;
- use idempotency keys for charge-creating/retryable operations;
- backend calculates authoritative price and discount;
- payment lifecycle and membership lifecycle remain distinct;
- financial actions and manual adjustments are auditable;
- test/staging/production provider environments are isolated.

A browser success redirect is useful UX but is not final financial truth; verified provider events reconcile authoritative state.

## Notification architecture

Operational modules publish business events. Notifications selects channel/template/locale and records delivery attempts.

```text
Domain Event
   ↓
Notification Service
   ↓
Email / WhatsApp / Push / optional SMS
```

A provider outage should degrade that channel without crashing unrelated membership/payment/scheduling modules.

## Scheduling and attendance

Scheduling supports multiple venues/courts and recurring definitions separated from explicit occurrences so exceptions are safe.

```text
Venue → Court
ProgrammeOffering / Team
        ↓
SessionSeries / ScheduleRule
        ↓
Session occurrence
        ↓
Attendance
```

Venue/court closure, cancellation, rescheduling, and replacement sessions must preserve history.

Official attendance remains coach/staff-confirmed. Future QR/NFC check-in is an assisted signal, not automatic authoritative attendance unless a future ADR changes policy.

## Events, tournaments, camps, and KHLIM Assist

`Event` remains the generic publication/schedule foundation. Tournament and Camp capabilities extend it rather than creating unrelated calendar systems.

```text
Event
├── Tournament detail/registration
└── Camp detail/registration
```

KHLIM Assist may consume approved public event APIs/read models for website/social/member event questions. Sensitive member context must pass through authenticated authorization before retrieval.

## Data architecture

PostgreSQL remains appropriate because KHLIM contains relational and transactional workflows across:
- users/families;
- programmes/offers/memberships;
- payments/installments;
- benefits/entitlements;
- venues/sessions/attendance;
- teams/development;
- tournaments/camps/registrations;
- rewards/orders later.

Supabase supplies managed infrastructure; it does not own KHLIM business rules.

## API contract guidelines

- validate server-side;
- expose DTOs, not raw Prisma models by default;
- enforce authorization at execution;
- use stable opaque IDs;
- paginate/filter growing collections;
- make critical mutations retry-safe/idempotent;
- version breaking contracts deliberately;
- include actor/reason context for sensitive admin/financial mutations;
- support separate public and authenticated projections where the same entity has different audiences.

## Localization

Localization remains foundational:
- `en`, `ms`, `zh-Hans`, `zh-Hant`, `hi` registered initially;
- English fallback;
- per-account preferred locale;
- translation keys from first production screens;
- locale-aware date/number/currency rendering;
- admin-authored translation variants stay with their owning domain;
- payment amounts are stored as monetary values/currency, not localized formatted strings.

## Environment model

### Development
Local/isolated, synthetic/test data, payment-provider sandbox only.

### Staging
Production-like auth/API/database/payment integrations using separate credentials and data. Used for migrations, end-to-end tests, alpha/beta, and release candidates.

### Production
Real families and money. Controlled migrations/releases, strong staff access, monitoring, backup/restore, payment reconciliation, and incident procedures.

## Observability and failure containment

Before public launch, production must provide:
- structured logs + request correlation;
- web/API error monitoring;
- payment/webhook failure visibility;
- database health/backup visibility;
- notification delivery failures;
- high-severity alerting;
- cost/usage monitoring;
- rollback/forward-fix procedure;
- selective feature-disable controls for risky optional functionality where practical.

A failure in one external integration should not unnecessarily take down the rest of the platform.

## CI/CD direction

Pull requests progressively enforce:

```text
install
  ↓
lint
  ↓
typecheck
  ↓
unit/integration tests
  ↓
Prisma/migration validation
  ↓
web build
  ↓
admin build
  ↓
API build
  ↓
mobile validation when relevant
```

Production launch is a separate controlled decision from merging to `main`.

## Future extraction criteria

Do not introduce microservices simply because Billing, Events, or Notifications are important. Extract only for a concrete scaling, security, availability, ownership, cadence, or technology requirement.

## Future platform expansion

Additional sports should reuse the same identity, family, programme, membership, scheduling, payment, notification, and event foundations. True external multi-organization tenancy remains a separate future business/architecture decision.
