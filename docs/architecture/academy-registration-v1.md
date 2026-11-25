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

All write transactions run at `READ COMMITTED` with explicit locks. One global
order is used by every registration operation:

```
policy advisory lock (approve/retire only)
  | idempotency advisory locks, all candidate HMACs sorted (submit only)
→ consent policy row → ProgrammeOffering → RegistrationSession → Registration
```

| Operation                       | Advisory                       | Policy row            | Offering     | Session      | Registration     |
| ------------------------------- | ------------------------------ | --------------------- | ------------ | ------------ | ---------------- |
| Public submit                   | every candidate key HMAC       | approved, `FOR SHARE` | `FOR SHARE`  | `FOR SHARE`  | insert           |
| Admin status change (all)       | none                           | none                  | `FOR UPDATE` | `FOR SHARE`  | `FOR UPDATE`     |
| Session PATCH / publish / close | none                           | none (read only)      | `FOR UPDATE` | `FOR UPDATE` | counts CONFIRMED |
| Policy approve / retire         | `registration-policy:<org>`    | `FOR UPDATE`          | none         | none         | none             |
| Legacy membership / plan link   | none                           | none                  | `FOR SHARE` (trigger) | none | none             |
| Registration-session attach     | none                           | none                  | `FOR UPDATE` (trigger) | insert | none             |

- Submit takes shared locks, so closing/capacity changes (exclusive) wait for
  in-flight submissions and later submissions see the new state.
- Every confirm/cancel takes the offering exclusively, so confirmations,
  cancellations and capacity reductions for one cohort are fully serialized;
  count-then-update is therefore race-free.
- The offering id is read unlocked first (the session→offering link is
  immutable, enforced by trigger), then locks are taken in order and all mutable
  state is re-read _after_ locking.
- **Consent policy (RIC-190 review F2).** The policy looked up before the
  transaction is only a cheap early rejection. The authoritative acceptance
  point is a `FOR SHARE` lock on the approved policy row, held to commit.
  Approval, replacement and retirement update that row, so they wait for
  in-flight submissions and a registration can never commit under a policy that
  stopped being approved first. A statement that wakes up after a concurrent
  retirement/replacement is re-run once with a fresh snapshot, then returns
  `CONSENT_VERSION_MISMATCH` (a replacement is now current) or
  `REGISTRATION_CLOSED` (none is). Approvals and retirements for an organization
  are serialized by one advisory lock, so concurrent approvals end with exactly
  one `APPROVED` policy (the later one wins; the earlier is `RETIRED`).
  Historical consent rows keep their policy id, version and content hash after
  retirement; replay of committed registrations is evaluated before availability.
- **Idempotency (RIC-190 review F1).** Submit first takes an advisory lock for
  **every** candidate HMAC of the key (one per ring version), in one sorted
  order, then re-checks existing registrations against all candidates inside the
  transaction. Two instances with compatible rings therefore share lock
  identifiers whichever version they sign with, and the loser observes the
  winner's row. See "HMAC key-ring rotation protocol" for what this does and
  does not protect.
- Legacy billing locks `payments` then `programme_offerings`; registration
  transactions never touch payments, so no cycle exists. Legacy membership
  creation locks the offering only.
- A unique violation (reference-code collision) is caught **outside** the
  rolled-back transaction and handled with a fresh transaction/lookup, never
  continued inside it.
- **Legacy versus attachment (review U1).** The membership and plan-link
  triggers take `FOR SHARE` on the offering row before checking for a
  registration session; the session-insert trigger takes `FOR UPDATE` on the
  offering row before checking for memberships/links. The two sides therefore
  conflict on a single row in either order and the second transaction re-checks
  after the first commits (tested both ways on PostgreSQL 16; no deadlock).
  The API still creates the offering and session together, so no HTTP path can
  attach a session to an existing offering.

Defense in depth at the database level (works for any writer, including direct
SQL): a trigger on `academy_registrations` locks the offering and refuses a
transition to `CONFIRMED` beyond capacity, refuses leaving a terminal state,
and refuses non-`RECEIVED` inserts; a trigger on `programme_offerings` refuses
reducing capacity below confirmed seats and clearing the venue of a published
cohort. Identity triggers (review U4) make a registration's `id`,
`organization_id`, `session_id`, `reference_code`, session-name snapshot,
idempotency/HMAC columns and `created_at` immutable, and a session's `id`,
`organization_id` and `programme_offering_id` immutable; because the composite
foreign keys use `ON UPDATE CASCADE`, an attempted parent key change therefore
also fails closed. There is no V1 transfer workflow, so a CONFIRMED registration
cannot be moved into another (for example full) session, and deleting a
registration, session or offering that has history is blocked by `RESTRICT`
foreign keys.

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
`version:base64secret` comma list, first entry is the active signing key; every entry verifies and is
locked; see the two-phase rotation protocol below). Uniqueness is
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
`20261006120000_academy_lead_capture`). The review-remediation batch (RIC-190 PR #126) **amended this migration in
place** instead of adding a corrective one: it was verified that
`20261125000000_academy_registration_v1` is not on `main`, no hosted migration
was authorized or run, deployments are disabled in `vercel.json`, and every CI
and test database is created fresh. If anyone has applied the earlier revision
to a database outside this PR, that database must be rebuilt (or this change
re-cut as a corrective migration) before merge. Rollback before data exists is
the reverse `DROP` order (triggers → consent → registration → session → policy →
enums → the three composite unique indexes). After real data exists, prefer a
forward fix. No migration execution was added to Vercel builds.

## Operations and configuration

| Setting | Purpose |
| ------- | ------- |
| `KHLIM_REGISTRATION_HMAC_KEYS` | `version:base64secret[,version:base64secret…]`, each secret at least 32 random bytes. First entry signs new records. Unset or malformed means registration is **closed** (fail closed). Never commit or log it. Rotate only with the two-phase protocol in "HMAC key-ring rotation protocol" below. |
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
DROP TRIGGER IF EXISTS "academy_registrations_identity_guard" ON "public"."academy_registrations";
DROP TRIGGER IF EXISTS "registration_sessions_identity_guard" ON "public"."academy_registration_sessions";
DROP TRIGGER IF EXISTS "academy_registrations_state_guard" ON "public"."academy_registrations";
DROP TRIGGER IF EXISTS "registration_sessions_clean_offering" ON "public"."academy_registration_sessions";
DROP TRIGGER IF EXISTS "plan_eligibilities_registration_isolation" ON "public"."membership_plan_offering_eligibilities";
DROP TRIGGER IF EXISTS "memberships_registration_isolation" ON "public"."memberships";
DROP TRIGGER IF EXISTS "programme_offerings_registration_guard" ON "public"."programme_offerings";
DROP TRIGGER IF EXISTS "programme_offerings_tenant_integrity" ON "public"."programme_offerings";
DROP FUNCTION IF EXISTS "public"."academy_registration_identity_guard"();
DROP FUNCTION IF EXISTS "public"."academy_registration_session_identity_guard"();
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
- Access auditing beyond detail reads and state changes (list/search views of minors' names, exports) is an outstanding operational decision for the owner; this change adds no further audit infrastructure.
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

## HMAC key-ring rotation protocol (no key material in this repository)

`KHLIM_REGISTRATION_HMAC_KEYS` is a comma-separated list of `version:base64secret`
entries (version `[A-Za-z0-9]{1,16}`; each secret decodes to at least 32 bytes).
**The first entry is the active signing key; every entry verifies and is locked
for idempotency.** Generate a secret on a trusted machine (`openssl rand -base64 32`)
and provision it only through the hosting provider's secret store for that
environment; never in committed `.env` files, tickets, screenshots or chat. Use
a different key per environment. If the variable is missing or malformed,
registration is closed. **This change provisions no secret in any environment.**

The existing format can express a safe two-phase rotation; no secret-management
infrastructure is needed. Order matters because the value is "first = signing":

1. **Distribute the verification key.** Deploy `old:…,new:…` (the current key
   stays first, so signing is unchanged). Instances still on `old:…` keep
   working but cannot see the new key.
2. **Verify compatible rings.** Do not continue until **every** serving
   instance runs a revision whose ring contains both versions. Compare the
   version names only (never values) in the provider's environment settings and
   the deployed revision of each instance; drain or stop any instance still on
   the old ring.
3. **Switch signing.** Deploy `new:…,old:…`. New receipts are signed with `new`.
4. **Retain historical keys** for the supported replay window (at least the
   longest retry horizon of the frontend plus a safety margin). Removing a
   version makes receipts signed with it unreplayable (the retry would return
   `IDEMPOTENCY_KEY_CONFLICT`, or could create a second record), so retire old
   versions deliberately and only after that window.

What is guaranteed: with compatible rings, two instances that sign with
different active versions share advisory lock identifiers and re-check all
candidate HMACs inside the transaction, so concurrent identical requests create
one registration and one receipt (tested with both possible winners, identical
retries, conflicting payloads and sequential rotation).

**Unsupported (not safe):** an instance whose ring lacks a version that another
instance signs with (for example a straggler still on `old:…` while others sign
with `new`). That instance cannot compute or look up the other version's HMAC,
so it can miss an existing row and create a duplicate. Locking all known
versions cannot protect an instance that does not know the new key. Protocol
step 2 exists to rule this out; there is no runtime check, and the system does
not claim safety in that scenario.

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
