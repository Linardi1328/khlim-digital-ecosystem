# RIC-190 merge preparation and contract freeze

[PR #126](https://github.com/Linardi1328/khlim-digital-ecosystem/pull/126)

The independent review accepted all six corrective findings at
`eef00ce5a776e68b7d983dbb3cf17831898f6606`. The follow-up commit adds the
corrective checksum guard and updates this report.

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
`pnpm test` and CI) checks both migration files against their frozen checksums. Further corrections
require a separately reviewed migration with its own checksum.

## 2. Migration-history verification

| Environment | How it was checked | Result |
| --- | --- | --- |
| GitHub Actions (all PR workflows) | Every workflow that runs `prisma migrate deploy` targets its own `localhost` service container (`.github/workflows/*.yml`), created fresh per job | Ephemeral; nothing persists |
| Hosted staging workflows (`staging-acceptance.yml`, `ric-65-hosted-staging-acceptance.yml`) | Both are `workflow_dispatch` only, run no `migrate` command, and have **no runs on the RIC-190 branch** (`gh run list`) | Not executed for RIC-190 |
| Vercel (API, Web, Admin) | `apps/*/vercel.json` keep `git.deploymentEnabled: false` (unchanged by this PR); no build script runs migrations; GitHub listed zero deployment records for the independently reviewed commit | Git-triggered deployments disabled |
| RIC-190 development validation | The earlier validation record identifies `khlim-ric190-test-pg` as a disposable PostgreSQL container using synthetic data | Evidence covers the validation database |
| Hosted Supabase staging | Owner-confirmed read-only `_prisma_migrations` lookup covering both RIC-190 migration names | 0 matching rows |
| Hosted Supabase production | Owner-confirmed read-only `_prisma_migrations` lookup covering both RIC-190 migration names | 0 matching rows |
| Other persistent developer databases, including Antigravity and shared developer instances | Migration-history evidence is outstanding | Owner confirmation required |
| Containers of other projects on the same machine (KYNEXA, rivora) | Not KHLIM databases; not inspected | Not applicable |

The hosted confirmation covers matching Prisma migration-history rows in those
two databases at the time of the owner’s checks. It provides no schema inspection
or coverage of other environments. The following read-only query can be used
to check outstanding developer databases.

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

## 3. Review and CI evidence

GitHub reported 57 review threads, all resolved. The independent review
accepted all six findings in section 6.

At the independently reviewed commit, GitHub reported 12 of 12 successful
Actions checks. The persistence suite passed all 62 tests with zero failures
or skips. [Persistence Integrity run](https://github.com/Linardi1328/khlim-digital-ecosystem/actions/runs/45570158424)

The unrelated browser test “unified spotlight page curates published achievements
and player spotlights” failed in PPO PR validation at `6f3b4ca` and passed when
the suite ran again at `eef00ce`. This is a known reliability observation.
[Failed run](https://github.com/Linardi1328/khlim-digital-ecosystem/actions/runs/45569590998)
[Successful follow-up run](https://github.com/Linardi1328/khlim-digital-ecosystem/actions/runs/45570158621)

## 4. Frozen contract for RIC-191 (Antigravity)

The OpenAPI schema, generated client types and handoff are unchanged from
`34ad433` through the corrective review and freeze.

- OpenAPI: `openapi/khlim-v1.json`
  (https://github.com/Linardi1328/khlim-digital-ecosystem/blob/34ad43313f908f956ac55fd145676488e7379258/openapi/khlim-v1.json)
- Generated client types: `packages/api-client/src/schema.d.ts`
  (https://github.com/Linardi1328/khlim-digital-ecosystem/blob/34ad43313f908f956ac55fd145676488e7379258/packages/api-client/src/schema.d.ts)
- Handoff: `docs/implementation/ric-191-academy-registration-handoff.md`
  (https://github.com/Linardi1328/khlim-digital-ecosystem/blob/34ad43313f908f956ac55fd145676488e7379258/docs/implementation/ric-191-academy-registration-handoff.md)

Contract changes after this point require a reviewed backend change and a
regenerated client (`pnpm openapi:check` enforces consistency). Antigravity
must apply both frozen migrations in order for final integrated acceptance:
`20261125000000_academy_registration_v1`, followed by
`20261126000000_academy_registration_lock_corrections`.

## 5. Merge requirements and approvals

- Ruleset `main-pr-ci-protection` on `main`: pull request required, all review
  threads resolved, squash merge only, no force-push or deletion, extra approval
  for unattributed changes; 0 required approving reviews; no required status
  checks are configured.
- Outstanding before merge is owner confirmation of other persistent developer
  databases covered by section 2. Verify GitHub Actions on the exact freeze
  commit before merging.
- Release gates (after merge, before activation): see the ADR "Operational
  dependencies and release blockers".

## 6. Corrective migration `20261126000000_academy_registration_lock_corrections`

The frozen migration is unchanged (checksum guard still passes). Six later
CodeRabbit findings were verified; the database-level ones are fixed by a new,
separately reviewed migration that only replaces six trigger-function bodies
(`CREATE OR REPLACE FUNCTION`; triggers, tables, RLS and grants unchanged).

- SHA-256 of its `migration.sql`:
  `43e5e20b45bdcbdc34049d6dab720e5b5d5152c3f97cd179fb5e9861454a7afb`.
  The freeze test pins this checksum following review acceptance and before
  first hosted application.
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
