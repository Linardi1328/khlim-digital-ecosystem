# RIC-119: database health diagnostics and preview investigation

Issue: [RIC-119](https://linear.app/rbl-productions/issue/RIC-119/khlim-api-ric-84-diagnose-staging-db-disconnect-with-safe-prisma).
Observed 31 October 2026 (MYT). The original RIC-119 backend-only
diagnostics were based on main `16e877863953366e3cbfedb10a7f06d6910b950d`.
The isolated integration candidate combines RIC-84 security source
`1793935894bf4bf3673eda3127b89cf24b73f8a3` and RIC-119 diagnostic source
`ce6c31731f16c9fcb7bf20a639d2b34a8ec9a700` (PR #113, tested at
`26ec6f070504bdadeb26bed15da3d1dfb13137a5`).

## Live evidence and limits

The exact branch aliases were resolved using authenticated, read-only Vercel
inspection before protected health requests. No settings, credentials, database
records, migrations, deployments or aliases were changed.

| Preview | Immutable deployment | Source commit |
| --- | --- | --- |
| RIC-84, failing target | `dpl_EcMfuoq7Gz38CdvgH7iFLmS9TsFF` / `khlim-digital-ecosystem-bgax17o5e-rbl-productions.vercel.app` | `1793935894bf4bf3673eda3127b89cf24b73f8a3` |
| RIC-65, historical known-good reference | `dpl_8Rt92FYHQhR2PYiTFbfoC9HZE1xb` / `khlim-digital-ecosystem-frd22o0kw-rbl-productions.vercel.app` | `db73d8c0f88d7274f8156b9bca4c9ec4ad8d6d1e` |

The API project is `khlim-digital-ecosystem-api` under `rbl-productions`, rooted at
`apps/api`. Source configuration has Git auto-deploy disabled in all three app
`vercel.json` files. The inspected deployment build config also has that flag;
this PR does not change it. No deploy or configuration mutation is authorized.

First probes at approximately 08:08 MYT were accompanied by Nest bootstrap-start
logs on both deployments: both returned HTTP 200 with `status:error` and
`database.status:disconnected`. RIC-65 included project reference
`qxsjxcbfhxbvxigghhlq`; RIC-84 did not. This means the historical reference was
not healthy on that first observation, rather than being assumed good.

Three later sequential samples per deployment at approximately 08:13 MYT:

| Preview | Database results | HTTP status | Curl request durations |
| --- | --- | --- | --- |
| RIC-84 | disconnected, disconnected, disconnected | 200 each | 0.356 / 0.443 / 0.301 seconds |
| RIC-65 | connected, connected, connected | 200 each | 0.921 / 0.544 / 0.647 seconds |

The checked-in [sanitized evidence](ric-119-deployment-evidence.json) includes exact
deployment identities, timestamps and public health JSON only. Raw CLI data stays
in the ignored local `.tmp/ric119/` directory and must not be uploaded wholesale.

Both bootstrap logs confirm `nodeEnv=production`, `deploymentEnv=staging`,
`hasDatabaseUrl=true`, and `hasSupabaseJwtIssuer=true`. The deployment metadata
reports `iad1`; the retrieved CLI log records do not independently establish
execution region. Prior issue observations of `sin1` must not be overwritten by
an inference from deployment metadata or edge-routing headers.

**Deployed RIC-84 root cause remains unverified.** Its observed warm failures are
faster than the two-second deadline, so those particular failures cannot be
attributed simply to expiry of that timer. Missing `projectRef` means the old
extractor did not expose a recognized reference; it does not establish a wrong
password, DNS fault, TLS fault or region problem. Existing probe errors are
silently caught; the available logs contain bootstrap records without the
underlying database rejection. No credentials were reset or reconfigured on the
basis of these clues. RIC-65's initial failure followed by warm success shows a
cold/transient sensitivity worth measuring, but does not prove its precise cause.

No authorized synthetic access-token session was available to test live `/v1/me`.
No user credentials, browser tokens or privileged sessions were retrieved, and no
account/authentication records were altered. Thus live Supabase Auth success and
subsequent account loading have **not** been independently verified in this task.
The frontend's existing Supabase-auth -> API-getMe flow is unchanged. A health
failure must not be described as proof of bad end-user credentials.

## Implementation and compatibility

The public JSON shape and HTTP **200** behavior are retained. There is no 503 or
readiness-route change and no new public error detail. Connected probes still
return `status:ok` / `database.status:connected`. Failed probes return
`status:error` / `database.status:disconnected`. Non-production project-reference
presentation remains as before and production hides it.

One correction is intentional: a missing optional Prisma provider now returns
`status:error` / `database.status:unconfigured`, whereas the old implementation
could call that healthy. Missing/blank `DATABASE_URL` is also unhealthy. Existing
strict staging readiness consumers already reject unconfigured/disconnected DB
states. HTTP tests cover all three states and preserve the status-code contract.
OpenAPI generation remains unchanged.

Each failed health request emits exactly one JSON-line server event:

```json
{"level":"error","service":"khlim-api","event":"database.health_probe.failed","durationMs":2001,"stage":"connect","category":"probe_timeout","code":"KHLIM_PROBE_TIMEOUT"}
```

The actual event also has an ISO timestamp. Only `durationMs`, a fixed stage,
a fixed category and an optional allowlisted stable code are derived from the
probe. For otherwise `unknown` failures, it also emits a strictly bounded
`diagnostic` object containing fixed enums only: `origin` (`pg_pool`,
`prisma_adapter` or `unavailable`), `errorShape` (`type_error`,
`aggregate_error`, `error` or `opaque`), `connectionMode` (transaction,
session, direct or other), `poolerUsername` (project-scoped, other or
not-applicable) and a boolean `passwordPresent`. Presence is **not proof of
credential correctness**. The code never serializes exceptions, stack traces,
messages, actual usernames, hosts, URLs, passwords, JWTs, tokens, SQL parameters
or user records. No detailed diagnostics are added to the public response.

Categories distinguish missing/invalid configuration or missing provider, DNS,
unreachable network, refused connection, rejected authentication, TLS, timeout,
query failures and unknown errors. The classifier walks bounded nested Prisma
`meta` / `driverAdapterError` / `cause` / aggregate errors, handles cycles and
hostile getters, and ignores arbitrary codes. It uses exact built-in pg timeout
messages only for internal classification, never for output. The allowlist is
explicit in `health-probe.ts`; unknown failures omit the code. Because PrismaPg
normalizes both DNS and refusal to `DatabaseNotReachable`, the isolated pool
captures acquisition failures before normalization and retains only the approved
code in the final result. Raw errors stay scoped to the short-lived operation.

The probe keeps the original **2,000 ms** deadline; it does not increase it as a
speculative fix. It uses the same PrismaClient -> PrismaPg -> pg execution path
and `SELECT 1`, with a dedicated maximum-one-connection pool, bounded pg acquisition
and query timeouts. It does not inject server session/startup settings: these are
not portable through transaction poolers. Connection-string parsing is
performed before applying the limits so URL timeout fields cannot disable them.
Credentials and TLS behavior are otherwise preserved, never rewritten in Vercel.

The watchdog does not merely abandon a Promise.race: cleanup immediately ends tracked clients
(pg destroys an active query's socket), disconnects that probe's Prisma instance,
and ends its pool. A late successful connection is closed if cleanup already
started. Connection and query stalls are separately tested against owned
nonresponsive loopback peers, with explicit peer-close assertions. Setup failures,
normal completion and rejection all initiate cleanup. Cleanup waits only for the
remaining overall deadline; slow pool bookkeeping can finish after the response
without extending its budget. Rejections are observed, and driver connection
timeouts plus late-client closure remain active. No shared application client is
disconnected and normal application query limits are unchanged.

Concurrent health requests share one in-flight operation within PrismaService,
avoiding one new database connection for every parallel request. Settled results
are cached for one second per instance to bound sequential connection churn. A
configuration change invalidates cached results, including cached success when
DATABASE_URL disappears. Each failed HTTP
request still gets one sanitized event and the public result. The pool is disposed
after each operation. Cached event durations describe the underlying probe;
separate physical samples require waiting beyond the one-second TTL. Warm HTTP
observations therefore must not be described as
proof of a warmed diagnostic connection. This endpoint diagnoses connection/query
ability through Prisma, not the full application's shared-pool saturation or
business data/schema correctness. `/v1/me` remains a separate validation gate.

## Validation

All local commands use a synthetic loopback DATABASE_URL where generation needs
one. They do not contact either hosted database or apply migrations.

| Check | Result |
| --- | --- |
| `pnpm test` | **330 passed**, 0 failed/skipped |
| `node --test tests/database-health.test.mjs` (after API build) | **30 passed**, 0 failed/skipped |
| `pnpm test:pre-alpha` with database opt-in disabled | **23 passed, 13 existing opt-in skips**, 0 failed |
| `pnpm lint` | PASS |
| `pnpm format:check` | PASS |
| `pnpm typecheck` | PASS, all five tasks |
| `pnpm prisma:validate` | PASS |
| `pnpm openapi:check` | PASS, no generated contract diff |
| `pnpm build` | PASS, all three application builds |

New regression tests cover success, absent/malformed configuration, nested
DNS/network/refusal/auth/TLS/timeout/query classifications, unknown/cyclic errors,
redaction, one-event counting, no-provider failure, timer cleanup, a valid slow
probe, real connection refusal before Prisma normalization, stalled handshake,
stalled query disposal, successful Prisma wire-protocol queries without added
server startup settings, concurrent/sequential sharing and cache invalidation,
remaining-budget cleanup bounds, minimal HTTP 200 contracts and
production reference suppression. No assertion or existing test was weakened.

## Diagnostic deployment and exact-head evidence (1 November 2026)

An API-only Preview deployment was created manually at the RIC-84
branch-scoped staging environment from integrated commit
`f90bdecf3c660ec0dd3c191cd7303e08a4723dde`, whose file tree matches the
12/12 CI-passing integration candidate `26ec6f0`. The immutable deployment is
`dpl_4zRQmbrSfyZUf56XAkLbZewV92oW` at
`https://khlim-digital-ecosystem-rbz6llf8i-rbl-productions.vercel.app`.
The new deployment reached READY. Vercel initially assigned the mutable RIC-84
branch alias to it; after read-only health and server-log evidence was captured,
the alias was explicitly restored and verified against original immutable
deployment `dpl_EcMfuoq7Gz38CdvgH7iFLmS9TsFF`.
Use only immutable deployment URLs for comparisons.

Three sanitized server-only error events showed category `invalid_database_url`,
stage `configuration` and duration `0 ms`, with no allowlisted error code. The
public health response remained HTTP 200 with `database.status=disconnected`.
**This identifies the first failing stage, not the exact malformed value.**
No database handshake, TLS authentication or SQL execution was attempted by the
new diagnostic probe. Vercel reports a sensitive branch-specific DATABASE_URL
record, but read-only inspection did not return its decrypted value.
No secrets were printed, copied or changed, and no hosted database writes or
migrations occurred.

The original RIC-84 immutable Preview was still disconnected. The RIC-65
immutable reference first returned disconnected after an idle period, then
returned connected on three subsequent warm health requests. This remains a
historical comparison only; do not change RIC-65.

## Later staging connection investigation (1 November 2026)

The operator updated the branch-specific sensitive `DATABASE_URL` and confirmed
they selected Supabase **Transaction pooler**. A subsequent immutable
API-only Preview `dpl_9sXWwvDGySR2VdbZFyZGvB86L8Qy` at
`fa64d329d4cfb41ff9b135ab2bf7d3401fc6f703` reached READY.
Four sampled public health responses were HTTP 200 with `status=error`,
`database.status=disconnected`, and project reference
`qxsjxcbfhxbvxigghhlq` (correct *staging* project). The earlier
`invalid_database_url` classification was cleared. Server-only events showed
`stage=connect`, `category=unknown`, no stable error code, and 466–835 ms
durations. The application did not report a two-second timeout.

A clean-history diagnostic PR #116 passed 12/12 GitHub workflows and the Secret
Scan. Its exact file tree was staged on RIC-84 as
`01eff3c7de502e54aeaa06a831169efbe841cd80`; that commit passed
14 GitHub checks, including CodeRabbit, but follow-up review threads remain
open for documentation and proving actual database-row lock contention.
An API-only immutable Preview `dpl_EfU4VSDyxSZ2R2wZH3Tyr9bAJHmX`
(`https://khlim-digital-ecosystem-2bzswsdbh-rbl-productions.vercel.app`)
reached READY and returned three disconnected health checks with the correct
staging project reference. A sampled sanitized private failure event showed
`stage=connect`, `category=unknown`, `origin=pg_pool`,
`errorShape=error`, `connectionMode=supavisor_transaction`,
`poolerUsername=project_scoped`, `passwordPresent=true`, no allowlisted
code, and 776 ms duration. This does **not** validate the password or prove
successful TLS/authentication.

Supabase staging Pooler Logs in a narrow investigation window contained three
`supavisor_logs` records with `mode=transaction`, `state=handshake`,
`severity=error`; they originated from
`Elixir.Supavisor.ClientHandler.Error.terminate_with_error/3`.
Only fixed-field aggregates and allowlisted text-match counts were inspected:
the event text contains the phrase `SSL connection`. This is consistent with
a pooler-side handshake problem, but log-to-request correlation and the precise
error condition are **not yet verified**. No credentials or raw error strings
were copied into this runbook. A Supabase control-plane read-only `SELECT 1`
confirmed the staging database itself responds.

The RIC-84 mutable branch alias was verified still pointing to the original
immutable Preview `dpl_EcMfuoq7Gz38CdvgH7iFLmS9TsFF`. The new diagnostic
Preview has no aliases. No production promotion, migrations, DB writes, Vercel
variable changes or credential rotation were performed during the follow-up.
The generic Preview/main-database isolation risk remains separately tracked
under RIC-120.

## Approval boundary and next verification

Do not merge PR #110 or the integrated candidate into production while
the **database-locked reciprocal Super Admin concurrency assertion** and
owner-approved authentication/staff acceptance gates remain incomplete. The
existing real-PostgreSQL regression checks the invariant, but a separate lock
holder/overlap test is still requested to prove contention and serialization.
Never infer `/v1/me` success from a public health response.

The URL is now parseable and project-scoped correctly; **do not reclassify the
later failure as invalid URL syntax**. The next action is a secure operator
comparison of the staging Supabase Connect transaction-pooler **host/region,
port 6543, project-scoped username and URL-encoded password** with the
branch-specific Vercel variable, and investigation of the Supavisor handshake
logs. Never paste the actual value, password or raw pooler logs into tickets or
ChatGPT. Do not rotate or change credentials, SSL enforcement or connection
parameters without evidence of the exact fault and an impact review of RIC-65.
Any verified correction requires another **immutable API-only Preview**,
cold/warm `/v1/health` checks, and sanitized private logs.
With an approved synthetic identity and session, verify Supabase Auth separately
from authorized `/v1/me` account loading.

Future diagnostic previews should have isolated scope and preserve the original
reference deployment and alias routing. If Git-based manual deployments assign a
mutable branch alias automatically, record the mapping and restore the original
target after collecting evidence; never silently overwrite RIC-65 or production.
