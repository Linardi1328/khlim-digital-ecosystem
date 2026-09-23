# Localization Architecture

**Status:** Accepted for Phase 1 baseline

## Goal

Design the KHLIM Super App so multilingual support is a normal platform capability rather than a later rewrite.

The first production screens should already use localization infrastructure even if translation coverage expands progressively during alpha and beta.

## Initial locale registry

- English: `en`
- Bahasa Melayu: `ms`
- Simplified Chinese: `zh-Hans`
- Traditional Chinese: `zh-Hant`
- Hindi: `hi`

Future candidate after user validation:
- Written Cantonese: `yue-Hant`

Important distinction:
- Traditional Chinese is a writing system variant and must not be labeled internally as Cantonese.
- Mandarin and Cantonese are spoken language varieties; written locale choice needs separate product validation.

## User preference

Each account stores its own `preferred_locale`.

Example:

```text
Athlete: en
Mother: zh-Hans
Father: ms
Coach: en
```

The same training session or event can therefore be displayed to different users using different UI/system-message languages.

Locale choice must never affect authorization.

## Static UI copy

Product-owned UI copy lives in version-controlled translation resources.

Suggested package:

```text
packages/i18n/
├── src/
│   ├── locales.ts
│   ├── formatting.ts
│   ├── fallback.ts
│   └── index.ts
└── messages/
    ├── en/
    ├── ms/
    ├── zh-Hans/
    ├── zh-Hant/
    └── hi/
```

Screen/components reference semantic keys:

```text
dashboard.nextTraining
attendance.present
events.registrationDeadline
rewards.pointsBalance
```

Do not use the English display string itself as the key.

## Fallback behavior

English is the canonical fallback.

```text
requested locale
      ↓
translation exists?
  ├── yes → use translation
  └── no  → English fallback
```

Production users should not see raw missing keys such as `dashboard.nextTraining_missing`.

CI/development tooling should detect missing/unused keys where practical.

## Dynamic club-authored content

Static UI localization and dynamic content translation are different problems.

### Static product copy

Examples:
- Home
- Schedule
- Present
- Register
- Points

These belong in the application translation catalogue.

### Dynamic club content

Examples:
- competition title/description;
- event instructions;
- announcement body;
- cancellation reason;
- selection announcement.

These originate in the admin system and may have locale variants stored alongside the owning domain entity.

The original/default content remains authoritative.

Possible workflow:

```text
Admin writes original content
        ↓
Optional draft translation
        ↓
Human/club review
        ↓
Approved locale variant
        ↓
Relevant user sees preferred locale
```

If a locale variant is missing, use the approved fallback rather than inventing a translation silently.

## Coach development notes

Coach-authored shared/internal notes are sensitive to meaning.

MVP rule:
- preserve and display the authoritative original note;
- do not automatically rewrite stored notes into another language.

Future optional behavior:

```text
Original note
   ↓
AI/machine translation request
   ↓
Derived translation
   ↓
Clearly marked as translated
```

The original must remain accessible and unchanged.

## System notifications

System-generated notifications should use templates rather than storing English strings throughout business modules.

Example domain fact:

```text
TrainingSessionChanged
```

Notification rendering:

```text
recipient A: en
→ "U16 training has moved to 8:00 PM."

recipient B: ms
→ Bahasa Melayu template

recipient C: zh-Hans
→ Simplified Chinese template
```

The Notifications module owns template selection/delivery. Training should publish the fact, not compose provider-specific translated push messages.

## Locale-aware formatting

Localization includes more than translated words.

Use locale-aware APIs for:
- dates;
- times;
- numbers;
- pluralization;
- relative time;
- list formatting.

Club/event timestamps should be stored consistently and rendered using an explicit timezone. Initial club timezone is expected to be `Asia/Kuala_Lumpur` unless a future event specifies otherwise.

## Layout requirements

Components must tolerate text expansion and different writing systems.

Avoid:
- fixed button widths designed only around English;
- clipped labels;
- relying on exact word lengths;
- embedding translatable labels into images;
- typography choices without required glyph coverage.

Prefer:
- content-driven sizing;
- sensible min/max layout constraints;
- flexible wrapping;
- system/platform font fallbacks for multilingual body text;
- KHLIM brand fonts only where glyph coverage is confirmed.

## KHERO and artwork

Do not bake important language-dependent UI copy into KHERO artwork.

Prefer:

```text
[KHERO artwork]
+ runtime text layer
```

rather than producing one image per language for normal interface labels.

Artwork may contain non-translatable brand marks where approved.

## Admin experience

Where dynamic translation is supported, the admin UI should show:
- original/default content;
- available locale tabs/fields;
- translation status such as draft/reviewed;
- missing translation indicators;
- preview/fallback behavior.

Do not force administrators to fill every locale before saving an internal draft.

Publication requirements can be stricter for high-impact public content if KHLIM later defines such a policy.

## Translation rollout

Recommended sequence:

### Alpha
- English complete.
- All screens use localization keys.

### Early beta
- English + Bahasa Melayu.

### Club beta
- Simplified Chinese coverage added/reviewed.

### Public-launch target
- English.
- Bahasa Melayu.
- Simplified Chinese.
- Traditional Chinese.
- Hindi.

Actual launch coverage depends on translation review capacity and user testing; architecture support exists regardless.

## Translation quality

AI/machine translation can accelerate initial drafts but should not be the only review layer for:
- safety/privacy communication;
- registration/consent instructions;
- official selection announcements;
- player development language;
- payment/legal content when introduced.

Fluent/native human review is preferred for production-critical copy.

## Testing

Localization testing should include:
- missing-key detection;
- English fallback behavior;
- user locale persistence;
- parent/child accounts using different locales;
- locale-aware formatting;
- long translated labels;
- Chinese rendering;
- Devanagari rendering;
- push/in-app template locale selection;
- accessibility labels where localized.

## Future considerations

Potential future improvements:
- remote translation-management platform;
- translation memory/glossary;
- KHLIM-approved terminology dictionary;
- assisted admin-content translation;
- `yue-Hant` support;
- locale-specific store listings and marketing assets.

The implementation should avoid vendor lock-in by keeping stable internal locale identifiers and translation keys independent of any future translation-management provider.
