# ADR 0004 — Phase 1 Technology Stack

**Status:** Accepted

## Context

KHLIM Super App requires a mobile application, an administration web application, a secure business API, relational data, authentication, file/media storage, automated testing, and production deployment.

The team should minimize unnecessary language/runtime fragmentation while preserving explicit API and domain boundaries. The first product is expected to be maintained by a relatively small engineering team, so operational complexity must remain controlled.

## Decision

Use the following Phase 1 baseline:

- TypeScript end-to-end.
- Node.js 24 LTS runtime baseline.
- pnpm Workspaces + Turborepo monorepo.
- Expo / React Native mobile application.
- Expo Router.
- Next.js admin web application.
- Tailwind CSS + shadcn/ui for the admin interface.
- NestJS modular-monolith API.
- REST API + OpenAPI contracts and generated typed client(s).
- PostgreSQL hosted using Supabase managed infrastructure.
- Prisma ORM and Prisma Migrate.
- Supabase Auth.
- Supabase Storage.
- TanStack Query for server/API state.
- React Hook Form + Zod for form/client validation where needed.
- GitHub Actions for CI/CD.
- Sentry for initial crash/error monitoring.
- Expo EAS for mobile development/release builds.
- Railway for initial NestJS deployment.
- Vercel for initial Next.js admin deployment.
- Prefer Singapore regions where the selected provider supports them and it makes operational sense for the initial Malaysian audience.

Exact dependency patch/minor versions are pinned during scaffolding and upgraded intentionally.

## Client/data boundary

The mobile/admin clients must not directly own KHLIM database business logic.

Preferred flow:

```text
Client
  ↓
REST/OpenAPI
  ↓
NestJS domain/application layer
  ↓
Prisma
  ↓
PostgreSQL
```

Supabase is used as managed infrastructure, not as a replacement for explicit KHLIM domain/application logic.

## Migration authority

Prisma Migrate owns application-schema migrations.

Avoid uncontrolled overlapping schema authorities or manual production schema drift.

## Consequences

### Positive

- One primary language across mobile/web/API.
- Strong typing and shared tooling.
- Explicit API boundary protects clients from database changes.
- Managed services reduce infrastructure burden.
- PostgreSQL fits relational family/team/attendance/event/reward workflows.
- NestJS modules align with the modular-monolith decision.
- Expo accelerates cross-platform mobile delivery.
- Future non-TypeScript consumers can still integrate through conventional REST/OpenAPI contracts.

### Tradeoffs

- Multiple managed providers create several accounts/billing surfaces.
- Generated OpenAPI clients require contract-generation discipline.
- Prisma adds an ORM/tooling layer that must be understood and upgraded carefully.
- Expo and managed providers create some vendor-specific operational behavior.
- A monorepo requires build/task conventions to avoid unnecessary coupling.

## Alternatives considered

### Direct mobile → Supabase database API
Rejected as the primary business-data architecture because it tightly couples clients to persistence and makes complex authorization/domain rules harder to centralize.

### Firebase / document database
Not preferred because the product contains strongly relational and transactional structures.

### Microservices
Rejected for the initial team/product stage because they add deployment, tracing, transaction, and operations complexity without a demonstrated need.

### tRPC as the primary public contract
Not selected because the future platform may have additional web experiences, external integrations, automation, or non-TypeScript consumers. REST/OpenAPI provides a more durable explicit boundary.

### GraphQL
Not required for the current query/use-case complexity and would add another API/runtime model before it provides clear value.

## Revisit triggers

Reconsider parts of the stack only when there is evidence such as:
- provider reliability/cost becomes unacceptable;
- mobile requirements need unsupported native behavior;
- a module has a concrete independent scaling/deployment requirement;
- API consumers demonstrate a need the current REST/OpenAPI boundary cannot serve efficiently;
- operational/compliance requirements require infrastructure changes.
