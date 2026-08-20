# Initial Data Model

**Status:** Draft

This is a conceptual model for development planning. Exact table names, constraints, indexes, and ownership will be finalized during implementation.

## Identity and profiles

### User
Core account identity reference.

Suggested fields:
- id
- authentication_provider_subject
- status
- created_at
- updated_at

### UserRole
Supports one or more approved roles per account if needed.

### PlayerProfile
- user_id
- display_name
- date_of_birth or age-group data only if required
- school/academic context fields approved for MVP
- basketball profile fields
- profile_media_reference

### CoachProfile
- user_id
- display_name
- bio/role
- specializations
- approved contact/enquiry information
- private_training_available
- consultation_available

### GuardianProfile
- user_id
- approved guardian contact/profile fields

## Family relationships

### GuardianPlayerLink
- id
- guardian_user_id
- player_user_id
- relationship_type where appropriate
- status
- created_by
- approved_at
- revoked_at
- created_at

Unique/active-link constraints should prevent accidental duplicate relationships.

## Teams

### Team
- id
- name
- age_group/category
- status

### TeamMembership
- id
- team_id
- player_user_id
- valid_from
- valid_to
- status

### CoachTeamAssignment
- id
- team_id
- coach_user_id
- role
- valid_from
- valid_to
- status

## Training and attendance

### TrainingSession
- id
- team_id
- primary_coach_id / assignment reference
- venue_id or venue details
- starts_at
- ends_at
- status
- notes
- created_by

### Attendance
- id
- training_session_id
- player_user_id
- status: present / absent / late / excused
- recorded_by
- recorded_at
- correction_reason if changed
- updated_at

A uniqueness constraint should prevent multiple active attendance rows representing the same player/session truth unless explicit history/versioning is used.

## Development

### DevelopmentCategory
Club-configurable hierarchy or category record.

Examples:
- Shooting
- Finishing
- Ball Handling
- Passing
- Defense
- Basketball IQ
- Athleticism
- Mental/discipline

Suggested fields:
- id
- parent_id optional
- name
- description
- sort_order
- active

### PlayerEvaluation
- id
- player_user_id
- coach_user_id
- evaluation_date
- summary
- created_at
- updated_at

### EvaluationItem
- id
- evaluation_id
- development_category_id
- rating/assessment value if used
- priority level if used
- comment

### DevelopmentNote
Prefer an explicit visibility type rather than deriving visibility from UI placement.

- id
- player_user_id
- coach_user_id
- visibility: shared / internal
- content
- created_at
- updated_at

## Events and communication

### Event
- id
- type
- title
- description
- starts_at
- ends_at
- venue
- registration_deadline
- status
- created_by

### EventAudience
References teams, age groups, or explicit users depending on the chosen targeting model.

### EventRegistration
- id
- event_id
- player_user_id
- guardian_actor_id optional
- response/status
- submitted_at
- updated_at

### Announcement
- id
- type
- title
- body
- visibility/audience definition
- published_at
- created_by

Selection announcements may use this model if privacy rules remain explicit and sufficient; otherwise a dedicated Selection domain can be introduced.

## KHERO

### KheroProfile
- player_user_id
- selected_jersery/variant references
- jersey_number
- selected_background
- selected_accessory references
- updated_at

### KheroUnlock
- id
- player_user_id
- cosmetic_or_achievement_id
- source_type
- source_reference
- unlocked_at

Do not store official asset binaries in these rows; use asset identifiers/object-storage/CDN references.

## Rewards

### PointTransaction
- id
- player_user_id
- amount signed integer
- type
- reason
- source_type
- source_id
- actor_user_id nullable for automated events
- idempotency_key / uniqueness mechanism
- created_at

Balance is calculated from transactions or maintained as a derived/cache value that is regularly reconciled against the ledger.

### Reward
- id
- name
- description
- point_cost or eligibility rule reference
- active
- inventory/fulfilment metadata if needed

### RewardRedemption
- id
- reward_id
- player_user_id
- point_transaction_id
- status
- requested_at
- fulfilled_at

## Coach services

### CoachService
- id
- coach_user_id
- service_type
- title
- description
- active

### CoachEnquiry
- id
- coach_service_id or coach_user_id
- player_user_id
- guardian_user_id where relevant
- message/details
- status
- created_at
- updated_at

## Notifications

### Notification
- id
- recipient_user_id
- category
- title/body or template reference
- destination/deep-link metadata
- read_at
- created_at

### NotificationPreference
- user_id
- category
- in_app_enabled
- push_enabled

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

If reliable asynchronous domain-event processing is required, consider an outbox table inside the transactional database:

### DomainEventOutbox
- id
- event_type
- aggregate/domain reference
- payload
- occurred_at
- processing status/attempt metadata

This supports reliable event publication without introducing a separate message broker prematurely.

## Relationship overview

```text
User
 ├─ PlayerProfile
 ├─ GuardianProfile
 └─ CoachProfile

Guardian ──< GuardianPlayerLink >── Player
Player   ──< TeamMembership >────── Team
Coach    ──< CoachTeamAssignment >─ Team
Team     ──< TrainingSession ──────< Attendance >── Player
Player   ──< PlayerEvaluation ────── Coach
Player   ──< PointTransaction
Player   ──< EventRegistration >──── Event
Player   ─── KheroProfile
```

## Data-model principles

- Use stable opaque IDs.
- Store timestamps in a consistent UTC representation and render in user/club timezone.
- Preserve historical relationships with status/validity windows when business history matters.
- Use database constraints for integrity, not only application checks.
- Index foreign keys and common query/filter paths.
- Avoid polymorphic relationships where they make integrity impossible unless the flexibility is justified.
- Model visibility/authorization-relevant state explicitly.
- Keep auditability for points, attendance corrections, relationships, and sensitive administrative changes.
