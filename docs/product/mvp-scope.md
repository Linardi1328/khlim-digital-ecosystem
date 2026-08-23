# MVP Scope

**Status:** Accepted for current planning baseline

## Goal

Ship a production-ready first public version for **KHLIM Basketball** that solves the highest-value recurring workflows for players, parents/guardians, coaches, and administrators without implementing speculative multi-sport complexity.

The delivery sequence is **player-first**, but public MVP 1.0 is not considered complete until the supporting coach, parent, and admin workflows required to keep player information trustworthy are operational.

## Scope rule

MVP 1.0 is basketball-specific in the user experience. The core data and module contracts should nevertheless support a future `Sport` dimension, athlete identity, configurable development frameworks, and generic competition formats.

No additional sport needs to be visible or fully implemented before the basketball product succeeds.

## In scope

### 1. Identity and access

- Secure account authentication.
- Roles: Player/Athlete, Parent/Guardian, Coach, Administrator.
- Server-side authorization for every protected action.
- Parent/guardian-to-athlete linking supporting multiple guardians and multiple children.
- Coach access limited to authorized sports, teams/groups, sessions, and athletes.
- Admin access with stronger authentication requirements.
- A user may hold more than one role in the future without requiring duplicate accounts.

### 2. Sport-aware foundation

- A `Sport` concept exists in the core model from the start.
- Basketball is the only enabled end-user sport for MVP 1.0.
- Teams/groups, development frameworks, sessions, and competitions can reference a sport.
- Internal domain naming prefers `Athlete`; the basketball UI may display `Player`.
- No multi-sport switcher is required in MVP 1.0.

### 3. Profiles

#### Player / Athlete
- Basic athlete profile.
- Basketball team/age-group membership.
- Basketball-related profile fields kept outside overly generic identity fields where practical.
- Minimal academic context where the club has a legitimate use.
- KHERO profile.
- Preferred interface locale.

#### Parent / Guardian
- Account profile.
- Linked children.
- Editable guardian-controlled contact/emergency information where appropriate.
- Preferred interface locale independent of the child's locale.

#### Coach
- Coach profile.
- Sport, role, and specialization information.
- Approved contact/enquiry pathway.
- Private training / consultation availability indicator.
- Preferred interface locale.

### 4. Teams and training

- Basketball team creation and membership.
- Season-aware design where historical membership matters.
- Training session schedule.
- Assigned coaches.
- Venue, start/end time, status, and notes.
- Player, parent, and coach schedule views.
- Recurring schedule support or an equivalent admin workflow that avoids manually recreating every weekly session.

### 5. Attendance

- Coach roster view.
- Primary MVP method: coach marks attendance in the app.
- Fast actions such as **Mark All Present** followed by exception editing.
- Present, absent, late, and excused statuses.
- Coach confirmation before attendance becomes official.
- Attendance history.
- Parent visibility for linked children.
- Trusted attendance event that other modules can react to.
- Auditable corrections.

Future QR/NFC/kiosk check-in may create a draft check-in signal, but it is **not required for MVP** and must not bypass coach confirmation of official attendance.

### 6. Athlete development

- Sport-specific, configurable development framework.
- Basketball criteria can include shooting, finishing, ball handling, passing, defense, basketball IQ, athleticism, mental/discipline, and future club-defined criteria.
- Coach-created evaluations.
- Strengths and current development priorities.
- Shared progress notes visible to authorized athlete/guardian users.
- Internal coach notes visible only to authorized staff.
- Evaluation history.
- Framework changes should not require a mobile release where safe configuration is sufficient.

### 7. KHERO identity

- Personal KHERO profile for eligible basketball players.
- Controlled customization using official KHLIM/KHERO assets.
- MVP customization may include jersey number, approved jersey variants, backgrounds, and limited accessories/achievement items.
- KHERO remains a presentation/engagement domain and must not own official attendance or evaluation truth.
- The long-term relationship between KHERO and future non-basketball sports remains an open product choice.

### 8. Points and rewards

- Append-only or auditable point transaction ledger.
- Configurable point-award rules.
- Confirmed practice attendance as an initial trusted point source.
- Reward catalogue.
- Reward redemption workflow with auditable balance changes.
- Parent visibility into a linked child's balance and reward activity.
- Architecture must allow future sport-specific or organization-wide reward policies.

### 9. Events, competitions, and selections

- Generic event/competition model supporting competitions, club events, trials, camps, selections, and related activities.
- Sport reference.
- Team or individual participation format where relevant.
- Event details, venue, dates, deadlines, status, eligibility, and targeting.
- Parent response: register/interested, decline, or similar MVP action.
- Selection/team announcements with controlled visibility.
- Admins can publish, modify, cancel, and complete events without requiring an app release.
- Important event changes can trigger targeted notifications.

### 10. Announcements and notifications

- Club-wide announcements.
- Team-targeted announcements.
- Player/family-specific updates where appropriate.
- In-app notifications.
- Push notifications for important operational events.
- User preferences for non-critical notification categories.
- System-generated notifications rendered using the recipient's preferred locale where translations exist.

### 11. Multilingual foundation

Architecture and UI must support:

- English (`en`)
- Bahasa Melayu (`ms`)
- Simplified Chinese (`zh-Hans`)
- Traditional Chinese (`zh-Hant`)
- Hindi (`hi`)

English is the canonical fallback. Translation rollout may be progressive during alpha/beta, but user-facing text must use localization keys from the first production screens.

A dedicated Cantonese locale (`yue-Hant`) is a future option if validated. Traditional Chinese is not treated as equivalent to Cantonese.

### 12. Coach services

- Coach directory.
- Sport/specialization details.
- Private-training or consultation enquiry submission.
- Admin/coach visibility of enquiries.
- No integrated scheduling marketplace or payment in MVP.

### 13. Admin web application

- User and relationship management.
- Sport configuration with Basketball enabled for MVP.
- Team, roster, season, and schedule management.
- Attendance oversight.
- Development framework configuration.
- Events, competitions, selections, and announcements.
- Points/rewards administration.
- Coach-service enquiry oversight.
- Audit log access for sensitive administrative actions.
- Bulk import support where practical.
- Locale-aware content entry where translated club-authored content is supported.

### 14. Production readiness

- Development, staging, and production environments.
- Automated tests for critical workflows and permissions.
- CI/CD.
- Error/crash reporting.
- API and infrastructure monitoring.
- Database backups and documented restore procedure.
- Secure secrets management.
- Privacy policy and terms preparation.
- Account deletion workflow.
- Data retention rules.
- Store listing and release preparation.

## Explicitly out of scope for MVP 1.0

- Additional enabled sports in the public app.
- Cross-sport athlete dashboard.
- External-club / multi-organization SaaS tenancy.
- Public competition marketplace.
- Full merchandise store.
- Online payments.
- Complete coach booking calendar.
- Public athlete-to-athlete social feed.
- Open direct messaging.
- Advanced match statistics.
- Video analysis.
- Wearables.
- QR-only attendance or automatic attendance without coach confirmation.
- AI-generated official performance evaluations.
- Autonomous development-plan decisions.
- Public ranking/leaderboard of youth athletes.

## MVP release criterion

MVP 1.0 is ready for public launch only when the basketball workflows for all four user groups are reliable, permission boundaries have been tested, localization foundations are in place, operational monitoring is active, and the club can keep schedules, attendance, development information, competitions/events, and announcements current without developer intervention.
