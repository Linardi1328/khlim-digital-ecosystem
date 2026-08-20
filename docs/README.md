# Project Documentation

This directory is the source of truth for the product, engineering, UX, security, and delivery decisions behind KHLIM Super App.

## Structure

```text
docs/
├── product/        # Why the product exists, users, scope, and requirements
├── roadmap/        # Delivery phases from planning to public launch
├── architecture/   # System structure, boundaries, data and integration direction
├── security/       # Security, privacy, minors, access control, and operational safety
├── ux/             # Core workflows for each user role
└── decisions/      # Architecture Decision Records (ADRs)
```

## Working rules

- Product behavior should be documented before or alongside implementation.
- Major architecture choices should receive an ADR.
- MVP scope changes should update `product/mvp-scope.md`.
- Roadmap status should be updated as phases move from planned to active to complete.
- Security-sensitive decisions must be documented in `security/` and reflected in implementation tests.
- Documentation should describe intent and constraints; code remains the source of truth for exact runtime behavior.

## Document status labels

Documents may use the following labels:

- **Draft** — still being discussed.
- **Accepted** — agreed direction for current implementation.
- **Superseded** — retained for history but replaced by a newer decision.
- **Implemented** — accepted direction is present in production code.

## Current stage

The project is in **pre-development / product definition**. The immediate goal is to finish requirements, UX flows, data boundaries, security constraints, and stack decisions before application scaffolding begins.
