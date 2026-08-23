# Security and Privacy

**Status:** Accepted as current security baseline

KHLIM Super App may process information about minors, families, coaches, sports, schedules, attendance, competitions, and development. Security and privacy must therefore be product requirements, not release-week cleanup.

## Security objectives

Protect:
- user identities and sessions;
- parent/guardian-athlete relationships;
- athlete development information;
- attendance history;
- sport/team membership;
- competition registrations and selections;
- contact and emergency information;
- administrative functions;
- point/reward integrity;
- private/internal coaching notes;
- club operational information.

## Core principles

### 1. Deny by default
A request is rejected unless the server can prove the caller is authorized.

### 2. Relationship- and sport-aware authorization
Role alone is insufficient.

Examples:
- a parent can access only linked children;
- a coach can access only assigned/authorized sports, teams, sessions, or athletes;
- a Basketball coach does not automatically gain access to a future Badminton program;
- an administrator may require a specific elevated permission for high-risk actions.

### 3. Minimize collected data
Do not collect information merely because it might be useful someday. Academic, contact, location, identity, family, and sport-profile information should have a clear product purpose and retention policy.

### 4. Separate shared and internal coaching data
Family-visible progress and internal staff notes require different data-access paths and tests.

### 5. Preserve authoritative originals
If translated variants of coach/admin content are introduced, the original approved text remains authoritative. Machine/AI translation must not silently overwrite official notes or instructions.

### 6. Audit sensitive mutations
At minimum consider audit records for:
- role/permission changes;
- family-link creation/removal;
- coach sport/team assignments;
- attendance corrections;
- evaluations and internal-note changes/access where justified;
- point adjustments and reward redemptions;
- event cancellations/material administrative changes;
- high-risk admin configuration changes;
- account deletion/export actions.

## Authentication

Requirements:
- use a proven authentication provider;
- secure token/session storage on mobile;
- server-side token validation;
- logout and session revocation support;
- account recovery flow;
- protection against credential stuffing/rate abuse;
- MFA or equivalent stronger control for administrators;
- do not build custom password storage unless the team intentionally accepts that security burden.

Supabase Auth is the current Phase 1 authentication infrastructure choice. KHLIM authorization and relationship rules remain in application/domain logic rather than being delegated solely to authentication metadata.

Future methods such as Apple, Google, phone OTP, or passkeys remain provider/interface concerns rather than leaking throughout business modules.

## Authorization tests

Permission tests are release-critical.

Examples:
- Parent A cannot read Parent B's child.
- Coach A cannot read an unrelated team's internal notes.
- Coach assigned to one sport cannot automatically access another sport.
- Athlete cannot edit official evaluation data.
- Parent cannot award points.
- Coach cannot perform an admin-only role change.
- Deleted/unlinked guardian relationships stop granting access.
- Deactivated accounts lose protected access.
- Changing locale does not change authorization.

These should be automated integration tests, not only manual QA cases.

## API and application security

- Validate and normalize server input.
- Use parameterized database access/ORM protections against injection.
- Apply rate limits to authentication and abuse-sensitive operations.
- Prevent mass-assignment of privileged fields.
- Use pagination and bounded queries.
- Enforce upload size/type restrictions.
- Safely process untrusted uploads where relevant.
- Avoid exposing stack traces or secrets to clients.
- Use HTTPS/TLS for all production traffic.
- Use secure headers and CSRF protections where applicable to the web admin app.
- Treat mobile clients as untrusted; never embed privileged backend secrets.
- Do not treat direct client access to Supabase/database tables as a substitute for server authorization for normal KHLIM business operations.

## Data protection

- Prefer managed encryption at rest for production databases and object storage.
- Encrypt all network traffic in transit.
- Separate development, staging, and production credentials/data.
- Never copy production user data into development by default.
- Use least-privilege database/service credentials.
- Document backup, retention, and deletion behavior.
- Test restoration rather than assuming backups work.

## Secrets

Secrets must not be committed to Git.

Examples:
- database credentials;
- Supabase service-role/server credentials;
- signing credentials;
- push notification secrets;
- API tokens;
- provider service keys;
- production environment configuration containing sensitive values.

Use environment/secret-management tooling appropriate to GitHub Actions, Railway, Vercel, Supabase, EAS, and other approved deployment providers.

## Logging and observability

Logs should help investigate failures without becoming a second sensitive-data database.

Do not log unnecessarily:
- passwords or authentication tokens;
- full private notes;
- unnecessary contact details;
- sensitive child information;
- secrets/credentials;
- complete translated copies of sensitive notes solely for telemetry.

Prefer identifiers, event types, safe metadata, locale codes where useful, and correlation IDs.

## Parent/guardian and minor considerations

Before launch, KHLIM should confirm applicable legal/privacy requirements for jurisdictions in which the club and users operate. Product implementation should support:
- verified/authorized guardian relationships;
- age-aware policy changes if required;
- clear privacy notices in supported languages where appropriate;
- consent workflows where legally/operationally required;
- account/data deletion requests;
- data export/access requests where required;
- controlled use of athlete images/media;
- retention periods appropriate to each data purpose.

This document is an engineering/security plan, not legal advice.

## Localization and translation risks

Localization can introduce security/privacy mistakes if translated content changes meaning or reveals information to the wrong audience.

Rules:
- authorization is evaluated before content rendering/translation;
- translation never changes target audience;
- selection/private athlete content must not become public because a locale variant was stored incorrectly;
- original coach/admin text is preserved;
- AI/machine translations of sensitive content are marked as derivative when introduced;
- high-impact privacy/consent/payment text should receive human review before production use.

## Third-party SDK review

Every analytics, crash-reporting, authentication, notification, translation, advertising, AI, or other SDK/service adds data-flow and supply-chain risk.

Before production use, document:
- what data it receives;
- why it is necessary;
- where data is processed/stored;
- retention/deletion behavior;
- whether it is suitable for a product used by minors;
- required App Store / Play Store disclosures.

Avoid adding SDKs solely for convenience if the value does not justify the data exposure.

## Attendance and reward integrity

Official MVP attendance is coach/staff-confirmed.

- QR/NFC/self check-in may later create a draft signal, not automatic official truth by default.
- Award/deduction operations are server-controlled.
- Transactions carry reason/source metadata.
- Duplicate event processing must not award duplicate points.
- Admin adjustments require actor and reason.
- Redemptions must be transactional to avoid double-spending.

## Multi-sport security guardrail

Adding a second sport must not accidentally broaden authorization.

New sport activation requires tests covering:
- coach sport/team scoping;
- athlete membership visibility;
- parent visibility through the existing family link;
- sport-scoped internal notes/evaluations;
- event audience targeting;
- admin permissions where administrators are scoped.

A future external multi-organization product would require a separate tenant-isolation security design and is not implied by current sport-awareness.

## Incident readiness

Before public launch, document:
1. who owns security incidents;
2. how credentials can be revoked;
3. how a compromised account can be disabled;
4. how releases can be rolled back or patched;
5. how affected logs/audit events are preserved;
6. how KHLIM decides whether users/regulators/partners must be notified.

## Pre-launch security gate

Public launch should be blocked if any of the following are unresolved:
- known authorization bypass;
- insecure admin access;
- untested backup restoration;
- secrets committed to source control;
- missing account deletion path;
- unexplained third-party data collection;
- critical/high dependency vulnerability without accepted mitigation;
- inability to identify or audit high-risk administrative changes;
- translation/localization flow that can bypass audience/permission checks.
