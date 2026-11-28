# RIC-191 — Reproducible Local Integrated Acceptance Runbook

This runbook defines the reproducible, disposable-local-database integrated acceptance procedure for **Academy Registration V1** on the combined `main` + PR #127 revision (RIC-190 backend + RIC-184 public web + RIC-191 frontend).

Harness path: [`tests/integration/ric-191-integrated-acceptance.mjs`](../../tests/integration/ric-191-integrated-acceptance.mjs)

---

## 1. Fail-Closed Safety Guarantees

The acceptance harness refuses to execute unless **all** of the following hold:

1. `KHLIM_TEST_DATABASE=1` is explicitly set.
2. `DATABASE_URL` (validated via URL parsing, query parameters, `pg-connection-string`, `pg.Client`, and `PGHOST`/`PGHOSTADDR`/`PGDATABASE` fallback checks) targets a local loopback host only (`localhost`, `127.0.0.1`, or `::1`).
3. The effective PostgreSQL database name contains `test` (e.g. `khlim_ric191_<run_id>_test`).
4. The target database is a **freshly provisioned empty disposable database** — the harness performs zero `TRUNCATE` or destructive resets and fails closed if any existing rows exist in `academy_registration_policies`, `academy_registration_sessions`, `academy_registrations`, or `academy_registration_consents`.
5. Loopback server startup fails closed if a target port is already occupied or if listener ownership cannot be verified against the spawned process tree, and cleanup only terminates child handles owned by the current run.
6. Every disposable resource (container name, database name, ephemeral password, and host port) is uniquely allocated per run and torn down unconditionally via `trap cleanup EXIT`.
7. Only synthetic records (`Synthetic Int Player One`, `SYNTHETIC-V1`, `synthetic://...`), synthetic AAL2 tokens, and ephemeral per-run HMAC keys (`KHLIM_REGISTRATION_HMAC_KEYS`) are used.
8. No hosted staging/production environment, Supabase Cloud project, or external payment provider is ever contacted.

---

## 2. Real vs. Simulated Components

| Layer | Mode in Local Acceptance | Notes |
| --- | --- | --- |
| NestJS API (`apps/api`) | **Real** | Full `AppModule`, global `/v1` prefix, real controllers, services, validation, rate limiting, optimistic locking, and audit logging. |
| PostgreSQL 16 + Frozen Prisma Migrations | **Real** | All migrations deployed in order via `prisma migrate deploy`, including both frozen RIC-190 migrations (`20261125000000_academy_registration_v1` and `20261126000000_academy_registration_lock_corrections`); triggers, constraints, RLS, and HMAC blind indexes execute normally. |
| API RBAC & AAL2 Authorization | **Real** | Server-side guards enforce role & AAL2 checks against real PostgreSQL `User` and `OrganizationMembership` rows (Step 2 verifies real HTTP `403` when `ACADEMY_ADMIN` calls `POST .../approve`). |
| Public Website (`@khlim/web`) | **Real (zero interception)** | Built production bundle running on `127.0.0.1:3191`, talking directly to `http://127.0.0.1:3193/v1`. |
| Admin Console (`@khlim/admin`) | **Real authenticated UI + real API (zero interception)** | Built production bundle running on `127.0.0.1:3192` with `NEXT_PUBLIC_ADMIN_DEMO_MODE=false` and `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3193/v1`. |
| Supabase JWT Signature Verification | **Simulated (local-only)** | `SupabaseJwtService.verify` is stubbed in-process for two synthetic AAL2 tokens (`synthetic-aal2-super-admin` and `synthetic-aal2-academy-admin`) so no hosted Supabase project is required. |
| Admin Browser Session Seeding | **Simulated (local-only)** | Playwright seeds a synthetic future-expiring session in `localStorage["khlim_admin_supabase_session"]` so authenticated `@khlim/admin` attaches `Authorization: Bearer synthetic-aal2-super-admin` directly to `/v1/admin/session` and `/v1/admin/academy/**` with zero Playwright HTTP interception. |

---

## 3. Running Combined Integrated Acceptance (Current Reconciled Revision)

Run directly from a clean checkout of the reconciled branch (no detached worktree overlay required now that RIC-190 and RIC-184 are merged into `main`):

```bash
set -euo pipefail

RUN_ID="ric191_$(date +%s)_$$"
PG_CONTAINER="khlim-${RUN_ID}-pg"
PG_DB="khlim_${RUN_ID}_test"
PG_PASS="$(openssl rand -hex 12)"

cleanup() {
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# 1. Start a uniquely named, freshly provisioned disposable PostgreSQL 16 container on an ephemeral loopback port
docker run --rm -d \
  --name "$PG_CONTAINER" \
  -e POSTGRES_USER=postgres \
  -e "POSTGRES_PASSWORD=${PG_PASS}" \
  -e "POSTGRES_DB=${PG_DB}" \
  -p 127.0.0.1:0:5432 \
  postgres:16-alpine >/dev/null

PG_PORT="$(docker port "$PG_CONTAINER" 5432/tcp | head -n 1 | awk -F: '{print $NF}')"
if [ -z "$PG_PORT" ]; then
  echo "Failed to resolve ephemeral PostgreSQL port for ${PG_CONTAINER}" >&2
  exit 1
fi

# 2. Bounded readiness check (max 30s)
READY=0
for _ in $(seq 1 60); do
  if docker exec "$PG_CONTAINER" pg_isready -U postgres -d "$PG_DB" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done
if [ "$READY" -ne 1 ]; then
  echo "Disposable PostgreSQL container ${PG_CONTAINER} did not become ready within 30s" >&2
  exit 1
fi

# 3. Deploy all Prisma migrations in order and verify both frozen RIC-190 migrations
export DATABASE_URL="postgresql://postgres:${PG_PASS}@127.0.0.1:${PG_PORT}/${PG_DB}"
export KHLIM_TEST_DATABASE=1

pnpm exec prisma migrate deploy
pnpm prisma:generate

APPLIED_FROZEN="$(docker exec "$PG_CONTAINER" psql -U postgres -d "$PG_DB" -tAc \
  "SELECT migration_name FROM _prisma_migrations WHERE migration_name IN ('20261125000000_academy_registration_v1', '20261126000000_academy_registration_lock_corrections') AND finished_at IS NOT NULL ORDER BY migration_name;")"
EXPECTED_FROZEN=$'20261125000000_academy_registration_v1\n20261126000000_academy_registration_lock_corrections'
if [ "$APPLIED_FROZEN" != "$EXPECTED_FROZEN" ]; then
  echo "Expected both frozen RIC-190 migrations to be applied in order, got:" >&2
  echo "$APPLIED_FROZEN" >&2
  exit 1
fi

# 4. Build against the local acceptance API origin (non-demo authenticated Admin) and execute all 12 real-stack steps
NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:3193/v1" \
NEXT_PUBLIC_ADMIN_DEMO_MODE="false" \
  pnpm build

node tests/integration/ric-191-integrated-acceptance.mjs
```

---

## 4. Covered 12-Step Acceptance Flow

1. `SUPER_ADMIN` creates synthetic consent policy draft `SYNTHETIC-V1` via Admin UI → PostgreSQL.
2. `SUPER_ADMIN` approves `SYNTHETIC-V1` via Admin UI (and real API returns HTTP `403` for `ACADEMY_ADMIN`).
3. Staff creates and publishes a synthetic training session (`capacity = 1`) with explicit initially unchecked approvals.
4. Parent completes 3-step public registration via `/academy` → `/academy/register` with Malaysian local phone (`012-345 6789`) → real HTTP `201`.
5. Parent receives non-reserving `KAR-...` receipt (`reservesPlace: false`).
6. Admin locates registration via authoritative session filter and Malaysian local phone `POST /search` (HTTP `200`, HMAC blind index) and opens detail drawer.
7. Admin confirms registration (`RECEIVED → CONFIRMED`).
8. Authoritative confirmed seat count updates to `1 / 1 confirmed` (`0 remaining`).
9. Capacity enforcement rejects over-confirmation (`CAPACITY_EXCEEDED`) and new public submission (`409 SESSION_FULL`).
10. Terminal session closure (`POST .../close`) blocks new submissions (`409 SESSION_NOT_AVAILABLE`).
11. Identical retry with original `Idempotency-Key` returns HTTP `200` with original receipt even after session closure.
12. Retiring current policy `SYNTHETIC-V1` immediately closes public registration (`registrationOpen: false`).
