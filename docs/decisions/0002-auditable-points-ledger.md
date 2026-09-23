# ADR 0002 — Use an Auditable Points Ledger

**Status:** Accepted

## Context

KHERO points may be earned through trusted club activities and spent on rewards or discounts. A single mutable `points_balance` field would not explain why a balance changed, would make disputes harder to investigate, and could create integrity problems when events are retried.

## Decision

Point changes will be represented as auditable transactions.

Each transaction should record enough context to explain the change, such as:
- player;
- signed amount;
- reason/type;
- source event/reference;
- actor when manually initiated;
- timestamp;
- idempotency/uniqueness mechanism where needed.

The authoritative balance is the sum of valid ledger transactions, or a derived/cache balance that can be reconciled against that ledger.

## Consequences

### Positive
- balance history is explainable;
- easier dispute/support investigation;
- safer reward redemption;
- duplicate processing can be detected/prevented;
- manual adjustments are attributable;
- future campaigns and reward rules remain easier to evolve.

### Negative / costs
- more data than a single balance column;
- queries may require aggregation or a reconciled cache;
- correction workflows must preserve audit history rather than silently overwriting it.

## Rules

- Clients never award points directly.
- Automated awards must originate from trusted server-side business facts.
- Manual adjustments require authorization and a reason.
- Redemptions must be transactional.
- Event retries must not produce duplicate awards for the same qualifying occurrence.
