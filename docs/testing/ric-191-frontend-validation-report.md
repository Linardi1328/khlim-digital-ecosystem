# RIC-191 — KHLIM Academy Registration V1 Frontend Validation Report

- **Linear Issue:** https://linear.app/rbl-productions/issue/RIC-191 (Parent: RIC-189)
- **Repository:** `Linardi1328/khlim-digital-ecosystem`
- **Pull Request:** [#127](https://github.com/Linardi1328/khlim-digital-ecosystem/pull/127) (**Draft** — not merge or deployment authorized)
- **Frontend Branch:** `antigravity/ric-191-academy-registration-v1-20261125`
- **Stacked Base Branch (PR #125 / RIC-184):** `antigravity/ric-184-academy-parity-qa-20261124` (`4869d996d27144271c04bf2417244a9b6b568d08`)
- **Verified Backend Dependency (PR #126 / RIC-190):** `codex/ric-190-academy-registration-v1-20261124` (`34ad43313f908f956ac55fd145676488e7379258`)

---

## 1. Delivered Scope (Frontend-Only)

1. **Public Customer Registration Journey (`apps/web`)**:
   - `/academy` live published sessions section (`PublishedRegistrationSessions`) with closed, empty, and outage + retry states.
   - `/academy/register` 3-step registration flow (`AcademyRegistrationFlow`): Player & Session (date-only DOB, MYT eligibility guidance) → Guardian & Emergency Contact (Malaysian phone validation) → Explicit Unchecked Consents (fail-closed `academy-consent-registry.ts`, `APPROVED_CONSENT_WORDING_REGISTRY` intentionally empty) → Non-reserving inline `KAR-...` receipt (`reservesPlace: false`).
   - Idempotent retry (`Idempotency-Key` preserved across retries, accepts HTTP `201` & HTTP `200` replay, double-submit protection, `Retry-After` handling on `429`/`503`, zero PII in URLs/storage, EN / MS / ZH-Hans localization).
2. **Admin Registrations Queue & Authoritative Session Filter (`apps/admin/app/registrations/page.tsx`)**:
   - Session filter populated from `GET /v1/admin/academy/registration-sessions` (independent of current page, with loading/empty/error + inline Retry states).
   - Body-only `POST /v1/admin/academy/registrations/search` (HTTP `200`) supporting Malaysian local phone (`012-...`) and E.164 (`+6012...`) blind-index search.
   - Audited detail drawer (`GET /v1/admin/academy/registrations/:id`) and explicit status transition workflow (`PATCH .../status`, excluding `"RECEIVED"`, `expectedVersion`, mandatory reason codes for `REJECTED`/`CANCELLED`, terminal state lock, retryable `503 REGISTRATION_PERSISTENCE_FAILED` with `Retry-After` guidance, and `409 SESSION_NOT_AVAILABLE` refresh).
3. **Functional Admin Training Sessions (`apps/admin/components/registrations/admin-training-sessions-tab.tsx`)**:
   - Session list with programme & age eligibility rule, venue & coach, MYT + ISO weekday schedule, first session date, recurrence, server-authoritative confirmed/remaining/queue seat counts, and `DRAFT` / `PUBLISHED` / `CLOSED` badges.
   - Incomplete draft creation/editing using authoritative `/admin/operations-data/programmes` & `/venues` selectors (`null`-preserving, `PUBLISHED_EDITABLE` restrictions, `expectedVersion`).
   - Explicit Publish modal requiring both unchecked `scheduleApproved` and `ageRuleApproved` acknowledgements, plus explicit terminal Close modal.
4. **Functional Admin Consent Policies (`apps/admin/components/registrations/admin-consent-policies-tab.tsx`)**:
   - Consumes `{ current, items }` from `GET /v1/admin/academy/registration-policies`, displaying the current approved policy separately (or closed-registration notice when `current: null`) alongside the newest-50 history table.
   - Draft creation validating policy version plus 4 categories × 3 locales (`en`, `ms`, `zh-Hans`) `ref` and 64-char lowercase hex `sha256` without fabricating legal wording.
   - `SUPER_ADMIN` / `MANAGEMENT`-only Approve & Retire workflows with explicit confirmation dialogs (replacement auto-retirement warning on approve; immediate registration closure warning on retire). `ACADEMY_ADMIN` sees a read-only notice and zero approve/retire controls.

---

## 2. Asynchronous Authentication-Context Isolation (Privacy Hardening)

- **Deterministic Auth-Context Fingerprint** (`buildAdminAuthContextKey` in `apps/admin/lib/registration-admin-rules.ts`): captures `userId`, optional `organizationId` (supported in `AdminUser` / `AdminSession` in `apps/admin/lib/types.ts` and `apps/admin/lib/auth-context.tsx`), `role`, `isAuthenticated`, `mfaSatisfied`, `isDemoMode`, and `isEligible`.
- **Monotonic Generation Guards (`authGenerationRef` + `isMountedRef`)**: applied across every async read, mutation, follow-up detail read (`STALE_VERSION` / `INVALID_TRANSITION` / `SESSION_NOT_AVAILABLE`), `catch`, and `finally` handler in:
  - `apps/admin/app/registrations/page.tsx`
  - `apps/admin/components/registrations/admin-training-sessions-tab.tsx`
  - `apps/admin/components/registrations/admin-consent-policies-tab.tsx`
- **HTTP 401/403 Cleanup**: immediately bumps `authGenerationRef`, aborts in-flight read controllers, cancels debounce timers, clears all sensitive data and pending UI state (including resetting `<SearchInput key={searchResetKey} />` so un-flushed debounced local search text cannot survive or re-emit after a 401/403).
- **Deterministic Regression Proof** (`tests/e2e/ric-191-admin-registrations.spec.mjs`):
  1. Delays an in-flight `PATCH .../registrations/:id/status` response, switches auth context while the modal/drawer is open, releases the stale HTTP 200 response → verifies old player name, `KAR-OLDORG01`, success banner, detail drawer, and stale refreshes never reappear.
  2. Delays a follow-up `GET .../registrations/:id` after `409 STALE_VERSION`, switches auth context, releases the stale detail → verifies zero stale PII reappearance.
  3. Delays a Training Session `POST .../close` mutation and a Consent Policy `POST .../retire` mutation across auth-context switches → verifies stale session/policy banners and records never leak.
  4. Enters a sensitive phone number in `<SearchInput>`, triggers a `401` before debounce flush → verifies `input[type="search"]` immediately resets to `""` and all sensitive records clear.

---

## 3. Contract Reconciliation Against PR #126 (`34ad43313f908f956ac55fd145676488e7379258`)

- **Strict TypeScript Schema Parity**: verified via `tsc --noEmit --strict` in an isolated temporary integration worktree that **19/19 DTOs** in `packages/api-client/src/academy-registration-v1.ts` are strictly assignable against PR #126's generated `packages/api-client/src/schema.d.ts` (zero drift).
- **`34ad433` Behavioral Parity**:
  - Nullable `current: AdminRegistrationPolicyDto | null` and consistent `{ current, items }` snapshot handling.
  - Replacement approval dialog explicitly warns that approving replaces and retires the active policy (backed by backend `ACADEMY_REGISTRATION_POLICY_RETIRED` audit event).
  - HTTP `200` Admin `POST /search` and HTTP `200` identical public `Idempotency-Key` replay.
  - True-only `PublishApprovalsDto` (`scheduleApproved: true; ageRuleApproved: true`).
  - Retryable HTTP `503 REGISTRATION_PERSISTENCE_FAILED` with `Retry-After` guidance (`ApiError.retryAfterSeconds`) and `409 SESSION_NOT_AVAILABLE` refresh.
- **Post-Merge Swap Plan**: PR #127 remains cleanly stacked on PR #125 with zero backend/Prisma/OpenAPI edits. Once PR #125 and PR #126 merge to `main`, rebase PR #127 onto `main` and replace the temporary interfaces in `packages/api-client/src/academy-registration-v1.ts` with direct `components["schemas"][...]` aliases from `schema.d.ts`.

---

## 4. Verification Summary (Mocked vs. Real PostgreSQL Integrated)

### A. Static Checks, Builds & Unit Tests (Frontend Worktree)
- `pnpm format:check` — **PASS**
- `pnpm i18n:audit` — **PASS** (0 hard-coded user-facing strings)
- `pnpm lint` — **PASS**
- `pnpm typecheck` — **PASS**
- `pnpm openapi:check` — **PASS**
- `pnpm test` — **PASS (446 passed, 0 failed, 0 skipped)**
- `pnpm build` (`@khlim/web`, `@khlim/admin`, `@khlim/api`) — **PASS (3/3)**
- Secret scanning & prohibited-path diff check — **PASS** (0 backend, Prisma, RLS, workflow, or `vercel.json` changes)

### B. Mocked Browser Playwright Suites (Production Builds)
- `tests/e2e/ric-191-public-registration.spec.mjs` (`chromium-desktop`): **5 passed, 0 failed, 0 skipped**
- `tests/e2e/ric-184-academy-parity-qa.spec.mjs` (`chromium-desktop`): **5 passed, 0 failed, 0 skipped**
- `tests/e2e/ric-191-admin-registrations.spec.mjs` (`admin-desktop` + `admin-mobile`): **10 passed, 0 failed, 0 skipped** (includes delayed-mutation auth-context isolation tests + 7-viewport overflow checks `360–1440px`)
- `tests/e2e/admin-ui.spec.mjs` (`admin-desktop`): **29 passed, 0 failed, 1 intentional mobile-only skip** (`mobile drawer navigation opens and reaches programmes`; 1 retry on pre-existing `/payments` work-view switch)

### C. Reproducible Local PostgreSQL 16 + Real PR #126 NestJS API Integrated Acceptance
Repository-owned harness: [`tests/integration/ric-191-integrated-acceptance.mjs`](../../tests/integration/ric-191-integrated-acceptance.mjs)
Full procedure & real-vs-simulated auth documentation: [`docs/implementation/ric-191-integrated-acceptance-procedure.md`](../implementation/ric-191-integrated-acceptance-procedure.md)

- **Fail-closed safety checks verified**: refuses unset `KHLIM_TEST_DATABASE=1`, refuses non-local DB hosts, refuses DB names without `test`.
- **12/12 steps PASSED** against disposable Docker `postgres:16-alpine` (all 18 Prisma migrations deployed) + real PR #126 NestJS `AppModule` (`34ad433`) + built `@khlim/web` & `@khlim/admin` (automatically torn down on exit):
  1. `SUPER_ADMIN` creates `SYNTHETIC-V1` consent policy draft via Admin UI → PostgreSQL.
  2. `SUPER_ADMIN` approves `SYNTHETIC-V1` (real API RBAC returns HTTP `403` for `ACADEMY_ADMIN`).
  3. Staff creates & publishes synthetic training session (`capacity = 1`) with unchecked approvals.
  4. Parent submits 3-step public registration via `/academy` → `/academy/register` with Malaysian local phone (`012-345 6789`) → real HTTP `201` (`KAR-CKBDPEJW`).
  5. Parent receives non-reserving receipt (`reservesPlace: false`).
  6. Admin locates `KAR-CKBDPEJW` via authoritative session filter & Malaysian local phone `POST /search` (HTTP `200`, HMAC blind index) and opens detail drawer.
  7. Admin confirms `KAR-CKBDPEJW` (`RECEIVED → CONFIRMED`).
  8. Confirmed seat count updates authoritatively to `1 / 1 confirmed` (`0 remaining`).
  9. Confirming a 2nd `RECEIVED` registration (`KAR-79Q44RSA`) fails (`CAPACITY_EXCEEDED`), and new public submit fails (`409 SESSION_FULL`).
  10. Terminal session closure blocks new submissions (`409 SESSION_NOT_AVAILABLE`).
  11. Identical retry with original `Idempotency-Key` returns HTTP `200` with `KAR-CKBDPEJW` even after session closure.
  12. Retiring current policy `SYNTHETIC-V1` immediately closes public registration (`registrationOpen: false`).

---

## 5. Sanitized Visual Evidence (24 Screenshots)

All 24 sanitized screenshots (`01`–`24`, zero real PII, all visually inspected) are included in the Antigravity owner review artifact package (not committed as 7.9 MB of binaries into git history) and can be deterministically regenerated locally in seconds:

- `01`–`09`, `13`–`14`: Public `/academy` published sessions (desktop & mobile), 3-step `/academy/register` flow, non-reserving receipt, closed state, validation/full errors, and mobile Bahasa Melayu & Simplified Chinese flows (`RIC191_SCREENSHOT_DIR=./ric191-screenshots PLAYWRIGHT_BASE_URL=http://127.0.0.1:3191 pnpm exec playwright test -c playwright.preview.config.mjs tests/e2e/ric-191-public-registration.spec.mjs --project=chromium-desktop`).
- `10`–`12`, `15`–`24`: Admin Registrations queue, audited detail drawer, status confirmation dialog, Training Sessions (empty, draft form, publish approval dialog, published list, terminal close dialog), and Consent Policies (no-current-policy warning, 4×3 draft form, active approved policy & history, approve-replacement dialog, retire-current-policy dialog) (`RIC191_SCREENSHOT_DIR=./ric191-screenshots PLAYWRIGHT_ADMIN_BASE_URL=http://127.0.0.1:3192 pnpm exec playwright test -c playwright.admin.config.mjs tests/e2e/ric-191-admin-registrations.spec.mjs --project=admin-desktop`).

---

## 6. Remaining Merge Dependencies & Production Release Gates

1. **Merge Dependencies**: Merge PR #125 (`RIC-184`) and PR #126 (`RIC-190`) to `main`, then rebase PR #127 onto `main`, swap temporary DTO interfaces to direct `schema.d.ts` aliases, and re-run full validation on the combined revision.
2. **Owner Legal Sign-Off**: Formally approve EN / MS / ZH-Hans wording for all 4 consent categories, register approved refs & SHA-256 hashes in `APPROVED_CONSENT_WORDING_REGISTRY` (`apps/web/lib/academy-consent-registry.ts`), and approve the production policy via AAL2 `SUPER_ADMIN`/`MANAGEMENT`.
3. **Operational & Hosted Staging Readiness**: Finalize authoritative venues, coaches, recurring MYT schedules, capacity, and age rules; provision hosted `KHLIM_REGISTRATION_HMAC_KEYS`; apply migrations; verify AAL2 staff accounts; and complete Esther's integrated owner review (target: Dec 15, 2026).
