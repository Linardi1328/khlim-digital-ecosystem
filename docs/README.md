# Project Documentation

This directory is the source of truth for product, engineering, UX, security, and delivery decisions behind the **KHLIM Digital Sports Ecosystem**.

The confirmed direction is now:

> **KHLIM Basketball first, website/member portal first, shared platform core, Super App later.**

The platform must support the academy while it is small, but its identity, programme, membership, payment, scheduling, event, development, and notification foundations should be reusable across KHLIM 3x3, camps, competitive teams, private coaching, merchandise, future sports, and the later mobile Super App.

## Current product model

The ecosystem is built around a shared backend rather than separate website/mobile systems.

```text
                     KHLIM PLATFORM
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
      Website           Admin Web        Super App
      FIRST              FIRST            LATER
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                      Shared REST API
                           │
                  NestJS Modular Backend
                           │
              PostgreSQL / Auth / Storage
                           │
         Payments / Notifications / Integrations
```

Key architectural constraints:

- one KHLIM identity ecosystem;
- one backend/API layer for website, admin, and future mobile;
- one authoritative relational database;
- shared authentication and authorization;
- shared payment infrastructure behind a provider-neutral interface;
- shared notification infrastructure across email, WhatsApp, push, and optional SMS;
- business logic remains primarily server-side;
- programmes, packages, prices, venues, benefits, capacities, and schedules are configurable rather than hard-coded;
- athlete and membership history is preserved as users progress through KHLIM.

## Documentation structure

```text
docs/
├── product/
│   ├── product-brief.md       # Why the product exists
│   ├── platform-vision.md     # Long-term multi-sport / competition direction
│   ├── mvp-scope.md           # Current scope boundaries
│   ├── requirements.md        # Implementation-oriented requirements
│   └── user-roles.md          # Roles, relationships, permission model
│
├── roadmap/
│   └── development-roadmap.md # Delivery sequence and launch progression
│
├── architecture/
│   ├── system-architecture.md # System / stack direction
│   ├── data-model.md          # Conceptual relational model
│   ├── module-boundaries.md   # Domain ownership and coupling rules
│   ├── localization.md        # Multilingual architecture and rollout
│   └── deployment.md          # Environment / release direction
│
├── security/
│   └── security-and-privacy.md
│
├── ux/
│   └── core-user-workflows.md
│
└── decisions/
    └── Architecture Decision Records (ADRs)
```

## Latest confirmed business systems

The latest KHLIM requirements extend the existing athlete/club blueprint with a commercial and operational layer.

### Existing foundations that remain valid

- modular-monolith backend
- REST/OpenAPI API boundary
- PostgreSQL
- Supabase authentication/storage direction
- Guardian ↔ Athlete many-to-many relationships
- role/relationship-aware authorization
- teams and coach assignments
- training/sessions
- coach-confirmed attendance
- configurable athlete-development framework
- generic events / competitions
- notifications abstraction
- admin web platform
- domain events / transactional outbox direction
- audit logging
- multi-sport readiness
- localization-first architecture
- KHERO / reward ledger, kept separate from real financial payments

### Confirmed systems added to the platform direction

- public website and authenticated member portal as the first production client
- Academy Programme and Programme Offering management
- configurable Membership Plans
- Membership lifecycle
- Billing / Payment service
- recurring payment schedules and instalments
- external payment gateway tokenization
- payment webhooks and idempotency
- failed-payment / overdue / dunning policies
- Benefits / Entitlements
- multi-venue and Court configuration
- venue/court closures and schedule exceptions
- membership-term adjustments for interruptions where required
- camp registrations and payments
- tournament/member pricing and eligibility rules
- later merchandise/order fulfilment
- expanded finance/operations dashboard

## Core domain distinctions

Several concepts must remain separate to avoid future technical debt.

### Guardian and Athlete

Do not place one `parent_id` directly on an athlete.

```text
Guardian ──< GuardianAthleteLink >── Athlete
```

This supports multiple children and multiple authorized guardians.

### Programme and Team

A **Programme** is an academy/service offering such as U12 Academy or Advanced Training.

A **Team** represents an actual competitive/team grouping.

They may interact, but they are not the same entity.

### Programme and Programme Offering

A programme is reusable; a programme offering represents a specific operational instance.

```text
Programme: U12 Academy

Programme Offering:
U12 Academy · Serdang · Saturday 10 AM · Capacity 30
```

This is essential for future multi-location growth.

### Membership and Payment

Membership lifecycle and billing state are independent.

```text
Membership: ACTIVE
Payment: PAID
```

and:

```text
Membership: SUSPENDED
Payment: OVERDUE
```

must both be representable without overloading one `status` column.

### KHERO points and real money

The existing KHERO reward ledger is not a financial ledger.

```text
KHERO PointTransaction ≠ Payment
```

Real payments, refunds, recurring billing, and reconciliation remain inside Billing/Payments.

## Commercial data direction

The expected conceptual relationship is approximately:

```text
User
 ├── GuardianProfile
 ├── AthleteProfile
 └── CoachProfile

Guardian ──< GuardianAthleteLink >── Athlete

Sport ──< Programme
             │
             └──< ProgrammeOffering
                       │
                       └──< Membership >── Athlete

MembershipPlan ────────┘

Membership
   ├── PaymentSchedule
   │      └── PaymentInstallment
   │              └── Payment
   └── Entitlement

Venue
 └── Court
      └── Session
           └── Attendance >── Athlete

Event
 ├── Tournament
 └── Camp

Athlete
 ├── Evaluation
 ├── TeamMembership
 ├── TournamentRegistration
 ├── CampRegistration
 └── Entitlement

Order
 └── OrderItem               # later commerce
```

Exact table names and normalization remain implementation decisions; entities should only become separate tables where they represent distinct lifecycle, integrity, or query requirements.

## Payment architecture rules

Payment implementation must follow these constraints from the start:

- KHLIM never stores full card numbers, CVVs, or raw card credentials;
- card/payment details are tokenized by the payment provider;
- KHLIM stores approved external customer/payment-method references only;
- payment-provider integration sits behind a `PaymentGateway`-style abstraction;
- backend calculates authoritative prices and discounts;
- browser redirects are not treated as final payment truth;
- signed provider webhooks are verified server-side;
- webhook/provider event IDs are deduplicated;
- payment operations use idempotency keys where duplicate requests could charge twice;
- recurring-payment agreements and accepted terms are auditable;
- production and test payment environments are separated;
- refunds/manual financial adjustments require authorization and audit history.

A Malaysia-appropriate gateway/provider should be selected based on actual support for recurring cards, one-time checkout, payment links, local payment methods, settlement, fees, and operational reliability. Provider choice must not leak into unrelated domain code.

## Entitlement model

Membership benefits must be generic and configurable.

```text
MembershipPlan
      ↓
PlanBenefit
      ↓
Benefit
      ↓
Entitlement
```

This supports today's potential starter kit as well as future tournament discounts, camp discounts, private-coaching credits, free evaluations, priority registration, or other benefits without adding package-specific conditional code throughout Membership services.

## Notifications

The Notification domain is responsible for channel delivery rather than Membership, Payment, Attendance, or Event modules calling third-party providers directly.

```text
Domain Event
    ↓
Notification Service
    ↓
Template + Locale + Preferences
    ↓
Email / WhatsApp / Push / SMS
```

Sensitive payment or athlete-specific communication should not be routed through public social-media channels.

## KHLIM Assist relationship

KHLIM Assist remains an event-information intelligence subproject and should consume approved event/public APIs from the shared KHLIM platform.

It should not maintain a second authoritative tournament/event database.

```text
KHLIM Event Domain
      ├── Website
      ├── Future Super App
      └── KHLIM Assist
```

## Current delivery sequence

Development is now explicitly tied to business scale and observed operational need.

### MVP — approximately 0–30 academy students

**Must build now:**

- website
- shared API/backend foundation
- authentication
- parent/guardian and athlete profiles
- programmes / programme offerings
- configurable membership plans
- registration
- recurring and upfront payments
- payment webhooks / idempotency
- membership/payment state
- basic venue/schedule information
- basic member portal
- basic admin dashboard
- payment tracking / receipts
- basic email notifications
- audit/security foundation

Primary success criterion:

> A family can discover KHLIM, register a child, select a programme/package, pay securely, and become an active member without KHLIM relying on fragmented spreadsheets and manual payment follow-up.

### V1 — approximately 30–60 students

**Build soon:**

- automated payment reminders/retries
- overdue and suspension/reactivation workflows
- WhatsApp notifications
- attendance
- optional QR-assisted check-in
- membership expiry/renewal automation
- starter-kit / entitlement tracking
- venue closures and schedule exceptions
- improved academy/admin analytics

### V2 — approximately 60–100 students

**Build later after adoption:**

- richer parent portal
- athlete evaluations/development profile
- camps integration
- tournament integration
- membership-based pricing/discounts
- multi-venue enhancements
- advanced/competitive pathways

### Super App — approximately 100+ students or when usage justifies it

**Activate native mobile when it creates enough value:**

- personalized member home
- Academy / Membership
- Schedule
- Athlete / Development
- Payments
- 3x3
- Camps
- KHERO / Rewards
- Notifications
- Account / family management

The native app consumes the same business APIs used by the website; the backend is not rebuilt for mobile.

## Explicitly not an early priority

Unless the business demonstrates a real need, do not prioritize:

- microservices
- Kubernetes
- custom card storage
- complex in-house instalment/EPP systems
- full private-coaching marketplace
- full merchandise warehouse management
- live game statistics
- automated video analysis
- autonomous AI athlete evaluations
- advanced multi-tenant SaaS for unrelated clubs
- fully automated omnichannel support

## Working rules

- Product behavior should be documented before or alongside implementation.
- Major architecture choices receive an ADR.
- MVP scope changes update `product/mvp-scope.md`.
- Strategic future capabilities belong in `product/platform-vision.md` and must not silently become immediate scope.
- Roadmap status should be updated as business milestones and development phases change.
- Security-sensitive decisions must be documented and reflected in implementation tests.
- Financial and membership operations require explicit auditability.
- Backend APIs remain authoritative for pricing, eligibility, permissions, payment state, membership state, and entitlements.
- Basketball-specific UX can remain focused while universal domains avoid unnecessary basketball-only coupling.
- Locale is presentation context, not a business identifier or authorization rule.
- Documentation describes intent and constraints; code/tests become the source of truth for exact implemented runtime behavior.

## Current stage

**Phase 0 documentation exists, but the confirmed business rollout has expanded the engineering foundation requirements.**

Before implementing affected modules, the detailed product, roadmap, architecture, data-model, deployment, security, and ADR documents should be aligned with the website-first commercial foundation summarized here.

The next engineering goal is to establish a shared platform capable of supporting the **KHLIM website/member portal and admin system first**, with the future Super App added as another client when business scale and user behaviour justify it.
