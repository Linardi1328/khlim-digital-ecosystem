# RIC-191 handoff: Academy Registration V1 API

Base path `/v1`. JSON only. Status: contract approved for local development;
not deployed. Types will be generated into `packages/api-client/src/schema.d.ts`
(`pnpm openapi:generate`). Until a hosted environment exists, build against the
mocks at the end of this file.

## Rules for the client

- Localize by `code` and `fieldErrors[].code`. Never parse `message` (English,
  for developers only).
- A receipt means **received, pending review**. `reservesPlace` is always
  `false`. Never display "enrolled", "confirmed", "paid" or "place reserved".
- No online payment, no price. Do not show pricing from this API.
- Generate one `Idempotency-Key` per form attempt (e.g. `crypto.randomUUID()`
  with dashes → 36 chars) and **reuse it on retries of the same payload**. If
  the payload changed, make a new key. A `200` replay is success.
- Optional consents (marketing, photography) start **unchecked** and are always
  sent as explicit booleans.
- Send `locale` and the exact `consentVersion` you rendered (from
  `registration-config`). On `CONSENT_VERSION_MISMATCH`, refetch the config and
  ask the guardian to review the new text again.
- Do not put personal data in URLs, analytics events, or console logs.
- Empty `items` from `/academy/sessions` = "no sessions open for registration".
  Never fall back to hard-coded sessions.

## Error envelope

All registration endpoints:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "English developer text",
  "fieldErrors": [{ "field": "guardian.phone", "code": "INVALID_PHONE" }],
  "details": { "currentConsentVersion": "…" },
  "retryAfter": 30
}
```

`fieldErrors`, `details`, `retryAfter` appear only where relevant. `Retry-After`
header accompanies `429` and `503`. Authentication/authorization failures on
admin endpoints keep the existing platform shape
(`{statusCode, message, error}`: 401/403); handle by HTTP status.

### Request-level codes

| HTTP | code | Meaning |
| ---- | ---- | ------- |
| 400 | `VALIDATION_FAILED` | See `fieldErrors` |
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | Header missing |
| 400 | `IDEMPOTENCY_KEY_INVALID` | Header not 22–128 chars `[A-Za-z0-9_-]` |
| 400 | `SEARCH_NOT_ALLOWED_IN_QUERY` | Admin: use POST search |
| 400 | `UNKNOWN_QUERY_PARAMETER` | Admin list |
| 409 | `REGISTRATION_CLOSED` | No approved consent policy, or the server's HMAC key ring is not configured |
| 409 | `CONSENT_VERSION_MISMATCH` | `details.currentConsentVersion` |
| 409 | `SESSION_NOT_AVAILABLE` | Unknown, unpublished, closed, outside window |
| 409 | `SESSION_FULL` | Confirmed seats reached capacity |
| 409 | `IDEMPOTENCY_KEY_CONFLICT` | Same key, different payload |
| 422 | `PLAYER_AGE_INELIGIBLE` | `details.minAge`, `details.maxAge` |
| 429 | `RATE_LIMITED` | `retryAfter` seconds |
| 503 | `SERVICE_TEMPORARILY_UNAVAILABLE` | Rate-limit storage failure (fails closed); honour `Retry-After` |
| 503 | `REGISTRATION_PERSISTENCE_FAILED` | Not saved. Retry with the **same** key |

Status codes on success: `POST` endpoints return `201` (including admin
`search`, `publish`, `close`, policy create/approve/retire); `PATCH` returns `200`.

Admin-only: `POLICY_VERSION_EXISTS`, `OFFERING_REGISTRATION_ONLY`,
`OFFERING_HAS_LEGACY_USAGE`, `REGISTRATION_NOT_FOUND`, `SESSION_NOT_FOUND`, `POLICY_NOT_FOUND`,
`PROGRAMME_NOT_FOUND`, `VENUE_NOT_FOUND` (404); `STALE_VERSION`,
`INVALID_TRANSITION`, `CAPACITY_EXCEEDED`, `CAPACITY_BELOW_CONFIRMED`,
`SESSION_INCOMPLETE` (`fieldErrors` list missing fields), `SESSION_NOT_EDITABLE` (`fieldErrors[].code = NOT_EDITABLE`),
`POLICY_NOT_APPROVABLE`, `POLICY_INVALID_STATE` (409).

### Field error codes

`REQUIRED`, `INVALID_TYPE`, `INVALID_FORMAT`, `INVALID_VALUE`, `TOO_LONG`,
`TOO_SHORT`, `OUT_OF_RANGE`, `UNKNOWN_FIELD`, `MUST_BE_TRUE`, `INVALID_PHONE`,
`INVALID_DATE`, `DATE_IN_FUTURE`, `REASON_CODE_REQUIRED`.

Unknown fields are rejected at every nesting level (`UNKNOWN_FIELD`), including
`status`, `price`, `age`, `organizationId`, `role`.

## Public endpoints (no auth)

### `GET /v1/academy/registration-config`

```json
{
  "registrationOpen": true,
  "closedReasonCode": null,
  "consent": {
    "policyVersion": "SYNTHETIC-EXAMPLE",
    "approvedAt": "2026-12-01T03:00:00.000Z",
    "locales": ["en", "ms", "zh-Hans"],
    "items": [
      { "type": "GUARDIAN_AUTHORITY", "required": true, "defaultChecked": false,
        "content": { "en": { "ref": "…", "sha256": "…" }, "ms": {…}, "zh-Hans": {…} } },
      { "type": "REGISTRATION_PRIVACY", "required": true, "defaultChecked": false, "content": {…} },
      { "type": "MARKETING", "required": false, "defaultChecked": false, "content": {…} },
      { "type": "PHOTOGRAPHY", "required": false, "defaultChecked": false, "content": {…} }
    ]
  },
  "options": {
    "gender": ["MALE", "FEMALE"],
    "jerseySize": ["YS", "YM", "YL", "AS", "AM", "AL", "AXL"],
    "guardianRelationship": ["MOTHER", "FATHER", "LEGAL_GUARDIAN", "GRANDPARENT", "OTHER_RELATIVE"],
    "emergencyContactRelationship": ["MOTHER", "FATHER", "LEGAL_GUARDIAN", "GRANDPARENT", "OTHER_RELATIVE", "FRIEND", "OTHER"]
  },
  "idempotencyKey": { "header": "Idempotency-Key", "minLength": 22, "maxLength": 128, "pattern": "^[A-Za-z0-9_-]{22,128}$" }
}
```

When closed: `registrationOpen:false`, `closedReasonCode:"REGISTRATION_NOT_CONFIGURED"`,
`consent:null`. `content.*.ref` is a reference to owner-approved wording (the API
does not store legal text); the option lists are placeholders pending owner
confirmation and are config-driven, so render from this response.

### `GET /v1/academy/sessions`

```json
{
  "registrationOpen": true,
  "items": [{
    "id": "uuid",
    "name": "Ages 10–12 Saturday",
    "programmeName": "KHLIM Academy",
    "venue": { "name": "Sports Garage", "address": "The Annex 4, Jalan 19/1, …" },
    "coachDisplayName": "Sengjun",
    "weekday": 6,
    "startTime": "14:00",
    "endTime": "16:00",
    "timezone": "Asia/Kuala_Lumpur",
    "firstSessionDate": "2026-12-19",
    "recurrence": "WEEKLY",
    "minAge": 10,
    "maxAge": 12,
    "ageReference": { "rule": "FIXED_DATE", "date": "2026-12-31" },
    "registrationOpensAt": null,
    "registrationClosesAt": null
  }]
}
```

`weekday` is ISO (1 = Monday … 7 = Sunday). Only published, open, not-full,
inside-window sessions appear; at most 50. Always `no-store`; do not cache
availability client-side beyond the page view. **Example values above are
synthetic: no real session is published.**

### `POST /v1/academy/registrations`

Headers: `Idempotency-Key`, `Content-Type: application/json`.

```json
{
  "sessionId": "uuid",
  "locale": "en",
  "consentVersion": "SYNTHETIC-EXAMPLE",
  "source": "3x3-oct24",
  "player": {
    "fullName": "Test Player", "dateOfBirth": "2015-03-02",
    "gender": "MALE", "jerseySize": "YM", "phone": null
  },
  "guardian": {
    "fullName": "Test Guardian", "phone": "012-3456789",
    "relationship": "MOTHER", "authorityConfirmed": true
  },
  "emergencyContact": { "fullName": "Test Contact", "phone": "013-9876543", "relationship": "GRANDPARENT" },
  "consents": { "registrationPrivacy": true, "marketing": false, "photography": false }
}
```

- Required: everything except `source` and `player.phone` (omit or `null`).
- `source`: campaign token `[A-Za-z0-9_-]{1,64}`. Phone-like, malformed,
  `unattributed` or personal-looking values are silently stored as no source.
- `locale`: `en` | `ms` | `zh-Hans`.
- `guardian.authorityConfirmed` and `consents.registrationPrivacy` must be `true`.
- Phones accept Malaysian local/E.164 forms; the server normalizes.
- Age is computed by the server; do not send it.

**201** (first success) or **200** (identical replay, original receipt):

```json
{
  "id": "uuid",
  "referenceCode": "KAR-7H3QK9XM",
  "status": "RECEIVED",
  "reservesPlace": false,
  "receivedAt": "2026-12-10T04:21:00.000Z",
  "messageCode": "REGISTRATION_RECEIVED_PENDING_REVIEW",
  "session": { "id": "uuid", "name": "Ages 10–12 Saturday" }
}
```

There is intentionally no endpoint to look a receipt up by id.

## Admin endpoints (Bearer, AAL2 MFA, SUPER_ADMIN | MANAGEMENT | ACADEMY_ADMIN)

Organization comes from the server-resolved membership; never send one.

| Method & path | Purpose |
| ------------- | ------- |
| `GET /admin/academy/registrations?status&sessionId&page&limit` | List (bounded, newest first). `q` is rejected. |
| `POST /admin/academy/registrations/search` | `{ q, status?, sessionId?, page?, limit? }` name/phone/reference search (body, not URL). Phone terms accept local (`012-345 6789`), E.164 (`+60123456789`) or a fragment of 4+ digits; terms under 4 digits only match names/reference codes |
| `GET /admin/academy/registrations/:id` | Detail (audited) |
| `PATCH /admin/academy/registrations/:id/status` | `{ status, reasonCode?, expectedVersion }` |
| `GET /admin/academy/registration-sessions` | List with seat counts |
| `GET /admin/academy/registration-sessions/:id` | One |
| `POST /admin/academy/registration-sessions` | Create draft (creates its dedicated offering) |
| `PATCH /admin/academy/registration-sessions/:id` | `{ expectedVersion, …fields }` |
| `POST /admin/academy/registration-sessions/:id/publish` | `{ expectedVersion, approvals: { scheduleApproved: true, ageRuleApproved: true } }` |
| `POST /admin/academy/registration-sessions/:id/close` | `{ expectedVersion }` |
| `GET/POST /admin/academy/registration-policies`, `POST …/:id/approve`, `POST …/:id/retire` | Consent policy versions (approve/retire: SUPER_ADMIN, MANAGEMENT only) |

Status vocabulary: `RECEIVED`, `UNDER_REVIEW`, `CONFIRMED`, `REJECTED`,
`CANCELLED`. Allowed: RECEIVED→UNDER_REVIEW/CONFIRMED/REJECTED/CANCELLED;
UNDER_REVIEW→CONFIRMED/REJECTED/CANCELLED; CONFIRMED→CANCELLED. REJECTED and
CANCELLED are terminal. `reasonCode` (required for REJECTED and CANCELLED):
`DUPLICATE`, `INELIGIBLE`, `CAPACITY`, `GUARDIAN_REQUEST`,
`INCOMPLETE_INFORMATION`, `SESSION_CHANGED`, `OTHER`.

List item: `id, referenceCode, status, version, sessionId, sessionName,
playerFullName, ageAtReference, createdAt, updatedAt`. Detail adds all
submitted fields, `consents[]` (`type, granted, policyVersion, locale,
contentSha256, acceptedAt, withdrawnAt`), `source`, `statusReasonCode`,
`statusChangedAt`. Envelope: `{ items, total, page, limit, totalPages }`
(`limit` ≤ 100, `q` ≤ 100 chars, ≥ 2).

Session admin fields (all optional while `DRAFT` except where noted):
`programmeId`*, `venueId`*, `name`*, `capacity`* (create), `enrollmentOpensAt`,
`enrollmentClosesAt`, `coachDisplayName`, `weekday` (1–7), `startTime`,
`endTime` (`HH:MM`), `firstSessionDate`, `recurrence` (`NONE`|`WEEKLY`),
`ageReferenceRule` (`FIXED_DATE`|`SESSION_START_DATE`|`REGISTRATION_DATE`),
`ageReferenceDate` (required with `FIXED_DATE`). Publication state:
`DRAFT`→`PUBLISHED`→`CLOSED`. Responses include `version`; send it back as
`expectedVersion`.

## Mock responses

Use the JSON blocks above verbatim for MSW/Playwright mocks. Error mocks:

```json
{ "statusCode": 409, "code": "SESSION_FULL", "message": "Session is full" }
{ "statusCode": 409, "code": "CONSENT_VERSION_MISMATCH", "message": "…", "details": { "currentConsentVersion": "SYNTHETIC-EXAMPLE-2" } }
{ "statusCode": 422, "code": "PLAYER_AGE_INELIGIBLE", "message": "…", "details": { "minAge": 10, "maxAge": 12 } }
{ "statusCode": 429, "code": "RATE_LIMITED", "message": "…", "retryAfter": 600 }
```

## Not in this API

Payment, price, account creation, attendance, parent dashboard, receipt lookup,
Google Sheets sync (BLOCKED pending owner approval of destination, fields,
access).

## Generated types for the admin contract (review F4)

`pnpm openapi:generate` now emits response schemas for every admin session and
policy operation (previously `unknown`):

- Sessions: `AdminRegistrationSessionDto` (single), `AdminRegistrationSessionListDto`
  (`{ items }`, newest first, at most 100). Create uses
  `CreateRegistrationSessionRequestDto` (required: `programmeId`, `name`,
  `venueId`, `capacity`); edit uses `UpdateRegistrationSessionRequestDto`
  (required: `expectedVersion`; `name`/`venueId` are draft-only, structural
  fields are draft-only, `capacity` never below confirmed seats); publish
  `PublishRegistrationSessionRequestDto`; close `VersionRequestDto`.
- Policies: `AdminRegistrationPolicyDto`, `AdminRegistrationPolicyListDto`;
  create `CreateRegistrationPolicyRequestDto`; approve/retire `VersionRequestDto`.
- Success statuses are exactly as documented in the schema: `POST` = `201`
  (including search, publish, close, policy create/approve/retire), `PATCH` = `200`,
  `GET` = `200`; `POST /academy/registrations` is `201` first time and `200` for
  an identical replay.
- A contract test compares the generated schemas with live responses and fails
  on drift.

Behaviour changes since the first handoff: policy approval/retirement are now
serialized with submissions, so a submission racing a retirement or replacement
can return `REGISTRATION_CLOSED` or `CONSENT_VERSION_MISMATCH` (refetch
`registration-config` and ask the guardian to review the current text). Nothing
else in the public request/response shapes changed.
