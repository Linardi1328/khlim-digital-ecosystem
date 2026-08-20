# System Architecture

**Status:** Draft

## Architectural style

Start with a **modular monolith** rather than microservices.

This keeps development, deployment, debugging, and transactions straightforward for a small team while still enforcing clean boundaries between business domains. A module may later be extracted into a separate service if scale, ownership, or operational needs justify it.

## High-level system

```text
┌───────────────────────┐      ┌───────────────────────┐
│ Mobile Application    │      │ Admin Web Application │
│ Player/Parent/Coach   │      │ Club Staff            │
└──────────┬────────────┘      └──────────┬────────────┘
           │                               │
           └──────────── HTTPS/API ────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │   Application/API    │
                │  Modular Monolith    │
                ├──────────────────────┤
                │ Identity             │
                │ Profiles             │
                │ Family               │
                │ Teams                │
                │ Training             │
                │ Attendance           │
                │ Development          │
                │ Events               │
                │ Announcements        │
                │ KHERO                │
                │ Rewards              │
                │ Coach Services       │
                │ Notifications        │
                │ Audit                │
                └──────────┬───────────┘
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
       PostgreSQL     Object Storage   External Services
                                      (push/email/etc.)
```

## Client boundaries

### Mobile application
One mobile application can serve player, parent/guardian, and coach roles using role-aware navigation and feature access. Role checks in the client improve UX only; authorization is enforced on the server.

### Admin web application
Club administration should use a separate web interface optimized for bulk data, tables, configuration, and operational workflows rather than forcing administrative complexity into the mobile UX.

## Backend module principles

Each module should:
- own its domain logic;
- expose explicit application services or interfaces;
- avoid direct access to another module's internal implementation;
- own or clearly control writes to its data model;
- publish domain events for meaningful state changes;
- consume other modules' events through defined handlers;
- remain testable independently at the domain/application layer.

## Example: attendance and rewards

Avoid this:

```text
AttendanceService
  → insert attendance
  → update points column
  → unlock KHERO item
  → send push notification
```

Prefer this:

```text
Attendance module
  → records attendance
  → publishes PlayerAttendanceConfirmed

Rewards module
  → consumes event
  → evaluates active reward rule
  → creates point transaction
  → publishes PointsAwarded

KHERO module
  → optionally consumes PointsAwarded / AchievementUnlocked

Notification module
  → consumes relevant events
  → applies notification preferences
  → sends notification
```

This allows reward rules, KHERO logic, and notifications to evolve without rewriting attendance.

## Data architecture

A relational database such as PostgreSQL is preferred because the product contains strong relationships and transactional workflows:
- users and roles;
- guardians and players;
- teams and memberships;
- coaches and assignments;
- sessions and attendance;
- evaluations and development categories;
- events and registrations;
- points and rewards.

Object storage should hold media/assets that do not belong in relational rows, such as approved profile media or KHERO asset variants.

## API principles

- Version externally significant contracts when required.
- Validate every request server-side.
- Do not expose raw database tables directly to clients.
- Return only fields authorized for the requesting user.
- Use stable identifiers rather than UI labels as primary references.
- Design list endpoints for pagination/filtering from the start.
- Make sensitive mutation operations idempotent where duplicate requests could cause harm.
- Emit auditable actor/context information for sensitive state changes.

## Configuration versus code

Prefer configurable data for club business concepts expected to evolve:
- teams and age groups;
- development categories;
- event types;
- point rules;
- reward definitions;
- notification templates/categories;
- coach specializations.

Keep authorization policy, integrity constraints, and security-sensitive rules in tested code rather than editable configuration unless a safe policy system is intentionally designed.

## Environment model

At minimum:

### Development
Developer/local or isolated cloud resources. Never uses production data by default.

### Staging
Production-like environment used for integration, QA, migrations, and release validation.

### Production
Real users and club data. Changes arrive only through controlled deployment and migration processes.

Environment secrets and credentials must be isolated.

## Observability

Before public launch, production should provide:
- structured application logs;
- request/error tracing where practical;
- crash reporting for mobile/web clients;
- API health and latency metrics;
- database health monitoring;
- notification delivery/error visibility;
- alerts for high-severity failures;
- correlation identifiers for tracing user-reported problems without exposing sensitive data in logs.

## Deployment direction

Initial deployment should favor managed infrastructure to reduce operational burden. Exact vendors remain a stack decision, but the system should support:
- automated staging deployments;
- controlled production releases;
- database migrations with rollback/forward-fix procedures;
- versioned mobile builds;
- reproducible infrastructure/configuration;
- backups and restoration testing.

## Future extraction criteria

A module should not become a microservice merely because it is important. Extraction should be considered only when a concrete reason exists, such as:
- independent scaling requirements;
- isolated security boundary;
- materially different availability needs;
- separate team ownership;
- deployment cadence conflict;
- technology requirement that cannot reasonably fit the monolith.

Until then, module boundaries inside one deployable backend provide most of the maintainability benefits at far lower operational cost.
