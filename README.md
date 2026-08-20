# KHLIM Super App

A production-oriented digital platform for KHLIM Basketball Club that connects **players, parents/guardians, coaches, and club administrators** around training, player development, competitions, communication, rewards, and long-term athlete growth.

## Purpose

KHLIM Super App is intended to become the club's central digital hub rather than a collection of disconnected schedules, messages, spreadsheets, and announcements.

The product is designed to help:

- **Players** understand what is next, track their development, participate consistently, earn KHERO points, customize their KHERO identity, and stay connected to club opportunities.
- **Parents and guardians** supervise schedules, attendance, progress, competitions, registrations, announcements, and coach communication for one or more linked children.
- **Coaches** manage training schedules, attendance, player evaluations, development priorities, and enquiries for approved private training or consultation services.
- **Club administrators** manage teams, users, events, announcements, rewards, permissions, and club-wide operations from a controlled administrative interface.

The core product loop is:

> **Attend → Train → Improve → Earn → Participate → Repeat**

The long-term vision is to give every KHLIM athlete a meaningful digital basketball identity that records their journey through the club while giving coaches and families better tools to support development.

## Product principles

1. **Player development comes first.** Gamification supports basketball development; it does not replace it.
2. **Parents are first-class users.** Guardian oversight is part of the MVP, not an afterthought.
3. **Coaches remain the authority on development.** AI and automation may assist coaches later but should not replace professional judgement.
4. **Privacy by design.** The platform may handle information about minors, so access control, data minimization, consent, auditability, and secure defaults are foundational requirements.
5. **Modular, not tightly coupled.** Training, attendance, progress, events, KHERO, rewards, notifications, and future modules should evolve independently behind clear boundaries.
6. **Production-oriented from day one.** Development, staging, production, CI/CD, observability, testing, backups, and security are planned before public launch.
7. **Configuration over hard-coding.** Club-defined development categories, reward rules, teams, event types, and similar business rules should be configurable where practical.

## MVP users

- Player
- Parent / Guardian
- Coach
- Club Administrator

## MVP capability areas

- Authentication and role-based access
- Parent/guardian-to-player linking
- Player and coach profiles
- Teams and training schedules
- Attendance
- Player development evaluations and development priorities
- Shared versus internal coach notes
- KHERO mascot profile and controlled customization
- KHERO points ledger and rewards
- Competitions, events, selections, and announcements
- Parent event responses / registrations
- Coach directory and private-training enquiries
- Push and in-app notifications
- Administrative web dashboard
- Audit logging, privacy controls, backups, and production monitoring

## Architecture direction

The initial backend should be a **modular monolith** with strict domain boundaries rather than a premature microservice architecture.

```text
Mobile App / Admin Web
          │
          ▼
        API Layer
          │
          ▼
┌───────────────────────────────┐
│       Modular Backend         │
│                               │
│ Identity       Training       │
│ Family         Attendance     │
│ Profiles       Development    │
│ Events         KHERO          │
│ Rewards        Notifications  │
│ Coach Services Audit          │
└───────────────────────────────┘
          │
          ▼
 PostgreSQL / Object Storage
```

Modules should communicate through explicit services, interfaces, or domain events. For example, an attendance record can emit `PlayerAttendanceConfirmed`; the rewards module may react by awarding points without the attendance module directly modifying a reward balance.

## Repository status

**Current stage:** Product definition and engineering preparation.

The repository will contain both the eventual application code and the documentation that acts as the source of truth for product and architecture decisions.

See [`docs/`](./docs/) as the project documentation grows.

## Planned repository layout

```text
khlim-super-app/
├── apps/
│   ├── mobile/          # Player, parent, and coach mobile application
│   └── admin/           # Club administration web application
├── packages/
│   ├── ui/              # Shared design-system components
│   ├── types/           # Shared TypeScript/domain types
│   └── config/          # Shared project configuration
├── backend/             # Backend application / API
├── docs/                # Product, roadmap, architecture, UX, security, ADRs
├── tests/               # Cross-application/e2e test assets
└── .github/             # CI/CD and repository automation
```

The code directories will be scaffolded after the implementation stack and workspace tooling are finalized.

## Documentation

- Product brief: `docs/product/product-brief.md`
- MVP scope: `docs/product/mvp-scope.md`
- User roles: `docs/product/user-roles.md`
- Development roadmap: `docs/roadmap/development-roadmap.md`
- System architecture: `docs/architecture/system-architecture.md`
- Module boundaries: `docs/architecture/module-boundaries.md`
- Security and privacy: `docs/security/security-and-privacy.md`
- Core user workflows: `docs/ux/core-user-workflows.md`
- Architecture Decision Records: `docs/decisions/`

## Current non-goals for MVP 1.0

The first public version should not attempt to include full e-commerce, integrated payments, live game statistics, video analysis, social feeds, real-time chat, wearable integration, an advanced coach marketplace, or autonomous AI coaching. These remain future expansion areas after the core operational and player-development workflows prove useful.

---

KHLIM Super App is currently in planning and pre-development. Requirements and architecture are expected to evolve as KHLIM stakeholders, coaches, players, and parents provide feedback.
