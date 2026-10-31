# RIC-119: database health diagnostics and preview investigation

Issue: [RIC-119](https://linear.app/rbl-productions/issue/RIC-119/khlim-api-ric-84-diagnose-staging-db-disconnect-with-safe-prisma).
Observed 31 October 2026 (MYT). Backend-only change, based on main
`16e877863953366e3cbfedb10a7f06d6910b950d`.

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
probe. It never serializes exceptions, stack traces, messages, usernames, hosts,
URLs, JWTs, tokens, SQL parameters or user records. No detailed diagnostics are
added to the public response.

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

The watchdog does not merely abandon a Promise.race: cleanup ends tracked clients
(pg destroys an active query's socket), disconnects that probe's Prisma instance,
and ends its pool. A late successful connection is closed if cleanup already
started. Connection and query stalls are separately tested against owned
nonresponsive loopback peers, with explicit peer-close assertions. Setup failures,
normal completion and rejection all clean up. No shared application client is
disconnected and normal application query limits are unchanged.

Concurrent health requests share one in-flight operation within PrismaService,
avoiding one new database connection for every parallel request. Each failed HTTP
request still gets one sanitized event and the public result. The pool is disposed
after each operation; warm HTTP observations therefore must not be described as
proof of a warmed diagnostic connection. This endpoint diagnoses connection/query
ability through Prisma, not the full application's shared-pool saturation or
business data/schema correctness. `/v1/me` remains a separate validation gate.

## Validation

All local commands use a synthetic loopback DATABASE_URL where generation needs
one. They do not contact either hosted database or apply migrations.

| Check | Result |
| --- | --- |
| `pnpm test` | **328 passed**, 0 failed/skipped |
| `node --test tests/database-health.test.mjs` (after API build) | **28 passed**, 0 failed/skipped |
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
server startup settings, concurrent sharing, minimal HTTP 200 contracts and
production reference suppression. No assertion or existing test was weakened.

## Approval boundary and next verification

This PR targets main; RIC-84 authentication changes remain in unmerged PR #110.
Any diagnostic candidate must preserve that security implementation while adding
these backend changes. Do not deploy this main-based branch over RIC-84 as-is.

This PR is deploy-ready source and tests, **not a deployed diagnosis**. After
independent review, request separate approval to deploy only an isolated RIC-84
diagnostic preview. Keep RIC-65, production, credentials and Vercel settings intact.
Then capture the new category/code/stage/duration for first and repeated health
requests, and—with an approved synthetic session—separately establish Supabase
Auth success and authorized `/v1/me` account loading. Never print session tokens.
Only that evidence can justify a follow-up configuration or timeout change.
