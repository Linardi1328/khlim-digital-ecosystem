# Pre-Alpha Integration and Test Plan

**Status:** Active — pre-alpha testing in progress

**Purpose:** Prove that the existing KHLIM website, API, database, billing foundation and Admin console behave safely under realistic integration and failure conditions before external families enter a beta.

This stage is deliberately **not** a broad feature-building phase. The goal is to expose integration gaps, authorization mistakes, payment-state bugs, recovery weaknesses and operational friction while the test population is still internal.

## Entry criteria

Pre-alpha testing can begin now for implemented components, but the full end-to-end matrix requires:

- a dedicated staging Supabase project/database/auth environment;
- deployed staging web, admin and API applications;
- realistic synthetic seed data;
- real staff authentication connected to Admin;
- supported Admin operations connected to real backend endpoints;
- a sandbox payment-provider adapter with webhook signing enabled;
- the minimum Phase 7 scheduling/notification behavior needed for trustworthy upcoming-session and transactional-message tests.

Anything not yet integrated must remain clearly disabled or fail closed rather than using production-looking fake state.

## Test environments

### Local

Use for fast development, unit/regression checks, API behavior and migration iteration.

### Staging

Staging is the main pre-alpha environment. It should be production-shaped while using synthetic/non-production data and sandbox providers.

Required properties:

- separate Supabase project/database/auth credentials;
- separate payment-provider sandbox credentials and webhook secret;
- separate notification/email test credentials;
- production-like framework/runtime configuration;
- observability enabled;
- no production family/athlete exports by default.

### Production

Do not use production to discover basic correctness problems. Production verification before public launch should be limited, deliberate and reversible.

## Test data baseline

Create repeatable synthetic fixtures covering at least:

- one Guardian with one Athlete;
- one Guardian with multiple Athletes;
- one Athlete linked to multiple authorized Guardians;
- unauthorized/unrelated Guardian and Athlete records;
- Super Admin, Management, Finance/Admin, Academy Admin, Head Coach and Coach roles where supported;
- open, near-capacity and full Programme Offerings;
- multiple Membership Plans with different payment structures;
- `PENDING`, `ACTIVE` and `SUSPENDED` memberships;
- successful, pending, failed and duplicate/retried payment attempts;
- multiple Venues/Courts;
- normal sessions plus cancellation/reschedule/replacement examples once Phase 7 is implemented.

Fixtures must never contain real child/payment credentials.

The first shared synthetic fixture module lives in `packages/testing/src/pre-alpha-fixtures.mjs`. It provides deterministic non-production identities and lightweight doubles for the runtime authorization tests. Expand this package rather than scattering sensitive-looking fixtures across feature tests.

## Gate 1 — Repository and build health

The branch/commit under test should pass:

```bash
pnpm bootstrap:verify
pnpm test
pnpm test:pre-alpha
pnpm lint
pnpm format:check
pnpm typecheck
pnpm prisma:validate
pnpm openapi:check
pnpm build
```

Also require successful exact-commit browser jobs for both the public web application and Admin application.

`pnpm test:pre-alpha` builds the API and executes runtime boundary tests against compiled application code. The initial automated tranche covers fail-closed payment-provider selection, Guardian/Athlete relationship rules, athlete self-access, missing authorization policies, MFA enforcement, staff role checks and route-level athlete-access delegation. The dedicated **Pre-Alpha Runtime Boundaries** GitHub Actions workflow keeps this visible as a separate PR gate.

### Failure rule

Do not proceed into manual acceptance testing with unexplained red CI. Fix or explicitly classify the failure first.

## Gate 2 — Identity and authorization

### Authentication

Test:

- registration;
- email-confirmation-required mode;
- login/logout;
- expired access token refresh;
- invalid/expired refresh session;
- forgot-password flow;
- reset-password flow;
- account/session behavior across browser refreshes;
- missing/invalid Supabase configuration failing visibly rather than silently authenticating.

### Guardian/Athlete relationship tests

Verify:

- Guardian A can access linked Athlete A;
- Guardian A can access multiple linked children;
- a second authorized Guardian can access the same Athlete where linked;
- Guardian A cannot access unrelated Athlete B by guessing/changing an ID;
- invitation acceptance is bound to the intended authenticated email/user;
- invitation tokens are not stored in raw form;
- relationship removal/inactivation takes effect at the server boundary.

### Staff authorization

Verify every supported privileged endpoint and UI action against role expectations.

Critical negative cases:

- Coach cannot access finance records;
- unauthorized staff cannot mutate academy configuration;
- privileged identity/role operations require MFA/AAL2 where designed;
- client-side navigation hiding is never the only control;
- Admin without valid staff authentication cannot load privileged operational data.

## Gate 3 — Programme, capacity and membership rules

Test:

- Programme and Programme Offering remain distinct;
- Membership Plan eligibility is enforced by the backend;
- prices shown by clients match server-authoritative values;
- invalid/inactive plan selection is rejected;
- capacity boundaries are enforced under concurrent/near-concurrent enrolments;
- a new Membership starts in the correct pre-payment state;
- browser code cannot force `ACTIVE` membership state;
- historical records remain coherent after configuration changes.

### Concurrency scenario

For an offering with one remaining slot, submit two near-simultaneous valid enrolment/payment-completion paths and verify the system cannot end with two unauthorized active memberships beyond capacity.

## Gate 4 — Payment correctness

Payment testing is the highest-risk commercial gate.

### Checkout

Verify:

- checkout uses provider-hosted/tokenized flow;
- no KHLIM-owned raw card/CVV fields exist;
- server-authoritative amount/currency/plan information is used;
- production mode cannot fall back to fake success if the provider adapter is unavailable.

### Webhook matrix

Exercise at least:

1. valid successful payment event;
2. valid failed payment event;
3. duplicate successful event with the same provider event ID;
4. delayed success after browser has already returned;
5. browser success redirect before webhook delivery;
6. invalid webhook signature;
7. malformed webhook body;
8. provider retry of the same event;
9. two distinct events referencing the same payment attempt where the provider can emit lifecycle updates;
10. network/database failure during webhook processing followed by retry.

Expected invariant:

> A payment/membership transition happens from verified provider truth exactly once, and retries do not double-charge, double-record or double-activate.

### Recurring/installment tests

Verify:

- scheduled installment count matches the selected agreement;
- idempotency keys are stable for retried charge creation;
- failed installment state does not silently mark membership/payment as paid;
- fixed-cycle agreements cannot create extra installments beyond configured terms;
- provider references are stored without raw payment credentials.

## Gate 5 — Web family journey

Run the full journey on desktop and common mobile widths:

```text
Discover KHLIM
→ Register
→ Confirm email if required
→ Guardian onboarding
→ Add/select child
→ Browse offering
→ Choose eligible plan
→ Accept terms
→ Start provider checkout
→ Return to confirmation
→ Wait/re-read authoritative payment state
→ Membership becomes active only after verified backend event
→ View dashboard/membership/payment history
```

Test both successful and interrupted journeys:

- refresh midway;
- back-button navigation;
- checkout cancellation;
- expired session;
- API unavailable;
- offering becomes full before completion;
- invalid offering/plan URL;
- delayed webhook;
- payment failure.

The UI must never claim success when the backend cannot verify it.

## Gate 6 — Admin operations

Once real staff integration is connected, verify normal operations using non-demo staging data.

Test:

- dashboard metrics;
- programme/offering reads and supported writes;
- membership-plan reads and supported writes;
- membership inspection;
- family/athlete inspection;
- finance visibility and restriction;
- venue/court operations;
- scheduling operations available at that stage;
- staff-role controls;
- audit-log visibility;
- unsupported actions remaining disabled/fail-closed.

### Accessibility/responsive checks

- keyboard activation of clickable rows;
- modal/drawer keyboard handling;
- visible focus states;
- no horizontal overflow on supported mobile widths;
- filters/search/selects remain usable on small screens;
- finance restrictions remain true after responsive navigation changes.

## Gate 7 — Scheduling and notifications

Once the minimum Phase 7 implementation exists, test:

- recurrence generation;
- timezone/date handling;
- venue/court conflicts;
- closures and holidays;
- cancellation;
- rescheduling;
- replacement sessions;
- member portal upcoming schedule accuracy;
- transactional registration/payment/schedule emails;
- notification delivery failure/retry visibility;
- duplicate notification suppression where required.

Do not beta a family schedule that staff cannot keep authoritative after real operational changes.

## Gate 8 — Database, deployment and recovery

### Migrations

- apply all migrations from an empty staging database;
- apply migrations to production-shaped seeded staging data;
- verify constraints and indexes;
- test the recovery plan for a failed migration;
- confirm generated Prisma client and schema validation remain green.

### Backup/restore

Perform an actual restore exercise, not just a configuration check.

Verify:

- backup exists;
- restore destination is isolated;
- restored data is readable and relationally consistent;
- application can start against restored data where appropriate;
- recovery steps and responsibilities are documented.

### Deployment/rollback

Test:

- staging deployment of web/admin/API;
- environment-variable validation;
- health endpoint/availability checks;
- rollback or forward-fix procedure;
- observability after deployment;
- no secret values exposed in client bundles/logs.

## Gate 9 — Observability and incident drills

Before external beta, confirm that the team can detect and investigate:

- authentication error spikes;
- API 5xx errors;
- payment webhook failures;
- repeated provider-event processing failures;
- database connectivity problems;
- unexpected authorization denials/attempts;
- client-side crashes in web/admin;
- notification-delivery failures.

Run at least one tabletop incident for:

- suspected double charge;
- unauthorized child-data access;
- database outage;
- failed deployment.

## Severity model

### P0 — launch stop

Examples:

- privacy/security breach;
- authorization bypass exposing unrelated child/family data;
- data corruption/loss;
- incorrect or duplicate charging;
- payment-success spoofing;
- widespread authentication outage.

### P1 — launch stop

Examples:

- core registration flow broken;
- checkout/payment verification broken;
- membership activation materially wrong;
- staff unable to perform a required operational task;
- major schedule truth error for enrolled families;
- serious accessibility/browser issue blocking a significant user group.

### P2

Important defect with a viable workaround and no material integrity/security risk. Fix before broad public release where practical.

### P3

Minor polish/copy/non-blocking usability issue.

## Exit criteria for internal alpha

Move from pre-alpha integration testing to internal alpha only when:

- CI/build/OpenAPI/Prisma/browser suites are green;
- real staging auth is working for family and staff flows;
- payment sandbox adapter and webhook verification are working;
- duplicate/retry/idempotency payment tests pass;
- server-side relationship/role negative tests pass;
- supported Admin operations use real backend state;
- minimum schedule/notification truth required for the tested journey is available;
- backup/restore has been exercised;
- monitoring/logging can diagnose critical failures;
- no open P0/P1 defects are known.

## Exit criteria for closed family beta

After internal alpha, invite approximately **5–10 trusted families** only when:

- internal users can complete the full journey without developer/database intervention;
- payment and membership state have remained correct through repeated test cycles;
- staff can support onboarding and investigate failures through Admin/logs;
- legal/privacy/recurring-payment copy for the beta is reviewed and sufficiently accurate;
- a rollback/support contact process exists;
- known P2/P3 issues are documented and acceptable for the small beta cohort;
- there are no open P0/P1 defects.

## Evidence to retain

For each pre-alpha release candidate, retain or link:

- commit SHA;
- CI run results;
- web/admin Playwright results;
- API/integration test results;
- payment webhook test evidence;
- migration validation result;
- backup/restore exercise date/result;
- known-defect list with severity;
- staging deployment identifiers;
- go/no-go decision for internal alpha or beta.
