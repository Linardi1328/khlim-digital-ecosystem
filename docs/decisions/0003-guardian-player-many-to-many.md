# ADR 0003 — Model Guardian/Player Relationships as Many-to-Many

**Status:** Accepted

## Context

The application must support parents/guardians supervising children. Real families do not always fit a one-parent/one-child model: one guardian may have multiple children at KHLIM, and one child may have multiple authorized guardians.

Hard-coding a single `parent_id` on a player would create avoidable migration problems later and would not represent family access cleanly.

## Decision

Represent guardian-to-player access through an explicit relationship entity such as `GuardianPlayerLink`.

The relationship should support:
- guardian user reference;
- player user reference;
- active/pending/revoked status;
- relationship metadata where appropriate;
- approval/creation metadata;
- timestamps and auditability.

Authorization checks use active relationship records rather than assuming a role grants access to all players.

## Consequences

### Positive
- supports multiple children per guardian;
- supports multiple guardians per player;
- family access can be revoked without changing the user's global role;
- future approval/consent workflows have a clear place to live;
- authorization logic remains explicit and testable.

### Negative / costs
- requires an extra relationship table and lifecycle logic;
- onboarding must verify/create links correctly;
- permissions must handle relationship status changes immediately.

## Security implication

A user being a `Parent/Guardian` is not sufficient authorization to read player data. The server must verify an active link to the requested player for each relationship-protected operation.
