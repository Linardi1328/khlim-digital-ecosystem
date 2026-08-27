# KHLIM Digital Sports Ecosystem

KHLIM is building a production-oriented sports platform that starts with **KHLIM Basketball Academy** and can later connect tournaments, camps, competitive teams, private coaching, merchandise, athlete development, additional locations, future sports, and sports-technology services through one shared KHLIM account ecosystem.

The project is intentionally incremental. The objective is not to build the largest app immediately; it is to create reliable digital infrastructure for registration, recurring revenue, payments, family accounts, staff operations, and long-term athlete development without rebuilding the platform as KHLIM grows.

## Current project status

Development has now moved well beyond the original Phase 1 foundation.

| Phase | Status | What exists now |
| --- | --- | --- |
| Phase 0 — Product/architecture definition | Complete | Product direction, architecture, security principles, ADRs, website-first delivery model |
| Phase 1 — Engineering foundation | Complete | pnpm/Turborepo monorepo, Next.js, NestJS, Prisma/PostgreSQL, OpenAPI, CI, localization, observability foundations |
| Phase 2 — Identity/family/authorization | Complete foundation | Supabase JWT verification, user/guardian/athlete relationships, invitation flow, server-side authorization, MFA-aware staff controls |
| Phase 3 — Programmes/memberships | Complete foundation | Programmes, offerings, configurable plans, memberships, capacities, academy APIs and migrations |
| Phase 4 — Billing/payments | Complete provider-neutral foundation | Schedules/installments/payments, token references, webhook authority, deduplication/idempotency, payment gateway interface |
| Phase 5 — Public website/member portal | Implemented frontend/integration layer | Public website, authentication flows, enrolment, family portal, payments/membership/schedule/account surfaces, responsive browser QA |
| Phase 6 — Admin operations | Implemented UI, integration pending | Responsive operations console covering programmes, offerings, plans, memberships, families, payments, venues, scheduling, staff and audit views |
| Phase 7 — Scheduling/notifications | Next implementation work | Production scheduling rules, exceptions and transactional notification delivery still need completion |
| Phase 8 — Hardening/alpha/beta | Next major validation gate | Full integration, security, payment, recovery and real-workflow testing before external family beta |

**Important:** the Phase 6 admin console intentionally denies privileged real operations unless staff authentication/backend endpoints are connected. Demo mode is preview-only and non-persistent. Likewise, the billing layer intentionally refuses to fake production payment success when no real gateway adapter is configured.

That means the immediate development goal is **integration + pre-alpha test hardening**, not another large UI build.

## Current product direction

### Website first, Super App later

The first production customer interface is the **KHLIM public website + authenticated family/member portal**. The first operational interface is the **KHLIM Admin web application**.

The future native **KHLIM Super App** is another client of the same platform.

> **One backend. One database. One authentication system. One payment infrastructure. Multiple frontends.**

```text
                      KHLIM PLATFORM
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
   Website / Member      Admin Web          Super App
       FIRST                FIRST              LATER
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                       REST API /v1
                            │
                   NestJS Modular Monolith
                            │
     ┌──────────────────────┼────────────────────────┐
     │                      │                        │
Identity / Family     Commercial Core         Club / Athlete Ops
                      Programmes              Venues / Scheduling
                      Memberships             Teams / Attendance
                      Billing / Payments       Development
                      Entitlements            Events / Camps / 3x3
                            │
                   PostgreSQL / Providers
```

## Website MVP journey

A family should be able to complete the commercial journey without spreadsheet intervention:

```text
Discover KHLIM
→ create Guardian account
→ add/select child
→ choose Programme Offering
→ choose Membership Plan
→ review/accept terms
→ pay securely through provider-hosted/tokenized checkout
→ verified webhook updates payment state
→ Membership activates from authoritative backend state
→ view membership/payment/schedule dashboard
```

KHLIM staff should operate the resulting programmes, plans, memberships, payments, venues, schedules, capacity and family records through the Admin application rather than direct database edits.

## Core domain rules

### Guardian ↔ Athlete

Do not place one `parent_id` directly on an athlete.

```text
Guardian ──< GuardianAthleteLink >── Athlete
```

This supports multiple children and multiple authorized guardians.

### Programme ≠ Programme Offering ≠ Team

- `Programme` is the reusable Academy/service concept.
- `ProgrammeOffering` is a specific operational instance with venue, schedule, capacity and availability.
- `Team` is a competitive/team grouping with a separate lifecycle.

### Membership ≠ Payment

Membership states such as `PENDING`, `ACTIVE` and `SUSPENDED` are independent from payment/installment states such as `SCHEDULED`, `PROCESSING`, `PAID`, `FAILED` and `OVERDUE`.

A browser success redirect is never authoritative payment proof. Verified provider events drive financial state.

### Financial money ≠ KHERO points

Real billing/payment records remain separate from the later auditable KHERO/reward-point ledger.

## Payment architecture

KHLIM must never store full card numbers, CVVs or raw payment credentials.

```text
Membership / Registration / Order
             │
             ▼
        Billing Service
             │
             ▼
     PaymentGateway interface
             │
             ▼
      Selected provider
```

The implemented foundation includes provider-neutral gateway boundaries, payment schedules/installments, provider references, webhook verification hooks, provider-event deduplication, idempotency keys and server-authoritative membership activation rules.

A **real production gateway adapter is still a launch dependency**. Until one is configured, production checkout must fail closed rather than simulate success.

## Technology baseline

- TypeScript end-to-end.
- Node.js 24 LTS.
- pnpm 10.15.0 Workspaces + Turborepo.
- Next.js 16 for `apps/web` and `apps/admin`.
- NestJS modular-monolith API.
- REST `/v1` + generated OpenAPI contract/types.
- PostgreSQL hosted through Supabase.
- Prisma 7 ORM / Prisma Migrate.
- Supabase Auth and Storage direction.
- GitHub Actions for regression/build/browser validation.
- Playwright browser QA for web and admin.
- Sentry + structured logging foundations.
- Railway API hosting initially.
- Vercel web/admin hosting initially.
- Expo / React Native reserved for later mobile activation.
- Singapore-region infrastructure where supported.

## Repository layout

```text
khlim-digital-ecosystem/
├── apps/
│   ├── web/             # public website + authenticated family/member portal
│   ├── admin/           # KHLIM staff operations console
│   ├── api/             # NestJS modular monolith
│   └── mobile/          # reserved future Expo Super App client
├── packages/
│   ├── api-client/      # shared generated-contract client boundary
│   ├── design-tokens/
│   ├── i18n/
│   ├── types/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── testing/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── openapi/
├── tests/
│   └── e2e/
├── docs/
└── .github/workflows/
```

## Local validation

Install the pinned toolchain and dependencies, configure `.env` from `.env.example`, then use the repository scripts:

```bash
pnpm install --frozen-lockfile
pnpm bootstrap:verify
pnpm test
pnpm lint
pnpm format:check
pnpm typecheck
pnpm prisma:validate
pnpm openapi:check
pnpm build
```

Browser suites are configured separately for the exact web/admin applications through `playwright.preview.config.mjs` and `playwright.admin.config.mjs` and run in GitHub Actions.

## Next development move: pre-alpha integration and testing

The next milestone should be an **integration/testing sprint** with a strict priority order:

1. Connect real staff authentication and supported Admin operations to backend APIs; keep unsupported operations fail-closed.
2. Configure a real sandbox payment-provider adapter and test signed webhook, retry, duplicate-event and idempotency behavior.
3. Finish the minimum Phase 7 scheduling/notification capabilities required for a family to see trustworthy upcoming sessions and receive transactional confirmations.
4. Build realistic seed/test fixtures for guardians, multiple children, offerings, plans, memberships, payment attempts, venues and staff roles.
5. Run end-to-end test matrices across family, finance/admin and restricted staff roles—including negative authorization cases.
6. Exercise database migrations, backup/restore, logging/alerting and deployment rollback procedures in staging.
7. Only after those gates are green, begin **internal alpha**, then a closed beta with roughly 5–10 trusted families.

See `docs/testing/pre-alpha-test-plan.md` for the proposed test stage.

## Reliability and launch rule

The controlled release sequence remains:

```text
Integration / pre-alpha hardening
→ Internal alpha
→ Closed beta (~5–10 families)
→ Expanded Academy pilot (~15–30 families)
→ Feature freeze / Release Candidate
→ Limited production cohort
→ Public launch
```

Any unresolved **P0/P1 defect means NO PUBLIC LAUNCH**. P0 includes security/privacy breach, data corruption/loss, incorrect/double charging or major authentication outage. P1 includes broken core registration/payment/membership flows or major authorization errors.

Backups must be restorable, rollback/incident procedures documented, payment/webhook state observable, and legal/recurring-payment copy finalized before broad release.

The planning target for the first website MVP remains **approximately 15 February 2027**, subject to payment-provider integration and production-readiness gates.

## Documentation

Start with `docs/README.md`. Key references include:

- Product brief: `docs/product/product-brief.md`
- Platform vision: `docs/product/platform-vision.md`
- MVP scope: `docs/product/mvp-scope.md`
- Requirements: `docs/product/requirements.md`
- User roles: `docs/product/user-roles.md`
- Development roadmap: `docs/roadmap/development-roadmap.md`
- Pre-alpha test plan: `docs/testing/pre-alpha-test-plan.md`
- System architecture: `docs/architecture/system-architecture.md`
- Data model: `docs/architecture/data-model.md`
- Module boundaries: `docs/architecture/module-boundaries.md`
- Localization: `docs/architecture/localization.md`
- Deployment: `docs/architecture/deployment.md`
- Security/privacy: `docs/security/security-and-privacy.md`
- Core workflows: `docs/ux/core-user-workflows.md`
- ADRs: `docs/decisions/`

## KHLIM Assist

KHLIM Assist remains a focused event-information intelligence subproject. It should consume approved event/public APIs from this platform for supported social channels, a future website chatbot and later permission-aware event chat in the Super App. It must not maintain a second authoritative event database.
