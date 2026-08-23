# Development Roadmap

**Status:** Accepted for current planning baseline  
**Objective:** Move from a basketball-first player experience to a production-ready KHLIM Super App while preserving a clean path to additional sports, competition formats, and future automation.

> The sequence is more important than the exact calendar duration. Phase estimates and priorities should be revised from real implementation and beta feedback rather than treated as fixed dates.

## Roadmap principles

1. **Basketball ships first.** No additional sport is required before KHLIM Basketball succeeds.
2. **Player experience is the first functional vertical.** The first visible app experience is designed around the athlete/player journey.
3. **Supporting roles make player data trustworthy.** Coaches, parents, and admins are introduced because player schedules, attendance, evaluations, and event information need authoritative sources.
4. **Sport awareness begins in the foundation, not in the UI.** Core schemas/contracts support `Sport` and `Athlete`; MVP UI remains basketball-specific.
5. **Configuration beats releases for operational content.** Schedules, events, development criteria, announcements, rewards, and translations should be updateable without requiring an App Store release where practical.
6. **Multilingual support is foundational.** UI copy and system-generated messages use localization infrastructure from the first production screens.
7. **Public launch waits for the full operational loop.** A player-only prototype can be tested early, but public MVP 1.0 requires the staff/family workflows needed to keep information current and safe.

---

## Phase 0 — Product and development documentation

**Status:** Complete

**Goal:** Establish the source of truth before implementation.

Completed baseline:
- Product brief and MVP scope.
- User-role and permission model.
- Core user workflows.
- Initial data model.
- Modular-monolith architecture direction.
- Security/privacy principles.
- Development roadmap.
- ADR process and initial decisions.
- KHLIM logo and KHERO design references received.

Follow-up decisions incorporated after Phase 0:
- basketball-first / sport-agnostic-core strategy;
- Athlete as the internal identity concept;
- multilingual architecture requirement;
- coach-confirmed attendance as the MVP attendance authority;
- Phase 1 technology stack direction.

---

## Phase 1 — Engineering foundation

**Status:** Next / active planning

**Goal:** Create a maintainable technical platform before feature implementation.

### Technology baseline

- TypeScript end-to-end.
- Node.js 24 LTS.
- pnpm Workspaces + Turborepo.
- Expo / React Native mobile app with Expo Router.
- Next.js admin application.
- NestJS modular-monolith API.
- REST + OpenAPI.
- PostgreSQL on Supabase.
- Prisma ORM / Prisma Migrate.
- Supabase Auth and Storage.
- TanStack Query.
- React Hook Form + Zod.
- GitHub Actions.
- Sentry.
- EAS build/release tooling.
- Singapore-region infrastructure where supported.

### Deliverables

- Monorepo structure:
  - `apps/mobile`
  - `apps/admin`
  - `apps/api`
  - shared packages
  - Prisma schema/migrations
- Development environment setup.
- Staging/production strategy.
- Authentication integration skeleton.
- REST/OpenAPI contract generation.
- Shared design tokens based on KHLIM/KHERO branding.
- Localization package and locale registry.
- English fallback catalogue with target locales registered.
- Testing foundation.
- CI for lint, type checking, unit tests, schema validation, and builds.
- Secrets-management conventions.
- Baseline Sentry/structured logging integration.

### Architecture guardrails established here

- `Athlete` is the internal identity; basketball UX may say `Player`.
- `Sport` is a first-class concept, with Basketball as the only active MVP sport.
- Clients never directly own database business rules.
- Prisma migrations are the application-schema migration authority.
- Translation keys are used from the first production UI components.

### Exit criteria

A developer can clone the repository, configure a development environment, run mobile/admin/API/database locally, execute CI-equivalent checks, and deploy a safe staging baseline predictably.

---

## Phase 2 — Identity, athlete, sport, and access foundation

**Goal:** Establish trustworthy identities and relationships before sensitive features.

Deliverables:
- Authentication and account lifecycle.
- Athlete/Player, Parent/Guardian, Coach, and Administrator roles.
- Multi-role account capability.
- `Sport` model with Basketball seeded/enabled.
- Athlete profiles.
- Preferred locale per user.
- Parent/guardian-to-athlete links.
- Coach-to-sport/team assignments.
- Server-side authorization policies.
- Admin MFA or equivalent strong control.
- Permission-focused automated tests.

Exit criteria:
- Accounts only access data allowed by relationship, role, sport/team scope, and explicit permissions.

---

## Phase 3 — Player-first mobile experience

**Goal:** Build the first coherent product experience around the KHLIM Basketball player.

This phase intentionally prioritizes what the player sees before building the full operational depth behind every module.

Deliverables:
- KHLIM/KHERO branded shell and navigation.
- Player home/dashboard.
- Player profile.
- Basketball team membership display.
- Schedule/calendar read experience using seeded/admin-managed data.
- Competition/event read experience.
- KHERO profile shell and approved visual customization foundation.
- Points/rewards read placeholders or early ledger-backed view if available.
- Progress/development read UI using development-framework fixtures or controlled seed data.
- Language selector.
- English production copy plus initial Bahasa Melayu translation coverage; additional target locales can follow through beta.
- Responsive localization-safe components.

Exit criteria:
- A basketball player can use a realistic end-to-end mobile experience with production architecture rather than a throwaway prototype.

Important limitation:
- Data that must be authoritative (attendance, evaluations, official events) may still be seeded or admin-managed until the corresponding staff phases are complete.

---

## Phase 4 — Club operations and coach attendance

**Goal:** Make schedules and attendance authoritative instead of demo data.

Deliverables:
- Basketball teams/groups and memberships.
- Season-aware membership foundation.
- Training-session creation and recurring schedule workflow.
- Coach assignments.
- Coach session/roster screen.
- `Mark All Present` + exception editing.
- Present / absent / late / excused statuses.
- Coach confirmation of official attendance.
- Attendance history and corrections.
- `AthleteAttendanceConfirmed` domain event.
- Admin attendance oversight.
- Schedule-change notifications.

Exit criteria:
- A real basketball team can run a training week using the platform without a parallel attendance spreadsheet.

Future attendance enhancement, not required here:
- temporary QR/NFC/kiosk check-in may create a draft check-in signal while coach confirmation remains the default official authority.

---

## Phase 5 — Parent / guardian experience

**Goal:** Give families reliable supervision and action workflows around linked children.

Deliverables:
- Parent dashboard.
- Multi-child switching.
- Child schedule/calendar.
- Attendance visibility.
- Event/competition visibility.
- Parent-controlled profile/contact fields.
- Notification preferences.
- Preferred locale independent of child locale.
- Family-safe access tests.

Exit criteria:
- Parents can reliably understand where their child needs to be, whether they attended, and what upcoming actions matter.

---

## Phase 6 — Athlete development

**Goal:** Establish structured, coach-owned basketball development history using a sport-configurable framework.

Deliverables:
- `DevelopmentFramework` associated with Basketball.
- Configurable criteria/categories.
- Coach evaluations and rating/assessment model.
- Strengths and development priorities.
- Shared progress notes.
- Internal coach notes with distinct authorization.
- Evaluation history.
- Player/parent progress views using live data.
- Evaluation freshness/overdue indicators where useful.

Exit criteria:
- Coaches can maintain useful development information without excessive administration, and player/parent progress screens contain trustworthy coach-owned information.

---

## Phase 7 — Competitions, events, selections, and communication

**Goal:** Make the app the source of truth for upcoming basketball opportunities and changes.

Deliverables:
- Generic event/competition domain with `sport_id`.
- Team and individual participation formats in the model.
- Competitions, trials, camps, club events, and registration deadlines.
- Draft → Published → Registration Open/Closed → Completed/Cancelled lifecycle.
- Parent registration/response workflow.
- Selection announcements with controlled visibility.
- Club/sport/team/athlete-targeted announcements.
- Event update/cancellation notifications.
- Automated deadline/reminder jobs.
- Admin event management that requires no developer intervention.
- Locale-aware system notifications.

Exit criteria:
- A real competition can be published, changed, registered for, reminded, completed, and retained as history entirely through the platform.

---

## Phase 8 — KHERO, points, rewards, and engagement

**Goal:** Turn participation into a meaningful KHLIM engagement loop without letting gamification own operational truth.

Deliverables:
- Official KHERO assets integrated using approved design rules.
- KHERO customization catalogue.
- Point transaction ledger.
- Configurable reward rules.
- Confirmed attendance as an initial reward-event source.
- Achievements/unlocks.
- Reward catalogue and redemption.
- Player and parent reward visibility.
- Audit/reconciliation tools.

Exit criteria:
- KHERO/rewards can evolve independently while every balance change remains explainable and auditable.

---

## Phase 9 — Coach services and operational admin maturity

**Goal:** Complete the club operating toolset needed before broad release.

Deliverables:
- Coach directory and sport specializations.
- Private-training/consultation enquiries.
- Full admin workflows for users, family links, sports, teams, schedules, attendance, development frameworks, events, announcements, rewards, and enquiries.
- Bulk imports.
- Audit viewer.
- Localization-aware admin content entry where required.

Exit criteria:
- Routine KHLIM Basketball operations do not require developer intervention.

---

## Phase 10 — Security, privacy, reliability, and production hardening

**Goal:** Prepare the system for real families, minors' information, and public mobile distribution.

Deliverables:
- Threat review.
- Authorization test suite.
- Rate limiting and abuse controls.
- Secret-management validation.
- Backup/restore test.
- Audit coverage review.
- Production logging/alerts.
- Data retention and deletion rules.
- Account deletion flow.
- Privacy/terms drafts and data inventory.
- Dependency / third-party SDK review.
- Performance testing for expected launch load.
- Localization completeness/fallback checks.
- Cost monitoring and spending alerts.

Exit criteria:
- Critical security, privacy, recovery, observability, localization, and cost-control requirements are verified rather than assumed.

---

## Phase 11 — Internal alpha

**Goal:** Break the product internally before families do.

Participants:
- Developers.
- Club management.
- Small number of coaches/staff.
- Selected test player accounts.

Representative flow:

```text
Create basketball team
→ schedule training
→ player sees schedule
→ coach confirms attendance
→ parent sees attendance
→ rewards event processes
→ coach adds development update
→ player/parent see progress
→ admin publishes competition
→ family receives localized notification
```

Exit criteria:
- No unresolved blocker-level failures in core workflows.

---

## Phase 12 — Controlled club beta

**Goal:** Validate the product with a real KHLIM Basketball cohort.

Suggested cohort:
- 1 age group/team.
- 2–4 coaches.
- 20–50 players plus parents/guardians.

Translation rollout target during beta:
- English.
- Bahasa Melayu.
- Simplified Chinese.
- Expand Traditional Chinese and Hindi coverage before or around public launch based on review capacity.

Measure:
- activation/login success;
- schedule usefulness;
- attendance completion rate;
- parent usage;
- evaluation usage;
- event registration completion;
- notification reliability;
- localization issues;
- crashes/errors;
- KHERO/reward engagement;
- support burden.

Exit criteria:
- Core workflows are used consistently and major UX/security/reliability issues are addressed.

---

## Phase 13 — Store preparation and release candidate

**Goal:** Produce a compliant, frozen launch build.

Deliverables:
- Company-owned Apple/Google developer accounts.
- Final package identifiers.
- KHLIM/KHERO app icons and store artwork.
- Screenshots/descriptions/support resources.
- Privacy and Data Safety disclosures.
- Account deletion path.
- Review credentials/instructions.
- TestFlight / Play testing tracks.
- Signing credential ownership documentation.
- Final language/locale metadata.
- Production release checklist.

Feature freeze priorities:
- security/data-loss issues;
- crashes/broken core workflows;
- severe UX/localization issues;
- launch-blocking compliance defects.

---

## Phase 14 — KHLIM Basketball public launch

**Goal:** Launch progressively with rollback and incident visibility.

Recommended rollout:
1. Invited / small production cohort.
2. Expand after crash, API, login, notification, and data-health checks remain stable.
3. Full KHLIM Basketball availability.

Post-launch priorities:
- Reliability and usability first.
- Support and operational metrics.
- Structured player/parent/coach/admin feedback.
- Translation quality feedback.
- Cost/usage monitoring.
- Re-prioritize V1.x/V2 from observed behavior.

---

# Post-launch expansion roadmap

The following phases are **not prerequisites for KHLIM Basketball MVP 1.0**.

## Expansion A — Basketball maturity

Potential work:
- QR-assisted check-in with coach confirmation.
- Payments and registrations.
- Coach booking.
- richer competition brackets/results;
- game statistics;
- analytics;
- video workflows;
- richer KHERO achievements;
- automated parent summaries.

## Expansion B — Activate multi-sport capability

**Trigger:** KHLIM has a real second sport/program to onboard.

Work focuses on validating the abstractions already built rather than redesigning the core:
- Enable a second `Sport`.
- Create its development framework.
- Add sport-specific team/group terminology and configuration.
- Configure individual/team competition formats.
- Add coach assignments.
- Decide KHERO/mascot behavior for the new sport.
- Add sport switching where one athlete has multiple active sports.

Example:

```text
Athlete
 ├── Basketball
 │    └── U16 Main Team
 └── Badminton
      └── U17 Singles Development
```

## Expansion C — Cross-sport KHLIM ecosystem

Potential work:
- Unified athlete history across sports.
- Family calendar across children and sports.
- Cross-sport rewards or sport-specific reward wallets/rules.
- Organization-wide achievements.
- Multi-sport coach directory.
- Central KHLIM competition discovery.

## Expansion D — Advanced competition platform

Potential work:
- External registrations.
- Draws/brackets/heats.
- Team and individual results.
- eligibility checks;
- payment integration;
- competition staff roles;
- public event pages;
- result history.

## Expansion E — AI and automation

AI is introduced only after structured operational data exists.

Potential agents:
- Coach assistant for development summaries.
- Parent progress summaries.
- Admin scheduling/event assistance.
- Registration follow-up automation.
- Translation assistance with human review.
- Development recommendations requiring coach approval.

AI does not become the authoritative source for attendance, official evaluation, eligibility, or child-safety decisions.

## Expansion F — Optional external organization platform

Only pursue this if KHLIM deliberately wants to commercialize the platform for external academies/clubs.

This would introduce true multi-organization tenancy, organization-specific branding/configuration, billing, stronger tenant isolation, support tooling, and commercial operations.

It should **not** be prebuilt into the basketball MVP without a validated business case.
