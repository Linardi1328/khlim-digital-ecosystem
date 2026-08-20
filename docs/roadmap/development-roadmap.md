# Development Roadmap

**Status:** Draft  
**Objective:** Move from product definition to a controlled public App Store / Play Store launch without tightly coupling future features to MVP implementation.

> The sequence is more important than the exact calendar duration. Phase estimates assume a small development team and should be revised once staffing, stack, and design assets are known.

## Phase 0 — Product and UX definition

**Goal:** Freeze MVP 1.0 behavior before implementation.

Deliverables:
- Product brief and MVP scope.
- User-role and permission matrix.
- Screen inventory and navigation model.
- Player, parent, coach, and admin workflows.
- KHLIM/KHERO visual design system once official assets are supplied.
- Initial data model.
- Acceptance criteria for critical workflows.
- Analytics/event measurement plan.

Exit criteria:
- Stakeholders agree on MVP boundaries.
- Core workflows are understandable without code.
- Open product risks are documented.

## Phase 1 — Engineering foundation

**Goal:** Establish a maintainable development platform.

Deliverables:
- Final stack decision.
- Monorepo/workspace structure.
- Mobile app scaffold.
- Admin web app scaffold.
- Backend/API scaffold.
- Shared types/configuration.
- Development, staging, and production environment strategy.
- Database migration tooling.
- Test framework.
- CI checks for linting, type checks, tests, and builds.
- Secrets-management approach.
- Baseline observability.

Exit criteria:
- A change can be developed, tested, reviewed, and deployed to staging predictably.

## Phase 2 — Identity, roles, and families

**Goal:** Make access trustworthy before building sensitive features.

Deliverables:
- Authentication.
- Player, parent/guardian, coach, and admin roles.
- Parent/guardian-to-player links.
- Coach-to-team assignments.
- Server-side authorization policies.
- User/profile basics.
- Session lifecycle and logout.
- Admin MFA requirement or equivalent strong control.
- Permission-focused automated tests.

Exit criteria:
- Users can only access data permitted by role and relationship.

## Phase 3 — Club operations

**Goal:** Make the app operationally useful to KHLIM.

Deliverables:
- Teams and memberships.
- Training sessions.
- Coach assignments.
- Player/parent/coach schedule views.
- Coach roster view.
- Attendance statuses: present, absent, late, excused.
- Attendance history.
- Domain event for confirmed attendance.

Exit criteria:
- A real team can run a training week using the app without a parallel attendance tool.

## Phase 4 — Player development

**Goal:** Establish structured, coach-owned development history.

Deliverables:
- Configurable development categories.
- Evaluations and rating/assessment model.
- Strengths and development priorities.
- Shared progress notes.
- Internal coach notes with separate authorization.
- Evaluation history.
- Parent/player progress views.

Exit criteria:
- Coaches can maintain useful player development information without excessive admin burden.

## Phase 5 — KHERO, points, and rewards

**Goal:** Add engagement without coupling gamification to operational modules.

Deliverables:
- KHERO profile and controlled customization.
- Official KHLIM/KHERO visual assets integrated according to approved design rules.
- Point transaction ledger.
- Reward definitions and eligibility.
- Attendance-driven point rule as an initial event consumer.
- Reward redemption flow.
- Player and parent reward visibility.

Exit criteria:
- Point history is auditable and KHERO/rewards can change without modifying attendance internals.

## Phase 6 — Events, competitions, selections, and notifications

**Goal:** Centralize important club communication and family actions.

Deliverables:
- Generic event model.
- Competitions, trials, camps, club events, and deadlines.
- Parent event response/registration action.
- Selection announcements with controlled visibility.
- Club/team/player-targeted announcements.
- In-app notifications.
- Push notifications.
- Notification preferences for non-critical categories.

Exit criteria:
- A real competition or selection workflow can be coordinated through the platform.

## Phase 7 — Coach services

**Goal:** Support approved private-training and consultation enquiries without prematurely building a marketplace.

Deliverables:
- Coach directory.
- Specializations and service availability.
- Enquiry submission.
- Coach/admin enquiry view and status.

Exit criteria:
- Families can discover relevant approved coaching services and submit a traceable enquiry.

## Phase 8 — Admin platform

**Goal:** Give club staff proper operational control outside the mobile app.

Deliverables:
- User and family-link management.
- Teams, rosters, and schedules.
- Attendance oversight.
- Development framework configuration.
- Event, selection, and announcement management.
- Point/reward administration.
- Coach-service enquiry oversight.
- Audit log viewer.
- Bulk import tools where needed.

Exit criteria:
- Routine club operations no longer require developer intervention.

## Phase 9 — Security and production hardening

**Goal:** Prepare the system for real families and minors' information.

Deliverables:
- Threat review.
- Authorization test suite.
- Rate limiting and abuse controls.
- Secure secret handling.
- Database backup and restore test.
- Audit coverage review.
- Production logging and alerting.
- Data-retention rules.
- Account deletion flow.
- Privacy/terms drafts and data inventory.
- Dependency and third-party SDK review.
- Performance testing for expected launch load.

Exit criteria:
- Critical security, privacy, recovery, and observability requirements are verified rather than assumed.

## Phase 10 — Internal alpha

**Goal:** Break the product internally before families do.

Participants:
- Developers.
- Club management.
- Small number of coaches/staff.

Test end-to-end flows such as:

```text
Create team → schedule training → assign coach/player → parent sees schedule
→ coach records attendance → point event processed → parent/player sees update
```

Exit criteria:
- No unresolved blocker-level failures in core workflows.

## Phase 11 — Club beta

**Goal:** Validate the product with one controlled real-world cohort.

Suggested cohort:
- 1 age group/team.
- 2–4 coaches.
- 20–50 players plus their parents/guardians.

Measure:
- activation and login success;
- attendance completion rate;
- parent schedule/event usage;
- progress/evaluation usage;
- notification reliability;
- crashes/errors;
- KHERO/reward engagement;
- support requests and confusion points.

Exit criteria:
- Core workflows are used consistently and major UX/security/reliability issues are addressed.

## Phase 12 — Store preparation

**Goal:** Prepare release artifacts and compliance information.

Deliverables:
- Company-owned Apple and Google developer accounts.
- Final app name/package identifiers.
- Icons, screenshots, descriptions, and support resources.
- Privacy disclosures / Data Safety information.
- Account deletion path.
- Review credentials and instructions.
- TestFlight and Play testing tracks.
- Release signing and credential ownership documentation.

Exit criteria:
- Release candidate can be submitted without unresolved compliance or ownership blockers.

## Phase 13 — Release candidate

**Goal:** Freeze features and validate production behavior.

Only release-blocking defects should change the build:
- security/data-loss issues;
- crashes and broken core workflows;
- severe launch-blocking UX defects.

Required verification:
- authentication and account recovery;
- family linking and permission boundaries;
- schedules and attendance;
- development data visibility;
- events and announcements;
- points/rewards integrity;
- notifications;
- account deletion;
- backups/restoration;
- monitoring and alerting.

## Phase 14 — Public launch

**Goal:** Launch progressively and retain rollback/incident visibility.

Recommended rollout:
1. Small production percentage / invited launch group.
2. Expand after crash, API, login, notification, and data-health checks remain stable.
3. Full availability.

Post-launch priorities:
- Monitor support and operational metrics daily during early launch.
- Fix reliability and usability before adding major new capabilities.
- Gather structured feedback from players, parents, coaches, and admins.
- Re-prioritize V1.x/V2 from observed behavior rather than assumptions.

## Future development tracks

The modular architecture should allow future tracks such as:
- payments and commerce;
- full coach booking;
- richer analytics;
- performance/game-stat integrations;
- video analysis;
- AI parent summaries;
- coach-assistant workflows;
- AI development suggestions requiring coach review/approval;
- administrative automation agents.

Future tracks should integrate through APIs/domain events instead of taking direct ownership of unrelated modules' data.
