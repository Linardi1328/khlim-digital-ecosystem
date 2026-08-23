# Product Brief

**Status:** Accepted for current planning baseline  
**Product:** KHLIM Super App  
**Launch organization:** KHLIM Basketball Club

## Problem

Youth sports development involves more than training sessions. Athletes need clarity on schedules, progress, competitions, selections, and opportunities. Parents need reliable oversight of their children's commitments and development. Coaches need efficient tools for attendance and evaluations. Club administrators need a consistent way to coordinate all of this without depending on fragmented chats, spreadsheets, posts, and manual follow-ups.

KHLIM Super App launches by solving these problems for KHLIM Basketball, while avoiding assumptions that would make the core platform impossible to reuse for additional sports later.

## Purpose

Create one trusted digital hub for the KHLIM athlete journey, connecting club operations with development, family supervision, communication, engagement, and competition participation.

The first public experience is basketball-specific. The long-term platform is sport-aware.

The app should help KHLIM:

1. Improve operational clarity around training, competitions, events, selections, and announcements.
2. Give athletes a visible record of their development and participation.
3. Give parents appropriate oversight of schedules, attendance, progress, registrations, and coach communication.
4. Give coaches fast tools to manage rosters, attendance, evaluations, and development priorities.
5. Build stronger player engagement through KHERO identity, points, rewards, and achievements.
6. Create structured data that can support future analytics and human-supervised AI automation.
7. Reuse the same platform foundation if KHLIM introduces additional sports, competition formats, or athlete programs.

## Core product loop

> **Attend → Train → Improve → Earn → Participate → Repeat**

Training and development are the core. Gamification exists to reinforce participation and engagement rather than distract from sport development.

## Basketball-first, athlete-centered

The MVP user interface can use basketball-native language such as **Player**, **Team**, **Practice**, and basketball-specific development categories.

Internally, the platform should use more durable concepts:

- `Athlete` rather than a basketball-only player entity;
- `Sport` as a configurable domain concept;
- `Team` / `Group` associated with a sport and season;
- `TrainingSession` rather than basketball-only practice records;
- `Competition` / `Event` with team or individual formats;
- `DevelopmentFramework` and `DevelopmentCriterion` rather than hard-coded basketball skills.

This is not a requirement to expose multiple sports in MVP 1.0. It is a requirement to avoid unnecessary basketball-only coupling in the core model.

## Primary users

### Player / Athlete
Wants to know what is next, how they are improving, what they have earned, and what opportunities are available. In the basketball MVP, the UI uses **Player** while the internal platform identity is **Athlete**.

### Parent / Guardian
Wants to supervise one or more children, understand attendance and progress, respond to events, receive important updates, and contact appropriate coaches. A family account should continue to work even if a child participates in more than one sport later.

### Coach
Wants fast access to assigned sessions and athletes, efficient attendance, practical development tracking, and controlled communication with families. Coach access is scoped by sport, team/group, session, and assignment.

### Club Administrator
Wants consistent control over users, sports, teams/groups, schedules, competitions/events, announcements, development frameworks, rewards, permissions, and operational reporting.

## Product principles

- **Development-first:** the product should strengthen athlete development rather than become a generic social app.
- **Basketball-first UX:** MVP 1.0 should feel purpose-built for KHLIM Basketball.
- **Sport-agnostic core:** reusable infrastructure must not assume basketball is the only sport the organization can offer.
- **Family-aware:** parent/guardian functionality is core to the product architecture.
- **Coach-controlled evaluations:** coaches control official development assessments; athletes cannot self-edit official ratings.
- **Privacy by design:** information about minors must be minimized, access-controlled, auditable, and protected by default.
- **Modular architecture:** domains should remain loosely coupled so future capabilities can be added or replaced safely.
- **Configurable frameworks:** sports, development criteria, event formats, point rules, reward definitions, and similar operational concepts should avoid unnecessary hard-coding.
- **Multilingual by design:** the UI and system-generated communication must support localization without rewriting screens later.
- **Operationally realistic:** coach workflows must remain fast enough to use during real training and competition operations.
- **Progressive complexity:** MVP proves basketball workflows before multi-sport UI, commerce, analytics, video, or AI are introduced.

## MVP value proposition

For the first public release, a KHLIM Basketball family should be able to open the app and understand:

- what training is coming up;
- whether the player has been attending;
- what the player is currently working to improve;
- what competitions, trials, or club events are approaching;
- whether the family needs to respond or register;
- what KHERO points and rewards the player has earned;
- which coaches are relevant and how to enquire about additional training.

A coach should be able to manage today's roster and player development without needing a separate attendance or evaluation system.

An administrator should be able to publish or change schedules, events, competition deadlines, announcements, and framework configuration without requiring an App Store release.

## Long-term platform opportunity

Over several years, the product can become an athlete's digital KHLIM identity: sports participated in, teams/groups, training history, competitions, selections, development milestones, achievements, KHERO/reward progression, and coach-reviewed development plans.

Potential expansion path:

```text
KHLIM Basketball MVP
        ↓
Basketball operations + competitions mature
        ↓
Additional KHLIM sport activated
        ↓
Cross-sport athlete/family experience
        ↓
Advanced competition management
        ↓
Optional external-club / multi-organization platform
```

Future capabilities may include:

- additional sports and sport-specific development frameworks;
- team and individual competition formats;
- private training booking and payments;
- merchandise and rewards commerce;
- richer performance analytics;
- video and game-stat integration;
- multilingual admin-authored content and assisted translation;
- parent progress summaries;
- coach workload automation;
- club operations agents;
- coach-approved AI development recommendations;
- optional external-club SaaS capability if the business deliberately moves in that direction.

## Multilingual direction

Internationalization is a foundation requirement even if translations roll out progressively.

Initial target locales:

- English (`en`)
- Bahasa Melayu (`ms`)
- Simplified Chinese (`zh-Hans`)
- Traditional Chinese (`zh-Hant`)
- Hindi (`hi`)

A dedicated Cantonese locale such as written Cantonese (`yue-Hant`) may be introduced if validated by KHLIM users. Traditional Chinese must not be treated as synonymous with Cantonese.

Each account stores its own preferred locale. A parent and child may use different languages while interacting with the same underlying club information.

## MVP success signals

The MVP should be considered promising if:

- coaches consistently complete attendance;
- players regularly check schedules and progress;
- parents use the app for oversight and event actions;
- development evaluations are maintained instead of abandoned;
- important competition communication moves into the platform;
- KHERO points create measurable engagement;
- private coaching enquiries can be generated through the product;
- support burden and communication confusion decrease rather than increase;
- the architecture can introduce another sport without redesigning identity, family, notification, or event fundamentals.

## Non-goals for MVP 1.0

The MVP is not intended to include:

- a multi-sport end-user selector or additional live sports;
- external-club / multi-tenant SaaS;
- a public competition marketplace;
- a social network or public athlete feed;
- real-time direct messaging between all users;
- live match statistics;
- automated video analysis;
- wearable tracking;
- a full e-commerce marketplace;
- integrated payment processing;
- complex coach booking calendars;
- autonomous AI coaching;
- public leaderboards that rank children against each other.
