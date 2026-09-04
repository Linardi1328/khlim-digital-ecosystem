# Architecture Decision Records (ADRs)

This directory records significant technical/product architecture decisions so future contributors can understand why the system is structured the way it is.

## Format

Each ADR should include:
- status;
- context/problem;
- decision;
- consequences/tradeoffs;
- alternatives considered when useful.

Use sequential filenames:

```text
0001-short-decision-name.md
0002-another-decision.md
```

## Rules

- Accepted ADRs are not silently rewritten when the decision changes.
- Create a new ADR that supersedes the old one and link them.
- Small implementation choices do not need ADRs; use them for choices with long-term architectural, security, data, or operational consequences.
- ADRs describe the decision, not every line of implementation.

## Current ADRs

- `0001-modular-monolith.md` — start with strict modules inside one backend deployment.
- `0002-auditable-points-ledger.md` — point balances are backed by auditable transactions.
- `0003-guardian-player-many-to-many.md` — family relationships support multiple guardians and multiple children. The implementation terminology now evolves toward Guardian ↔ Athlete while preserving the decision's relationship semantics.
- `0004-phase-1-technology-stack.md` — TypeScript/Expo/Next.js/NestJS/PostgreSQL/Prisma managed-service baseline.
- `0005-basketball-first-sport-aware-core.md` — Basketball is the first UX while Sport/Athlete are durable core concepts. Its earlier no-prebuilt-tenancy guardrail is superseded only where stated by ADR 0009.
- `0006-localization-first.md` — localization infrastructure begins with the first production screens.
- `0007-coach-confirmed-attendance.md` — official attendance is coach/staff-confirmed; assisted check-in can be layered on later.
- `0008-website-first-shared-commercial-platform.md` — website/member portal and admin launch first on a shared backend; memberships, payments, and configurable academy operations are MVP infrastructure while native mobile is activated later.
- `0009-organization-tenancy-and-ownership.md` — introduce Organization as the shared-schema ownership/security boundary, with KHLIM as Organization #001 and global identity kept separate from tenant-owned operations.
- `0010-organization-scoped-authorization.md` — replace global operational staff authority with organization membership/roles plus resource-level policy checks.
- `0011-evidence-provenance-and-corrections.md` — keep typed sporting facts authoritative while attaching explicit evidence, verification, and non-destructive correction history.

## Next likely ADR topics

Only create these when the implementation decision is actually needed:
- exact payment gateway/provider operating model for external organizations;
- athlete-record portability/disclosure policy;
- recurring training-session generation strategy;
- event scheduling/bracket generation strategy once the first real format is known;
- media rights/consent retention model;
- transactional merchandise Commerce boundaries when real ordering is activated;
- outbox/domain-event processing implementation;
- production release/channel strategy.
