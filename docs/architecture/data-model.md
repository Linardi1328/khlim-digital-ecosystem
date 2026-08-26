# Initial Data Model

**Status:** Accepted conceptual baseline for website-first MVP  

This is a planning model, not a final Prisma schema. Exact table names, enums, indexes, constraints, money types, and module ownership are finalized through versioned migrations and implementation reviews.

The first public product is KHLIM Basketball Academy through the website/member portal. Core concepts remain sport-aware so the same account and backend can later support tournaments, camps, teams, private coaching, commerce, and additional sports.

## Identity and accounts

### User

Core authenticated account reference.

Suggested fields:
- id
- authentication_provider_subject
- status
- preferred_locale
- created_at
- updated_at

### UserRole

Supports one or more roles per account.

Examples:
- guardian
- athlete
- coach
- administrator

Administrative privilege should be more granular than one unrestricted role; role/permission records may represent scopes such as Finance/Admin, Academy Admin, Head Coach, Coach, Event Staff, or Management.

## Profiles

### AthleteProfile

- user_id
- display_name
- date_of_birth
- gender only where legitimately required for programme organisation/eligibility
- school/academic context fields only where approved
- profile_media_reference
- created_at
- updated_at

Basketball-specific attributes should not automatically become universal profile columns.

### GuardianProfile

- user_id
- approved contact/profile fields
- created_at
- updated_at

### CoachProfile

- user_id
- display_name
- bio/public role
- approved contact information
- created_at
- updated_at

## Family relationships

### GuardianAthleteLink

- id
- guardian_user_id
- athlete_user_id
- relationship_type optional
- status
- created_by
- approved_at
- revoked_at
- created_at

This remains many-to-many: one guardian can manage multiple athletes and one athlete can have multiple authorized guardians.

## Sports

### Sport

- id
- code
- default_name
- status
- sort_order
- created_at
- updated_at

MVP seed: `BASKETBALL`.

### AthleteSportParticipation

Optional durable sport-level participation record where needed independently of programme/team membership.

- id
- athlete_user_id
- sport_id
- status
- joined_at
- left_at

### CoachSportAssignment

- id
- coach_user_id
- sport_id
- role/title
- valid_from
- valid_to
- status

## Programmes and offerings

### Programme

Reusable service/programme definition.

Examples:
- U9 Academy
- U12 Academy
- U15 Academy
- Advanced Training

Suggested fields:
- id
- sport_id
- code
- name
- description
- minimum_age optional
- maximum_age optional
- gender_policy optional
- level/category
- active
- created_at
- updated_at

Do not hard-code U9/U12/U15 as schema/enums if admin configuration can represent them safely.

### ProgrammeOffering

Operational instance of a Programme.

Example: `U12 Academy · Serdang · Saturday 10 AM · capacity 30`.

Suggested fields:
- id
- programme_id
- venue_id
- season/term reference optional
- name/label optional
- capacity
- enrollment_opens_at optional
- enrollment_closes_at optional
- starts_on optional
- ends_on optional
- status
- created_at
- updated_at

A Programme may have multiple offerings across locations/times.

## Membership plans and memberships

### MembershipPlan

Configurable commercial package definition.

Suggested fields:
- id
- name
- duration/unit or commitment_cycles
- billing_frequency
- monthly_amount optional
- upfront_amount optional
- currency
- session_allowance optional
- commitment_period
- benefits_summary
- start_rule
- end_rule
- cancellation_policy/reference
- promotional_amount optional
- promotion_start/end optional
- eligibility configuration/reference
- active
- created_at
- updated_at

Current business examples (prices remain data, not code): Trial/First Month, 3-Month, 6-Month, 12-Month.

### MembershipPlanOfferingEligibility

If plans are not universal, a join/config table can connect Membership Plans to eligible Programme Offerings or Programmes.

### Membership

Actual athlete enrolment/contract.

Suggested fields:
- id
- athlete_user_id
- programme_offering_id
- membership_plan_id
- purchased_by_user_id
- status: pending / active / suspended / cancelled / completed / expired
- starts_at
- ends_at
- activated_at
- suspended_at optional
- cancelled_at optional
- completed_at optional
- created_at
- updated_at

Membership status is not payment status.

### MembershipAgreement

Audit of accepted commercial/recurring terms.

- id
- membership_id
- terms_version
- accepted_by_user_id
- accepted_at
- agreed_amount/currency snapshot
- billing_frequency snapshot
- installment_count/commitment snapshot
- safe agreement metadata

### MembershipTermAdjustment

Auditable changes due to closure/interruption/manual policy.

- id
- membership_id
- type
- duration/days or effective-date change
- reason
- created_by
- created_at

Do not silently rewrite historical contract dates without traceability.

## Billing and payments

### BillingProfile

Maps a KHLIM payer to provider customer references.

- id
- user_id
- provider
- provider_customer_id
- status
- created_at
- updated_at

### PaymentMethod

Stores external references and safe metadata only.

- id
- billing_profile_id
- provider
- provider_payment_method_reference
- method_type
- brand/last_four/expiry metadata only if provider permits and operationally useful
- status
- created_at
- updated_at

Never store full card number, CVV, raw credentials, or equivalent sensitive authentication data.

### PaymentSchedule

Represents agreed billing cadence/commitment.

- id
- membership_id optional
- source_type/source_id for future camp/tournament/order use if generalized
- frequency
- installment_count
- amount_per_installment
- currency
- starts_at
- status
- provider_subscription_reference optional if provider-managed recurring capability is used
- created_at
- updated_at

### PaymentInstallment

Expected charge within a schedule.

- id
- payment_schedule_id
- sequence_number
- due_at
- amount
- currency
- status: scheduled / processing / paid / failed / overdue / waived / cancelled
- paid_at optional
- created_at
- updated_at

Unique schedule+sequence constraints prevent duplicate expected installments.

### Payment

Actual charge/payment attempt/result.

- id
- payer_user_id
- membership_id optional
- payment_installment_id optional
- source_type/source_id optional
- provider
- provider_payment_id
- idempotency_key
- amount
- currency
- status
- attempt_number optional
- attempted_at
- settled_at optional
- failed_at optional
- failure_code/safe_failure_reason optional
- created_at

### PaymentProviderEvent

Webhook/provider event deduplication/audit record.

- id
- provider
- provider_event_id unique
- event_type
- received_at
- processed_at optional
- processing_status
- safe_payload_reference/hash/metadata as policy permits

### BillingPolicy / DunningPolicy

Can be configuration rather than a table initially, but must support configurable retry/reminder/grace-period rules rather than hard-coded day values.

Potential data:
- retry offsets
- reminder offsets
- overdue threshold
- suspend_on_overdue
- reactivation rule
- active/effective dates

## Benefits and entitlements

### Benefit

Generic benefit definition.

Examples:
- Academy jersey
- Basketball
- Tournament discount
- Camp discount
- Free evaluation
- Private coaching credit
- Priority registration

### PlanBenefit

Connects MembershipPlan to Benefit plus qualification rules.

- id
- membership_plan_id
- benefit_id
- trigger_type/rule reference
- quantity/value
- active

Example rule: starter kit becomes eligible after two successful recurring installments, or immediately after full upfront payment.

### Entitlement

Actual athlete/customer benefit instance.

- id
- athlete_user_id
- membership_id optional
- benefit_id
- status: eligible / awaiting_input / ordered / ready_for_collection / collected / expired / cancelled
- eligible_at
- metadata such as jersey size reference where appropriate
- fulfilled_at optional
- created_at
- updated_at

## Venues, courts, and scheduling

### Venue

- id
- name
- address
- contact_details
- rental_cost optional (staff-only operational data)
- internal_notes optional
- active

### Court

- id
- venue_id
- name/number
- capacity optional
- active

### VenueClosure

May target venue or court.

- id
- venue_id
- court_id optional
- starts_at
- ends_at
- reason
- status
- created_by

### SessionSeries / TrainingScheduleRule

Recurring definition.

- id
- programme_offering_id optional
- team_id optional
- recurrence_definition
- default_venue_id
- default_court_id optional
- default_start/end time definition
- default_coach_assignment reference optional
- active_from
- active_until
- status

### TrainingSession / Session

Explicit occurrence.

- id
- sport_id
- programme_offering_id optional
- team_id optional
- venue_id
- court_id optional
- primary_coach_id/assignment reference
- starts_at
- ends_at
- capacity optional
- status: scheduled / full / cancelled / rescheduled / completed
- source_series_id optional
- replacement_for_session_id optional
- rescheduled_from_session_id optional
- notes
- created_by
- created_at
- updated_at

## Attendance

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
- correction_reason optional
- updated_at

### AttendanceCheckIn — later/optional

- id
- training_session_id
- athlete_user_id
- method
- recorded_at
- session/token reference
- safe device/context metadata

A check-in is not automatically official attendance.

## Teams and seasons

### Season

- id
- sport_id
- name
- starts_on
- ends_on
- status

### Team

- id
- sport_id
- season_id optional
- name
- age_group/category
- team_type
- status

### TeamMembership

- id
- team_id
- athlete_user_id
- valid_from
- valid_to
- status
- role/position reference optional

### CoachTeamAssignment

- id
- team_id
- coach_user_id
- role
- valid_from
- valid_to
- status

Team membership is distinct from academy Membership.

## Athlete development

### DevelopmentFramework

- id
- sport_id
- name
- version/status
- active_from
- active_until optional

### DevelopmentCriterion

- id
- framework_id
- parent_id optional
- code
- default_name
- description
- assessment_type
- sort_order
- active

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
- rating/assessment value
- priority level optional
- comment

### DevelopmentNote

- id
- athlete_user_id
- sport_id
- coach_user_id
- visibility: shared / internal
- content_original
- original_locale optional
- created_at
- updated_at

## Events, tournaments, and camps

### Event

Generic publishable scheduled record.

- id
- sport_id optional
- type
- default_title
- default_description
- starts_at
- ends_at
- venue_id optional
- registration_opens_at optional
- registration_deadline optional
- participation_format
- status: draft / published / registration_open / registration_closed / completed / cancelled
- created_by
- created_at
- updated_at

### EventTranslation

- event_id
- locale
- title
- description
- translation/review status

### EventAudience

Targeting references for sports, programmes, teams, categories, explicit athletes, or public audiences.

### TournamentDetail

Competition-specific extension where needed.

- event_id
- format
- division/category structure reference
- governing/competition metadata optional

### TournamentRegistration

Supports athlete or team participation.

- id
- tournament_event_id
- athlete_user_id optional
- team_id optional
- guardian_actor_id optional
- membership_id/eligibility snapshot reference optional
- pricing_rule/reference or price snapshot
- status
- payment status/reference via Billing, not duplicated provider logic
- submitted_at

### CampDetail

- event_id
- minimum/maximum age or category reference
- capacity
- coaching/programme metadata
- member/non-member pricing configuration/reference

### CampRegistration

- id
- camp_event_id
- athlete_user_id
- guardian_actor_id optional
- status
- price snapshot
- billing/payment reference
- submitted_at

Membership-based discounts should be evaluated by backend eligibility/pricing rules, never by trusting a client-supplied discounted total.

## Announcements / content

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
- review status

## KHERO and rewards

### KheroProfile

- athlete_user_id
- approved selected cosmetic references
- jersey_number
- updated_at

### KheroUnlock

- id
- athlete_user_id
- cosmetic_or_achievement_id
- source_type/reference
- unlocked_at

### PointTransaction

- id
- athlete_user_id
- sport_id nullable
- signed amount
- type/reason
- source_type/source_id
- actor_user_id nullable
- idempotency_key/uniqueness mechanism
- created_at

This is not a Payment/financial ledger.

### Reward / RewardRedemption

Retain the existing auditable reward-catalogue/redemption model; financial commerce, if later introduced, uses Billing/Orders.

## Notifications

### Notification

Logical user-facing notification.

- id
- recipient_user_id
- category
- template_key/content strategy
- locale_used
- destination/deep-link metadata
- read_at
- created_at

### NotificationDelivery

Individual channel delivery attempt.

- id
- notification_id
- channel: email / whatsapp / push / sms
- provider
- provider_message_reference optional
- status
- attempted_at
- delivered_at optional
- failure metadata safe to retain

### NotificationPreference

- user_id
- category
- channel enablement fields/preferences

## Audit and domain events

### AuditEvent

- id
- actor_user_id
- action_type
- target_type
- target_id
- safe_metadata
- occurred_at

### DomainEventOutbox

Use before introducing a message broker if reliable asynchronous delivery is required.

- id
- event_type
- aggregate/domain reference
- payload
- occurred_at
- processing status/attempt metadata

Examples:
- `PaymentSucceeded`
- `PaymentFailed`
- `MembershipActivated`
- `MembershipSuspended`
- `SessionChanged`
- `AthleteAttendanceConfirmed`
- `EventPublished`
- `EntitlementBecameEligible`

Consumers must tolerate retries/idempotency.

## Commerce / orders — later

When needed:

### Product / ProductVariant

Supports KHLIM merchandise/pre-order catalogue.

### Order / OrderItem

- payer/customer account
- item/variant/quantity/price snapshot
- order status
- Billing payment reference

### Fulfilment

Supports pre-order/manufacture/ready-for-collection/collected flows without requiring a warehouse-heavy inventory design.

## Relationship overview

```text
User
 ├── GuardianProfile
 ├── AthleteProfile
 └── CoachProfile

Guardian ──< GuardianAthleteLink >── Athlete

Sport ──< Programme ──< ProgrammeOffering
                         │
MembershipPlan ──────────┼──< Membership >── Athlete
                         │
Membership ── PaymentSchedule ── PaymentInstallment ──< Payment
     │
     └──< Entitlement >── Benefit

Venue ──< Court
  │
  └──< SessionSeries ──< TrainingSession ──< Attendance >── Athlete

Sport ──< Team ──< TeamMembership >── Athlete

Sport ──< DevelopmentFramework ──< DevelopmentCriterion
Athlete ──< AthleteEvaluation >── Coach

Event
 ├── TournamentDetail ──< TournamentRegistration
 └── CampDetail ────────< CampRegistration
```

## Data-model principles

- Use stable opaque IDs.
- Store money as amount + currency using an appropriate exact representation; never localized display strings.
- Do not use localized labels as identifiers.
- Store timestamps consistently and render in user/club timezone.
- Preserve historical family/programme/membership/team/evaluation/event records where needed.
- Use database uniqueness/check/foreign-key constraints for integrity, not only application checks.
- Index foreign keys/common filters.
- Model authorization-relevant state explicitly.
- Keep provider references separate from KHLIM domain identities.
- Keep membership status separate from payment/installment status.
- Never store raw card credentials.
- Keep KHERO points separate from financial payments.
- Audit financial/manual/sensitive state changes.
- Avoid introducing `organization_id` tenancy everywhere until external multi-organization SaaS is a validated business requirement.
