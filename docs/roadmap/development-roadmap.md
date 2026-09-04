# Development Roadmap

**Status:** Accepted revised strategic baseline

**Current implementation milestone:** **Organization #001 Compatibility Slice**

**Objective:** Evolve the existing KHLIM Digital Ecosystem into a reliable, multi-organization sports operating platform while preserving the current KHLIM Academy website/member/admin foundation, one durable athlete identity, strong family/privacy boundaries, backend-authoritative commercial state, and the modular-monolith architecture.

The platform remains **basketball-first and sport-aware**. KHLIM is the first operating organization and becomes **Organization #001**. External organizations are introduced only through the same codebase and security model after tenant isolation is proven.

> Sequence and launch gates matter more than fixed dates. No calendar target overrides tenant isolation, payment integrity, data protection, evidence integrity, auditability, or unresolved P0/P1 defects.

See also:

- `docs/architecture/platform-expansion-backend.md`;
- `docs/decisions/0009-organization-tenancy-and-ownership.md`;
- `docs/decisions/0010-organization-scoped-authorization.md`;
- `docs/decisions/0011-evidence-provenance-and-corrections.md`.

---

## Roadmap principles

1. **Preserve the useful KHLIM foundation.** Do not rebuild identity, family, Academy, Billing, Scheduling, Admin, Audit, web, or API infrastructure simply because the commercial vision expanded.
2. **Organization is now a first-class ownership/security boundary.** Establish tenancy before Events, Evidence, Media, and external-organization data scale.
3. **One shared platform.** Public/member web, Admin, future Super App, Event OS, merchandise marketing, and later intelligence consume the same backend/domain truth.
4. **Global athlete/family identity; scoped organization data.** A durable athlete identity can participate in multiple organizations without exposing one organization's private records to another.
5. **Basketball first, sport-aware core.** Do not build a generic every-sport engine before real second-sport requirements exist.
6. **Typed facts before AI.** Results, rosters, memberships, payments, attendance, achievements, and later statistics remain explicit domain records.
7. **Evidence explains trust. Audit explains mutation.** Provenance and verification do not replace the immutable audit trail.
8. **AI proposes; authorized workflows decide.** AI-assisted extraction produces candidates unless a future narrowly approved policy explicitly allows otherwise.
9. **Configuration over code forks.** Organization branding, settings, programmes, merchandise marketing, events, and operational configuration use one shared codebase.
10. **Marketing catalog is distinct from Commerce.** KHLIM can promote merchandise before building full inventory/order/fulfilment complexity.
11. **Production readiness is continuous.** CI, tenant-adversarial tests, payment tests, backup/restore, monitoring, rollback, accessibility, and privacy evolve with each phase.
12. **Organization #002 arrives before advanced AI/video.** External usage must challenge KHLIM-specific assumptions before they harden into the data model.

---

# Existing foundation — preserve and continue hardening

The following work is already implemented or substantially established and remains part of the platform rather than being discarded.

| Existing phase | Status | Preserve / continue |
| --- | --- | --- |
| Product and architecture definition | Complete foundation | modular monolith, domain boundaries, sport-aware core, localization |
| Engineering foundation | Complete | monorepo, Next.js/NestJS, Prisma/PostgreSQL, OpenAPI, CI, observability |
| Identity, family and authorization | Complete foundation | Supabase-backed identity, durable Athlete, Guardian ↔ Athlete many-to-many, deny-by-default authorization, MFA primitives |
| Programmes, venues and memberships | Complete foundation | Programme/Offering separation, configurable plans/capacity/status, membership lifecycle |
| Billing/payments | Strong provider-neutral foundation | server-authoritative amounts/states, provider abstraction, idempotency, signed webhook/deduplication principles |
| Public website/member portal | Implemented integration layer | discovery, auth, family flows, enrolment, portal, localization, responsive web |
| Admin operations | Broad UI/governance foundation | reports, moderation, audit, settings, staff/account controls; finish real persisted Academy configuration |
| Scheduling/attendance/notifications | Implemented foundations, deeper integration required | sessions, attendance, notifications and operational workflows continue to mature |

The original website/member MVP launch gates still apply to real KHLIM Academy production use: secure authentication, trustworthy payments, accurate membership/schedule state, backup/restore, monitoring, legal/privacy readiness, and no unresolved P0/P1 defects.

---

# Phase 0 — Strategic alignment and ownership classification

**Status:** Planning baseline accepted; documentation alignment begins immediately.

## Objective

Make the expanded platform direction explicit without rewriting accepted historical architecture decisions.

## Deliverables

- preserve the modular-monolith decision;
- add Organization/Tenancy, organization authorization, and Evidence/Provenance ADRs;
- classify current models as platform/global, organization-owned, or mixed/portable;
- identify global uniqueness constraints that must become organization-scoped;
- reconcile written roadmap/status with actual implemented Scheduling, Notifications, Billing, Admin, and governance capabilities;
- preserve KHLIM's current URLs/branding as the default Organization #001 experience.

## Exit criteria

Every current persisted model and sensitive API operation has a documented intended ownership/security scope.

## Do not build yet

- external organization onboarding UI;
- Event OS;
- advanced Evidence UX;
- AI ingestion;
- deep white-label customization.

---

# Phase 1 — Organization #001 Compatibility Slice

**Status:** **Next implementation milestone**

## Objective

Convert KHLIM from the implicit platform owner into **KHLIM Basketball = Organization #001** while keeping the visible KHLIM product stable.

This is the highest-value architecture milestone before broad Event/Evidence expansion.

## Backend/data deliverables

Introduce the minimum organization kernel:

```text
Organization
OrganizationMembership
OrganizationRoleAssignment
OrganizationSetting
OrganizationBranding
OrganizationSport
```

Then migrate organization-owned current records using:

```text
expand
→ create Organization #001
→ backfill
→ switch reads/writes
→ validate
→ constrain
→ remove temporary implicit-KHLIM fallback
```

Initial organization ownership should cover directly or transitively:

- Programmes / Offerings;
- Membership Plans / Memberships;
- Venues / Courts;
- Sessions / operational schedules;
- organization notifications/content;
- staff membership/permissions;
- billing/payment attribution;
- organization audit context.

## Authorization deliverables

Move operational staff authority away from global roles toward:

```text
Authenticated User
+ active OrganizationMembership
+ organization role/permission
+ resource relationship
= authorization
```

Rare true platform-operator roles remain separate.

## Testing

Add release-critical adversarial tests for:

- Org A role + Org B resource ID;
- staff who belong to multiple organizations with different permissions;
- stale/revoked organization membership;
- suspended/deactivated accounts;
- cross-tenant finance/reporting queries;
- client-supplied foreign organization IDs.

## Exit criteria

- current KHLIM Academy flows continue to work;
- no tenant-owned operation depends on KHLIM being implicit;
- a synthetic Organization #002 cannot read or mutate Organization #001 data;
- organization-specific uniqueness/indexing is in place where required;
- sensitive tenant actions include organization context in audit records.

## Do not build

- database-per-tenant infrastructure;
- per-organization code forks;
- custom domains;
- general multi-sport competition framework.

---

# Phase 2 — Tenantize and finish existing KHLIM operations

**Status:** Immediately after Organization #001 compatibility

## Objective

Make the current Academy/Admin/Billing/Scheduling/Notifications stack trustworthy under the tenant boundary before adding major new domains.

## Deliverables

- connect real persisted Admin Programme/Offering/Plan/Venue/Court configuration;
- remove live optimistic/fake-success fallbacks while keeping explicit demo mode isolated;
- complete status-transition APIs and audit-sensitive mutations where currently missing;
- make list/report APIs organization-scoped;
- preserve minor-unit monetary handling and backend-authoritative price/state;
- strengthen durable Venue/Court/Coach references where scheduling truth requires them;
- verify organization-aware notifications and operational reporting;
- reconcile Billplz/payment-provider sandbox behavior with documented launch status;
- verify real staff session/MFA behavior in staging.

## Testing

- full KHLIM Academy CRUD/configuration flow;
- tenant-aware capacity tests;
- tenant-aware membership/payment tests;
- finance/admin/coach separation;
- audit persistence/immutability;
- exact-commit Admin and public web browser QA.

## Exit criteria

KHLIM can operate the existing Academy product without developer database edits or pretend persistence in live mode.

---

# Phase 3 — KHLIM Event OS vertical slice

**Status:** First major new product-learning phase

## Objective

Run one real KHLIM basketball tournament through the platform end to end.

## Must-have domain capabilities

```text
Event
Division / Category only where required
Team
Registration / TeamEntry
Roster / RosterEntry
CheckInRecord
Game / Fixture
GameResult
Placement / EventResult
EventAnnouncement
```

## Product workflow

```text
registration
→ athlete identity resolution
→ team / roster
→ check-in
→ schedule / fixture
→ result entry
→ correction / confirmation
→ placement
→ evidence
→ athlete history
```

## Import

CSV/Excel must be treated as a first-class grassroots migration/operations path:

```text
upload
→ column mapping
→ validation
→ preview
→ duplicate/conflict review
→ human confirm
→ commit
→ evidence + audit
```

## Public/member surfaces

- event schedule;
- team/roster information where policy allows;
- current/final results;
- announcements;
- clear mobile-first event navigation.

## Security

`EVENT_STAFF` and event-specific operational authority remain organization-scoped and do not grant Academy finance or unrelated athlete access.

## Exit criteria

Core tournament operations can run without a spreadsheet becoming the normal source of truth and without developer DB intervention.

## Explicit non-goals

- every tournament format;
- live professional play-by-play;
- individual player statistics unless a trustworthy source exists;
- scouting/rankings;
- video analytics;
- autonomous AI operations.

---

# Phase 4 — Evidence Engine + Verified Athlete Record V1

**Status:** Build evidence primitives alongside Phase 3 facts; make them reusable here.

## Objective

Prove that operating an event once creates trustworthy reusable athlete history automatically.

## Evidence model

Preserve explicit domain facts and add provenance around them:

```text
Typed fact
  ↑
EvidenceLink
  ↑
EvidenceSource

VerificationDecision
Correction / Supersession
AuditEvent
```

## Required behavior

- self-submitted facts remain visibly unverified until approved;
- AI-extracted facts remain candidates until authorized review;
- material corrections preserve old values/source history;
- conflicting evidence can remain unresolved;
- missing player stats/video remain `unavailable`, never inferred or converted to zero;
- verified roster/result/placement facts can project into Athlete history;
- verification does not automatically grant cross-organization visibility.

## Verified Athlete Record V1

The record is primarily a projection of authorized verified operational facts:

- organization participation history;
- team history;
- event/competition participation;
- verified team results/placements;
- verified achievements;
- approved stats only when available;
- approved media later.

## Exit criteria

Finalizing the KHLIM tournament produces athlete competition history with traceable provenance and correction history, without re-entering the same facts into a separate profile/CV system.

---

# Phase 5 — Minimal white label + Organization #002 pilot

**Status:** Earlier than advanced AI/video by design

## Objective

Test whether the platform genuinely serves another organization rather than merely storing a KHLIM `organizationId`.

## Deliverables

- organization name/logo/theme configuration;
- organization-specific timezone/currency/default locale;
- organization-scoped staff setup;
- organization-specific programmes/events/content;
- CSV migration/onboarding tooling;
- strong tenant admin/audit boundaries;
- workspace/host resolution without code forks.

## Later, not required for the first external pilot

- custom domains;
- fully branded email infrastructure;
- tenant-specific report templates;
- bring-your-own payment merchant/provider accounts.

## Exit criteria

Organization #002 can be configured and operated without KHLIM-specific code changes and cannot access KHLIM data.

---

# Phase 6 — Merchandise Marketing

**Status:** Planned growth capability; may be pulled forward after tenancy/branding are stable if KHLIM has real merchandise to promote.

## Objective

Allow KHLIM and later organizations to **market club merchandise** through the ecosystem without prematurely building a full commerce/logistics platform.

## Initial marketing capabilities

- organization-branded merchandise collections;
- featured product cards;
- product name/description;
- approved images/media;
- indicative price or price range where approved;
- sizes/variants where useful;
- availability/status messaging;
- season/campaign collections;
- public or member-only visibility;
- enquiry, interest, or pre-order call-to-action;
- analytics on approved marketing interactions where privacy policy allows.

## Suggested backend concepts

```text
MerchandiseCollection
MerchandiseProduct
MerchandiseVariant          // only if real variant behavior is needed
MerchandiseMedia
MerchandiseInterest / PreorderIntent   // optional
```

All are organization-owned.

## Guardrail

**Marketing catalog ≠ transactional commerce.**

The marketing feature must not invent stock, payment confirmation, or fulfilment state.

## Exit criteria

KHLIM can promote real club merchandise from the public/member ecosystem and capture demand through an approved low-friction CTA.

---

# Phase 7 — Media + AI-assisted ingestion

**Status:** After Events/Evidence provide trustworthy review targets

## Objective

Reduce staff data-entry effort while preserving human/domain authority.

## Deliverables

- MediaAsset ownership/associations;
- media rights/consent metadata;
- document upload;
- CSV mapping assistance;
- roster/score-sheet OCR as candidate extraction;
- coach voice candidate observations;
- duplicate-athlete suggestions;
- external evidence submissions where policy allows.

## Required trust boundary

```text
raw source
→ candidate interpretation
→ validation / human review
→ accepted typed fact
→ evidence + audit
```

## Exit criteria

AI saves operational effort without silently creating verified sporting history.

---

# Phase 8 — Development/performance intelligence

**Status:** Only after enough longitudinal verified data exists

Potential capabilities:

- coach evaluations/development history;
- family-approved development summaries;
- athlete progress queries;
- recommendation support;
- better competition/development context;
- organization analytics based on trusted operational data.

AI may summarize or recommend but does not silently become the authority for payment, attendance, selection, official evaluation, eligibility, or child-safety decisions.

---

# Phase 9 — Twin / advanced video intelligence

**Status:** Evidence-gated future capability

Begin with deterministic/rules-based operational simulation before predictive branding.

Example Event Twin use:

```text
court unavailable
→ schedule/constraint model
→ feasible alternatives
→ ranked recommendation
→ organizer approves
```

Later video/statistics intelligence is activated only when source quality, volume, consent, cost, and real user demand justify it.

---

# Phase 10 — Transactional Commerce, if validated

**Status:** Later; separate from Merchandise Marketing

If KHLIM decides to sell merchandise directly in-platform, extend the existing Billing infrastructure rather than creating another payment source of truth.

Potential explicit models:

```text
Order
OrderItem
Inventory / stock policy if genuinely required
Fulfilment / collection status
Refund linkage
```

Reuse server-authoritative prices, idempotent payment behavior, audit, and organization attribution.

Do not build a multi-seller marketplace, warehouse/logistics system, or speculative inventory platform without validated demand.

---

# KHLIM Academy production launch gate — remains active

The broader platform direction does not relax the original KHLIM launch criteria.

Before real public Academy launch:

- real Supabase production/staging flows are proven;
- payment provider sandbox/production behavior is validated;
- duplicate/delayed/failed webhook behavior is tested;
- membership activates only from trusted financial state;
- Admin supported writes persist for real;
- schedules/notifications are accurate;
- backup/restore is tested;
- monitoring/alerts are active;
- privacy/terms/recurring-payment disclosures match reality;
- common mobile/browser flows pass QA;
- no unresolved P0/P1 defects exist.

The previous approximate **15 February 2027** target remains only a planning target and must move if the quality/security gates are not met.

---

# First KHLIM tournament pilot gate

## Before the event

- Organization #001 migration is complete;
- tournament, courts, divisions, staff, teams, rosters, and schedule are configured;
- CSV import/duplicate review is tested;
- event staff permissions are verified;
- public schedule/results are available;
- check-in/result correction/announcement flows are dry-run;
- a print/export connectivity fallback exists;
- media consent policy is clear before athlete-linked publication.

## During the event

Use the platform for normal operations:

```text
check-in
→ roster correction
→ game status
→ result entry
→ result confirmation/correction
→ schedule change
→ announcement
→ approved media association where available
```

## After the event

- finalize placements;
- resolve disputes/corrections;
- generate verified athlete history from accepted facts;
- review audit/evidence coverage;
- export operational data;
- measure duplicate entry, correction volume, spreadsheet fallback, support burden, and developer intervention.

## Pilot success criteria

- zero invented statistics;
- zero cross-tenant leakage;
- no developer database edits required for normal operations;
- one athlete identity reused throughout;
- corrections are auditable;
- accepted tournament facts generate athlete history automatically;
- organizers do not fall back to spreadsheets as the primary operational truth.

---

# Release-critical test strategy for the expanded platform

## Tenant isolation

Automate malicious cross-organization access attempts for athletes, events, rosters, payments, sessions, media, merchandise, reports, and imports.

## Evidence integrity

Test verification transitions, AI/self-submitted candidates, conflicts, corrections, provenance projection, and unavailable-data behavior.

## Full event fixture

Maintain an automated journey:

```text
guardian / athlete
→ organization
→ team
→ event
→ roster
→ check-in
→ game
→ result
→ corrected result
→ placement
→ evidence
→ athlete history
```

## Existing commercial/security tests

Continue payment idempotency/webhook, family relationship authorization, finance-role separation, audit immutability, migration safety, backup/restore, accessibility, and responsive browser tests.

---

# Explicit early-platform non-goals

Do not build before evidence justifies them:

- microservices solely because of multi-tenancy;
- database per organization;
- arbitrary tenant-specific code/hooks;
- generic all-sport competition engine;
- autonomous verified AI writes;
- talent/scouting ranking marketplace;
- professional tracking/video/statistics stack;
- blockchain identity;
- hardware tracking;
- full offline synchronization engine;
- enterprise inventory/logistics platform;
- multi-seller merchandise marketplace;
- major native Super App development before usage justifies it.

---

# Next single implementation milestone

The next implementation milestone is deliberately narrow:

## **Organization #001 Compatibility Slice**

Complete when the same KHLIM website/member/admin platform continues to operate, but every organization-owned operation has an explicit tenant boundary, KHLIM is represented as Organization #001, organization-scoped staff authorization exists, and a synthetic Organization #002 cannot read or mutate KHLIM data.

Only after this should broad Event OS and Evidence implementation accelerate.
