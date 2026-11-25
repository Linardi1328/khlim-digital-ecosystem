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
SELECT migration_name, checksum, finished_at
FROM _prisma_migrations
WHERE migration_name = '20261125000000_academy_registration_v1';
```

- No row: safe; the frozen revision will be applied by the approved hosted process.
- A row with checksum `aae10d0e…5694123`: the frozen revision; no action.
- A row with any other checksum: an earlier revision was applied. **Do not
  reset** a database that holds real data; stop and plan a separately reviewed
  corrective migration. Only a disposable database may be rebuilt with
  `prisma migrate reset`.

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
- Owner approvals still needed before merge: resolve the 7 threads; confirm the
  unverified environments in section 2.
- Release gates (after merge, before activation): see the ADR "Operational
  dependencies and release blockers".
