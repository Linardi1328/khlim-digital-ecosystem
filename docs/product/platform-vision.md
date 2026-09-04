# Platform Vision

**Status:** Accepted strategic direction, not all immediate scope

## Vision

KHLIM is building a **Digital Sports Ecosystem**, not a standalone mobile app.

The ecosystem begins with the KHLIM Basketball Academy website/member platform and grows into a shared identity, organization operations, commercial, event, evidence, athlete-history, media, development, and engagement platform.

KHLIM is the first operating organization and becomes **Organization #001**. The architecture should support additional sports organizations through the same codebase and strong tenant boundaries rather than through customer-specific forks.

The platform should still earn the right to expand. Shared architecture is prepared early where it avoids expensive predictable migrations; new sport, commerce, AI, media, or intelligence features are implemented only when real operating needs justify them.

## Channel model

Different frontends have different responsibilities while sharing the same backend truth.

| Channel | Primary audience | Primary responsibility |
| --- | --- | --- |
| Public/member website | public, prospective families, registered families, event participants, merchandise visitors | discovery, registration, membership/payment, member portal, public events, approved merchandise marketing |
| Admin web | organization staff | configuration, academy operations, finance/admin, scheduling, events, content, merchandise marketing, support |
| Super App | registered athletes/parents/coaches/staff | rich authenticated member/athlete/coach experience after demand justifies native mobile |
| Social media | public/community | discovery, marketing, community, merchandise/event promotion, general enquiries |
| KHLIM Assist / later organization assistants | event participants/members depending channel | approved event/information assistance using shared authoritative data |

The rule is:

> **Every channel does its job well while all channels are powered by the same platform truth and organization boundary.**

## Product horizons

### Horizon 1 — KHLIM Academy commercial foundation

First priority remains a reliable KHLIM Academy operation:

- public website;
- one family account;
- Guardian ↔ Athlete identity;
- configurable Programmes/Offerings;
- Membership Plans/Memberships;
- secure upfront and recurring payments;
- venues/schedules;
- family member portal;
- admin/finance operations;
- transactional notifications;
- production testing/recovery/monitoring.

Success means KHLIM can acquire and manage Academy families professionally without fragmented registration/payment spreadsheets becoming the source of truth.

### Horizon 2 — Organization tenancy foundation

Before broad Event/Evidence growth, make organization ownership explicit:

- `Organization` as a first-class ownership/security boundary;
- KHLIM Basketball as Organization #001;
- organization membership and scoped staff roles;
- organization settings/branding/sports;
- tenant-aware Programmes, Memberships, Venues, Scheduling, Billing attribution, Notifications, Content, and Audit;
- adversarial tenant-isolation tests;
- no visible requirement to rewrite the existing KHLIM product experience.

Success means a synthetic Organization #002 cannot access KHLIM data and future domains can be implemented tenant-aware from day one.

### Horizon 3 — Event operating system + verified sports facts

Build around a real KHLIM tournament:

- events/competitions;
- teams;
- registrations/entries;
- rosters;
- check-in;
- fixtures/scheduling;
- results/placements;
- announcements;
- CSV/Excel import;
- public event schedule/results;
- provenance and non-destructive corrections.

The same operational facts should later power athlete history rather than being re-entered into a separate profile.

### Horizon 4 — Evidence Engine + Verified Athlete Record

- explicit evidence sources and verification state;
- correction/supersession history;
- conflict handling;
- organization-origin attribution;
- athlete competition/team history projected from verified operational facts;
- approved achievements/media/statistics when available;
- privacy/guardian-aware portability and disclosure.

Verification does not automatically make another organization's private data visible.

### Horizon 5 — Minimal white label + Organization #002

- organization branding/configuration;
- organization-specific staff/admin roles;
- organization-specific programmes/events/content;
- migration/import tooling;
- tenant-isolated reporting/audit;
- no per-organization application forks.

Custom domains, bring-your-own payment providers, and deeper branding arrive only when external demand justifies them.

### Horizon 6 — Merchandise Marketing

KHLIM and later organizations may promote club merchandise through the ecosystem before full transactional Commerce is necessary.

Initial capabilities may include:

- featured merchandise collections;
- product descriptions and approved imagery;
- indicative pricing;
- size/variant information where useful;
- availability/campaign messaging;
- public/member visibility;
- enquiry, interest, or pre-order calls to action;
- organization-specific branding.

The important distinction is:

> **Merchandise marketing is not the same thing as inventory/order/payment fulfilment.**

KHLIM can gain marketing value early while keeping full Commerce deferred.

### Horizon 7 — Academy operations automation + connected services

At growing usage:

- failed-payment/dunning automation;
- renewal/expiry/suspension/reactivation;
- WhatsApp notifications where approved;
- coach attendance workflow;
- QR-assisted check-in with coach confirmation;
- Benefits/Entitlements/starter-kit fulfilment;
- closure/replacement-session automation;
- coach evaluations/development history;
- advanced training and competitive-team pathway;
- camps and KHLIM 3x3 registration/member pricing;
- richer family dashboards;
- multi-venue operations.

### Horizon 8 — Media and AI-assisted ingestion

AI consumes structured, permissioned platform data after operational truth and review workflows are reliable.

Potential ingestion assistance includes:

- CSV mapping assistance;
- document/OCR extraction into reviewable candidates;
- coach voice observations into reviewable candidates;
- duplicate-athlete suggestions;
- external evidence submission review;
- later media/video extraction.

AI must not silently become the authority for official results, attendance, payments, membership eligibility, official evaluations, family permissions, or child-safety decisions.

### Horizon 9 — Development/performance intelligence

After enough longitudinal verified data exists:

- development summaries;
- athlete progress views;
- coach-reviewed recommendations;
- parent-facing summaries;
- organization analytics based on trusted facts.

### Horizon 10 — Native Super App

When usage justifies native mobile investment, the Super App reuses the established platform:

- Home;
- Academy/Membership;
- Schedule;
- Athlete/Verified History/Development;
- Payments;
- Events/Camps/3x3;
- KHERO/Rewards;
- Notifications;
- Account/family management;
- coach/staff workflows where appropriate.

Native mobile does not introduce a second auth/payment/membership/event backend.

### Horizon 11 — Transactional Commerce and coaching services

If KHLIM validates direct in-platform sales or booking:

- private/small-group coaching booking;
- coach availability;
- merchandise orders;
- order/collection fulfilment;
- member pricing/credits/entitlements;
- inventory only where genuinely required.

Commerce reuses shared Billing/account/organization infrastructure rather than creating a second checkout/customer system.

### Horizon 12 — Additional sports and advanced competition intelligence

A second sport reuses:

- accounts/authentication;
- Athlete identity;
- guardian relationships;
- Organization tenancy;
- Programme/Membership foundations where applicable;
- payments;
- notifications;
- venues/scheduling;
- event/evidence infrastructure;
- audit;
- attendance infrastructure.

It adds/configures sport-specific teams, development frameworks, coach assignments, competition formats, terminology, and presentation based on real requirements.

Advanced Twin/video/statistics capabilities are activated only when trustworthy data volume and user demand justify them.

## Athlete identity principle

The long-term durable object is the Athlete identity, not one programme/team/organization row.

```text
Platform Athlete
  ├── Organization Participation History
  ├── Programme Membership History
  ├── Sport Participation
  ├── Team History
  ├── Training / Attendance
  ├── Event / Competition History
  ├── Verified Results / Achievements
  ├── Development History
  └── Future approved services
```

One durable identity does **not** mean all organizations can see all attached data.

## Family principle

A family relationship belongs to people, not one programme, organization, or sport.

```text
Guardian
  ├── Athlete A
  └── Athlete B
```

The same relationship can persist as children move through programmes, teams, events, organizations, or future sports, while organization-specific visibility remains policy-controlled.

## Organization principle

```text
User / Athlete / Family identity
            ↓
Organization relationship / membership
            ↓
Organization-owned operations and data
```

Organization boundaries apply to staff authority, operations, finance, events, content, media, merchandise, reporting, and other tenant-owned data.

## Commercial infrastructure principle

Commercial infrastructure is reusable across KHLIM services:

```text
Membership / Tournament / Camp / Future Order
                 ↓
           Billing Service
                 ↓
          Payment Provider
```

Provider details stay behind adapters. The platform does not store raw card credentials.

Merchandise Marketing can exist before `Order` exists; marketing content must not fabricate payment, stock, or fulfilment truth.

## Evidence principle

Operational facts should be captured once and reused.

```text
Roster / Result / Achievement / approved Stat
              +
        Evidence / Verification
              ↓
       Athlete History Projection
```

Audit answers who changed the system; Evidence answers why a sporting fact is trusted.

## Information-classification principle

### Public
Suitable for approved public surfaces:

- programmes/public pricing where approved;
- public events/results;
- venues/public coach information;
- FAQs/registration rules;
- approved achievements/media;
- approved merchandise marketing.

### Member / participant
Authenticated context:

- membership/schedule;
- event registration/participation;
- attendance/development/rewards when implemented;
- private/member merchandise offers where configured.

### Organization-private / sensitive
Strict permission control:

- payment/account details;
- private organization operations;
- internal coach notes;
- family relationship administration;
- attendance corrections;
- unapproved evidence/media;
- privileged admin/audit information.

Portable athlete history requires explicit disclosure policy and does not collapse these classes.

## Strategic guardrail

The goal is **future-ready, not future-built**.

Every abstraction must either support current KHLIM operations cleanly, unlock the next validated product-learning milestone, or avoid an obvious expensive/security-critical future migration.

Features that do not improve revenue, retention, collections, administration, event operations, verified athlete history, organization scalability, marketing reach, useful data, or defensible platform capability should be challenged before implementation.
