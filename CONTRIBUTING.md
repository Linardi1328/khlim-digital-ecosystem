# Contributing to KHLIM Super App

The project is currently in pre-development. These conventions are intentionally lightweight and should evolve with the implementation stack.

## Before implementation

For substantial features:
1. Confirm the feature belongs in the current MVP/roadmap phase.
2. Check relevant product requirements in `docs/product/requirements.md`.
3. Identify the owning backend/module boundary in `docs/architecture/module-boundaries.md`.
4. Consider authorization, privacy, audit, and minor-data implications.
5. Add or update an ADR if the change introduces a significant long-term architecture decision.

## Branches

Prefer focused branches using descriptive names, for example:

```text
feat/attendance-roster
fix/guardian-access-check
docs/reward-rules
chore/update-tooling
```

Avoid mixing unrelated product changes in one branch.

## Pull requests

A pull request should explain:
- what changed;
- why it changed;
- relevant requirement/issue references;
- security/privacy impact if any;
- how it was tested;
- screenshots/video for meaningful UI changes where useful.

## Code expectations

Once the application is scaffolded, contributions should normally pass:
- formatting/linting;
- type checking;
- unit tests;
- relevant integration/authorization tests;
- production build validation where configured.

Do not bypass failing checks simply to merge faster.

## Architecture boundaries

- Do not let UI code access database tables directly.
- Do not write another domain module's data through ad hoc cross-module access.
- Prefer explicit services/interfaces and domain events.
- Do not duplicate authorization policy only in client code.
- Treat mobile clients as untrusted callers.

## Security and privacy

Never commit:
- passwords;
- API keys/tokens;
- database credentials;
- signing credentials;
- production environment files;
- exports of real player/parent data.

Avoid placing sensitive personal information in issues, PR descriptions, screenshots, test fixtures, or logs.

## Database changes

- Use versioned migrations once migration tooling exists.
- Add database constraints for important integrity rules.
- Consider compatibility with mobile clients that may not update immediately.
- Destructive migrations require an explicit preservation/migration plan.

## Documentation

Update docs when behavior or decisions materially change. The goal is not documentation for its own sake; it is to keep future contributors from having to reverse-engineer product intent from code.

## Definition of done

A feature is not done merely because the happy-path screen works. Depending on the feature, completion includes:
- authorization;
- validation;
- failure/empty/loading states;
- tests;
- observability;
- migrations;
- documentation;
- accessibility;
- privacy/security review;
- staging verification.
