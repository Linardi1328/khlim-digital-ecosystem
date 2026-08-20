# Deployment and Environment Plan

**Status:** Draft

The deployment strategy should optimize for reliability, clear environment separation, and low operational burden for a small team.

## Environments

### Development
- Local developer environment and isolated development cloud resources where needed.
- Synthetic/test data only by default.
- Fast feedback and debugging.

### Staging
- Production-like backend/database/storage configuration.
- Used for integration testing, migration rehearsal, release candidates, TestFlight/Play internal testing, and stakeholder QA.
- Must not casually share credentials or data with production.

### Production
- Real KHLIM users and data.
- Protected credentials and stricter access controls.
- Changes deployed only through controlled release processes.

## Delivery pipeline

Target flow:

```text
Feature branch
→ pull request/review
→ lint + type check + unit/integration tests
→ merge to main
→ automated staging deployment
→ validation
→ controlled production deployment
```

Mobile distribution additionally requires versioned builds and App Store / Play Store release workflows.

## Database migrations

- Migrations are version-controlled.
- Staging runs migrations before production.
- Destructive migrations require an explicit data-preservation plan.
- Prefer expand/migrate/contract patterns for changes that must remain backward compatible with mobile versions still in circulation.
- Production migration failure must stop the deployment rather than partially continuing unnoticed.

## Mobile release considerations

Unlike web clients, old mobile versions can remain installed after a backend release. Therefore:
- APIs should tolerate a defined window of supported client versions;
- breaking contract changes require versioning or staged migration;
- backend deploys should not assume every user instantly updates;
- minimum supported versions and forced-update policy should be defined later;
- deep links and notification payloads should remain backward compatible where practical.

## Configuration and secrets

- Environment-specific configuration is separated from source code.
- Secrets are stored in provider/CI secret stores, not Git.
- Production keys are accessible only to required services/people.
- Signing credentials and store ownership should belong to the company, with recovery/ownership documentation.

## CI minimum checks

Before merge, CI should eventually run:
- formatting/lint checks;
- TypeScript/static type checks;
- unit tests;
- authorization/integration tests where feasible;
- build validation;
- dependency/security checks appropriate to the stack.

Production deploys should require successful checks on the exact revision being released.

## Observability

Production should expose:
- mobile crash/error reporting;
- admin web error reporting;
- backend structured logs;
- API latency/error metrics;
- database health;
- external provider failures such as push notifications;
- high-severity alerts.

Do not place sensitive player/guardian content into telemetry unnecessarily.

## Backups and recovery

Before beta:
- automated database backups enabled;
- object-storage durability/recovery understood;
- restoration process documented;
- restoration tested into a safe non-production environment;
- recovery ownership defined.

Before public launch, the team should know the expected recovery point and recovery time targets instead of relying on vague assumptions.

## Rollback / forward-fix

Web/backend releases should support rapid rollback or a documented forward-fix process. Database changes must be designed with rollback limitations in mind; a code rollback is not sufficient if a destructive migration already removed data.

For mobile releases, remediation may require:
- server-side feature/config disable;
- compatible backend fallback;
- expedited app update;
- staged rollout halt.

This is one reason high-risk features should use server-controlled flags/configuration where practical.

## Feature flags/configuration

Use feature flags selectively for:
- controlled beta rollout;
- disabling risky integrations without a store release;
- cohort experiments when appropriate;
- staged activation of completed features.

Feature flags should not replace authorization or become permanent undocumented complexity.

## Store launch preparation

Before submission:
- company controls Apple/Google developer accounts;
- package/bundle identifiers finalized;
- signing ownership documented;
- privacy and data-safety disclosures reviewed against actual SDK/data flows;
- account deletion flow available;
- support/privacy URLs live;
- review/test credentials prepared;
- production backend ready before reviewers access the build.

Exact current App Store / Play Store requirements should be re-verified close to submission because platform rules change over time.

## Infrastructure decision still open

Exact hosting, database, storage, auth, notification, analytics, and CI providers are intentionally not locked here. They should be selected after the implementation stack, expected scale, team experience, cost constraints, data-location requirements, and operational ownership are confirmed.
