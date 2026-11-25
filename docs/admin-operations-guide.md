# KHLIM Admin Operations Console — Staff Guide

**Audience:** Approved KHLIM operations staff. **Status:** Guide based on the `main` code as of 22 October 2026; a page being listed here does **not** imply all live workflows have completed staff acceptance tests. Keep private and avoid adding real guardian, athlete, payment, or staff identity data to screenshots.

**Live Admin URL:** https://khlim-digital-ecosystem-admin.vercel.app/

## Before you begin

1. Sign in with **your own** provisioned KHLIM staff identity. Never share passwords or session links.
2. Complete the authenticator MFA challenge. Privileged views require assurance level 2 (AAL2).
3. Use the sidebar to choose a task. If a page is absent or says access restricted, ask Management for a role review; changing the display's active work view does **not** grant permissions.
4. Numbers can reflect different sources and time windows. Read each page's status, date filter, and freshness message; a blank chart or unavailable third-party analytics value is **not** necessarily zero.
5. Parent enquiries, staff permissions, registrations, billing and publish actions rely on **server-authoritative** records. Verify after changes rather than assuming a button click succeeded.
6. Never use real youth photos without confirmed publication permissions, and avoid copying identifiable guardian/athlete data outside approved workflows.

## Daily priorities

1. **Leads:** check NEW and follow-up leads; contact guardians via approved channel, record outcomes and update status carefully.
2. **Scheduling:** confirm sessions and attendance changes for the operating day.
3. **Dashboard / KPI & Health:** review anomalies and data freshness, then inspect the owning page before taking action.
4. **Payments:** finance-authorized users review gateway-settled records; do not treat a pending payment as paid.
5. **Editorial / Moderation:** only approved content with verified facts and photo rights may go public.

## Page-by-page reference

### 1. Dashboard — `/`
**Purpose:** High-level current Academy picture: active/pending memberships, athletes, open offerings, occupancy, finance attention (only if authorized), and Academy lead follow-up.

**How to use:** Sign in with MFA. Check overview totals, inspect lead counts if your role allows them, then use the relevant quick action to investigate. The planned one-request dashboard snapshot will replace two independent reads after its frontend integration is approved.

**Guardrails:** This is an overview, not a billing ledger or proof a lead was contacted. Staff roles do not gain finance or lead access from the dashboard.

### 2. Reports — `/reports`
**Purpose:** Bounded historical operational reporting: membership movement, sessions, attendance, capacity and eligible financial totals.

**How to use:** Select the permitted date interval, generate the report, check its coverage and definitions, and use any available export only for approved internal reporting.

**Guardrails:** Reports show persisted activity for the chosen interval; role-limited fields may be unavailable. Do not publish raw guardian or payment information.

### 3. KPI & Health — `/insights`
**Purpose:** Current management health signals, workload and operational KPIs.

**How to use:** Review the period label and metric definitions, compare to dashboard/reports only when the time ranges match, and follow specific operational exceptions.

**Guardrails:** Do not interpret app health tiles as proof of uptime, payment settlement or an externally monitored service-level agreement.

### 4. 3x3 Campaign Analytics — `/insights/campaigns`
**Purpose:** Track campaign-sourced Academy leads and current conversion status for the 24 October 2026 event.

**How to use:** Select an event/custom date window, refresh the report, inspect lead totals by status, then use Leads with the matching campaign source to follow up.

**Guardrails:** Database lead totals are authoritative. PostHog only counts consented, observable activity; it does not directly count physical QR scans. `CONFIG_REQUIRED` means traffic data is unavailable, **not zero**. Do not compare differently scoped dates or infer historical transitions from current statuses.

### 5. Programmes — `/programmes`
**Purpose:** Define sporting curricula and age/level eligibility, not specific session slots.

**How to use:** Review the programme catalogue, then add or edit a curriculum definition where your role and live backend permit it. Confirm age/level rules before configuring offerings.

**Guardrails:** Changing a programme is not the same as opening enrolment or charging families.

### 6. Offerings — `/offerings`
**Purpose:** Configure an actual cohort/intake for a programme, with capacity, assigned venue and enrolment status.

**How to use:** Choose the programme and intended intake/venue, verify operational capacity, create the offering, and explicitly manage open/closed status.

**Guardrails:** Capacity and registration availability are server-authoritative. Verify court availability and closure dates; never rely on cached occupancy when confirming a place.

### 7. Membership Plans — `/plans`
**Purpose:** Define duration, commitment, allowance and pricing options offered to families.

**How to use:** Inspect existing plans, configure the intended fees and terms, then verify that the live offering and enrolment copy match approved pricing.

**Guardrails:** Pricing is validated by the backend. A plan is not a successful payment, and existing contracts retain their recorded terms.

### 8. Leads — `/leads`
**Purpose:** Process guardian interest submissions before or during Academy enrolment.

**How to use:** Filter NEW or NEEDS_FOLLOW_UP; open a record; follow up through approved channels; record meaningful notes and advance status through NEW → CONTACTED → QUALIFIED → ENROLLED or CLOSED as appropriate.

**Guardrails:** Do not mark ENROLLED before enrolment is genuinely confirmed. Changes may reject stale/concurrent edits; refresh rather than overwriting another operator. Handle guardian contact details as private data.

### 9. Memberships — `/memberships`
**Purpose:** View and administer established membership contracts, dates, status and related billing state.

**How to use:** Search for a membership, inspect recorded terms and status history, then perform permitted lifecycle actions with appropriate confirmation.

**Guardrails:** Membership status is distinct from lead status. Verify billing and entitlement consequences before suspension, cancellation or activation.

### 10. Athletes — `/athletes`
**Purpose:** View athlete profiles and their legitimate family/Academy relationships.

**How to use:** Find the athlete, verify the authorized guardian link and associated programme/membership before making permitted changes.

**Guardrails:** These are minors' records. Apply least privilege, avoid unnecessary exports, and never share with unrelated users.

### 11. Guardians — `/guardians`
**Purpose:** Review guardian accounts and family relationships with athletes.

**How to use:** Search for the guardian account and inspect linked athletes and relevant Academy relationships.

**Guardrails:** Guardian identity does not automatically authorize every athlete. Do not alter relationships without verified approval.

### 12. Payments — `/payments`
**Purpose:** Review payment attempts, gateway statuses and payment operations requiring attention.

**How to use:** Inspect records and gateway references; use any permitted reconciliation action only according to the documented payment-recovery process.

**Guardrails:** Financial access is restricted. Do not mark a payment settled from a client-side message or override server/gateway confirmation.

### 13. Venues — `/venues`
**Purpose:** Manage training facilities and their courts.

**How to use:** Verify venue identity/address, add the venue, then configure associated courts and practical capacity. Coordinate intended changes with Scheduling and Offerings.

**Guardrails:** Court availability and planned closures require operational confirmation; adding a venue doesn't establish a booking.

### 14. Scheduling — `/scheduling`
**Purpose:** Set up training sessions, manage cancellations and record attendance.

**How to use:** Select the relevant offering and session date, check venue and coach details, create or update the session, then record attendance after the event.

**Guardrails:** Avoid duplicate sessions and accidental historical attendance changes. Verify data after submission.

### 15. Editorial Studio — `/editorial`
**Purpose:** Draft and manage club achievements, player highlights and communications from verified staff-supplied facts.

**How to use:** Create a draft, supply verifiable facts and approved media, inspect the generated/editable content, and submit it for review.

**Guardrails:** AI-assisted copy is never its own evidence. Youth photos and public claims need independent verification. Draft does not mean published.

### 16. Moderation — `/moderation`
**Purpose:** Final management review of editorial material and publication state.

**How to use:** Inspect the review queue, check facts and photo permissions, then approve/publish, return for editing, or unpublish where authorized.

**Guardrails:** Management/Super Admin only. Public publication is a sensitive state transition; confirm the live outcome and audit record.

### 17. Notifications — `/notifications`
**Purpose:** Send persistent announcements or operational notices to guardians and programme families.

**How to use:** Choose the message audience and content, proofread dates/venue information, send where permitted, then review recorded sends.

**Guardrails:** Double-check recipients and avoid placing confidential athlete information in broad announcements.

### 18. Accounts & Access — `/users`
**Purpose:** Manage organization membership, account status and role authority.

**How to use:** Find a member, inspect current status and organization roles, then change only approved allowlisted permissions/statuses.

**Guardrails:** Management/Super Admin only. Do not self-promote, share credentials or bypass MFA. Role changes must be audited.

### 19. Staff — `/staff`
**Purpose:** View staff identities and operational role assignments.

**How to use:** Identify the correct staff record, confirm the approved responsibility and adjust role assignments only through the privileged workflow.

**Guardrails:** Staff roles control access; active work-view selection only changes navigation, **not** authorization. Coordinate with Accounts & Access to prevent conflicting responsibilities.

### 20. Audit Log — `/audit`
**Purpose:** Inspect the append-only history of privileged administrative activity.

**How to use:** Filter for the relevant operation/date/actor, inspect the event details, and escalate suspicious changes through the owner-approved channel.

**Guardrails:** This is a traceability tool, not a way to edit prior records or grant permissions.

### 21. Settings — `/settings`
**Purpose:** Manage the small allowlisted set of Academy operational defaults, such as locale and currency.

**How to use:** Inspect current defaults, change only approved settings and verify how they affect **future** records.

**Guardrails:** Credentials, PostHog query keys, payment secrets, deployment configuration and database permissions belong in managed infrastructure, never in this page.

## Common points of confusion

- **Programme vs Offering vs Membership Plan:** Programme = what is taught; Offering = where/when/capacity of an intake; Membership Plan = price and commitment for joining.
- **Lead vs Member:** A lead is an expression of interest, not proof of an approved registration or paid membership.
- **Reports vs KPI & Health vs Campaign:** Reports = time-bounded operations; KPI & Health = current operational signals; Campaign = attribution and conversions for the event.
- **Editorial Studio vs Moderation:** Staff draft and verify content in Studio; authorized management makes final publication decisions in Moderation.
- **Accounts & Access vs Staff:** Both concern people, but access changes are security-critical. Use each page only within its authorized scope.

## Troubleshooting and escalation

- **Failed to fetch:** Confirm the official Admin URL, healthy API, active Supabase Auth and CORS allowlist. Do not retry passwords repeatedly. Use browser Network details without exposing tokens or credentials.
- **No data:** Check role/MFA, selected filters, production/preview environment, API status, and whether there are legitimately zero records. A blank card does not prove that.
- **PostHog CONFIG_REQUIRED:** This may require a server-only PostHog Query API credential in the **API** Vercel project. Never paste a personal API key into ChatGPT, GitHub, screenshots or a `NEXT_PUBLIC_*` variable. Redeploy the API after approved changes and verify an AAL2, authorized Campaign Analytics response.
- **Permission denied:** Ask the authorized KHLIM owner to review provisioned identity, organization membership and MFA. Never weaken access checks to make a demo work.
- **Suspected duplicate or wrong record:** Avoid repeated writes. Check its persisted state, audit records and expected updated time before repeating.

## Acceptance status

This reference documents intended and code-visible workflows. **Each page still requires staff user-acceptance testing** across empty/error/loading states, mobile, accessibility, role restrictions and a safe write/read verification before it is declared operationally complete. No real guardian contact details, staff tokens or payment secrets should appear in evidence artifacts.
