# Academy lead acceptance and frontend handoff

PR #85 remains Slice 1. Do not merge or deploy until the remaining gates below are verified.

## Reproducible checks

- `pnpm test` always regenerates Prisma and rebuilds the API before running unit/HTTP boundary tests. It cannot silently reuse stale dist files.
- `KHLIM_TEST_DATABASE=1 DATABASE_URL=... pnpm test:pre-alpha:admin` applies migrations to a test database and runs the Admin/API persistence suite, including lead idempotency, tenant isolation, MFA/role guards, quotas, offering errors and concurrent staff writes.
- The **Academy Lead Browser Acceptance** workflow starts PostgreSQL 16 in its own job, builds web/Admin/API, then runs `node --test tests/integration/academy-lead-browser.test.mjs` with `KHLIM_TEST_BROWSER_DATABASE=1`. The database must be local and end in `_browser_test`; the app origins are localhost ports 3100/3102 and the API is port 3101. Build both Next apps with `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3101/v1` and `NEXT_PUBLIC_ADMIN_DEMO_MODE=false`.

Browser coverage uses real production Next builds, Nest HTTP routes, Prisma and PostgreSQL. It submits from a 390px visitor viewport, verifies failure has no false success, retries, checks campaign source/normalized contact/persistence, replays the payload, then finds and updates that same lead from a non-demo Admin inbox and checks the audit event. Screenshots, a visitor trace and process logs are uploaded as `academy-lead-browser-evidence`.

Two explicit test doubles exist: the JWT verifier supplies a known staff identity with aal2, and an injected limiter-store outage exercises the failure path. The real API authorization guards, tenant lookup and database writes still execute. This is **not** evidence of real Supabase sign-in/TOTP.

## Remaining gates

| Gate | Status at implementation | Required evidence |
| --- | --- | --- |
| Backend regressions and browser CI | Pending execution on final commit | Green check links for the exact SHA; inspect uploaded browser evidence |
| Closed-offering automatic UI recovery and translated errors | BLOCKED — frontend implementation pending | Antigravity fix and browser regression using real ApiError responseBody |
| Real staff sign-in and MFA | BLOCKED — no authorized rehearsal session provided | Staff login/TOTP, inbox and update in the intended environment |
| Deployment proxy topology | BLOCKED — provider ingress not verified | Actual trusted proxy addresses/header behavior before enabling trust |
| Latest CodeRabbit review | Pending final commit review | Review the new SHA and reconcile still-valid threads |

## Antigravity: focused frontend implementation

Continue PR #85's existing branch after fetching its latest remote head. Preserve backend changes and the browser acceptance harness. Do not merge/deploy or start Slice 2.

In `apps/web/app/interest/page.tsx`, stop inspecting `ApiError.message` for offering words. The shared client uses a generic status message and exposes the server payload as `responseBody`.

1. Narrow `ApiError.responseBody` safely. For status 400 and code `LEAD_OFFERING_UNAVAILABLE`, clear the unavailable selection, refresh available options (handle refresh failure safely), retain guardian/contact/age/consent and the existing token, and explain how to submit general interest or choose another intake.
2. For status 409 and code `LEAD_IDEMPOTENCY_CONFLICT`, do not advise refreshing for a new token. Explain that the earlier submission may already be recorded and direct the visitor to staff or to retry the original details. Do not silently rotate the token.
3. Translate offering recovery, token conflict and generic failure messages in EN/BM through the existing localization system. Do not display arbitrary server errors. Preserve the existing 429/network recovery.
4. Extend the browser harness: create an OPEN offering fixture, load/select it, close it in the database before submitting, assert the 400 recovery clears/reloads options and preserves entered details, then submit general interest with the same token and confirm one lead. Use real ApiError/client behavior. Add EN/BM coverage; fixture deletion must be scoped to its owned IDs.
5. Keep the existing mobile checks and inspect the failure/success visuals. Return exact final SHA, commands and workflow evidence, with remaining gates marked honestly.

The backend error contract is now `{ code: "LEAD_OFFERING_UNAVAILABLE", message: ... }` (400) or `{ code: "LEAD_IDEMPOTENCY_CONFLICT", message: ... }` (409). The frontend must match codes, not server message substrings.
