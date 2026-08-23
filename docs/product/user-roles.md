# User Roles and Permission Model

**Status:** Accepted for current planning baseline

The product has four primary user roles. Role checks alone are not enough; access must also be limited by relationships such as linked children, assigned sports, teams/groups, sessions, and administrative scope.

A single account may hold more than one role where legitimate. For example, a KHLIM coach may also be a parent. The application can expose role-aware navigation or a future mode switch without requiring duplicate accounts.

## Player / Athlete

The basketball UI uses **Player**. The internal platform concept is **Athlete** so the same identity can participate in additional sports later.

### Can
- View and update allowed parts of their own profile.
- View sports and teams/groups relevant to their memberships.
- View their training schedule.
- View their own attendance history.
- View coach-shared development information for the relevant sport/framework.
- View and customize allowed KHERO attributes where eligible.
- View their points, reward history, and eligible rewards.
- View events, competitions, selections, and announcements relevant to them.
- View appropriate coach profiles and approved enquiry options.
- Choose their preferred interface locale.

### Cannot
- Edit official attendance.
- Edit official coach evaluations.
- View internal coach notes.
- View another athlete's private information unless a future explicitly approved feature requires it.
- Award or modify their own points.
- Gain access to another sport/team merely because the account has an Athlete role.

## Parent / Guardian

A guardian account may be linked to multiple athletes. An athlete may have multiple authorized guardians. The relationship is independent of sport so the same family link remains usable if a child joins another KHLIM sport later.

### Can
- Switch between linked children.
- View linked children's relevant sports, teams/groups, schedules, and attendance.
- View coach-shared progress and development priorities.
- View relevant events, deadlines, selections, and announcements.
- Submit permitted event responses or registrations for linked children.
- View points and rewards for linked children.
- Maintain approved guardian-controlled information.
- Submit coach/private-training enquiries where allowed.
- Choose a preferred interface locale independently of the linked child.

### Cannot
- View unlinked athletes.
- Edit official evaluations or attendance.
- View internal coach notes.
- Directly manipulate point balances.
- Gain access to all club sports merely because a linked child participates in one sport.

## Coach

Coach access is scoped to sports, teams/groups, sessions, and athletes they are authorized to manage.

### Can
- View assigned training sessions and rosters.
- Record or correct attendance within allowed rules.
- Confirm official attendance.
- View authorized athlete profiles.
- Create and update official athlete evaluations under the appropriate sport development framework.
- Set development priorities.
- Create shared development notes.
- Create internal coaching notes.
- View relevant team/sport events and announcements.
- Maintain approved coach profile/service information.
- Receive relevant private-training enquiries.
- Choose a preferred interface locale.

### Cannot
- Access unrelated athletes by default.
- Access a different sport merely because they are a coach in another sport.
- Modify club-wide roles/permissions unless separately granted admin privileges.
- Modify point balances outside explicitly authorized workflows.

## Administrator

Administrative permissions should be granular enough to support future staff roles rather than assuming every administrator needs unrestricted access.

### Can
- Manage users, roles, sports, teams/groups, rosters, seasons, and family links.
- Manage schedules, events, competitions, selections, announcements, development frameworks, and rewards.
- Review operational data and audit history appropriate to their privilege level.
- Perform authorized point adjustments with a required reason.
- Manage coach-service information and enquiries.
- Publish and update operational content without developer intervention.
- Manage approved locale variants for club-authored content where localization is enabled.

### Requirements
- Strong authentication, preferably MFA.
- Sensitive actions should be audit logged.
- High-risk operations should require explicit permissions.
- Administrative access should be capable of being scoped by sport or operational responsibility in the future.

## Permission principles

1. **Deny by default.** Access exists only when a rule explicitly allows it.
2. **Enforce on the server.** Hidden UI is never a security boundary.
3. **Relationship-aware access.** A parent role does not grant access to every child; a coach role does not grant access to every athlete.
4. **Sport-aware scope.** Sport/team assignments are part of authorization where applicable.
5. **Least privilege.** Give each user only the access required for their responsibility.
6. **Separate shared and internal data.** Coach-internal notes must use different authorization rules from family-visible progress.
7. **Audit sensitive mutations.** Role changes, family links, evaluations, attendance corrections, point adjustments, and similar actions should be attributable.
8. **Plan for age-aware policies.** The data model should allow future permission differences based on athlete age and applicable policy without redesigning account relationships.
9. **Locale is presentation, not authorization.** Changing language must never change what data a user is allowed to access.

## Relationship model

```text
Parent / Guardian ──< GuardianAthleteLink >── Athlete

Sport ──< Team / Group ──< TeamMembership >── Athlete

Coach ──< CoachAssignment >── Sport / Team / Group / Session
```

These explicit relationship records should carry status and audit metadata rather than being represented as loose arrays on a user record.
