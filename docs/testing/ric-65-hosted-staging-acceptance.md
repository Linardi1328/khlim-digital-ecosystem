# RIC-65 Hosted Staging Acceptance

This document defines the hosted staging acceptance architecture, security controls, and verification contract for RIC-65 in the KHLIM Digital Ecosystem repository.

## 1. Locked Infrastructure Targets & Exact Pinning

Hosted staging acceptance operates exclusively against isolated, non-production infrastructure:

| Component | Target Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Dedicated Staging Branch** | `staging/ric-65-academy-soft-launch` | Exact branch string assertion (`KHLIM_STAGING_TARGET_BRANCH`), workflow `if: github.ref_name == 'staging/ric-65-academy-soft-launch'` job guard, and fail-closed validation |
| **Supabase Staging Project** | `qxsjxcbfhxbvxigghhlq` (`https://qxsjxcbfhxbvxigghhlq.supabase.co`) | Exact hostname match (`url.hostname === "qxsjxcbfhxbvxigghhlq.supabase.co"`), HTTPS and port 443 only. Rejects prefix/suffix collision |
| **Staging API Deployment** | `khlim-digital-ecosystem-api-git-staging-dc7b4a-rbl-productions.vercel.app` (or explicit custom allowlist) | Strict allowlist check, HTTPS standard port 443 only. Wildcard and substring Vercel matching removed. Rejects HTTP, localhost, subpaths, and production domains |
| **Redirect Rejection** | `redirect: "error"` on all HTTP fetch calls | Prevents bearer token leakage across unexpected redirects or intermediary gateways |
| **Database Identity & Preflight Attestation** | `qxsjxcbfhxbvxigghhlq` reported by API `/v1/health` & direct DB URL | Both readiness and active modes require verified database connection and project reference match. Active mode initializes direct Prisma client and executes a preflight probe before ANY POST. Independent read-only Prisma query verifies single persisted row |
| **Campaign Attribution** | `source=3x3-oct24` | Strict token attribution retention on persisted lead records and browser navigation |
| **Test Contact Configuration** | Secure staging secrets (`KHLIM_STAGING_TEST_PHONE` & `KHLIM_STAGING_APPROVED_TEST_PHONE`) | Controlled Malaysian mobile E.164 test format, verified against an explicitly authorized test contact before ANY POST. Synthetic constant `+60120000000` is an inert fixture used only for offline tests/mocks, not an assigned operator line |

> [!IMPORTANT]
> The hosted staging acceptance runner strictly fails closed if any configuration points to production domains (`khlim.com`, `api.khlim.com`, etc.) or any Supabase project other than `qxsjxcbfhxbvxigghhlq`.

## 2. Multi-Layer Acceptance Architecture

RIC-65 distinguishes between two acceptance verification layers:

1. **Hosted API & Database Acceptance (`HOSTED_API_AND_DATABASE_ACCEPTANCE`)**:
   - Automated via `scripts/verify-hosted-staging-acceptance.mjs`.
   - Executes readiness health checks, database identity assertion, preflight database probe, non-destructive validation rejection tests, synthetic lead submission, duplicate idempotency replay, conflict 409 rejection, paginated MFA AAL2 Admin retrieval, and independent direct database query.
   - Verifies the deployed backend and database contracts independently of client-side state.

2. **Browser Registration Acceptance & UX Rehearsal (`tests/e2e/staging-browser-acceptance.spec.mjs`)**:
   - Automated via Playwright at mobile (375px/390px) and desktop viewports.
   - Rehearses responsive client UX with mocked backend routes to safely test interactive form validation, client-side consent gating, and unauthenticated portal redirects.

## 3. Fail-Closed Execution Model & Safety Gates

To safeguard active systems and avoid unapproved mutations:

1. **Manual Trigger Only (`workflow_dispatch`)**:
   The workflow is never triggered automatically on push or pull request.
2. **Branch & Environment Protection**:
   Both workflows enforce `if: github.ref_name == 'staging/ric-65-academy-soft-launch'` and bind to protected environment `staging`. `KHLIM_STAGING_TARGET_BRANCH` is validated before any action; if missing or mismatched, the runner immediately halts with `MANDATORY_TARGET_BRANCH_MISSING`.
3. **Clean CI Build Pipeline**:
   Because `apps/api/dist` is not committed to git, CI jobs bootstrap pnpm 10.15.0, execute `pnpm install --frozen-lockfile`, and build `@khlim/api` (`pnpm --filter @khlim/api build`, generating the Prisma client and compiling the NestJS API) using an inert build-only database URL (`DATABASE_URL: postgresql://postgres@localhost:5432/build_only_inert`) before launching the acceptance runner.
4. **Preflight Mutation Protection**:
   In active mutation mode, the runner loads the database client and runs a preflight probe query (`prisma.academyLead.count`) before sending ANY HTTP POST mutation. If database connectivity or credentials fail, the run aborts cleanly without partial state.
5. **Safety Gate (`KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED`)**:
   - **When `0` or unset (Default / Readiness Mode)**: The runner executes target validation, health checks, and database identity checks, then halts cleanly in state `SAFE_HALT`. It **never** issues hosted `POST` requests without explicit window authorization.
   - **When `1` (Active Mutation Window)**: Requires mandatory MFA AAL2 Admin and User AAL1 tokens, an explicitly approved test phone, and `KHLIM_STAGING_DATABASE_URL`. Fails closed if missing. Proceeds to non-destructive validation testing, synthetic lead creation, duplicate idempotency verification, paginated MFA AAL2 retrieval, and independent direct database row assertion.
6. **Operational Constraints**:
   - Do not pause KYNEXA.
   - Do not activate staging without separate approval.
   - Do not submit hosted POST requests outside authorized windows.
   - Do not modify production or merge without separate approval.

## 4. Synthetic Acceptance Protocol

When authorized for a bounded active staging window, the runner executes the following sequence:

### Phase A: Target & Database Identity Verification
- Queries `GET /v1/health` and verifies:
  - `status === "ok"`
  - `database.status === "connected"`
  - `database.projectRef === "qxsjxcbfhxbvxigghhlq"`
- Queries `GET /auth/v1/health` on Supabase Auth.

### Phase B: Non-Destructive Input Validation & Injection Rejection
Sends test payloads to `POST /v1/academy/leads` to confirm server-side validation rejects invalid inputs without persisting data:
- Missing consent (`consent: false`) -> HTTP 400
- SQL injection-like string in email -> HTTP 400
- Malformed phone format -> HTTP 400
- Child age outside allowable bounds (e.g. 99) -> HTTP 400
- Malformed UUID in programme offering ID -> HTTP 400

### Phase C: Synthetic Lead Creation & Idempotency Replay
- Generates synthetic lead with validated controlled phone:
  - Email: `staging-synth-${uniqueSuffix}@synthetic.khlim.test`
  - Name: `Synthetic Parent ${uniqueSuffix}`
  - Phone: Validated phone from `KHLIM_STAGING_TEST_PHONE` (strictly matches `KHLIM_STAGING_APPROVED_TEST_PHONE`)
  - Child Age: `10`
  - Explicit Consent: `consent: true`
  - Campaign Source: `source: "3x3-oct24"`
  - Unique idempotency key (UUID v4)
- **Initial Request**: Submits payload to `POST /v1/academy/leads`. Asserts HTTP 201 Created and receipt status `RECEIVED`.
- **Duplicate Identical Replay**: Submits identical payload with the same idempotency key. Asserts HTTP 201 Created and identical receipt ID.
- **Conflicting Replay**: Submits altered payload with the same idempotency key. Asserts HTTP 409 Conflict (`LEAD_IDEMPOTENCY_CONFLICT`).

### Phase D: Admin MFA AAL2 Retrieval & Access Control
- **Unauthenticated**: `GET /v1/admin/academy/leads` -> HTTP 401 Unauthorized (`AUTH_GATE_FAILURE` if not 401).
- **AAL1 / Unassigned Role**: `GET /v1/admin/academy/leads` with AAL1 token -> HTTP 403 Forbidden (`MFA assurance level 2 is required` / `AUTH_GATE_FAILURE` if not 403).
- **MFA AAL2 Admin**: `GET /v1/admin/academy/leads?source=3x3-oct24&q=${syntheticLead.email}` with AAL2 Admin token:
  - Asserts HTTP 200 OK across paginated search results (checking all pages up to `totalPages`).
  - Parses response items: `adminJson.items`.
  - Verifies exactly 1 lead with the created ID exists in `items` (`PERSISTENCE_INVARIANT_VIOLATION` if count != 1).
  - Verifies `leadRecord.source === "3x3-oct24"`.
  - Verifies `leadRecord.status === "NEW"` (`STATUS_INVARIANT_VIOLATION` if status != NEW).
- **Admin Lead Detail**: `GET /v1/admin/academy/leads/${leadId}` -> Asserts HTTP 200 OK with matching attribution and status `NEW`.

### Phase E: Independent Direct Database Verification
- Queries staging database directly via `KHLIM_STAGING_DATABASE_URL` with Prisma client and `PrismaPg` adapter:
  - Verifies database URL is bound to project `qxsjxcbfhxbvxigghhlq`.
  - Asserts count by `id === leadId` is exactly 1.
  - Asserts count by `idempotencyKey === syntheticLead.idempotencyKey` is exactly 1 (`DATABASE_PERSISTENCE_VIOLATION` if count != 1).

### Phase F: PII-Safe Logging & Error Sanitization
All logs and error messages are sanitized via `sanitizeErrorMessage`:
- Bearer tokens and JWTs redacted to `[redacted]`
- Sensitive query parameters (`token=`, `apikey=`, `key=`, `secret=`, `password=`) redacted to `[redacted]`
- Emails redacted to `[email-redacted]`
- Phones redacted to `[phone-redacted]`
- Masked summaries in stdout: `S*** P***`, `s***@synthetic.khlim.test`, `+6012***000`
Raw HTTP response bodies and stack traces containing personal data are never output to stdout or workflow logs.

## 5. Workflow Execution Strategy & Deployment Prerequisites

To facilitate manual testing securely:

1. **Repository Staging Dispatch (`.github/workflows/staging-acceptance.yml`)**:
   Introduced on the staging integration branch and gated by GitHub protected environment `staging`. Executes manual UI dispatch with `ric-65-hosted` mode and enforces `staging/ric-65-academy-soft-launch` target branch validation.
   > [!IMPORTANT]
   > GitHub Actions requires that any workflow triggered via `workflow_dispatch` must exist on the repository default branch (`main`). Running `gh workflow run ... --ref staging/ric-65-academy-soft-launch` or merging only into the staging integration branch does NOT make a new workflow dispatchable. Therefore:
   > - The dedicated workflow (`.github/workflows/ric-65-hosted-staging-acceptance.yml`) cannot be dispatched via GitHub Actions until it is separately approved and present on `main`.
   > - The existing workflow (`.github/workflows/staging-acceptance.yml`) on `main` does not define `inputs: acceptance_mode` or `inputs: active_window_authorized`.
   > - For pre-merge verification on the staging branch, execute the runner directly in the staging environment (`node scripts/verify-hosted-staging-acceptance.mjs`) or rehearse offline via `node --test tests/ric-65-staging-acceptance.test.mjs`.
   > - Do not merge into `main` solely to enable manual UI dispatch without separate authorization.

2. **Dedicated Staging Acceptance Workflow (`.github/workflows/ric-65-hosted-staging-acceptance.yml`)**:
   Dedicated workflow for the isolated staging environment on `staging/ric-65-academy-soft-launch`, pinned to SHA action references, gated by `if: github.ref_name == 'staging/ric-65-academy-soft-launch'`, and protected by static concurrency group `ric-65-hosted-staging` (`cancel-in-progress: false`).

3. **GitHub Environment `staging` Configuration Required**:
   The GitHub environment `staging` must be formally configured in repository settings with:
   - Deployment branch policy restricted to `staging/ric-65-academy-soft-launch`
   - Required reviewers (environment protection rule)
   - Environment-specific secrets (`KHLIM_STAGING_API_URL`, `KHLIM_STAGING_DATABASE_URL`, etc.)
   Currently, environment `staging` has not been initialized in repo settings; executions will use repo-level secrets until the environment is configured.

4. **Separate Staging API Deployment Prerequisite**:
   The deployed Vercel staging preview (`khlim-digital-ecosystem-api-git-staging-dc7b4a-rbl-productions.vercel.app`) is currently protected by Vercel Authentication (SSO / 302 redirect) and runs an older API SHA without the database-attesting `/v1/health` endpoint. Before live readiness can pass:
   - The updated NestJS API code from PR #90 must be merged into `staging/ric-65-academy-soft-launch` and deployed to the staging preview environment.
   - If Vercel Deployment Protection remains enabled on preview deployments, `VERCEL_AUTOMATION_BYPASS_SECRET` must be provisioned in secrets to bypass the SSO redirect.

## 6. Local Verification & Testing

The runner logic is fully tested without requiring live network connectivity using Node.js native test runner:

```bash
pnpm --filter @khlim/api build
node --test tests/ric-65-staging-acceptance.test.mjs
```
