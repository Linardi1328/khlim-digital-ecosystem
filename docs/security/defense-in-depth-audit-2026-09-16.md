# Defense-in-depth security audit — 2026-09-16

## Scope

This review covers the KHLIM browser applications, NestJS API, Prisma schema,
production Supabase PostgreSQL posture, and hosted-payment boundary. It is a
point-in-time defensive review, not a guarantee that compromise is impossible.

## Verified strengths

- Operational application data stays behind the KHLIM API + Prisma boundary;
  browser clients use Supabase directly for Auth only.
- All 35 Prisma application tables have PostgreSQL RLS enabled and RLS is not
  forced, preserving server-side table-owner access.
- No application-table RLS policies grant direct browser Data API access.
- API authorization is global and deny-by-default; athlete access and privileged
  roles are checked server-side.
- Supabase JWT validation verifies issuer and authenticated audience.
- Payment amounts are derived from backend membership-plan records rather than
  browser-submitted prices.
- Hosted payment callbacks are signature-verified and provider event IDs are
  deduplicated. Raw payment webhook payloads are hashed rather than persisted.
- The Prisma payment schema stores provider references and limited display
  metadata only; it has no PAN or CVV fields.
- Production data checks found no invalid payment amounts/currencies/capacities
  and no cross-organization mismatches in the inspected tenant-owned relations.

## Findings addressed in this slice

### Direct Supabase Data API privileges

Production RLS protected the 35 application tables, but Supabase grants gave
`anon` and `authenticated` direct table privileges. More importantly,
`_prisma_migrations` had those grants without RLS. Default privileges for new
postgres-owned public objects also granted direct Data API roles access.

This slice enables non-forced RLS on `_prisma_migrations`, revokes direct
`anon`/`authenticated` table, sequence, and function privileges when those
Supabase roles exist, removes PUBLIC function execution, and changes postgres
public-schema default privileges so newly-created objects fail closed.

### Mutable function search paths

The two KHLIM audit trigger functions had mutable search paths. They are
SECURITY INVOKER functions, but the ambiguity was unnecessary. This slice pins
their search path to `pg_catalog, public`.

### Missing database-level financial invariants

Application services validate money and capacity values, but the database had
few CHECK constraints. This slice adds checks for positive payment amounts,
installment/schedule counts, currency shape, payment expiry ranges, membership
plan numeric bounds, and positive offering capacity. Production count-only
prechecks found no violating rows before the migration was authored.

### Browser and API response hardening

The Web and Admin Next.js applications had no explicit CSP or common browser
security headers. The API also exposed Swagger in production and advertised its
framework by default. This slice adds a restrictive baseline CSP and response
headers, disables the framework hint, prevents API responses from being cached,
and makes production Swagger opt-in via `KHLIM_API_DOCS_ENABLED=1`.

### Payment concurrency races

Two simultaneous checkout requests could both reach an external provider before
a provider payment ID was persisted. Separately, distinct successful payment
callbacks could race the capacity count for one programme offering. This slice
atomically claims initial checkout creation and row-locks the tenant-owned
offering before payment-driven membership activation. A DB-backed concurrency
test exercises both races.

## Residual risks / follow-up work

- The Web currently stores the Supabase access and refresh session in
  `localStorage`. The new CSP reduces script injection surface, but a successful
  same-origin XSS could still read those tokens. A dedicated auth-session slice
  should evaluate moving long-lived session material to Secure, HttpOnly,
  SameSite cookies through a server/BFF boundary.
- Supabase leaked-password protection was disabled at review time. Enable it in
  Supabase Auth when the project plan/settings support it, then verify signup and
  password-change behavior.
- Application rate limiting should be enforced at a shared edge/WAF layer.
  Per-instance in-memory throttling would give a false sense of protection on
  serverless deployments. Payment signatures protect integrity but do not by
  themselves prevent request-flood resource abuse.
- Several foreign keys lack dedicated supporting indexes. This is primarily a
  performance/resilience concern and should be reviewed against actual query and
  delete patterns before adding indexes.
- Tenant-owned relationships are checked by services, but many database foreign
  keys do not encode `organization_id` on both sides. Current multi-organization
  runtime remains disabled. Composite tenant integrity should be a prerequisite
  before externally enabling multi-organization runtime.

## Production rollout gate

Do not apply the new migration to production until CI is green, PPO Review,
Debrief, and Learn/Quiz gates are complete, and the owner explicitly approves
the rollout/merge. After deployment, re-run Supabase security advisors and
verify direct Data API grants, `_prisma_migrations` RLS, API DB reads/writes,
authenticated Web flows, and payment sandbox behavior.
