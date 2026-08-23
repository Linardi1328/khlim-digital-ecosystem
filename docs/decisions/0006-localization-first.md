# ADR 0006 — Localization from the First Production Screens

**Status:** Accepted

## Context

KHLIM users may prefer English, Bahasa Melayu, Simplified Chinese, Traditional Chinese, Hindi, and potentially written Cantonese in the future.

Retrofitting localization after hundreds of hard-coded English strings, fixed-width layouts, English-only notification templates, and English-only dynamic content would create significant rework.

## Decision

Internationalization/localization is part of the Phase 1 foundation.

Initial registered locales:
- `en`
- `ms`
- `zh-Hans`
- `zh-Hant`
- `hi`

English is the canonical fallback.

A future `yue-Hant` locale may be introduced if validated. Traditional Chinese is not treated as equivalent to Cantonese.

Implementation rules:

1. Production UI copy uses semantic translation keys rather than hard-coded English where practical.
2. Each user stores an independent preferred locale.
3. Locale-aware formatting is used for dates, times, numbers, lists, and pluralization.
4. Layouts tolerate translated text expansion and different script metrics.
5. Important dynamic text is not baked into KHERO/club artwork when it must change with locale.
6. Static product translations live in version-controlled resources.
7. Dynamic admin-authored content may have locale variants owned by the relevant business domain.
8. Original coach/admin authored text remains authoritative; machine/AI translations are derivative and must not overwrite the original.
9. Notification templates can render according to recipient locale.
10. Locale never changes authorization or stable domain identifiers.

## Consequences

### Positive

- New screens are localization-ready by default.
- Parents and children can use different languages on the same family data.
- System notifications can be personalized by locale.
- Adding/reviewing translation coverage is incremental rather than a major rewrite.
- Accessibility/layout issues caused by non-English text are discovered earlier.

### Tradeoffs

- Every feature has a small translation-key/formatting discipline cost.
- Translation QA becomes part of release quality.
- Dynamic club-authored content introduces editorial/review workflow questions.
- Human review may create business cost for important production translations.

## Translation rollout

Architecture support exists from Phase 1. Translation coverage can roll out progressively:

- alpha: English complete;
- early beta: Bahasa Melayu;
- club beta: Simplified Chinese;
- public-launch target: expand Traditional Chinese and Hindi after review;
- dedicated written Cantonese only after validation.

## Alternatives considered

### English-only MVP, localize later
Rejected because it encourages hard-coded strings/layout assumptions and creates avoidable rework.

### Automatically translate everything at runtime
Rejected as the default because official club communication, development feedback, consent, and future payment/legal content require meaning and accountability beyond raw machine translation.

## Revisit triggers

Revisit the tooling/workflow if:
- translation volume makes repository-managed resources difficult;
- KHLIM needs professional translation-management workflows;
- dynamic translations require dedicated approval/audit tooling;
- new markets require right-to-left or materially different locale behavior.
