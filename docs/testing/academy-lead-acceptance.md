# Academy lead acceptance and frontend handoff

PR #85 remains Slice 1. Do not merge or deploy until the remaining gates below are verified.

## Reproducible checks

- `pnpm test` always regenerates Prisma and rebuilds the API before running unit/HTTP boundary tests. It cannot silently reuse stale dist files.
- `KHLIM_TEST_DATABASE=1 DATABASE_URL=... pnpm test:pre-alpha:admin` applies migrations to a test database and runs the Admin/API persistence suite, including lead idempotency, tenant isolation, MFA/role guards, quotas, offering errors and concurrent staff writes.
- The **Academy Lead Browser Acceptance** workflow starts PostgreSQL 16 in its own job, builds web/Admin/API, then runs `node --test tests/integration/academy-lead-browser.test.mjs` with `KHLIM_TEST_BROWSER_DATABASE=1`. The database must be local and end in `_browser_test`; the app origins are localhost ports 3100/3102 and the API is port 3101. Build both Next apps with `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3101/v1` and `NEXT_PUBLIC_ADMIN_DEMO_MODE=false`.

Browser coverage uses real production Next builds, Nest HTTP routes, Prisma and PostgreSQL. It submits from a 390px visitor viewport, verifies failure has no false success, retries, checks campaign source/normalized contact/persistence, replays the payload, then finds and updates that same lead from a non-demo Admin inbox and checks the audit event. Screenshots, a visitor trace and process logs are uploaded as `academy-lead-browser-evidence`.

Two explicit test doubles exist: the JWT verifier supplies a known staff identity with aal2, and an injected limiter-store outage exercises the failure path. The real API authorization guards, tenant lookup and database writes still execute. This is **not** evidence of real Supabase sign-in/TOTP.

## Current acceptance state

Antigravity implemented structured error handling, EN/BM recovery, campaign aliases and staff-session guards. Follow-up development separates list and drawer request lifetimes, resets operation state on identity/eligibility changes, and invalidates drawer responses when selection changes. This prevents successful saves remaining busy after list refresh.

Browser coverage now also checks every campaign alias on home/list/detail pages, save-button recovery, a deferred save across staff sign-out/sign-in, and a deferred list across lost eligibility. Auth transport and the replacement staff session are browser-only doubles at `https://auth.browser-test.invalid`; no hosted authentication or database is modified. The CI checkout does not persist Git credentials.

| Gate | Required evidence |
| --- | --- |
| Final branch validation | Green CI and CodeRabbit review on the new commit, including browser regressions |
| Real staff sign-in and MFA | Login/TOTP, inbox and update in the intended rehearsal environment |
| Deployment proxy topology | Verify actual ingress addresses and forwarded-header behavior before launch |

Proxy configuration is `TRUST_PROXY=true` plus explicit `TRUST_PROXY_ADDRESSES` IP/CIDR entries; `KHLIM_TRUST_PROXY` is the legacy flag fallback. `KHLIM_API_TRUSTED_PROXY` is not a supported setting. Leave trust disabled until the actual API ingress topology is established. Do not assume a Cloudflare or Render address range from the frontend host.

The real-auth and ingress gates remain open. This change does not authorize merging, deploying or changing the hosted database.
