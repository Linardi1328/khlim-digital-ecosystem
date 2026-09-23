# ADR 0008 — Website-first shared commercial platform

**Status:** Accepted
**Date:** 2026-08-26

## Context

The earlier delivery plan treated the native KHLIM Super App as the first functional client and deferred integrated payments until after the basketball app matured.

KHLIM's confirmed business plan now requires the digital platform to support academy discovery, family registration, configurable programmes, memberships, recurring billing, schedules, and operational administration while the academy is still small. The academy is expected to be the recurring-revenue foundation for a wider KHLIM sports ecosystem that can later include tournaments, camps, competitive teams, private coaching, merchandise, and additional sports.

Building a separate website/backend first and then recreating business logic for mobile would create unnecessary cost and long-term drift.

## Decision

KHLIM will use a **website-first, shared-platform architecture**:

> **One backend. One database. One authentication system. One payment infrastructure. Multiple frontends.**

The first production clients are:

- `apps/web` — public KHLIM website plus authenticated family/member portal;
- `apps/admin` — staff administration and operations;
- `apps/api` — NestJS modular-monolith business API.

`apps/mobile` remains a reserved Expo/React Native client but is not the first product vertical. It will consume the same API and domain services when business usage justifies native mobile investment.

The commercial foundation becomes part of the MVP architecture rather than a post-launch add-on. Core domains include:

- Programmes / Programme Offerings;
- Membership Plans / Memberships;
- Billing / Payments;
- payment schedules/installments and verified webhooks;
- Benefits / Entitlements;
- Venues / Courts / Scheduling;
- Notifications;
- Events with later Tournament/Camp extensions.

Payment provider integration must sit behind a provider-neutral interface. KHLIM must not store raw card numbers, CVVs, or equivalent sensitive credentials. Membership lifecycle and payment lifecycle remain separate.

## Consequences

### Positive

- KHLIM can launch useful revenue/operations infrastructure before a native app is justified.
- Website and future mobile clients reuse the same identity, programme, membership, payment, notification, and event rules.
- Families keep one KHLIM account across academy and future services.
- Programme names, prices, packages, venues, capacities, retry policies, and benefits can be configured without client releases where appropriate.
- Native mobile development becomes a client/product investment rather than a backend rewrite.

### Tradeoffs

- Phase 1 must support two Next.js clients (`web` and `admin`) plus the API boundary.
- Payment, membership, and financial audit requirements arrive earlier in the roadmap.
- Security and recovery requirements become stricter before MVP because the first release handles real money and family data.
- The mobile scaffold may exist before it receives significant product implementation.

## Superseded delivery assumptions

This ADR supersedes the **delivery ordering** in earlier documents that described a player-first mobile vertical and deferred integrated payments until post-launch.

It does **not** supersede:

- ADR 0001 modular monolith;
- ADR 0003 Guardian ↔ Athlete many-to-many relationships;
- ADR 0004 technology-stack direction, except that Next.js now serves both public/member web and admin clients;
- ADR 0005 basketball-first sport-aware core;
- ADR 0006 localization-first;
- ADR 0007 coach-confirmed attendance.

## Guardrail

The website-first decision is a delivery and channel decision, not permission to duplicate business logic in Next.js. Prices, membership state, eligibility, payment state, authorization, and entitlements remain backend-authoritative.