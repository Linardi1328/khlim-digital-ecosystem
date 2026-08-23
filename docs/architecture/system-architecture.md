# System Architecture

**Status:** Accepted for Phase 1 baseline

## Architectural style

Start with a **modular monolith** rather than microservices.

This keeps development, deployment, debugging, authorization, and transactions straightforward for a small team while still enforcing clean boundaries between business domains. A module may later be extracted into a separate service only if scale, security, ownership, or operational needs justify it.

The product launches as KHLIM Basketball, but the platform core is **sport-aware** rather than basketball-only.

## Finalized Phase 1 technology direction

### Language and workspace
- TypeScript end-to-end.
- Node.js 24 LTS.
- pnpm Workspaces.
- Turborepo.

### Mobile
- React Native with Expo.
- Expo Router.
- EAS development/build/submit/update tooling.
- TanStack Query for API/server state.
- React Hook Form + Zod where forms are required.

### Admin web
- Next.js App Router.
- Tailwind CSS + shadcn/ui for operational/admin interface components.
- TanStack Query where client-side API state is needed.

### API
- NestJS modular monolith.
- REST API with `/v1`-style versioning where appropriate.
- OpenAPI specification and generated typed clients.

### Data and managed infrastructure
- PostgreSQL hosted through Supabase.
- Prisma ORM and Prisma Migrate as application-schema migration authority.
- Supabase Auth for authentication infrastructure.
- Supabase Storage for approved media/assets.
- Singapore-region infrastructure where supported.

### Delivery and operations
- GitHub Actions for CI/CD.
- Sentry for initial error/crash monitoring.
- EAS for mobile build/release pipeline.
- Railway for NestJS deployment initially.
- Vercel for Next.js admin deployment initially.

Provider-specific calls must remain behind application/provider abstractions where vendor replacement is plausible.

## High-level system

```text
┌─────────────────────────┐      ┌─────────────────────────┐
│ Expo Mobile Application │      │ Next.js Admin Web App   │
│ Player/Parent/Coach     │      │ KHLIM Staff             │
└───────────┬─────────────┘      └────────────┬────────────┘
            │                                 │
            └──────── HTTPS / REST API ───────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │   NestJS Application   │
                 │    Modular Monolith    │
                 ├────────────────────────┤
                 │ Identity               │
                 │ Profiles / Athletes    │
                 │ Family                 │
                 │ Sports                 │
                 │ Teams / Seasons        │
                 │ Training               │
                 │ Attendance             │
                 │ Development            │
                 │ Events / Competitions  │
                 │ Announcements          │
                 │ KHERO                  │
                 │ Rewards                │
                 │ Coach Services         │
                 │ Localization           │
                 │ Notifications          │
                 │ Audit                  │
                 └──────────┬─────────────┘
                            │
                          Prisma
                            │
                  ┌─────────┼──────────┐
                  ▼         ▼          ▼
             PostgreSQL   Storage   External Providers
             (Supabase)  (Supabase) push/email/etc.
```

## Basketball-first / sport-aware boundary

The mobile experience for MVP 1.0 is basketball-specific. The architecture must nevertheless distinguish between:

### Universal platform concepts
- User
- Athlete
- Guardian
- Coach
- Sport
- Team / Group
- Season
- TrainingSession
- Attendance
- DevelopmentFramework
- Competition / Event
- Registration
- Reward transaction
- Notification

### Basketball configuration / presentation
- UI term `Player`.
- basketball positions.
- KHLIM Basketball teams and age groups.
- basketball development criteria.
- KHERO basketball presentation.
- basketball-specific event types/labels.

Core identity, family, authorization, notifications, audit, and infrastructure modules must not depend on basketball-specific fields.

## Client boundaries

### Mobile application

One Expo application can serve player, parent/guardian, and coach roles using role-aware navigation and feature access.

Role checks in the client improve UX only. Authorization is enforced by the API.

The mobile application must not query application database tables directly for business operations. Normal flow:

```text
Mobile screen
   ↓
feature/query layer
   ↓
generated REST client
   ↓
NestJS API
   ↓
domain/application service
   ↓
Prisma
   ↓
PostgreSQL
```

### Admin web application

Club administration uses a separate Next.js web interface optimized for bulk data, tables, configuration, imports, event management, and operational workflows.

Routine operational updates such as schedule changes, competition publication, development-framework configuration, announcements, and rewards should happen here without developer involvement.

## API boundary

REST/OpenAPI is the primary public application contract.

Reasons:
- mobile and admin remain independent of database implementation;
- future public/event web experiences can consume the same contracts;
- potential future AI/automation or partner integrations have a conventional API boundary;
- generated clients provide TypeScript safety without forcing every consumer into a TypeScript-only runtime forever.

Guidelines:
- validate every request server-side;
- never expose raw Prisma/database models as public API contracts by default;
- return only authorized fields;
- use stable opaque IDs instead of labels/localized names as keys;
- support pagination/filtering for growing collections;
- design critical mutations to tolerate retries/idempotency;
- version genuinely breaking contracts;
- include actor/context for sensitive mutations and audit.

## Backend module principles

Each module should:
- own its domain logic;
- expose explicit application/query services;
- avoid ad hoc writes into another module's persistence;
- own or clearly control writes to its data model;
- publish domain events for meaningful state changes;
- consume events through defined handlers;
- remain testable independently at domain/application level.

## Example: attendance and rewards

Avoid:

```text
AttendanceService
  → save attendance
  → modify points
  → unlock KHERO
  → call push provider
```

Prefer:

```text
Attendance module
  → coach confirms official attendance
  → publishes AthleteAttendanceConfirmed

Rewards module
  → consumes event
  → evaluates reward rule
  → creates point transaction
  → publishes PointsAwarded

KHERO module
  → consumes approved reward/achievement events

Notifications module
  → consumes relevant events
  → selects recipient locale/template
  → dispatches through notification provider
```

## Attendance authority

For MVP, the coach/staff application is the authoritative attendance entry path.

Supported statuses:
- present;
- late;
- absent;
- excused.

The UX should support fast bulk marking such as `Mark All Present` plus exceptions.

Future QR/NFC/kiosk flows may produce a `CheckInRecorded` signal but should not silently bypass the official attendance-confirmation policy.

## Data architecture

PostgreSQL is preferred because the product contains strong relational and transactional workflows:
- users and roles;
- athletes and guardians;
- sports and teams/groups;
- seasons and memberships;
- coaches and assignments;
- sessions and attendance;
- sport-specific development frameworks;
- events/competitions and registrations;
- points and rewards.

Supabase provides managed PostgreSQL/Auth/Storage infrastructure. **Supabase does not become the owner of KHLIM business logic.**

Object storage contains binary/media assets such as:
- profile images;
- KHLIM/KHERO approved artwork;
- cosmetic assets;
- future event media/documents where approved.

## Migration ownership

Prisma Migrate owns application schema changes.

Avoid multiple uncontrolled schema authorities such as:
- manual production dashboard edits;
- unrelated migration systems changing the same application tables;
- undocumented SQL changes.

PostgreSQL-specific SQL may exist inside reviewed Prisma migrations where necessary.

## Localization architecture

Internationalization is part of the foundation, not a later refactor.

Initial registered locales:
- `en`
- `ms`
- `zh-Hans`
- `zh-Hant`
- `hi`

English is the fallback.

A future Cantonese locale such as `yue-Hant` may be added if validated.

Principles:
- users store their own preferred locale;
- UI code uses translation keys rather than hard-coded English;
- locale formatting handles dates/times/numbers/plurals;
- translation labels are never used as stable database keys;
- system notification templates support locale variants;
- original coach/admin authored text is preserved even if translated variants are later generated;
- important translatable text should not be baked into static artwork.

See `docs/architecture/localization.md` for the detailed plan.

## Configuration versus code

Prefer configurable data for business concepts expected to evolve:
- sports;
- teams/groups and seasons;
- sport-specific development frameworks;
- positions/categories where appropriate;
- competition/event types;
- point rules;
- reward definitions;
- notification categories/templates;
- coach specializations.

Keep authorization policy, integrity constraints, secrets, and security-sensitive rules in tested code unless a deliberately designed policy/configuration system exists.

## Environment model

### Development
Mostly local/isolated resources. Never uses real production family data by default.

### Staging
Production-like environment for integration, QA, migrations, release validation, and beta support.

### Production
Real users and club data. Changes arrive only through controlled releases and migrations.

Environment credentials and data are isolated.

## Regional direction

Initial audience is primarily Malaysia. Where supported, choose Singapore infrastructure to reduce unnecessary latency and cross-region traffic.

This is an operational default, not a permanent architecture lock-in.

## Observability

Before public launch, production should provide:
- structured application logs;
- request/error correlation identifiers;
- mobile/web crash reporting;
- API health/latency information;
- database health monitoring;
- notification failure visibility;
- alerting for high-severity failures;
- cost/usage monitoring;
- logs that avoid unnecessary sensitive child/family data.

## CI/CD direction

Pull requests should progressively enforce:

```text
install
  ↓
lint
  ↓
typecheck
  ↓
unit tests
  ↓
integration tests
  ↓
Prisma schema/migration validation
  ↓
admin build
  ↓
API build
  ↓
mobile validation/build where appropriate
```

Production releases use explicit release controls. A repository merge is not automatically equivalent to publishing a new App Store/Play Store version.

## Future extraction criteria

A module should not become a microservice merely because it is important.

Extraction should be considered only with a concrete reason such as:
- independent scaling requirements;
- isolated security boundary;
- materially different availability needs;
- separate team ownership;
- deployment cadence conflict;
- a technology requirement that cannot reasonably fit the monolith.

Until then, module boundaries inside one deployable API provide most of the maintainability benefit at far lower cost.

## Future platform expansion

The architecture should be capable of activating another KHLIM sport by configuring/extending sport-specific data rather than rewriting universal modules.

A future multi-organization SaaS product is a separate business decision. True tenant isolation, billing, organization-level configuration, and commercial support should be designed only if that direction is validated.
