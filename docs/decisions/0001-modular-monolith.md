# ADR 0001 — Start with a Modular Monolith

**Status:** Accepted

## Context

KHLIM Super App will contain several domains—identity, family, teams, training, attendance, development, events, KHERO, rewards, coach services, notifications, and audit. The product is expected to evolve for years, so tight coupling would make future changes expensive. At the same time, the initial team and scale do not justify the operational complexity of many independently deployed services.

## Decision

The initial backend will be implemented as a **modular monolith**:
- one primary backend deployment;
- explicit domain modules;
- module-owned logic/data responsibilities;
- defined interfaces for cross-module interaction;
- domain events for side effects that should remain loosely coupled;
- no ad hoc cross-module table writes.

Modules may later be extracted into services only when a concrete operational or ownership need exists.

## Consequences

### Positive
- simpler local development and deployment;
- easier transactions and debugging;
- fewer infrastructure failure modes;
- lower cost/operational overhead;
- strong maintainability if boundaries are enforced;
- future service extraction remains possible.

### Negative / risks
- boundaries are organizational/code-level rather than network-enforced;
- careless developers can still create coupling unless reviews/tests enforce conventions;
- the backend deploys as one unit initially.

## Alternatives considered

### Microservices from day one
Rejected because service discovery, distributed tracing, network failures, deployment coordination, event infrastructure, and cross-service data concerns would add complexity without proven scale requirements.

### Unstructured monolith
Rejected because it would optimize only for short-term speed and make future feature evolution significantly riskier.
