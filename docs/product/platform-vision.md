# Platform Vision

**Status:** Accepted as strategic direction, not MVP scope

## Vision

KHLIM Super App begins as a production-ready basketball experience and can evolve into a broader KHLIM athlete-development, family, sports, and competition ecosystem.

The product should earn the right to expand. Multi-sport architecture is prepared at the core; additional sport features are implemented only when a real KHLIM program needs them.

## Product horizons

### Horizon 1 — KHLIM Basketball

Primary focus:
- player experience;
- schedules and attendance;
- parent oversight;
- coach development workflows;
- competitions/events;
- KHERO;
- rewards;
- club administration;
- multilingual access.

Success means KHLIM Basketball can operate key recurring workflows through the platform reliably.

### Horizon 2 — Additional KHLIM sport

A second sport should reuse:
- accounts and authentication;
- Athlete identity;
- guardian relationships;
- role/permission fundamentals;
- notifications;
- audit;
- events/registrations;
- attendance infrastructure;
- rewards infrastructure where appropriate.

It adds/configures:
- sport definition;
- sport-specific teams/groups;
- positions/categories;
- development framework;
- coach assignments;
- competition formats;
- sport-specific presentation.

Example:

```text
Athlete: Alex Lim

Basketball
└── U16 Main Team

Badminton
└── U17 Singles Development
```

### Horizon 3 — Cross-sport KHLIM experience

Potential capabilities:
- athlete profile containing multiple sports;
- family calendar across children and sports;
- cross-sport event discovery;
- sport filtering and switching;
- organization-wide achievements;
- cross-sport or sport-specific rewards;
- longitudinal athlete history.

### Horizon 4 — Advanced competitions

Potential capabilities:
- public/private registrations;
- team and individual competition formats;
- brackets, draws, heats, or divisions;
- eligibility rules;
- results and history;
- payments;
- event staff workflows;
- public event pages.

Competition functionality should remain a modular extension of the Events/Competition domain rather than forcing every sport into a single basketball tournament model.

### Horizon 5 — AI and automation

AI should consume structured, permissioned platform data after the operational system is trustworthy.

Possible capabilities:
- coach development summaries;
- parent progress summaries;
- scheduling/event drafting assistance;
- registration follow-up automation;
- translation assistance;
- coach-reviewed training/development recommendations;
- club operations agents.

AI must not silently become the authority for:
- official attendance;
- official evaluations;
- competition eligibility;
- family permissions;
- sensitive child-safety decisions.

### Horizon 6 — Optional external organization platform

If KHLIM later chooses to commercialize the software for other clubs/academies, that is a distinct product/business phase.

It would require deliberate design for:
- organization/tenant isolation;
- tenant-specific administrators and permissions;
- branding/configuration;
- billing/subscriptions;
- support and operational tooling;
- data migration/export;
- contractual/privacy obligations.

MVP must not pretend this tenancy layer already exists.

## Athlete identity principle

The long-term central object is the athlete, not the basketball roster row.

```text
User Account
    │
    ▼
Athlete Identity
    │
    ├── Sport Participation
    │     ├── Basketball
    │     └── Future Sport
    │
    ├── Team / Group History
    ├── Training / Attendance
    ├── Development History
    ├── Competitions
    ├── Achievements
    └── Rewards
```

This allows the athlete's history to persist as they move through age groups, seasons, teams, and potentially sports.

## Family principle

A family relationship belongs to the people, not to one sport.

```text
Guardian
   │
   └── Athlete
         ├── Basketball
         └── Future Sport
```

A parent should not need a new relationship link every time the child joins another KHLIM program.

## Sport configuration principle

Avoid creating a giant `if sport == ...` codebase.

Prefer configuration and owned sport-specific extensions for concepts such as:
- positions/categories;
- development criteria;
- team/group labels;
- event formats;
- approved reward rules;
- presentation assets.

Not every sport difference can or should be configuration. If a sport needs genuinely different behavior, implement it in a clear sport-aware domain extension rather than leaking special cases throughout the platform.

## KHERO principle

KHERO is the official face of the initial KHLIM Basketball experience.

Future possibilities remain open:
- KHERO becomes a KHLIM-wide mascot with sport-specific outfits/items;
- KHERO remains basketball-specific and future sports receive different mascots;
- a mixed strategy is used.

Do not make irreversible cross-sport mascot assumptions in MVP schema design.

## Expansion trigger

Do not activate full multi-sport UX merely because the architecture can support it.

A second sport should be implemented when:
- KHLIM has a real program and operational owner;
- its participant/coach workflows are understood;
- its development framework is defined;
- its competition/event needs are known;
- the basketball platform is sufficiently stable to support expansion.

## Strategic guardrail

The goal is **future-ready, not future-built**.

Every abstraction must justify itself by making the basketball product cleaner or by avoiding an obvious high-cost future migration. Speculative complexity that slows down KHLIM Basketball without a real requirement should be rejected.
