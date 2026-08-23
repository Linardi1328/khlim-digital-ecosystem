# Product Requirements

**Status:** Draft

This document translates the product brief and MVP scope into implementation-oriented requirements. Requirement IDs should be referenced by issues, tests, and future design discussions where useful.

## Functional requirements

### Identity and access

- **AUTH-001:** The system shall authenticate users before protected data is accessed.
- **AUTH-002:** The system shall support Athlete/Player, Parent/Guardian, Coach, and Administrator roles.
- **AUTH-003:** The backend shall enforce authorization independently of client UI visibility.
- **AUTH-004:** A parent/guardian shall only access athletes linked through an active authorized relationship.
- **AUTH-005:** A coach shall only access sports, teams/groups, sessions, and athletes permitted by active assignments or explicit elevated permission.
- **AUTH-006:** Administrative access shall support stronger authentication controls such as MFA.
- **AUTH-007:** Session revocation/deactivation shall prevent subsequent protected access.
- **AUTH-008:** The account model shall not require duplicate accounts when a user legitimately holds multiple roles.

### Sport foundation

- **SPT-001:** The core model shall contain a stable `Sport` concept.
- **SPT-002:** Basketball shall be the only sport required to be enabled for MVP 1.0.
- **SPT-003:** Teams/groups, training sessions, development frameworks, competitions/events, and coach assignments shall be able to reference a sport where relevant.
- **SPT-004:** Core identity and family relationships shall not be basketball-specific.
- **SPT-005:** The platform shall use athlete-oriented internal concepts while allowing sport-specific UI terminology such as `Player` for basketball.
- **SPT-006:** Adding a future sport shall not require redesigning authentication, guardian relationships, notification ownership, or audit fundamentals.

### Family

- **FAM-001:** A guardian account shall support links to multiple athletes.
- **FAM-002:** An athlete shall support links to multiple authorized guardians.
- **FAM-003:** Family links shall record status and audit metadata.
- **FAM-004:** Removing/deactivating a family link shall remove access without requiring a mobile app update.

### Profiles

- **PRO-001:** Athletes shall have a club profile with approved editable fields.
- **PRO-002:** Coaches shall have a profile containing sport, role/specialization, and approved service/contact information.
- **PRO-003:** Academic information collected in MVP shall be limited to fields with an agreed club purpose.
- **PRO-004:** Users shall have a preferred locale setting independent of other linked users.

### Teams and training

- **TRN-001:** Administrators shall create/manage sport-scoped teams/groups and memberships.
- **TRN-002:** Administrators/authorized staff shall create training sessions with sport/team context, coach, venue, date/time, status, and notes.
- **TRN-003:** Players shall see sessions relevant to their memberships.
- **TRN-004:** Parents shall see sessions relevant to linked children.
- **TRN-005:** Coaches shall see assigned sessions.
- **TRN-006:** The administration workflow shall support recurring training patterns or an equivalent mechanism that avoids manual recreation of every normal weekly session.
- **TRN-007:** Material schedule changes shall be capable of producing targeted notifications.

### Attendance

- **ATT-001:** Authorized coaches shall record present, absent, late, or excused status for rostered athletes.
- **ATT-002:** Attendance corrections shall be attributable/auditable.
- **ATT-003:** Athletes and authorized guardians shall view attendance history.
- **ATT-004:** Confirmed attendance shall produce a trusted business event suitable for downstream consumers.
- **ATT-005:** Attendance processing shall not directly mutate reward/KHERO state.
- **ATT-006:** MVP attendance shall support fast coach marking such as bulk `Mark All Present` followed by exception editing.
- **ATT-007:** Attendance shall become official only after an authorized coach/staff confirmation step.
- **ATT-008:** Future QR/NFC/kiosk check-in signals shall not independently become official attendance without an approved confirmation policy.

### Athlete development

- **DEV-001:** The club shall configure sport-specific development frameworks/categories without requiring mobile code changes where practical.
- **DEV-002:** Authorized coaches shall create athlete evaluations.
- **DEV-003:** Evaluations shall support strengths and current development priorities.
- **DEV-004:** Shared development notes shall be visible to the relevant athlete and authorized guardians.
- **DEV-005:** Internal coach notes shall not be visible to athletes/guardians.
- **DEV-006:** Official evaluations shall not be editable by athletes/guardians.
- **DEV-007:** The system shall retain evaluation history according to approved retention rules.
- **DEV-008:** Development criteria shall not be globally hard-coded to basketball-only concepts.

### KHERO

- **KHR-001:** Each eligible KHLIM Basketball athlete shall have a KHERO profile.
- **KHR-002:** Players shall select only approved customization options.
- **KHR-003:** KHERO customization and unlock logic shall not own attendance truth.
- **KHR-004:** Official visual implementation shall follow KHLIM/KHERO assets and rules supplied by the organization.
- **KHR-005:** Future use of KHERO across non-basketball sports shall remain configurable rather than being assumed in MVP schema design.

### Points and rewards

- **RWD-001:** Point changes shall be represented by auditable transactions.
- **RWD-002:** Trusted system events such as confirmed attendance may trigger configurable point rules.
- **RWD-003:** Duplicate processing shall not award duplicate points for the same qualifying occurrence.
- **RWD-004:** Manual point adjustments shall require authorized actor and reason.
- **RWD-005:** Reward redemption shall be transactional and prevent double-spending.
- **RWD-006:** Athletes and authorized guardians shall view balance and relevant history.
- **RWD-007:** Reward rules shall be able to become sport-specific or organization-wide in the future without replacing the ledger model.

### Events, competitions, and selections

- **EVT-001:** Authorized staff shall create generic events representing competitions, trials, camps, selections, or club activities.
- **EVT-002:** Events shall support sport, audience/eligibility targeting, date/time, venue, deadline, status, and details.
- **EVT-003:** The event/competition model shall support team and individual participation formats where required.
- **EVT-004:** Authorized guardians shall submit permitted responses/registrations for linked children.
- **EVT-005:** Selection announcements shall support controlled audiences.
- **EVT-006:** Unrelated users shall not receive private selection/athlete-specific information.
- **EVT-007:** Authorized admins shall publish, update, cancel, close registration for, and complete events without requiring a mobile application release.
- **EVT-008:** Important event changes such as time, venue, cancellation, or deadline changes shall be capable of producing targeted notifications.
- **EVT-009:** The system shall preserve completed/cancelled events as history rather than silently deleting them where historical visibility matters.

### Notifications and announcements

- **NOT-001:** The system shall support club, sport, team, and appropriately scoped athlete/family announcements.
- **NOT-002:** In-app notification records shall be supported.
- **NOT-003:** Push notifications shall be used for approved operational categories.
- **NOT-004:** Users shall control non-critical notification preferences.
- **NOT-005:** Domain modules shall not contain direct third-party push-provider business logic.
- **NOT-006:** System-generated notification templates shall support locale-specific rendering.

### Localization

- **I18N-001:** User-facing production UI copy shall be referenced through localization keys rather than hard-coded English strings where practical.
- **I18N-002:** The platform shall support locale identifiers for English (`en`), Bahasa Melayu (`ms`), Simplified Chinese (`zh-Hans`), Traditional Chinese (`zh-Hant`), and Hindi (`hi`).
- **I18N-003:** English shall be the canonical fallback when a requested translation is unavailable.
- **I18N-004:** A user's preferred locale shall not be inherited implicitly from a linked parent or child.
- **I18N-005:** Date, time, number, and plural formatting shall use locale-aware formatting APIs.
- **I18N-006:** Important text shall not be embedded into KHERO or club artwork when the text must be translated dynamically.
- **I18N-007:** Admin-authored content shall preserve the original text and may support approved locale variants.
- **I18N-008:** Automated/AI translation of coach-authored development notes shall never overwrite the authoritative original text.
- **I18N-009:** A dedicated Cantonese locale may be added later; Traditional Chinese shall not be labeled internally as Cantonese.

### Coach services

- **COA-001:** Families shall browse approved coach profiles/services.
- **COA-002:** Families shall submit private-training/consultation enquiries.
- **COA-003:** Authorized coach/admin users shall view and manage enquiry status.
- **COA-004:** MVP shall not require integrated payment or complex booking scheduling.

### Administration

- **ADM-001:** A web admin interface shall manage users, family links, sports, teams/groups, rosters, schedules, events, announcements, rewards, and relevant configuration.
- **ADM-002:** Sensitive admin actions shall create audit records where specified by security policy.
- **ADM-003:** Bulk import shall be supported where manual onboarding at club scale would be impractical.
- **ADM-004:** Routine schedule, event, competition, announcement, development-framework, and reward updates shall not require developer intervention.

### Account lifecycle

- **ACC-001:** Users shall have a supported account deletion/request flow before public launch.
- **ACC-002:** Deactivation/deletion shall follow documented retention and legal/business rules rather than uncontrolled hard deletion.
- **ACC-003:** Production support shall have a documented process for compromised accounts.

## Non-functional requirements

### Security

- **NFR-SEC-001:** All production network traffic shall use TLS.
- **NFR-SEC-002:** Production secrets shall not be stored in the source repository.
- **NFR-SEC-003:** Authorization boundaries shall have automated integration tests.
- **NFR-SEC-004:** Sensitive logs shall avoid tokens, passwords, secrets, and unnecessary private child information.
- **NFR-SEC-005:** Production dependencies and third-party SDKs shall be reviewed for security/data implications.

### Privacy

- **NFR-PRI-001:** Data collection shall be minimized to documented purposes.
- **NFR-PRI-002:** Production/staging/development data and credentials shall remain isolated.
- **NFR-PRI-003:** Data retention/deletion rules shall be documented before launch.
- **NFR-PRI-004:** The product shall support required privacy/store disclosures for integrated services.

### Reliability and recovery

- **NFR-REL-001:** Production database backups shall be automated.
- **NFR-REL-002:** A restoration procedure shall be tested before public launch.
- **NFR-REL-003:** Critical reward/registration operations shall handle retries safely.
- **NFR-REL-004:** The system shall expose health/error information sufficient for production diagnosis.

### Maintainability and extensibility

- **NFR-MNT-001:** Business domains shall follow documented module boundaries.
- **NFR-MNT-002:** Client screens shall not directly depend on database table implementation.
- **NFR-MNT-003:** Major architecture changes shall be recorded as ADRs.
- **NFR-MNT-004:** Configurable club concepts shall not require client releases when safe server/admin configuration is sufficient.
- **NFR-MNT-005:** Sport-specific configuration shall not leak unnecessary sport assumptions into identity, family, audit, or infrastructure modules.
- **NFR-MNT-006:** API contracts shall use stable identifiers rather than localized labels as domain keys.

### Performance

Exact targets should be established after prototype measurement, but MVP should avoid designs requiring unbounded reads or loading entire club datasets on normal screens.

- **NFR-PERF-001:** List APIs shall support pagination/filtering where dataset growth is expected.
- **NFR-PERF-002:** Normal player/parent home screens shall not require a large number of sequential network round trips.
- **NFR-PERF-003:** Attendance submission for a normal team roster shall remain usable on typical mobile connectivity.

### Accessibility and UX

- **NFR-UX-001:** Important status/information shall not be conveyed by color alone.
- **NFR-UX-002:** Text, touch targets, and navigation shall follow platform accessibility conventions.
- **NFR-UX-003:** Coach attendance workflows shall minimize unnecessary interaction cost.
- **NFR-UX-004:** Visibility of shared versus internal notes shall be unmistakable to coaches.
- **NFR-UX-005:** Layout components shall tolerate translated text expansion and different writing-system metrics without clipping essential information.

## Acceptance strategy

Each development phase should convert relevant requirements into:
- unit tests for domain rules;
- integration tests for API/database/authorization behavior;
- end-to-end tests for critical user journeys;
- localization checks for missing translation keys and fallback behavior;
- manual exploratory tests for high-impact UX and platform behavior.

Requirements may change as KHLIM validates the product, but changes should update this document rather than silently diverging from it.
