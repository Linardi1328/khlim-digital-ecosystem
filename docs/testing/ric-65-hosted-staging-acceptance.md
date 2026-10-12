# RIC-65 Hosted Staging Acceptance

This document defines the hosted staging acceptance architecture and automated verification contract for RIC-65 in the KHLIM Digital Ecosystem repository.

## 1. Locked Infrastructure Targets

Hosted staging acceptance operates exclusively against isolated, non-production infrastructure:

| Component | Target Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Dedicated Staging Branch** | `staging/ric-65-academy-soft-launch` | Branch target assertion in runner and workflow parameters |
| **Supabase Staging Project** | `qxsjxcbfhxbvxigghhlq` (`https://qxsjxcbfhxbvxigghhlq.supabase.co`) | Strict hostname assertion (`STAGING_TARGET_VIOLATION` if project ID differs) |
| **Staging API Deployment** | HTTPS deployed service (e.g. Render/Vercel) | Rejection of HTTP, localhost, and production domains (`khlim.com`, etc.) |
| **Campaign Attribution** | `source=3x3-oct24` | Strict token attribution retention on persisted lead records |
| **Payment Sandbox** | Billplz Sandbox (`BILLPLZ_SANDBOX=1`) | Refuses production payment credentials |

> [!IMPORTANT]
> The hosted staging acceptance runner strictly fails closed if any configuration points to production domains or any Supabase project other than `qxsjxcbfhxbvxigghhlq`.

## 2. Fail-Closed Execution Model & Safety Gates

To safeguard active systems and avoid unapproved mutations:

1. **Manual Trigger Only (`workflow_dispatch`)**:
   The workflow `.github/workflows/ric-65-hosted-staging-acceptance.yml` is never triggered automatically on push or pull request.
2. **Safety Gate (`KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED`)**:
   - **When `0` or unset (Default / Readiness Mode)**: The runner executes target validation and non-mutating health checks (`/v1/health` and Supabase `/auth/v1/health`), then halts cleanly. It **never** issues hosted `POST` requests without explicit window authorization.
   - **When `1` (Active Mutation Window)**: After explicit authorization, the runner proceeds to non-destructive validation testing, synthetic lead creation, duplicate idempotency verification, and MFA AAL2 retrieval.
3. **Operational Constraints**:
   - Do not pause KYNEXA.
   - Do not activate staging without separate approval.
   - Do not submit hosted POST requests outside authorized windows.
   - Do not modify production or merge without separate approval.

## 3. Synthetic Acceptance Protocol

When authorized for a bounded active staging window, the runner executes the following sequence:

### Phase A: Non-Destructive Input Validation & Injection Rejection
Sends test payloads to `POST /v1/academy/leads` to confirm server-side validation rejects invalid inputs without persisting data or leaking PII:
- Missing consent (`consent: false`) -> HTTP 400
- SQL injection-like string in email -> HTTP 400
- Malformed phone format -> HTTP 400
- Child age outside allowable bounds (e.g. 99) -> HTTP 400
- Malformed UUID in programme offering ID -> HTTP 400

### Phase B: Synthetic Lead Creation & Idempotency Replay
- Generates synthetic guardian details:
  - Email: `staging-synth-${uniqueSuffix}@synthetic.khlim.test`
  - Name: `Synthetic Parent ${uniqueSuffix}`
  - Phone: `+6012${randomDigits}`
  - Child Age: `10`
  - Explicit Consent: `consent: true`
  - Campaign Source: `source: "3x3-oct24"`
  - Unique idempotency key (UUID v4)
- **Initial Request**: Submits payload to `POST /v1/academy/leads`. Asserts HTTP 201 Created and receipt status `RECEIVED`.
- **Duplicate Identical Replay**: Submits identical payload with the same idempotency key. Asserts HTTP 201 Created and identical receipt ID.
- **Conflicting Replay**: Submits altered payload with the same idempotency key. Asserts HTTP 409 Conflict (`LEAD_IDEMPOTENCY_CONFLICT`).

### Phase C: Admin MFA AAL2 Retrieval & Access Control
- **Unauthenticated**: `GET /v1/admin/academy/leads` -> HTTP 401 Unauthorized.
- **AAL1 / Unassigned Role**: `GET /v1/admin/academy/leads` with AAL1 token -> HTTP 403 Forbidden (`MFA assurance level 2 is required` or `Insufficient permissions`).
- **MFA AAL2 Admin**: `GET /v1/admin/academy/leads?source=3x3-oct24` with AAL2 Admin token:
  - Asserts HTTP 200 OK.
  - Verifies exactly one lead with the created ID exists in the database response.
  - Verifies `source === "3x3-oct24"`.
  - Verifies status is `NEW`.
- **Admin Lead Detail**: `GET /v1/admin/academy/leads/${leadId}` -> Asserts HTTP 200 OK with matching attribution and details.

### Phase D: PII-Safe Logging
All console logs and diagnostic summaries sanitize data:
- Email: `s***@synthetic.khlim.test`
- Phone: `+6012***1234`
- Name: `S*** P***`
Raw phone numbers, email addresses, and bearer tokens are never output to stdout or workflow summaries.

## 4. Local Verification & Testing

The runner logic is fully tested without requiring live network connectivity using Node.js native test runner:

```bash
node --test tests/ric-65-staging-acceptance.test.mjs
```
