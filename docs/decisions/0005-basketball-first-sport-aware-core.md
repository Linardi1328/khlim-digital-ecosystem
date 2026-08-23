# ADR 0005 — Basketball-First Experience with Sport-Aware Core

**Status:** Accepted

## Context

KHLIM Super App is being built first for KHLIM Basketball, but the product vision includes the possibility of introducing other sports or competition programs over time.

A fully generic multi-sport product built before basketball succeeds would over-engineer the MVP. A basketball-only core, however, would create expensive migrations if core concepts such as user identity, family relationships, teams, attendance, development, and events are hard-coded to basketball.

## Decision

Build a **basketball-first user experience** on top of a **sport-aware platform core**.

Key rules:

1. The MVP UI may use basketball-native terminology such as `Player`, `Practice`, basketball positions, and basketball development skills.
2. The internal universal identity concept is `Athlete`.
3. `Sport` is a first-class domain concept from the initial schema.
4. Basketball is the only sport that must be enabled for MVP 1.0.
5. Teams/groups, training sessions, coach assignments, development frameworks, and competitions/events can reference a sport.
6. Universal modules such as Identity, Family, Audit, Notifications, and account lifecycle must not depend on basketball-specific fields.
7. Sport-specific development criteria are modeled through `DevelopmentFramework` / `DevelopmentCriterion` rather than globally hard-coded fields.
8. Additional sports are activated only when KHLIM has a validated real program/requirement.
9. True multi-organization tenancy is not part of this decision and must not be prebuilt speculatively.

## Consequences

### Positive

- Basketball UX remains focused and natural.
- The core avoids an obvious future migration from `Player`-only tables to cross-sport identity.
- Guardian relationships can persist across multiple sports.
- Events, attendance, notifications, and rewards can be reused.
- A second sport can validate/extend existing abstractions rather than forcing a platform rewrite.

### Tradeoffs

- Initial schemas/contracts include a small amount of sport context before there is a second live sport.
- Engineers must distinguish between universal athlete concepts and basketball configuration/presentation.
- Some future sport differences will still require new code; configuration cannot model every sport safely.

## Rejected approaches

### Build a fully generic sports platform now
Rejected because it would slow the basketball MVP with unknown requirements from sports KHLIM has not yet onboarded.

### Build everything as basketball-only and migrate later
Rejected because identity, family, event, development, and membership models have obvious cross-sport relevance and would be costly to unwind after production data exists.

### Add generic JSON blobs for every sport difference
Rejected as a default strategy because it weakens relational integrity and makes validation/querying difficult. Use explicit models and targeted extension/configuration instead.

## Guardrail

The goal is **future-ready, not future-built**.

Every sport abstraction must either improve current domain clarity or avoid a predictable high-cost future migration. Do not implement unused sport workflows merely because the model contains `Sport`.
