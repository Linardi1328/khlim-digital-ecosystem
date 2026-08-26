# Development Roadmap

**Status:** Accepted current planning baseline
**Objective:** Launch a reliable KHLIM website/member platform that can acquire families, manage academy memberships, collect recurring revenue, and support club operations on a shared backend that later powers the native Super App and wider KHLIM sports ecosystem.

This roadmap supersedes the earlier player-first/mobile-first delivery order. Basketball still launches first and the core remains sport-aware, but the first production client is now the **website/member portal**, supported by the **admin web application** and shared API.

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

## Phase 0 — Product and architecture definition

**Status:** Complete

**Goal:** Establish the product, architecture, security, and delivery source of truth.

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

**Goal:** Create a deterministic, testable engineering platform before business-domain implementation.

### Current/required workspace

```text
apps/
├── web/       # public website + authenticated member portal — FIRST
├── admin/     # staff operations — FIRST
├── api/       # NestJS modular monolith — FIRST
└── mobile/    # reserved Expo Super App client — LATER
```

### Deliverables

- pnpm Workspaces + Turborepo baseline.
- Shared strict TypeScript configuration.
- Real Next.js scaffolds for `web` and `admin`.
- Real NestJS API scaffold.
- PostgreSQL/Prisma runtime and versioned migrations.
- Development/staging/production configuration model.
- Environment validation and secrets conventions.
- Supabase Auth integration skeleton.
- REST `/v1` + OpenAPI contract/generation baseline.
- `packages/i18n` locale registry and English fallback resources.
- KHLIM design-token foundation without committing protected brand assets unless repository/IP policy permits it.
- Structured logging and Sentry baseline.
- CI covering lint, typecheck, tests, schema validation, and application builds.
- Local developer bootstrap documentation.

### Exit criteria

A developer can clone the repository, configure a safe development environment, run `web`, `admin`, `api`, and database services, execute CI-equivalent checks, and deploy a staging baseline predictably.

---

## Phase 2 — Identity, family, and authorization

**Status:** Next

**Goal:** Establish trustworthy accounts and relationships before financial or child-specific workflows.

### Deliverables

- authentication/account lifecycle;
- `User`, Guardian, Athlete, Coach profile foundation;
- multiple children per guardian and multiple guardians per athlete;
- multi-role account capability;
- preferred locale per account;
- Basketball seeded as the first active `Sport`;
- staff roles/permissions foundation;
- server-side relationship-aware authorization;
- admin MFA/strong authentication requirement;
- permission-focused automated tests;
- account recovery/deactivation foundations.

### Exit criteria

Protected APIs deny by default and users can access only data allowed by active relationships, assignments, and explicit permissions.

---

## Phase 3 — Programmes, venues, and membership foundation

**Goal:** Model what KHLIM sells and where it operates without hard-coding current academy categories or locations.

### Deliverables

- `Programme` for reusable concepts such as U9/U12/U15/Advanced Training;
- `ProgrammeOffering` for a specific location/schedule/capacity instance;
- configurable `MembershipPlan` terms and pricing;
- athlete `Membership` lifecycle;
- venue and court model;
- programme capacity/eligibility foundation;
- historical programme/membership participation preserved;
- admin configuration APIs and initial admin workflows.

### Guardrails

`Team` is not `Programme`. Competitive-team membership and academy programme enrolment are separate concepts.

### Exit criteria

Staff can configure a new programme offering, capacity, venue, and membership package without source-code changes.

---

## Phase 4 — Payments and recurring billing

**Goal:** Build reliable commercial infrastructure before public registration opens.

### Deliverables

- provider-neutral `PaymentGateway` abstraction;
- provider customer/payment-method references only; no raw card/CVV storage;
- hosted/provider-secured checkout/tokenization;
- upfront and recurring billing support;
- `PaymentSchedule` and `PaymentInstallment` model;
- payment transaction/attempt records;
- signed webhook verification;
- provider-event deduplication;
- idempotency protection for charge-creating operations;
- server-authoritative prices/discounts;
- recurring-payment agreement/terms audit record;
- receipts/payment history;
- test and production provider separation;
- basic failed-payment state ready for later dunning automation.

### Exit criteria

A test family can complete an initial membership payment, verified webhooks update the authoritative financial state exactly once, and a fixed-cycle recurring agreement cannot accidentally overcharge beyond its configured schedule.

### Schedule checkpoint

Reassess the public-launch target at the end of this phase. Payment reliability takes priority over calendar pressure.

---

## Phase 5 — Public website, registration, and member portal

**Goal:** Deliver the first coherent customer product.

### Public website

- KHLIM/Academy information;
- programmes and offerings;
- public coach/event information where appropriate;
- join/registration calls to action;
- contact/support entry points;
- localization-ready public UI.

### Family journey

```text
Discover KHLIM
→ create account
→ add/select child
→ choose programme offering
→ choose membership plan
→ review/accept terms
→ pay securely
→ membership activates
→ view member dashboard
```

### Initial member portal

- linked children;
- programme/membership summary;
- membership status;
- next payment and payment history;
- upcoming schedule;
- basic notifications/account settings.

### Exit criteria

A family can discover KHLIM, register a child, select a programme/package, pay, activate membership, and view the resulting account state without manual spreadsheet intervention.

---

## Phase 6 — Admin operations

**Goal:** Let staff operate the academy without developer intervention.

### Deliverables

- family/athlete account management;
- programme/offering management;
- membership-plan management;
- membership lifecycle oversight;
- payment/failed-payment visibility;
- venue/court configuration;
- capacity overview;
- basic revenue/payment operational reporting;
- scoped staff roles such as Super Admin, Management, Finance/Admin, Academy Admin, Head Coach, Coach, Event Staff;
- audit viewer for sensitive operations.

### Exit criteria

Normal onboarding, membership, payment, programme, and venue administration can be performed through the staff system rather than database edits or developer requests.

---

## Phase 7 — Scheduling and basic notifications

**Goal:** Support week-to-week academy operations for the first public MVP.

### Deliverables

- recurring session-series/schedule rules;
- generated explicit session occurrences;
- venue/court assignment;
- session capacity/status;
- venue/court closures;
- holidays, cancellations, rescheduling, and replacement sessions;
- auditable membership-term adjustments where interruptions require them;
- email transactional notifications;
- channel-neutral Notification service and delivery records;
- payment/registration/schedule confirmation templates;
- notification preference foundations.

### Exit criteria

Families can see accurate upcoming academy schedules and receive reliable transactional communication for registration, payment, and material schedule changes.

---

## Phase 8 — Hardening, alpha, beta, and academy pilot

**Goal:** Prove the product with real workflows before broad public exposure.

### Stage A — Internal alpha

Participants:
- developer(s);
- KHLIM management;
- selected admin/finance staff;
- selected coaches using test accounts.

Test normal and failure flows including authentication, family linking, pricing, capacity, successful/failed payments, duplicate/delayed webhooks, cancellations, schedule exceptions, permissions, backups, and rollback.

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

Suggested cohort: **15–30 families**, using production-like operations and a carefully controlled number of real production-payment verifications when appropriate.

### Release gate

- **P0/P1 open defect = NO LAUNCH**;
- no known double-charge/data-loss/privacy/auth bypass defects;
- database backup and restore tested;
- monitoring/alerts active;
- rollback/forward-fix documented;
- high-risk features can be disabled independently where practical;
- privacy/terms/recurring-payment disclosures ready;
- key browsers and common mobile screen sizes verified.

### Feature freeze

Reserve approximately the final 1–2 weeks for bug fixing, security, payment reliability, performance, recovery, and release verification rather than new features.

---

## Phase 9 — Website MVP public launch

**Goal:** Progressively release the first KHLIM Digital Sports Ecosystem product.

### Recommended rollout

1. Limited production cohort.
2. Monitor login, registration, payments, webhook processing, API errors, notification delivery, database health, and support incidents for 24–72 hours.
3. Expand cohort only while launch gates remain green.
4. Open public registration broadly.

### MVP product at launch

Customer-facing:
- public website;
- family authentication;
- multiple children;
- programme discovery/selection;
- configurable membership package selection;
- secure upfront/recurring payment;
- member dashboard;
- payment history/status;
- upcoming academy schedule;
- basic transactional notifications.

Staff-facing:
- family/athlete administration;
- programmes/offerings/plans;
- memberships/payments;
- venues/courts/schedules;
- capacity/basic reporting;
- audit records and scoped permissions.

### Planning target

Current working target: **approximately 15 February 2027**, subject to the Phase 4 payment checkpoint and the Phase 8 production launch gate.

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

Activate substantial development of `apps/mobile` over existing APIs:
- personalized Home;
- Academy/Membership;
- Schedule;
- Athlete/Development;
- Payments/receipts;
- 3x3 and Camps;
- KHERO/Rewards;
- Notifications;
- Account/family management;
- role-aware coach workflows where appropriate.

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
