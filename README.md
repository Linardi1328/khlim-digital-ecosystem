# KHLIM Super App

A production-oriented athlete-development and club-operations platform that launches with **KHLIM Basketball Club** and is intentionally designed to support additional sports and competition formats over time.

## Purpose

KHLIM Super App is intended to become the club's central digital hub rather than a collection of disconnected schedules, chats, spreadsheets, registration forms, and announcements.

The first public product is basketball-focused. It connects **players, parents/guardians, coaches, and club administrators** around training, development, competitions, communication, KHERO, rewards, and long-term athlete growth.

The platform is designed to help:

- **Players** understand what is next, track their development, participate consistently, earn rewards, customize their KHERO identity, and build a meaningful record of their time at KHLIM.
- **Parents and guardians** supervise schedules, attendance, progress, competitions, registrations, announcements, and coach communication for one or more linked children.
- **Coaches** manage sessions, attendance, athlete evaluations, development priorities, and approved private-training or consultation enquiries.
- **Club administrators** manage sports, teams, users, schedules, events, announcements, development frameworks, rewards, permissions, and club-wide operations.

The core product loop is:

> **Attend → Train → Improve → Earn → Participate → Repeat**

## Product direction

### Basketball-first experience

MVP 1.0 is built for KHLIM Basketball. Basketball terminology, KHERO presentation, development categories, and club workflows should feel native to basketball users rather than generic.

### Sport-agnostic platform core

The underlying architecture must not assume basketball is the only sport. Internally, the core concept is an **Athlete**, even when the basketball UI uses the friendlier term **Player**.

Core platform concepts should remain reusable:

```text
Organization
  └── Sport
       ├── Team / Group
       ├── Season
       ├── Training Sessions
       ├── Development Framework
       └── Competitions / Events

Athlete
  ├── Sport Participation
  ├── Team Memberships
  ├── Attendance
  ├── Evaluations
  ├── Registrations
  └── Rewards / Achievements
```

This allows future KHLIM offerings such as badminton, futsal, volleyball, swimming, running, esports, or other competitions to reuse identity, family, scheduling, attendance, event, notification, and reward infrastructure without rebuilding the platform.

## Product principles

1. **Athlete development comes first.** Gamification supports development; it does not replace it.
2. **Basketball first, platform ready.** The initial UX is basketball-specific while reusable domain models remain sport-aware.
3. **Parents are first-class users.** Guardian oversight is part of the product architecture, not an afterthought.
4. **Coaches remain the authority on development.** AI and automation may assist coaches later but should not replace professional judgement.
5. **Privacy by design.** The platform may handle information about minors, so access control, data minimization, consent, auditability, and secure defaults are foundational requirements.
6. **Modular, not tightly coupled.** Training, attendance, development, events, KHERO, rewards, localization, notifications, and future modules should evolve behind clear boundaries.
7. **Configuration over hard-coding.** Sports, development frameworks, event types, reward rules, teams, and similar business concepts should be configurable where safe and practical.
8. **Internationalization from the foundation.** User-facing text, system notifications, formatting, and admin-authored content must be designed for multiple languages instead of assuming English forever.
9. **Production-oriented from day one.** Development, staging, production, CI/CD, observability, testing, backups, and security are planned before public launch.

## MVP users

- Player (internally modeled as Athlete)
- Parent / Guardian
- Coach
- Club Administrator

## MVP capability areas

- Authentication and relationship-aware access control
- Parent/guardian-to-athlete linking
- Athlete and coach profiles
- Basketball teams and training schedules
- Coach-recorded attendance
- Sport-configurable development evaluations and priorities
- Shared versus internal coach notes
- KHERO mascot profile and controlled customization
- Auditable points ledger and rewards
- Competitions, events, selections, and announcements
- Parent event responses / registrations
- Coach directory and private-training enquiries
- Push and in-app notifications
- Multilingual interface foundation
- Administrative web dashboard
- Audit logging, privacy controls, backups, and production monitoring

## Architecture direction

The initial backend is a **modular monolith** with strict domain boundaries rather than premature microservices.

```text
Expo Mobile / Next.js Admin
            │
            ▼
         REST API
            │
            ▼
┌────────────────────────────────┐
│       NestJS Modular Core      │
│                                │
│ Identity       Sports          │
│ Profiles       Family          │
│ Teams          Training        │
│ Attendance     Development     │
│ Events         KHERO           │
│ Rewards        Localization    │
│ Notifications  Coach Services  │
│ Audit                          │
└───────────────┬────────────────┘
                │
              Prisma
                │
                ▼
        PostgreSQL / Storage
```

Modules communicate through explicit services, interfaces, or domain events. For example, attendance may publish `AthleteAttendanceConfirmed`; the rewards module may react by awarding points without the attendance module directly modifying a reward balance.

## Phase 1 technology baseline

The agreed starting stack is:

- TypeScript end-to-end
- Node.js 24 LTS
- pnpm Workspaces + Turborepo
- Expo / React Native for mobile
- Expo Router for mobile navigation
- Next.js for the admin web application
- NestJS modular monolith API
- REST + OpenAPI contracts
- PostgreSQL hosted through Supabase
- Prisma ORM / Prisma Migrate
- Supabase Auth and Storage
- TanStack Query for server state
- React Hook Form + Zod for forms and client validation
- GitHub Actions for CI/CD
- Sentry for initial error monitoring
- EAS for mobile builds/releases
- Singapore-region infrastructure where supported

Exact package versions are pinned during scaffolding and upgraded intentionally rather than implicitly.

## Planned repository layout

```text
khlim-super-app/
├── apps/
│   ├── mobile/          # Player, parent, and coach Expo application
│   ├── admin/           # Club administration Next.js application
│   └── api/             # NestJS API / modular monolith
├── packages/
│   ├── api-client/      # Generated OpenAPI client
│   ├── design-tokens/   # KHLIM/KHERO visual tokens
│   ├── i18n/            # Locale definitions and translation resources
│   ├── types/           # Carefully scoped shared platform types
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
- Security and privacy: `docs/security/security-and-privacy.md`
- Core user workflows: `docs/ux/core-user-workflows.md`
- Architecture Decision Records: `docs/decisions/`

## Current non-goals for MVP 1.0

MVP 1.0 does **not** expose a multi-sport user experience. Additional sports, public competition marketplaces, multi-organization SaaS support, full e-commerce, integrated payments, live statistics, video analysis, social feeds, open direct messaging, wearables, and autonomous AI coaching remain future capabilities.

The architecture may reserve clean extension points for them, but Phase 1 must not implement speculative complexity that does not help the basketball MVP.

---

**Current project stage:** Phase 1 technology and engineering foundation preparation.