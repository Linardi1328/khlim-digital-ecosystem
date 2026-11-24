# ADR: Academy Registration V1 (RIC-190)

Status: implemented locally on `codex/ric-190-academy-registration-v1-20261124`.
Base SHA: `9e23be280c1784db4d3a778179bfb87e62da1f94`.
Not deployed, not migrated on any hosted database, not published to parents.

The exact wire contract lives in
[`docs/implementation/ric-191-academy-registration-handoff.md`](../implementation/ric-191-academy-registration-handoff.md).
This record explains _why_ the design looks the way it does and which invariants
the implementation and tests defend.

## Decisions

### D1. Registration is a snapshot, not an identity or a membership

A registration stores what the guardian submitted. It never creates a `User`,
`AthleteProfile`, `GuardianProfile`, `GuardianAthleteLink` or `Membership`
(`AthleteProfile.userId` is nullable, but creating profiles from unauthenticated
input would still need identity verification we do not have). Conversion to an
athlete or membership is deferred; no `athlete_id` column exists on purpose.
Receipt = "received, pending review"; it never reserves a place.

### D2. One dedicated `ProgrammeOffering` per cohort; authority split

| Concern                                               | Authority                                      |
| ----------------------------------------------------- | ---------------------------------------------- |
| Age boundaries (`minimumAge`, `maximumAge`)           | `Programme`                                    |
| Venue, capacity, enrollment window, OPEN/CLOSED       | `ProgrammeOffering`                            |
| Weekday, times, first date, coach display, age rule, publication | `academy_registration_sessions` (new)  |
| Seat consumption                                      | `academy_registrations.status = CONFIRMED`     |

There is no second capacity or venue column. The session row is 1:1 with its
offering (`UNIQUE (programme_offering_id)`) and the admin API creates the pair
atomically, so an offering cannot carry legacy memberships when it becomes a
registration cohort.

### D3. Legacy isolation is enforced by the database

A registration-managed offering (one that has a registration session) cannot be
used by the legacy checkout path:

- trigger on `memberships` (INSERT / offering change) rejects such offerings;
- trigger on `membership_plan_offering_eligibilities` rejects such offerings;
- `AcademyService.linkPlanToOffering` gives a friendly 409 before the trigger;
- `GET /academy/offerings` (legacy public list) excludes them.

Because no `Membership` can exist for the offering, the billing activation
capacity check (`billing.service.ts`, `activeCount >= capacity`) and the
membership capacity check can never count or consume registration seats, and no
double-counting is possible when conversion is added later (conversion must
then retire the registration seat in the same transaction; out of scope).
Legacy `PATCH admin/academy/offerings/:id/status` can still move an offering
between statuses, but bookability is the conjunction of offering `OPEN` **and**
session `PUBLISHED` **and** approved consent, evaluated live, so a legacy
status change can only _reduce_ availability.
`TrainingSession` (legacy scheduling/attendance) is a different table; no
scheduling route reads or writes registration sessions.

### D4. Tenant integrity in the database

- Additive composite unique indexes `(id, organization_id)` on `programmes`,
  `venues`, `programme_offerings` (needed as composite FK targets).
- `academy_registration_sessions (organization_id, programme_offering_id)` →
  `programme_offerings (organization_id, id)` composite FK.
- `academy_registrations (organization_id, session_id)` → sessions composite FK.
- `academy_registration_consents (organization_id, registration_id)` →
  registrations composite FK; `(organization_id, policy_id)` → policies.
- Legacy offering→programme and offering→venue FKs are single-column, so an
  offering could in principle point at another tenant's programme/venue. A
  targeted `BEFORE INSERT OR UPDATE` trigger on `programme_offerings` now rejects
  cross-tenant programme/venue references. Existing rows are not rewritten and
  legacy FK delete behaviour (`venue_id ON DELETE SET NULL`) is unchanged.

### D5. Lock order and transaction isolation

All write transactions run at `READ COMMITTED` with explicit row locks, in this
fixed order:

```
(advisory key lock, public submit only) → ProgrammeOffering → RegistrationSession → Registration
```

| Operation                         | Offering        | Session        | Registration    |
| --------------------------------- | --------------- | -------------- | --------------- |
| Public submit                     | `FOR SHARE`     | `FOR SHARE`    | insert          |
| Admin status change (all)         | `FOR UPDATE`    | `FOR SHARE`    | `FOR UPDATE`    |
| Session PATCH / publish / close   | `FOR UPDATE`    | `FOR UPDATE`   | n/a             |
| Capacity reduction                | `FOR UPDATE`    | `FOR UPDATE`   | counts CONFIRMED |

- Submit takes shared locks, so closing/capacity changes (exclusive) wait for
  in-flight submissions and later submissions see the new state.
- Every confirm/cancel takes the offering exclusively, so confirmations,
  cancellations and capacity reductions for one cohort are fully serialized;
  count-then-update is therefore race-free.
- The offering id is read unlocked first (the session→offering link is immutable),
  then locks are taken in order and all mutable state is re-read _after_ locking.
- Legacy billing locks `payments` then `programme_offerings`; registration
  transactions never touch payments, so no cycle exists. Legacy membership
  creation locks the offering only.
- Idempotent retries: the submit transaction first takes
  `pg_advisory_xact_lock` on the idempotency-key HMAC, so identical concurrent
  requests serialize and the second sees the first's committed row. A unique
  violation can still occur (distinct code paths, reference-code collision); it
  is caught **outside** the aborted transaction and handled with a fresh
  transaction/lookup, never continued inside it.

Defense in depth at the database level (works for any writer, including direct
SQL): a trigger on `academy_registrations` locks the offering and refuses a
transition to `CONFIRMED` beyond capacity, refuses leaving a terminal state,
and refuses non-`RECEIVED` inserts; a trigger on `programme_offerings` refuses
reducing capacity below confirmed seats and clearing the venue of a published
cohort.

### D6. Lifecycle

```
RECEIVED ──► UNDER_REVIEW ──► CONFIRMED ──► CANCELLED
   │             │  │
   │             │  └──► REJECTED
   │             └─────► CANCELLED
   ├──► CONFIRMED / REJECTED / CANCELLED   (direct allowed)
```

`REJECTED` and `CANCELLED` are terminal. `CONFIRMED → CANCELLED` releases the
seat atomically (the count is derived, nothing to decrement). Clients never set
anything except the target `status`, an allowlisted `reasonCode`, and the
`expectedVersion` compare-and-set token (integer `version`, bumped on every
change).

### D7. Session publication

`DRAFT → PUBLISHED → CLOSED` (CLOSED is terminal in V1; a new cohort is a new
session). Structural fields (weekday, times, first date, age rule, venue,
programme) are editable only in `DRAFT`. While `PUBLISHED`, only coach display,
capacity (never below confirmed) and the enrollment window may change.
Publishing records the acting user and time, requires explicit
`scheduleApproved` and `ageRuleApproved` acknowledgements, validates
completeness under lock, and sets the offering `OPEN`. DB `CHECK` constraints
use `COALESCE(..., false)` around every comparison so SQL `UNKNOWN` cannot let
an incomplete published row through. Nothing is seeded; the owner-confirmed
facts (Sports Garage, Sengjun, 10–12 14:00–16:00, 13–15 16:00–18:00,
Asia/Kuala_Lumpur) are documentation/test inputs only. First date, recurring
court booking, capacity, recurrence and age rule remain unconfirmed.

### D8. Age rule

Explicit per session: `FIXED_DATE` (+`age_reference_date`), `SESSION_START_DATE`
(= `first_session_date`) or `REGISTRATION_DATE` (server "today" in
Asia/Kuala_Lumpur). Age = completed years at the reference date, computed on the
server and stored with the reference date used. The calendar-year formula in
`cohortAgeForYear` is **not** reused. Which rule applies is an owner decision;
a session cannot be published without one.

### D9. Consent and policy versions

No existing approved-policy mechanism exists (`AcademyLead` uses a hard-coded
constant that remains independent). Smallest mechanism:
`academy_registration_policies` (draft → approved → retired, one `APPROVED` per
organization by partial unique index). Approval records the authenticated
approver and timestamp; the API never accepts approver identity from a body and
the repo ships **no** approved policy. Labels beginning `synthetic` cannot be
approved when `KHLIM_ENV` is `staging` or `production`.
Without an approved policy (or without HMAC keys) registration is closed: the
config reports `registrationOpen:false`, `GET /academy/sessions` returns no
items, and `POST` fails `REGISTRATION_CLOSED`.
Each registration stores four consent rows (`GUARDIAN_AUTHORITY`,
`REGISTRATION_PRIVACY`, `MARKETING`, `PHOTOGRAPHY`) with policy id/version,
locale, content hash, server acceptance time and `withdrawn_at`. Optional
consents are never defaulted: both booleans are required in the request.

### D10. Idempotency and keyed hashing

`Idempotency-Key` header, 22–128 chars `[A-Za-z0-9_-]` (≥128 bits when random).
Stored only as `HMAC-SHA256` with a server key (`KHLIM_REGISTRATION_HMAC_KEYS`,
`version:base64secret` comma list, first entry is current; older entries remain
valid for replay lookup, so rotation does not break retries). Uniqueness is
`(organization_id, idempotency_operation, idempotency_key_hmac)`. The payload
hash is `HMAC(key, canonical JSON of the normalized body)`, sorted keys.
Replay is evaluated after syntactic validation but **before** consent-version,
session-availability, rate-limit and age checks, so an identical retry returns
the original immutable receipt even after closure, consent rotation or status
change. A different payload under the same key → `409 IDEMPOTENCY_KEY_CONFLICT`.
No public lookup by receipt id exists. The legacy unkeyed SHA-256 low-entropy
hashes (and the previously proposed `player_dedupe_hash`) are not used;
siblings/twins are never auto-rejected.

### D11. Rate limiting

Namespace `reg:` in `submission_rate_limits` (cleanup bounded to 500 expired
`reg:` rows; lead `lead:` namespace untouched). Counters are keyed by
`HMAC(ip)` (20 per 10 min) and `HMAC(ip + guardian phone)` (3 per hour). There
is deliberately **no phone-only counter**, so a third party cannot lock a
victim's number out. Storage errors fail closed with `503` + `Retry-After`.
No external CAPTCHA.

### D12. Privacy controls

- Admin PII search is `POST …/registrations/search` (body), never a URL query;
  `GET` rejects `q` and unknown parameters.
- Detail views write an `AuditEvent` (entity id only); status and publication
  changes are audited with codes/ids only.
- Database errors on registration paths are replaced with code-only exceptions;
  nothing derived from Prisma/pg messages reaches responses, logs or Sentry.
- Sentry `beforeSend` strips bodies, query strings and cookies on registration
  routes (`apps/api/src/observability/registration-privacy.ts`).
- Public responses carry no player/guardian PII.

### D13. Google Sheets: BLOCKED

No credentials, no spreadsheet, no outbox table. Future design: an idempotent
upsert keyed by `academy_registrations.id`, driven by a post-commit outbox row
written in the registration transaction, with a column allowlist approved by
the owner (no DOB, no guardian/emergency phone unless approved), a restricted
sheet, and retry visibility. Remains an open V1 release dependency.

## Migration

`prisma/migrations/20261125000000_academy_registration_v1/migration.sql` is
additive: three composite unique indexes, one policy table, session table,
registration table, consent table, enums, CHECK constraints, triggers,
RLS enabled with `anon`/`authenticated` privileges revoked (same pattern as
`20261006120000_academy_lead_capture`). Rollback before data exists is the
reverse `DROP` order (triggers → consent → registration → session → policy →
enums → the three composite unique indexes). After real data exists, prefer a
forward fix. No migration execution was added to Vercel builds.

## Operations and configuration

| Setting | Purpose |
| ------- | ------- |
| `KHLIM_REGISTRATION_HMAC_KEYS` | `version:base64secret[,version:base64secret…]`, each secret at least 32 random bytes. First entry signs new records. Unset or malformed means registration is **closed** (fail closed). Never commit or log it. Rotate by prepending a new entry and keeping the old one until old receipts no longer need replay. |
| Approved policy row | Registration is closed until `POST /admin/academy/registration-policies/:id/approve` is performed by `SUPER_ADMIN` or `MANAGEMENT` on owner-approved wording references. Nothing is seeded. |
| `KHLIM_ENV` | `staging` / `production` refuse approval of policy labels starting with `synthetic`. |

Registration stays closed until an owner approves a policy AND the key ring is provisioned.
Production activation, owner-approved consent, real session publication, Google
Sheets synchronization and hosted synthetic acceptance are separate gates.

## Verification commands (local disposable database only)

```bash
docker run -d --name khlim-ric190-test-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=khlim_ric190_test -p 127.0.0.1:55490:5432 postgres:16
export DATABASE_URL="<URL of the local disposable database; its name must contain 'test'>"
pnpm prisma:generate && pnpm exec prisma migrate deploy && pnpm --filter @khlim/api build
KHLIM_TEST_DATABASE=1 node --test tests/integration/academy-registration-v1.test.mjs
```

The tests refuse to run unless the database name contains `test` and the host is local.

## Rollback (before any real data exists)

```sql
-- RIC-190 rollback (local/pre-data only). Reverse order of the migration.
DROP TRIGGER IF EXISTS "academy_registrations_state_guard" ON "public"."academy_registrations";
DROP TRIGGER IF EXISTS "registration_sessions_clean_offering" ON "public"."academy_registration_sessions";
DROP TRIGGER IF EXISTS "plan_eligibilities_registration_isolation" ON "public"."membership_plan_offering_eligibilities";
DROP TRIGGER IF EXISTS "memberships_registration_isolation" ON "public"."memberships";
DROP TRIGGER IF EXISTS "programme_offerings_registration_guard" ON "public"."programme_offerings";
DROP TRIGGER IF EXISTS "programme_offerings_tenant_integrity" ON "public"."programme_offerings";
DROP FUNCTION IF EXISTS "public"."academy_registration_state_guard"();
DROP FUNCTION IF EXISTS "public"."academy_session_requires_clean_offering"();
DROP FUNCTION IF EXISTS "public"."academy_eligibility_registration_isolation"();
DROP FUNCTION IF EXISTS "public"."academy_membership_registration_isolation"();
DROP FUNCTION IF EXISTS "public"."academy_offering_registration_guard"();
DROP FUNCTION IF EXISTS "public"."academy_offering_tenant_integrity"();
DROP TABLE "public"."academy_registration_consents";
DROP TABLE "public"."academy_registrations";
DROP TABLE "public"."academy_registration_sessions";
DROP TABLE "public"."academy_registration_policies";
DROP TYPE "AcademyConsentType";
DROP TYPE "AcademyRegistrationPolicyStatus";
DROP TYPE "AcademySessionRecurrence";
DROP TYPE "AcademyAgeReferenceRule";
DROP TYPE "AcademyRegistrationSessionState";
DROP TYPE "AcademyRegistrationStatus";
DROP INDEX "public"."programme_offerings_organization_id_id_key";
DROP INDEX "public"."programmes_organization_id_id_key";
DROP INDEX "public"."venues_organization_id_id_key";
```

After real registrations exist, prefer a forward fix: dropping the tables loses
submitted data. Prisma's `migrate dev` does not model the partial unique index
or triggers; this repository applies migrations with `migrate deploy` only.

## Known limitations

- Authentication/authorization failures keep the platform's existing
  `{statusCode, message, error}` shape (no `code`), to avoid changing guards for
  other consumers.
- Public session list is capped at 50 sessions.
- Closed sessions are terminal; consent withdrawal has storage (`withdrawn_at`) but no endpoint yet.
- Legacy `PATCH /admin/academy/offerings/:id/status` is unaudited legacy behaviour; for cohorts it can only reduce availability.
- Retention/anonymization columns (`anonymized_at`) exist, but no job or policy is implemented.
- Option lists (gender, jersey size, relationships) are placeholders pending owner confirmation.

## Decision D14: 401/403 error-envelope compatibility

Registration endpoints return `{ statusCode, code, message, fieldErrors?, details?, retryAfter? }`.
Authentication and authorization failures are produced by the shared global
guards (`AuthenticatedUserGuard`, `AuthorizationGuard`) and keep their existing
`{ statusCode, message, error }` shape with no `code`. Changing the guards would
alter the response contract for every existing API consumer (web, admin, mobile,
RIC-65 acceptance scripts), which is out of scope for RIC-190. Clients localize
these two cases from the HTTP status (`401` = sign in again, `403` = not
permitted or MFA required). A coded guard envelope should be a separate,
explicitly reviewed change.

## HMAC key-ring configuration (no key material in this repository)

`KHLIM_REGISTRATION_HMAC_KEYS` is a comma-separated list of `version:base64secret`
entries (version `[A-Za-z0-9]{1,16}`; each secret decodes to at least 32 bytes).
The first entry is current. To generate a secret on a trusted machine:
`openssl rand -base64 32`. Provision it only through the hosting provider's secret
store for the specific environment; never in `.env` files committed to git,
screenshots, tickets or chat. Use a different key per environment. Rotation:
prepend a new entry (for example `v2:…,v1:…`), deploy, and keep `v1` until retries
of receipts signed with it are no longer needed. Removing a version makes
receipts signed with it unreplayable (the retry then returns
`IDEMPOTENCY_KEY_CONFLICT`), so retire old versions deliberately. If the variable
is missing or malformed, registration is closed. **This change provisions no
secret in any environment.**

## Operational dependencies and release blockers

Merging this PR does not open registration. Before parents can register:

1. Owner approval of consent wording (EN/MS/ZH) and an approved policy row created and approved by `SUPER_ADMIN`/`MANAGEMENT`.
2. `KHLIM_REGISTRATION_HMAC_KEYS` provisioned per environment (owner/ops).
3. Hosted database migration applied through the approved process (not executed by this PR or by any deployment hook).
4. Named, MFA-enrolled staff accounts verified under RIC-84.
5. Owner decisions: age cutoff rule, first session date, recurring court booking, capacity, recurrence, option lists, full-session behaviour, retention policy.
6. Google Sheets projection: BLOCKED (destination, field allowlist, access not approved).
7. Hosted synthetic acceptance (RIC-65-style) for the new endpoints.
8. RIC-191 frontend integration and the RIC-184 release gate.
