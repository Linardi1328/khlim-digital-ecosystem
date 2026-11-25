# RIC-191 — KHLIM Academy Registration V1 Frontend Validation & Integration Report

- **Linear Issue:** https://linear.app/rbl-productions/issue/RIC-191 (Parent: RIC-189)
- **Repository:** `Linardi1328/khlim-digital-ecosystem`
- **Pull Request:** [#127](https://github.com/Linardi1328/khlim-digital-ecosystem/pull/127) (**Draft** — not merge, deploy, migration, or activation authorized)
- **Frontend Branch:** `antigravity/ric-191-academy-registration-v1-20261125`
- **Reconciled Approved Base (`origin/main`):** `da0c9d72912bcd6a3ab238cdfbb122a21434d3c2`
  - Includes **RIC-190 / PR #126** squash merge (`c8df69a6e977aa6f83dc952122defdf593b91d6a`) with both frozen migrations (`20261125000000_academy_registration_v1` and `20261126000000_academy_registration_lock_corrections`).
  - Includes **RIC-184 / PR #125** squash merge (`da0c9d72912bcd6a3ab238cdfbb122a21434d3c2`), preserving all accepted responsive fixes, PR #118/#119 outage recovery changes, and youth-media fail-closed behavior.
- **Pending Combined Integration Dependency:** PR #129 (`codex/v1-media-privacy-deferred-gates-20261126`, currently `OPEN` at `91cc15e4d74f945935d5cb29573c928493ce18b8`). Client-side HTTP `403` `FEATURE_NOT_AVAILABLE` deferred-feature handling is already implemented and tested; final combined acceptance will be re-run once PR #129 is independently reviewed and merged.

---

## 1. Visual Review & Security Remediation Disposition (`V01`–`V09`, `T01`, `T02`)

| ID | Category | Finding Summary | Disposition & Verification |
| :--- | :--- | :--- | :--- |
| **V01** | P1 Public | Contradictory static RIC-184 pending-booking / registration-not-open messaging alongside live RIC-190 sessions on `/academy` | **Fixed.** Lifted server-authoritative availability state (`loading \| error \| deferred \| closed \| empty \| open`) into `apps/web/app/academy/page.tsx`. When open, `Register Now` is primary in Hero & Final CTA, authoritative published session cards render first, contradictory pending-booking cards are hidden, `What Happens Next` adapts to live V1 registration, and `Register Interest` remains clearly secondary. Distinct honest closed/empty/error/deferred states remain preserved when not open. |
| **V02** | P2 Public Mobile | 405px horizontal overflow on the 390px receipt capture caused by non-wrapping receipt badge | **Fixed.** Added `.registration-receipt-badge` (`white-space: normal; text-align: center; max-width: 100%`). Verified `scrollWidth === clientWidth === 390` at 390px and `<= 2px` overflow across all 7 viewports (`360–1440px`) in `en`, `ms`, and `zh-Hans`. |
| **V03** | P2 Public Mobile | Squeezed two-column `<dl>` metadata on Receipt, Step 3 Review, and published session cards at narrow widths | **Fixed.** Added responsive `.registration-meta-dl`, `.registration-review-dl`, and `.registration-session-dl` stacking rules (`@media (max-width: 560px)`). |
| **V04** | P2 Public Mobile | Competing gold `Register Interest` header CTA & quick-action bar during active `/academy/register` flow | **Fixed.** `PublicHeader` detects `/academy/register` and removes the competing gold `Register Interest` button from desktop actions and the mobile quick-actions bar (demoting the mobile sheet menu item to `outline`), while preserving navigation, locale switching, and campaign attribution. |
| **V05** | P2 Public Mobile | Mobile progress indicator alignment, primary CTA prominence, and excessive vertical spacing on `/academy/register` | **Fixed.** Improved `StepIndicator` connector alignment (`calc(100% / (steps.length * 2))`), `aria-current="step"`, compact mobile padding (`.registration-main`, `.registration-card-body`), and full-width mobile primary actions stacked above `Back` (`.registration-step-actions`). |
| **V06** | P2 Admin Mobile | Right-hand `Consent Policies` tab clipped/hidden off-screen on 360px–390px mobile viewports | **Fixed.** Added responsive `.admin-tabs` wrapping pill styles at `<= 640px` in `Tabs.tsx` and `apps/admin/app/globals.css`. Verified bounding boxes of all 3 tabs stay fully inside `360px` and `390px` viewports. |
| **V07** | P2 Admin Mobile | Narrow-screen squeezing in Registration Detail, Session Editor, and Consent Policy Create drawers (including long `ref` / 64-char SHA-256 inputs) | **Fixed.** Updated `Drawer.tsx` (`100dvh`, responsive padding, 40×40 accessible close button), added `.admin-detail-grid`, `.admin-form-grid-venue-capacity`, `.admin-policy-ref-grid` (stacking `ref` over `sha256` at `<= 720px`), `minWidth: 0` on `<fieldset>`, wider weekday/time breakpoints, and full-width `.admin-drawer-actions`. Exact `ref` and `sha256` values preserved untouched. |
| **V08** | P2 Admin Usability | Raw uppercase API enum strings (`MALE`, `YM`, `MOTHER`, `GRANDPARENT`, `GUARDIAN_AUTHORITY`, `UNDER_REVIEW`, etc.) shown directly in Admin UI | **Fixed.** Added pure display-label formatters in `apps/admin/lib/registration-admin-rules.ts` (`formatPlayerGender`, `formatJerseySize`, `formatRelationshipLabel`, `formatConsentTypeLabel`, `formatLocaleLabel`, `formatRegistrationStatusLabel`, `formatPublicationStateLabel`, `formatPolicyStatusLabel`) while keeping API requests/payloads strictly on exact schema enums. |
| **V09** | P2 Admin Usability | Missing/null `ageAtReference` rendered dangling `" yrs"` or `"(Age  at ref)"` | **Fixed.** Added `formatAgeAtReference` (returns `"—"` for null/undefined/NaN/negative) and `formatDobWithAge` (omits age suffix when missing), covered by unit & Playwright regression tests. |
| **T01** | P1 Admin Auth | Parent-component refetch loophole in `apps/admin/app/registrations/page.tsx` where `fetchRegistrations()` cleared `authErrorKind` and allowed tab switches/filter/pagination actions to refetch after `401`/`403` | **Fixed.** Blocked `fetchRegistrations`, `fetchAuthoritativeSessionFilter`, `loadRegistrationDetail`, `handleConfirmStatusUpdate`, and search debounce whenever `authInvalidatedRef.current` is true; removed `setAuthErrorKind(null)` from `fetchRegistrations()`; unmounted `<FilterBar>`, `<DataTable>`, and `<Pagination>` while invalidated; restricted recovery strictly to explicit `auth-recovery-btn` (`Sign In Again` via `logout()` on `401`, `Re-verify Access` via `refreshSession()` on `403`) or genuine `authContextKey` rotation. |
| **T02** | Integration / Contract | Replace temporary DTO interfaces with direct generated OpenAPI schema aliases and verify against both frozen RIC-190 migrations + PR #129 `FEATURE_NOT_AVAILABLE` gate | **Fixed.** Rebased cleanly onto approved `main` (`da0c9d72`), replaced all 31 temporary DTO interfaces in `packages/api-client/src/academy-registration-v1.ts` with direct `components["schemas"][...]` aliases from `./schema`, added distinct HTTP `403 FEATURE_NOT_AVAILABLE` deferred-feature handling (zero auto-retries, preserving global `403` auth invalidation for all other `403` responses), and verified 12/12 real PostgreSQL acceptance steps against both frozen migrations. |

---

## 2. Verification Summary (Reconciled on `da0c9d72`)

### A. Static Checks, Direct Schema Typechecks & Unit Tests
- `pnpm format:check` — **PASS**
- `pnpm i18n:audit` — **PASS** (0 hard-coded user-facing strings across EN/MS/ZH-Hans)
- `pnpm lint` — **PASS**
- `pnpm prisma:generate` — **PASS**
- Uncached `tsc --noEmit` (`@khlim/api-client`, `@khlim/web`, `@khlim/admin`, `@khlim/api`) — **PASS (0 errors)** against direct `schema.d.ts` aliases
- `pnpm openapi:check` — **PASS**
- `pnpm test` — **PASS (`451 passed, 0 failed, 0 skipped`)**
- `pnpm build` (`@khlim/api`, `@khlim/admin`, `@khlim/web`) — **PASS (`3/3`)**
- Prohibited-path & secret scan check — **PASS** (0 edits to `apps/api`, `prisma`, `supabase`, `.github`, `openapi`, `schema.d.ts`, `vercel.json`, or youth media assets)

### B. GitHub-Equivalent Playwright Browser Suites (Production Builds)
- `tests/e2e/ric-191-public-registration.spec.mjs` (`desktop`, `tablet`, `mobile` projects): **15 passed, 0 failed, 0 skipped** — covers open `/academy` CTA hierarchy & contradiction removal, closed/empty/outage states, 3-step flow, non-reserving receipt, idempotent `200` replay, consent reset on locale switch, header CTA suppression on `/academy/register`, and 7-viewport (`360–1440px`) zero-overflow checks including Receipt in `en`, `ms`, `zh-Hans`.
- `tests/e2e/ric-184-academy-parity-qa.spec.mjs` (`desktop`, `tablet`, `mobile`): **24 passed, 0 failed, 0 skipped** — confirms 100% preservation of RIC-184 parity & responsive fixes.
- `tests/e2e/web-preview.spec.mjs` (`desktop`, `tablet`, `mobile`): **119 passed, 0 failed, 4 skipped** (existing viewport-conditional skips).
- `tests/e2e/ric-191-admin-registrations.spec.mjs` (`admin-desktop`, `admin-tablet`, `admin-mobile`): **24 passed, 0 failed, 0 skipped** — covers authoritative session filter, POST search (`200`), detail & status transitions, Sessions & Consent Policies CRUD/publish/approve/retire, delayed-mutation auth-context isolation, cross-component concurrent `401`/`403` invalidation, post-`401`/`403` tab-switch zero-refetch regression, PR #129 `403 FEATURE_NOT_AVAILABLE` non-retrying deferred state, discoverable mobile tabs, readable display labels, safe missing age (`—`), and 7-viewport drawer responsiveness (`360–1440px`).
- `tests/e2e/admin-ui.spec.mjs` (`admin-desktop`): **29 passed (28 first-pass + 1 retry pass), 0 failed, 1 intentional mobile-only skip**.

### C. Fresh Disposable PostgreSQL 16 + Real NestJS + Web + Admin Integrated Acceptance
Repository-owned harness: [`tests/integration/ric-191-integrated-acceptance.mjs`](../../tests/integration/ric-191-integrated-acceptance.mjs)

- **Fresh Disposable DB & Frozen Migrations:** Ephemeral `docker run --rm ... postgres:16-alpine` container deployed all **19** Prisma migrations, explicitly verified both frozen RIC-190 migrations applied (`20261125000000_academy_registration_v1` and `20261126000000_academy_registration_lock_corrections`), enforced fail-closed non-empty DB guard with zero `TRUNCATE`, and tore down cleanly via `trap cleanup EXIT`.
- **12/12 Integrated Acceptance Steps PASSED** (real PostgreSQL + real NestJS `AppModule` + built `@khlim/web` & `@khlim/admin`):
  1. `SUPER_ADMIN` creates `SYNTHETIC-V1` consent policy draft in PostgreSQL.
  2. `SUPER_ADMIN` approves `SYNTHETIC-V1` (verified real API HTTP `403` for `ACADEMY_ADMIN`).
  3. Staff creates & publishes synthetic training session (`capacity = 1`) with initially unchecked approvals.
  4. Parent submits public registration via `/academy` → `/academy/register` → real HTTP `201` (`KAR-4CATQ43N`).
  5. Parent receives non-reserving receipt (`reservesPlace: false`).
  6. Admin locates `KAR-4CATQ43N` via authoritative session filter & Malaysian local phone `POST /search` (HTTP `200`, HMAC blind index).
  7. Admin confirms `KAR-4CATQ43N` (`RECEIVED → CONFIRMED`).
  8. Confirmed seat count updates authoritatively to `1 / 1 confirmed` (`0 remaining`).
  9. Capacity enforcement blocks confirming a 2nd registration (`CAPACITY_EXCEEDED`) and rejects new public submission (`409 SESSION_FULL`).
  10. Terminal session closure rejects new submission (`409 SESSION_NOT_AVAILABLE`).
  11. Identical `Idempotency-Key` replay returns HTTP `200` (`KAR-4CATQ43N`) even after closure.
  12. Retiring current policy `SYNTHETIC-V1` immediately closes public registration (`registrationOpen: false`).

---

## 3. Remaining Production Release Gates (Not Cleared Here)

1. **PR #129 Combined Acceptance:** Once PR #129 (`codex/v1-media-privacy-deferred-gates-20261126`) is reviewed and merged to `main`, re-reconcile PR #127 onto updated `main` (preserving removed youth photos and empty `APPROVED_YOUTH_MEDIA`) and run final combined acceptance.
2. **Owner Legal Consent Sign-Off:** Formally approve EN / MS / ZH-Hans legal wording for all 4 consent categories, register approved refs & SHA-256 digests in `APPROVED_CONSENT_WORDING_REGISTRY` (currently intentionally empty), and approve the production policy via AAL2 `SUPER_ADMIN`/`MANAGEMENT`.
3. **Business Disclosure & Youth Media Rights:** Complete corporate business disclosure details (currently honestly gated in footer) and keep youth-media publication gated behind documented guardian consent.
4. **Infrastructure & Security Gates:** Configure C29 trusted proxy headers in hosted environments, verify hosted AAL2 MFA enforcement for staff accounts, provision hosted `KHLIM_REGISTRATION_HMAC_KEYS`, and apply frozen migrations only under explicit deployment authorization.
5. **Operational Schedule Approval & Owner Review:** Finalize authoritative Academy venues, coaches, MYT schedules, capacities, and age rules, and complete Esther's integrated owner review (target: Dec 15, 2026).
