# KHLIM Academy — first Admin and lead-operator readiness

**Owner:** KHLIM Basketball Sdn. Bhd. · **Scope:** RIC-84 · **Status:** staging verification required.

This runbook intentionally does not bootstrap a Super Admin automatically, publish an invite link, store personal credentials, or grant production roles. Owner authorization and exact evidence are required before real staff handle children's records or guardian leads.

## Owner and operator checklist

1. **Owner approval:** Esther confirms the first Super Admin and backup out of band. Obtain separate approved, uniquely owned staff identities; do not share passwords or set a common initial password. Record approval privately, not in logs/CI/this document.
2. **Provisioning:** An existing trusted operator uses the official Supabase Auth administration flow to create/invite identities, then creates an **ACTIVE** membership in the correct KHLIM organization with the minimum necessary role. If there is no existing Super Admin, use a one-time, owner-authorized, independently reviewed database/bootstrap procedure; never add a public role-escalation endpoint.
3. **MFA:** Staff sign in through the real Admin URL and enroll/verify TOTP. Confirm server-side AAL2 on any privileged lead/admin API request. Merely seeing the MFA screen is not proof.
4. **Operator scope:** Primary and backup lead followers should generally use `ACADEMY_ADMIN`, not `SUPER_ADMIN` or `FINANCE_ADMIN`. Limit access to organization-owned data; verify no coach/event-staff or unrelated-tenant access.
5. **Negative checks:** Test AAL1, revoked/suspended staff, forgery of role fields, wrong organization, attempts to modify own roles/status, stale-role tokens, removal/suspension of final active Super Admin, and audit trail creation. Use *synthetic staging* accounts only.
6. **Recovery:** Owner-controlled loss-of-TOTP procedure includes independently verified identity, recorded reason, temporary suspension when appropriate, dual-control approval and re-enrollment. No MFA bypass toggles or emailed backup secrets.
7. **Browser threat model:** Current Admin browser session tokens are stored in `localStorage`; XSS can amplify token theft. Review CSP and third-party scripts and plan a server-mediated session architecture (HttpOnly Secure SameSite cookies, CSRF defenses, rotation/revocation and session audit) before expanding production sensitive-data access. Never assume a browser role flag or cached session is authoritative.

## Release evidence (attach to RIC-84; redact identifiers)

- [ ] Approved named operator and backup confirmed through private owner channel
- [ ] Isolated Admin + API + Supabase Auth/database staging environment matches reviewed SHA
- [ ] Actor and target role/status changes verified against actual database with transaction rollback
- [ ] AAL2 staff positive tests + AAL1/unassigned/other-org/revoked negative tests
- [ ] Audit events checked; no privilege escalation; recoverability and revocation rehearsal
- [ ] Sensitive-data browser storage threat reviewed, mitigation owner and release sign-off recorded
- [ ] Real staff usability check and cold/mobile performance check
- [ ] CI, CodeRabbit, independent sensitive-change review, deployment/rollback plan

**Do not promote the RIC-84 branch or PR #109 to production until separate hosted safety gates are satisfied.**
