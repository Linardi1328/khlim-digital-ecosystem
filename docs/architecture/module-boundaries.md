# Module Boundaries

**Status:** Accepted current Phase 1 baseline

The backend begins as a modular monolith. These boundaries prevent KHLIM's commercial, academy, event, development, and engagement features from collapsing into one tightly coupled codebase as the business grows.

## Identity

Owns:
- authentication-provider identity mapping;
- account lifecycle/session integration;
- role assignments/references;
- account status and preferred locale reference.

Does not own:
- family relationships;
- programme membership;
- payments;
- athlete development;
- sport/team participation.

## Profiles / Athletes

Owns:
- user-facing athlete profile fields common across sports;
- guardian profile fields;
- coach public/professional profile fields.

Does not own authentication credentials, official evaluations, membership billing, team participation, or KHERO state.

## Family

Owns:
- Guardian ↔ Athlete relationships;
- relationship status/approval/revocation metadata;
- family-link lifecycle.

Publishes examples:
- `GuardianLinkedToAthlete`
- `GuardianUnlinkedFromAthlete`

A family link is independent of programme, team, and sport.

## Sports

Owns:
- sport definitions/status;
- athlete sport participation where needed;
- sport-level configuration references;
- coach sport assignments where appropriate.

MVP enables Basketball only. Sports does not own academy pricing, payments, attendance, or evaluations.

## Programmes

Owns:
- reusable Academy/service programme definitions;
- Programme Offerings representing a programme at a location/schedule/capacity;
- programme eligibility/capacity configuration where not owned by Memberships;
- programme activation/deactivation/history.

Important rule:
- `Programme` is not `Team`.

Examples:
- Programme: `U12 Academy`;
- ProgrammeOffering: `U12 Academy · Serdang · Saturday 10 AM · capacity 30`.

Publishes examples:
- `ProgrammeOfferingPublished`
- `ProgrammeOfferingCapacityChanged`

## Memberships

Owns:
- configurable Membership Plans and commercial terms;
- athlete membership/enrolment lifecycle;
- membership start/end/commitment rules;
- membership status (`PENDING`, `ACTIVE`, `SUSPENDED`, `CANCELLED`, `COMPLETED`, `EXPIRED`);
- auditable term adjustments/extensions;
- eligibility to receive membership benefits at the domain-rule level.

Does not own:
- payment transaction truth;
- card/token provider logic;
- KHERO points;
- attendance truth.

Consumes Billing facts such as confirmed payment success/overdue state and applies explicit membership policies.

Publishes examples:
- `MembershipActivated`
- `MembershipSuspended`
- `MembershipReactivated`
- `MembershipCompleted`

## Billing / Payments

Owns:
- payer/Billing Profile provider references;
- Payment Method external references/metadata safe to retain;
- Payment Schedules and Installments;
- Payment attempts/transactions/status;
- provider adapter interface;
- webhook verification/deduplication;
- idempotency for charge-creating operations;
- receipts/refund records where introduced;
- financial audit/reconciliation data.

Critical rules:
- never store full card numbers/CVV/raw credentials;
- browser redirects are not final financial truth;
- final amounts/discounts are calculated server-side;
- membership status and payment status remain separate;
- provider-specific SDK logic does not leak through unrelated modules.

Publishes examples:
- `PaymentSucceeded`
- `PaymentFailed`
- `PaymentOverdue`
- `RefundCompleted`

## Benefits / Entitlements

Owns:
- generic Benefit definitions;
- plan-to-benefit relationships/rules;
- per-athlete/member Entitlements;
- fulfilment lifecycle such as `ELIGIBLE`, `AWAITING_INPUT`, `ORDERED`, `READY_FOR_COLLECTION`, `COLLECTED`;
- entitlement audit metadata.

Does not hard-code `jersey + basketball` into Memberships. Future benefits may include discounts, evaluations, coaching credits, priority registration, or merchandise.

## Venues

Owns:
- Venue definitions;
- Courts;
- venue/court operational metadata/status;
- closures/unavailability windows.

Does not own session attendance or programme membership.

## Scheduling / Training

Owns:
- recurring schedule/session-series definitions;
- explicit session occurrences;
- programme/team session context;
- venue/court assignment;
- coach assignment reference;
- session status/capacity;
- cancellation/rescheduling/replacement linkage.

Publishes examples:
- `SessionCreated`
- `SessionChanged`
- `SessionCancelled`
- `SessionRescheduled`

Normal schedule changes are staff operations, not developer changes.

## Teams / Seasons

Owns:
- competitive teams/groups;
- seasons where used;
- athlete team membership;
- coach team assignments.

A Team is distinct from an Academy Programme. One athlete can hold programme membership and separately progress into a competitive team.

## Attendance

Owns:
- official attendance status;
- coach/staff confirmation state;
- correction metadata/history.

Publishes:
- `AthleteAttendanceConfirmed`
- `AthleteAttendanceCorrected`

Future QR/NFC/kiosk records are check-in signals unless an approved policy explicitly makes them authoritative. Attendance does not directly mutate rewards, memberships, or billing.

## Development

Owns:
- sport-specific Development Frameworks/Criteria;
- athlete evaluations;
- strengths/development priorities;
- shared/internal coaching notes;
- evaluation history.

Original coach text remains authoritative; translated/AI-assisted derivatives never overwrite it.

## Events

Owns the generic public/member event lifecycle:
- title/description/date/venue/publication;
- sport/audience references;
- registration window/deadlines;
- event status;
- locale variants where enabled;
- common reminders/update facts.

Publishes:
- `EventPublished`
- `EventUpdated`
- `EventCancelled`

Events does not own payment-provider integration.

## Tournaments

Extends Events with competition-specific concepts such as:
- divisions/formats;
- athlete/team registration;
- membership eligibility/pricing-rule inputs;
- results/brackets later.

Registration charges use Billing rather than embedding gateway logic.

## Camps

Extends Events with:
- camp age/category/capacity/coaches;
- athlete registration;
- member/non-member pricing inputs;
- attendance linkage where required.

## Announcements / Content

Owns:
- public/member announcements;
- audience targeting;
- controlled selection announcements;
- admin-authored locale variants.

The public website may project approved content from this domain. This module is not a social network.

## KHERO

Owns:
- eligible athlete KHERO profile;
- selected approved cosmetics;
- unlock/cosmetic references;
- official asset metadata integration.

It consumes approved facts from other modules but does not own attendance, payments, or evaluation truth.

## Rewards

Owns:
- auditable point transaction ledger;
- point rules;
- reward catalogue/redemption;
- manual point adjustment audit.

`PointTransaction` is never treated as a financial Payment ledger.

## Coach Services

Owns:
- approved coach service offerings;
- sport/specialization references;
- enquiry lifecycle.

Full booking/payment marketplace remains later scope; if added, it uses Scheduling and Billing contracts.

## Notifications

Owns:
- Notification logical records;
- Notification Delivery attempts/history;
- preferences;
- templates/categories/locales;
- email/WhatsApp/push/SMS provider abstractions.

Operational domains publish facts; they do not directly call channel vendors.

Sensitive financial/athlete communication is not routed through public social-media channels.

## Localization

Owns:
- supported locale registry/resources/conventions;
- fallback/formatting helpers;
- translation-key guidance.

Dynamic translated content stays with the owning domain entity.

## Audit

Owns append-oriented records of sensitive actions: actor, target, action, timestamp, and safe contextual metadata.

Financial adjustments, membership overrides, family-link changes, attendance corrections, permission changes, and similar actions must be attributable where policy requires.

## Integrations

Owns replaceable external-system adapters that do not naturally belong to one domain, for example:
- payment-provider adapter implementation infrastructure;
- email/WhatsApp/SMS provider adapters;
- KHLIM Assist/public API projection adapters;
- future social-channel connectors.

Integration modules must not become alternate business-data sources of truth.

## Commerce / Orders — later

When activated, owns:
- products/variants;
- pre-orders/orders/order items;
- fulfilment/collection status.

Payments use Billing and member discounts use shared eligibility/pricing rules. This is not required for the first website MVP.

## Cross-module rules

1. A module does not ad hoc write another module's tables.
2. Cross-module reads use explicit query/application contracts where practical.
3. Side effects prefer domain events when immediate transaction coupling is unnecessary.
4. Events represent completed business facts, not UI clicks.
5. Consumers tolerate duplicate delivery where retries are possible.
6. Authorization is rechecked at the point of sensitive execution.
7. UI/API orchestration may combine domains without changing ownership.
8. Clients cannot become authoritative for price, payment state, membership state, or permissions.
9. Payment-provider details remain behind Billing/Integration abstractions.
10. Membership and payment states remain independent.
11. Programme, Team, Event, and Camp/Tournament concepts are not collapsed for convenience.
12. Locale is presentation context, not authorization or a stable business key.
13. Historical relationships/statuses are preserved where operationally meaningful.
14. Multi-sport readiness does not justify speculative second-sport features.
15. Microservice extraction requires a concrete scaling/security/ownership reason.
