# RIC-191 — Reproducible Local Integrated Acceptance Procedure

This document defines the reproducible, disposable-local-database acceptance procedure for **Academy Registration V1** (`RIC-191` frontend + `RIC-190` backend).

Harness path: [`tests/integration/ric-191-integrated-acceptance.mjs`](../../tests/integration/ric-191-integrated-acceptance.mjs)

---

## 1. Safety Guarantees (Fail-Closed)

The harness refuses to run unless **all** of the following hold:

1. `KHLIM_TEST_DATABASE=1` is explicitly set.
2. `DATABASE_URL` targets a local loopback hostname only (`localhost`, `127.0.0.1`, or `::1`).
3. The target PostgreSQL database name contains `test` (e.g. `khlim_ric191_test`).
4. Only synthetic records (`Synthetic Int Player One`, `SYNTHETIC-V1`, `synthetic://...`), synthetic tokens, and ephemeral per-run HMAC keys (`KHLIM_REGISTRATION_HMAC_KEYS`) are used.
5. No hosted staging/production environment, Supabase Cloud instance, or payment provider is contacted.

---

## 2. Real vs. Simulated Components

| Layer | Mode in Local Acceptance | Notes |
| --- | --- | --- |
| NestJS API (`apps/api`) | **Real** | Full `AppModule`, global `/v1` prefix, real controllers, services, validation, rate limiting, and audit logging. |
| PostgreSQL 16 + Prisma Migrations | **Real** | All migrations deployed via `prisma migrate deploy`; triggers, constraints, RLS, and HMAC blind indexes execute normally. |
| API RBAC & AAL2 Authorization | **Real** | Server-side guards enforce role & AAL2 checks against real PostgreSQL `User` and `OrganizationMembership` rows (Step 2 asserts real HTTP `403` when `ACADEMY_ADMIN` calls `POST .../approve`). |
| Public Website (`@khlim/web`) | **Real (zero interception)** | Built production bundle running on `127.0.0.1:3191`, talking directly to `http://127.0.0.1:3193/v1`. |
| Admin Console (`@khlim/admin`) | **Real UI + real API** | Built production bundle running on `127.0.0.1:3192` with `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3193/v1`. |
| Supabase JWT Signature Verification | **Simulated (local-only)** | `SupabaseJwtService.verify` is stubbed in-process for two synthetic AAL2 tokens (`synthetic-aal2-super-admin` and `synthetic-aal2-academy-admin`) so no hosted Supabase project is required. |
| Admin Browser Bearer Injection | **Simulated (local-only)** | Playwright intercepts `/v1/admin/**` solely to attach `Authorization: Bearer synthetic-aal2-super-admin` and calls `route.continue({ headers })` so 100% of requests and responses flow through the real NestJS server. |

---

## 3. Running Before PR #126 Merges (Isolated Integration Worktree)

Until PR #125 (`RIC-184`) and PR #126 (`RIC-190`) merge to `main`, run against a temporary detached worktree so PR #127 remains strictly frontend-only:

```bash
set -euo pipefail
SRC_WT="$(pwd)"
INT_WT="/tmp/khlim-ric191-int-wt"
BACKEND_SHA="34ad43313f908f956ac55fd145676488e7379258"

# 1. Create detached worktree at the verified RIC-190 backend commit and overlay RIC-184 + RIC-191 frontend files
git -C "$SRC_WT" worktree add --detach "$INT_WT" "$BACKEND_SHA"
MERGE_BASE=$(git -C "$SRC_WT" merge-base "$BACKEND_SHA" HEAD)
git -C "$SRC_WT" diff --name-only "$MERGE_BASE" -- \
  apps/web apps/admin packages/i18n \
  packages/api-client/src/academy-registration-v1.ts \
  packages/api-client/src/index.ts \
  tests/integration/ric-191-integrated-acceptance.mjs \
| while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    if [ -f "$SRC_WT/$rel" ]; then
      mkdir -p "$INT_WT/$(dirname "$rel")"
      cp "$SRC_WT/$rel" "$INT_WT/$rel"
    else
      rm -f "$INT_WT/$rel"
    fi
  done

# 2. Start disposable local PostgreSQL 16 container (use an ephemeral local password)
export LOCAL_TEST_PG_PASS="$(openssl rand -hex 12)"
docker run --rm -d \
  --name khlim-ric191-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD="${LOCAL_TEST_PG_PASS}" \
  -e POSTGRES_DB=khlim_ric191_test \
  -p 127.0.0.1:5491:5432 \
  postgres:16-alpine

until docker exec khlim-ric191-pg pg_isready -U postgres -d khlim_ric191_test >/dev/null 2>&1; do
  sleep 0.5
done

# 3. Install, migrate, build against local API, and execute all 12 steps
cd "$INT_WT"
export DATABASE_URL="postgresql://postgres:${LOCAL_TEST_PG_PASS}@127.0.0.1:5491/khlim_ric191_test"
export KHLIM_TEST_DATABASE=1
pnpm install --frozen-lockfile --prefer-offline
pnpm exec prisma migrate deploy
pnpm prisma:generate
NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:3193/v1" \
NEXT_PUBLIC_ADMIN_DEMO_MODE="true" \
  pnpm build

node tests/integration/ric-191-integrated-acceptance.mjs

# 4. Deterministic teardown
docker rm -f khlim-ric191-pg
git -C "$SRC_WT" worktree remove --force "$INT_WT"
```

---

## 4. Running After PR #125 and PR #126 Merge to `main`

Once both dependencies are merged and PR #127 is rebased onto `main`, omit Step 1 above and run Steps 2–4 directly in your local checkout:

```bash
export DATABASE_URL="postgresql://postgres:${LOCAL_TEST_PG_PASS}@127.0.0.1:5491/khlim_ric191_test"
export KHLIM_TEST_DATABASE=1
pnpm exec prisma migrate deploy
NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:3193/v1" NEXT_PUBLIC_ADMIN_DEMO_MODE="true" pnpm build
node tests/integration/ric-191-integrated-acceptance.mjs
```

---

## 5. Covered 12-Step Acceptance Flow

1. `SUPER_ADMIN` creates synthetic consent policy draft `SYNTHETIC-V1` via Admin UI → PostgreSQL.
2. `SUPER_ADMIN` approves `SYNTHETIC-V1` via Admin UI (and real API returns HTTP `403` for `ACADEMY_ADMIN`).
3. Staff creates and publishes a synthetic training session (`capacity = 1`) with explicit unchecked approvals.
4. Parent completes 3-step public registration via `/academy` → `/academy/register` with Malaysian local phone (`012-345 6789`) → real HTTP `201`.
5. Parent receives non-reserving `KAR-...` receipt (`reservesPlace: false`).
6. Admin locates registration via authoritative session filter and Malaysian local phone `POST /search` (HTTP `200`, HMAC blind index) and opens detail drawer.
7. Admin confirms registration (`RECEIVED → CONFIRMED`).
8. Authoritative confirmed seat count updates to `1 / 1 confirmed` (`0 remaining`).
9. Capacity enforcement rejects over-confirmation (`CAPACITY_EXCEEDED`) and new public submission (`409 SESSION_FULL`).
10. Terminal session closure (`POST .../close`) blocks new submissions (`409 SESSION_NOT_AVAILABLE`).
11. Identical retry with original `Idempotency-Key` returns HTTP `200` with original receipt even after session closure.
12. Retiring current policy `SYNTHETIC-V1` immediately closes public registration (`registrationOpen: false`).
