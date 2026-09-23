# Platform Expansion Backend Plan

**Status:** Accepted implementation planning baseline

This document preserves the backend adjustments required to evolve the existing KHLIM Digital Ecosystem into a multi-organization sports platform without rebuilding the current modular-monolith foundation.

It should be read with:

- `docs/decisions/0009-organization-tenancy-and-ownership.md`;
- `docs/decisions/0010-organization-scoped-authorization.md`;
- `docs/decisions/0011-evidence-provenance-and-corrections.md`;
- `docs/architecture/module-boundaries.md`;
- `docs/roadmap/development-roadmap.md`.

## Core implementation principle

The target architecture is:

```text
Global Identity Layer
  ├─ User
  ├─ Athlete
  └─ Guardian relationships

Organization Layer
  ├─ Organization
  ├─ OrganizationMembership
  ├─ OrganizationRoleAssignment
  ├─ OrganizationSetting / Branding
  └─ OrganizationSport

Organization Operating System
  ├─ Academy Programmes / Offerings / Memberships
  ├─ Teams
  ├─ Events / Competitions
  ├─ Registrations / Rosters
  ├─ Scheduling / Venues / Courts
  ├─ Attendance / Check-In
  ├─ Games / Results
  ├─ Notifications / Content
  ├─ Billing attribution
  ├─ Media
  └─ Merchandise marketing / later Commerce

Evidence & Provenance Layer
  ├─ EvidenceSource
  ├─ EvidenceLink
  ├─ VerificationDecision
  └─ Correction / Supersession

Verified Athlete Record
  └─ projection of authorized verified domain facts

Intelligence Layer — later
  ├─ assisted ingestion
  ├─ recommendations / query
  └─ future Twin / video intelligence
```

The platform remains a modular monolith. Multi-tenancy does not justify microservices by itself.

---

## 1. Tenant ownership classification

Do not add `organizationId` blindly to every table.

### Platform/global data

The following concepts should remain organization-neutral unless future evidence proves otherwise:

- `User` authentication principal;
- `AthleteProfile` durable athlete identity;
- Guardian ↔ Athlete family relationships;
- base `Sport` catalogue;
- platform-level operator roles/settings/audit where truly global.

### Organization-owned data

The following should become explicitly organization-owned directly or transitively:

- staff memberships and permissions;
- Programmes;
- Programme Offerings;
- Membership Plans;
- Memberships;
- Venues and Courts initially;
- Training Sessions and operational scheduling;
- Teams and Team Memberships;
- Events / Competitions;
- registrations / entries;
- rosters;
- games / fixtures / results;
- attendance / check-in;
- organization announcements/content;
- organization-facing media ownership/associations;
- organization settings/branding;
- operational reporting;
- payment/membership attribution.

### Mixed / portable data

Some facts originate inside one organization but may later appear in an athlete-facing portable record when policy permits:

- roster participation;
- official event/team results;
- verified achievements;
- approved competition statistics when available;
- approved media;
- later development/performance records where sharing rules allow.

Origin, verification, and disclosure policy must remain distinct fields/concepts.

---

## 2. Organization kernel

Add an `Organization` module before expanding Events/Evidence materially.

Suggested first models:

```text
Organization
- id
- slug
- legal/display name as required
- status
- createdAt / updatedAt

OrganizationMembership
- id
- organizationId
- userId
- status
- joinedAt / revokedAt

OrganizationRoleAssignment
- id
- organizationMembershipId
- role
- createdAt

OrganizationSetting
- organizationId
- currency
- timezone
- defaultLocale
- feature/configuration flags kept deliberately small

OrganizationBranding
- organizationId
- displayName
- logo/media reference
- approved theme tokens
- public workspace/domain metadata later

OrganizationSport
- organizationId
- sportId
- active
- organization-specific presentation/configuration where justified
```

Avoid tenant-specific arbitrary JSON as the default configuration strategy. Add explicit fields/models when a requirement is understood.

### KHLIM migration

Create **KHLIM Basketball = Organization #001** and backfill current KHLIM-owned operational records.

Use:

```text
expand
→ backfill
→ switch reads/writes
→ validate
→ add non-null/unique constraints
→ remove temporary implicit-KHLIM fallback
```

Existing public/member URLs should not be broken merely to expose tenancy. KHLIM organization context can initially resolve from known host/configuration and authenticated membership.

---

## 3. Authorization implementation

The current global staff-role model must not survive unchanged into external tenancy.

Every tenant-owned API path should resolve:

```text
Authenticated User
+ active OrganizationMembership
+ organization-scoped role
+ resource relationship / policy
= access decision
```

Implementation guidance:

- introduce an `OrganizationContext` resolver/decorator/helper in the API;
- extend authorization policy primitives rather than adding ad hoc controller checks;
- organization roles are scoped to exactly one organization;
- keep rare platform-operator permissions separate;
- re-check tenant ownership at the service/domain mutation boundary for sensitive operations;
- preserve AAL2/MFA requirements for privileged administration;
- include organization context in sensitive audit events;
- finance and coaching/event scopes remain separable;
- never rely on hidden UI, client-provided organization IDs, or route names as the security boundary.

Adversarial tests are release-critical before Organization #002.

---

## 4. Existing model adjustments

### Programmes

Current globally unique Programme codes should become organization-scoped where business identifiers are organization-local:

```text
@@unique([organizationId, code])
```

A Programme remains distinct from a Team.

### Membership Plans

Plans become organization-owned. Prices remain backend-authoritative and continue using minor units.

### Venues / Courts

Initially treat Venue/Court as organization-owned for simple isolation. A future shared-venue directory can be introduced only if multiple organizations genuinely need to reference one canonical facility.

### Scheduling

Move toward durable Venue/Court/Coach references where operational truth requires them. Display-name snapshots may remain for historical rendering, but names alone should not be authoritative once Event/Twin-quality scheduling is introduced.

### Billing

Keep the provider abstraction and idempotency/webhook rules. Add organization attribution to the commercial object/payment context.

Do not implement bring-your-own-merchant/payment-provider accounts for external organizations until there is a concrete commercial/compliance need. KHLIM/platform-managed payment configuration can remain the first operating model.

### Editorial / achievements

Editorial content remains useful for marketing but is not the Verified Athlete Record. Player Spotlight records that only contain names must not be treated as durable athlete-history facts.

Where editorial content references a verified athlete/event achievement, connect it to the underlying durable records rather than duplicating the historical claim.

### Audit

Preserve append-only audit behavior. Add organization context for tenant-owned actions and distinguish platform-level audit visibility from organization-level audit visibility.

---

## 5. Event OS target model

The first real product-learning slice after tenancy should support one KHLIM tournament end to end.

Suggested explicit models:

```text
Event
EventDivision / Category        // only if required by actual tournament
Team
TeamMembership                  // durable team participation where appropriate
EventRegistration / TeamEntry
Roster
RosterEntry
CheckInRecord
Game / Fixture
GameResult
Placement / EventResult
EventAnnouncement
```

Do not attempt to model every sport/competition format generically. Support KHLIM's real basketball tournament format first, while keeping identity, organization, evidence, media, and common event lifecycle reusable.

Core workflow:

```text
registration
→ identity resolution
→ team / roster
→ check-in
→ schedule / fixture
→ result entry
→ result confirmation / correction
→ placement
→ evidence
→ athlete history projection
```

---

## 6. Evidence / provenance implementation

Evidence explains *why a fact is trusted*; Audit explains *who changed the system*.

Suggested primitives:

```text
EvidenceSource
- id
- organizationId where originated
- sourceType
- source reference / safe metadata
- capturedAt
- createdBy

EvidenceLink
- evidenceSourceId
- targetType
- targetId
- relationshipType

VerificationDecision
- targetType
- targetId
- status
- decidedBy
- decidedAt
- reason / basis

Correction / Supersession
- targetType
- priorVersionId
- replacementVersionId
- reason
- actor
- timestamp
```

Prefer explicit foreign-keyable relationships where practical. A generic target reference may be acceptable at the provenance edge if paired with strong service validation, but it must not replace typed domain records.

### Verification behavior

Start with a small useful lifecycle and expand only as needed:

```text
UNVERIFIED
SELF_SUBMITTED
AI_EXTRACTED_PENDING_REVIEW
STAFF_CONFIRMED
ORGANIZATION_VERIFIED
SOURCE_VERIFIED
```

A later `PLATFORM_VERIFIED` state requires a documented basis and must not imply guarantees beyond that basis.

### Corrections

Do not silently overwrite material official results. Preserve a traceable correction/supersession relationship and the old source state.

### Missing information

No player stats/video/evidence means **unavailable**, not zero and not inferred.

---

## 7. Verified Athlete Record

The Athlete Record should be a projection of verified authorized domain facts, not a second manually maintained CV.

Possible projection:

```text
Athlete
  ├─ organization participation history
  ├─ team history
  ├─ competition/event participation
  ├─ verified results / placements
  ├─ verified achievements
  ├─ approved statistics when available
  └─ approved media
```

Every displayed historical claim should retain provenance/verification references internally.

Portability does not imply automatic organization-to-organization disclosure. Sharing rules must be permissioned and age/guardian-aware.

---

## 8. Data ingestion strategy

Order implementation by trust and operational value:

1. native platform input;
2. streamlined manual entry;
3. CSV/Excel import;
4. document/OCR-assisted candidate extraction;
5. coach voice candidate observations;
6. external athlete-submitted evidence;
7. external integrations;
8. video/computer-vision extraction much later.

CSV/Excel is an important migration and grassroots-operations feature, not a temporary embarrassment.

Suggested import pipeline:

```text
upload
→ map columns
→ validate
→ preview
→ duplicate/conflict review
→ human confirm
→ commit
→ evidence + audit
```

All AI-assisted ingestion uses:

```text
raw source
→ candidate interpretation
→ human/authorized review
→ accepted typed fact
```

---

## 9. White-label implementation

Use one shared codebase.

Organization configuration can control:

- organization name;
- logo/media;
- approved colors/theme tokens;
- timezone;
- currency;
- supported locales;
- enabled modules when the feature-control model is introduced;
- public workspace/domain later.

Do not build arbitrary per-tenant code hooks or separate applications.

Custom domains, branded email, and deeper report branding arrive only after Organization #002 proves demand.

---

## 10. Merchandise marketing and later Commerce

KHLIM may market club merchandise through the ecosystem. Preserve this as an explicit product capability without forcing full e-commerce into the first tournament/platform milestones.

### Merchandise Marketing — earlier, lightweight

The public ecosystem may support organization-branded merchandise discovery such as:

- featured merchandise cards/collections;
- product name and approved description;
- product/variant imagery;
- indicative price or price range where approved;
- availability/status labels;
- size/variant information where useful;
- campaign/season collection;
- enquiry / interest / pre-order call-to-action;
- member-only or public visibility;
- organization-specific branding.

Suggested backend concepts when this feature is implemented:

```text
MerchandiseCollection
MerchandiseProduct
MerchandiseVariant        // only when variant behavior is actually needed
MerchandiseMedia
MerchandiseInterest / PreorderIntent   // optional lightweight lead capture
```

These records are organization-owned.

### Transactional Commerce — later

If KHLIM later sells directly in-platform, extend the Commerce domain with explicit transactional concepts:

```text
Order
OrderItem
Inventory / stock policy if required
Fulfilment / collection status
Refund linkage where appropriate
```

Payments reuse Billing rather than introducing a second checkout/payment source of truth.

Do not build large inventory, logistics, marketplace, or multi-seller systems before real sales volume/requirements justify them.

### Architectural guardrail

**Marketing catalog ≠ transactional commerce.**

The platform can begin by helping KHLIM promote merchandise and capture demand while keeping payment/order complexity deferred. This provides marketing value earlier with low architectural regret.

---

## 11. Testing priorities

### Tenant isolation

Automate attempts such as:

- Org A admin reading/updating Org B athlete, event, payment, session, media, or merchandise IDs;
- Org A coach using Org B session/roster IDs;
- Org A finance using Org B payment IDs;
- import payloads containing foreign tenant IDs;
- stale/revoked OrganizationMembership;
- suspended/deactivated users;
- cross-tenant reporting filters.

All must fail closed.

### Evidence

Verify:

- self-submitted/AI candidate data cannot appear as verified;
- correction preserves prior material values/provenance;
- athlete-history projection preserves evidence state;
- unavailable stats are never synthesized as zero;
- imports remain idempotent/reviewable where retries occur.

### Full event fixture

Create an automated release-critical journey:

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

### Merchandise marketing

When introduced, test organization ownership, visibility rules, variant/status display, safe media, and absence of fake inventory/payment truth.

---

## 12. Implementation sequence

The preferred sequence is:

1. Organization #001 compatibility slice;
2. tenantize and finish existing Academy/Admin operations;
3. KHLIM Event OS vertical slice;
4. Evidence Engine + Verified Athlete Record V1;
5. minimal white label + Organization #002 pilot;
6. merchandise marketing can be introduced as a small public-growth capability once tenant ownership/branding are stable, without blocking the Event/Evidence proof;
7. AI-assisted ingestion/media;
8. development/performance intelligence;
9. Twin/video intelligence only after verified data volume and operational evidence justify it;
10. transactional merchandise commerce only when KHLIM wants real in-platform ordering/payment/fulfilment.

## Non-goals for the early platform phases

Do not introduce yet:

- microservices solely because of multi-tenancy;
- database-per-organization infrastructure;
- generic every-sport competition engine;
- autonomous verified AI writes;
- talent/scouting ranking marketplace;
- professional video/statistics analytics;
- hardware tracking;
- blockchain identity;
- full offline sync engine;
- custom per-organization code forks;
- enterprise inventory/logistics platform.
