# RIC-65 Hosted Staging Acceptance

This document defines the hosted staging acceptance architecture, security controls, and verification contract for RIC-65 in the KHLIM Digital Ecosystem repository.

## 1. Locked Infrastructure Targets & Exact Pinning

Hosted staging acceptance operates exclusively against isolated, non-production infrastructure:

| Component | Target Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Dedicated Staging Branch** | `staging/ric-65-academy-soft-launch` | Exact branch string assertion in runner and workflow parameters |
| **Supabase Staging Project** | `qxsjxcbfhxbvxigghhlq` (`https://qxsjxcbfhxbvxigghhlq.supabase.co`) | Exact hostname match (`url.hostname === "qxsjxcbfhxbvxigghhlq.supabase.co"`), HTTPS and port 443 only. Rejects prefix/suffix collision |
| **Staging API Deployment** | `khlim-api-staging.onrender.com` (or allowlisted preview origin) | Strict allowlist check, HTTPS standard port 443 only. Rejects HTTP, localhost, subpaths, and production domains |
| **Redirect Rejection** | `redirect: "error"` on all HTTP fetch calls | Prevents bearer token leakage across unexpected redirects or intermediary gateways |
| **Database Identity** | `qxsjxcbfhxbvxigghhlq` reported by API `/v1/health` | Active window requires verified database connection and project reference match before any mutation |
| **Campaign Attribution** | `source=3x3-oct24` | Strict token attribution retention on persisted lead records and browser navigation |
| **Controlled Test Phone** | `APPROVED_STAGING_TEST_PHONE = "+60120000000"` | Controlled, non-random Malaysian mobile test format. Eliminates risk of dialing real numbers |

> [!IMPORTANT]
> The hosted staging acceptance runner strictly fails closed if any configuration points to production domains (`khlim.com`, `api.khlim.com`, etc.) or any Supabase project other than `qxsjxcbfhxbvxigghhlq`.

## 2. Multi-Layer Acceptance Architecture

RIC-65 distinguishes between two acceptance verification layers:

1. **Hosted API & Database Acceptance (`HOSTED_API_AND_DATABASE_ACCEPTANCE`)**:
   - Automated via `scripts/verify-hosted-staging-acceptance.mjs`.
   - Executes readiness health checks, database identity assertion, non-destructive validation rejection tests, synthetic lead submission, duplicate idempotency replay, conflict 409 rejection, and MFA AAL2 Admin retrieval.
   - Verifies the deployed backend and database contracts independently of client-side state.

2. **Browser Registration Acceptance & UX Rehearsal (`tests/e2e/staging-browser-acceptance.spec.mjs`)**:
   - Automated via Playwright at mobile (375px/390px) and desktop viewports.
   - Verifies responsive layout, visible CTA interactions, query attribution retention (`source=3x3-oct24`), guardian consent gating, and protected staff route enforcement.

## 3. Fail-Closed Execution Model & Safety Gates

To safeguard active systems and avoid unapproved mutations:

1. **Manual Trigger Only (`workflow_dispatch`)**:
   The workflow is never triggered automatically on push or pull request.
2. **Safety Gate (`KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED`)**:
   - **When `0` or unset (Default / Readiness Mode)**: The runner executes target validation, health checks, and database identity checks, then halts cleanly in state `SAFE_HALT`. It **never** issues hosted `POST` requests without explicit window authorization.
   - **When `1` (Active Mutation Window)**: Requires mandatory MFA AAL2 Admin and User AAL1 tokens. Fails closed with `MANDATORY_AUTH_MISSING` if missing. Proceeds to non-destructive validation testing, synthetic lead creation, duplicate idempotency verification, and MFA AAL2 retrieval.
3. **Operational Constraints**:
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
- Generates synthetic lead with controlled phone:
  - Email: `staging-synth-${uniqueSuffix}@synthetic.khlim.test`
  - Name: `Synthetic Parent ${uniqueSuffix}`
  - Phone: `+60120000000` (`APPROVED_STAGING_TEST_PHONE`)
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
- **MFA AAL2 Admin**: `GET /v1/admin/academy/leads?source=3x3-oct24` with AAL2 Admin token:
  - Asserts HTTP 200 OK.
  - Parses response items: `adminJson.items`.
  - Verifies exactly 1 lead with the created ID exists in `items` (`PERSISTENCE_INVARIANT_VIOLATION` if count != 1).
  - Verifies `leadRecord.source === "3x3-oct24"`.
  - Verifies `leadRecord.status === "NEW"` (`STATUS_INVARIANT_VIOLATION` if status != NEW).
- **Admin Lead Detail**: `GET /v1/admin/academy/leads/${leadId}` -> Asserts HTTP 200 OK with matching attribution and status `NEW`.

### Phase E: PII-Safe Logging & Error Sanitization
All logs and error messages are sanitized via `sanitizeErrorMessage`:
- Bearer tokens and JWTs redacted to `[redacted]`
- Emails redacted to `[email-redacted]`
- Phones redacted to `[phone-redacted]`
- Masked summaries in stdout: `S*** P***`, `s***@synthetic.khlim.test`, `+6012***000`
Raw HTTP response bodies and stack traces containing personal data are never output to stdout or workflow logs.

## 5. Workflow Execution Strategy

To facilitate manual testing before merging into `main`:
1. **Repository Staging Dispatch (`.github/workflows/staging-acceptance.yml`)**:
   Already present on default branch `main`, with `ric-65-hosted` mode and secret passthrough, allowing GitHub UI manual execution against any branch including `feat/ric-65-hosted-staging-acceptance` and `staging/ric-65-academy-soft-launch`.
2. **Dedicated Staging Acceptance Workflow (`.github/workflows/ric-65-hosted-staging-acceptance.yml`)**:
   Dedicated runner for the isolated staging environment on `staging/ric-65-academy-soft-launch`.

## 6. Local Verification & Testing

The runner logic is fully tested without requiring live network connectivity using Node.js native test runner:

```bash
node --test tests/ric-65-staging-acceptance.test.mjs
```
