# MVP Scope

**Status:** Accepted current planning baseline

## Goal

Ship a production-ready first public version of the **KHLIM website + authenticated family/member portal**, backed by the shared KHLIM API, database, authentication, payment, notification, and admin infrastructure.

The MVP is designed for KHLIM Basketball Academy while keeping the core sport-aware and reusable for later KHLIM services and the future Super App.

The delivery sequence is **commercial/operational first**, not player-first mobile.

## MVP success condition

A family can:

```text
Discover KHLIM
→ create one parent/guardian account
→ add/select a child
→ choose a Programme Offering
→ choose a configurable Membership Plan
→ review/accept terms
→ pay securely
→ receive confirmed membership activation
→ view membership/payment/schedule information
```

and KHLIM staff can manage the resulting records through the Admin web application without relying on code changes or fragmented spreadsheets.

## In scope

### 1. Shared platform foundation

- One NestJS modular-monolith API shared by website, admin, and future mobile clients.
- PostgreSQL/Prisma authoritative relational data model.
- Supabase Auth/Storage infrastructure.
- REST/OpenAPI boundary.
- Environment separation, CI, monitoring, audit, backup/restore foundations.
- Localization infrastructure from the first production screens.

### 2. Identity, family, and access

- Secure account authentication and recovery basics.
- Parent/Guardian, Athlete/Player, Coach, and staff role foundations.
- Multiple children per guardian.
- Multiple authorized guardians per athlete.
- Relationship-aware/server-side authorization.
- Stronger administrative authentication/MFA requirement.
- One KHLIM account capable of later spanning Academy, tournaments, camps, teams, coaching, and commerce.

### 3. Sport-aware foundation

- Stable `Sport` concept.
- Basketball is the only required live sport.
- Internal concept uses `Athlete`; basketball presentation may use `Player`.
- No multi-sport selector required for MVP.

### 4. Programmes and offerings

- Configurable Programme records such as U9/U12/U15/Advanced Training without hard-coded enum dependence.
- Programme Offering for location/schedule/capacity-specific enrolment.
- Programme capacity/status/eligibility basics.
- Multiple venue support from the data model.

### 5. Membership plans and memberships

- Configurable Membership Plans with duration/commitment/billing frequency/upfront or recurring price/session allowance/eligibility/status.
- Athlete Membership lifecycle separate from Billing state.
- Membership statuses such as Pending, Active, Suspended, Cancelled, Completed, Expired.
- Accepted membership/recurring terms recorded for audit.
- Historical membership participation retained.

### 6. Payments and recurring billing

Integrated payment processing is **required for this MVP**.

- External payment gateway/provider.
- Secure provider-hosted/tokenized card/payment entry.
- No raw full card number/CVV storage by KHLIM.
- Payment provider abstraction/interface.
- Upfront one-time payment.
- Fixed-cycle monthly recurring billing where provider capability supports the approved design.
- Payment Schedule + Installment records.
- Payment transaction/attempt records.
- Signed webhook verification.
- Provider-event deduplication.
- Idempotent charge-creating/retryable processing.
- Server-authoritative pricing/discount totals.
- Payment status separate from Membership status.
- Payment history/receipt information.
- Test vs production payment environment separation.

Advanced automated dunning/retry policy may be V1 if the selected provider/manual MVP process can safely cover the first small cohort, but the data model must support failed/overdue states from the start.

### 7. Venues, courts, and basic scheduling

- Multiple Venue records.
- Court records where operationally required.
- Basic recurring schedule/session-series foundation.
- Explicit upcoming Session occurrences.
- Session venue/time/status.
- Basic schedule view for linked families.
- Admin ability to modify schedule data.
- Architecture supports closures/cancellations/rescheduling; full automated exception tooling may continue into V1.

### 8. Public website

- Home/about/academy/programme information.
- Programme discovery and join calls to action.
- Public coach/event information where approved.
- Contact/support entry point.
- Responsive/mobile-browser support.
- Localization-ready UI.

### 9. Parent/family member portal

Initial portal includes:
- linked children;
- programme/membership summary;
- membership status;
- next payment/payment history;
- upcoming training/schedule;
- basic notifications/account/preferences.

A full athlete-development dashboard is not required for the first website MVP.

### 10. Admin web application

- Family/athlete management.
- Programme/Programme Offering configuration.
- Membership Plan configuration.
- Membership status/overview.
- Payment/failed-payment visibility.
- Venue/Court basics.
- Schedule/session basics.
- Capacity overview.
- Scoped staff permissions.
- Audit visibility for sensitive operations.
- Basic operational/payment reporting.

### 11. Notifications

- Channel-neutral Notification service architecture.
- Basic transactional email for registration/payment/membership/schedule changes.
- Notification records/delivery status where appropriate.
- Locale-aware system templates.
- WhatsApp/push/SMS adapters can be added later without rewriting domain logic.

### 12. Production readiness and controlled launch

- Development/staging/production separation.
- Automated tests for critical auth/payment/membership flows.
- CI validation.
- Error monitoring/structured logging.
- Payment/webhook monitoring.
- Automated database backups.
- Tested restore procedure before public launch.
- Rate limiting/abuse basics where applicable.
- Privacy/terms/recurring-payment disclosure readiness.
- Account deletion/request path.
- Documented rollback/forward-fix procedure.
- Internal alpha.
- Closed beta with approximately 5–10 families.
- Expanded academy pilot approximately 15–30 families.
- Feature freeze/release candidate.
- No unresolved P0/P1 defects at public launch.

## Explicitly out of scope for the first website MVP

These are intentionally deferred unless business evidence changes priority:

- major native Super App feature development;
- KHERO customization/reward loop;
- full attendance workflow and QR check-in;
- athlete evaluations/development analytics;
- 3x3 tournament integration/member discounts;
- camps registration;
- private/small-group coaching booking marketplace;
- merchandise/pre-order shop;
- WhatsApp/push/SMS as mandatory channels;
- additional enabled sports;
- public competition marketplace;
- live match statistics;
- video analysis;
- wearables;
- social feed/open direct messaging;
- autonomous AI coaching/evaluation;
- external multi-organization SaaS tenancy.

## V1 immediately after MVP

Likely priorities for approximately 30–60 active students:
- automated failed-payment retries/reminders/dunning;
- overdue/suspension/reactivation/renewal automation;
- WhatsApp notification integration;
- coach attendance and optional QR-assisted check-in;
- Benefits/Entitlements/starter-kit fulfilment;
- stronger closure/rescheduling/replacement-session workflows;
- improved operational analytics.

## Release criterion

MVP is public-launch ready only when the end-to-end family registration/payment/membership journey and staff operational workflows are reliable, authorization/payment integrity are tested, monitoring and recovery are active, beta/pilot evidence is satisfactory, and there are no unresolved P0/P1 defects.
