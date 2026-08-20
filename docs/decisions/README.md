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
- `0003-guardian-player-many-to-many.md` — family relationships support multiple guardians and multiple children.
