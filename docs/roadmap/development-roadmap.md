# Development Roadmap

**Status:** Accepted current planning baseline

**Current milestone:** Post-Phase 6 pre-alpha integration and testing

**Objective:** Launch a reliable KHLIM website/member platform that can acquire families, manage academy memberships, collect recurring revenue, and support club operations on a shared backend that later powers the native Super App and wider KHLIM sports ecosystem.

This roadmap supersedes the earlier player-first/mobile-first delivery order. Basketball still launches first and the core remains sport-aware, but the first production client is the **website/member portal**, supported by the **admin web application** and shared API.

> Sequence and launch gates matter more than fixed dates. No calendar target overrides security, payment integrity, data protection, or unresolved P0/P1 defects.

## Roadmap principles

1. **Website/member portal first.** The first public product handles discovery, registration, family accounts, memberships, payments, schedules, and basic member self-service.
2. **One shared platform.** Website, admin, future Super App, KHLIM Assist, and later KHLIM services consume shared backend/domain services rather than recreating business logic.
3. **Basketball first, sport-aware core.** Basketball is the only required live sport for MVP, while `Sport` and `Athlete` remain durable platform concepts.
4. **Revenue and operations before engagement extras.** Registration, recurring billing, membership lifecycle, scheduling, and admin efficiency precede KHERO, advanced analytics, and native mobile polish.
5. **Configuration over hard-coding.** Programmes, programme offerings, packages, prices, venues, capacities, benefits, billing policies, and schedules are configurable where safe.
6. **Backend-authoritative rules.** Clients do not become the source of truth for price, eligibility, membership status, payment state, authorization, or entitlements.
7. **Production readiness is continuous.** Testing, auditability, monitoring, backups, rollback, and recovery are developed throughout the project rather than added at the end.
8. **Controlled rollout is mandatory.** Internal alpha, closed family beta, academy pilot, release candidate, limited production, and public launch are distinct stages.
9. **Native mobile is activated by evidence.** The Expo client remains reserved but significant Super App development begins when academy scale or user behaviour justifies it.

---

## Delivery status at a glance

| Phase | Status | Notes |
| --- | --- | --- |
| 0 — Product and architecture definition | Complete | Direction, ADRs and domain boundaries established |
| 1 — Engineering foundation | Complete | Monorepo/runtime/CI/Prisma/OpenAPI/localization/observability foundations established |
| 2 — Identity, family and authorization | Complete foundation | Auth verification, family relationships, invitations, staff role controls and server authorization implemented |
| 3 — Programmes, venues and membership foundation | Complete foundation | Programmes, offerings, plans, memberships and configuration APIs implemented |
| 4 — Payments and recurring billing | Complete provider-neutral foundation | Billing models and correctness controls implemented; real production gateway adapter still required |
| 5 — Public website, registration and member portal | Implemented frontend/integration layer | Public/member surfaces and API/auth integration exist; staging integration must be proven |
| 6 — Admin operations | Implemented UI; production integration pending | Broad operations console exists, with demo behavior isolated and privileged production behavior fail-closed |
| 7 — Scheduling and basic notifications | Next implementation work | Minimum trustworthy scheduling and transactional communication remain required before beta |
| 8 — Hardening, alpha, beta and academy pilot | Next major validation stage | Start with pre-alpha integration/testing before involving external families |
| 9 — Website MVP public launch | Future gated release | Only after payment, security, recovery and operational gates are green |

---

## Phase 0 — Product and architecture definition

**Status:** Complete

Completed foundation includes:

- modular-monolith backend direction;
- TypeScript/Next.js/NestJS/PostgreSQL/Prisma stack;
- Guardian ↔ Athlete many-to-many model;
- basketball-first / sport-aware core;
- localization-first architecture;
- coach-confirmed attendance authority;
- website-first shared commercial-platform decision;
- one account / one backend / one database / shared payment and notification infrastructure principle.

---

## Phase 1 — Engineering foundation

**Status:** Complete

Implemented baseline includes:

- pnpm Workspaces + Turborepo;
- pinned Node.js 24 / pnpm toolchain;
- shared strict TypeScript configuration;
- real Next.js scaffolds for `web` and `admin`;
- real NestJS API scaffold;
- PostgreSQL/Prisma runtime and versioned migrations;
- development/staging/production configuration model;
- Supabase Auth integration foundation;
- REST `/v1` + OpenAPI export/generated types;
- shared localization registry/resources;
- design tokens;
- structured logging and Sentry foundations;
- CI covering lint, formatting, tests, type checks, Prisma validation, OpenAPI drift and runtime builds;
- exact-commit Playwright browser QA for web and admin.

---

## Phase 2 — Identity, family, and authorization

**Status:** Complete foundation

Implemented capabilities include:

- authenticated identity verification through Supabase JWTs;
- `User`, Guardian and Athlete relationship foundation;
- multiple children per guardian and multiple guardians per athlete;
- guardian invitation lifecycle using token hashes rather than raw invitation tokens;
- role-aware authorization and privileged staff controls;
- MFA/AAL2 requirement for sensitive administration;
- preferred locale/account foundations;
- server-side relationship-aware access tests;
- account and family APIs.

Remaining production work is mostly environment/integration validation rather than redesigning the identity model.

---

## Phase 3 — Programmes, venues, and membership foundation

**Status:** Complete foundation

Implemented capabilities include:

- `Programme` and `ProgrammeOffering` as separate entities;
- configurable capacities/statuses;
- configurable `MembershipPlan` terms and pricing;
- offering eligibility rules;
- athlete membership lifecycle beginning in `PENDING` before verified billing activation;
- academy administration APIs with scoped roles/MFA;
- database migrations for programme/membership entities.

### Guardrail

`Team` is not `Programme`. Competitive-team membership and academy programme enrolment remain separate concepts.

---

## Phase 4 — Payments and recurring billing

**Status:** Complete provider-neutral foundation; provider integration still required

Implemented capabilities include:

- provider-neutral `PaymentGateway` boundary;
- provider customer/payment-method references only; no raw card/CVV storage;
- payment schedules and installments;
- payment transaction/attempt records;
- webhook verification boundary;
- provider-event deduplication;
- idempotency protection;
- server-authoritative financial/membership state;
- browser redirects explicitly prevented from becoming payment authority;
- test/production separation principles.

### Critical remaining dependency

A real sandbox/production payment provider adapter must be selected, implemented and validated. The current gateway boundary intentionally refuses to fake production success when no provider adapter is configured.

### Exit from integration testing

Before beta, prove that successful, failed, delayed, duplicated and retried provider events update state exactly once and cannot cause double activation or double charging.

---

## Phase 5 — Public website, registration, and member portal

**Status:** Implemented frontend/integration layer

Implemented surfaces include:

- KHLIM/Academy public pages;
- programmes/offerings discovery;
- responsive homepage and gallery;
- login/register/forgot-password/reset-password flows;
- guardian onboarding;
- child creation/selection;
- enrolment and membership-plan selection;
- provider-redirect checkout handoff;
- confirmation that re-reads authoritative backend payment/membership state;
- family/member portal for dashboard, players, membership, payments, schedule, notifications and account;
- localization-ready public/member UI;
- responsive web Playwright QA.

### Remaining pre-alpha work

- validate real Supabase staging configuration and account lifecycle end to end;
- connect a real payment sandbox;
- seed realistic offerings/plans/family records;
- test real API/network failures and expired sessions;
- finalize legal/privacy/recurring-payment copy before production launch.

---

## Phase 6 — Admin operations

**Status:** Implemented UI; real staff integration pending

Implemented UI covers:

- operations dashboard and capacity overview;
- programmes and offerings;
- membership plans and memberships;
- athletes and guardians;
- payments/financial attention views;
- venues and scheduling surfaces;
- staff administration surfaces;
- audit log views;
- settings;
- responsive desktop/mobile navigation;
- scoped finance visibility;
- keyboard-accessible data-table interactions;
- exact-commit Admin Playwright QA.

### Security truth

The current Admin application intentionally isolates demo data. Outside explicit demo mode, unsupported privileged operations reject rather than pretending to persist changes. Real staff authentication and backend endpoints must be connected before internal alpha can treat Admin as an operational system.

### Pre-alpha exit criteria

- real staff sign-in/session handling;
- supported read/write operations use authenticated backend APIs;
- role/MFA restrictions are verified server-side and through UI tests;
- unsupported actions are disabled or fail closed;
- audit-sensitive actions produce expected records;
- finance data is inaccessible to unauthorized roles.

---

## Immediate milestone — Pre-alpha integration and test hardening

**Status:** Active next move

This is the recommended bridge between Phase 6 implementation and formal Phase 8 internal alpha. It should be treated as a quality/integration sprint, not a broad feature sprint.

### Priority 1 — Production-shaped integration

- configure a staging Supabase project and realistic non-production users;
- connect Admin staff authentication;
- connect supported Admin operations to backend APIs;
- implement/configure a sandbox payment gateway adapter;
- validate environment separation and secrets;
- confirm deployed web/admin/API origins and CORS/auth behavior.

### Priority 2 — Minimum Phase 7 dependencies

Complete only what is necessary for the MVP test journey:

- recurring session rules / explicit upcoming session occurrences;
- venue/court assignment and closures;
- cancellations/rescheduling/replacement-session behavior required for accurate family schedules;
- transactional email for registration/payment/material schedule events;
- notification delivery records and basic failure observability.

### Priority 3 — Deep testing

Test the existing system through realistic workflows and failure modes:

- family signup and email-confirmation paths;
- guardian with multiple children;
- relationship authorization and unauthorized child access;
- programme/plan eligibility and capacity boundaries;
- successful/failed/duplicate/delayed payment webhooks;
- idempotency under retries;
- membership activation only from verified financial state;
- finance/admin/coach role separation;
- database migration and rollback safety;
- backup and restore;
- logging, alerting and incident visibility;
- browser/device accessibility and responsive behavior.

See `docs/testing/pre-alpha-test-plan.md`.

---

## Phase 7 — Scheduling and basic notifications

**Status:** Next implementation work, intentionally scoped to MVP needs

### Deliverables

- recurring session-series/schedule rules;
- generated explicit session occurrences;
- venue/court assignment;
- session status/capacity;
- venue/court closures;
- holidays, cancellations, rescheduling and replacement sessions;
- auditable term adjustments where interruptions require them;
- email transactional notifications;
- channel-neutral Notification service and delivery records;
- payment/registration/schedule confirmation templates;
- notification preference foundations.

### Exit criteria

Families can see accurate upcoming academy schedules and receive reliable transactional communication for registration, payment and material schedule changes.

---

## Phase 8 — Hardening, alpha, beta, and academy pilot

**Status:** Next major validation stage after pre-alpha integration gates

### Stage A — Internal alpha

Participants:

- developer(s);
- KHLIM management;
- selected admin/finance staff;
- selected coaches using non-production or tightly controlled accounts.

Exercise normal and failure flows including authentication, family linking, pricing, capacity, successful/failed payments, duplicate/delayed webhooks, cancellations, schedule exceptions, permissions, backups and rollback.

### Stage B — Closed family beta

Suggested first cohort: **5–10 trusted families**.

Observe without hand-holding where possible:

- signup completion;
- child/profile creation;
- programme selection;
- checkout clarity;
- dashboard comprehension;
- email delivery;
- browser/device compatibility;
- support burden.

### Stage C — Expanded academy pilot

Suggested cohort: **15–30 families**, using production-like operations and carefully controlled real-payment verification where appropriate.

### Release gate

- **P0/P1 open defect = NO LAUNCH**;
- no known double-charge/data-loss/privacy/auth-bypass defects;
- database backup and restore tested;
- monitoring/alerts active;
- rollback/forward-fix documented;
- high-risk features can be disabled independently where practical;
- privacy/terms/recurring-payment disclosures ready;
- key browsers and common mobile screen sizes verified.

---

## Phase 9 — Website MVP public launch

**Status:** Future gated release

### Recommended rollout

1. Limited production cohort.
2. Monitor login, registration, payments, webhook processing, API errors, notification delivery, database health, and support incidents for 24–72 hours.
3. Expand cohort only while launch gates remain green.
4. Open public registration broadly.

### Planning target

Current working target: **approximately 15 February 2027**, subject to real payment-provider integration and the Phase 8 production launch gate.

---

# Post-MVP growth roadmap

## V1 — approximately 30–60 active academy students

Prioritize automation that improves collections and reduces admin work:

- recurring-payment retry/dunning policy;
- overdue → suspension → reactivation workflows;
- renewal/expiry automation;
- WhatsApp notification adapter where approved;
- coach attendance workflow;
- optional QR-assisted check-in with coach confirmation;
- Benefits/Entitlements and starter-kit fulfilment;
- jersey sizing/collection status;
- improved operational analytics.

## V2 — approximately 60–100 students

Connect athlete development and additional KHLIM services:

- coach evaluations/development profiles;
- development pathway history;
- KHLIM 3x3 tournament registrations and membership pricing rules;
- camps and camp payments;
- competitive-team/advanced-training pathways;
- richer family portal;
- stronger multi-venue tooling;
- richer event/notification workflows.

## Super App — approximately 100+ students or when mobile demand justifies it

Activate substantial development of `apps/mobile` over existing APIs for Home, Academy/Membership, Schedule, Athlete/Development, Payments/receipts, 3x3/Camps, KHERO/Rewards, Notifications and account/family management.

Mobile release follows its own internal testing → TestFlight/Play closed beta → staged store rollout → public release gates.

## Later capabilities — build only with evidence

- private/small-group coaching booking and payments;
- merchandise/pre-order commerce;
- richer competition results/brackets;
- advanced analytics/video/statistics;
- cross-channel communications/CRM;
- additional KHLIM sports;
- AI/automation using structured authoritative data;
- external-club/multi-tenant platform only after a validated commercial decision.
