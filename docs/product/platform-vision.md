# Platform Vision

**Status:** Accepted strategic direction, not all immediate scope

## Vision

KHLIM is building a **Digital Sports Ecosystem**, not a standalone mobile app.

The ecosystem begins with a website/member platform for KHLIM Basketball Academy and grows into a shared identity, commercial, operational, athlete-development, event, and engagement platform that can serve multiple channels and future KHLIM services.

The platform should earn the right to expand. Shared architecture is prepared early; additional sport/service features are implemented only when real KHLIM business and user needs justify them.

## Channel model

Different frontends have different responsibilities while sharing the same backend truth.

| Channel | Primary audience | Primary responsibility |
| --- | --- | --- |
| Public/member website | public, prospective families, registered families, event participants | discovery, registration, membership/payment, member portal, public events |
| Admin web | KHLIM staff | configuration, academy operations, finance/admin, scheduling, events, support |
| Super App | registered athletes/parents/coaches/staff | rich authenticated member/athlete/coach experience after demand justifies native mobile |
| Social media | public/community | discovery, marketing, community, general enquiries |
| KHLIM Assist | event participants/members depending channel | approved event-information assistance using shared event truth |

The rule is:

> **Every channel does its job well, while all channels are powered by the same KHLIM platform.**

## Product horizons

### Horizon 1 — Academy commercial foundation

First priority:
- public website;
- one KHLIM family account;
- Guardian ↔ Athlete identity;
- configurable Programmes/Offerings;
- Membership Plans/Memberships;
- secure upfront and recurring payments;
- venues/schedules;
- basic family member portal;
- basic admin/finance operations;
- transactional email;
- production testing/recovery/monitoring.

Success means KHLIM can acquire and manage Academy families professionally without fragmented registration/payment spreadsheets becoming the source of truth.

### Horizon 2 — Academy operations automation

At growing usage:
- failed-payment/dunning automation;
- renewal/expiry/suspension/reactivation;
- WhatsApp notifications;
- attendance and coach roster;
- QR-assisted check-in with coach confirmation;
- Benefits/Entitlements/starter-kit fulfilment;
- closure/replacement-session automation;
- richer operational analytics.

### Horizon 3 — Athlete development + connected KHLIM services

- coach evaluations/development history;
- advanced training and competitive-team pathway;
- KHLIM 3x3 registration/member pricing;
- camps and camp payments;
- richer family dashboard;
- multi-venue operations;
- cross-service athlete history.

### Horizon 4 — Native KHLIM Super App

When usage justifies native mobile investment, the Super App reuses the established platform:
- Home;
- Academy/Membership;
- Schedule;
- Athlete/Development;
- Payments;
- 3x3/Camps;
- KHERO/Rewards;
- Notifications;
- Account/family management;
- coach workflows.

Native mobile does not introduce a second auth/payment/membership/event backend.

### Horizon 5 — Additional KHLIM sports

A second sport reuses:
- accounts/authentication;
- Athlete identity;
- guardian relationships;
- Programme/Membership foundations where applicable;
- payments;
- notifications;
- venues/scheduling;
- events/registrations;
- audit;
- attendance infrastructure;
- rewards infrastructure where appropriate.

It adds/configures sport-specific teams, development frameworks, coach assignments, competition formats, terminology, and presentation.

### Horizon 6 — Advanced competition ecosystem

Potential capabilities:
- external/public registrations;
- team and individual formats;
- divisions/draws/brackets/results;
- eligibility rules;
- public event pages;
- participant communication;
- payments;
- event staff roles;
- competition history.

The same Event domain can power website pages, member views, KHLIM Assist, and future competition portals.

### Horizon 7 — Commerce and coaching services

Potential capabilities:
- private/small-group coaching booking;
- coach availability;
- payment;
- merchandise/pre-orders;
- order/collection fulfilment;
- member pricing/credits/entitlements.

Commerce uses shared Billing and account infrastructure rather than creating a second checkout/customer system.

### Horizon 8 — AI and automation

AI consumes structured, permissioned KHLIM data after operational truth is reliable.

KHLIM Assist is the first narrow specialization: event-information intelligence across supported social channels, website chatbot, and later authenticated member event chat.

Future capabilities may include:
- public event assistant;
- permission-aware member assistant;
- coach development summaries;
- parent progress summaries;
- admin scheduling/event drafting;
- registration follow-up;
- translation assistance;
- coach-reviewed development recommendations.

AI must not silently become the authority for official attendance, payment truth, membership eligibility, official evaluations, family permissions, or child-safety decisions.

### Horizon 9 — Optional external organization platform

Only if KHLIM deliberately commercializes the software to external clubs:
- true tenant isolation;
- organization administrators/permissions;
- organization branding/configuration;
- platform billing;
- migration/export/support tooling;
- stronger contractual/privacy operations.

Do not prebuild tenancy into the Academy MVP without a validated business case.

## Athlete identity principle

The long-term durable object is the Athlete identity, not one programme/team row.

```text
KHLIM Account / Athlete
  ├── Programme Membership History
  ├── Sport Participation
  ├── Team History
  ├── Training / Attendance
  ├── Development History
  ├── Tournaments / Camps
  ├── Achievements / KHERO
  └── Future services
```

## Family principle

A family relationship belongs to people, not one programme or sport.

```text
Guardian
  ├── Athlete A
  └── Athlete B
```

The same link/account persists as children move through programmes, teams, events, or future sports.

## Commercial infrastructure principle

Membership/payment infrastructure is reusable across KHLIM services:

```text
Membership / Tournament / Camp / Order
              ↓
        Billing Service
              ↓
       Payment Provider
```

Provider details stay behind adapters. KHLIM does not store raw card credentials.

## Information-classification principle

### Public
Suitable for website/social/KHLIM Assist public context:
- programmes/public pricing where approved;
- public events;
- venues/public coach information;
- FAQs/registration rules.

### Member
Authenticated family/athlete/coach context:
- membership/schedule;
- member event registration;
- attendance/development/rewards when implemented.

### Sensitive
Strict permission control:
- payment/account details;
- internal coach notes;
- family relationship administration;
- attendance corrections;
- privileged admin/audit information.

## Strategic guardrail

The goal is **future-ready, not future-built**.

Every abstraction must either support the current Academy product cleanly or avoid an obvious expensive future migration. Features that do not improve revenue, retention, collections, administration, athlete development, ecosystem integration, useful data, or scalability should be challenged before implementation.
