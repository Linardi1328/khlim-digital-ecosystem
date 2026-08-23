# Module Boundaries

**Status:** Accepted for Phase 1 baseline

The backend begins as a modular monolith. These boundaries exist to prevent unrelated features from becoming tightly coupled as KHLIM grows from a basketball app into a potentially broader sports and competition platform.

## Identity

Owns:
- authentication identity mapping;
- account lifecycle;
- sessions/authentication integration;
- role assignments or role references.

Does not own:
- athlete development;
- family relationships;
- sport/team membership;
- locale translation resources beyond a user's selected locale reference.

## Profiles / Athletes

Owns:
- user-facing profile information;
- athlete profile fields common across sports;
- coach public/professional profile fields.

Does not own:
- authentication credentials;
- sport participation truth;
- official evaluations;
- KHERO state.

Important rule:
- basketball-specific attributes should not automatically become universal AthleteProfile fields.

## Family

Owns:
- parent/guardian-to-athlete relationships;
- relationship status and approval metadata;
- family-link lifecycle.

Publishes examples:
- `GuardianLinkedToAthlete`
- `GuardianUnlinkedFromAthlete`

The family link is sport-independent.

## Sports

Owns:
- sport definitions and enabled/disabled status;
- sport-level configuration references;
- athlete sport participation where this is modeled as a core sport relationship;
- coach sport assignments where appropriate.

MVP state:
- Basketball is enabled.
- Additional sports are not required for MVP 1.0.

Does not own:
- team attendance;
- evaluation records;
- event registrations.

## Teams / Seasons

Owns:
- teams/groups;
- season references and status where used;
- athlete team membership;
- coach team assignments.

Does not own:
- training attendance;
- competition registration;
- sport development criteria.

## Training

Owns:
- training-session definition;
- recurring schedule rules where implemented;
- venue, timing, status;
- assigned team/group and coach references.

Publishes examples:
- `TrainingSessionCreated`
- `TrainingSessionChanged`
- `TrainingSessionCancelled`

Important behavior:
- normal schedule updates should be admin/coach operations, not developer changes.

## Attendance

Owns:
- official attendance record and status;
- coach/staff confirmation state;
- attendance correction metadata;
- attendance history.

Publishes examples:
- `AthleteAttendanceConfirmed`
- `AthleteAttendanceCorrected`

Does not:
- directly update reward balances;
- directly unlock KHERO cosmetics;
- let future QR/NFC check-in signals silently become official attendance without the approved confirmation rule.

Potential future check-in data may be owned here or by a small Check-In subdomain, but official attendance truth remains explicit.

## Development

Owns:
- sport-specific development frameworks;
- development criteria;
- athlete evaluations;
- strengths and development priorities;
- shared progress notes;
- internal coaching notes;
- evaluation history.

Critical boundaries:
- shared notes and internal notes use distinct authorization rules;
- criteria belong to a sport/framework rather than being globally hard-coded to basketball;
- translations of coach notes must never overwrite authoritative original text.

## Events / Competitions

Owns:
- competitions, trials, camps, personal events, club events, and registration windows;
- sport reference where applicable;
- team/individual participation format;
- deadlines;
- eligibility/audience references;
- family/athlete responses or registrations;
- event lifecycle: draft/published/open/closed/completed/cancelled;
- future competition-specific extensions such as divisions/results when introduced.

Publishes examples:
- `EventPublished`
- `EventUpdated`
- `EventCancelled`
- `EventRegistrationUpdated`

Important rule:
- event content and status updates are regular club operations and must not require code deployment.

## Announcements

Owns:
- announcements;
- audience targeting;
- selection announcements and controlled visibility;
- dynamic locale variants for admin-authored announcement content where enabled.

It should not become a general social network in MVP.

## KHERO

Owns:
- eligible athlete's KHERO profile;
- selected approved cosmetic state;
- unlocked cosmetic/achievement references;
- approved KHERO asset metadata/integration.

Consumes relevant events from other modules but should not own attendance, points, sport participation, or evaluation truth.

MVP assumption:
- KHERO is the face of the KHLIM Basketball experience.

Future question:
- whether KHERO becomes cross-sport or sport-specific remains a product/configuration decision.

## Rewards

Owns:
- point transaction ledger;
- point rules;
- sport-specific vs organization-wide reward scope where configured;
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
- sport/specialization references;
- availability indicator/status for enquiry purposes;
- private-training/consultation enquiries;
- enquiry status.

MVP boundary:
- no payments or full scheduling marketplace.

## Localization

Owns platform-level localization concerns such as:
- supported locale registry;
- translation-catalogue conventions;
- fallback strategy;
- locale-aware formatting helpers;
- translation key naming/versioning guidance.

Does not own:
- business entities merely because they have translated content;
- authoritative coach/admin original text;
- notification delivery.

Static application UI translations live in version-controlled resources.

Dynamic admin-authored translations belong with the owning domain entity, for example:
- Event translations remain owned by Events;
- Announcement translations remain owned by Announcements.

## Notifications

Owns:
- notification preferences;
- notification delivery requests/history;
- push/in-app dispatch logic;
- provider abstraction;
- notification templates/categories;
- selecting/rendering locale-specific system templates where applicable.

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
8. Sport-specific rules should remain in the owning sport-aware business domain rather than leaking into Identity, Family, Audit, or infrastructure modules.
9. Locale is presentation/configuration context; translated labels must not be used as stable business identifiers.
10. Multi-sport readiness does not justify building unused sport-specific features before a real second sport exists.

## Future modules

Possible later additions include:
- Payments
- Commerce
- Coach Booking
- Competition Results / Brackets
- Game Statistics
- Video Analysis
- AI Assistance
- Agent Automation
- External Organization / Tenant Management

Each must integrate through existing contracts/events rather than bypassing module ownership. Multi-organization tenancy should only be introduced after a validated business requirement because it materially changes authorization, data isolation, billing, and operations.
