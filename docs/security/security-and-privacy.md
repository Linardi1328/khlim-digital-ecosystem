# Security and Privacy

**Status:** Accepted current security baseline

KHLIM will process information about minors, families, memberships, schedules, payments, and later attendance/development/events. Security and privacy are product requirements from the first website MVP, not launch-week cleanup.

## Security objectives

Protect:
- user identities/sessions;
- Guardian ↔ Athlete relationships;
- programme/membership records;
- payment/customer/provider references and transaction history;
- schedules/venues;
- staff/admin functions;
- later attendance/development/internal coaching data;
- event registrations/selections;
- reward/entitlement integrity.

## Core principles

### 1. Deny by default
Protected requests are rejected unless server authorization proves access.

### 2. Relationship- and scope-aware authorization
Role alone is insufficient.

Examples:
- a guardian accesses only linked athletes;
- a coach accesses only assigned athletes/sessions and does not automatically gain finance access;
- finance/admin roles see only data required for their work;
- event staff do not automatically receive internal Academy/finance data.

### 3. Backend-authoritative commercial state
Frontends cannot become the source of truth for:
- price/discount;
- membership status;
- payment/installment state;
- entitlement eligibility;
- role/permission changes.

### 4. Minimize collected data
Do not collect child/family/payment metadata merely because it might be useful later. Every sensitive field should have a documented purpose and retention expectation.

### 5. Audit sensitive mutations
At minimum consider audit records for:
- role/permission changes;
- family-link creation/removal;
- Membership Plan/commercial configuration changes;
- membership suspension/cancellation/manual overrides;
- refunds/manual payment adjustments;
- venue/session cancellations/material changes;
- later attendance corrections/evaluations/internal-note changes;
- point/reward/entitlement manual adjustments;
- account deletion/export actions.

## Authentication

- Use proven authentication infrastructure (current Phase 1 direction: Supabase Auth).
- Server validates sessions/tokens.
- Logout/revocation/account recovery supported.
- Admin/staff high-privilege access uses MFA/strong control.
- Credential-stuffing/rate-abuse protections applied where appropriate.
- Do not build custom password storage without deliberate security ownership.

KHLIM business authorization stays in application/domain logic rather than relying only on auth metadata.

## Payment security

KHLIM must **never store**:
- full card number/PAN;
- CVV/security code;
- raw card credentials;
- provider secrets in client bundles/logs/database records.

Preferred flow:

```text
Browser
  ↓ secure hosted/provider fields
Payment Provider tokenizes/authenticates
  ↓
KHLIM receives approved customer/payment-method/payment references
```

Requirements:
- provider integration behind `PaymentGateway`/Billing abstraction;
- TLS for checkout/API/webhook traffic;
- signed webhook verification;
- provider event ID deduplication;
- idempotency protection for charge-creating/retryable actions;
- server-authoritative amount/currency/discount;
- payment state reconciled from trusted provider events/APIs, not browser redirect alone;
- test/staging/production provider credentials isolated;
- logs redact provider tokens/secret material and unnecessary financial metadata;
- refund/manual-adjustment workflows require explicit authorization/reason/audit;
- failed webhook/payment processing is observable/alertable;
- financial records are retained according to applicable legal/business policy.

Provider tokens/references are not raw card data but should still be treated as sensitive operational identifiers.

## Payment authorization tests

Release-critical examples:
- changing frontend price does not change authoritative charge amount;
- Parent A cannot view Parent B payment history;
- Coach cannot view finance data by default;
- duplicate webhook does not duplicate payment/membership activation/entitlement;
- duplicate checkout/charge request is idempotently handled where required;
- failed payment cannot be marked paid by client payload;
- production webhook signature failures are rejected;
- recurring schedule cannot charge beyond configured commitment cycles;
- membership and payment status transitions remain consistent under retries/out-of-order events.

## General authorization tests

Examples:
- Parent A cannot read Parent B's child;
- revoked GuardianAthleteLink stops access;
- Coach cannot access unrelated athletes/internal notes;
- locale changes do not affect permission;
- deactivated accounts lose protected access;
- staff privilege scope is enforced server-side.

These should be automated integration tests, not only manual QA.

## Website/API security

- Validate/normalize server input.
- ORM/parameterized database access.
- Rate-limit authentication, checkout, webhook-adjacent public endpoints, and abuse-sensitive operations as appropriate.
- Prevent mass assignment of privileged fields.
- Use secure headers/CSRF protections where applicable.
- Never embed backend/service/payment secrets into browser/mobile clients.
- Avoid direct client business writes to Supabase/database tables for normal KHLIM operations.
- Public routes expose only approved public data; protected family/financial data is not cached/publicly rendered accidentally.

## Data protection

- Managed encryption at rest where supported.
- TLS in transit.
- Development/staging/production credentials/data isolated.
- No production user/payment data copied into development by default.
- Least-privilege service/database credentials.
- Automated production backups.
- Restore procedure tested before public launch.
- Payment provider can be used as reconciliation source when validating restored transaction state.

## Secrets

Never commit:
- database credentials;
- Supabase service-role credentials;
- payment gateway secret/API/webhook keys;
- email/WhatsApp/SMS provider secrets;
- signing credentials;
- production tokens/configuration secrets.

Use GitHub/Vercel/Railway/Supabase/provider secret stores and document ownership/recovery.

## Logging and observability

Do not log unnecessarily:
- passwords/auth tokens;
- raw card/payment credentials;
- provider secret keys;
- full private/internal notes;
- unnecessary child/contact details.

Prefer stable IDs, safe event metadata, status codes, correlation IDs, provider event IDs where safe, and redacted failure information.

Production observability must cover:
- login/auth failures;
- API error/latency;
- payment/webhook failures;
- database health;
- notification failures;
- high-severity alerts;
- cost/usage.

## Minor/family considerations

Before launch, confirm applicable legal/privacy/payment requirements for operating jurisdictions. Engineering should support:
- authorized guardian relationships;
- age-aware policies if required;
- clear privacy notices;
- membership/recurring-payment terms/consent records;
- account/data deletion requests;
- data access/export processes where required;
- controlled athlete media usage;
- documented retention periods.

This is an engineering/security plan, not legal advice.

## Localization risks

Authorization occurs before rendering/translation. Translation cannot change audience.

High-impact privacy, membership, cancellation, recurring-payment, and payment-failure text should receive human review before production use in supported languages.

Original coach/admin text remains authoritative when future machine translation is introduced.

## Third-party provider review

For each payment, auth, analytics, crash-reporting, notification, AI, or other provider document:
- data received;
- purpose;
- processing/storage region where relevant;
- retention/deletion;
- suitability for minors/family data;
- contract/disclosure requirements;
- outage/failure behavior;
- credential/ownership/recovery plan.

Avoid convenience SDKs that add unjustified data exposure.

## Incident readiness

Before public launch document:
1. incident owner;
2. credential/token revocation;
3. compromised account/staff disable procedure;
4. rollback/feature-disable/forward-fix process;
5. payment reconciliation procedure after an incident;
6. backup restore procedure;
7. audit/log preservation;
8. communication/escalation obligations.

Serious incident flow:

```text
Detect
→ contain
→ stop risky rollout/feature
→ protect payment/data integrity
→ rollback/hotfix
→ verify/reconcile
→ restore gradually
→ post-incident review + regression test
```

## Launch severity gate

### P0 — launch blocker
- security/privacy breach;
- data corruption/loss;
- incorrect/double charging;
- authentication unavailable for core flows;
- financial state cannot be reconciled.

### P1 — launch blocker
- core registration/checkout/membership flow broken;
- major authorization error;
- incorrect membership/payment state;
- critical staff operation unusable.

Public launch is blocked by any unresolved P0/P1.

## Pre-launch security/reliability gate

Also block launch for:
- untested backup restoration;
- committed/uncontrolled secrets;
- missing account deletion/request path;
- unverified payment webhook security;
- unexplained third-party data collection;
- critical/high dependency vulnerability without accepted mitigation;
- inability to audit high-risk financial/admin mutations;
- privacy/payment terms not matching actual data/payment flows.
