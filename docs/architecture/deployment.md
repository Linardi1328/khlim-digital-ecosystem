# Deployment and Environment Plan

**Status:** Accepted for Phase 1 baseline

The deployment strategy optimizes for reliability, clear environment separation, proximity to the initial Malaysian user base, and low operational burden for a small team.

## Initial provider map

| Capability | Initial provider / approach |
| --- | --- |
| Mobile builds/releases | Expo EAS |
| Admin web | Vercel |
| NestJS API | Railway |
| PostgreSQL | Supabase managed PostgreSQL |
| Authentication | Supabase Auth |
| Object/media storage | Supabase Storage |
| Error/crash monitoring | Sentry |
| CI/CD | GitHub Actions |
| App distribution | Apple App Store / Google Play |

Where supported and operationally sensible, production compute/data should start in **Singapore** to stay geographically close to the initial Malaysian audience.

These providers are infrastructure choices, not business-domain dependencies. Application code should use clean provider boundaries where replacement is plausible.

## Environments

### Development

- Local-first developer environment.
- Local PostgreSQL/Supabase tooling or isolated development resources where practical.
- Synthetic/test data only by default.
- Fast feedback and debugging.
- Avoid paying for unnecessary always-on production-class development infrastructure.

### Staging

- Production-like API/database/storage/auth configuration.
- Used for integration testing, migration rehearsal, release candidates, TestFlight/Play testing, and stakeholder QA.
- Separate data, credentials, and projects from production.
- May be activated/scaled progressively as beta approaches rather than paying for a full production footprint from day one.

### Production

- Real KHLIM users and data.
- Protected credentials and stricter access controls.
- Controlled deployments/migrations only.
- Cost and usage alerts enabled where providers support them.

## Target topology

```text
Expo Mobile
    │
    │ HTTPS
    ▼
Railway Singapore (NestJS API)
    │
    ├── Supabase PostgreSQL (Singapore where selected)
    ├── Supabase Auth
    └── Supabase Storage

Next.js Admin
    │
Vercel
    │
    └── calls the same NestJS API
```

The admin application should not bypass the API for sensitive KHLIM business operations merely because it is trusted staff software.

## Delivery pipeline

Target flow:

```text
Feature branch
→ pull request/review
→ lint + typecheck + tests + schema/build validation
→ squash merge to main
→ automated staging deployment where appropriate
→ validation
→ controlled production deployment/release
```

Mobile distribution additionally requires versioned EAS builds and App Store / Play Store release workflows.

A merge to `main` is not automatically equivalent to publishing a production mobile release.

## Monorepo deployment units

Expected independently deployable applications:

```text
apps/mobile
apps/admin
apps/api
```

Shared packages are build dependencies, not independent production services by default.

## Database migrations

Prisma Migrate is the application-schema migration authority.

Rules:
- migrations are version-controlled;
- staging rehearses production migrations;
- destructive migrations require an explicit data-preservation plan;
- prefer expand/migrate/contract for changes that must remain compatible with mobile versions still in circulation;
- production migration failure stops deployment rather than allowing unnoticed partial rollout;
- manual production schema edits are emergency-only and must be reconciled into version-controlled migration history.

## Mobile release considerations

Old mobile versions can remain installed after backend releases.

Therefore:
- APIs tolerate a defined supported-client window;
- breaking contracts require API versioning or staged migration;
- backend releases do not assume immediate app updates;
- deep links/notification payloads remain backward compatible where practical;
- minimum supported app versions and forced-update policy are defined later;
- high-risk features can use controlled server configuration/flags where justified.

## Expo release channels / profiles

Expected profiles/channels:
- development;
- staging/preview;
- production.

Use Expo development builds for serious app development rather than treating Expo Go as the permanent runtime environment.

OTA updates, if enabled, must only be used for changes compatible with the installed native runtime and must not be treated as a way to bypass normal release safety.

## Configuration and secrets

- Environment-specific configuration is separated from source code.
- Secrets are stored in provider/CI secret stores, not Git.
- Production keys are accessible only to required services/people.
- Mobile-safe public configuration is distinguished from server secrets.
- Signing credentials and store ownership belong to the company, with recovery/ownership documentation.
- Production service accounts should follow least privilege.

## CI minimum checks

Before merge, CI should progressively run:
- formatting/lint checks;
- TypeScript/static type checks;
- unit tests;
- authorization/integration tests where feasible;
- Prisma validation and migration checks;
- translation catalogue checks where practical;
- admin build;
- API build;
- mobile validation/build checks appropriate to change scope;
- dependency/security checks appropriate to the stack.

Production deployments should require successful checks on the exact revision being released.

## Observability

Production should expose:
- mobile crash/error reporting;
- admin web error reporting;
- backend structured logs;
- API latency/error information;
- database health;
- external provider failures such as push notification errors;
- high-severity alerts;
- cost/usage visibility.

Do not place sensitive athlete/guardian content into telemetry unnecessarily.

## Backups and recovery

Before beta:
- automated database backups enabled at the selected production plan level;
- object-storage durability/recovery understood;
- restoration process documented;
- restoration tested into a safe non-production environment;
- recovery ownership defined.

Before public launch, define expected recovery-point and recovery-time targets instead of relying on vague assumptions.

## Rollback / forward-fix

Web/backend releases should support rapid rollback or a documented forward-fix process. Database changes must be designed with rollback limitations in mind; a code rollback is not sufficient if a destructive migration already removed data.

For mobile releases, remediation may require:
- server-side feature/config disable;
- compatible backend fallback;
- staged rollout halt;
- EAS-compatible safe update;
- expedited App Store/Play Store update.

## Feature flags/configuration

Use selectively for:
- controlled beta rollout;
- disabling risky integrations without a store release;
- progressive feature activation;
- future sport activation when a feature is complete.

Feature flags must not replace authorization or become permanent undocumented branches.

## Cost-control strategy

The objective is to keep early development inexpensive and production costs proportional to real usage.

Planning guidance:
- use free/local development resources where practical;
- do not pay for three fully provisioned environments before staging is needed;
- establish provider spend alerts/limits where available;
- review storage/egress/build usage monthly after beta begins;
- avoid infrastructure such as Kubernetes, message brokers, or dedicated search clusters until there is a demonstrated requirement.

Initial launch planning has used a rough target of **under approximately RM500/month for baseline core infrastructure before material usage overages**, with a broader **RM6,000–RM8,000 first-year technical operating reserve** as a safer planning allowance.

These are budgeting targets, **not guaranteed provider prices**. Provider pricing and currency conversion must be rechecked before contracts/plans are purchased and again before public launch.

Costs excluded from that technical reserve may include:
- external developers/designers;
- professional translation review;
- legal/privacy consultation;
- testing devices;
- SMS/paid email volume;
- payment gateway fees;
- marketing;
- future commerce/AI services.

## Store ownership

Before public submission:
- Apple/Google developer accounts should be company-owned where appropriate;
- package/bundle identifiers are finalized;
- signing ownership/recovery is documented;
- privacy and data-safety disclosures are reviewed against actual SDK/data flows;
- account deletion flow is available;
- support/privacy URLs are live;
- review/test credentials are prepared;
- production backend is ready before reviewers access the build;
- store metadata includes supported locales where appropriate.

Exact Apple/Google requirements and fees must be re-verified near submission because platform rules change.

## Multi-sport deployment implication

Enabling another KHLIM sport should normally be a product/configuration release, not an infrastructure redesign.

A true external multi-organization SaaS expansion is different: it may require stronger tenant isolation, organization-aware operations, billing, and possibly infrastructure topology changes. That decision is explicitly deferred until there is a validated business case.
