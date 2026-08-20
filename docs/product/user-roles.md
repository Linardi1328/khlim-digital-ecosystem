# User Roles and Permission Model

**Status:** Draft

The product has four primary roles. Role checks alone are not enough; access must also be limited by relationships such as linked children, assigned teams, and administrative scope.

## Player

### Can
- View and update allowed parts of their own profile.
- View their teams and training schedule.
- View their own attendance history.
- View coach-shared development information.
- View and customize allowed KHERO attributes.
- View their KHERO points, reward history, and eligible rewards.
- View events, competitions, and announcements relevant to them.
- View appropriate coach profiles and approved enquiry options.

### Cannot
- Edit official attendance.
- Edit official coach evaluations.
- View internal coach notes.
- View another player's private information unless a future explicitly approved feature requires it.
- Award or modify their own points.

## Parent / Guardian

A guardian account may be linked to multiple players. A player may have multiple authorized guardians.

### Can
- Switch between linked children.
- View linked children's schedules and attendance.
- View coach-shared progress and development priorities.
- View relevant events, deadlines, selections, and announcements.
- Submit permitted event responses or registrations for linked children.
- View KHERO points and rewards for linked children.
- Maintain approved guardian-controlled information.
- Submit coach/private-training enquiries where allowed.

### Cannot
- View unlinked players.
- Edit official evaluations or attendance.
- View internal coach notes.
- Directly manipulate point balances.

## Coach

Coach access should be scoped to teams, sessions, or players they are authorized to manage.

### Can
- View assigned training sessions and rosters.
- Record or correct attendance within allowed rules.
- View authorized player profiles.
- Create and update official player evaluations.
- Set development priorities.
- Create shared development notes.
- Create internal coaching notes.
- View relevant team events and announcements.
- Maintain approved coach profile/service information.
- Receive relevant private-training enquiries.

### Cannot
- Access unrelated players by default.
- Modify club-wide roles/permissions unless separately granted admin privileges.
- Modify point balances outside explicitly authorized workflows.

## Administrator

Administrative permissions should be granular enough to support future staff roles rather than assuming every administrator needs unrestricted access.

### Can
- Manage users, roles, teams, rosters, and family links.
- Manage schedules, events, selections, announcements, development frameworks, and rewards.
- Review operational data and audit history appropriate to their privilege level.
- Perform authorized point adjustments with a required reason.
- Manage coach-service information and enquiries.

### Requirements
- Strong authentication, preferably MFA.
- Sensitive actions should be audit logged.
- High-risk operations should require explicit permissions.

## Permission principles

1. **Deny by default.** Access exists only when a rule explicitly allows it.
2. **Enforce on the server.** Hidden UI is never a security boundary.
3. **Relationship-aware access.** A parent role does not grant access to every child; a coach role does not grant access to every player.
4. **Least privilege.** Give each user only the access required for their responsibility.
5. **Separate shared and internal data.** Coach-internal notes must use different authorization rules from family-visible progress.
6. **Audit sensitive mutations.** Role changes, family links, evaluations, attendance corrections, point adjustments, and similar actions should be attributable.
7. **Plan for age-aware policies.** The data model should allow future permission differences based on player age and applicable policy without redesigning account relationships.

## Relationship model

```text
Parent / Guardian ──< GuardianPlayerLink >── Player

Coach ──< CoachTeamAssignment >── Team ──< TeamMembership >── Player
```

These explicit relationship records should carry status and audit metadata rather than being represented as loose arrays on a user record.
