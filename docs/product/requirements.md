# Product Requirements

**Status:** Draft aligned to website-first MVP

This document translates the product brief and roadmap into implementation-oriented requirements. Requirement IDs may be referenced by issues, tests, PPO delivery tasks, and design discussions.

`MVP` means required for the first public website/member-platform launch. `V1+` means the architecture must not block it, but implementation may follow after launch.

## Functional requirements

### Platform/channel architecture

- **PLT-001 (MVP):** `apps/web`, `apps/admin`, and `apps/api` shall use one shared backend/business domain rather than separate databases or duplicated membership/payment logic.
- **PLT-002 (MVP):** `apps/mobile` shall remain compatible with the same API/auth/business contracts for later activation.
- **PLT-003 (MVP):** Business-authoritative state shall reside in backend services/database, not frontend-only logic.
- **PLT-004 (MVP):** Public and authenticated projections of the same data shall expose only fields appropriate to their audience.

### Identity and access

- **AUTH-001 (MVP):** The system shall authenticate users before protected data is accessed.
- **AUTH-002 (MVP):** The account model shall support Guardian, Athlete, Coach, and administrative/staff roles.
- **AUTH-003 (MVP):** The backend shall enforce authorization independently of client UI visibility.
- **AUTH-004 (MVP):** A guardian shall only access athletes linked through active authorized relationships.
- **AUTH-005 (MVP):** An athlete may have multiple authorized guardians and a guardian may manage multiple athletes.
- **AUTH-006 (MVP):** Administrative access shall support strong authentication such as MFA.
- **AUTH-007 (MVP):** Session revocation/deactivation shall prevent subsequent protected access.
- **AUTH-008 (MVP):** Legitimate multi-role users shall not require duplicate KHLIM accounts.
- **AUTH-009 (MVP):** Staff permissions shall support least-privilege separation between finance/admin, academy operations, coaches, event staff, and higher-privilege management roles where needed.

### Sport foundation

- **SPT-001 (MVP):** The core model shall contain a stable `Sport` concept.
- **SPT-002 (MVP):** Basketball shall be the only sport required to be enabled for the first release.
- **SPT-003 (MVP):** Core identity/family/billing/notification modules shall not depend on basketball-specific fields.
- **SPT-004 (MVP):** Internal domain naming shall use Athlete where a cross-sport identity is intended while basketball UI may display Player.
- **SPT-005 (V1+):** Adding a future sport shall not require replacing authentication, family, billing, notification, or audit foundations.

### Family and profiles

- **FAM-001 (MVP):** A guardian shall link/manage multiple athletes.
- **FAM-002 (MVP):** An athlete shall support multiple authorized guardians.
- **FAM-003 (MVP):** Family relationships shall include status and audit metadata.
- **FAM-004 (MVP):** Revoking a family link shall remove access without requiring a client release.
- **PRO-001 (MVP):** Athletes shall have a durable KHLIM profile.
- **PRO-002 (MVP):** Guardian profiles shall contain approved contact/profile fields.
- **PRO-003 (MVP):** Coaches shall have approved public/professional profile fields.
- **PRO-004 (MVP):** Each account shall store its own preferred locale.
- **PRO-005 (MVP):** Child/minor data collection shall be limited to documented operational purposes.

### Programmes and offerings

- **PRG-001 (MVP):** Admins shall configure Programme records without code changes for categories such as U9, U12, U15, Advanced Training, or future variants.
- **PRG-002 (MVP):** The schema shall not hard-code only U9/U12/U15 as the complete set of Academy programmes.
- **PRG-003 (MVP):** A Programme shall support multiple Programme Offerings across venues/schedules/terms.
- **PRG-004 (MVP):** Programme Offerings shall support capacity and active/enrolment status.
- **PRG-005 (MVP):** Programme and Team shall remain distinct domain concepts.
- **PRG-006 (MVP):** Programme changes/deactivation shall not erase historical athlete membership records.

### Membership plans and memberships

- **MEM-001 (MVP):** Admins shall configure Membership Plans including name, duration/commitment, billing frequency, amounts, currency, session allowance, eligibility, benefits reference, start/end rules, and active status.
- **MEM-002 (MVP):** Membership pricing shall not be hard-coded into client source code.
- **MEM-003 (MVP):** A Membership shall link an Athlete to a Programme Offering and selected Membership Plan.
- **MEM-004 (MVP):** Membership lifecycle shall support at least Pending, Active, Suspended, Cancelled, Completed, and Expired states.
- **MEM-005 (MVP):** Membership status shall be independent from payment/installment status.
- **MEM-006 (MVP):** Accepted membership/recurring-payment terms shall be auditable with version, actor, timestamp, and agreed commercial snapshot.
- **MEM-007 (MVP):** Membership history shall remain available after completion/cancellation/expiry.
- **MEM-008 (MVP/V1):** Membership-term extensions/adjustments caused by closure or approved interruption shall be auditable rather than silent date rewrites.

### Billing and payments

- **PAY-001 (MVP):** KHLIM shall use an external payment provider for sensitive payment capture/tokenization.
- **PAY-002 (MVP):** KHLIM shall not store full card number, CVV, or raw card credentials.
- **PAY-003 (MVP):** Payment-provider integration shall sit behind a provider-neutral payment service/interface.
- **PAY-004 (MVP):** The system shall support one-time/upfront payments.
- **PAY-005 (MVP):** The system shall support approved fixed-cycle recurring monthly membership billing when supported by the selected provider.
- **PAY-006 (MVP):** A finite 3/6/12-cycle schedule shall not create charges beyond its configured installment count.
- **PAY-007 (MVP):** Billing shall represent Payment Schedule and expected Installment state independently from actual Payment attempts.
- **PAY-008 (MVP):** Payment/installment statuses shall support scheduled, processing, paid, failed, overdue, waived, and cancelled semantics as appropriate.
- **PAY-009 (MVP):** The backend shall calculate authoritative charge amount/discount and shall not trust client-supplied totals.
- **PAY-010 (MVP):** Payment-provider webhooks shall be signature verified.
- **PAY-011 (MVP):** Provider event IDs shall be deduplicated/idempotently processed.
- **PAY-012 (MVP):** Charge-creating/retryable backend operations shall use idempotency protection where duplicate requests could double charge.
- **PAY-013 (MVP):** Browser/checkout success redirects shall not be treated as the sole authoritative payment result.
- **PAY-014 (MVP):** Payment transaction/attempt history shall be auditable and reconcilable.
- **PAY-015 (MVP):** Payment-provider test/staging/production configuration and credentials shall be isolated.
- **PAY-016 (MVP):** Parents shall be able to view appropriate payment history/receipt information.
- **PAY-017 (V1):** Failed recurring payments shall support configurable retry/reminder/grace-period policies.
- **PAY-018 (V1):** Overdue billing may suspend membership according to configurable policy and successful recovery may reactivate it automatically when appropriate.
- **PAY-019 (V1+):** Local methods such as payment links/QR/DuitNow may be added through the payment abstraction without rewriting Memberships.

### Benefits and entitlements

- **BEN-001 (V1):** Package benefits shall be represented through generic Benefit/Entitlement concepts rather than hard-coded jersey/ball conditions inside Membership logic.
- **BEN-002 (V1):** Entitlement eligibility may depend on payment milestones or upfront completion.
- **BEN-003 (V1):** Entitlement fulfilment shall support states such as Eligible, Awaiting Input, Ordered, Ready for Collection, Collected, Expired/Cancelled as appropriate.
- **BEN-004 (V1+):** Future benefits may represent merchandise, tournament/camp discounts, evaluation credits, coaching credits, or priority registration.

### Venues and scheduling

- **SCH-001 (MVP):** The system shall support multiple Venue records.
- **SCH-002 (MVP):** A Venue may contain one or more Courts.
- **SCH-003 (MVP):** Programme Offerings/Sessions shall reference venues/courts rather than hard-coding one location.
- **SCH-004 (MVP):** The scheduling model shall separate recurring schedule/session-series definitions from explicit session occurrences.
- **SCH-005 (MVP):** Families shall view upcoming sessions relevant to linked active memberships.
- **SCH-006 (MVP):** Authorized staff shall create/update/cancel basic session occurrences without code deployment.
- **SCH-007 (MVP/V1):** The model shall support venue/court closures, holidays, cancellations, rescheduling, and replacement sessions.
- **SCH-008 (MVP/V1):** Historical sessions shall not be silently deleted when schedules change.

### Website/member portal

- **WEB-001 (MVP):** Public users shall view approved KHLIM/Academy/programme information without authentication.
- **WEB-002 (MVP):** A guardian shall create an account, add/select a child, choose a Programme Offering and Membership Plan, accept terms, and enter secure provider checkout.
- **WEB-003 (MVP):** The member portal shall show linked athletes, programme/membership summary, membership status, payment information/history, and upcoming schedule.
- **WEB-004 (MVP):** Website UI shall be responsive for common mobile/tablet/desktop widths.
- **WEB-005 (MVP):** Sensitive/member-only data shall not leak into public routes or unauthenticated caches.

### Administration

- **ADM-001 (MVP):** Admin web shall manage families/athletes, Programmes, Programme Offerings, Membership Plans, Memberships, Venues/Courts, and schedule basics.
- **ADM-002 (MVP):** Authorized finance/admin roles shall view payment/failed-payment/receipt operational information.
- **ADM-003 (MVP):** Coaches shall not automatically receive financial/admin access.
- **ADM-004 (MVP):** Sensitive state changes shall create audit records where specified.
- **ADM-005 (MVP):** Routine programme/price/capacity/schedule changes shall not require developer intervention.
- **ADM-006 (MVP):** Admin interfaces shall not bypass backend authorization/business rules.

### Notifications

- **NOT-001 (MVP):** Domain modules shall publish business facts rather than directly call notification-channel providers.
- **NOT-002 (MVP):** A Notification service shall support transactional email for required MVP categories.
- **NOT-003 (MVP):** System templates shall support locale-aware rendering.
- **NOT-004 (MVP):** Delivery attempts/failures shall be observable where operationally important.
- **NOT-005 (V1):** WhatsApp shall be addable as a channel adapter without rewriting Membership/Billing/Scheduling logic.
- **NOT-006 (Super App):** Push/in-app notifications shall integrate through the same Notification domain.
- **NOT-007 (MVP+):** Sensitive overdue/payment communication shall not use public social-media channels.

### Attendance — V1

- **ATT-001:** Authorized coaches shall record present, absent, late, or excused status.
- **ATT-002:** Official attendance shall require authorized coach/staff confirmation.
- **ATT-003:** Corrections shall be auditable.
- **ATT-004:** Confirmed attendance shall publish a trusted business event.
- **ATT-005:** QR/NFC/kiosk check-in shall not automatically become official attendance without an approved policy.

### Athlete development — V2

- **DEV-001:** Development Frameworks/Criteria shall be sport configurable.
- **DEV-002:** Authorized coaches shall create official athlete evaluations.
- **DEV-003:** Shared and internal notes shall have distinct authorization.
- **DEV-004:** Evaluation history shall be retained.
- **DEV-005:** AI/translation derivatives shall never overwrite authoritative coach original text.

### Events, tournaments, and camps — V2+

- **EVT-001:** Generic Event shall support publication, dates, venue, audience, registration window, status, and translations.
- **EVT-002:** Tournament and Camp capabilities shall extend shared Event infrastructure rather than create disconnected event databases.
- **EVT-003:** Existing KHLIM families shall reuse the same account/Athlete identity for registrations.
- **EVT-004:** Member discount/eligibility shall be calculated server-side from authoritative membership state.
- **EVT-005:** Tournament/Camp payments shall reuse Billing.
- **EVT-006:** KHLIM Assist shall consume approved event/public APIs/read models rather than own duplicate event truth.

### KHERO/rewards — later

- **KHR-001:** KHERO shall remain an engagement/presentation domain, not owner of attendance/payment/evaluation truth.
- **RWD-001:** Point changes shall use an auditable ledger.
- **RWD-002:** Financial Payment and KHERO PointTransaction shall remain separate ledgers/concepts.

### Localization

- **I18N-001 (MVP):** Production UI copy shall use localization resources/keys where practical.
- **I18N-002 (MVP):** Register `en`, `ms`, `zh-Hans`, `zh-Hant`, and `hi`.
- **I18N-003 (MVP):** English shall be fallback.
- **I18N-004 (MVP):** Preferred locale is per account, not inherited automatically from linked users.
- **I18N-005 (MVP):** Dates/numbers/currency display shall be locale-aware while authoritative stored values remain locale-neutral.

### Account lifecycle

- **ACC-001 (MVP):** Users shall have an account deletion/request path before public launch.
- **ACC-002 (MVP):** Deletion/deactivation shall follow retention/legal/business policy instead of uncontrolled hard deletion.
- **ACC-003 (MVP):** Production support shall have a process for compromised accounts.

## Non-functional requirements

### Security/privacy

- **NFR-SEC-001:** All production traffic shall use TLS.
- **NFR-SEC-002:** Secrets shall not be committed to the repository.
- **NFR-SEC-003:** Authorization boundaries shall have automated tests.
- **NFR-SEC-004:** Logs shall avoid secrets/tokens/raw payment credentials and unnecessary minor/family data.
- **NFR-SEC-005:** Production admin access shall follow least privilege and stronger authentication.
- **NFR-PRI-001:** Data collection shall be minimized to documented purposes.
- **NFR-PRI-002:** Development/staging/production data/credentials shall be isolated.
- **NFR-PRI-003:** Privacy/retention/deletion/payment disclosures shall be ready before public launch.

### Reliability/recovery

- **NFR-REL-001:** Production database backups shall be automated.
- **NFR-REL-002:** Restore shall be tested into a safe non-production environment before public launch.
- **NFR-REL-003:** Payment/webhook/critical registration operations shall tolerate retries safely.
- **NFR-REL-004:** Production shall expose health/error/payment-provider/notification failure telemetry sufficient for diagnosis.
- **NFR-REL-005:** Web/API releases shall have documented rollback/forward-fix procedures.
- **NFR-REL-006:** Failure of one optional external integration shall not unnecessarily crash unrelated core modules.
- **NFR-REL-007:** Public launch shall be blocked by unresolved P0/P1 defects.

### Maintainability/extensibility

- **NFR-MNT-001:** Business domains shall follow documented module boundaries.
- **NFR-MNT-002:** Clients shall not directly depend on Prisma/database table internals.
- **NFR-MNT-003:** Major architecture changes shall be recorded as ADRs.
- **NFR-MNT-004:** Configurable programmes/prices/venues/benefits/schedules shall not require client releases where safe admin/server configuration is sufficient.
- **NFR-MNT-005:** Provider-specific payment/notification code shall remain behind adapters.
- **NFR-MNT-006:** API contracts shall use stable identifiers, not localized labels.

### Performance/UX

- **NFR-PERF-001:** Growing list APIs shall support pagination/filtering.
- **NFR-PERF-002:** Normal family dashboard load shall avoid excessive sequential network round trips.
- **NFR-PERF-003:** Payment/registration flows shall clearly represent pending/processing states and avoid duplicate submission.
- **NFR-UX-001:** Important status shall not be conveyed by color alone.
- **NFR-UX-002:** Core website forms/navigation shall follow accessibility conventions.
- **NFR-UX-003:** Layouts shall tolerate translated text expansion.

## Acceptance and launch strategy

Each phase converts relevant requirements into unit, integration, end-to-end, authorization, payment-sandbox, localization, and exploratory tests.

Before public MVP launch:
1. internal alpha;
2. closed beta with approximately 5–10 families;
3. expanded pilot approximately 15–30 families;
4. feature freeze/release candidate;
5. no open P0/P1 defect;
6. tested backup/restore and rollback/incident procedures;
7. limited production cohort before broad public opening.

Requirements change with validated KHLIM needs, but implementation must not silently diverge from this document.
