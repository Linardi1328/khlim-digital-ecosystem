# Project Documentation

This directory is the source of truth for product, engineering, UX, security, and delivery decisions behind KHLIM Super App.

The current direction is **KHLIM Basketball first, sport-aware platform core**.

## Structure

```text
docs/
├── product/
│   ├── product-brief.md       # Why the product exists
│   ├── platform-vision.md     # Long-term multi-sport/competition direction
│   ├── mvp-scope.md           # What Basketball MVP 1.0 includes/excludes
│   ├── requirements.md        # Implementation-oriented requirements
│   └── user-roles.md          # Roles, relationships, permission model
│
├── roadmap/
│   └── development-roadmap.md # Player-first development through public launch + expansion
│
├── architecture/
│   ├── system-architecture.md # Final Phase 1 system/stack direction
│   ├── data-model.md          # Conceptual Athlete/Sport relational model
│   ├── module-boundaries.md   # Domain ownership and coupling rules
│   ├── localization.md        # Multilingual architecture and rollout
│   └── deployment.md          # Environment/release direction
│
├── security/
│   └── security-and-privacy.md
│
├── ux/
│   └── core-user-workflows.md
│
└── decisions/
    └── Architecture Decision Records (ADRs)
```

## Working rules

- Product behavior should be documented before or alongside implementation.
- Major architecture choices receive an ADR.
- MVP scope changes update `product/mvp-scope.md`.
- Strategic future capabilities belong in `product/platform-vision.md` and must not silently become MVP scope.
- Roadmap status should be updated as phases move from planned to active to complete.
- Security-sensitive decisions must be documented and reflected in implementation tests.
- Basketball-specific UX can remain focused while universal domains avoid unnecessary basketball-only coupling.
- Locale is presentation context, not a business identifier or authorization rule.
- Documentation describes intent and constraints; code/tests become the source of truth for exact implemented runtime behavior.

## Document status labels

- **Draft** — still being discussed/refined.
- **Accepted** — agreed direction for current implementation.
- **Superseded** — retained for history but replaced by a newer decision.
- **Implemented** — accepted direction is present in tested production code.

## Current stage

**Phase 0 documentation baseline is complete.**

The project is moving into **Phase 1 — Engineering Foundation**.

Immediate work before feature scaffolding:
- preserve the finalized stack through ADR 0004;
- scaffold the monorepo/apps/packages/database;
- establish Sport/Athlete fundamentals;
- establish localization resources from the first UI components;
- establish CI/testing/environment conventions.

The first functional product vertical after the foundation is the **KHLIM Basketball player experience**, followed by the coach/admin/parent workflows required to make its information authoritative and regularly maintainable.
