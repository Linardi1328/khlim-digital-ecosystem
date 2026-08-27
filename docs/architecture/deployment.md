# Deployment and Environment Plan

**Status:** Accepted post-Phase 6 baseline; staging/pre-alpha integration is the current priority

The deployment strategy prioritizes reliability, environment separation, low operational burden, Malaysia/Singapore proximity, and a safe path from private testing to public launch.

## Initial provider map

| Capability | Initial provider / approach |
| --- | --- |
| Public/member website | Vercel |
| Admin web | Vercel |
| NestJS API | Railway |
| PostgreSQL | Supabase managed PostgreSQL |
| Authentication | Supabase Auth |
| Object/media storage | Supabase Storage |
| Payment processing | External gateway selected through provider evaluation; adapter behind Billing |
| Email | Provider behind Notification abstraction |
| WhatsApp / SMS / push | Later adapters behind Notification abstraction |
| Error monitoring | Sentry |
| CI/CD | GitHub Actions / PPO PR validation + exact-commit Playwright QA |
| Future mobile builds/releases | Expo EAS |
| Future app distribution | Apple App Store / Google Play |

Where supported and operationally sensible, production compute/data should start in **Singapore** near the initial Malaysian audience.

Infrastructure providers are replaceable dependencies; business domains should depend on interfaces/contracts rather than vendor SDK details throughout the codebase.

## Current environment priority

The next development milestone depends on a production-shaped **staging environment**. The project already has application/deployment foundations and browser CI; staging must now become the place where the real auth, Admin, payment-provider, migration, recovery and end-to-end workflows are proven before external family beta.

The immediate staging checklist is:

- dedicated staging Supabase database/auth project;
- staging API deployment with validated server secrets;
- staging web/admin deployments pointing only to staging services;
- real Admin staff authentication integration;
- sandbox payment-provider adapter and signed webhook secret;
- synthetic family/athlete/programme/membership/payment fixtures;
- transactional email test provider/configuration;
- Sentry/structured logging enabled;
- backup/restore and rollback rehearsal.

See `docs/testing/pre-alpha-test-plan.md` for the validation matrix.

## Environments

### Development

- Local-first developer environment.
- Synthetic/test data by default.
- Payment-provider sandbox/test mode only.
- No real production family/payment credentials.
- Local/isolated PostgreSQL/Supabase tooling or dev resources.

### Staging

- Production-like web/admin/API/auth/database configuration.
- Separate provider credentials and test/staging payment configuration.
- Main environment for integration/E2E testing, migration rehearsal, internal alpha, family beta, release candidates, backup/restore and rollback drills.
- Separate data from production.
- Synthetic or deliberately approved test data only by default.
- Demo-only Admin behavior is not considered proof of real operational integration.

### Production

- Real KHLIM users, family data, and money.
- Strong staff access controls/MFA.
- Controlled deployments/migrations only.
- Production payment credentials isolated in secret stores.
- Backups, monitoring, reconciliation, alerting, and incident procedures enabled.
- No simulated payment success or preview/demo persistence.

## Target topology

```text
Public / Member Website (Next.js)
          │
Admin Web (Next.js)
          │
Future Expo Super App
          │
          └──────── HTTPS / REST /v1 ────────┐
                                              ▼
                                  Railway — NestJS API
                                              │
             ┌────────────────────────────────┼───────────────────────────┐
             ▼                                ▼                           ▼
      Supabase PostgreSQL              Supabase Auth/Storage       External Providers
                                                                  Payment Gateway
                                                                  Email
                                                                  WhatsApp/Push/SMS later
```

All clients call the same business API for sensitive operations. Admin does not bypass Membership/Billing/Authorization rules.

## Monorepo deployment units

```text
apps/web       # public website + member portal
apps/admin     # staff operations console
apps/api       # shared NestJS backend
apps/mobile    # reserved; deploy/build later when activated
```

Shared packages are dependencies, not standalone services by default.

## Delivery pipeline

Current target flow:

```text
short-lived branch
→ pull request
→ PPO/CI validation
→ exact-commit web/admin browser QA when relevant
→ review
→ squash merge to main
→ staging deployment
→ pre-alpha integration verification
→ controlled release gate
→ production deployment
```

A merge to `main` is not automatically equivalent to a production release.

The product release sequence is:

```text
Pre-alpha integration / test hardening
→ Internal alpha
→ Closed family beta
→ Expanded academy pilot
→ Feature freeze / release candidate
→ Limited production cohort
→ Public launch
```

## Database migrations

Prisma Migrate is the application-schema migration authority.

Rules:

- migrations are version controlled;
- staging rehearses production migrations;
- destructive migrations require an explicit preservation/recovery plan;
- prefer expand/migrate/contract for compatibility-sensitive changes;
- failed production migration stops rollout;
- manual production schema edits are emergency-only and must be reconciled into version control;
- payment/membership historical records must not be casually destroyed by schema cleanup;
- pre-alpha must include applying all migrations both to an empty database and production-shaped seeded staging data.

## Payment deployment and operations

Payment integration receives stricter controls than ordinary UI features:

- development/staging/production provider modes are isolated;
- provider secrets live only in server/CI/provider secret stores;
- signed webhooks terminate at controlled API endpoints;
- webhook event IDs are persisted/deduplicated;
- idempotency keys protect charge-creating/retryable actions;
- provider redirects are not authoritative transaction truth;
- payment reconciliation/failure visibility exists in production;
- no raw card/CVV credentials appear in logs, telemetry, database, or source code;
- a provider outage should not unnecessarily take down unrelated public content/account views;
- if no real provider adapter is configured, production payment behavior fails closed instead of simulating success.

Before internal alpha, the sandbox provider must be tested for successful, failed, delayed, duplicated and retried webhook events. Production launch cannot proceed with known double-charge, payment-state corruption or webhook-integrity defects.

## Website/admin deployment

`apps/web` and `apps/admin` may both use Vercel but remain separate deployable applications with independent environment variables and access policies.

The public website must not expose admin routes/data simply because both use Next.js.

Where practical:

- preview deployments are available for PR/review work;
- staging points to staging API/auth/payment configuration;
- production points only to production API/auth/provider configuration;
- sensitive server environment values are not shipped into browser bundles;
- Admin demo mode is preview-only and must not be enabled as a substitute for real production staff integration.

## Future mobile release considerations

When `apps/mobile` becomes active:

- development/staging/production EAS profiles/channels;
- TestFlight/Play closed testing before public store release;
- API backward-compatibility window for installed older versions;
- server-side feature/config disable where appropriate;
- staged store rollout;
- package/signing/store accounts company-owned where possible.

The native client must reuse existing API/auth/payment/member domains instead of introducing a second backend.

## Configuration and secrets

- Environment-specific config is separated from source.
- Secrets live in provider/CI secret stores.
- Production keys are accessible only to required services/people.
- Browser/mobile-safe public config is clearly separated from server secrets.
- Service accounts follow least privilege.
- Key ownership/recovery documentation exists for production providers.
- `NEXT_PUBLIC_*` variables are treated as public configuration and never contain secrets.

## CI minimum checks

The current repository validation baseline includes:

- developer bootstrap contract verification;
- Node/shell syntax checks where configured;
- full Node regression suite;
- diff whitespace checks;
- ESLint;
- Prettier formatting checks;
- TypeScript checks;
- Prisma schema validation;
- generated OpenAPI contract drift checks;
- runtime builds for active applications;
- exact-commit Playwright suites for `apps/web` and `apps/admin`.

Payment/provider integration work should add runtime integration tests beyond static/structural assertions. Production releases should use the exact revision that passed the release gates.

## Observability

Before external beta, staging and then production should expose:

- website/admin/API errors;
- structured backend logs and request correlation IDs;
- authentication failures/health signals;
- API latency/error rates;
- database health;
- payment/webhook processing failures;
- notification delivery failures;
- high-severity alerts;
- cost/usage visibility.

Telemetry must avoid unnecessary minor/family/payment-sensitive content.

## Backups and recovery

Before closed family beta/public launch:

- automated production database backups enabled or provider recovery guarantees explicitly understood;
- storage recovery/durability understood;
- restore procedure documented;
- restore tested into an isolated non-production environment;
- recovery ownership defined;
- payment-provider records can be reconciled against KHLIM transaction state after recovery.

A configured backup is not enough: pre-alpha/internal alpha should include an actual restore exercise. Define Recovery Time Objective (RTO) and Recovery Point Objective (RPO) appropriate to membership/payment criticality before broad launch.

## Rollback, containment, and graceful degradation

Web/API releases should support rapid rollback or documented forward-fix.

A serious production incident follows:

```text
Detect
→ contain / disable affected feature
→ protect data/payments
→ rollback or hotfix
→ verify integrity
→ restore service gradually
→ incident review + regression test
```

Optional external integrations should degrade independently where possible. For example, WhatsApp failure should not crash Memberships/Payments; a tournament module should be disable-able without taking down the Academy website.

Use feature flags selectively for controlled rollout/disable, not as a replacement for authorization.

## Public launch gate

The release date is a target, not permission to bypass safety.

No public launch with unresolved:

- **P0:** security/privacy breach, data loss/corruption, double/incorrect charging, authentication outage;
- **P1:** broken core registration/payment/membership workflow, major authorization failure, unusable critical admin operation or materially incorrect family schedule.

Final 1–2 weeks should prioritize feature freeze, bug fixing, payment/security/recovery/performance verification.

Recommended production rollout:

1. invited/small cohort;
2. 24–72 hour monitoring window;
3. expand only while health indicators remain stable;
4. broad public availability.

## Cost-control strategy

Keep early development inexpensive and scale with actual usage:

- local/free resources where practical;
- paid staging only when useful;
- provider spend alerts/limits;
- monthly usage review after beta;
- no Kubernetes/message brokers/search clusters without demonstrated need.

Existing planning targets such as roughly under RM500/month baseline core infrastructure and RM6,000–RM8,000 first-year technical reserve are budgeting guides, not guaranteed provider prices. Recheck pricing before purchase/launch.

Payment gateway fees, SMS/WhatsApp volume, external professional services, marketing, devices, legal/privacy work, translations, and later AI/commerce may sit outside that reserve.

## Multi-sport / ecosystem implication

Adding another KHLIM sport or service should normally reuse the platform topology rather than require infrastructure redesign. True external multi-organization SaaS remains a separate future decision with stronger tenancy/isolation requirements.
