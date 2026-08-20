# Module Boundaries

**Status:** Draft

The backend begins as a modular monolith. These boundaries exist to prevent unrelated features from becoming tightly coupled as the app grows.

## Identity

Owns:
- authentication identity mapping;
- account lifecycle;
- sessions/authentication integration;
- role assignments or role references.

Does not own:
- player development;
- family relationships;
- team membership.

## Profiles

Owns:
- user-facing profile information;
- player profile fields;
- coach public/professional profile fields.

Does not own:
- authentication credentials;
- official evaluations;
- KHERO state.

## Family

Owns:
- parent/guardian-to-player relationships;
- relationship status and approval metadata;
- family-link lifecycle.

Publishes examples:
- `GuardianLinkedToPlayer`
- `GuardianUnlinkedFromPlayer`

## Teams

Owns:
- teams/age groups;
- player team membership;
- coach team assignments.

Does not own:
- training attendance;
- competition registration.

## Training

Owns:
- training session definition;
- schedule, venue, timing, status;
- assigned team and coach references.

Publishes examples:
- `TrainingSessionCreated`
- `TrainingSessionChanged`
- `TrainingSessionCancelled`

## Attendance

Owns:
- attendance record and status;
- attendance correction metadata;
- attendance history.

Publishes examples:
- `PlayerAttendanceConfirmed`
- `PlayerAttendanceCorrected`

Does not:
- directly update reward balances;
- directly unlock KHERO cosmetics.

## Development

Owns:
- development category definitions;
- player evaluations;
- strengths and development priorities;
- shared progress notes;
- internal coaching notes;
- evaluation history.

Critical boundary:
- shared notes and internal notes use distinct authorization rules.

## Events

Owns:
- competitions, trials, camps, personal events, and club events;
- deadlines;
- eligibility/targeting references;
- family/player responses or registrations.

Publishes examples:
- `EventPublished`
- `EventRegistrationUpdated`

## Announcements

Owns:
- announcements;
- audience targeting;
- selection announcements and controlled visibility.

It should not become a general social network in MVP.

## KHERO

Owns:
- player's KHERO profile;
- selected approved cosmetic state;
- unlocked cosmetic/achievement references.

Consumes relevant events from other modules but should not own attendance, points, or evaluation truth.

## Rewards

Owns:
- point transaction ledger;
- point rules;
- reward catalogue;
- redemption state;
- auditable adjustments.

Publishes examples:
- `PointsAwarded`
- `PointsDeducted`
- `RewardRedeemed`

Important rule:
- point balance is derived from or reconciled against auditable transactions, not a context-free mutable number.

## Coach Services

Owns:
- approved coach service offerings;
- availability indicator/status for enquiry purposes;
- private-training/consultation enquiries;
- enquiry status.

MVP boundary:
- no payments or full scheduling marketplace.

## Notifications

Owns:
- notification preferences;
- notification delivery requests/history;
- push/in-app dispatch logic;
- templates/categories.

Consumes domain events from operational modules instead of operational modules directly calling third-party push providers.

## Audit

Owns:
- append-oriented records of sensitive administrative or staff actions;
- actor, target, action type, timestamp, and safe contextual metadata.

Audit records should avoid unnecessarily duplicating sensitive data.

## Cross-module rules

1. A module should not write another module's tables directly through ad hoc code.
2. Cross-module reads should use defined query/application interfaces when practical.
3. Cross-module side effects should prefer domain events where immediate transactional coupling is unnecessary.
4. Events should represent completed business facts, not UI clicks.
5. Event consumers must tolerate duplicate delivery where infrastructure can retry.
6. Sensitive decisions remain authorization-checked at the point of execution, even when initiated by another internal module.
7. UI screens may combine data from multiple modules through API orchestration, but that does not transfer data ownership.

## Future modules

Possible later additions include Commerce, Payments, Coach Booking, Game Statistics, Video Analysis, AI Assistance, and Agent Automation. Each must integrate through existing contracts/events rather than bypassing module ownership.
