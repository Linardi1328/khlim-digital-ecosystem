# Deployment and Environment Plan

**Status:** Accepted current Phase 1 baseline

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
| CI/CD | GitHub Actions / PPO PR validation |
| Future mobile builds/releases | Expo EAS |
| Future app distribution | Apple App Store / Google Play |

Where supported and operationally sensible, production compute/data should start in **Singapore** near the initial Malaysian audience.

Infrastructure providers are replaceable dependencies; business domains should depend on interfaces/contracts rather than vendor SDK details throughout the codebase.

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
- Used for integration/E2E testing, migration rehearsal, internal alpha, family beta, release candidates, and rollback drills.
- Separate data from production.

### Production

- Real KHLIM users, family data, and money.
- Strong staff access controls/MFA.
- Controlled deployments/migrations only.
- Production payment credentials isolated in secret stores.
- Backups, monitoring, reconciliation, alerting, and incident procedures enabled.

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
apps/web       # deploy now/first
apps/admin     # deploy now/first
apps/api       # deploy now/first
apps/mobile    # reserved; deploy/build later when activated
```

Shared packages are dependencies, not standalone services by default.

## Delivery pipeline

Target flow:

```text
short-lived branch
→ pull request
→ PPO/CI validation
→ review
→ squash merge to main
→ staging deployment
→ integration/release verification
→ controlled production deployment
```

A merge to `main` is not automatically equivalent to a production release.

Public release adds an explicit operational gate:

```text
Internal alpha
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
- payment/membership historical records must not be casually destroyed by schema cleanup.

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
- a provider outage should not unnecessarily take down unrelated public content/account views.

Production launch cannot proceed with known double-charge, payment-state corruption, or webhook-integrity defects.

## Website/admin deployment

`apps/web` and `apps/admin` may both use Vercel but remain separate deployable applications with independent environment variables and access policies.

The public website must not expose admin routes/data simply because both use Next.js.

Where practical:
- preview deployments are available for PR/review work;
- staging points to staging API/auth/payment configuration;
- production points only to production API/auth/provider configuration;
- sensitive server environment values are not shipped into browser bundles.

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

## CI minimum checks

Before merge, CI should progressively run:
- formatting/lint;
- TypeScript/static checks;
- unit/integration tests;
- authorization tests where applicable;
- payment-domain/webhook/idempotency tests as introduced;
- Prisma/schema/migration validation;
- localization catalogue checks;
- `apps/web` build;
- `apps/admin` build;
- `apps/api` build;
- mobile validation only when relevant to changed/active mobile work;
- dependency/security checks appropriate to the stack.

Production releases should use the exact tested revision.

## Observability

Before public launch, production should expose:
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

Before family beta/public launch:
- automated production database backups enabled;
- storage recovery/durability understood;
- restore procedure documented;
- restore tested into isolated non-production environment;
- recovery ownership defined;
- payment-provider records can be reconciled against KHLIM transaction state after recovery.

Define Recovery Time Objective (RTO) and Recovery Point Objective (RPO) appropriate to membership/payment criticality before broad launch.

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
- **P1:** broken core registration/payment/membership workflow, major authorization failure, unusable critical admin operation.

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
