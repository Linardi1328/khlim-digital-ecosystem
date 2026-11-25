# RIC-190 merge preparation and contract freeze

PR: https://github.com/Linardi1328/khlim-digital-ecosystem/pull/126
Base `9e23be280c1784db4d3a778179bfb87e62da1f94`; reviewed implementation head
`34ad43313f908f956ac55fd145676488e7379258`. This record is the only change
after that head (documentation plus a freeze guard test, no behaviour change).

## 1. Migration freeze

`prisma/migrations/20261125000000_academy_registration_v1/migration.sql` is
**frozen** at the revision reviewed in `34ad433`. Prisma records each applied
migration's SHA-256 checksum in `_prisma_migrations.checksum`.

| Revision (commit) | SHA-256 of `migration.sql` | Status |
| --- | --- | --- |
| `34ad433` | `aae10d0e38c1d26841029918c924489e87a61443262f4107bfdbfe7675694123` | **Frozen, final** |
| `92f72f3` | `2420c131942b5b5e09670c9b9bfb8ea0b623f2bc728213e8ef1e122750f584ba` | superseded, never hosted |
| `a7f0de1` | `b8954375b3f24d666c1867158b13a6fb587196b49eed7d4140d1d6bd1194bddc` | superseded, never hosted |
| `6a97180` | `da8d564b456d9c198d439da95d8e1e22f1ad10a3aeecd872565a48c4773f188f` | superseded, never hosted |

`tests/academy-registration-migration-freeze.test.mjs` (offline, part of
`pnpm test` and CI) fails if the frozen file changes. **Any later correction
must be a new, separately reviewed migration**; the freeze test must not be
edited to accept a changed checksum.

## 2. Evidence that no persistent database applied an earlier revision

| Environment | How it was checked | Result |
| --- | --- | --- |
| GitHub Actions (all PR workflows) | Every workflow that runs `prisma migrate deploy` targets its own `localhost` service container (`.github/workflows/*.yml`), created fresh per job | Ephemeral; nothing persists |
| Hosted staging workflows (`staging-acceptance.yml`, `ric-65-hosted-staging-acceptance.yml`) | Both are `workflow_dispatch` only, run no `migrate` command, and have **no runs on the RIC-190 branch** (`gh run list`) | Not executed for RIC-190 |
| Vercel (API, Web, Admin) | `apps/*/vercel.json` keep `git.deploymentEnabled: false` (unchanged by this PR); no build script runs migrations; no GitHub deployment or Vercel status exists for the RIC-190 head | No deployment, no migration |
| Developer machine used for RIC-190 | No `.env`/`DATABASE_URL` in the main checkout or the RIC-190/RIC-84 worktrees. KHLIM Postgres containers `khlim-test-postgres`, `khlim-assist-db-1`, `khlim-event-operations-lab-db-1`, `khlim-player-development-lab-db-1` stopped 2-3 months before this migration existed. `khlim-ric190-test-pg` is the disposable validation container (synthetic data only) and is removed at the end of merge preparation. | No persistent database applied any revision |
| Hosted Supabase staging and production | **Not verified** (no access by design; hosted databases must not be queried from this work) | Owner/ops must confirm (query below) |
| Other developers' and Antigravity's machines or worktrees | **Not verified** | Owner must confirm |
| Containers of other projects on the same machine (KYNEXA, rivora) | Not KHLIM databases; not inspected | Not applicable |

Read-only check for any environment that could not be verified (returns no row
when the migration has never been applied):

```sql
SELECT migration_name, checksum, started_at, finished_at, rolled_back_at,
       applied_steps_count, logs
FROM _prisma_migrations
WHERE migration_name LIKE '2026112%_academy_registration%'
ORDER BY started_at;
```

- **No row**: never applied; the approved hosted process will apply the
  reviewed revisions in order.
- **Success only** when, for each migration, there is a row with the expected
  checksum (section 1 and 6), `finished_at` **not null** and `rolled_back_at`
  **null**. Only then is no action needed.
- **Incomplete or failed attempt** (`finished_at` null, or `rolled_back_at`
  set, or non-empty `logs`): stop. Prisma blocks later deployments with `P3009`
  until the failed attempt is resolved. Inspect the row, its `logs` and the
  actual schema state before any change; do not run `migrate resolve`,
  `migrate reset` or manual SQL without a reviewed plan.
- **Any other checksum**: an earlier revision was applied. **Do not reset** a
  database that holds real data; stop and plan a separately reviewed corrective
  migration. Only a disposable database may be rebuilt with
  `prisma migrate reset`.

**Owner confirmation (recorded):** the migration-history query returned zero
rows on hosted Supabase **staging** and **production**. No hosted environment
has applied any revision.

## 3. Remaining review threads (7)

The repository ruleset `main-pr-ci-protection` requires all review threads to be
resolved before merge. Evidence at `34ad433`:

| Thread | Finding | Disposition | Evidence |
| --- | --- | --- | --- |
| C3 (`registration.dto.ts`) | Publish approvals must be required and true-only | Fixed | `openapi/khlim-v1.json` `PublishApprovalsDto`: `required: [scheduleApproved, ageRuleApproved]`, each `enum: [true]`; asserted in the contract test (`academy-registration-v1.test.mjs`, "C1-C4/C30/C32") |
| C11 (test fixtures) | 29 February birthday fixture | Fixed | `shiftYears` maps 29 Feb to 28 Feb in non-leap years (`academy-registration-v1.helpers.mjs:97-103`) |
| C16 (test sync) | Wait for the specific blocked transaction | Fixed | `waitingLocks`/`waitForWaiters` use `pg_blocking_pids`, per-backend baselines, `blockedBy` holder pid and lock type |
| C18 (`academy.service.ts`) | Coded 409 when a session attaches during a plan link | Fixed | Database rejection translated to `OFFERING_REGISTRATION_ONLY` (`academy.service.ts:386-398`); race test "C18" |
| C29 (`registration.controllers.ts`) | Shared rate-limit bucket behind an untrusted proxy | **Production release gate** (configuration, no code change) | ADR "Operational dependencies" item 9: `TRUST_PROXY=true` with `TRUST_PROXY_ADDRESSES` of the verified ingress, then hosted verification that `req.ip` is the client address, before public registration opens |
| C37 (race test) | Approve versus retire, not retire versus retire | Fixed | Test "C37/C22" races approval against retirement in both orders and asserts final statuses and versions; the retire-retire check is labelled as such |
| N18 (ADR) | Automatic retirement audit gap | Fixed | `registration-policy.service.ts` writes `ACADEMY_REGISTRATION_POLICY_RETIRED` for the replaced policy and `retiredPolicyId` on approval; test "M3/M4/M5"; ADR access-auditing section updated |

Resolving the threads on GitHub is an owner action (or explicitly delegated).

## 4. Frozen contract for RIC-191 (Antigravity)

At commit `34ad433` (unchanged since):

- OpenAPI: `openapi/khlim-v1.json`
  (https://github.com/Linardi1328/khlim-digital-ecosystem/blob/34ad43313f908f956ac55fd145676488e7379258/openapi/khlim-v1.json)
- Generated client types: `packages/api-client/src/schema.d.ts`
  (https://github.com/Linardi1328/khlim-digital-ecosystem/blob/34ad43313f908f956ac55fd145676488e7379258/packages/api-client/src/schema.d.ts)
- Handoff: `docs/implementation/ric-191-academy-registration-handoff.md`
  (https://github.com/Linardi1328/khlim-digital-ecosystem/blob/34ad43313f908f956ac55fd145676488e7379258/docs/implementation/ric-191-academy-registration-handoff.md)

Contract changes after this point require a reviewed backend change and a
regenerated client (`pnpm openapi:check` enforces consistency).

## 5. Merge requirements and approvals

- Ruleset `main-pr-ci-protection` on `main`: pull request required, all review
  threads resolved, squash merge only, no force-push or deletion, extra approval
  for unattributed changes; 0 required approving reviews; no required status
  checks are configured (all 12 Actions checks pass regardless).
- Owner confirmations received: hosted staging and production returned zero
  migration-history rows; the 7 earlier threads were resolved with evidence.
- Still to resolve before merge: the review threads for the six findings in
  section 6, and review acceptance of the corrective migration.
- Release gates (after merge, before activation): see the ADR "Operational
  dependencies and release blockers".

## 6. Corrective migration `20261126000000_academy_registration_lock_corrections`

The frozen migration is unchanged (checksum guard still passes). Six later
CodeRabbit findings were verified; the database-level ones are fixed by a new,
separately reviewed migration that only replaces six trigger-function bodies
(`CREATE OR REPLACE FUNCTION`; triggers, tables, RLS and grants unchanged).

- SHA-256 of its `migration.sql`:
  `43e5e20b45bdcbdc34049d6dab720e5b5d5152c3f97cd179fb5e9861454a7afb`.
  Freeze it (add it to the freeze test) once this review is accepted and before
  its first hosted application.
- Rollback (pre-data, functions only):
  `docs/implementation/ric-190-lock-corrections-rollback.sql` restores the six
  functions exactly as defined in the frozen migration. Verified: after
  applying it, `pg_get_functiondef` of every `academy_%` function matches a
  database migrated with the frozen revision only (md5
  `ce5cca2bac14bf424c3037a458fa1da9`). As with any manual rollback, the
  `_prisma_migrations` row remains; rebuild disposable databases with
  `prisma migrate reset` from the matching application revision.

| Finding | Verification | Disposition |
| --- | --- | --- |
| Session-only closure vs confirmation (REPEATABLE READ) | Reproduced: with the frozen migration a direct confirmation did not wait for an uncommitted session-only closure and committed | **Fixed** (migration): the confirmation guard locks the session `FOR SHARE` after the offering (same order as all writers; the API close path takes offering then session, so no cycle). Closure-first fails with `SESSION_NOT_AVAILABLE` (READ COMMITTED) or `40001` (REPEATABLE READ); confirmation-first lets both commit |
| Replacement audit from rows actually retired | Reproduced: with a concurrent direct-SQL retirement the approval audit claimed `retiredPolicyId` it did not retire | **Fixed** (service): `updateManyAndReturn` builds both audit entries from the rows this statement updated |
| Parent conflict marker vs FK KEY SHARE | Reproduced: an offering insert blocked behind an open `FOR KEY SHARE` on its programme | **Fixed** (migration): all conflict markers write the non-key `updated_at` column, so they take `FOR NO KEY UPDATE` (still a row write, still `40001` under REPEATABLE READ, no conflict with KEY SHARE) |
| Migration-history completion | Doc defect | **Fixed** (section 2 query and rules) |
| Gate timer not cancelled | Test defect | **Fixed**: cancellable deadline cleared in `finally` |
| C7 direct-failure branch accepted any error | Test defect | **Fixed**: asserts `40P01`/deadlock |

No API contract change: `openapi/khlim-v1.json` and the generated client are
unchanged (`pnpm openapi:check`).
