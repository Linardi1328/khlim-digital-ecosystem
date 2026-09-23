# ADR 0011 — Evidence, Provenance, and Corrections

**Status:** Accepted

## Context

The platform direction includes verified athlete history, tournament results, roster participation, media, later AI-assisted ingestion, and eventually richer performance intelligence. Those capabilities require the system to answer two different questions:

1. **Who changed the system?** — Audit.
2. **Why do we believe this sporting fact?** — Evidence/provenance.

Using only mutable domain rows or only the audit log would not provide a trustworthy, portable athlete record. Conversely, replacing typed domain facts with a generic Evidence JSON blob would weaken integrity and querying.

## Decision

Keep sporting facts in explicit domain models and attach reusable provenance to them.

Conceptually:

```text
Typed domain fact
(GameResult / RosterEntry / Achievement / later Stat)
        ↑
EvidenceLink
        ↑
EvidenceSource

VerificationDecision
Correction / Supersession
AuditEvent
```

Key rules:

1. Results, rosters, achievements, statistics, and other business facts remain typed domain records.
2. `EvidenceSource` records where supporting information came from, such as native platform entry, organizer confirmation, official score sheet, CSV import, external document/URL, athlete/guardian submission, coach observation, AI extraction, or later integrated provider.
3. Verification state is explicit. Self-submitted or AI-extracted information is never silently presented as verified.
4. AI ingestion produces **candidate interpretations** that require review before becoming authoritative domain facts unless a future narrowly approved policy says otherwise.
5. Corrections do not destructively erase material historical values. A corrected fact supersedes the prior accepted version with reason, actor, timestamp, and provenance.
6. Conflicting evidence remains representable until an authorized resolution occurs.
7. Audit and Evidence remain separate concerns but may reference the same action/fact where useful.
8. Missing evidence or statistics means `unavailable`, not zero, failure, or inferred data.
9. The Verified Athlete Record is primarily a projection of authorized verified domain facts rather than a manually re-entered sporting CV.
10. Portable athlete history and public visibility are separate policies; verification does not automatically grant another organization access.

## Suggested verification lifecycle

Initial implementation may use a compact subset of these states:

```text
UNVERIFIED
SELF_SUBMITTED
AI_EXTRACTED_PENDING_REVIEW
STAFF_CONFIRMED
COACH_CONFIRMED
ORGANIZATION_VERIFIED
SOURCE_VERIFIED
PLATFORM_VERIFIED
```

The product should avoid implying that `PLATFORM_VERIFIED` is a guarantee beyond the defined verification basis.

## Ingestion rule

Every assisted ingestion channel should follow:

```text
raw source
→ candidate interpretation
→ validation / human review
→ accepted typed domain fact
→ evidence + audit
```

CSV/Excel import is an early first-class workflow. OCR, voice, external integrations, and video extraction arrive later and use the same trust boundary.

## Consequences

### Positive

- athlete history can show trustworthy provenance;
- corrections remain explainable;
- AI can reduce entry effort without becoming historical authority;
- operational facts can be reused across event, athlete, organization, and future intelligence surfaces;
- missing data remains honest.

### Tradeoffs

- evidence/correction models add implementation work before advanced athlete-history UX;
- services must preserve provenance through imports and projections;
- verification vocabulary and permission policies require careful UX and governance.

## Rejected approaches

### Store athlete history as manually editable profile fields
Rejected because it duplicates operational truth and encourages unverifiable claims.

### Store all sporting facts in one generic Evidence JSON model
Rejected because it weakens domain integrity, validation, relationships, and queryability.

### Let AI extraction write verified records automatically
Rejected because AI confidence is not sufficient authority for official sporting history.
