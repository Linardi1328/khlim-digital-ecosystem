# KHLIM Digital Sports Ecosystem

KHLIM is building a production-oriented sports platform that starts with **KHLIM Basketball Academy** and can later connect tournaments, camps, competitive teams, private coaching, merchandise, athlete development, additional locations, future sports, and sports-technology services through one shared KHLIM account ecosystem.

The project is intentionally incremental. The objective is not to build the largest app immediately; it is to create reliable digital infrastructure that improves registration, recurring revenue, payment collection, retention, administration, and long-term athlete development without requiring a rebuild as KHLIM grows.

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

## First website MVP

The first public release is designed to support approximately the early **0–30 Academy student** stage.

A family should be able to:

```text
Discover KHLIM
→ create one Guardian account
→ add/select child
→ choose Programme Offering
→ choose Membership Plan
→ review/accept terms
→ pay securely
→ Membership activates after verified payment
→ view membership/payment/schedule dashboard
```

KHLIM staff should be able to manage the resulting programmes, plans, memberships, payments, venues, schedules, capacity, and family records through the Admin application rather than fragmented spreadsheets or developer changes.

### MVP capability areas

- Authentication and server-side authorization.
- Guardian ↔ Athlete many-to-many relationships.
- Basketball-first, sport-aware identity foundation.
- Configurable Programmes and Programme Offerings.
- Configurable Membership Plans/pricing/commitments.
- Membership lifecycle separate from payment state.
- Secure external payment gateway integration.
- Upfront and approved recurring billing.
- Tokenization; no raw card/CVV storage by KHLIM.
- Signed payment webhooks, provider-event deduplication, and idempotent charge processing.
- Multiple Venues/Courts and basic scheduling.
- Public KHLIM/Academy website.
- Family/member dashboard.
- Admin/finance operational views with least-privilege permissions.
- Basic transactional email through a channel-neutral Notification service.
- Localization foundation.
- Audit logging, monitoring, backups, tested recovery, and controlled launch gates.

## What is deliberately later

The first website MVP does not need to block on:
- major native Super App feature development;
- KHERO/rewards;
- full attendance and QR-assisted check-in;
- athlete development/evaluations;
- KHLIM 3x3 integration;
- camps;
- private coaching booking;
- merchandise/pre-order commerce;
- additional live sports;
- advanced analytics/video/statistics;
- autonomous AI coaching.

These modules are added according to business evidence and reuse the same shared platform.

## Growth-aware rollout

### MVP — approximately 0–30 students
Website/member portal, accounts/family, programmes, memberships, payments, basic venues/schedules, basic admin, transactional email, production hardening.

### V1 — approximately 30–60 students
Payment retry/dunning, overdue/suspension/reactivation, renewals, WhatsApp integration, attendance, optional QR-assisted check-in, Benefits/Entitlements/starter-kit fulfilment, stronger schedule exceptions, operational analytics.

### V2 — approximately 60–100 students
Athlete development/evaluations, KHLIM 3x3, camps, member discounts, advanced/competitive pathways, richer family portal, stronger multi-venue operations.

### Super App — approximately 100+ students or when mobile demand justifies it
Activate substantial Expo/React Native product development over the existing APIs for Home, Academy/Membership, Schedule, Athlete/Development, Payments, 3x3/Camps, KHERO/Rewards, Notifications, and account/family management.

## Account and domain principles

### Guardian ↔ Athlete

Do not place one `parent_id` directly on an athlete.

```text
Guardian ──< GuardianAthleteLink >── Athlete
```

This supports multiple children and multiple authorized guardians.

### Programme ≠ Team

`Programme` represents an Academy/service concept such as U12 Academy or Advanced Training.

`ProgrammeOffering` represents a specific operational instance such as U12 Academy at Serdang on Saturday morning with capacity 30.

`Team` represents a competitive/team grouping and has a separate lifecycle.

### Membership ≠ Payment

Membership states such as `ACTIVE` or `SUSPENDED` and Payment/Installment states such as `PAID`, `FAILED`, or `OVERDUE` are separate.

### Financial money ≠ KHERO points

Real Billing/Payment records are separate from the later auditable KHERO/Reward point ledger.

## Payment architecture

KHLIM must never store full card numbers, CVVs, or raw card credentials.

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

Required controls include signed webhooks, provider-event deduplication, idempotency keys, server-authoritative prices, recurring agreement audit records, financial transaction history, environment separation, and reconciliation/monitoring.

## Technology baseline

- TypeScript end-to-end.
- Node.js 24 LTS.
- pnpm Workspaces + Turborepo.
- Next.js for `apps/web` and `apps/admin`.
- NestJS modular-monolith API.
- REST + OpenAPI generated client direction.
- PostgreSQL hosted through Supabase.
- Prisma ORM / Prisma Migrate.
- Supabase Auth and Storage.
- GitHub Actions / PPO validation.
- Sentry/structured logging.
- Railway API hosting initially.
- Vercel web/admin hosting initially.
- Expo / React Native + Expo Router reserved for future mobile activation.
- Singapore-region infrastructure where supported.

## Repository layout

```text
khlim-digital-ecosystem/
├── apps/
│   ├── web/             # public website + authenticated family/member portal
│   ├── admin/           # KHLIM staff operations
│   ├── api/             # NestJS modular monolith
│   └── mobile/          # future Expo Super App client
├── packages/
│   ├── api-client/
│   ├── design-tokens/
│   ├── i18n/
│   ├── types/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── testing/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── docs/
└── .github/
    └── workflows/
```

## Reliability and public-launch rule

KHLIM uses a controlled launch sequence:

```text
Internal alpha
→ Closed beta (~5–10 families)
→ Expanded Academy pilot (~15–30 families)
→ Feature freeze / Release Candidate
→ Limited production cohort
→ Public launch
```

Any unresolved **P0/P1 defect means NO PUBLIC LAUNCH**. P0 includes security/privacy breach, data corruption/loss, incorrect/double charging, or major authentication outage. P1 includes broken core registration/payment/membership flows or major authorization errors.

Backups must be restorable, rollback/incident procedures documented, and payment/webhook state observable before broad release.

The current planning target for the first website MVP is **approximately 15 February 2027**, subject to payment-integration and production-readiness gates.

## KHLIM Assist

KHLIM Assist remains a focused event-information intelligence subproject. It should consume approved Event/public APIs from this platform for supported social channels, the future website chatbot, and later permission-aware event chat in the Super App. It must not maintain a second authoritative event database.

## Documentation

- Product brief: `docs/product/product-brief.md`
- Platform vision: `docs/product/platform-vision.md`
- MVP scope: `docs/product/mvp-scope.md`
- Requirements: `docs/product/requirements.md`
- User roles: `docs/product/user-roles.md`
- Development roadmap: `docs/roadmap/development-roadmap.md`
- System architecture: `docs/architecture/system-architecture.md`
- Data model: `docs/architecture/data-model.md`
- Module boundaries: `docs/architecture/module-boundaries.md`
- Localization: `docs/architecture/localization.md`
- Deployment: `docs/architecture/deployment.md`
- Security/privacy: `docs/security/security-and-privacy.md`
- Core workflows: `docs/ux/core-user-workflows.md`
- ADRs: `docs/decisions/`

## Current project stage

**Phase 1 — Engineering Foundation is active.**

The monorepo/tooling/TypeScript/Prisma boundary and PPO validation foundations are present. The current Phase 1 priority is to complete real `web`/`admin`/`api` scaffolding, environment/auth/OpenAPI/localization/CI/observability foundations, then proceed to Identity/Family before implementing Programmes, Memberships, and Billing.
