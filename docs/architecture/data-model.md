# Initial Data Model

**Status:** Accepted as conceptual Phase 1 baseline

This is a planning model, not a final Prisma schema. Exact table names, constraints, indexes, enums, join strategies, and module ownership will be finalized during implementation.

The first public application is KHLIM Basketball. The data model deliberately uses **Athlete** and **Sport** as core concepts so additional sports can be added later without replacing identity, family, attendance, event, or notification fundamentals.

## Identity and accounts

### User

Core account identity reference.

Suggested fields:
- id
- authentication_provider_subject
- status
- preferred_locale
- created_at
- updated_at

`preferred_locale` initially supports values such as `en`, `ms`, `zh-Hans`, `zh-Hant`, and `hi`.

### UserRole

Supports one or more approved roles per account.

Possible role values:
- athlete
- guardian
- coach
- administrator

Role does not by itself grant access to every athlete, sport, team, or administrative function.

## People profiles

### AthleteProfile

- user_id
- display_name
- date_of_birth or age-group data only where required
- school/academic context fields approved for MVP
- profile_media_reference
- created_at
- updated_at

Sport-specific attributes should not automatically become columns on the universal athlete profile.

### CoachProfile

- user_id
- display_name
- bio/role
- approved contact/enquiry information
- private_training_available
- consultation_available

Sport-specific specializations can use related records rather than a single basketball-only field.

### GuardianProfile

- user_id
- approved guardian contact/profile fields

## Family relationships

### GuardianAthleteLink

- id
- guardian_user_id
- athlete_user_id
- relationship_type where appropriate
- status
- created_by
- approved_at
- revoked_at
- created_at

This relationship is independent of sport. If a child later joins a second KHLIM sport, the family link should not need to be recreated.

Unique/active-link constraints should prevent accidental duplicate relationships.

## Sports and seasons

### Sport

- id
- code
- name/default_name
- status
- sort_order
- configuration metadata only where justified
- created_at
- updated_at

MVP seed:

```text
BASKETBALL
```

Future examples may include badminton, futsal, volleyball, swimming, running, or other KHLIM programs.

Do not use localized display names as stable identifiers.

### Season

- id
- sport_id
- name
- starts_on
- ends_on
- status

Season may later be organization-wide or sport-specific depending on KHLIM operations. Historical memberships should remain queryable after a season closes.

## Sport participation

### AthleteSportParticipation

Optional but recommended if an athlete can participate in a sport without immediately belonging to one team/group.

- id
- athlete_user_id
- sport_id
- status
- joined_at
- left_at
- sport_specific_profile metadata only when justified

Basketball-specific fields such as primary playing position may belong here or in a dedicated basketball extension/configuration model rather than in `AthleteProfile`.

### CoachSportAssignment

- id
- coach_user_id
- sport_id
- role/title
- valid_from
- valid_to
- status

This can coexist with more specific team/group assignments.

## Teams / groups

### Team

- id
- sport_id
- season_id optional
- name
- age_group/category
- status
- team_type or configuration where required

The same model can later represent sport-specific groups if terminology differs. UI labels may be configurable without changing the stable domain concept.

### TeamMembership

- id
- team_id
- athlete_user_id
- valid_from
- valid_to
- status
- role/position reference where appropriate

### CoachTeamAssignment

- id
- team_id
- coach_user_id
- role
- valid_from
- valid_to
- status

## Training and attendance

### TrainingScheduleRule

Optional model for recurring schedules.

- id
- team_id
- sport_id derived/validated from team
- recurrence definition
- default venue_id
- default start/end time definition
- default coach assignment reference where appropriate
- active_from
- active_until
- status

Generated sessions remain explicit records so individual dates can be changed/cancelled safely.

### TrainingSession

- id
- sport_id
- team_id
- primary_coach_id / assignment reference
- venue_id or venue details
- starts_at
- ends_at
- status
- notes
- source_schedule_rule_id optional
- created_by
- created_at
- updated_at

### Attendance

- id
- training_session_id
- athlete_user_id
- status: present / absent / late / excused
- confirmation_status where needed
- recorded_by
- recorded_at
- confirmed_by
- confirmed_at
- correction_reason if changed
- updated_at

A uniqueness constraint should prevent multiple active attendance truths for the same athlete/session unless explicit history/versioning is used.

### AttendanceCheckIn (future, optional)

A future QR/NFC/kiosk signal may use a separate record:

- id
- training_session_id
- athlete_user_id
- method
- recorded_at
- token/session reference
- device/context metadata that is safe and necessary

A check-in is not automatically the authoritative attendance record unless a future approved policy explicitly says so.

## Development frameworks

### DevelopmentFramework

Defines a sport-specific evaluation framework.

- id
- sport_id
- name
- version/status
- active_from
- active_until optional
- created_at

Example:

```text
Basketball Development Framework v1
```

### DevelopmentCriterion

Replaces globally hard-coded basketball categories.

- id
- framework_id
- parent_id optional
- code
- default_name
- description
- assessment_type
- sort_order
- active

Basketball examples:
- shooting
- finishing
- ball handling
- passing
- defense
- basketball IQ
- athleticism
- mental/discipline

A future badminton framework can have completely different criteria without changing evaluation tables.

### AthleteEvaluation

- id
- athlete_user_id
- sport_id
- framework_id
- coach_user_id
- evaluation_date
- summary
- created_at
- updated_at

### EvaluationItem

- id
- evaluation_id
- development_criterion_id
- rating/assessment value if used
- priority level if used
- comment

### DevelopmentNote

Use explicit visibility rather than deriving visibility from UI placement.

- id
- athlete_user_id
- sport_id
- coach_user_id
- visibility: shared / internal
- content_original
- original_locale optional
- created_at
- updated_at

Machine-generated translations, if introduced later, should be separate derivative records and must never overwrite `content_original`.

## Events and competitions

### Event

Generic scheduled club/event record.

- id
- sport_id optional for organization-wide events
- type
- participation_format: team / individual / doubles-pair / other as required
- default_title
- default_description
- starts_at
- ends_at
- venue_id or venue details
- registration_opens_at optional
- registration_deadline optional
- status: draft / published / registration_open / registration_closed / completed / cancelled
- created_by
- created_at
- updated_at

### EventTranslation

Optional locale variants for admin-authored public event content.

- id
- event_id
- locale
- title
- description
- translation_status / reviewed_by where needed
- updated_at

The default/original content remains authoritative. Translation support can be activated progressively.

### EventAudience

References sports, teams, age groups/categories, or explicit athletes depending on the chosen targeting model.

### EventRegistration

- id
- event_id
- athlete_user_id
- team_id optional
- guardian_actor_id optional
- response/status
- submitted_at
- updated_at

### CompetitionDetail (optional extension)

If competition-specific requirements exceed the generic event model, introduce an extension owned by the Events/Competition module rather than bloating every event row.

Potential fields:
- event_id
- division/category
- governing body
- competition level
- external reference

Future bracket/result structures should be separate dedicated models.

## Announcements

### Announcement

- id
- sport_id optional
- type
- default_title
- default_body
- audience definition
- published_at
- expires_at optional
- created_by

### AnnouncementTranslation

- announcement_id
- locale
- title
- body
- translation/review status where required

Selection announcements may use the announcement/event system if privacy rules remain explicit and sufficient; otherwise introduce a dedicated Selection domain.

## KHERO

### KheroProfile

KHERO is initially specific to eligible KHLIM Basketball athletes.

- athlete_user_id
- selected_jersey/variant references
- jersey_number
- selected_background
- selected_accessory references
- updated_at

### KheroUnlock

- id
- athlete_user_id
- cosmetic_or_achievement_id
- source_type
- source_reference
- unlocked_at

Do not store official asset binaries in these rows. Use stable asset identifiers and object-storage/CDN references.

Whether KHERO becomes cross-sport or remains basketball-specific is a future product decision.

## Rewards

### PointTransaction

- id
- athlete_user_id
- sport_id nullable if organization-wide
- amount signed integer
- type
- reason
- source_type
- source_id
- actor_user_id nullable for automated events
- idempotency_key / uniqueness mechanism
- created_at

Balance is calculated from transactions or maintained as a derived/cache value reconciled against the ledger.

### Reward

- id
- name/default_name
- description
- sport_id nullable if organization-wide
- point_cost or eligibility rule reference
- active
- inventory/fulfilment metadata if needed

### RewardRedemption

- id
- reward_id
- athlete_user_id
- point_transaction_id
- status
- requested_at
- fulfilled_at

## Coach services

### CoachService

- id
- coach_user_id
- sport_id
- service_type
- title
- description
- active

### CoachEnquiry

- id
- coach_service_id or coach_user_id
- athlete_user_id
- guardian_user_id where relevant
- message/details
- status
- created_at
- updated_at

## Localization

Static product UI translations should live in version-controlled locale resources, not relational database rows.

Database translation tables are for **admin-authored dynamic content** such as events/announcements, not for every button label.

### SupportedLocale (configuration or code registry)

May be represented in application configuration rather than a table.

Initial locales:
- `en`
- `ms`
- `zh-Hans`
- `zh-Hant`
- `hi`

Future candidate:
- `yue-Hant`

## Notifications

### Notification

- id
- recipient_user_id
- category
- template_key or resolved content strategy
- locale_used
- destination/deep-link metadata
- read_at
- created_at

### NotificationPreference

- user_id
- category
- in_app_enabled
- push_enabled

System-generated notification templates should resolve against recipient locale at send/render time where practical.

## Audit

### AuditEvent

- id
- actor_user_id
- action_type
- target_type
- target_id
- safe_metadata
- occurred_at

Audit payloads should not become unnecessary copies of sensitive fields.

## Domain-event delivery

If reliable asynchronous domain-event processing is required, use an outbox pattern before introducing a message broker.

### DomainEventOutbox

- id
- event_type
- aggregate/domain reference
- payload
- occurred_at
- processing status/attempt metadata

Examples:
- `AthleteAttendanceConfirmed`
- `TrainingSessionChanged`
- `EventPublished`
- `EventUpdated`
- `EventCancelled`
- `PointsAwarded`
- `RewardRedeemed`

Consumers must tolerate retries/idempotency where delivery can be repeated.

## Relationship overview

```text
User
 ├─ AthleteProfile
 ├─ GuardianProfile
 └─ CoachProfile

Guardian ──< GuardianAthleteLink >── Athlete

Sport ──< Season
  │
  ├──< AthleteSportParticipation >── Athlete
  │
  ├──< Team ──< TeamMembership >──── Athlete
  │             └──< CoachTeamAssignment >── Coach
  │
  ├──< DevelopmentFramework ──< DevelopmentCriterion
  │
  └──< Event / Competition ──< EventRegistration >── Athlete

Team ──< TrainingSession ──< Attendance >── Athlete

Athlete ──< AthleteEvaluation >── Coach
Athlete ──< PointTransaction
Athlete ─── KheroProfile   (Basketball MVP)
```

## Data-model principles

- Use stable opaque IDs.
- Do not use localized labels as identifiers.
- Store timestamps in a consistent UTC representation and render in the appropriate user/club timezone.
- Preserve historical sport/team/guardian relationships with status or validity windows where history matters.
- Use database constraints for integrity, not only application checks.
- Index foreign keys and common query/filter paths.
- Model authorization-relevant state explicitly.
- Keep sport-specific data out of universal identity tables where practical.
- Keep auditability for points, attendance corrections, relationships, events, and sensitive administrative changes.
- Avoid introducing `organization_id` tenancy everywhere until multi-organization SaaS is a validated business requirement; if that future arrives, design true tenant isolation deliberately rather than pretending it already exists.
