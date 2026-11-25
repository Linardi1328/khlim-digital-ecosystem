# RIC-191 — KHLIM Academy Registration V1 Frontend Validation & Integration Report

- **Linear Issue:** https://linear.app/rbl-productions/issue/RIC-191 (Parent: RIC-189)
- **Repository:** `Linardi1328/khlim-digital-ecosystem`
- **Pull Request:** [#127](https://github.com/Linardi1328/khlim-digital-ecosystem/pull/127) (**Draft** — not merge, deploy, migration, or activation authorized)
- **Frontend Branch:** `antigravity/ric-191-academy-registration-v1-20261125`
- **Reconciled Approved Base (`origin/main`):** `3470201cedd59c47c445538ab6a75f0acd03b38f`
  - Includes **RIC-190 / PR #126** squash merge (`c8df69a6e977aa6f83dc952122defdf593b91d6a`) with both frozen migrations (`20261125000000_academy_registration_v1` and `20261126000000_academy_registration_lock_corrections`).
  - Includes **RIC-184 / PR #125** squash merge (`da0c9d72912bcd6a3ab238cdfbb122a21434d3c2`), preserving all accepted responsive fixes, PR #118/#119 outage recovery changes, and youth-media fail-closed behavior.
  - Includes **Media Privacy & Deferred API Gates / PR #129** squash merge (`3470201cedd59c47c445538ab6a75f0acd03b38f`), preserving all 33 removed youth/unverified media assets, empty `APPROVED_YOUTH_MEDIA`, SHA-256 allowlist (`tests/public-media-allowlist.test.mjs`), server-authoritative HTTP `403 FEATURE_NOT_AVAILABLE` gates (`@RequireLaunchedFeature`), and direct HTTP asset takedown regression tests.

---

## 1. Visual Review, Security & Combined Acceptance Disposition (`V01`–`V09`, `T01`, `T02`, `I01`, `I02`)

| ID | Category | Finding Summary | Disposition & Verification |
| :--- | :--- | :--- | :--- |
| **V01** | P1 Public | Contradictory static RIC-184 pending-booking / registration-not-open messaging alongside live RIC-190 sessions on `/academy` | **Fixed.** Lifted server-authoritative availability state (`loading \| error \| deferred \| closed \| empty \| open`) into `apps/web/app/academy/page.tsx`. When open, `Register Now` is primary in Hero & Final CTA, authoritative published session cards render first, contradictory pending-booking cards are hidden, `What Happens Next` adapts to live V1 registration, and `Register Interest` remains clearly secondary. Distinct honest closed/empty/error/deferred states remain preserved when not open. Youth-media privacy fallback (`academy-training-fallback`) renders cleanly with zero broken image requests. |
| **V02** | P2 Public Mobile | 405px horizontal overflow on the 390px receipt capture caused by non-wrapping receipt badge | **Fixed.** Added `.registration-receipt-badge` (`white-space: normal; text-align: center; max-width: 100%`). Verified `scrollWidth === clientWidth === 390` at 390px and `<= 2px` overflow across all 7 viewports (`360–1440px`) in `en`, `ms`, and `zh-Hans`. |
| **V03** | P2 Public Mobile | Squeezed two-column `<dl>` metadata on Receipt, Step 3 Review, and published session cards at narrow widths | **Fixed.** Added responsive `.registration-meta-dl`, `.registration-review-dl`, and `.registration-session-dl` stacking rules (`@media (max-width: 560px)`). |
| **V04** | P2 Public Mobile | Competing gold `Register Interest` header CTA & quick-action bar during active `/academy/register` flow | **Fixed.** `PublicHeader` detects `/academy/register` and removes the competing gold `Register Interest` button from desktop actions and the mobile quick-actions bar (demoting the mobile sheet menu item to `outline`), while preserving navigation, locale switching, and campaign attribution. |
| **V05** | P2 Public Mobile | Mobile progress indicator alignment, primary CTA prominence, and excessive vertical spacing on `/academy/register` | **Fixed.** Improved `StepIndicator` connector alignment (`calc(100% / (steps.length * 2))`), `aria-current="step"`, compact mobile padding (`.registration-main`, `.registration-card-body`), and full-width mobile primary actions stacked above `Back` (`.registration-step-actions`). |
| **V06** | P2 Admin Mobile | Right-hand `Consent Policies` tab clipped/hidden off-screen on 360px–390px mobile viewports | **Fixed.** Added responsive `.admin-tabs` wrapping pill styles at `<= 640px` in `Tabs.tsx` and `apps/admin/app/globals.css`. Verified bounding boxes of all 3 tabs stay fully inside `360px` and `390px` viewports. |
| **V07** | P2 Admin Mobile | Narrow-screen squeezing in Registration Detail, Session Editor, and Consent Policy Create drawers (including long `ref` / 64-char SHA-256 inputs) | **Fixed.** Updated `Drawer.tsx` (`100dvh`, responsive padding, 40×40 accessible close button), added `.admin-detail-grid`, `.admin-form-grid-venue-capacity`, `.admin-policy-ref-grid` (stacking `ref` over `sha256` at `<= 720px`), `minWidth: 0` on `<fieldset>`, wider weekday/time breakpoints, and full-width `.admin-drawer-actions`. Exact `ref` and `sha256` values preserved untouched. |
| **V08** | P2 Admin Usability | Raw uppercase API enum strings (`MALE`, `YM`, `MOTHER`, `GRANDPARENT`, `GUARDIAN_AUTHORITY`, `UNDER_REVIEW`, etc.) shown directly in Admin UI | **Fixed.** Added pure display-label formatters in `apps/admin/lib/registration-admin-rules.ts` (`formatPlayerGender`, `formatJerseySize`, `formatRelationshipLabel`, `formatConsentTypeLabel`, `formatLocaleLabel`, `formatRegistrationStatusLabel`, `formatPublicationStateLabel`, `formatPolicyStatusLabel`) while keeping API requests/payloads strictly on exact schema enums. |
| **V09** | P2 Admin Usability | Missing/null `ageAtReference` rendered dangling `" yrs"` or `"(Age  at ref)"` | **Fixed.** Added `formatAgeAtReference` (returns `"—"` for null/undefined/NaN/negative) and `formatDobWithAge` (omits age suffix when missing), covered by unit & Playwright regression tests. |
| **T01** | P1 Admin Auth | Parent-component refetch loophole in `apps/admin/app/registrations/page.tsx` where `fetchRegistrations()` cleared `authErrorKind` and allowed tab switches/filter/pagination actions to refetch after `401`/`403` | **Fixed.** Blocked `fetchRegistrations`, `fetchAuthoritativeSessionFilter`, `loadRegistrationDetail`, `handleConfirmStatusUpdate`, and search debounce whenever `authInvalidatedRef.current` is true; removed `setAuthErrorKind(null)` from `fetchRegistrations()`; unmounted `<FilterBar>`, `<DataTable>`, and `<Pagination>` while invalidated; restricted recovery strictly to explicit `auth-recovery-btn` (`Sign In Again` via `logout()` on `401`, `Re-verify Access` via `refreshSession()` on `403`) or genuine `authContextKey` rotation. |
| **T02** | Integration / Contract | Replace temporary DTO interfaces with direct generated OpenAPI schema aliases and verify against both frozen RIC-190 migrations | **Fixed.** Replaced all 31 temporary DTO interfaces in `packages/api-client/src/academy-registration-v1.ts` with direct `components["schemas"][...]` aliases from `./schema`, exported `isFeatureNotAvailableError()`, and verified 12/12 real PostgreSQL acceptance steps against both frozen migrations. |
| **I01** | Runbook / Hygiene | Replace obsolete pre-PR-#126 detached-worktree acceptance runbook with the current combined revision | **Fixed.** Rewrote [`docs/implementation/ric-191-integrated-acceptance-procedure.md`](../implementation/ric-191-integrated-acceptance-procedure.md) for the combined revision using unique `RUN_ID`-scoped disposable `khlim-${RUN_ID}-pg` container, ephemeral loopback port (`127.0.0.1:0:5432`), bounded 30s `pg_isready` loop, `trap cleanup EXIT`, zero `TRUNCATE`/destructive resets, and explicit ordered verification of both frozen RIC-190 migrations. |
| **I02** | Deferred Feature Consumers (PR #129) | Complete `HTTP 403 FEATURE_NOT_AVAILABLE` deferred-feature handling in actual enrolment, checkout, and parent portal consumers with zero automatic retries or recovery lookups | **Fixed.** Updated `apps/web/app/enrol/page.tsx` (short-circuits `isFeatureNotAvailableError` inside `ensurePendingMembership` **before** any `listAthleteMemberships` recovery lookup and inside `prepareCheckout` **without** redirecting to `/enrol/confirmation`), `apps/web/app/enrol/confirmation/page.tsx` (renders `<ComingSoonPanel />` with no Retry action), `apps/web/lib/family-context.tsx` (tracks `isPortalFeatureDeferred` and skips follow-up `/me/athletes` requests), `apps/web/components/portal/portal-shell.tsx`, and all 7 portal pages (`dashboard`, `membership`, `payments`, `schedule`, `notifications`, `players`, `players/[athleteId]`). Ordinary `401`/`403` authorization invalidation and T01 remain untouched. |

---

## 2. Combined Validation Summary (Reconciled on `3470201cedd59c47c445538ab6a75f0acd03b38f`)

### A. Static Checks, Direct Schema Typechecks & Unit/Security Regression Tests
- `pnpm format:check` — **PASS**
- `pnpm i18n:audit` — **PASS** (0 hard-coded user-facing strings across EN/MS/ZH-Hans)
- `pnpm lint` — **PASS**
- `pnpm prisma:generate` — **PASS**
- Uncached `tsc --noEmit` (`@khlim/api-client`, `@khlim/web`, `@khlim/admin`, `@khlim/api`) — **PASS (0 errors)** against direct `schema.d.ts` aliases
- `pnpm openapi:check` — **PASS**
- `pnpm test` — **PASS (`457 passed, 0 failed, 0 skipped`)** — includes PR #129's `tests/public-media-allowlist.test.mjs`, `tests/v1-deferred-feature-gates.test.mjs`, youth-media gallery/carousel tests, and `tests/academy-registration-v1-frontend.test.mjs` (covering I02 deferred consumer guards and T01/T02 checks).
- `pnpm build` (`@khlim/api`, `@khlim/admin`, `@khlim/web`) — **PASS (`3/3`)**
- Prohibited-path & secret scan check — **PASS** (`0` edits to `apps/api/`, `prisma/`, `supabase/`, `.github/`, `openapi/`, `packages/api-client/src/schema.d.ts`, `vercel.json`, `apps/web/public/media/`, `media/RIGHTS-MANIFEST.md`, or `apps/web/lib/editorial-content.ts`)

### B. GitHub-Equivalent Playwright Browser Suites (Production Builds)
- `tests/e2e/ric-191-public-registration.spec.mjs` (`desktop`, `tablet`, `mobile`): **15 passed, 0 failed, 0 skipped** — covers open `/academy` CTA hierarchy & contradiction removal, closed/empty/outage states, 3-step flow, non-reserving receipt, idempotent `200` replay, consent reset on locale switch, header CTA suppression on `/academy/register`, and 7-viewport (`360–1440px`) zero-overflow checks including Receipt in `en`, `ms`, `zh-Hans`.
- `tests/e2e/ric-184-academy-parity-qa.spec.mjs` (`desktop`, `tablet`, `mobile`): **27 passed, 0 failed, 0 skipped** — confirms 100% preservation of RIC-184 parity fixes AND PR #129's direct HTTP media-takedown regression checks.
- `tests/e2e/web-preview.spec.mjs` (`desktop`, `tablet`, `mobile`): **119 passed, 0 failed, 4 skipped** (existing viewport-conditional skips).
- `tests/e2e/ric-191-admin-registrations.spec.mjs` (`admin-desktop`, `admin-tablet`, `admin-mobile`): **24 passed, 0 failed, 0 skipped** — covers authoritative session filter, POST search (`200`), detail & status transitions, Sessions & Consent Policies CRUD/publish/approve/retire, delayed-mutation auth-context isolation, cross-component concurrent `401`/`403` invalidation, post-`401`/`403` tab-switch zero-refetch regression, PR #129 `403 FEATURE_NOT_AVAILABLE` non-retrying deferred state, discoverable mobile tabs, readable display labels, safe missing age (`—`), and 7-viewport drawer responsiveness (`360–1440px`).
- `tests/e2e/admin-ui.spec.mjs` (`admin-desktop`): **29 passed (28 first-pass + 1 retry pass), 0 failed, 1 intentional mobile-only skip**.

### C. Fresh Disposable PostgreSQL 16 Combined Acceptance (Zero `TRUNCATE`, Auto-Cleaned)
1. **RIC-191 Integrated Acceptance** ([`tests/integration/ric-191-integrated-acceptance.mjs`](../../tests/integration/ric-191-integrated-acceptance.mjs)):
   - Fresh uniquely named disposable container (`khlim-ric191_1795619332_32446-pg1`, database `khlim_ric191_1795619332_32446_acc_test`, ephemeral loopback port `127.0.0.1:55005`).
   - Deployed all **19** Prisma migrations cleanly and explicitly verified both frozen RIC-190 migrations in order (`20261125000000_academy_registration_v1`, `20261126000000_academy_registration_lock_corrections`).
   - **12/12 steps PASSED** (real PostgreSQL 16 + real NestJS `AppModule` + built `@khlim/web` & `@khlim/admin`):
     1. `SUPER_ADMIN` creates `SYNTHETIC-V1` consent policy draft in PostgreSQL.
     2. `SUPER_ADMIN` approves `SYNTHETIC-V1` (verified real API HTTP `403` for `ACADEMY_ADMIN`).
     3. Staff creates & publishes synthetic training session (`capacity = 1`) with initially unchecked approvals.
     4. Parent submits public registration via `/academy` → `/academy/register` → real HTTP `201` (`KAR-6980QDXX`).
     5. Parent receives non-reserving receipt (`reservesPlace: false`).
     6. Admin locates `KAR-6980QDXX` via authoritative session filter & Malaysian local phone `POST /search` (HTTP `200`, HMAC blind index).
     7. Admin confirms `KAR-6980QDXX` (`RECEIVED → CONFIRMED`).
     8. Confirmed seat count updates authoritatively to `1 / 1 confirmed` (`0 remaining`).
     9. Capacity enforcement blocks confirming a 2nd registration (`CAPACITY_EXCEEDED`) and rejects new public submission (`409 SESSION_FULL`).
     10. Terminal session closure rejects new submission (`409 SESSION_NOT_AVAILABLE`).
     11. Identical `Idempotency-Key` replay returns HTTP `200` (`KAR-6980QDXX`) even after closure.
     12. Retiring current policy `SYNTHETIC-V1` immediately closes public registration (`registrationOpen: false`).
   - Container destroyed cleanly via `trap cleanup EXIT`.
2. **PR #129 Server-Side Deferred Feature Gates DB Test** (`tests/integration/v1-deferred-feature-gates.test.mjs`):
   - Second fresh uniquely named disposable container (`khlim-ric191_1795619332_32446-pg2`, database `khlim_ric191_1795619332_32446_gates_test`, ephemeral loopback port `127.0.0.1:55006`), deploying all **19** Prisma migrations cleanly.
   - **4/4 tests PASSED (`0 failed, 0 skipped`)** proving disabled paid enrolment/checkout and parent portal routes fail closed with HTTP `403 FEATURE_NOT_AVAILABLE` and write zero rows while RIC-191 registration, `/me`, offerings, webhooks, and reconciliation remain unaffected.
   - Container destroyed cleanly via `trap cleanup EXIT`.
3. **Database Hygiene Confirmation:** No persistent or hosted database was touched at any stage; earlier and current migration checks ran strictly against freshly provisioned disposable local Docker PostgreSQL 16 containers.

---

## 3. Remaining Production Release Gates (Not Cleared Here)

1. **Independent Review & Explicit Merge Authorization:** PR #127 remains in **Draft** pending independent review of the combined revision and `KHLIM_RIC191_Visual_Review_Delta.zip`, plus explicit owner merge authorization.
2. **Owner Legal Consent Sign-Off:** Formally approve EN / MS / ZH-Hans legal wording for all 4 consent categories, register approved refs & SHA-256 digests in `APPROVED_CONSENT_WORDING_REGISTRY` (currently intentionally empty), and approve the production policy via AAL2 `SUPER_ADMIN`/`MANAGEMENT`.
3. **Hosted Media Takedown & Youth Media Rights (PR #129 Operational Actions):** Remove/restrict previous Vercel preview/production deployments serving removed youth images, purge CDN and `/_next/image` caches after fixed build deployment, restrict repository/history exposure as planned by owner, and keep `APPROVED_YOUTH_MEDIA` empty until documented guardian consent + private storage exist.
4. **Business Disclosure & Deferred Feature Flags:** Complete corporate business disclosure details (currently honestly gated in footer) and keep `KHLIM_ENABLE_V1_ENROLMENT`, `KHLIM_ENABLE_V1_PORTAL`, and matching `NEXT_PUBLIC_*` flags unset until authorized launch.
5. **Infrastructure & Security Gates:** Configure C29 trusted proxy headers in hosted environments, verify hosted AAL2 MFA enforcement for staff accounts, provision hosted `KHLIM_REGISTRATION_HMAC_KEYS`, and apply frozen migrations only under explicit deployment authorization.
6. **Operational Schedule Approval & Owner Review:** Finalize authoritative Academy venues, coaches, MYT schedules, capacities, and age rules, and complete Esther's integrated owner review (target: Dec 15, 2026).
