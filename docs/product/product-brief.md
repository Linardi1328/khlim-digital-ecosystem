# Product Brief

**Status:** Accepted current planning baseline  
**Product:** KHLIM Digital Sports Ecosystem  
**Launch organization:** KHLIM Basketball

## Problem

KHLIM needs digital infrastructure that helps a small academy operate professionally now and can later connect tournaments, camps, competitive teams, private coaching, merchandise, athlete development, additional locations, and future sports without creating separate accounts and disconnected systems.

The immediate business need is not a feature-heavy mobile app. Families need a reliable way to discover programmes, register children, select memberships, pay securely, understand schedules, and manage their account. Staff need one place to manage programmes, memberships, payments, venues, schedules, and family records without fragmented spreadsheets and manual follow-up.

## Purpose

Create one KHLIM account ecosystem and shared platform that supports the customer and athlete journey from first discovery through recurring academy participation and later KHLIM services.

The first public product is the **KHLIM website + authenticated family/member portal**, supported by the Admin web application and shared API. The future native Super App is another client of the same platform, not a separate backend.

> **One backend. One database. One authentication system. One payment infrastructure. Multiple frontends.**

## Business ecosystem

The platform should be capable of connecting, over time:
- KHLIM Basketball Academy;
- KHLIM 3x3 tournaments;
- KHLIM Academy League;
- camps;
- private/small-group coaching;
- advanced training and competitive teams;
- athlete-development programmes;
- merchandise/pre-orders;
- sponsorship-related programmes;
- future sports and sports-technology services.

The academy is expected to be the main recurring-revenue foundation.

## Primary early users

### Parent / Guardian
Creates one account, manages one or more linked children, selects programmes/memberships, accepts terms, pays, views membership/payment status and schedules, and later manages tournament/camp opportunities.

### Athlete / Player
Has a durable KHLIM Athlete identity. Basketball UI may use **Player**. Their historical programme, team, attendance, development, competition, and achievement data can accumulate over time.

### Coach
Uses role-scoped tools for assigned sessions, attendance, athlete development, and later coaching enquiries/services. Coaches do not automatically gain access to family financial data.

### Club staff / administrators
Manage configurable programmes, offerings, prices, memberships, payments, venues, schedules, events, entitlements, development, and operational reporting according to role/permission scope.

## Product principles

1. **Revenue and operations first.** Early features should improve registration, recurring revenue, collections, retention, or administration.
2. **Website first, Super App later.** Build useful shared infrastructure before investing heavily in native mobile.
3. **One KHLIM identity.** Families should not create separate accounts for Academy, 3x3, Camps, Teams, or future services.
4. **Basketball first, sport-aware core.** Only Basketball must be live for MVP, while durable domain concepts remain reusable.
5. **Configuration over hard-coding.** U9/U12/U15, venues, packages, prices, capacities, benefits, and billing policies are data/configuration where safe.
6. **Backend-authoritative business rules.** Frontends never become the source of truth for price, eligibility, membership state, payments, or permissions.
7. **Provider abstraction.** Payment and notification vendors sit behind application interfaces so KHLIM is not unnecessarily locked to one provider.
8. **Privacy and least privilege.** Children/family/financial data are minimized and server-side access controlled.
9. **Historical continuity.** Programme/team/membership/development history is retained when athletes progress.
10. **Multilingual by design.** Localization begins with the first production screens.
11. **Progressive complexity.** Features are added as business scale and real usage justify them.
12. **Production reliability before launch.** No public release with unresolved P0/P1 defects; beta, rollback, monitoring, backup/restore, and payment-integrity checks are mandatory.

## Initial customer journey

```text
Discover KHLIM website
→ create parent account
→ add/select child
→ choose programme offering
→ choose membership plan
→ accept membership/recurring terms
→ secure provider checkout/tokenization
→ verified payment succeeds
→ membership activates
→ family sees dashboard and schedule
→ staff sees authoritative membership/payment state
```

## MVP value proposition

For the first public website MVP, a KHLIM family should be able to:
- understand available Academy programmes;
- create one family account and manage multiple children;
- select a programme/location/package;
- pay upfront or through an approved recurring arrangement;
- see membership and payment status;
- see upcoming academy schedule;
- receive basic transactional communication.

Staff should be able to:
- configure programmes/offers/plans without code changes;
- manage families/athletes;
- see active/pending/suspended memberships;
- see payment success/failures and receipts;
- manage venues/courts/schedules/capacity;
- perform normal Academy administration without developer intervention.

## MVP scope boundary

The first website MVP deliberately does **not** require:
- full native Super App functionality;
- KHERO/reward engagement loop;
- coach evaluations/player-development analytics;
- 3x3/camp integration;
- attendance/QR check-in;
- merchandise shop;
- private coaching marketplace;
- additional live sports;
- social feed/direct messaging;
- advanced AI/video/statistics.

Those features remain compatible with the architecture and are introduced after the commercial/operational foundation proves itself.

## Growth progression

```text
0–30 students
Website + accounts + programmes + memberships + payments + basic admin/schedule
        ↓
30–60
Billing automation + attendance + WhatsApp + entitlements
        ↓
60–100
Development + camps + 3x3 + member discounts + richer multi-venue operations
        ↓
100+ / demonstrated demand
Native KHLIM Super App over the same APIs
```

## Long-term athlete loop

The original athlete-development loop remains valuable after the commercial foundation is established:

> **Attend → Train → Improve → Earn → Participate → Repeat**

KHERO, rewards, evaluations, competitions, and later AI can reinforce that loop without owning financial, attendance, or official coaching truth.

## Multilingual direction

Initial registered locales:
- English (`en`)
- Bahasa Melayu (`ms`)
- Simplified Chinese (`zh-Hans`)
- Traditional Chinese (`zh-Hant`)
- Hindi (`hi`)

English is the fallback. A dedicated written Cantonese locale may be introduced later if validated.

## MVP success signals

The first release is successful if:
- families can complete registration/payment without staff intervention;
- membership/payment records reconcile correctly;
- payment failures are visible and recoverable;
- staff can operate programme/membership/schedule basics without spreadsheets becoming the primary source of truth;
- families understand their membership and next training;
- support burden is manageable;
- no critical security/payment/data-integrity defects remain;
- the same backend is ready for later attendance, tournaments, camps, development, KHERO, and mobile clients.
