# MVP Scope

**Status:** Draft

## Goal

Ship a production-ready first version that solves the highest-value recurring workflows for KHLIM players, parents/guardians, coaches, and administrators without overbuilding future capabilities.

## In scope

### 1. Identity and access

- Secure account authentication.
- Roles: Player, Parent/Guardian, Coach, Administrator.
- Server-side authorization for every protected action.
- Parent/guardian-to-player linking supporting multiple guardians and multiple children.
- Coach access limited to authorized teams/players.
- Admin access with stronger authentication requirements.

### 2. Profiles

#### Player
- Basic player profile.
- Team/age-group membership.
- Basketball-related profile fields.
- Minimal academic context where the club has a legitimate use.
- KHERO profile.

#### Parent / Guardian
- Account profile.
- Linked children.
- Editable guardian-controlled contact/emergency information where appropriate.

#### Coach
- Coach profile.
- Role and specialization.
- Approved contact/enquiry pathway.
- Private training / consultation availability indicator.

### 3. Teams and training

- Team creation and membership.
- Training session schedule.
- Assigned coaches.
- Venue, start/end time, status, and notes.
- Player, parent, and coach schedule views.

### 4. Attendance

- Coach roster view.
- Present, absent, late, and excused statuses.
- Attendance history.
- Parent visibility for linked children.
- Trusted attendance event that other modules can react to.

### 5. Player development

- Configurable development categories.
- Coach-created evaluations.
- Strengths and current development priorities.
- Shared progress notes visible to authorized player/guardian users.
- Internal coach notes visible only to authorized staff.
- Evaluation history.

### 6. KHERO identity

- Personal KHERO profile.
- Controlled customization using approved club assets.
- MVP customization may include jersey number, approved jersey variants, backgrounds, and limited accessories/achievement items.
- Final visual rules depend on official KHLIM/KHERO design assets.

### 7. Points and rewards

- Append-only or auditable point transaction ledger.
- Configurable point-award rules.
- Practice attendance as an initial trusted point source.
- Reward catalogue.
- Reward redemption workflow with auditable balance changes.
- Parent visibility into a linked child's balance and reward activity.

### 8. Events, competitions, and selections

- Generic event model supporting competitions, club events, trials, camps, and related activities.
- Event details and deadlines.
- Team/age-group targeting.
- Parent response: register/interested, decline, or similar MVP action.
- Selection/team announcements with controlled visibility.

### 9. Announcements and notifications

- Club-wide announcements.
- Team-targeted announcements.
- Player-specific updates where appropriate.
- In-app notifications.
- Push notifications for important operational events.
- User preferences for non-critical notification categories.

### 10. Coach services

- Coach directory.
- Service/specialization details.
- Private-training or consultation enquiry submission.
- Admin/coach visibility of enquiries.
- No integrated scheduling marketplace or payment in MVP.

### 11. Admin web application

- User and relationship management.
- Team and roster management.
- Training schedule management.
- Attendance oversight.
- Development framework configuration.
- Events, selections, and announcements.
- Points/rewards administration.
- Coach-service enquiry oversight.
- Audit log access for sensitive administrative actions.
- Bulk import support where practical.

### 12. Production readiness

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

## Explicitly out of scope for MVP

- Full merchandise store.
- Online payments.
- Complete coach booking calendar.
- Public player-to-player social feed.
- Open direct messaging.
- Advanced match statistics.
- Video analysis.
- Wearables.
- AI-generated official performance evaluations.
- Autonomous development-plan decisions.
- Public ranking/leaderboard of youth players.

## MVP release criterion

MVP 1.0 is ready for public launch only when the end-to-end workflows for all four user roles are reliable, permission boundaries have been tested, operational monitoring is active, and the club can recover from common failures without developer intervention.
