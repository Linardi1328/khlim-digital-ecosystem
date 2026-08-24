# KHLIM Digital Sports Ecosystem

KHLIM is being developed as a production-oriented digital sports platform that begins with **KHLIM Basketball Academy** and can later connect KHLIM competitions, camps, private coaching, merchandise, athlete-development programmes, competitive teams, sponsorship initiatives, and future sports-technology services through one shared account ecosystem.

The project is intentionally being built in stages. The objective is **not** to build the largest possible app immediately. The objective is to create the minimum digital infrastructure required to operate KHLIM professionally, improve recurring revenue and retention, reduce administrative workload, and expand without rebuilding the platform as the business grows.

## Product direction

### Website first, Super App later

The first production interface is now planned to be the **KHLIM website and authenticated member portal**. It should support the workflows that matter most while the academy is still small: discovery, registration, parent accounts, athlete profiles, programme selection, memberships, payments, schedules, and basic administration.

The future **KHLIM Super App** will use the same backend, authentication system, database, payment infrastructure, notification infrastructure, and business rules rather than becoming a separate system.

```text
                     KHLIM PLATFORM
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
       Website          Admin Web        Super App
       FIRST             FIRST            LATER
          │                │                 │
          └────────────────┴─────────────────┘
                           │
                       REST API
                           │
                 NestJS Modular Backend
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
 Authentication       PostgreSQL          External Services
 / Identity           / Storage           Payments
                                          Email / WhatsApp
                                          Push / SMS
```

The architectural principle is:

> **One backend. One database. One authentication system. One payment infrastructure. Multiple frontends.**

## KHLIM business ecosystem

The platform is intended to support the growth of KHLIM across services such as:

- KHLIM Basketball Academy
- KHLIM 3x3 tournaments
- KHLIM Academy League
- basketball camps
- private and small-group coaching
- advanced training and tryout-based programmes
- KHLIM competitive teams
- athlete-development programmes
- merchandise and fulfilment
- sponsorship-related programmes
- future sports and sports-technology services

The academy is expected to remain the main recurring-revenue foundation while the wider ecosystem creates additional participation and development opportunities.

## Growth-aware rollout

The software roadmap follows actual business scale rather than speculative feature count.

### MVP — approximately 0–30 academy students

Build the commercial and operational foundation:

- public KHLIM website
- authentication
- parent/guardian account
- multiple linked athlete profiles
- configurable programmes and programme offerings
- configurable membership packages and pricing
- academy registration
- upfront and recurring payments
- tokenized payment methods through an external payment gateway
- payment webhooks and idempotent processing
- membership and payment status tracking
- basic venue and schedule information
- basic parent/member portal
- basic admin dashboard
- payment tracking and receipts
- basic email notifications
- audit logging and role-aware access control

### V1 — approximately 30–60 students

Reduce administrative workload and improve payment collection:

- recurring-payment retry / dunning automation
- payment-failure and overdue workflows
- membership suspension / reactivation / renewal automation
- WhatsApp notification integration
- coach/admin attendance workflow
- optional QR-assisted check-in
- venue closures and schedule exceptions
- replacement/rescheduled sessions
- starter-kit and membership-benefit entitlement tracking
- jersey-size / collection workflow
- improved operational reporting

### V2 — approximately 60–100 students

Connect KHLIM services and athlete development:

- richer parent/member portal
- coach evaluations and athlete-development profiles
- development pathway history
- camps and camp registrations
- KHLIM 3x3 tournament integration
- academy-member tournament discounts
- multi-venue improvements
- advanced training and competitive-team pathways
- richer notification preferences and event workflows

### Super App — approximately 100+ students or when usage justifies it

Activate the native Expo/React Native client over the existing platform APIs:

- personalized Home
- Academy / Membership
- Schedule
- Athlete / Development
- Payments and receipts
- KHLIM 3x3
- Camps
- KHERO / rewards
- notifications
- parent and athlete account management

Possible later modules include private-coaching booking, merchandise/pre-orders, advanced multi-location operations, richer performance analytics, and additional KHLIM sports.

## Core account model

KHLIM uses a relationship-aware account model rather than placing a single `parent_id` directly on a player.

```text
User
├── Guardian Profile
├── Athlete Profile
└── Coach Profile

Guardian ──< GuardianAthleteLink >── Athlete
```

This supports:

- multiple children per parent/guardian
- multiple authorized guardians per athlete
- auditable relationship approval/revocation
- one KHLIM identity across academy, tournaments, camps, future coaching, and commerce

Internally, the platform uses the general concept **Athlete** even when the basketball UI uses the more natural term **Player**.

## Configurable academy operations

Business concepts expected to change must be configuration/data rather than hard-coded application assumptions.

Examples include:

- sports
- programmes such as U9, U12, U15, Advanced Training, or future categories
- programme locations and offerings
- membership plans and prices
- package duration and billing frequency
- programme capacity
- venues and courts
- coaches and schedules
- payment retry/grace-period rules
- benefits and entitlements
- event types and pricing rules
- notification preferences and templates

KHLIM should be able to introduce a new programme, venue, membership package, or price through the admin system without requiring a new mobile application release.

## Membership and billing model

`Membership` and `Payment` are intentionally separate domains.

A membership may be:

```text
PENDING
ACTIVE
SUSPENDED
CANCELLED
COMPLETED
EXPIRED
```

while an expected payment/installment may independently be:

```text
SCHEDULED
PROCESSING
PAID
FAILED
OVERDUE
WAIVED
CANCELLED
```

This allows real states such as:

```text
Membership: ACTIVE
Payment: PAID
```

or:

```text
Membership: SUSPENDED
Payment: OVERDUE
```

Membership plans must support configurable terms such as monthly recurring billing, full upfront payment, commitment cycles, session allowance, promotional pricing, eligibility, and start/end rules.

## Payment architecture and security

KHLIM must **never store raw card credentials** such as full card numbers or CVVs.

```text
Parent Checkout
      │
      ▼
Payment Provider
      │
 secure tokenization
      │
      ▼
KHLIM stores only approved provider references
```

The backend should expose a provider-neutral payment layer, conceptually:

```text
Billing / Membership
        │
        ▼
 PaymentGateway interface
        │
        ▼
 Selected payment provider adapter
```

Provider-specific SDK details must not leak throughout membership, tournament, camp, or commerce modules.

Required financial controls include:

- signed webhook verification
- idempotent payment processing
- provider-event deduplication
- server-authoritative price calculation
- recurring-payment agreement records
- transaction/payment audit history
- secure environment separation
- retry and dunning policies
- refund/manual-adjustment authorization

The exact Malaysia-suitable payment provider remains an implementation/vendor decision and should be evaluated for recurring cards, one-time payments, payment links, and local methods such as DuitNow/QR where appropriate.

## Benefits and entitlements

Package benefits are modeled generically instead of hard-coding specific merchandise into membership logic.

```text
MembershipPlan
      │
   PlanBenefit
      │
    Benefit
      │
   Entitlement
```

Examples can include:

- academy jersey
- basketball
- tournament discount
- camp discount
- free evaluation
- private-coaching credit
- priority registration
- future merchandise or programme benefits

An entitlement may progress through statuses such as `ELIGIBLE`, `AWAITING_INPUT`, `ORDERED`, `READY_FOR_COLLECTION`, and `COLLECTED` depending on the benefit.

## Venues, courts, schedules, and attendance

The scheduling model supports multiple KHLIM hubs rather than assuming one location.

```text
Venue
 └── Court
      └── Session
           └── Attendance
```

A recurring session definition should be separable from each actual session occurrence so closures, holidays, cancellations, replacements, and rescheduling can be handled without corrupting the recurring schedule.

Official attendance remains coach/admin confirmed. QR check-in may later assist the workflow but should not automatically become authoritative attendance without verification.

## Athlete development

The athlete profile is long-lived and preserves history as an athlete moves through KHLIM:

```text
Academy
   ↓
Advanced Training
   ↓
KHLIM Competitive Team
```

Development data can eventually combine:

- attendance
- coach evaluations
- configurable development criteria
- strengths and development priorities
- tournament/camp history
- team participation
- achievements
- progression milestones

Historical programme/team participation must remain available instead of being overwritten when the athlete changes level.

## Tournaments and camps

The existing generic Event domain remains the foundation rather than building disconnected systems.

```text
Event
├── Tournament
└── Camp
```

Tournament and camp modules add their specific registration, eligibility, pricing, capacity, and payment rules while sharing event publication, venue, scheduling, notification, and account infrastructure.

Active academy membership can later be evaluated by backend pricing rules to apply eligible KHLIM-member tournament or camp discounts automatically.

## Notifications

Operational modules publish business events; a Notification module decides how to deliver them.

```text
Business Event
      │
      ▼
Notification Service
      │
 ┌────┼─────────────┬────┐
 ▼    ▼             ▼    ▼
Email WhatsApp     Push  SMS
```

Possible notifications include payment success/failure, upcoming payments, overdue memberships, renewals, training reminders, cancellations, venue changes, tournament/camp opportunities, development updates, and entitlement collection notices.

Social media remains primarily a marketing/community channel rather than a place for sensitive financial or athlete-specific notifications.

## KHLIM Assist integration

KHLIM Assist remains a separate event-information intelligence subproject. It can integrate with the ecosystem by consuming approved public/event APIs rather than owning duplicate event data.

```text
KHLIM Event Domain
        │
        ├── Website
        ├── Super App
        └── KHLIM Assist
```

This keeps event information consistent across the website, future member experience, and supported social-media AI channels.

## Backend module direction

The backend remains a **NestJS modular monolith** with strict boundaries. Expected domains include:

- Identity
- Profiles
- Family
- Sports
- Programmes
- Memberships
- Billing / Payments
- Benefits / Entitlements
- Venues
- Scheduling
- Attendance
- Teams
- Development
- Events
- Tournaments
- Camps
- KHERO / Rewards
- Coach Services
- Notifications
- Localization
- Content / Publishing
- Audit
- Integrations
- Commerce / Orders later

Modules communicate through explicit services/interfaces and domain events instead of directly mutating one another's internals.

## Technology baseline

The agreed technical direction remains:

- TypeScript end-to-end
- Node.js 24 LTS
- pnpm Workspaces + Turborepo
- Next.js for the public/member website and admin web applications
- NestJS modular monolith API
- REST + OpenAPI contracts
- PostgreSQL hosted through Supabase
- Prisma ORM / Prisma Migrate
- Supabase Auth and Storage
- TanStack Query for server state
- React Hook Form + Zod for forms/client validation
- GitHub Actions for CI/CD
- Sentry for initial error monitoring
- Expo / React Native + Expo Router for the future Super App
- EAS for future mobile builds/releases
- Singapore-region infrastructure where supported

Exact package versions are pinned during scaffolding and upgraded intentionally.

## Planned repository layout

```text
khlim-super-app/
├── apps/
│   ├── web/             # Public website + authenticated member portal
│   ├── admin/           # KHLIM staff administration
│   ├── api/             # NestJS modular monolith
│   └── mobile/          # Future Expo Super App client
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
├── docs/
└── .github/
    └── workflows/
```

The mobile client should not be allowed to drive unnecessary early implementation cost; it should be activated when the shared platform and business usage justify it.

## Product principles

1. **Revenue and operations first.** Early software should improve registration, recurring revenue, retention, payment collection, or administration.
2. **One ecosystem identity.** Families should not create separate accounts for each KHLIM service.
3. **Configuration over hard-coding.** Programmes, venues, packages, prices, benefits, and schedules must evolve without unnecessary releases.
4. **Backend-authoritative business logic.** Frontends never become the source of truth for prices, permissions, payments, memberships, or eligibility.
5. **Provider abstraction.** Payments, notifications, and external integrations sit behind defined interfaces.
6. **Historical continuity.** Athlete, membership, attendance, team, development, and competition history should not disappear as the business changes.
7. **Privacy and least privilege.** Financial information, family relationships, minors' data, and coach-internal data require explicit server-side authorization.
8. **Basketball first, platform ready.** KHLIM Basketball launches first while core concepts remain reusable for future sports.
9. **Internationalization from the foundation.** English, Bahasa Melayu, Simplified/Traditional Chinese, Hindi, and future locale needs must not require a rewrite.
10. **Build according to business evidence.** Features that do not increase revenue, retention, operational efficiency, payment collection, development quality, ecosystem integration, useful data, or scalability should be questioned before implementation.

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
- Localization architecture: `docs/architecture/localization.md`
- Deployment strategy: `docs/architecture/deployment.md`
- Security and privacy: `docs/security/security-and-privacy.md`
- Core user workflows: `docs/ux/core-user-workflows.md`
- Architecture Decision Records: `docs/decisions/`

## Current project stage

**Phase 0 architecture/product documentation exists and the project is preparing for the next engineering foundation pass.**

The immediate implementation priority is now the **shared platform + website/member portal + admin foundation**, not a feature-heavy native mobile application.

Before feature scaffolding, the detailed product/architecture/roadmap documents should be kept aligned with this confirmed commercial rollout, especially Memberships, Billing/Payments, Benefits/Entitlements, Programmes, Venues/Scheduling, website-first delivery, and the updated MVP → V1 → V2 → Super App sequence.
