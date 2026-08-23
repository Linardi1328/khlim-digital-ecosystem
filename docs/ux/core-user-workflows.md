# Core User Workflows

**Status:** Accepted for current MVP planning baseline

These workflows define the behavior the basketball MVP must make simple and reliable. Screen designs may change, but the business outcomes should remain stable unless product requirements change.

The basketball UI may say **Player** while the platform internally models that user as an **Athlete**.

## Player / Athlete

### 1. Daily/weekly home flow

```text
Open app
→ See next training/event
→ See current development focus
→ See KHERO points/reward progress
→ See important announcements/actions
```

Primary questions answered:
- What is next?
- How am I doing?
- What am I currently working on?
- What have I earned?
- Is anything important happening soon?

### 2. Training flow

```text
Schedule
→ Open training session
→ View time, venue, team, coach, notes/status
→ Attend session
→ Coach confirms attendance
→ Player sees attendance update
→ Rewards module may award points
```

The player does not self-author official attendance in MVP.

### 3. Development flow

```text
Progress
→ Basketball development framework
→ Current development priorities
→ Strengths
→ Latest coach-shared notes/evaluation
→ Evaluation history
```

The player cannot edit official evaluation content.

### 4. KHERO/reward flow

```text
KHERO
→ View mascot/profile
→ View points balance/history
→ View unlocked customization
→ Choose allowed customization
→ View eligible/upcoming rewards
→ Submit/complete permitted redemption flow
```

### 5. Competition/event flow

```text
Home / Schedule / Competitions
→ Open eligible event
→ View date, venue, category, deadline, status
→ See whether parent action is required
→ Receive updates if event changes
```

For a minor athlete, registration may be completed by an authorized guardian rather than the player.

### 6. Language flow

```text
Profile / Settings
→ Language
→ Select preferred locale
→ UI and system-generated messages render in selected language
```

A player language choice does not change the linked parent's language.

## Parent / Guardian

### 1. Family dashboard

```text
Open app
→ See linked children
→ See combined upcoming family schedule/actions
→ Select a child for detailed view
```

A parent with multiple children should not need separate accounts.

Future multi-sport behavior may combine schedules across a child's sports without changing the guardian relationship.

### 2. Child overview

```text
Select child
→ Next training/events
→ Attendance summary
→ Current development focus
→ Relevant announcements
→ Required event actions
→ Points/reward summary
```

### 3. Event response

```text
Notification/dashboard action
→ Open event
→ Review sport, date, venue, eligibility, deadline, notes
→ Register/interested OR decline
→ Confirmation
→ Coach/admin sees response
```

### 4. Event update flow

```text
Admin changes venue/time/status/deadline
→ Event record updated once
→ Relevant users see updated event
→ Notification generated for material change
→ Parent opens event for authoritative latest details
```

Cancelled events remain visible as cancelled rather than silently disappearing where history/clarity matters.

### 5. Progress supervision

```text
Child
→ Progress
→ Relevant sport framework
→ Latest shared evaluation
→ Strengths and development priorities
→ Historical updates
```

Internal coach notes are never displayed through this flow.

### 6. Coach enquiry

```text
Coach directory / assigned coach
→ View sport/specialization and service availability
→ Submit enquiry
→ Confirmation/status
```

MVP does not require instant booking or payment.

### 7. Family language behavior

Each account stores its own locale.

Example:

```text
Child: English
Mother: Simplified Chinese
Father: Bahasa Melayu
```

All three can reference the same underlying training/event data while system UI and templates render separately.

## Coach

### 1. Today's training and attendance

```text
Open app
→ Today's assigned sessions
→ Open session
→ Roster
→ Mark All Present (optional fast action)
→ Change exceptions to late / absent / excused
→ Review roster
→ Confirm attendance
```

The coach should be able to complete a normal roster quickly.

Example:

```text
Alex      Present
Ethan     Present
Jayden    Late
Caleb     Absent
Ryan      Excused

[Confirm Attendance]
```

After confirmation:

```text
Attendance becomes official
→ athlete history updates
→ parent visibility updates
→ AthleteAttendanceConfirmed event emitted
→ reward/notification consumers process independently
```

### 2. Attendance correction

```text
Open past/current session
→ Select athlete
→ Correct attendance
→ Enter/choose correction reason where required
→ Save
→ Audit metadata retained
→ downstream correction event processed safely
```

### 3. Future QR-assisted check-in

Not required for MVP.

Possible later flow:

```text
Coach starts temporary check-in
→ session-specific QR displayed
→ athlete scans QR
→ draft check-in appears on coach roster
→ coach reviews and confirms official attendance
```

QR check-in must not become an unaudited way to award attendance/reward credit automatically.

### 4. Athlete development update

```text
Team / roster
→ Athlete
→ Development profile
→ Relevant sport framework
→ Create/update evaluation
→ Set strengths/priorities
→ Add shared note and/or internal note
→ Save
```

The UI must make the visibility difference between shared and internal notes unmistakable.

### 5. Schedule

```text
Schedule
→ Upcoming assigned sessions/events
→ Open item for time, venue, team, notes/status
```

### 6. Private-training enquiries

```text
Coach services
→ Enquiries
→ Open family/athlete enquiry
→ Review details
→ Update allowed status / follow approved communication process
```

## Administrator

### 1. Onboard users and relationships

```text
Admin web
→ Create/import users
→ Assign roles
→ Create/enable sport (Basketball for MVP)
→ Create teams/rosters
→ Link guardians and athletes
→ Assign coaches to sport/teams
→ Verify relationships
```

### 2. Schedule recurring club operations

```text
Team / Training
→ Configure normal recurring pattern
→ Generate/maintain upcoming sessions
→ Modify individual exceptions as needed
→ Publish/update
→ relevant users see authoritative schedule
```

Examples of normal staff-managed changes:
- venue moved;
- training time changed;
- session cancelled;
- substitute coach assigned.

These changes must not require developer intervention or an App Store release.

### 3. Publish competition/event

```text
Events
→ Create draft
→ Choose Basketball
→ Choose team/individual format
→ Choose audience/eligibility
→ Add date, venue, registration window, details
→ Add translations where available
→ Preview
→ Publish
→ eligible users notified
→ monitor registrations/responses
```

### 4. Maintain event lifecycle

```text
Draft
→ Published / Registration Open
→ Registration Closed
→ Event Occurs
→ Completed
```

Alternative path:

```text
Published
→ Material change
→ Save update
→ targeted update notification
```

or:

```text
Published
→ Cancel
→ record reason
→ targeted cancellation notification
→ event retained as Cancelled
```

### 5. Selection announcement

```text
Selections/announcements
→ Define appropriate audience
→ Enter result/update
→ Add reviewed translations where needed
→ Preview visibility
→ Publish
```

Selection information must not accidentally become public to unrelated users.

### 6. Development framework administration

```text
Basketball
→ Development Framework
→ Add/reorder/deactivate criterion
→ Publish safe configuration change
→ coach evaluation UI reflects active framework
```

Historical evaluations should retain meaning even when a future framework version changes.

### 7. Reward administration

```text
Rewards
→ Configure reward/point rule
OR
→ Authorized manual point adjustment
→ Require reason
→ Save
→ Audit record created
```

## Cross-role notification flow

```text
Domain event occurs
→ determine recipients/audience
→ Notification module checks preferences + severity
→ select recipient locale
→ render approved template/fallback
→ in-app notification created
→ push notification sent when appropriate
→ user opens destination screen
```

Operational modules should not directly implement third-party push-provider logic.

## How information stays current

The platform uses three update sources:

| Update source | Example |
| --- | --- |
| Authorized staff/manual operations | Admin publishes competition; coach writes evaluation |
| User transactions | Parent registers child; coach confirms attendance |
| Automated system behavior | Registration closes; reminder is scheduled; reward points awarded |

The goal is **enter authoritative information once, then render the appropriate view to every authorized user**.

## End-to-end MVP validation journeys

Before launch, automated/manual test plans should cover at least:

1. Admin enables Basketball, creates a team, links athlete/guardian, assigns coach, and schedules training.
2. Parent and player see the correct session; unrelated family cannot see it.
3. Coach uses fast roster marking and confirms attendance.
4. Attendance history updates for player/parent and emits the trusted event.
5. Attendance event awards configured points exactly once.
6. Coach writes a shared note and an internal note; player/parent only see the shared note.
7. Admin publishes an event; eligible family responds; coach/admin sees response.
8. Admin changes an event venue; affected users receive the updated authoritative details.
9. Admin cancels an event; it remains visibly cancelled and notifications are delivered.
10. Guardian link is removed; former guardian immediately loses child access.
11. Two linked users with different locales see localized UI without changing permissions or source data.
12. Missing translation falls back safely to English instead of exposing raw translation keys.
13. Player account deletion/deactivation follows the approved data/account lifecycle.
14. Admin point adjustment is traceable to actor and reason.
15. Core identity/family tests do not depend on Basketball-only fields, preserving the future path to another sport.
