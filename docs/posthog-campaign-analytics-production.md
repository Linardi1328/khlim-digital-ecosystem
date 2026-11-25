# KHLIM 3x3 Campaign Analytics — PostHog Production Setup

**Environment:** Vercel project `khlim-digital-ecosystem-api`, **Production only**. Keep secrets server-side.

## Why the UI can show CONFIG_REQUIRED

`GET /v1/admin/academy/campaigns/analytics` returns a `traffic.status` of `CONFIG_REQUIRED` when either (a) the active organization/campaign is not authorized for traffic analytics or (b) the API has no server-side PostHog Query API credential. This differs from `ERROR`, which means a query was attempted but unavailable/failed.

The production database currently contains the configured default KHLIM organization. Authorized Academy Admin/Management/Super Admin users with AAL2 may request its 3x3 campaign metrics, but that does **not** prove a PostHog query key is configured or valid.

## Owner setup (never copy keys to PRs, chat, tickets or client variables)

1. Log in to the *correct* PostHog project and confirm its numerical project ID and cloud region. The current code defaults to US Cloud and project `652783`; verify rather than assuming these remain correct.
2. Create a dedicated PostHog personal API key restricted to that project, with the **Query Read** permission (`query:read`) and no unnecessary write scopes. Keep owner/revocation records securely.
3. In Vercel project `khlim-digital-ecosystem-api` → Settings → Environment Variables, configure **Production**:
   - `POSTHOG_PERSONAL_API_KEY` = personal Query API key (secret; **do not** prefix with `NEXT_PUBLIC_`)
   - `POSTHOG_PROJECT_ID` = confirmed numerical project ID (existing code defaults to `652783`)
   - `POSTHOG_QUERY_HOST` = `https://us.posthog.com` if the actual project is on US Cloud (use `https://eu.posthog.com` if EU Cloud).
4. Keep existing `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, JWT issuer and other auth settings unchanged. Do not use the client-side capture/project token as a Query API key.
5. Trigger an approved production API **redeployment** from the currently reviewed code. Changing Vercel env vars alone doesn't update an existing build.
6. Sign in as authorized staff with MFA and open Admin → **3x3 Campaign**. Confirm the API response `traffic.status` is `AVAILABLE` or, if `ERROR`, inspect server-side PostHog diagnostics without exposing keys. Confirm metrics are tied to the chosen project, campaign key `3x3-oct24`, consent and selected Malaysia-time reporting period.
7. Revoke the credential if exposed, remove stale keys and retain the usual audit/release record.

## Expectations and privacy

- Campaign **lead counts** are calculated from KHLIM database records and remain authoritative independently of PostHog.
- PostHog numbers are only observed opt-in web events, **not** all scans, clicks, parents or registrations.
- If the project has no matching tracked events, a valid PostHog query can correctly return **zero**, distinct from `CONFIG_REQUIRED`.
- Never store or cache guardian identity, phone, names, access tokens or query credentials in the browser. Use existing consent requirements and session privacy settings.
- Future performance work may add a bounded short-lived cache to expensive PostHog aggregate queries *after* baseline measurements, never to live-critical registration/payment/auth state.

## Troubleshooting map

| Traffic status | Likely meaning | Action |
| --- | --- | --- |
| CONFIG_REQUIRED | Tenant/campaign not eligible, or missing credential | Check authenticated org/campaign and Production API environment settings |
| ERROR | PostHog query failed, timed out or returned unexpected data | Verify cloud host, key scope, project ID and API runtime logs; don't invent zeroes |
| AVAILABLE | Query completed and produced counters | Interpret only against opt-in coverage and selected date interval |

**Release gate:** The analytics endpoint remains role-gated and MFA-protected; never weaken backend access rules to debug PostHog.
