# Core User Workflows

**Status:** Draft

These workflows define the behavior the MVP must make simple and reliable. Screen designs may change, but the business outcome should remain stable unless the product requirements change.

## Player

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
→ Coach records attendance
→ Player sees updated attendance/points when processed
```

### 3. Development flow

```text
Progress
→ Current development priorities
→ Strengths
→ Latest coach-shared notes/evaluation
→ Evaluation history
```

Player cannot edit official evaluation content.

### 4. KHERO/reward flow

```text
KHERO
→ View current mascot/profile
→ View points balance/history
→ View unlocked customization
→ Choose allowed customization
→ View eligible/upcoming rewards
→ Submit/complete permitted redemption flow
```

## Parent / Guardian

### 1. Family dashboard

```text
Open app
→ See linked children
→ See combined upcoming family schedule/actions
→ Select a child for detailed view
```

A parent with multiple children should not need to log into separate accounts.

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
→ Review date, venue, eligibility, deadline, notes
→ Register/interested OR decline
→ Confirmation
→ Coach/admin sees response
```

### 4. Progress supervision

```text
Child
→ Progress
→ Latest shared evaluation
→ Strengths and development priorities
→ Historical updates
```

Internal coach notes are never displayed through this flow.

### 5. Coach enquiry

```text
Coach directory / assigned coach
→ View specialization/service availability
→ Submit enquiry
→ Confirmation/status
```

MVP does not require instant booking or payment.

## Coach

### 1. Today's training

```text
Open app
→ Today's assigned sessions
→ Open session
→ Roster
→ Mark present / absent / late / excused
→ Confirm attendance
```

The workflow should minimize taps and support quick correction with auditability.

### 2. Player development update

```text
Team / roster
→ Player
→ Development profile
→ Create/update evaluation
→ Set strengths/priorities
→ Add shared note and/or internal note
→ Save
```

The UI must make the visibility difference between shared and internal notes extremely clear.

### 3. Schedule

```text
Schedule
→ Upcoming assigned sessions/events
→ Open item for time, venue, team, notes/status
```

### 4. Private-training enquiries

```text
Coach services
→ Enquiries
→ Open family/player enquiry
→ Review details
→ Update allowed status / follow approved communication process
```

## Administrator

### 1. Onboard users and relationships

```text
Admin web
→ Create/import users
→ Assign roles
→ Create teams/rosters
→ Link guardians and players
→ Assign coaches to teams
→ Verify relationships
```

### 2. Schedule club operations

```text
Teams/training
→ Create session
→ Assign team/coach/venue/time
→ Publish
→ Relevant users receive schedule update
```

### 3. Publish competition/event

```text
Events
→ Create event
→ Choose audience/eligibility
→ Add date, venue, deadline, details
→ Publish
→ Families receive notification
→ Monitor responses
```

### 4. Selection announcement

```text
Selections/announcements
→ Define appropriate audience
→ Enter result/update
→ Preview visibility
→ Publish
```

Selection information must not accidentally become public to unrelated users.

### 5. Reward administration

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
→ Notification module checks audience + preferences + severity
→ In-app notification created
→ Push notification sent when appropriate
→ User opens destination screen
```

Operational modules should not directly implement third-party push-provider logic.

## End-to-end MVP validation journeys

Before launch, automated/manual test plans should cover at least:

1. Admin creates a team, links player/guardian, assigns coach, schedules training.
2. Parent and player see the correct session; unrelated family cannot see it.
3. Coach records attendance; attendance history updates.
4. Attendance event awards the configured points exactly once.
5. Player/parent see updated points without gaining edit access.
6. Coach writes a shared note and an internal note; player/parent only see the shared note.
7. Admin publishes an event; eligible family responds; coach/admin sees response.
8. Guardian link is removed; former guardian immediately loses child access.
9. Player account deletion/deactivation follows the approved data/account lifecycle.
10. Admin point adjustment is traceable to actor and reason.
