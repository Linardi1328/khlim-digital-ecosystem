# Security and Privacy

**Status:** Draft

KHLIM Super App may process information about minors, families, coaches, schedules, attendance, and development. Security and privacy must therefore be treated as product requirements, not release-week cleanup.

## Security objectives

Protect:
- user identities and sessions;
- parent/guardian-child relationships;
- player development information;
- attendance history;
- contact and emergency information;
- administrative functions;
- point/reward integrity;
- private/internal coaching notes;
- club operational information.

## Core principles

### 1. Deny by default
A request is rejected unless the server can prove the caller is authorized.

### 2. Relationship-aware authorization
Role alone is insufficient.

Examples:
- a parent can access only linked children;
- a coach can access only assigned/authorized players or teams;
- an administrator may require a specific elevated permission for high-risk actions.

### 3. Minimize collected data
Do not collect information merely because it might be useful someday. Academic, contact, location, identity, and family information should have a clear product purpose and retention policy.

### 4. Separate shared and internal coaching data
Family-visible progress and internal staff notes require different data-access paths and tests.

### 5. Audit sensitive mutations
At minimum consider audit records for:
- role/permission changes;
- family-link creation/removal;
- attendance corrections;
- evaluations and internal-note access/change where justified;
- point adjustments and reward redemptions;
- high-risk admin configuration changes;
- account deletion/export actions.

## Authentication

Requirements:
- use a proven authentication provider or thoroughly tested authentication implementation;
- secure token/session storage on mobile;
- server-side token validation;
- logout and session revocation support;
- account recovery flow;
- protection against credential stuffing/rate abuse;
- MFA or equivalent stronger control for administrators;
- avoid storing raw passwords in application code or custom databases unless the team intentionally owns that security burden.

Future authentication methods such as Apple, Google, phone OTP, or passkeys should remain provider/interface concerns rather than leaking throughout business modules.

## Authorization tests

Permission tests are release-critical.

Examples:
- Parent A cannot read Parent B's child.
- Coach A cannot read an unrelated team's internal notes.
- Player cannot edit official evaluation data.
- Parent cannot award points.
- Coach cannot perform an admin-only role change.
- Deleted/unlinked guardian relationships stop granting access.
- Deactivated accounts lose protected access.

These should be automated integration tests, not only manual QA cases.

## API and application security

- Validate and normalize server input.
- Use parameterized database access/ORM protections against injection.
- Apply rate limits to authentication and abuse-sensitive operations.
- Prevent mass-assignment of privileged fields.
- Use pagination and bounded queries.
- Enforce upload size/type restrictions.
- Scan or safely process untrusted uploads where relevant.
- Avoid exposing stack traces or secrets to clients.
- Use HTTPS/TLS for all production traffic.
- Use secure headers and CSRF protections where applicable to the web admin app.
- Treat mobile clients as untrusted; never embed privileged backend secrets.

## Data protection

- Prefer managed encryption at rest for production databases and object storage.
- Encrypt all network traffic in transit.
- Separate development, staging, and production credentials/data.
- Never copy production user data into development by default.
- Use least-privilege database/service credentials.
- Document data backup, retention, and deletion behavior.
- Test restoration rather than assuming backups work.

## Secrets

Secrets must not be committed to Git.

Examples:
- database credentials;
- signing credentials;
- push notification secrets;
- API tokens;
- provider service keys;
- production environment configuration containing sensitive values.

Use environment/secret-management tooling appropriate to the deployment platform.

## Logging and observability

Logs should help investigate failures without becoming a second sensitive-data database.

Do not log unnecessarily:
- passwords or authentication tokens;
- full private notes;
- unnecessary contact details;
- sensitive child information;
- secrets/credentials.

Prefer identifiers, event types, safe metadata, and correlation IDs.

## Parent/guardian and minor considerations

Before launch, KHLIM should confirm applicable legal/privacy requirements for the jurisdictions in which the club and users operate. Product implementation should support:
- verified/authorized guardian relationships;
- age-aware policy changes if required;
- clear privacy notices;
- consent workflows where legally/operationally required;
- account/data deletion requests;
- data export/access requests where required;
- controlled use of player images/media;
- retention periods appropriate to the purpose of each data type.

This document is an engineering/security plan, not legal advice.

## Third-party SDK review

Every analytics, crash-reporting, authentication, notification, advertising, or other SDK adds data-flow and supply-chain risk.

Before production use, document:
- what data it receives;
- why it is necessary;
- where data is processed/stored;
- retention/deletion behavior;
- whether it is suitable for a product used by minors;
- required App Store / Play Store disclosures.

Avoid adding SDKs solely for convenience if the value does not justify the data exposure.

## Points and rewards integrity

- Award/deduction operations must be server-controlled.
- Transactions should carry reason/source metadata.
- Duplicate event processing must not award duplicate points.
- Admin adjustments require actor and reason.
- Redemptions must be transactional to avoid double-spending.

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
- inability to identify or audit high-risk administrative changes.
