# KHLIM staging acceptance

Staging acceptance is the boundary between code-level pre-alpha confidence and hands-on family/staff testing.

## Required environment

The staging deployment must have separate non-production credentials for:

- KHLIM web and API HTTPS deployments;
- PostgreSQL staging database;
- Supabase staging project and Auth;
- Billplz sandbox (`BILLPLZ_SANDBOX=1`);
- the same schema migrations committed in this repository.

Never point the staging acceptance workflow at production Billplz credentials or a production database.

## Automated readiness gate

Run `node scripts/verify-staging-acceptance.mjs` with the staging environment variables present. The verifier fails closed when URLs are local/non-HTTPS, credentials are missing/placeholders, Billplz is not in sandbox mode, or the deployed web/API/Supabase Auth health checks fail.

The verifier deliberately does **not** create a payment or move money. Provider-native Billplz request/signature behavior remains covered by the sandbox adapter tests. A real RM1 sandbox Bill smoke can be opted into separately with `KHLIM_BILLPLZ_LIVE_TEST=1` after a Billplz sandbox account is connected.

## Guardian acceptance journey

Once staging infrastructure is connected, execute this journey with a throwaway guardian account:

1. Register a guardian account and complete Supabase email confirmation if enabled.
2. Sign in and create a managed child/athlete profile.
3. Open a live staging programme offering and start enrolment.
4. Confirm the selected membership plan and terms.
5. Launch Billplz sandbox checkout using an enabled FPX or DuitNow QR route.
6. Complete the sandbox payment and confirm the signed callback activates the membership.
7. Verify the guardian portal shows the athlete, active membership and payment history.
8. Verify the Admin console sees the same family/athlete/membership/payment state according to staff role permissions.
9. Repeat one failed/abandoned checkout and run stale-checkout reconciliation after the configured hold window in a controlled test environment.

## Current external-environment status

The repository is staging-ready when this contract is merged, but a successful live staging acceptance run requires the actual Vercel project, Supabase staging project and Billplz sandbox credentials. Repository CI must not represent missing external infrastructure as a passing live-deployment test.
