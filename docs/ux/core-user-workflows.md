# Core User Workflows

**Status:** Accepted current MVP planning baseline

These workflows now reflect the **website-first commercial MVP**. The future Super App reuses the same business flows and backend state; it does not create separate membership/payment/schedule rules.

## Public visitor → family registration

```text
Open KHLIM website
→ view Academy / Programme Offering
→ select Join / Register
→ create Guardian account or sign in
→ add/select Athlete
→ choose Programme Offering
→ choose Membership Plan
→ review price, commitment, terms, recurring agreement
→ secure payment-provider checkout/tokenization
→ payment provider processes payment
→ verified webhook reaches KHLIM
→ Payment recorded exactly once
→ Membership activates when policy conditions are satisfied
→ confirmation email
→ member dashboard
```

### UX rules

- Backend returns authoritative price/eligibility.
- Checkout must prevent accidental duplicate submission.
- `processing/pending` must be distinguishable from `paid/active`.
- Browser success redirect alone must not claim final payment truth if webhook reconciliation is pending.
- Failed payment should show a safe recovery path without creating a duplicate membership/charge.

## Parent / Guardian member portal

### Dashboard

```text
Sign in
→ see linked children
→ select child
→ membership summary
→ next payment/payment status
→ next training
→ important notification/action
```

A parent with multiple children uses one account.

### Membership/payment view

```text
Child
→ Membership
→ Programme / Plan
→ status
→ start/end dates
→ next installment where applicable
→ payment history / receipts
→ approved support/cancellation/renewal action
```

Guardian cannot directly edit authoritative payment or membership state.

### Schedule

```text
Child
→ Schedule
→ upcoming session
→ venue/court/time/status
→ updated/cancelled/rescheduled state if changed
```

The authoritative schedule comes from backend/Admin operations.

### Language

Each account selects its own locale. Parent and child locale choices do not alter each other's authorization or source data.

## Administrator / Academy operations

### Configure Academy offering

```text
Admin
→ Programme
→ create/edit U12 Academy
→ create Programme Offering
→ select venue/court
→ capacity
→ schedule/term
→ publish/activate
```

No developer release is required for normal Programme/Offering changes.

### Configure Membership Plan

```text
Admin
→ Membership Plans
→ create/edit plan
→ duration/commitment
→ billing frequency
→ recurring/upfront price
→ session allowance/eligibility
→ benefits reference
→ active/inactive
```

Prices are configuration/data, not hard-coded application constants.

### Family/member administration

```text
Admin
→ search family/athlete
→ view relationship
→ Programme Offering / Membership
→ status and relevant payment summary
→ perform only authorized correction/support action
→ reason/audit record where required
```

### Finance/admin view

```text
Payments
→ collected / scheduled / failed / overdue
→ open transaction/installment
→ view safe provider/reference information
→ approved retry/payment-link/refund/support action when implemented
→ audit
```

Coaches do not receive this view by default.

### Schedule management

```text
Programme Offering / Session Series
→ maintain recurring schedule
→ generated Session occurrences
→ change one occurrence OR record closure
→ cancel/reschedule/create replacement
→ save
→ family schedule updates
→ Notification event produced for material changes
```

Historical occurrences should not silently disappear.

## Payment lifecycle workflows

### Successful initial payment

```text
Checkout initiated
→ provider tokenizes/authenticates payment method
→ payment succeeds
→ provider sends signed webhook
→ verify signature
→ deduplicate provider event
→ mark Payment / Installment paid
→ evaluate Membership activation
→ create audit/domain events
→ Notification confirmation
```

### Recurring renewal

```text
Installment due
→ Billing executes/provider processes approved recurring charge
→ signed provider event
→ idempotent reconciliation
→ Installment paid
→ Membership remains Active
→ receipt/notification
```

A finite plan stops creating/charging installments after the configured commitment count.

### Failed renewal — V1 automation

```text
Charge fails
→ Payment failed
→ parent notified
→ membership remains Active during configured grace policy where applicable
→ retry/reminder policy
→ still unpaid after threshold
→ Installment Overdue
→ Membership may become Suspended according to policy
```

### Recovery/reactivation

```text
Outstanding installment paid
→ reconcile successful payment
→ evaluate remaining overdue state
→ if policy conditions satisfied: Membership Active
→ confirmation notification
```

Membership state and payment state remain separate throughout.

## Venue closure / schedule exception

```text
Admin records Venue/Court closure
→ affected Session occurrences identified
→ cancel/reschedule/replacement decision
→ family-facing schedules updated
→ material-change notification
→ if business policy requires membership extension:
   create auditable MembershipTermAdjustment
```

Do not silently modify contract history.

## Coach workflows — V1+

### Attendance

```text
Coach
→ assigned session
→ roster
→ Mark All Present
→ edit exceptions: late / absent / excused
→ confirm
→ Attendance becomes official
→ AthleteAttendanceConfirmed event
```

Future QR scan creates a check-in signal; coach confirmation remains authoritative unless a future decision changes policy.

## Athlete development — V2

```text
Coach
→ Athlete
→ Development Framework
→ evaluation
→ strengths/priorities
→ shared note and/or internal note
→ save
```

Family sees only authorized shared content. Official evaluations remain coach-owned.

## Tournament / Camp — V2

```text
Guardian signs in
→ select existing child
→ open KHLIM 3x3 / Camp
→ backend evaluates eligibility/membership pricing
→ register
→ reuse shared Billing for payment
→ registration attaches to existing Athlete identity
```

External/public participant flows may use the website without forcing installation of the Super App.

## KHLIM Assist

```text
Website/social/member asks event question
→ channel supplies available context
→ KHLIM Assist requests approved event knowledge/API
→ authorization applied for member-only context
→ answer from authoritative event data
→ uncertain/sensitive query escalates safely
```

KHLIM Assist does not own duplicate Event truth.

## Notification flow

```text
Domain event
→ Notification Service
→ recipient + preference + locale
→ template
→ channel adapter
→ email now / WhatsApp later / push with Super App
→ delivery status recorded
```

Failure of one channel should not crash the originating Membership/Payment/Scheduling transaction.

## Controlled test drive before public launch

### Internal alpha
Developer/KHLIM management/admin/coaches use test accounts/payment sandbox and deliberately test failure cases.

### Closed family beta
Approximately **5–10 families** use the product with minimal guidance.

### Expanded Academy pilot
Approximately **15–30 families** exercise real-world programme/payment/schedule behaviour.

### Release candidate
Feature freeze; focus on bugs, security, payment integrity, performance, backup/restore, monitoring, browsers/devices.

### Limited production
Small invited cohort first, monitored for 24–72 hours before expansion.

Any unresolved P0/P1 defect means **NO PUBLIC LAUNCH**.

## MVP end-to-end validation journeys

Before launch, test at minimum:

1. Public visitor discovers a Programme Offering and creates a family account.
2. Guardian links/adds a child and unrelated guardian cannot access that child.
3. Backend returns correct Membership Plan price; client tampering cannot reduce it.
4. Initial payment succeeds and verified webhook activates Membership exactly once.
5. Duplicate webhook does not duplicate payment, membership activation, receipt, or entitlement/event processing.
6. Browser closes after payment; webhook still reconciles correct account state.
7. Failed payment does not activate a paid-required Membership incorrectly.
8. Fixed-cycle recurring plan cannot charge beyond configured installment count.
9. Admin can change Programme/Offering/Plan configuration without code release.
10. Parent dashboard shows correct membership/payment/schedule state.
11. Coach cannot access family finance data.
12. Venue/session change appears to affected family and produces expected notification.
13. Account/family-link revocation removes protected access.
14. Different locales render the same authorized source data safely.
15. Backup restore is successfully tested and financial records can be reconciled afterward.
16. Rollback/incident procedure is rehearsed for a severe website/API release defect.
