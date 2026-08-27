# Contributing to KHLIM Digital Sports Ecosystem

KHLIM is now an active multi-application TypeScript monorepo with implemented web, admin, API, database, OpenAPI and browser-test foundations. Contributions should preserve the existing domain/security rules and keep the project moving toward pre-alpha integration quality rather than treating the repository as an early scaffold.

## Before implementation

For substantial changes:

1. Confirm the change belongs in the current roadmap milestone.
2. Check relevant requirements in `docs/product/requirements.md`.
3. Check `docs/roadmap/development-roadmap.md` for current delivery status.
4. Identify the owning module boundary in `docs/architecture/module-boundaries.md`.
5. Consider authorization, privacy, audit, payment and minor-data implications.
6. Add or update an ADR when introducing a significant long-term architecture decision.
7. For integration/test work, check `docs/testing/pre-alpha-test-plan.md`.

## Branches

Prefer focused branches using descriptive names, for example:

```text
feat/payment-provider-adapter
feat/schedule-occurrences
fix/guardian-access-check
test/payment-webhook-retries
docs/pre-alpha-runbook
chore/update-tooling
```

Avoid mixing unrelated product changes in one branch.

## Pull requests

A pull request should explain:

- what changed;
- why it changed;
- relevant requirement/issue references;
- security/privacy/payment impact if any;
- how it was tested;
- screenshots/video for meaningful UI changes where useful;
- any staging configuration, migration or rollout considerations.

Do not merge by bypassing failing validation simply to move faster.

## Required local validation

Use the pinned repository toolchain (`Node.js 24.x`, `pnpm 10.15.0`). For most non-trivial changes, run the relevant subset and preferably the full CI-equivalent sequence before requesting review:

```bash
pnpm install --frozen-lockfile
pnpm bootstrap:verify
pnpm test
pnpm lint
pnpm format:check
pnpm typecheck
pnpm prisma:validate
pnpm openapi:check
pnpm build
```

When changing `apps/web`, `apps/admin`, navigation, authentication, responsive layouts or critical user journeys, also run the relevant Playwright suite or ensure the exact-commit GitHub Actions browser job passes.

## Testing expectations

The project is entering pre-alpha hardening, so new work should increasingly include failure-path tests rather than only structural/happy-path checks.

Prioritize tests for:

- deny-by-default authorization;
- guardian/athlete relationship boundaries;
- staff role and MFA requirements;
- payment webhook verification, duplicates and retries;
- idempotent charge/state transitions;
- capacity and membership lifecycle boundaries;
- session expiry/re-authentication;
- API/network/provider failures;
- responsive and keyboard-accessible interactions;
- migration, recovery and rollback-sensitive behavior where relevant.

A UI that looks complete but still relies on demo-only data or unsupported fake persistence must remain visibly marked as demo/preview behavior.

## Architecture boundaries

- Do not let UI code access database tables directly.
- Do not write another domain module's data through ad hoc cross-module access.
- Prefer explicit services/interfaces and domain events where appropriate.
- Do not duplicate authorization policy only in client code.
- Treat every browser/mobile client as an untrusted caller.
- Keep server-authoritative pricing, eligibility, payment and membership transitions on the backend.
- Keep Programme, Programme Offering, Team, Membership and Payment concepts distinct.

## Security and privacy

Never commit:

- passwords;
- API keys/tokens;
- database credentials;
- signing credentials;
- production environment files;
- exports of real athlete/guardian data;
- raw card numbers, CVVs or other payment credentials.

Avoid placing sensitive personal information in issues, PR descriptions, screenshots, test fixtures or logs. Use synthetic data for staging and automated tests unless explicitly approved otherwise.

## Payment changes

Payment code is launch-critical.

- Browser redirects must never become authoritative payment proof.
- Verified provider events drive financial state.
- Preserve provider-event deduplication and idempotency guarantees.
- Never silently fall back to simulated success in production.
- Real gateway adapters require sandbox failure/retry/duplicate-event testing before production enablement.

## Database changes

- Use versioned Prisma migrations.
- Add database constraints for important integrity rules.
- Preserve historical/financial records where required.
- Destructive migrations require an explicit preservation/migration plan.
- Test migrations against production-shaped staging data before launch-critical releases.
- Any change affecting recoverability should update backup/restore documentation or test evidence.

## OpenAPI and client contracts

API changes must keep the generated contract synchronized.

```bash
pnpm openapi:check
```

If an intended API change modifies the contract, regenerate and commit both the OpenAPI artifact and generated TypeScript schema rather than hand-editing generated files.

## Documentation

Update docs when behavior, delivery status or long-term decisions materially change. The goal is not documentation for its own sake; it is to prevent future contributors from reverse-engineering product intent from code.

At minimum:

- roadmap/status changes → `docs/roadmap/development-roadmap.md`;
- MVP scope changes → `docs/product/mvp-scope.md`;
- major architecture changes → ADR + relevant architecture document;
- new launch-critical test procedures → `docs/testing/`;
- environment/deployment changes → `config/environments/` and/or `docs/architecture/deployment.md`.

## Definition of done

A feature is not done merely because the happy-path screen works. Depending on the change, completion includes:

- authorization;
- validation;
- failure/empty/loading states;
- automated tests;
- observability;
- migrations;
- documentation;
- accessibility;
- privacy/security review;
- staging verification;
- rollback/recovery considerations;
- truthful handling of unavailable integrations.
